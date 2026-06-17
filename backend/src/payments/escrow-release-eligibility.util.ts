import { OrderStatus } from '@prisma/client';

/** Order statuses eligible for escrow auto-release after the return window. */
export const ESCROW_AUTO_RELEASE_STATUSES: OrderStatus[] = [
    OrderStatus.COMPLETED,
    OrderStatus.WARRANTY_ACTIVE,
    OrderStatus.DELIVERED,
    OrderStatus.PARTIALLY_DELIVERED,
];

const MS_24H = 24 * 60 * 60 * 1000;

export function resolveEscrowReleaseAnchor(order: {
    deliveredAt: Date | null;
    updatedAt: Date;
}): Date {
    return order.deliveredAt ?? order.updatedAt;
}

export function isOrderEligibleForEscrowAutoRelease(
    order: {
        status: OrderStatus;
        deliveredAt: Date | null;
        updatedAt: Date;
    },
    windowEnd: Date,
): boolean {
    if (!ESCROW_AUTO_RELEASE_STATUSES.includes(order.status)) {
        return false;
    }
    const anchor = resolveEscrowReleaseAnchor(order);
    return anchor.getTime() <= windowEnd.getTime();
}

export function escrowReleaseWindowEnd(now = new Date()): Date {
    return new Date(now.getTime() - MS_24H);
}
