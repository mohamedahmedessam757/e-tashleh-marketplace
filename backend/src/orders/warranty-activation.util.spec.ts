import { describe, it, expect } from '@jest/globals';
import { OrderStatus } from '@prisma/client';
import {
  calculateWarrantyEndDate,
  resolveCompletionWarranty,
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
