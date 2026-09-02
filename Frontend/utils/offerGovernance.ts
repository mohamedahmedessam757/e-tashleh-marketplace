/**
 * Client-side offer governance window helpers.
 * Server enforces the same rules — never trust these alone for authorization.
 */

import { getServerNowMs } from './serverClock';

export interface OfferGovernanceOrder {
  revealOffersAt?: string | Date | null;
  createdAt: string | Date;
  offersStopAt?: string | Date | null;
}

export interface OfferGovernanceOffer {
  canEditUntil?: string | Date | null;
}

/** Small skew buffer so UI does not flicker at the exact stop boundary. */
const ACTION_WINDOW_BUFFER_MS = 2_000;
const REVEAL_OFFSET_MS = 24 * 60 * 60 * 1000;
const BIDDING_STOP_BEFORE_REVEAL_MS = 60 * 60 * 1000;

export function getRevealAt(order: OfferGovernanceOrder): number {
  if (order.revealOffersAt) {
    return new Date(order.revealOffersAt).getTime();
  }
  return new Date(order.createdAt).getTime() + REVEAL_OFFSET_MS;
}

/** End of merchant action window (= offersStopAt = reveal − 1h). */
export function getVoluntaryWithdrawEnd(order: OfferGovernanceOrder): Date {
  if (order.offersStopAt) {
    return new Date(order.offersStopAt);
  }
  return new Date(getRevealAt(order) - BIDDING_STOP_BEFORE_REVEAL_MS);
}

export function getOfferGovernanceWindow(
  order: OfferGovernanceOrder,
  _offer?: OfferGovernanceOffer,
) {
  const now = getServerNowMs();
  const stopMs = getVoluntaryWithdrawEnd(order).getTime();
  const canAct = now < stopMs + ACTION_WINDOW_BUFFER_MS;

  return {
    /** Merchant may edit or cancel until offersStopAt (server time). */
    isActionWindow: canAct,
    /** @deprecated Alias of isActionWindow — edit/cancel share one window. */
    isFreeCancelWindow: canAct,
    /** Voluntary withdraw UI removed — always false. */
    isVoluntaryWithdrawWindow: false,
    actionEndDate: new Date(stopMs).toISOString(),
    /** @deprecated Prefer actionEndDate / order.offersStopAt for countdown. */
    voluntaryEndDate: new Date(stopMs).toISOString(),
    canEditUntilDate: new Date(stopMs),
  };
}

/** True when bidding create/edit/cancel is closed (last hour before reveal). */
export function isBiddingStopped(order: OfferGovernanceOrder): boolean {
  return getServerNowMs() >= getVoluntaryWithdrawEnd(order).getTime();
}
