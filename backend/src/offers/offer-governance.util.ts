/**
 * Server-side offer governance timing (source of truth for edit/cancel / bidding stop).
 */

export interface OrderTimingContext {
  revealOffersAt: Date | null;
  createdAt: Date;
  offersStopAt?: Date | null;
}

/**
 * @deprecated Unused — edit/cancel window is now until offersStopAt (no fixed 3h free window).
 * Kept only so accidental imports do not break builds.
 */
export const FREE_EDIT_WINDOW_MS = 3 * 60 * 60 * 1000;

/**
 * Stop create/edit/delete this long before revealOffersAt.
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
 * Edit/cancel deadline for an offer = order offersStopAt (1h before reveal).
 * Falls back to offerCreatedAt when offersStopAt is unknown (caller should block create).
 */
export function computeCanEditUntil(
  offerCreatedAt: Date,
  offersStopAt: Date | null | undefined,
): Date {
  if (offersStopAt) {
    const stop = new Date(offersStopAt);
    // Never set canEditUntil before the offer was created
    return stop.getTime() >= offerCreatedAt.getTime() ? stop : new Date(offerCreatedAt);
  }
  return new Date(offerCreatedAt);
}

/** End of merchant action window (create/edit/cancel) for an order. */
export function getVoluntaryWithdrawEnd(order: OrderTimingContext): Date {
  if (order.offersStopAt) {
    return new Date(order.offersStopAt);
  }
  return new Date(getRevealAt(order).getTime() - BIDDING_STOP_BEFORE_REVEAL_MS);
}
