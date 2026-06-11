/**
 * Detects when a pre-payment order has expired (no offers / selection window closed).
 * Supports per-part evaluation for multi-part orders.
 */

import { isRejectedOfferStatus } from './offerStatusHelpers';

export type OrderExpiryScenario = 'no_offers' | 'selection_expired';

export interface OrderExpiryContext {
  status: string;
  createdAt?: string;
  date?: string;
  requestType?: string | null;
  selectionDeadlineAt?: string | null;
  revealOffersAt?: string | null;
}

export interface OrderPartRef {
  id: string;
  name?: string;
}

export interface OfferPartRef {
  orderPartId?: string | null;
  status?: string | null;
}

const POST_COLLECTION_STATUSES = new Set([
  'AWAITING_SELECTION',
  'AWAITING_PAYMENT',
  'PARTIALLY_PAID',
  'PREPARATION',
  'CANCELLED',
]);

export function getVisibleOffersForPart(
  offers: OfferPartRef[] | undefined,
  partId: string,
  isSinglePartOrder = false,
): OfferPartRef[] {
  if (!offers?.length) return [];
  return offers.filter(
    (o) =>
      !isRejectedOfferStatus(o.status) &&
      (String(o.orderPartId) === String(partId) ||
        (!o.orderPartId && isSinglePartOrder)),
  );
}

/** True once the merchant offer collection window has ended. */
export function isOfferCollectionClosed(order: OrderExpiryContext): boolean {
  if (POST_COLLECTION_STATUSES.has(order.status)) return true;

  if (order.status === 'COLLECTING_OFFERS' && order.revealOffersAt) {
    return Date.now() > new Date(order.revealOffersAt).getTime();
  }

  if (order.status === 'AWAITING_OFFERS') {
    const base = new Date(order.createdAt || order.date || Date.now());
    base.setHours(base.getHours() + 24);
    return Date.now() > base.getTime();
  }

  return false;
}

export function getPartsWithoutOffers(
  order: OrderExpiryContext,
  offers: OfferPartRef[] | undefined,
  parts: OrderPartRef[],
): OrderPartRef[] {
  if (!parts.length) return [];
  const isSingle = parts.length === 1;
  return parts.filter(
    (p) => getVisibleOffersForPart(offers, p.id, isSingle).length === 0,
  );
}

/** Parts that failed to receive offers after collection closed (multi-part only). */
export function getExpiredPartsWithoutOffers(
  order: OrderExpiryContext,
  offers: OfferPartRef[] | undefined,
  parts: OrderPartRef[],
): OrderPartRef[] {
  if (parts.length <= 1) return [];
  if (order.status === 'CANCELLED') return [];
  if (!isOfferCollectionClosed(order)) return [];

  const withoutOffers = getPartsWithoutOffers(order, offers, parts);
  if (withoutOffers.length === 0) return [];
  if (withoutOffers.length === parts.length) return [];

  return withoutOffers;
}

function isAwaitingSelectionPastDeadline(order: OrderExpiryContext): boolean {
  if (order.status !== 'AWAITING_SELECTION') return false;
  if (order.selectionDeadlineAt) {
    return Date.now() > new Date(order.selectionDeadlineAt).getTime();
  }
  const base = new Date(order.createdAt || order.date || Date.now());
  base.setHours(base.getHours() + 48);
  return Date.now() > base.getTime();
}

function isAwaitingOffersPastDeadline(order: OrderExpiryContext): boolean {
  if (order.status !== 'AWAITING_OFFERS') return false;
  const base = new Date(order.createdAt || order.date || Date.now());
  base.setHours(base.getHours() + 24);
  return Date.now() > base.getTime();
}

function isCollectingOffersPastReveal(order: OrderExpiryContext): boolean {
  if (order.status !== 'COLLECTING_OFFERS') return false;
  if (order.revealOffersAt) {
    return Date.now() > new Date(order.revealOffersAt).getTime();
  }
  const base = new Date(order.createdAt || order.date || Date.now());
  base.setHours(base.getHours() + 24);
  return Date.now() > base.getTime();
}

function allPartsHaveNoOffers(
  offers: OfferPartRef[] | undefined,
  parts: OrderPartRef[],
): boolean {
  if (parts.length === 0) return false;
  return getPartsWithoutOffers({ status: '' }, offers, parts).length === parts.length;
}

export interface OrderExpiryInput {
  order: OrderExpiryContext;
  offers?: OfferPartRef[];
  parts?: OrderPartRef[];
  visibleOffersCount: number;
  acceptedOffersCount: number;
}

/**
 * Returns expiry scenario for customer-facing modal/banner, or null if not expired.
 */
export function getOrderExpiryScenario(input: OrderExpiryInput): OrderExpiryScenario | null;
/** @deprecated Pass OrderExpiryInput object for multi-part aware detection */
export function getOrderExpiryScenario(
  order: OrderExpiryContext,
  visibleOffersCount: number,
  acceptedOffersCount: number,
): OrderExpiryScenario | null;
export function getOrderExpiryScenario(
  inputOrOrder: OrderExpiryInput | OrderExpiryContext,
  visibleOffersCount?: number,
  acceptedOffersCount?: number,
): OrderExpiryScenario | null {
  const input: OrderExpiryInput =
    typeof visibleOffersCount === 'number'
      ? {
          order: inputOrOrder as OrderExpiryContext,
          visibleOffersCount,
          acceptedOffersCount: acceptedOffersCount ?? 0,
        }
      : (inputOrOrder as OrderExpiryInput);

  const { order, offers, parts = [], visibleOffersCount: visibleCount, acceptedOffersCount: acceptedCount } =
    input;

  if (acceptedCount > 0) return null;

  const isMultiPart =
    order.requestType === 'multiple' || (parts.length > 1 && order.requestType !== 'single');

  if (isMultiPart && parts.length > 1) {
    const collectionClosed = isOfferCollectionClosed(order);
    const allEmpty = allPartsHaveNoOffers(offers, parts);

    if (collectionClosed && allEmpty) {
      return 'no_offers';
    }

    if (order.status === 'CANCELLED') {
      return visibleCount > 0 ? 'selection_expired' : 'no_offers';
    }

    if (isAwaitingSelectionPastDeadline(order)) {
      return visibleCount > 0 ? 'selection_expired' : 'no_offers';
    }

    if (isCollectingOffersPastReveal(order) && allEmpty) {
      return 'no_offers';
    }

    return null;
  }

  if (order.status === 'CANCELLED') {
    return visibleCount > 0 ? 'selection_expired' : 'no_offers';
  }

  if (isAwaitingSelectionPastDeadline(order)) {
    return visibleCount > 0 ? 'selection_expired' : 'no_offers';
  }

  if (isAwaitingOffersPastDeadline(order) && visibleCount === 0) {
    return 'no_offers';
  }

  if (isCollectingOffersPastReveal(order) && visibleCount === 0) {
    return 'no_offers';
  }

  return null;
}
