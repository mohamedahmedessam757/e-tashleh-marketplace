import { OfferFulfillmentStatus, OrderStatus } from '@prisma/client';
import {
    escrowReleaseWindowEnd,
    isEscrowPaymentEligibleForAutoRelease,
    isOrderEligibleForEscrowAutoRelease,
} from './escrow-release-eligibility.util';

describe('escrow-release-eligibility', () => {
    const now = new Date('2026-06-15T12:00:00.000Z');
    const windowEnd = escrowReleaseWindowEnd(now);

    it('releases immediately when order is COMPLETED even if updatedAt is recent', () => {
        const eligible = isEscrowPaymentEligibleForAutoRelease(
            {
                status: OrderStatus.COMPLETED,
                deliveredAt: null,
                updatedAt: now,
            },
            null,
            windowEnd,
        );
        expect(eligible).toBe(true);
    });

    it('releases COMPLETED multi-item payment when offer fulfillment is COMPLETED', () => {
        const eligible = isEscrowPaymentEligibleForAutoRelease(
            {
                status: OrderStatus.COMPLETED,
                deliveredAt: null,
                updatedAt: now,
            },
            {
                fulfillmentStatus: OfferFulfillmentStatus.COMPLETED,
                deliveredAt: new Date('2026-06-14T10:00:00.000Z'),
            },
            windowEnd,
        );
        expect(eligible).toBe(true);
    });

    it('does not release PREPARED orders', () => {
        const recent = isEscrowPaymentEligibleForAutoRelease(
            {
                status: OrderStatus.DELIVERED,
                deliveredAt: now,
                updatedAt: now,
            },
            null,
            windowEnd,
        );
        expect(recent).toBe(false);

        const old = isEscrowPaymentEligibleForAutoRelease(
            {
                status: OrderStatus.DELIVERED,
                deliveredAt: new Date('2026-06-13T10:00:00.000Z'),
                updatedAt: now,
            },
            null,
            windowEnd,
        );
        expect(old).toBe(true);
    });

    it('does not release PREPARED orders', () => {
        const eligible = isOrderEligibleForEscrowAutoRelease(
            {
                status: OrderStatus.PREPARED,
                deliveredAt: null,
                updatedAt: new Date('2026-06-10T10:00:00.000Z'),
            },
            windowEnd,
        );
        expect(eligible).toBe(false);
    });
});
