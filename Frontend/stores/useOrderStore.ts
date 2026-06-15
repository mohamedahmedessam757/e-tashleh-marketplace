import { create } from 'zustand';
import { StatusType } from '../components/ui/Badge';
import { useAuditStore } from './useAuditStore';
import { useNotificationStore } from './useNotificationStore';
import { useBillingStore } from './useBillingStore';
import { ordersApi } from '../services/api/orders';
import { supabase } from '../services/supabase';
import { POST_DELIVERY_RETURN_DISPUTE_HOURS } from '../utils/orderSla';
import { formatApiErrorMessage } from '../utils/formatApiErrorMessage';

// Module-level debounce timer to prevent realtime spam and race conditions with DB transactions
let realtimeDebounceTimer: ReturnType<typeof setTimeout> | null = null;
const REALTIME_DEBOUNCE_MS = 300; // 2026 High-Performance Threshold

// --- FSM CONFIGURATION (Must match Backend) ---
const TRANSITION_RULES: Record<StatusType, StatusType[]> = {
    COLLECTING_OFFERS: ['AWAITING_SELECTION', 'CANCELLED'],
    AWAITING_SELECTION: ['AWAITING_PAYMENT', 'CANCELLED'],
    AWAITING_OFFERS: ['AWAITING_PAYMENT', 'CANCELLED'],
    AWAITING_PAYMENT: ['PREPARATION', 'CANCELLED'],
    PREPARATION: ['PREPARED', 'DELAYED_PREPARATION', 'PARTIALLY_SHIPPED', 'CANCELLED'],
    PREPARED: ['VERIFICATION', 'SHIPPED', 'CANCELLED'],
    VERIFICATION: ['VERIFICATION_SUCCESS', 'NON_MATCHING', 'CANCELLED'],
    VERIFICATION_SUCCESS: ['READY_FOR_SHIPPING', 'CANCELLED'],
    READY_FOR_SHIPPING: ['SHIPPED', 'PARTIALLY_SHIPPED', 'CANCELLED'],
    PARTIALLY_SHIPPED: ['PARTIALLY_SHIPPED', 'SHIPPED', 'PARTIALLY_DELIVERED', 'DELIVERED', 'CANCELLED'],
    NON_MATCHING: ['CORRECTION_PERIOD', 'CANCELLED'],
    CORRECTION_PERIOD: ['CORRECTION_SUBMITTED', 'CANCELLED'],
    CORRECTION_SUBMITTED: ['VERIFICATION_SUCCESS', 'NON_MATCHING', 'CANCELLED'],
    DELAYED_PREPARATION: ['PREPARED', 'CANCELLED'],
    SHIPPED: ['DELIVERED', 'PARTIALLY_DELIVERED', 'RETURNED', 'DISPUTED'],
    PARTIALLY_DELIVERED: ['DELIVERED', 'PARTIALLY_DELIVERED', 'COMPLETED', 'DISPUTED', 'RETURN_REQUESTED', 'RETURNED'],
    DELIVERED: ['COMPLETED', 'RETURNED', 'DISPUTED'],
    COMPLETED: ['WARRANTY_ACTIVE'],
    WARRANTY_ACTIVE: ['WARRANTY_EXPIRED', 'RETURN_REQUESTED', 'DISPUTED'],
    WARRANTY_EXPIRED: [],
    CANCELLED: [],
    RETURNED: ['COMPLETED'],
    DISPUTED: ['COMPLETED', 'RETURNED', 'REFUNDED'],
    REFUNDED: [],
    RETURN_REQUESTED: ['RETURN_APPROVED', 'DISPUTED'],
    RETURN_APPROVED: ['RETURNED'],
    RESOLVED: ['COMPLETED'],
    PARTIALLY_PAID: ['AWAITING_PAYMENT', 'PREPARATION', 'CANCELLED'],
    // Shipment Detailed Statuses (Managed via logistics system)
    RECEIVED_AT_HUB: [],
    QUALITY_CHECK_PASSED: [],
    PACKAGED_FOR_SHIPPING: [],
    AWAITING_CARRIER_PICKUP: [],
    PICKED_UP_BY_CARRIER: [],
    IN_TRANSIT_TO_DESTINATION: [],
    ARRIVED_AT_LOCAL_FACILITY: [],
    CUSTOMS_CLEARANCE: [],
    AT_LOCAL_WAREHOUSE: [],
    OUT_FOR_DELIVERY: [],
    DELIVERY_ATTEMPTED: [],
    DELIVERED_TO_CUSTOMER: [],
    RETURN_TO_SENDER_INITIATED: [],
    RETURNED_TO_SENDER: [],
    // 2026 Return Journey Statuses
    RETURN_LABEL_ISSUED: [],
    RETURN_STARTED: [],
    RECEIVED_FROM_CUSTOMER: [],
    DELIVERED_TO_VENDOR: [],
    EXCHANGE_COMPLETED: [],
    IN_TRANSIT_TO_CUSTOMER: [],
    RETURN_COMPLETED_TO_CUSTOMER: []
};

export const SLA_LIMITS: Partial<Record<StatusType, number>> = {
    AWAITING_OFFERS: 24,
    AWAITING_PAYMENT: 24, // 24 hours to pay
    PREPARATION: 48,      // 48 hours to prepare
    DELAYED_PREPARATION: 24, // 24 extra hours to prepare (Penalty period)
    SHIPPED: 72,          // 3 days to deliver
    DELIVERED: POST_DELIVERY_RETURN_DISPUTE_HOURS,
    WARRANTY_ACTIVE: 0,   // Dynamic based on warranty_end_at
    DISPUTED: 72
};

export interface OrderOffer {
    id: string;
    offerNumber?: string;
    storeId?: string; // Store ID for vendor identification
    storeCode?: string; // Store unit code D-XXXX
    merchantName: string;
    storeRating: number;
    storeReviewCount: number;
    storeLogo?: string;
    storeCity?: string;
    price: number; // Final Total Price
    unitPrice: number; // Part Price only
    shippingCost: number;
    isShippingIncluded: boolean;
    condition: string;
    warranty: string;
    deliveryTime: string;
    notes?: string;
    submittedAt: string;
    status?: string; // pending | accepted | rejected
    offerImage?: string;
    weight?: number; // In Kg
    partType?: string; // Original, Commercial, etc.
    orderPartId?: string; // Links to specific part
    cylinders?: number | string; // Engine cylinder count
    partName?: string; // Part name for display
    canEditUntil?: string; // 2026 Governance Timer
    isWithdrawn?: boolean; // 2026 Governance State
    
    // Partial Shipping from Assembly Cart (2026)
    shippedFromCart?: boolean;
    shippedFromCartAt?: string;
    cartShipmentId?: string;
    cartBatchType?: 'solo' | 'group' | null;
    cartBatchSize?: number | null;
    handoverPending?: boolean;
    fulfillmentStatus?: string;
    preparedAt?: string;
    verificationSubmittedAt?: string;
    readyForShippingAt?: string;
}

/** Grouped-order shipment batch (one customer selection = one shipment + waybill). */
export interface ShipmentBatchSummary {
    shipmentId: string;
    waybillId?: string | null;
    waybillNumber?: string | null;
    offerIds: string[];
    partNames: string[];
    batchSize: number;
    shippedAt?: string | null;
    trigger?: string | null;
    status?: string;
}

export interface Order {
    id: string;
    orderNumber?: string;
    // Customer Info
    customer: {
        id: string;
        name: string;
        customerCode?: string; // ADDED
        avatar?: string;
        email?: string;
        phone?: string;
    };

    // Merchant Info
    merchantId?: string;
    merchantName?: string;

    // Admin Features
    adminNotes?: string;

    // Legacy Fields (Must keep for backward compatibility)
    part: string;
    car: string;
    vin?: string;
    partDescription?: string;
    partImages?: (string | File)[];

    // New Fields for Enhanced Workflow
    vehicle?: {
        make: string;
        model: string; // "Vehicle Type"
        year: string;
        vin: string;
        vinImage?: File;
    };
    parts?: {
        id: string;
        name: string;
        description: string;
        images: (string | File)[];
        video?: string | File;
        notes?: string;
    }[];
    preferences?: {
        condition: 'new' | 'used';
        warranty: boolean;
    };
    requestType?: 'single' | 'multiple';
    shippingType?: 'separate' | 'combined';
    conditionPref?: 'new' | 'used' | string;
    warrantyPreferred?: boolean;

    // Status & Dates
    status: StatusType;
    date: string; // Display Date
    createdAt: string;
    updatedAt: string;
    paymentDeadlineAt?: string;
    delayedPreparationDeadlineAt?: string;
    payments?: any[];
    offerAcceptedAt?: string;
    shippedAt?: string;
    deliveredAt?: string;

    // Financials
    price?: number; // Total Price

    // Offers
    offersCount: number;
    offers?: OrderOffer[];
    acceptedOffer?: OrderOffer; // Back-compat: First accepted offer
    acceptedOffers?: OrderOffer[]; // New: List of all accepted/paid offers
    _count?: {
        offers?: number;
    };

    // Verification
    verificationDocuments?: any[];
    verificationSubmittedAt?: string;
    correctionDeadlineAt?: string;

    // Logistics
    waybillNumber?: string;
    courier?: string;
    expectedDeliveryDate?: string;
    waybillImage?: string | File;
    shipments?: any[];
    shippingAddresses?: Array<{
        orderPartId?: string | null;
        fullName?: string;
        phone?: string;
        email?: string;
        country?: string;
        city?: string;
        details?: string;
    }>;
    shippingWaybills?: any[];
    /** Per cart-shipment batch for grouped orders (from API). */
    shipmentBatches?: ShipmentBatchSummary[];
    invoices?: any[];

    // Returns
    returnWaybillNumber?: string;
    returnShippedAt?: string;

    // Warranty
    warranty_active_at?: string;
    warranty_end_at?: string;

    // 2026 Governance
    revealOffersAt?: string;
    offersStopAt?: string;
    selectionDeadlineAt?: string;

    // Review
    review?: any;
}

const parseJsonArray = (value: unknown): string[] => {
    if (Array.isArray(value)) return value.filter((v): v is string => typeof v === 'string');
    if (typeof value === 'string') {
        try {
            const parsed = JSON.parse(value);
            return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === 'string') : (value ? [value] : []);
        } catch {
            return value ? [value] : [];
        }
    }
    return [];
};

const normalizeVerificationDocuments = (docs: any[] | undefined) =>
    docs
        ? docs.map((doc) => ({
              ...doc,
              images: parseJsonArray(doc.images),
              adminRejectionImages: parseJsonArray(doc.adminRejectionImages),
          }))
        : undefined;

/** List endpoint returns only id/adminStatus/createdAt — do not overwrite a full detail fetch. */
const isListOnlyVerificationPayload = (docs: any[] | undefined): boolean => {
    if (!docs?.length) return false;
    const doc = docs[0];
    return (
        doc.images === undefined &&
        doc.videoUrl === undefined &&
        doc.description === undefined &&
        doc.recipientName === undefined
    );
};

const hasFullVerificationPayload = (docs: any[] | undefined): boolean => {
    if (!docs?.length) return false;
    const doc = docs[0];
    return !!(
        doc.images !== undefined &&
        doc.recipientName !== undefined
    );
};

/** Map Supabase verification_documents row for instant admin panel updates. */
export const mapVerificationDocFromRow = (row: Record<string, unknown>): Record<string, unknown> => ({
    id: row.id,
    orderId: row.order_id ?? row.orderId,
    storeId: row.store_id ?? row.storeId,
    images: parseJsonArray(row.images),
    videoUrl: row.video_url ?? row.videoUrl,
    description: row.description,
    recipientName: row.recipient_name ?? row.recipientName,
    recipientSignature: row.recipient_signature ?? row.recipientSignature,
    signatureType: row.signature_type ?? row.signatureType,
    signatureText: row.signature_text ?? row.signatureText,
    handoverDate: row.handover_date ?? row.handoverDate,
    handoverTime: row.handover_time ?? row.handoverTime,
    adminStatus: row.admin_status ?? row.adminStatus,
    adminReviewedAt: row.admin_reviewed_at ?? row.adminReviewedAt,
    adminRejectionReason: row.admin_rejection_reason ?? row.adminRejectionReason,
    adminRejectionImages: parseJsonArray(row.admin_rejection_images ?? row.adminRejectionImages),
    adminRejectionVideo: row.admin_rejection_video ?? row.adminRejectionVideo,
    adminSignatureName: row.admin_signature_name ?? row.adminSignatureName,
    adminSignatureImage: row.admin_signature_image ?? row.adminSignatureImage,
    adminSignatureType: row.admin_signature_type ?? row.adminSignatureType,
    adminSignatureText: row.admin_signature_text ?? row.adminSignatureText,
    isCorrection: row.is_correction ?? row.isCorrection,
    createdAt: row.created_at ?? row.createdAt,
    updatedAt: row.updated_at ?? row.updatedAt,
});

const mergeVerificationDocuments = (
    existing: any[] | undefined,
    incoming: any[] | undefined,
): any[] | undefined => {
    const hasFullIncoming = hasFullVerificationPayload(incoming);
    const hasFullExisting = hasFullVerificationPayload(existing);
    
    if (hasFullIncoming) {
        return normalizeVerificationDocuments(incoming);
    }
    
    if (hasFullExisting) {
        return existing;
    }
    
    if (!incoming) {
        return existing;
    }
    
    if (!existing) {
        return incoming?.length ? normalizeVerificationDocuments(incoming) : undefined;
    }
    
    return existing;
};

/** Map Supabase row (snake_case) to partial Order fields for instant UI updates. */
export const mapRealtimeOrderRow = (row: Record<string, unknown>): Partial<Order> => {
    const partial: Partial<Order> = {};
    if (row.status != null) partial.status = row.status as StatusType;
    if (row.updated_at != null || row.updatedAt != null) {
        partial.updatedAt = String(row.updated_at ?? row.updatedAt);
    }
    if (row.verification_submitted_at != null || row.verificationSubmittedAt != null) {
        partial.verificationSubmittedAt = String(
            row.verification_submitted_at ?? row.verificationSubmittedAt,
        );
    }
    if (row.correction_deadline_at != null || row.correctionDeadlineAt != null) {
        partial.correctionDeadlineAt = String(
            row.correction_deadline_at ?? row.correctionDeadlineAt,
        );
    }
    if (row.reveal_offers_at != null || row.revealOffersAt != null) {
        partial.revealOffersAt = String(row.reveal_offers_at ?? row.revealOffersAt);
    }
    if (row.offers_stop_at != null || row.offersStopAt != null) {
        partial.offersStopAt = String(row.offers_stop_at ?? row.offersStopAt);
    }
    if (row.selection_deadline_at != null || row.selectionDeadlineAt != null) {
        partial.selectionDeadlineAt = String(
            row.selection_deadline_at ?? row.selectionDeadlineAt,
        );
    }
    if (row.delivered_at != null || row.deliveredAt != null) {
        partial.deliveredAt = String(row.delivered_at ?? row.deliveredAt);
    }
    if (row.admin_notes != null || row.adminNotes != null) {
        partial.adminNotes = String(row.admin_notes ?? row.adminNotes);
    }
    return partial;
};

const mergeOfferLists = (
    existing?: OrderOffer[],
    incoming?: OrderOffer[],
): OrderOffer[] | undefined => {
    if (incoming === undefined) return existing;
    // List payloads often omit offers — keep detail we already loaded
    if (!incoming.length) return existing?.length ? existing : [];
    return incoming.map((inc) => {
        const prev = existing?.find((o) => String(o.id) === String(inc.id));
        if (!prev) return inc;
        return {
            ...inc,
            status: inc.status ?? prev.status,
            offerImage: inc.offerImage || prev.offerImage,
            storeRating: inc.storeRating || prev.storeRating,
            storeReviewCount: inc.storeReviewCount || prev.storeReviewCount,
            storeLogo: inc.storeLogo || prev.storeLogo,
            isWithdrawn: inc.isWithdrawn ?? prev.isWithdrawn,
        };
    });
};

const mergeOrderPreservingDetails = (existing: Order, incoming: Order): Order => {
    const mergedOffers = mergeOfferLists(existing.offers, incoming.offers);

    const mergedParts = incoming.parts?.map((inc) => {
        const prev = existing.parts?.find((p) => String(p.id) === String(inc.id));
        if (prev?.images?.length && !inc.images?.length) {
            return { ...inc, images: prev.images, video: prev.video ?? inc.video };
        }
        return inc;
    }) ?? incoming.parts;

    return {
        ...incoming,
        adminNotes: incoming.adminNotes ?? existing.adminNotes,
        partImages: parseJsonArray(incoming.partImages).length
            ? incoming.partImages
            : existing.partImages,
        verificationDocuments: mergeVerificationDocuments(
            existing.verificationDocuments,
            incoming.verificationDocuments,
        ),
        offers: mergedOffers,
        parts: mergedParts,
        invoices:
            incoming.invoices?.length ? incoming.invoices : existing.invoices,
        shippingWaybills:
            incoming.shippingWaybills?.length
                ? incoming.shippingWaybills
                : existing.shippingWaybills,
        shipments:
            incoming.shipments?.length ? incoming.shipments : existing.shipments,
        shipmentBatches:
            incoming.shipmentBatches?.length
                ? incoming.shipmentBatches
                : existing.shipmentBatches,
    };
};

const mergeMappedOrdersWithExisting = (existingOrders: Order[], mapped: Order[]): Order[] =>
    mapped.map((incoming) => {
        const existing = existingOrders.find((o) => String(o.id) === String(incoming.id));
        return existing ? mergeOrderPreservingDetails(existing, incoming) : incoming;
    });

interface OrderState {
    orders: Order[];
    activeOrderId: string | null;
    isLoading: boolean;
    isFetchingMore: boolean;
    error: string | null;
    subscription: any;
    lastFetchRole: string | null;
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;

    setActiveOrderId: (id: string | null) => void;
    patchOrderFromRealtime: (orderId: string, partial: Partial<Order>) => void;
    patchVerificationFromRealtime: (orderId: string, docRow: Record<string, unknown>) => void;
    fetchOrders: (params?: { search?: string; status?: string; page?: number; limit?: number; retry?: number }) => Promise<void>;
    fetchOrder: (id: string) => Promise<void>;
    patchOrderReview: (
        orderId: string,
        review: NonNullable<Order['review']>,
    ) => void;
    fetchMoreOrders: (params?: { search?: string; status?: string }) => Promise<void>;
    silentFetch: () => Promise<void>;
    mapBackendOrders: (items: any[]) => Order[];
    startRealtime: (userId?: string, role?: string) => void;
    stopRealtime: () => void;
    clearOrders: () => void;
    resetForRole: (role: string) => void;
    addOrder: (order: Omit<Order, 'id' | 'date' | 'status' | 'offersCount' | 'createdAt' | 'updatedAt' | 'offers'>) => Promise<void>;
    addOfferToOrder: (orderId: string, offer: Omit<OrderOffer, 'id'>) => void;
    removeOfferFromOrder: (offerId: string) => void;
    markOfferWithdrawnInOrder: (offerId: string) => void;
    acceptOffer: (orderId: string, partId: string, offerId: string) => Promise<void>;
    rejectOffer: (orderId: string, offerId: string, reason: string, customReason?: string) => Promise<void>;
    transitionOrder: (id: string, targetStatus: StatusType, actor?: string, metadata?: any) => Promise<{ success: boolean; message?: string }>;
    forceStatus: (id: string, status: StatusType, adminNote: string) => void;
    processPaymentWebhook: (event: 'succeeded' | 'failed' | 'refunded', orderId: string) => void;

    checkSLA: () => void;
    getOrder: (id: string) => Order | undefined;
    getValidTransitions: (currentStatus: StatusType) => StatusType[];
    updateOrderStatus: (id: string, status: StatusType) => void;
    adminUpdateOffer: (offerId: string, updateDto: any) => Promise<void>;
    adminDeleteOffer: (offerId: string) => Promise<void>;
    withdrawOffer: (offerId: string) => Promise<void>;
    updateAdminNotes: (orderId: string, notes: string) => Promise<void>;
    confirmOrderReceived: (id: string, note?: string) => Promise<boolean>;
    cancelOrder: (id: string, reason?: string) => Promise<boolean>;
    deleteOrder: (id: string) => Promise<boolean>;
    renewOrder: (id: string) => Promise<boolean>;
    canCancelOrder: (id: string) => boolean;
    getOrderById: (id: string) => Order | undefined;
}

const handleGlobalRealtimeEvent = (source: string) => {
    console.log(`⚡ Realtime Update: ${source} changed. Debouncing fetch...`);
    if (realtimeDebounceTimer) clearTimeout(realtimeDebounceTimer);
    realtimeDebounceTimer = setTimeout(() => {
        const { activeOrderId, fetchOrder, silentFetch } = useOrderStore.getState();
        if (activeOrderId) {
            fetchOrder(activeOrderId);
        } else {
            silentFetch();
        }
    }, REALTIME_DEBOUNCE_MS);
};

export const useOrderStore = create<OrderState>((set, get) => ({
    orders: [],
    activeOrderId: null,
    isLoading: false,
    isFetchingMore: false,
    error: null,
    subscription: null,
    lastFetchRole: null,
    page: 1,
    limit: 20,
    total: 0,
    hasMore: false,

    setActiveOrderId: (id: string | null) => {
        set({ activeOrderId: id });
    },

    patchOrderFromRealtime: (orderId: string, partial: Partial<Order>) => {
        set((state) => ({
            orders: state.orders.map((o) => {
                if (String(o.id) !== String(orderId)) return o;
                const updated = { ...o, ...partial };
                if (partial.verificationDocuments === undefined) {
                    updated.verificationDocuments = o.verificationDocuments;
                }
                return updated;
            }),
        }));
    },

    patchVerificationFromRealtime: (orderId: string, docRow: Record<string, unknown>) => {
        const doc = mapVerificationDocFromRow(docRow);
        set((state) => ({
            orders: state.orders.map((o) => {
                if (String(o.id) !== String(orderId)) return o;
                const existing = o.verificationDocuments || [];
                const docId = doc.id != null ? String(doc.id) : '';
                const idx = docId
                    ? existing.findIndex((d) => String(d.id) === docId)
                    : -1;
                const next =
                    idx >= 0
                        ? existing.map((d, i) =>
                              i === idx ? { ...d, ...doc } : d,
                          )
                        : [doc, ...existing];
                return {
                    ...o,
                    verificationDocuments: normalizeVerificationDocuments(next),
                };
            }),
        }));
    },

    clearOrders: () => {
        set({ 
            orders: [], 
            activeOrderId: null,
            error: null, 
            lastFetchRole: null, 
            page: 1, 
            total: 0, 
            hasMore: false,
            isFetchingMore: false 
        });
    },

    resetForRole: (role: string) => {
        const { lastFetchRole, stopRealtime, clearOrders } = get();
        // If role changed, reset everything
        if (lastFetchRole && lastFetchRole !== role) {
            stopRealtime();
            clearOrders();
        }
        // Always set the current role for tracking
        set({ lastFetchRole: role });
    },

    startRealtime: (userId?: string, role?: string) => {
        const { subscription } = get();
        if (subscription) return; // Already listening

        let filterString: string | undefined = undefined;
        if (userId && role === 'customer') {
            filterString = `customer_id=eq.${userId}`;
        }
        // For admin and merchants, we listen globally or via backend API constraints, 
        // relying on the API fetch to securely filter the records after the ping.

        const channel = supabase.channel(`orders-realtime-${userId || 'global'}`)
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'orders', filter: filterString },
                () => handleGlobalRealtimeEvent('orders table')
            )
            .subscribe();

        // 2. Initial Fetch immediately
        get().fetchOrders();

        // Also listen to offers table for real-time offer status changes
        const offersChannel = supabase.channel(`offers-realtime-${userId || 'global'}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'offers' }, () => {
                handleGlobalRealtimeEvent('offers table');
            })
            .subscribe();

        set({ subscription: { ordersChannel: channel, offersChannel } });
    },

    stopRealtime: () => {
        const { subscription } = get();
        if (subscription) {
            if (subscription.ordersChannel) supabase.removeChannel(subscription.ordersChannel);
            if (subscription.offersChannel) supabase.removeChannel(subscription.offersChannel);
        }
        set({ subscription: null });
    },

    fetchOrder: async (id: string) => {
        try {
            const result = await ordersApi.getById(id);
            const mappedOrder = get().mapBackendOrders([result])[0];

            set((state) => {
                const existingIndex = state.orders.findIndex(o => String(o.id) === String(id));
                if (existingIndex > -1) {
                    const newOrders = [...state.orders];
                    newOrders[existingIndex] = mergeOrderPreservingDetails(state.orders[existingIndex], mappedOrder);
                    return { orders: newOrders };
                }
                return { orders: [mappedOrder, ...state.orders] };
            });
        } catch (err) {
            console.error(`Failed to fetch order ${id}`, err);
        }
    },

    patchOrderReview: (orderId, review) => {
        set((state) => ({
            orders: state.orders.map((o) =>
                String(o.id) === String(orderId) ? { ...o, review } : o,
            ),
        }));
    },

    fetchOrders: async (params = {}) => {
        const { search, status, page = 1, limit: requestedLimit } = params;
        const limit = requestedLimit ?? get().limit;
        const { orders } = get();
        
        // 2026 SWR-like Pattern: Only show global loader if no data exists
        if (orders.length === 0) {
            set({ isLoading: true, error: null });
        } else {
            set({ error: null });
        }

        try {
            const result = await ordersApi.getAll({ 
                page, 
                limit: get().limit, 
                search, 
                status 
            });

            const mappedOrders = mergeMappedOrdersWithExisting(orders, get().mapBackendOrders(result.items));

            set({
                orders: mappedOrders,
                total: result.total,
                page: result.page || page,
                hasMore: result.hasMore,
                isLoading: false
            });
        } catch (err: any) {
            set({ 
                error: formatApiErrorMessage(err, 'Failed to fetch orders'), 
                isLoading: false 
            });
        }
    },

    fetchMoreOrders: async (params = {}) => {
        const { isLoading, isFetchingMore, hasMore, page, limit, orders } = get();
        if (isLoading || isFetchingMore || !hasMore) return;

        set({ isFetchingMore: true });

        try {
            const nextPage = page + 1;
            const result = await ordersApi.getAll({ 
                page: nextPage, 
                limit, 
                ...params 
            });

            const newMappedOrders = mergeMappedOrdersWithExisting(orders, get().mapBackendOrders(result.items));

            set({
                orders: [...orders, ...newMappedOrders],
                total: result.total,
                page: nextPage,
                hasMore: result.hasMore,
                isFetchingMore: false
            });
        } catch (err) {
            console.error('Fetch more failed', err);
            set({ isFetchingMore: false });
        }
    },

    silentFetch: async () => {
        const { isLoading, isFetchingMore, page, limit, activeOrderId } = get();
        if (isFetchingMore) return;
        // Detail pages refresh via fetchOrder(activeOrderId) from global realtime
        if (activeOrderId) return;
        if (isLoading) return;

        try {
            // Strategic Refresh: Fetch the current view + first page of active items
            const result = await ordersApi.getAll({ page: 1, limit: Math.max(page * limit, 50) });
            const mappedOrders = mergeMappedOrdersWithExisting(get().orders, get().mapBackendOrders(result.items));
            
            set((state) => ({ 
                orders: mappedOrders, 
                total: result.total, 
                hasMore: result.hasMore,
                // Update specific orders if they were expanded/detailed in UI? 
                // mappedOrders already contains the latest list state.
            }));
        } catch (err) {
            console.error('Silent fetch failed', err);
        }
    },

    // Extracted mapping logic for reuse
    mapBackendOrders: (items: any[]): Order[] => {
        return items.map((o: any) => ({
                id: o.id,
                orderNumber: o.orderNumber,
                car: `${o.vehicleMake} ${o.vehicleModel} ${o.vehicleYear}`,
                part: o.partName,
                partDescription: o.partDescription,
                partImages: parseJsonArray(o.partImages),
                parts: o.parts ? o.parts.map((p: any) => ({
                    id: p.id,
                    name: p.name,
                    description: p.description,
                    images: parseJsonArray(p.images),
                    video: p.video || null,
                    notes: p.notes
                })) : [],
                vin: o.vin,
                requestType: o.requestType,
                shippingType: o.shippingType,
                conditionPref: typeof o.conditionPref === 'string' ? o.conditionPref.trim() : o.conditionPref,
                warrantyPreferred: o.warrantyPreferred,
                preferences: {
                    condition: o.conditionPref === 'new' ? 'new' : 'used',
                    warranty: !!o.warrantyPreferred
                },
                vehicle: {
                    make: o.vehicleMake,
                    model: o.vehicleModel,
                    year: o.vehicleYear,
                    vin: o.vin,
                    vinImage: o.vinImage
                },
                status: o.status,
                merchantId: o.storeId || o.store?.id,
                adminNotes: o.adminNotes ?? o.admin_notes ?? undefined,
                date: new Date(o.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
                offersCount: o.offers ? o.offers.length : 0,
                offers: o.offers ? o.offers.map((offer: any) => ({
                    id: offer.id,
                    offerNumber: offer.offerNumber || 'N/A',
                    storeId: offer.store?.id || offer.storeId,
                    storeCode: offer.store?.storeCode || offer.storeCode || 'N/A',
                    merchantName: offer.store?.name || 'Unknown Store',
                    storeRating: offer.store?.rating || 0,
                    storeReviewCount: offer.store?._count?.reviews || 0,
                    storeLogo: offer.store?.logo || null,
                    storeCity: offer.store?.city || 'Saudi Arabia',
                    price: (() => {
                        const base = Number(offer.unitPrice || 0);
                        const shipping = Number(offer.shippingCost || 0);
                        const percentCommission = Math.round(base * 0.25);
                        const commission = base > 0 ? Math.max(percentCommission, 100) : 0;
                        return base + shipping + commission;
                    })(),
                    unitPrice: Number(offer.unitPrice || 0),
                    shippingCost: Number(offer.shippingCost || 0),
                    isShippingIncluded: Number(offer.shippingCost || 0) === 0,
                    condition: offer.condition || 'used',
                    warranty: offer.hasWarranty ? (offer.warrantyDuration || 'yes') : 'no',
                    deliveryTime: offer.deliveryDays || 'N/A',
                    notes: offer.notes,
                    submittedAt: offer.createdAt,
                    status: offer.status || 'pending',
                    offerImage: offer.offerImage,
                    weight: Number(offer.weightKg || offer.weight || 0),
                    partType: offer.partType || 'original',
                    orderPartId: offer.orderPartId || offer.order_part_id || null,
                    cylinders: offer.cylinders,
                    canEditUntil: offer.canEditUntil,
                    isWithdrawn: !!offer.isWithdrawn,
                    shippedFromCart: !!offer.shippedFromCart,
                    shippedFromCartAt: offer.shippedFromCartAt,
                    cartShipmentId: offer.cartShipmentId,
                    cartBatchType: offer.cartBatchType ?? null,
                    cartBatchSize: offer.cartBatchSize ?? null,
                    handoverPending: offer.handoverPending ?? offer.fulfillmentStatus === 'VERIFICATION_SUCCESS',
                    fulfillmentStatus: offer.fulfillmentStatus || offer.fulfillment_status,
                    preparedAt: offer.preparedAt || offer.prepared_at,
                    verificationSubmittedAt: offer.verificationSubmittedAt || offer.verification_submitted_at,
                    readyForShippingAt: offer.readyForShippingAt || offer.ready_for_shipping_at,
                })) : [],
                createdAt: o.createdAt,
                updatedAt: o.updatedAt,
                deliveredAt: o.deliveredAt || o.delivered_at,
                revealOffersAt: o.revealOffersAt,
                offersStopAt: o.offersStopAt,
                selectionDeadlineAt: o.selectionDeadlineAt,
                customer: o.customer ? {
                    ...o.customer,
                    customerCode: o.customer.id ? `CUS-${o.customer.id.substring(0, 6).toUpperCase()}` : undefined
                } : undefined,
                price: o.totalAmount ? Number(o.totalAmount) : (() => {
                    const allAccepted = o.offers?.filter((of: any) => ['ACCEPTED', 'COMPLETED', 'SHIPPED', 'DELIVERED'].includes(String(of.status).toUpperCase())) || [];
                    if (allAccepted.length > 0) {
                        return allAccepted.reduce((total: number, of: any) => {
                            const base = Number(of.unitPrice || 0);
                            const shipping = Number(of.shippingCost || 0);
                            const percentCommission = Math.round(base * 0.25);
                            const commission = base > 0 ? Math.max(percentCommission, 100) : 0;
                            return total + base + shipping + commission;
                        }, 0);
                    }
                    return 0;
                })(),
                merchantName: o.offers?.find((of: any) => ['ACCEPTED', 'COMPLETED', 'SHIPPED', 'DELIVERED'].includes(String(of.status).toUpperCase()))?.store?.name || null,
                acceptedOffer: o.offers?.find((of: any) => ['ACCEPTED', 'COMPLETED', 'SHIPPED', 'DELIVERED'].includes(String(of.status).toUpperCase())),
                acceptedOffers: o.offers?.filter((of: any) => ['ACCEPTED', 'COMPLETED', 'SHIPPED', 'DELIVERED'].includes(String(of.status).toUpperCase())),
                verificationDocuments: normalizeVerificationDocuments(o.verificationDocuments),
                verificationSubmittedAt: o.verificationSubmittedAt,
                correctionDeadlineAt: o.correctionDeadlineAt,
                shipments: o.shipments || [],
                shippingAddresses: (o.shippingAddresses || []).map((a: any) => ({
                    orderPartId: a.orderPartId ?? a.order_part_id ?? null,
                    fullName: a.fullName ?? a.full_name ?? '',
                    phone: a.phone ?? '',
                    email: a.email ?? '',
                    country: a.country ?? '',
                    city: a.city ?? '',
                    details: a.details ?? '',
                })),
                shippingWaybills: o.shippingWaybills || [],
                shipmentBatches: Array.isArray(o.shipmentBatches)
                    ? o.shipmentBatches.map((b: any) => ({
                          shipmentId: b.shipmentId,
                          waybillId: b.waybillId ?? null,
                          waybillNumber: b.waybillNumber ?? null,
                          offerIds: b.offerIds || [],
                          partNames: b.partNames || [],
                          batchSize: b.batchSize ?? (b.offerIds?.length || 0),
                          shippedAt: b.shippedAt ?? null,
                          trigger: b.trigger ?? null,
                          status: b.status,
                      }))
                    : [],
                invoices: o.invoices || [],
                warranty_active_at: o.warranty_active_at || o.warrantyActiveAt,
                warranty_end_at: o.warranty_end_at || o.warrantyEndAt,
                review: o.review
                    ? {
                        id: o.review.id,
                        rating: o.review.rating,
                        comment: o.review.comment,
                        adminStatus: o.review.adminStatus,
                        createdAt: o.review.createdAt,
                    }
                    : undefined,
            }));
    },

    addOrder: async (newOrderData) => {
        // Basic Parsing of "Car" string: "Toyota Camry 2023"
        const parts = newOrderData.car.split(' ');
        const year = parseInt(parts[parts.length - 1]);
        const make = parts[0] || 'Unknown';
        const model = parts.slice(1, parts.length - 1).join(' ') || 'Unknown';

        try {
            const backendPayload = {
                vehicleMake: make,
                vehicleModel: model,
                vehicleYear: isNaN(year) ? 2024 : year,
                partName: newOrderData.part,
                vin: newOrderData.vin
            };

            await ordersApi.create(backendPayload);
            // Refresh orders
            await get().fetchOrders();

            // Audit logging is handled by backend
            // useAuditStore.getState().logAction(...);

        } catch (err) {
            console.error('Failed to create order', err);
        }
    },

    addOfferToOrder: (orderId: string, offerData) => {
        // Add offer to order — does NOT change status. Only customer accepting changes status.
        set((state) => ({
            orders: state.orders.map(o => {
                if (o.id !== orderId) return o;
                return {
                    ...o,
                    // Increment the count properties so the UI registers the new total immediately
                    offersCount: (o.offersCount || o._count?.offers || 0) + 1,
                    _count: {
                        ...o._count,
                        offers: (o._count?.offers || o.offersCount || 0) + 1
                    },
                    offers: [...(o.offers || []), { id: `TMP-${Date.now()}`, submittedAt: new Date().toISOString(), ...offerData }]
                };
            })
        }));
    },

    removeOfferFromOrder: (offerId: string) => {
        set((state) => ({
            orders: state.orders.map((o) => {
                const prev = o.offers || [];
                const next = prev.filter((of) => String(of.id) !== String(offerId));
                if (next.length === prev.length) return o;
                return {
                    ...o,
                    offers: next,
                    offersCount: next.length,
                    _count: o._count ? { ...o._count, offers: next.length } : o._count,
                };
            }),
        }));
    },

    markOfferWithdrawnInOrder: (offerId: string) => {
        set((state) => ({
            orders: state.orders.map((o) => ({
                ...o,
                offers: (o.offers || []).map((of) =>
                    String(of.id) === String(offerId)
                        ? { ...of, isWithdrawn: true, status: 'withdrawn' }
                        : of,
                ),
            })),
        }));
    },

    rejectOffer: async (orderId: string, offerId: string, reason: string, customReason?: string) => {
        // Optimistic UI Update first
        set((state) => ({
            orders: state.orders.map(o => {
                if (o.id !== orderId) return o;
                return {
                    ...o,
                    offers: o.offers?.map(offer =>
                        offer.id === offerId ? { ...offer, status: 'rejected' } : offer
                    )
                };
            })
        }));

        try {
            await ordersApi.rejectOffer(orderId, offerId, { reason, customReason });
        } catch (error) {
            console.error("Failed to reject offer", error);
            await get().silentFetch();
        }
    },

    acceptOffer: async (orderId: string, partId: string, offerId: string) => {
        const normPartId = String(partId);
        const normOfferId = String(offerId);

        set((state) => ({
            orders: state.orders.map(o => {
                if (String(o.id) !== String(orderId)) return o;
                return {
                    ...o,
                    offers: o.offers?.map(offer => {
                        if (String(offer.id) === normOfferId) return { ...offer, status: 'ACCEPTED' };
                        if (
                            String(offer.orderPartId) === normPartId &&
                            String(offer.id) !== normOfferId &&
                            String(offer.status).toUpperCase() !== 'REJECTED'
                        ) {
                            return { ...offer, status: 'REJECTED' };
                        }
                        return offer;
                    }),
                };
            }),
        }));

        try {
            await ordersApi.acceptOfferForPart(orderId, partId, offerId);
            await get().fetchOrder(orderId);
        } catch (error) {
            console.error('Failed to accept offer', error);
            await get().fetchOrder(orderId);
            throw error;
        }
    },

    transitionOrder: async (id, targetStatus, actor = 'SYSTEM', metadata = {}) => {
        const { orders } = get();
        const previousOrders = [...orders];

        // 1. Optimistic Update (2026 UX Standard)
        const now = new Date().toISOString();
        set((state) => ({
            orders: state.orders.map(o => String(o.id) === String(id) ? { ...o, status: targetStatus, updatedAt: now } : o)
        }));

        try {
            await ordersApi.transition(id, targetStatus, JSON.stringify(metadata));
            const { activeOrderId, fetchOrder } = get();
            if (String(activeOrderId) === String(id)) {
                await fetchOrder(id);
            }
            return { success: true };
        } catch (err: any) {
            console.error('Transition failed, rolling back...', err);
            // Rollback on failure
            set({ orders: previousOrders });
            return { 
                success: false, 
                message: err.response?.data?.message || 'Transition Failed' 
            };
        }
    },

    forceStatus: (id, status, adminNote) => {
        // Admin Force - Call transition with special flag if backend supports, 
        // or just normal transition for now.
        get().transitionOrder(id, status, 'ADMIN_FORCE', { note: adminNote });
    },

    processPaymentWebhook: (event, orderId: string) => {
        // Implementation pending Stripe Backend
    },

    checkSLA: () => {
        // ... keep existing logic
    },

    getOrder: (id: string) => get().orders.find(o => String(o.id) === String(id)),
    getValidTransitions: (status) => TRANSITION_RULES[status] || [],
    updateOrderStatus: (id: string, status: StatusType) => get().transitionOrder(id, status, 'LEGACY_CALL'),

    adminUpdateOffer: async (offerId, updateDto) => {
        const token = localStorage.getItem('access_token');
        const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
        const response = await fetch(`${API_URL}/offers/admin/${offerId}`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(updateDto)
        });
        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.message || 'Failed to update offer by admin');
        }
        const { activeOrderId, fetchOrder, silentFetch } = get();
        if (activeOrderId) await fetchOrder(activeOrderId);
        else await silentFetch();
    },

    adminDeleteOffer: async (offerId) => {
        const token = localStorage.getItem('access_token');
        const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
        const response = await fetch(`${API_URL}/offers/admin/${offerId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.message || 'Failed to delete offer by admin');
        }
        get().removeOfferFromOrder(offerId);
        const { activeOrderId, fetchOrder, silentFetch } = get();
        if (activeOrderId) await fetchOrder(activeOrderId);
        else await silentFetch();
    },
    
    withdrawOffer: async (offerId) => {
        const token = localStorage.getItem('access_token');
        const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
        const response = await fetch(`${API_URL}/offers/${offerId}/withdraw`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.message || 'Failed to withdraw offer');
        }
        get().markOfferWithdrawnInOrder(offerId);
        const { activeOrderId, fetchOrder, silentFetch } = get();
        if (activeOrderId) await fetchOrder(activeOrderId);
        else await silentFetch();
    },

    updateAdminNotes: async (orderId, notes) => {
        // Optimistic Update for real-time feel
        set((state) => ({
            orders: state.orders.map(o => String(o.id) === String(orderId) ? { ...o, adminNotes: notes } : o)
        }));

        const token = localStorage.getItem('access_token');
        const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
        const response = await fetch(`${API_URL}/orders/admin/${orderId}/notes`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ notes })
        });
        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.message || 'Failed to update admin notes');
        }
        await get().fetchOrder(orderId);
    },

    confirmOrderReceived: async (id: string, note?: string) => {
        // 1. Optimistic UI Update
        const previousOrders = get().orders;
        const nowIso = new Date().toISOString();
        set((state) => ({
            orders: state.orders.map(o =>
                String(o.id) === String(id)
                    ? {
                          ...o,
                          status: 'DELIVERED',
                          updatedAt: nowIso,
                          deliveredAt: o.deliveredAt || nowIso,
                      }
                    : o
            ),
        }));

        try {
            await ordersApi.confirmDelivery(id, note);
            
            // 2. Trigger a sync fetch after small delay to let DB propagate
            setTimeout(() => { get().silentFetch(); }, 2000);
            return true;
        } catch (error) {
            console.error('Failed to confirm delivery', error);
            // 3. Revert on failure
            set({ orders: previousOrders });
            return false;
        }
    },

    cancelOrder: async (id: string, reason?: string) => {
        // Optimistic UI
        const previousOrders = get().orders;
        set(state => ({
            orders: state.orders.map(o => String(o.id) === String(id) ? { ...o, status: 'CANCELLED' as StatusType } : o)
        }));

        try {
            await ordersApi.cancel(id, reason);
            get().silentFetch();
            return true;
        } catch (err) {
            console.error('Failed to cancel order', err);
            set({ orders: previousOrders }); // Rollback
            return false;
        }
    },

    deleteOrder: async (id: string) => {
        // Optimistic UI
        const previousOrders = get().orders;
        set(state => ({
            orders: state.orders.filter(o => String(o.id) !== String(id))
        }));

        try {
            await ordersApi.delete(id);
            get().silentFetch();
            return true;
        } catch (err) {
            console.error('Failed to delete order', err);
            set({ orders: previousOrders }); // Rollback
            return false;
        }
    },

    renewOrder: async (id: string) => {
        set({ isLoading: true });
        try {
            await ordersApi.renew(id);
            await get().fetchOrder(id);
            await get().fetchOrders();
            set({ isLoading: false });
            return true;
        } catch (err) {
            console.error('Failed to renew order', err);
            set({ isLoading: false });
            return false;
        }
    },

    getOrderById: (id: string) => {
        return get().orders.find(o => String(o.id) === String(id));
    },

    canCancelOrder: (id: string) => {
        const order = get().orders.find(o => String(o.id) === String(id));
        if (!order) return false;
        const immutableStatuses = ['SHIPPED', 'DELIVERED', 'COMPLETED', 'CANCELLED'];
        return !immutableStatuses.includes(order.status);
    }
}));
