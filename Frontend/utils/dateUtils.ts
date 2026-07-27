/**
 * Returns the correct deadline ISO string for the current order status.
 * Uses server activeSla when present, otherwise client resolver + public config.
 */

import { resolveOrderActiveSla } from './resolveOrderActiveSla';

export const getDynamicOrderDeadline = (order: any): string | null => {
    if (!order || !order.status) return null;
    const sla = resolveOrderActiveSla(order);
    return sla?.endsAt ?? null;
};

/**
 * Returns true if the current deadline for the order has passed.
 * Treats CANCELLED orders as expired.
 */
export const isOrderExpired = (order: any): boolean => {
    if (!order) return false;
    if (order.status === 'CANCELLED') return true;
    
    // Pre-payment windows that can naturally expire into a dead/cancelled state.
    if (!['AWAITING_OFFERS', 'COLLECTING_OFFERS', 'AWAITING_SELECTION', 'AWAITING_PAYMENT'].includes(order.status)) {
        return false;
    }

    const deadline = getDynamicOrderDeadline(order);
    if (!deadline) return false;
    return new Date().getTime() > new Date(deadline).getTime();
};
