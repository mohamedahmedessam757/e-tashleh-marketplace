import { create } from 'zustand';
import { ordersApi } from '../services/api/orders';
import { supabase } from '../services/supabase';

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

interface CartState {
    items: CartItemType[];
    loading: boolean;
    error: string | null;
    requestingShipping: boolean;
    fetchCartItems: () => Promise<void>;
    fetchMerchantCartItems: () => Promise<void>;
    requestShipping: (orderIds?: string[], offerIds?: string[]) => Promise<boolean>;
    subscription: any;
    subscribeToRealtime: (userId?: string) => void;
    unsubscribeFromRealtime: () => void;
}

export const useCartStore = create<CartState>((set, get) => ({
    items: [],
    loading: false,
    error: null,
    requestingShipping: false,
    subscription: null,

    subscribeToRealtime: (userId?: string) => {
        const { subscription, fetchCartItems, fetchMerchantCartItems } = get();
        if (subscription) return;

        const handleRealtimeEvent = () => {
            const currentHash = window.location.hash || window.location.pathname;
            if (currentHash.includes('merchant')) {
                fetchMerchantCartItems();
            } else {
                fetchCartItems();
            }
        };

        const channel = supabase.channel(`cart-realtime-${userId || 'global'}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, handleRealtimeEvent)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'offers' }, handleRealtimeEvent)
            .subscribe();

        set({ subscription: channel });
    },

    unsubscribeFromRealtime: () => {
        const { subscription } = get();
        if (subscription) {
            supabase.removeChannel(subscription);
            set({ subscription: null });
        }
    },

    fetchCartItems: async () => {
        // MAINTENANCE GUARD
        const isMaintenance = (window as any).useAdminStore?.getState?.().publicSystemStatus?.maintenanceMode;
        if (isMaintenance) return;

        set({ loading: true, error: null });
        try {
            const data = await ordersApi.getAssemblyCart();

            // Map items and ensure dates are proper Date objects
            const cartItems: CartItemType[] = data.map((item: any) => ({
                ...item,
                expiryDate: new Date(item.expiryDate),
                paidAt: new Date(item.paidAt),
            }));

            set({ items: cartItems, loading: false });
        } catch (err: any) {
            console.error('[useCartStore] Error fetching assembly cart:', err);
            set({ error: err.message, loading: false, items: [] });
        }
    },
    
    fetchMerchantCartItems: async () => {
        // MAINTENANCE GUARD
        const isMaintenance = (window as any).useAdminStore?.getState?.().publicSystemStatus?.maintenanceMode;
        if (isMaintenance) return;

        set({ loading: true, error: null });
        try {
            const data = await ordersApi.getMerchantAssemblyCart();
            const cartItems: CartItemType[] = data.map((item: any) => ({
                ...item,
                expiryDate: new Date(item.expiryDate),
                paidAt: new Date(item.paidAt),
            }));
            set({ items: cartItems, loading: false });
        } catch (err: any) {
            console.error('[useCartStore] Error fetching merchant assembly cart:', err);
            set({ error: err.message, loading: false, items: [] });
        }
    },

    requestShipping: async (orderIds?: string[], offerIds?: string[]) => {
        set({ requestingShipping: true, error: null });
        try {
            const result = await ordersApi.requestShipping(orderIds, offerIds);

            if (result.success) {
                // Refresh cart items to accurately reflect partial shipping state
                if (window.location.hash.includes('merchant')) {
                    await get().fetchMerchantCartItems();
                } else {
                    await get().fetchCartItems();
                }
                set({ requestingShipping: false });
                return true;
            } else {
                set({ error: result.reason || result.message || 'Failed to request shipping', requestingShipping: false });
                return false;
            }
        } catch (err: any) {
            console.error('[useCartStore] Error requesting shipping:', err);
            set({ error: err.message, requestingShipping: false });
            return false;
        }
    }
}));

