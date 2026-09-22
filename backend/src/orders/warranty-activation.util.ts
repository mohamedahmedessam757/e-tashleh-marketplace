import { OrderStatus } from '@prisma/client';

export type WarrantyOfferLike = {
  hasWarranty?: boolean | null;
  warrantyDuration?: string | null;
  warrantyEndAt?: Date | string | null;
  warrantyActiveAt?: Date | string | null;
  completedAt?: Date | string | null;
  deliveredAt?: Date | string | null;
};

const WARRANTY_CLAIM_REASONS = new Set(['warranty_claim', 'replacement']);

export function isWarrantyClaimReason(reason?: string | null): boolean {
  return WARRANTY_CLAIM_REASONS.has(String(reason || '').trim().toLowerCase());
}

function asDate(value: Date | string | null | undefined): Date | null {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * True when this offer's warranty period is still active.
 * Prefers warrantyEndAt; falls back to duration from warrantyActiveAt/completedAt only.
 * Do NOT use deliveredAt — that would treat warranty as active during the short
 * return window and keep generic return/dispute CTAs alive after the window.
 */
export function isOfferInWarranty(
  offer: WarrantyOfferLike,
  now: Date = new Date(),
): boolean {
  const end = asDate(offer.warrantyEndAt);
  if (end) return end.getTime() > now.getTime();

  if (!offerHasUsableWarranty(offer)) return false;

  const start = asDate(offer.warrantyActiveAt) || asDate(offer.completedAt);
  if (!start) return false;

  const computedEnd = calculateWarrantyEndDate(
    start,
    String(offer.warrantyDuration),
  );
  return computedEnd.getTime() > now.getTime();
}

/**
 * Past short window + usable warranty (even before cron sets warrantyActiveAt).
 * Used for warranty CTAs / claims after the 24h return window.
 */
export function isOfferPastWindowWarrantyEligible(
  offer: WarrantyOfferLike & { fulfillmentStatus?: string | null },
  opts: {
    inShortReturnWindow: boolean;
    now?: Date;
  },
): boolean {
  if (opts.inShortReturnWindow) return false;
  const status = String(offer.fulfillmentStatus || '').toUpperCase();
  if (status && status !== 'DELIVERED' && status !== 'COMPLETED') return false;
  if (isOfferInWarranty(offer, opts.now ?? new Date())) return true;
  return offerHasUsableWarranty(offer);
}

/**
 * Short post-delivery return window OR (warranty claim/replacement while in warranty).
 * Disputes should not use the warranty branch — callers pass reason only for returns.
 * Warranty claims remain allowed after auto-complete (COMPLETED + resolutionLocked).
 */
export function isOfferWarrantyClaimEligible(
  offer: WarrantyOfferLike & {
    fulfillmentStatus?: string | null;
    resolutionLocked?: boolean | null;
  },
  reason: string | undefined,
  opts: {
    inShortReturnWindow: boolean;
    now?: Date;
  },
): boolean {
  if (opts.inShortReturnWindow) return true;
  if (!isWarrantyClaimReason(reason)) return false;
  return isOfferPastWindowWarrantyEligible(offer, opts);
}

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
