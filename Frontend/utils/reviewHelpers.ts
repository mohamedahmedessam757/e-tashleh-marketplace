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

function isAcceptedOffer(offer?: OrderOffer | null): boolean {
  if (!offer) return false;
  return isAcceptedOfferStatus(offer.status);
}

function normalizeFulfillment(status?: string | null): string {
  return String(status || '').toUpperCase();
}

function isOfferFulfillmentReviewable(offer: OrderOffer): boolean {
  return REVIEWABLE_OFFER_FULFILLMENT.has(normalizeFulfillment(offer.fulfillmentStatus));
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

  const acceptedList =
    order.acceptedOffers?.filter(isAcceptedOffer) ??
    order.offers?.filter(isAcceptedOffer) ??
    [];

  const reviewed = getReviewedOfferIds(order);

  return acceptedList.filter((offer) => {
    if (!offer?.id) return false;
    if (reviewed.has(String(offer.id))) return false;
    // Single-offer orders may lack per-offer fulfillment; order status is enough
    if (acceptedList.length === 1 && !offer.fulfillmentStatus) return true;
    return isOfferFulfillmentReviewable(offer);
  });
}

export function orderNeedsReview(order: Order | null | undefined): boolean {
  return getReviewableOffers(order).length > 0;
}

export function findOrdersPendingReview(orders: Order[]): Order[] {
  return orders.filter(orderNeedsReview);
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

  const acceptedList =
    order.acceptedOffers?.filter(isAcceptedOffer) ??
    order.offers?.filter(isAcceptedOffer) ??
    [];

  const primary = offerId
    ? acceptedList.find((o) => o.id === offerId)
    : order.acceptedOffer && isAcceptedOffer(order.acceptedOffer)
      ? order.acceptedOffer
      : acceptedList[0];

  const storeId =
    (primary?.storeId && isValidUuid(primary.storeId) ? primary.storeId : undefined) ??
    (isValidUuid((order as { storeId?: string }).storeId)
      ? (order as { storeId?: string }).storeId
      : undefined);

  if (!storeId) return null;

  const merchantName =
    primary?.merchantName ||
    order.merchantName ||
    'Store';

  const partFromPrimary =
    primary?.partName ||
    order.parts?.find((p) => p.id === primary?.orderPartId)?.name;

  const partName =
    partFromPrimary ||
    order.part ||
    order.parts?.[0]?.name ||
    'Part';

  return { storeId, merchantName, partName, offerId: primary?.id };
}
