import { describe, it, expect } from '@jest/globals';
import { OrderStatus } from '@prisma/client';
import {
  calculateWarrantyEndDate,
  resolveCompletionWarranty,
  isOfferInWarranty,
  isOfferWarrantyClaimEligible,
  isWarrantyClaimReason,
} from './warranty-activation.util';

describe('calculateWarrantyEndDate', () => {
  it('adds months for 1month', () => {
    const start = new Date(2026, 0, 15, 12, 0, 0);
    const end = calculateWarrantyEndDate(start, '1month');
    expect(end.getFullYear()).toBe(2026);
    expect(end.getMonth()).toBe(1); // February
    expect(end.getDate()).toBe(15);
  });

  it('treats bare Arabic شهر as 1 month', () => {
    const start = new Date(2026, 0, 15, 12, 0, 0);
    const end = calculateWarrantyEndDate(start, 'شهر');
    expect(end.getFullYear()).toBe(2026);
    expect(end.getMonth()).toBe(1);
    expect(end.getDate()).toBe(15);
  });

  it('defaults truly unknown format to +15 days', () => {
    const start = new Date(2026, 0, 1, 0, 0, 0);
    const end = calculateWarrantyEndDate(start, 'custom-warranty');
    expect(end.getTime() - start.getTime()).toBe(15 * 24 * 60 * 60 * 1000);
  });
});

describe('resolveCompletionWarranty', () => {
  const now = new Date('2026-07-28T12:00:00.000Z');

  it('stays COMPLETED when no warranty', () => {
    expect(
      resolveCompletionWarranty(
        [{ hasWarranty: false, warrantyDuration: 'no' }],
        now,
      ),
    ).toEqual({ activate: false, effectiveStatus: OrderStatus.COMPLETED });
  });

  it('activates WARRANTY_ACTIVE with farthest end date', () => {
    const result = resolveCompletionWarranty(
      [
        { hasWarranty: true, warrantyDuration: '1month' },
        { hasWarranty: true, warrantyDuration: '3months' },
      ],
      now,
    );
    expect(result.activate).toBe(true);
    expect(result.effectiveStatus).toBe(OrderStatus.WARRANTY_ACTIVE);
    expect(result.endAt).toBeInstanceOf(Date);
    const oneMonth = calculateWarrantyEndDate(now, '1month');
    const threeMonths = calculateWarrantyEndDate(now, '3months');
    expect(result.endAt!.getTime()).toBe(threeMonths.getTime());
    expect(result.endAt!.getTime()).toBeGreaterThan(oneMonth.getTime());
  });

  it('ignores non-completed requested status', () => {
    expect(
      resolveCompletionWarranty(
        [{ hasWarranty: true, warrantyDuration: '1month' }],
        now,
        OrderStatus.DELIVERED,
      ),
    ).toEqual({ activate: false, effectiveStatus: OrderStatus.DELIVERED });
  });
});

describe('isWarrantyClaimReason', () => {
  it('accepts warranty_claim and replacement', () => {
    expect(isWarrantyClaimReason('warranty_claim')).toBe(true);
    expect(isWarrantyClaimReason('replacement')).toBe(true);
    expect(isWarrantyClaimReason('damaged')).toBe(false);
  });
});

describe('isOfferInWarranty', () => {
  const now = new Date('2026-07-01T12:00:00.000Z');

  it('uses warrantyEndAt when present', () => {
    expect(
      isOfferInWarranty(
        { warrantyEndAt: new Date('2026-08-01T00:00:00.000Z') },
        now,
      ),
    ).toBe(true);
    expect(
      isOfferInWarranty(
        { warrantyEndAt: new Date('2026-06-01T00:00:00.000Z') },
        now,
      ),
    ).toBe(false);
  });

  it('falls back to duration from warrantyActiveAt', () => {
    expect(
      isOfferInWarranty(
        {
          hasWarranty: true,
          warrantyDuration: 'month1',
          warrantyActiveAt: new Date('2026-06-15T00:00:00.000Z'),
        },
        now,
      ),
    ).toBe(true);
  });
});

describe('isOfferWarrantyClaimEligible', () => {
  const offer = {
    fulfillmentStatus: 'DELIVERED',
    resolutionLocked: false,
    warrantyEndAt: new Date('2026-09-01T00:00:00.000Z'),
  };

  it('allows short window without warranty reason', () => {
    expect(
      isOfferWarrantyClaimEligible(offer, 'damaged', {
        inShortReturnWindow: true,
      }),
    ).toBe(true);
  });

  it('allows warranty claim after short window when in warranty', () => {
    expect(
      isOfferWarrantyClaimEligible(offer, 'warranty_claim', {
        inShortReturnWindow: false,
        now: new Date('2026-07-01T12:00:00.000Z'),
      }),
    ).toBe(true);
  });

  it('blocks non-warranty reason after short window', () => {
    expect(
      isOfferWarrantyClaimEligible(offer, 'damaged', {
        inShortReturnWindow: false,
        now: new Date('2026-07-01T12:00:00.000Z'),
      }),
    ).toBe(false);
  });
});
