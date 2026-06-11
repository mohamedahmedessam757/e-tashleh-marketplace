/**
 * Returns the correct deadline ISO string for the current order status.
 * Priority: DB-stored deadline > calculated from timestamps.
 * Works for BOTH the Order type from types.ts (useOrdersStore)
 * and the Order type from useOrderStore (merchant/admin views).
 */

import { POST_DELIVERY_RETURN_DISPUTE_HOURS } from './orderSla';

export const getDynamicOrderDeadline = (order: any): string | null => {
    if (!order || !order.status) return null;

    switch (order.status) {
        case 'COLLECTING_OFFERS':
        case 'AWAITING_OFFERS': {
            if (order.offersDeadlineAt) return order.offersDeadlineAt;
            if (order.offers_deadline_at) return order.offers_deadline_at;
            const dateStr = order.createdAt || order.created_at || order.date;
            if (!dateStr) return null;
            const d = new Date(dateStr);
            d.setHours(d.getHours() + 24);
            return d.toISOString();
        }
        
        case 'AWAITING_SELECTION': {
            if (order.selectionDeadlineAt) return order.selectionDeadlineAt;
            if (order.selection_deadline_at) return order.selection_deadline_at;
            const baseDate = order.revealOffersAt || order.reveal_offers_at || order.updatedAt || order.updated_at;
            if (!baseDate) return null;
            const d = new Date(baseDate);
            d.setHours(d.getHours() + 24);
            return d.toISOString();
        }

        case 'AWAITING_PAYMENT': {
            // Prefer DB-stored deadline
            if (order.paymentDeadlineAt) return order.paymentDeadlineAt;
            if (order.payment_deadline_at) return order.payment_deadline_at;
            // Fallback: 24h from offer acceptance
            const baseDate =
                order.offerAcceptedAt ||
                order.offer_accepted_at ||
                order.updatedAt ||
                order.updated_at;
            if (!baseDate) return null;
            const d = new Date(baseDate);
            d.setHours(d.getHours() + 24);
            return d.toISOString();
        }

        case 'PREPARATION': {
            // 48h from when payment was confirmed
            const payments = order.payments;
            if (payments && payments.length > 0) {
                const times = payments
                    .map((p: any) =>
                        new Date(
                            p.createdAt || p.created_at || p.paidAt || p.paid_at
                        ).getTime()
                    )
                    .filter(Boolean);
                if (times.length > 0) {
                    const earliest = new Date(Math.min(...times));
                    earliest.setHours(earliest.getHours() + 48);
                    return earliest.toISOString();
                }
            }
            // Fallback: 48h from updatedAt (when status transitioned to PREPARATION)
            const baseDate = order.updatedAt || order.updated_at;
            if (!baseDate) return null;
            const d = new Date(baseDate);
            d.setHours(d.getHours() + 48);
            return d.toISOString();
        }

        case 'DELAYED_PREPARATION': {
            // Hard deadline from DB — most critical
            if (order.delayedPreparationDeadlineAt) return order.delayedPreparationDeadlineAt;
            if (order.delayed_preparation_deadline_at) return order.delayed_preparation_deadline_at;
            return null;
        }

        case 'CORRECTION_PERIOD': {
            if (order.correctionDeadlineAt) return order.correctionDeadlineAt;
            if (order.correction_deadline_at) return order.correction_deadline_at;
            const baseDate = order.updatedAt || order.updated_at;
            if (!baseDate) return null;
            const d = new Date(baseDate);
            d.setHours(d.getHours() + 48);
            return d.toISOString();
        }

        case 'SHIPPED': {
            // 72h SLA for delivery
            const baseDate =
                order.shippedAt || order.shipped_at || order.updatedAt || order.updated_at;
            if (!baseDate) return null;
            const d = new Date(baseDate);
            d.setHours(d.getHours() + 72);
            return d.toISOString();
        }

        case 'DELIVERED':
        case 'DELIVERED_TO_CUSTOMER': {
            const baseDate =
                order.deliveredAt || order.delivered_at || order.updatedAt || order.updated_at;
            if (!baseDate) return null;
            const d = new Date(baseDate);
            d.setHours(d.getHours() + POST_DELIVERY_RETURN_DISPUTE_HOURS);
            return d.toISOString();
        }

        default:
            return null;
    }
};

/**
 * Returns true if the current deadline for the order has passed.
 * Treats CANCELLED orders as expired.
 */
export const isOrderExpired = (order: any): boolean => {
    if (!order) return false;
    if (order.status === 'CANCELLED') return true;
    
    // Only AWAITING_OFFERS and AWAITING_PAYMENT can naturally "expire" into a dead state.
    // Other statuses like PREPARATION, SHIPPED, DELIVERED have SLAs that might breach, 
    // but the order itself doesn't become "Expired", it becomes "Delayed" or "Completed".
    if (!['AWAITING_OFFERS', 'COLLECTING_OFFERS', 'AWAITING_PAYMENT'].includes(order.status)) {
        return false;
    }

    const deadline = getDynamicOrderDeadline(order);
    if (!deadline) return false;
    return new Date().getTime() > new Date(deadline).getTime();
};
