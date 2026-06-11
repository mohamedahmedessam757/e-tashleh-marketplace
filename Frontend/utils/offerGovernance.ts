/**
 * Client-side offer governance window helpers.
 * Server enforces the same rules — never trust these alone for authorization.
 */

export interface OfferGovernanceOrder {
  revealOffersAt?: string | Date | null;
  createdAt: string | Date;
}

export interface OfferGovernanceOffer {
  canEditUntil?: string | Date | null;
}

const FREE_CANCEL_BUFFER_MS = 30_000;
const REVEAL_OFFSET_MS = 24 * 60 * 60 * 1000;
const VOLUNTARY_END_BEFORE_REVEAL_MS = 60 * 60 * 1000;

export function getRevealAt(order: OfferGovernanceOrder): number {
  if (order.revealOffersAt) {
    return new Date(order.revealOffersAt).getTime();
  }
  return new Date(order.createdAt).getTime() + REVEAL_OFFSET_MS;
}

export function getVoluntaryWithdrawEnd(order: OfferGovernanceOrder): Date {
  return new Date(getRevealAt(order) - VOLUNTARY_END_BEFORE_REVEAL_MS);
}

export function getOfferGovernanceWindow(
  order: OfferGovernanceOrder,
  offer: OfferGovernanceOffer,
) {
  const now = Date.now();
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
