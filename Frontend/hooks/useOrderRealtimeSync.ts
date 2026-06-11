import { useEffect, useRef } from 'react';
import { supabase } from '../services/supabase';
import {
    useOrderStore,
    mapRealtimeOrderRow,
} from '../stores/useOrderStore';

const DETAIL_FETCH_DEBOUNCE_MS = 300;

export interface UseOrderRealtimeSyncOptions {
    /** Subscribe to review changes (customer order details). */
    includeReviews?: boolean;
    /** Called after offers table changes (e.g. merchant myOffers refresh). */
    onOffersChange?: () => void;
}

/**
 * Per-order Supabase sync: instant patch + debounced fetchOrder.
 * Sets activeOrderId while mounted so global realtime prefers detail fetch.
 */
export function useOrderRealtimeSync(
    orderId: string | undefined,
    options: UseOrderRealtimeSyncOptions = {},
) {
    const { includeReviews = false, onOffersChange } = options;
    const fetchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const onOffersChangeRef = useRef(onOffersChange);
    onOffersChangeRef.current = onOffersChange;

    const scheduleFetch = (id: string) => {
        if (fetchDebounceRef.current) clearTimeout(fetchDebounceRef.current);
        fetchDebounceRef.current = setTimeout(() => {
            useOrderStore.getState().fetchOrder(id);
        }, DETAIL_FETCH_DEBOUNCE_MS);
    };

    useEffect(() => {
        if (!orderId) return;

        const {
            setActiveOrderId,
            fetchOrder,
            patchOrderFromRealtime,
            patchVerificationFromRealtime,
        } = useOrderStore.getState();

        setActiveOrderId(orderId);
        fetchOrder(orderId);

        const handleOrderUpdate = (payload: { new: Record<string, unknown> }) => {
            const partial = mapRealtimeOrderRow(payload.new || {});
            if (Object.keys(partial).length > 0) {
                patchOrderFromRealtime(orderId, partial);
            }
            scheduleFetch(orderId);
        };

        const orderChannel = supabase
            .channel(`order_sync_${orderId}`)
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'orders',
                    filter: `id=eq.${orderId}`,
                },
                handleOrderUpdate,
            )
            .subscribe();

        const offersChannel = supabase
            .channel(`order_offers_sync_${orderId}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'offers',
                    filter: `order_id=eq.${orderId}`,
                },
                () => {
                    onOffersChangeRef.current?.();
                    scheduleFetch(orderId);
                },
            )
            .subscribe();

        const verificationChannel = supabase
            .channel(`order_verification_sync_${orderId}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'verification_documents',
                    filter: `order_id=eq.${orderId}`,
                },
                (payload) => {
                    if (payload.new && typeof payload.new === 'object') {
                        patchVerificationFromRealtime(
                            orderId,
                            payload.new as Record<string, unknown>,
                        );
                    }
                    scheduleFetch(orderId);
                },
            )
            .subscribe();

        let reviewsChannel: ReturnType<typeof supabase.channel> | null = null;
        if (includeReviews) {
            reviewsChannel = supabase
                .channel(`order_reviews_sync_${orderId}`)
                .on(
                    'postgres_changes',
                    { event: '*', schema: 'public', table: 'reviews' },
                    () => scheduleFetch(orderId),
                )
                .subscribe();
        }

        return () => {
            if (fetchDebounceRef.current) clearTimeout(fetchDebounceRef.current);
            setActiveOrderId(null);
            supabase.removeChannel(orderChannel);
            supabase.removeChannel(offersChannel);
            supabase.removeChannel(verificationChannel);
            if (reviewsChannel) supabase.removeChannel(reviewsChannel);
        };
    }, [orderId, includeReviews]);
}
