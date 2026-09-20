import type { Order, OrderOffer } from '../stores/useOrderStore';
import { isAcceptedOfferStatus } from './offerStatusHelpers';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const REVIEWABLE_ORDER_STATUSES = [
  'DELIVERED',
  'PARTIALLY_DELIVERED',
  'COMPLETED',
  'WARRANTY_ACTIVE',
] as const;

const REVIEWABLE_OFFER_FULFILLMENT = new Set(['DELIVERED', 'COMPLETED']);

export type OrderReviewEntry = {
  id: string;
  rating?: number;
  comment?: string | null;
  adminStatus?: string;
  offerId?: string | null;
  createdAt?: string;
};

export function isValidUuid(value: unknown): value is string {
  return typeof value === 'string' && UUID_RE.test(value);
}

function idsEqual(a: unknown, b: unknown): boolean {
  return String(a ?? '') === String(b ?? '') && String(a ?? '').length > 0;
}

function isAcceptedOffer(offer?: OrderOffer | null): boolean {
  if (!offer) return false;
  return isAcceptedOfferStatus(offer.status);
}

function normalizeFulfillment(status?: string | null): string {
  return String(status || '').toUpperCase();
}

function isOfferFulfillmentReviewable(offer: OrderOffer): boolean {
  const fs = normalizeFulfillment(offer.fulfillmentStatus);
  if (REVIEWABLE_OFFER_FULFILLMENT.has(fs)) return true;
  // Some payloads omit fulfillment while offer status already terminal
  const st = String(offer.status || '').toUpperCase();
  return st === 'DELIVERED' || st === 'COMPLETED';
}

/** Deduped accepted offers from both list + detail payload shapes. */
export function getAcceptedOffers(order: Order | null | undefined): OrderOffer[] {
  if (!order) return [];
  const fromAccepted = Array.isArray(order.acceptedOffers) ? order.acceptedOffers : [];
  const fromOffers = Array.isArray(order.offers) ? order.offers : [];
  // Prefer non-empty acceptedOffers; always merge offers that pass acceptance
  const merged = [...fromAccepted, ...fromOffers].filter(isAcceptedOffer);
  const seen = new Set<string>();
  const out: OrderOffer[] = [];
  for (const o of merged) {
    const id = String(o.id || '');
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push(o);
  }
  if (out.length === 0 && order.acceptedOffer && isAcceptedOffer(order.acceptedOffer)) {
    out.push(order.acceptedOffer);
  }
  return out;
}

/** All reviews on the order (singular `review` + `reviews[]`). */
export function getOrderReviews(order: Order | null | undefined): OrderReviewEntry[] {
  if (!order) return [];
  const list = (order as Order & { reviews?: OrderReviewEntry[] }).reviews;
  if (Array.isArray(list) && list.length > 0) {
    return list.filter(Boolean);
  }
  if (order.review) return [order.review as OrderReviewEntry];
  return [];
}

/** Prefer singular `review`, fall back to `reviews[0]` from list payloads. */
export function getOrderReview(order: Order | null | undefined): Order['review'] | undefined {
  const all = getOrderReviews(order);
  return all[0];
}

export function getReviewedOfferIds(order: Order | null | undefined): Set<string> {
  const ids = new Set<string>();
  for (const r of getOrderReviews(order)) {
    if (r?.offerId) ids.add(String(r.offerId));
  }
  return ids;
}

function isOrderFullySettled(order: Order): boolean {
  const s = String(order.status || '').toUpperCase();
  return s === 'COMPLETED' || s === 'DELIVERED' || s === 'WARRANTY_ACTIVE';
}

/** Accepted offers that are delivered/completed and not yet reviewed. */
export function getReviewableOffers(order: Order | null | undefined): OrderOffer[] {
  if (!order) return [];
  if (
    !REVIEWABLE_ORDER_STATUSES.includes(
      order.status as (typeof REVIEWABLE_ORDER_STATUSES)[number],
    )
  ) {
    return [];
  }

  const acceptedList = getAcceptedOffers(order);
  const reviewed = getReviewedOfferIds(order);
  const orderSettled = isOrderFullySettled(order);

  return acceptedList.filter((offer) => {
    if (!offer?.id) return false;
    if (reviewed.has(String(offer.id))) return false;
    // Single accepted offer: order-level status is enough
    if (acceptedList.length === 1) return true;
    // Multi: prefer per-offer fulfillment; if missing and whole order settled, allow
    if (!offer.fulfillmentStatus && orderSettled) return true;
    return isOfferFulfillmentReviewable(offer);
  });
}

export function orderNeedsReview(order: Order | null | undefined): boolean {
  return getReviewableOffers(order).length > 0;
}

export function findOrdersPendingReview(orders: Order[]): Order[] {
  return orders.filter(orderNeedsReview);
}

export function isMultiPartOrder(order: Order | null | undefined): boolean {
  if (!order) return false;
  if (order.requestType === 'multiple') return true;
  return (order.parts?.length ?? 0) > 1;
}

/** Resolve store + display labels for the customer review modal. */
export function resolveReviewTarget(
  order: Order | null | undefined,
  offerId?: string,
): {
  storeId: string;
  merchantName: string;
  partName: string;
  offerId?: string;
} | null {
  if (!order) return null;

  const acceptedList = getAcceptedOffers(order);
  const allOffers = [
    ...acceptedList,
    ...(Array.isArray(order.offers) ? order.offers : []),
  ];

  const explicitId = offerId ? String(offerId) : '';
  const primary = explicitId
    ? allOffers.find((o) => idsEqual(o.id, explicitId)) ||
      acceptedList.find((o) => idsEqual(o.id, explicitId))
    : order.acceptedOffer && isAcceptedOffer(order.acceptedOffer)
      ? order.acceptedOffer
      : acceptedList[0];

  // Never drop an explicitly selected offerId (multi-part backend requires it)
  const resolvedOfferId = primary?.id
    ? String(primary.id)
    : explicitId || undefined;

  const storeId =
    (primary?.storeId && isValidUuid(primary.storeId) ? primary.storeId : undefined) ??
    (isValidUuid((order as { storeId?: string }).storeId)
      ? (order as { storeId?: string }).storeId
      : undefined);

  if (!storeId) return null;

  // Multi-part: refuse a target without offerId (prevents "offerId is required")
  if (isMultiPartOrder(order) && !resolvedOfferId) {
    return null;
  }

  const merchantName =
    primary?.merchantName ||
    order.merchantName ||
    'Store';

  const partFromPrimary =
    primary?.partName ||
    order.parts?.find((p) => idsEqual(p.id, primary?.orderPartId))?.name;

  const partName =
    partFromPrimary ||
    order.part ||
    order.parts?.[0]?.name ||
    'Part';

  return { storeId, merchantName, partName, offerId: resolvedOfferId };
}
