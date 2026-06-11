import { useEffect, useState } from 'react';
import { ordersApi } from '../services/api/orders';
import type { FulfillmentSummaryHint } from '../components/ui/StatusTimeline';

const PRE_PAYMENT_STATUSES = [
    'AWAITING_OFFERS',
    'COLLECTING_OFFERS',
    'AWAITING_SELECTION',
    'AWAITING_PAYMENT',
    'CANCELLED',
];

export function useOrderFulfillmentSummary(
    orderId: string | undefined,
    order: {
        status?: string;
        requestType?: string;
        offers?: Array<{ id?: string; fulfillmentStatus?: string }>;
    } | null | undefined,
): FulfillmentSummaryHint | null {
    const [fulfillmentSummary, setFulfillmentSummary] =
        useState<FulfillmentSummaryHint | null>(null);

    const offersKey =
        order?.offers?.map((o) => `${o.id}:${o.fulfillmentStatus}`).join('|') ?? '';

    useEffect(() => {
        if (!orderId || !order) {
            setFulfillmentSummary(null);
            return;
        }
        const isMultiPart =
            order.requestType === 'multiple' ||
            ((order as { parts?: unknown[] }).parts?.length ?? 0) > 1;
        if (!isMultiPart) {
            setFulfillmentSummary(null);
            return;
        }
        if (PRE_PAYMENT_STATUSES.includes(order.status || '')) {
            setFulfillmentSummary(null);
            return;
        }
        ordersApi
            .getFulfillmentSummary(orderId)
            .then(setFulfillmentSummary)
            .catch(() => setFulfillmentSummary(null));
    }, [orderId, order?.status, order?.requestType, offersKey]);

    return fulfillmentSummary;
}
