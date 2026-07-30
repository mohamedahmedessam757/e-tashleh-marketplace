import { OrderStatus } from '@prisma/client';

export type WarrantyOfferLike = {
  hasWarranty?: boolean | null;
  warrantyDuration?: string | null;
};

export type CompletionWarrantyResult = {
  activate: boolean;
  endAt?: Date;
  effectiveStatus: OrderStatus;
};

/** Shared warranty end-date parser (day / month / year; unknown → +15 days). */
export function calculateWarrantyEndDate(startDate: Date, duration: string): Date {
  const date = new Date(startDate);
  const d = String(duration || '').toLowerCase();

  if (d.includes('day')) {
    const num = parseInt(d.match(/\d+/)?.[0] || '0', 10);
    date.setDate(date.getDate() + num);
  } else if (d.includes('month')) {
    const num = parseInt(d.match(/\d+/)?.[0] || '1', 10);
    date.setMonth(date.getMonth() + num);
  } else if (d.includes('year')) {
    const num = parseInt(d.match(/\d+/)?.[0] || '1', 10);
    date.setFullYear(date.getFullYear() + num);
  } else {
    date.setDate(date.getDate() + 15);
  }

  return date;
}

export function offerHasUsableWarranty(offer: WarrantyOfferLike): boolean {
  return Boolean(
    offer.hasWarranty &&
      offer.warrantyDuration &&
      offer.warrantyDuration !== 'no',
  );
}

/**
 * When completion is requested and any offer has usable warranty,
 * promote to WARRANTY_ACTIVE and compute the farthest warranty end.
 * Caller must pass accepted offers only.
 */
export function resolveCompletionWarranty(
  acceptedOffers: WarrantyOfferLike[],
  now: Date = new Date(),
  requestedStatus: OrderStatus = OrderStatus.COMPLETED,
): CompletionWarrantyResult {
  if (requestedStatus !== OrderStatus.COMPLETED) {
    return { activate: false, effectiveStatus: requestedStatus };
  }

  const warrantied = (acceptedOffers || []).filter(offerHasUsableWarranty);
  if (warrantied.length === 0) {
    return { activate: false, effectiveStatus: OrderStatus.COMPLETED };
  }

  const ends = warrantied.map((o) =>
    calculateWarrantyEndDate(now, String(o.warrantyDuration)),
  );

  return {
    activate: true,
    endAt: new Date(Math.max(...ends.map((d) => d.getTime()))),
    effectiveStatus: OrderStatus.WARRANTY_ACTIVE,
  };
}
