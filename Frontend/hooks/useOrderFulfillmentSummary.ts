import { useEffect, useRef, useState } from 'react';
import { ordersApi } from '../services/api/orders';
import type { FulfillmentSummaryHint } from '../components/ui/StatusTimeline';
import { onFulfillmentSummaryBump } from '../utils/fulfillmentSummarySync';

const PRE_PAYMENT_STATUSES = [
    'AWAITING_OFFERS',
    'COLLECTING_OFFERS',
    'AWAITING_SELECTION',
    'AWAITING_PAYMENT',
    'CANCELLED',
];

function buildOffersKey(
    offers?: Array<{
        id?: string;
        fulfillmentStatus?: string;
        resolutionLocked?: boolean;
        hasOpenCase?: boolean;
        deliveredAt?: string | null;
        completedAt?: string | null;
    }>,
) {
    return (
        offers
            ?.map(
                (o) =>
                    `${o.id}:${o.fulfillmentStatus}:${o.resolutionLocked ? 1 : 0}:${
                        o.hasOpenCase ? 1 : 0
                    }:${o.deliveredAt || ''}:${o.completedAt || ''}`,
            )
            .join('|') ?? ''
    );
}

export function useOrderFulfillmentSummary(
    orderId: string | undefined,
    order: {
        status?: string;
        requestType?: string;
        parts?: unknown[];
        offers?: Array<{
            id?: string;
            fulfillmentStatus?: string;
            resolutionLocked?: boolean;
            hasOpenCase?: boolean;
            deliveredAt?: string | null;
            completedAt?: string | null;
        }>;
    } | null | undefined,
): FulfillmentSummaryHint | null {
    const [fulfillmentSummary, setFulfillmentSummary] =
        useState<FulfillmentSummaryHint | null>(null);
    const [refreshTick, setRefreshTick] = useState(0);
    const requestSeq = useRef(0);
    const orderIdRef = useRef(orderId);
    orderIdRef.current = orderId;

    const offersKey = buildOffersKey(order?.offers);

    useEffect(() => {
        return onFulfillmentSummaryBump((targetOrderId) => {
            if (!orderIdRef.current) return;
            if (targetOrderId && String(targetOrderId) !== String(orderIdRef.current)) return;
            setRefreshTick((t) => t + 1);
        });
    }, []);

    useEffect(() => {
        if (!orderId || !order) {
            setFulfillmentSummary(null);
            return;
        }
        const isMultiPart =
            order.requestType === 'multiple' || (order.parts?.length ?? 0) > 1;
        if (!isMultiPart) {
            setFulfillmentSummary(null);
            return;
        }
        if (PRE_PAYMENT_STATUSES.includes(order.status || '')) {
            setFulfillmentSummary(null);
            return;
        }

        const seq = ++requestSeq.current;
        let cancelled = false;

        ordersApi
            .getFulfillmentSummary(orderId)
            .then((summary) => {
                if (cancelled || seq !== requestSeq.current) return;
                setFulfillmentSummary(summary);
            })
            .catch(() => {
                // Keep last good summary on transient errors (avoids timer flash).
                if (cancelled || seq !== requestSeq.current) return;
            });

        return () => {
            cancelled = true;
        };
    }, [orderId, order?.status, order?.requestType, offersKey, refreshTick]);

    return fulfillmentSummary;
}
