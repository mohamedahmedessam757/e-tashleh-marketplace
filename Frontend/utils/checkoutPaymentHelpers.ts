import type { OrderOffer } from '../stores/useOrderStore';
import { isAcceptedOfferStatus } from './offerStatusHelpers';

export function offerIdsMatch(a: unknown, b: unknown): boolean {
  return String(a) === String(b);
}

export function isOfferPaid(
  offerId: unknown,
  paidOfferIds: Array<string | number>,
): boolean {
  return paidOfferIds.some((id) => offerIdsMatch(id, offerId));
}

export function getAcceptedOffersFromList(
  offers: OrderOffer[] | undefined,
): OrderOffer[] {
  return offers?.filter((o) => isAcceptedOfferStatus(o.status)) ?? [];
}

/** Every accepted offer must have a confirmed SUCCESS payment. */
export function areAllAcceptedOffersPaid(
  acceptedOffers: OrderOffer[],
  paidOfferIds: Array<string | number>,
): boolean {
  if (acceptedOffers.length === 0) return false;
  return acceptedOffers.every((o) => isOfferConsideredPaid(o, paidOfferIds));
}

/** Paid via SUCCESS payment row and/or moved past AWAITING_PAYMENT fulfillment. */
export function isOfferConsideredPaid(
  offerOrId: OrderOffer | string | number,
  paidOfferIds: Array<string | number>,
): boolean {
  const offer =
    offerOrId !== null &&
    typeof offerOrId === 'object' &&
    'id' in offerOrId
      ? (offerOrId as OrderOffer)
      : null;
  const offerId = offer?.id ?? offerOrId;

  if (isOfferPaid(offerId, paidOfferIds)) return true;

  if (offer) {
    const fs = String(
      (offer as { fulfillmentStatus?: string }).fulfillmentStatus || '',
    ).toUpperCase();
    return fs !== '' && fs !== 'AWAITING_PAYMENT';
  }

  return false;
}

export function collectPaidOfferIdsFromOrder(order: {
  payments?: Array<{ status?: string; offerId?: string }>;
  offers?: OrderOffer[];
}): string[] {
  const ids = new Set<string>();
  for (const p of order.payments ?? []) {
    if (String(p.status || '').toUpperCase() === 'SUCCESS' && p.offerId) {
      ids.add(String(p.offerId));
    }
  }
  for (const o of order.offers ?? []) {
    const nested = (o as { payments?: Array<{ status?: string }> }).payments;
    if (nested?.some((p) => String(p.status || '').toUpperCase() === 'SUCCESS')) {
      ids.add(String(o.id));
    }
  }
  return [...ids];
}

export function hasRemainingPaymentDue(order: {
  offers?: OrderOffer[];
  payments?: Array<{ status?: string; offerId?: string }>;
}): boolean {
  const accepted = getAcceptedOffersFromList(order.offers);
  if (!accepted.length) return false;
  const paidIds = collectPaidOfferIdsFromOrder(order);
  return accepted.some((o) => !isOfferConsideredPaid(o, paidIds));
}

const CHECKOUT_RESUME_ORDER_STATUSES = new Set([
  'COLLECTING_OFFERS',
  'AWAITING_SELECTION',
  'AWAITING_OFFERS',
  'AWAITING_PAYMENT',
  'PARTIALLY_PAID',
]);

/** Show "continue payment" on order page when checkout can still be resumed. */
export function shouldShowContinuePaymentButton(order: {
  status?: string;
  offers?: OrderOffer[];
  payments?: Array<{ status?: string; offerId?: string }>;
}): boolean {
  const accepted = getAcceptedOffersFromList(order.offers);
  if (!accepted.length) return false;

  const status = String(order.status || '').toUpperCase();
  if (CHECKOUT_RESUME_ORDER_STATUSES.has(status)) {
    if (status === 'AWAITING_PAYMENT' || status === 'PARTIALLY_PAID') {
      return hasRemainingPaymentDue(order);
    }
    return true;
  }
  return hasRemainingPaymentDue(order);
}
