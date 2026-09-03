/**
 * Regression tests for the merchant offer action policy:
 *  - Cancel within the allowed 23h window records a violation but does NOT lock the part.
 *  - Re-bid on the same part is allowed until offersStopAt (final hour before reveal).
 *  - Final hour (last 1h before reveal) blocks create / edit / cancel.
 *
 * Pure unit tests — no DB. The policy util is the single source of truth shared by OffersService.
 */

import { OrderStatus } from '@prisma/client';
import {
    blockedPartIdsAfterWithdrawals,
    CANCEL_BLOCKS_SAME_PART_REBID,
    denyReasonForCancel,
    denyReasonForCreate,
    denyReasonForEdit,
    isBiddingStoppedForMerchants,
    isWithinMerchantActionWindow,
    isOpenBiddingStatus,
} from './offer-action-policy.util';

const REVEAL = new Date('2026-09-10T12:00:00Z'); // 24h collection window
const OFFERS_STOP = new Date(REVEAL.getTime() - 60 * 60 * 1000); // hour 23

function orderAt(now: Date, status: OrderStatus = OrderStatus.COLLECTING_OFFERS) {
    return {
        status,
        createdAt: new Date(REVEAL.getTime() - 24 * 60 * 60 * 1000),
        revealOffersAt: REVEAL,
        offersStopAt: OFFERS_STOP,
    };
}

describe('offer-action-policy (cancel = violation, re-bid allowed on same part)', () => {
    it('exposes the product policy flag: cancel does NOT block same-part re-bid', () => {
        expect(CANCEL_BLOCKS_SAME_PART_REBID).toBe(false);
    });

    it('allows create within the 23h window (e.g. hour 1)', () => {
        const now = new Date(REVEAL.getTime() - 23 * 60 * 60 * 1000); // 1h after start
        const deny = denyReasonForCreate({ now, order: orderAt(now) });
        expect(deny).toBeNull();
    });

    it('allows create at the very end of the 23h window (just before offersStopAt)', () => {
        const now = new Date(OFFERS_STOP.getTime() - 1000); // 1s before stop
        const deny = denyReasonForCreate({ now, order: orderAt(now) });
        expect(deny).toBeNull();
    });

    it('blocks create in the final hour (last 1h before reveal)', () => {
        const now = new Date(OFFERS_STOP.getTime() + 5 * 60 * 1000); // 5m after stop
        const deny = denyReasonForCreate({ now, order: orderAt(now) });
        expect(deny).toBe('BIDDING_STOPPED');
    });

    it('blocks create after reveal (order closed)', () => {
        const now = new Date(REVEAL.getTime() + 60 * 1000);
        const deny = denyReasonForCreate({
            now,
            order: orderAt(now, OrderStatus.AWAITING_SELECTION),
        });
        expect(deny).toBe('ORDER_STATUS_CLOSED');
    });

    it('allows cancel within the 23h window and does NOT lock the part', () => {
        const now = new Date(REVEAL.getTime() - 5 * 60 * 60 * 1000); // hour 19
        const deny = denyReasonForCancel({
            now,
            order: orderAt(now),
            offerStoreId: 'store-1',
            actorStoreId: 'store-1',
            isWithdrawn: false,
        });
        expect(deny).toBeNull();
        // The part is NOT blocked after withdrawal — merchant can re-bid.
        expect(blockedPartIdsAfterWithdrawals([{ orderPartId: 'part-1', withdrawalType: 'cancelled' }])).toEqual([]);
    });

    it('blocks cancel in the final hour', () => {
        const now = new Date(OFFERS_STOP.getTime() + 5 * 60 * 1000);
        const deny = denyReasonForCancel({
            now,
            order: orderAt(now),
            offerStoreId: 'store-1',
            actorStoreId: 'store-1',
            isWithdrawn: false,
        });
        expect(deny).toBe('BIDDING_STOPPED');
    });

    it('blocks cancel by a non-owner', () => {
        const now = new Date(REVEAL.getTime() - 5 * 60 * 60 * 1000);
        const deny = denyReasonForCancel({
            now,
            order: orderAt(now),
            offerStoreId: 'store-1',
            actorStoreId: 'store-2',
            isWithdrawn: false,
        });
        expect(deny).toBe('NOT_OWNER');
    });

    it('blocks cancelling an already-withdrawn offer', () => {
        const now = new Date(REVEAL.getTime() - 5 * 60 * 60 * 1000);
        const deny = denyReasonForCancel({
            now,
            order: orderAt(now),
            offerStoreId: 'store-1',
            actorStoreId: 'store-1',
            isWithdrawn: true,
        });
        expect(deny).toBe('ALREADY_WITHDRAWN');
    });

    it('edit follows the same rules as cancel (window + ownership + withdrawn)', () => {
        const now = new Date(REVEAL.getTime() - 5 * 60 * 60 * 1000);
        expect(denyReasonForEdit({
            now,
            order: orderAt(now),
            offerStoreId: 'store-1',
            actorStoreId: 'store-1',
            isWithdrawn: false,
        })).toBeNull();

        expect(denyReasonForEdit({
            now: new Date(OFFERS_STOP.getTime() + 60 * 1000),
            order: orderAt(new Date(OFFERS_STOP.getTime() + 60 * 1000)),
            offerStoreId: 'store-1',
            actorStoreId: 'store-1',
            isWithdrawn: false,
        })).toBe('BIDDING_STOPPED');
    });

    it('re-bid on the same part is allowed after a withdrawal (no part lock)', () => {
        // Merchant cancelled on part-A. They may submit a new offer on part-A.
        const withdrawn = [
            { orderPartId: 'part-A', withdrawalType: 'cancelled' },
            { orderPartId: 'part-B', withdrawalType: 'cancelled' },
        ];
        expect(blockedPartIdsAfterWithdrawals(withdrawn)).toEqual([]);
    });

    it('helper predicates agree on the open-window boundary', () => {
        const justBefore = new Date(OFFERS_STOP.getTime() - 1);
        const justAfter = new Date(OFFERS_STOP.getTime() + 1);
        expect(isWithinMerchantActionWindow(orderAt(justBefore), justBefore)).toBe(true);
        expect(isBiddingStoppedForMerchants(orderAt(justBefore), justBefore)).toBe(false);
        expect(isWithinMerchantActionWindow(orderAt(justAfter), justAfter)).toBe(false);
        expect(isBiddingStoppedForMerchants(orderAt(justAfter), justAfter)).toBe(true);
    });

    it('isOpenBiddingStatus only treats COLLECTING/AWAITING_OFFERS as open', () => {
        expect(isOpenBiddingStatus(OrderStatus.COLLECTING_OFFERS)).toBe(true);
        expect(isOpenBiddingStatus(OrderStatus.AWAITING_OFFERS)).toBe(true);
        expect(isOpenBiddingStatus(OrderStatus.AWAITING_SELECTION)).toBe(false);
        expect(isOpenBiddingStatus(OrderStatus.CANCELLED)).toBe(false);
    });
});
