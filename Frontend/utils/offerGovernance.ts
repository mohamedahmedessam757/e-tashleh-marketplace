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

/** Small skew buffer only — do not inflate free-edit window. */
const FREE_CANCEL_BUFFER_MS = 2_000;
const REVEAL_OFFSET_MS = 24 * 60 * 60 * 1000;
const BIDDING_STOP_BEFORE_REVEAL_MS = 60 * 60 * 1000;

export function getRevealAt(order: OfferGovernanceOrder): number {
  if (order.revealOffersAt) {
    return new Date(order.revealOffersAt).getTime();
  }
  return new Date(order.createdAt).getTime() + REVEAL_OFFSET_MS;
}

export function getVoluntaryWithdrawEnd(order: OfferGovernanceOrder): Date {
  if (order.offersStopAt) {
    return new Date(order.offersStopAt);
  }
  return new Date(getRevealAt(order) - BIDDING_STOP_BEFORE_REVEAL_MS);
}

export function getOfferGovernanceWindow(
  order: OfferGovernanceOrder,
  offer: OfferGovernanceOffer,
) {
  const now = getServerNowMs();
  const canEditUntilMs = offer.canEditUntil
    ? new Date(offer.canEditUntil).getTime()
    : 0;
  const voluntaryEndMs = getVoluntaryWithdrawEnd(order).getTime();

  return {
    isFreeCancelWindow: canEditUntilMs > 0 && now <= canEditUntilMs + FREE_CANCEL_BUFFER_MS,
    isVoluntaryWithdrawWindow:
      canEditUntilMs > 0 && now > canEditUntilMs && now < voluntaryEndMs,
    voluntaryEndDate: new Date(voluntaryEndMs).toISOString(),
    canEditUntilDate: offer.canEditUntil ? new Date(offer.canEditUntil) : null,
  };
}
