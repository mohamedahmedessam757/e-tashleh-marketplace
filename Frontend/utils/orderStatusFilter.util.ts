/**
 * Customer order list / home filter buckets & Prisma order statuses.
 */

export const ORDER_STATUS_FILTER_VALUES = [
    'COLLECTING_OFFERS',
    'AWAITING_SELECTION',
    'AWAITING_OFFERS',
    'AWAITING_PAYMENT',
    'PARTIALLY_PAID',
    'PREPARATION',
    'DELAYED_PREPARATION',
    'PREPARED',
    'VERIFICATION',
    'VERIFICATION_SUCCESS',
    'NON_MATCHING',
    'CORRECTION_PERIOD',
    'CORRECTION_SUBMITTED',
    'READY_FOR_SHIPPING',
    'PARTIALLY_SHIPPED',
    'SHIPPED',
    'PARTIALLY_DELIVERED',
    'DELIVERED',
    'COMPLETED',
    'CANCELLED',
    'RETURNED',
    'DISPUTED',
    'RETURN_REQUESTED',
    'RETURN_APPROVED',
    'REFUNDED',
    'RESOLVED',
    'CLOSED',
    'WARRANTY_ACTIVE',
    'WARRANTY_EXPIRED',
] as const;

export type OrderStatusFilterValue = (typeof ORDER_STATUS_FILTER_VALUES)[number];

export const ACTIVE_ORDER_BUCKET = [
    'AWAITING_OFFERS',
    'COLLECTING_OFFERS',
    'AWAITING_SELECTION',
    'AWAITING_PAYMENT',
    'PARTIALLY_PAID',
    'PREPARATION',
    'DELAYED_PREPARATION',
    'PREPARED',
    'VERIFICATION',
    'VERIFICATION_SUCCESS',
    'NON_MATCHING',
    'CORRECTION_PERIOD',
    'CORRECTION_SUBMITTED',
    'READY_FOR_SHIPPING',
    'PARTIALLY_SHIPPED',
    'SHIPPED',
    'PARTIALLY_DELIVERED',
    'DISPUTED',
    'RETURN_REQUESTED',
    'RETURN_APPROVED',
] as const;

export const COMPLETED_ORDER_BUCKET = [
    'COMPLETED',
    'DELIVERED',
    'WARRANTY_ACTIVE',
    'WARRANTY_EXPIRED',
    'CLOSED',
    'RESOLVED',
    'REFUNDED',
    'RETURNED',
] as const;

export const PENDING_ORDER_BUCKET = ['AWAITING_OFFERS', 'COLLECTING_OFFERS'] as const;

const FEATURED_PRIORITY: string[] = [
    'SHIPPED',
    'PARTIALLY_SHIPPED',
    'PARTIALLY_DELIVERED',
    'READY_FOR_SHIPPING',
    'VERIFICATION_SUCCESS',
    'VERIFICATION',
    'PREPARATION',
    'DELAYED_PREPARATION',
    'AWAITING_PAYMENT',
    'PARTIALLY_PAID',
    'AWAITING_SELECTION',
    'COLLECTING_OFFERS',
    'AWAITING_OFFERS',
    'PREPARED',
    'NON_MATCHING',
    'CORRECTION_PERIOD',
    'CORRECTION_SUBMITTED',
    'DISPUTED',
    'RETURN_REQUESTED',
    'RETURN_APPROVED',
];

export function pickFeaturedOrder<T extends { status: string }>(orders: T[]): T | undefined {
    for (const status of FEATURED_PRIORITY) {
        const found = orders.find((o) => o.status === status);
        if (found) return found;
    }
    return orders[0];
}

export function countOrdersByStatus<T extends { status: string }>(
    orders: T[],
): { status: string; count: number }[] {
    const map = new Map<string, number>();
    for (const o of orders) {
        const s = String(o.status || '');
        if (!s) continue;
        map.set(s, (map.get(s) || 0) + 1);
    }
    return Array.from(map.entries())
        .map(([status, count]) => ({ status, count }))
        .sort((a, b) => b.count - a.count || a.status.localeCompare(b.status));
}
