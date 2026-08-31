/**
 * Server-side offer governance timing (source of truth for free-edit / voluntary / bidding stop).
 */

export interface OrderTimingContext {
  revealOffersAt: Date | null;
  createdAt: Date;
  offersStopAt?: Date | null;
}

/** Free edit/delete window after a merchant submits an offer (capped by offersStopAt). */
export const FREE_EDIT_WINDOW_MS = 3 * 60 * 60 * 1000; // 3 hours

/**
 * Stop create/edit/delete/voluntary this long before revealOffersAt.
 * For a 24h collection window this is hour 23.
 */
export const BIDDING_STOP_BEFORE_REVEAL_MS = 60 * 60 * 1000; // 1 hour

/** @deprecated Prefer BIDDING_STOP_BEFORE_REVEAL_MS — kept as alias for callers. */
export const VOLUNTARY_END_BEFORE_REVEAL_MS = BIDDING_STOP_BEFORE_REVEAL_MS;

const REVEAL_OFFSET_MS = 24 * 60 * 60 * 1000;

export function getRevealAt(order: OrderTimingContext): Date {
  if (order.revealOffersAt) {
    return new Date(order.revealOffersAt);
  }
  return new Date(order.createdAt.getTime() + REVEAL_OFFSET_MS);
}

export function computeOffersStopAt(revealOffersAt: Date): Date {
  return new Date(revealOffersAt.getTime() - BIDDING_STOP_BEFORE_REVEAL_MS);
}

/**
 * Free-edit deadline: offerCreatedAt + 3h, never past offersStopAt when known.
 * If offersStopAt is already in the past relative to offerCreatedAt, clamp to offerCreatedAt
 * (caller should have blocked create already).
 */
export function computeCanEditUntil(
  offerCreatedAt: Date,
  offersStopAt: Date | null | undefined,
): Date {
  const freeEnd = new Date(offerCreatedAt.getTime() + FREE_EDIT_WINDOW_MS);
  if (!offersStopAt) return freeEnd;
  const stop = new Date(offersStopAt);
  return freeEnd.getTime() <= stop.getTime() ? freeEnd : stop;
}

export function getVoluntaryWithdrawEnd(order: OrderTimingContext): Date {
  // Prefer persisted offersStopAt when present (matches create/renew formula).
  if (order.offersStopAt) {
    return new Date(order.offersStopAt);
  }
  return new Date(getRevealAt(order).getTime() - BIDDING_STOP_BEFORE_REVEAL_MS);
}
