import { describe, it, expect } from '@jest/globals';
import { isReorderEligibleSourceStatus } from './order-reorder.util';
import { assertHandoverNotInPast } from './handover-datetime.util';

describe('isReorderEligibleSourceStatus', () => {
    it('allows post-collection statuses matching frontend POST_COLLECTION_STATUSES', () => {
        expect(isReorderEligibleSourceStatus('AWAITING_SELECTION')).toBe(true);
        expect(isReorderEligibleSourceStatus('AWAITING_PAYMENT')).toBe(true);
        expect(isReorderEligibleSourceStatus('PARTIALLY_PAID')).toBe(true);
        expect(isReorderEligibleSourceStatus('PREPARATION')).toBe(true);
        expect(isReorderEligibleSourceStatus('CANCELLED')).toBe(true);
    });

    it('rejects terminal / later fulfillment statuses', () => {
        expect(isReorderEligibleSourceStatus('COMPLETED')).toBe(false);
        expect(isReorderEligibleSourceStatus('SHIPPED')).toBe(false);
        expect(isReorderEligibleSourceStatus('DELIVERED')).toBe(false);
        expect(isReorderEligibleSourceStatus('COLLECTING_OFFERS')).toBe(false);
    });
});

describe('assertHandoverNotInPast', () => {
    const now = new Date(2026, 8, 15, 14, 0, 0, 0).getTime(); // Sep 15 2026 14:00 local

    it('rejects yesterday', () => {
        const r = assertHandoverNotInPast('2026-09-14', '10:00', now);
        expect(r.ok).toBe(false);
    });

    it('allows later today', () => {
        const r = assertHandoverNotInPast('2026-09-15', '15:00', now);
        expect(r.ok).toBe(true);
    });

    it('allows missing fields (other validators handle required)', () => {
        expect(assertHandoverNotInPast(null, null, now).ok).toBe(true);
    });
});
