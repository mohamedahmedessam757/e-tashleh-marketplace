import { create } from 'zustand';
import { ordersApi } from '../services/api/orders';
import { supabase } from '../services/supabase';
import { getCurrentUserId } from '../utils/auth';

export interface CartItemType {
    id: string; // Order ID
    offerId: string;
    orderNumber: string;
    name: string;
    price: number;
    shippingCost: number;
    hasWarranty: boolean;
    warrantyDuration?: string;
    condition?: string;
    partType?: string;
    partImage: string | null;
    expiryDate: Date;
    paidAt: Date;
    storeName: string;
    vehicleMake: string;
    vehicleModel: string;
    vehicleYear: number;
    vin: string | null;
    partsCount: number;
    requestType: string;
    shippingType: string;
    totalPaid: number;
    shippingAddress: any | null;
    isMyOffer?: boolean; // Merchant highlight
    fulfillmentStatus?: string;
    canSelectForShipping?: boolean;
    handoverPending?: boolean;
    lockReasonAr?: string;
    lockReasonEn?: string;
}

type CartMode = 'customer' | 'merchant';

interface CartState {
    items: CartItemType[];
    loading: boolean;
    /** True once the current mode has completed at least one successful fetch. */
    loaded: boolean;
    error: string | null;
    requestingShipping: boolean;
    mode: CartMode;
    fetchCartItems: (opts?: { silent?: boolean }) => Promise<void>;
    fetchMerchantCartItems: (opts?: { silent?: boolean }) => Promise<void>;
    refreshCart: () => void;
    requestShipping: (orderIds?: string[], offerIds?: string[]) => Promise<boolean>;
    subscription: any;
    subscribeToRealtime: (userId?: string) => void;
    unsubscribeFromRealtime: () => void;
}

const REFRESH_DEBOUNCE_MS = 450;
const FALLBACK_POLL_MS = 60_000;

let requestSeq = 0;
let refreshTimer: ReturnType<typeof setTimeout> | null = null;
let pollTimer: ReturnType<typeof setInterval> | null = null;
let refreshWhenVisible = false;
let detachWindowListeners: (() => void) | null = null;
let cachedUserId: string | null = null;

const isMaintenance = () =>
    !!(window as any).useAdminStore?.getState?.().publicSystemStatus?.maintenanceMode;

const isHidden = () => typeof document !== 'undefined' && document.visibilityState === 'hidden';

const mapItems = (data: any): CartItemType[] =>
    (Array.isArray(data) ? data : []).map((item: any) => ({
        ...item,
        expiryDate: new Date(item.expiryDate),
        paidAt: new Date(item.paidAt),
    }));

export const useCartStore = create<CartState>((set, get) => {
    const load = async (mode: CartMode, silent: boolean) => {
        if (isMaintenance()) return;

        const seq = ++requestSeq;
        const uid = getCurrentUserId();
        // Never show another account's (or other mode's) cached cart, even briefly.
        if (get().mode !== mode || uid !== cachedUserId) {
            cachedUserId = uid;
            set({ mode, items: [], loaded: false });
        }

        // Skeleton only on the very first load; later refreshes are silent (no flicker).
        const showLoading = !silent || !get().loaded;
        set({ loading: showLoading, error: null, mode });

        try {
            const data =
                mode === 'merchant'
                    ? await ordersApi.getMerchantAssemblyCart()
                    : await ordersApi.getAssemblyCart();
            if (seq !== requestSeq) return; // a newer request superseded this one
            set({ items: mapItems(data), loading: false, loaded: true });
        } catch (err: any) {
            if (seq !== requestSeq) return;
            console.error(`[useCartStore] Error fetching ${mode} assembly cart:`, err);
            // Keep the last good items on transient failures; only an empty first load stays empty.
            set({ error: err?.message || 'Failed to load cart', loading: false });
        }
    };

    const scheduleRefresh = () => {
        if (isHidden()) {
            refreshWhenVisible = true;
            return;
        }
        if (refreshTimer) clearTimeout(refreshTimer);
        refreshTimer = setTimeout(() => {
            refreshTimer = null;
            void load(get().mode, true);
        }, REFRESH_DEBOUNCE_MS);
    };

    return {
        items: [],
        loading: false,
        loaded: false,
        error: null,
        requestingShipping: false,
        mode: 'customer',
        subscription: null,

        refreshCart: scheduleRefresh,

        subscribeToRealtime: (userId?: string) => {
            if (get().subscription) return;
            const { mode } = get();

            // Customers only care about their own orders; merchants rely on RLS + API scoping.
            const ordersFilter = mode === 'customer' && userId ? `customer_id=eq.${userId}` : undefined;
            const channel = supabase
                .channel(`cart-realtime-${mode}-${userId || 'global'}`)
                .on('postgres_changes', { event: '*', schema: 'public', table: 'orders', filter: ordersFilter }, scheduleRefresh)
                .on('postgres_changes', { event: '*', schema: 'public', table: 'offers' }, scheduleRefresh)
                .subscribe();

            // Socket relay (JWT-scoped) — Supabase realtime is RLS-blocked for anon browser clients.
            const onHint = () => scheduleRefresh();
            const onVisibility = () => {
                if (!isHidden() && refreshWhenVisible) {
                    refreshWhenVisible = false;
                    scheduleRefresh();
                }
            };
            const onFocus = () => scheduleRefresh();
            window.addEventListener('order-updated', onHint);
            window.addEventListener('shipment-updated', onHint);
            window.addEventListener('online', onHint);
            window.addEventListener('focus', onFocus);
            document.addEventListener('visibilitychange', onVisibility);
            detachWindowListeners = () => {
                window.removeEventListener('order-updated', onHint);
                window.removeEventListener('shipment-updated', onHint);
                window.removeEventListener('online', onHint);
                window.removeEventListener('focus', onFocus);
                document.removeEventListener('visibilitychange', onVisibility);
            };

            pollTimer = setInterval(() => {
                if (!isHidden()) void load(get().mode, true);
            }, FALLBACK_POLL_MS);

            set({ subscription: channel });
        },

        unsubscribeFromRealtime: () => {
            const { subscription } = get();
            if (subscription) supabase.removeChannel(subscription);
            if (refreshTimer) clearTimeout(refreshTimer);
            if (pollTimer) clearInterval(pollTimer);
            refreshTimer = null;
            pollTimer = null;
            refreshWhenVisible = false;
            detachWindowListeners?.();
            detachWindowListeners = null;
            set({ subscription: null });
        },

        fetchCartItems: (opts) => load('customer', !!opts?.silent),

        fetchMerchantCartItems: (opts) => load('merchant', !!opts?.silent),

        requestShipping: async (orderIds?: string[], offerIds?: string[]) => {
            set({ requestingShipping: true, error: null });
            try {
                const result = await ordersApi.requestShipping(orderIds, offerIds);

                if (result.success) {
                    // Optimistically drop shipped items, then reconcile with the server.
                    if (offerIds?.length) {
                        const shipped = new Set(offerIds);
                        set((s) => ({ items: s.items.filter((i) => !shipped.has(i.offerId)) }));
                    }
                    await load(get().mode, true);
                    set({ requestingShipping: false });
                    return true;
                } else {
                    set({ error: result.reason || result.message || 'Failed to request shipping', requestingShipping: false });
                    return false;
                }
            } catch (err: any) {
                console.error('[useCartStore] Error requesting shipping:', err);
                const data = err?.response?.data;
                const message =
                    (typeof data?.messageAr === 'string' && data.messageAr) ||
                    (typeof data?.messageEn === 'string' && data.messageEn) ||
                    (typeof data?.message === 'string' && data.message) ||
                    (Array.isArray(data?.message) ? data.message.join(', ') : null) ||
                    data?.reason ||
                    err?.message ||
                    'Failed to request shipping';
                set({ error: message, requestingShipping: false });
                return false;
            }
        },
    };
});
