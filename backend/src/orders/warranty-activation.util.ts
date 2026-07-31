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

/** Shared warranty end-date parser (day / month / year; AR synonyms; unknown → +15 days). */
export function calculateWarrantyEndDate(startDate: Date, duration: string): Date {
  const date = new Date(startDate);
  const raw = String(duration || '').trim();
  const d = raw.toLowerCase();
  const digits = parseInt(raw.match(/\d+/)?.[0] || '', 10);

  // Arabic bare forms (UI often shows «شهر» for 1 month)
  if (/شهرين|شهران/.test(raw)) {
    date.setMonth(date.getMonth() + 2);
    return date;
  }
  if (/سنة|عام/.test(raw) && !/\d/.test(raw)) {
    date.setFullYear(date.getFullYear() + 1);
    return date;
  }
  if (/شهر/.test(raw) && !/\d/.test(raw)) {
    date.setMonth(date.getMonth() + 1);
    return date;
  }
  if (/يوم/.test(raw) && !/\d/.test(raw)) {
    date.setDate(date.getDate() + 1);
    return date;
  }

  if (d.includes('day') || raw.includes('يوم')) {
    date.setDate(date.getDate() + (Number.isFinite(digits) ? digits : 0));
  } else if (d.includes('month') || raw.includes('شهر')) {
    date.setMonth(date.getMonth() + (Number.isFinite(digits) ? digits : 1));
  } else if (d.includes('year') || raw.includes('سنة') || raw.includes('عام')) {
    date.setFullYear(date.getFullYear() + (Number.isFinite(digits) ? digits : 1));
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
