import { OfferFulfillmentStatus, OrderStatus } from '@prisma/client';

/** Order statuses that may release escrow after the return/dispute window. */
export const ESCROW_AUTO_RELEASE_STATUSES: OrderStatus[] = [
    OrderStatus.COMPLETED,
    OrderStatus.WARRANTY_ACTIVE,
    OrderStatus.WARRANTY_EXPIRED,
    OrderStatus.CLOSED,
    OrderStatus.DELIVERED,
    OrderStatus.PARTIALLY_DELIVERED,
];

const MS_24H = 24 * 60 * 60 * 1000;

const TERMINAL_RELEASE_ORDER_STATUSES: OrderStatus[] = [
    OrderStatus.COMPLETED,
    OrderStatus.WARRANTY_ACTIVE,
    OrderStatus.WARRANTY_EXPIRED,
    OrderStatus.CLOSED,
];

export function resolveEscrowReleaseAnchor(order: {
    deliveredAt: Date | null;
    updatedAt: Date;
}): Date {
    return order.deliveredAt ?? order.updatedAt;
}

export interface EscrowReleaseOfferContext {
    fulfillmentStatus?: OfferFulfillmentStatus | null;
    deliveredAt?: Date | null;
}

export interface EscrowReleaseOrderContext {
    status: OrderStatus;
    deliveredAt: Date | null;
    updatedAt: Date;
}

function isOfferWindowExpired(
    offer: EscrowReleaseOfferContext,
    windowEnd: Date,
): boolean {
    if (offer.fulfillmentStatus === OfferFulfillmentStatus.COMPLETED) {
        return true;
    }
    if (
        offer.fulfillmentStatus === OfferFulfillmentStatus.DELIVERED &&
        offer.deliveredAt != null &&
        offer.deliveredAt.getTime() <= windowEnd.getTime()
    ) {
        return true;
    }
    return false;
}

/**
 * Per-payment escrow release eligibility.
 * COMPLETED/WARRANTY_* orders release immediately — the 24h window is enforced before completion.
 */
export function isEscrowPaymentEligibleForAutoRelease(
    order: EscrowReleaseOrderContext,
    offer: EscrowReleaseOfferContext | null | undefined,
    windowEnd: Date,
): boolean {
    if (TERMINAL_RELEASE_ORDER_STATUSES.includes(order.status)) {
        return true;
    }

    if (offer?.fulfillmentStatus) {
        return isOfferWindowExpired(offer, windowEnd);
    }

    if (!ESCROW_AUTO_RELEASE_STATUSES.includes(order.status)) {
        return false;
    }

    if (order.status === OrderStatus.PARTIALLY_DELIVERED) {
        return false;
    }

    const anchor = resolveEscrowReleaseAnchor(order);
    return anchor.getTime() <= windowEnd.getTime();
}

/** @deprecated Prefer isEscrowPaymentEligibleForAutoRelease with offer context. */
export function isOrderEligibleForEscrowAutoRelease(
    order: EscrowReleaseOrderContext,
    windowEnd: Date,
): boolean {
    return isEscrowPaymentEligibleForAutoRelease(order, null, windowEnd);
}

export function escrowReleaseWindowEnd(now = new Date()): Date {
    return new Date(now.getTime() - MS_24H);
}
