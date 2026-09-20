import type { Order, OrderOffer } from '../stores/useOrderStore';
import { isAcceptedOfferStatus } from './offerStatusHelpers';
import { getReturnDisputeHours } from './orderSla';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const REVIEWABLE_ORDER_STATUSES = [
  'DELIVERED',
  'PARTIALLY_DELIVERED',
  'COMPLETED',
  'WARRANTY_ACTIVE',
] as const;

/** Fulfillment states that can become reviewable after the return window (not during DELIVERED alone). */
const POST_DELIVERY_FULFILLMENT = new Set(['DELIVERED', 'COMPLETED']);

/** Terminal returned / cancelled — never reviewable. */
const NON_REVIEWABLE_FULFILLMENT = new Set([
  'CANCELLED',
  'CANCELED',
  'RETURNED',
  'REFUNDED',
]);

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

function parseTime(value?: string | Date | null): number | null {
  if (!value) return null;
  const ms = value instanceof Date ? value.getTime() : new Date(value).getTime();
  return Number.isFinite(ms) ? ms : null;
}

/**
 * Unified review gate (customer banner + OrderDetails + should match ReviewsService.create):
 * 1) Delivered (or completed) — not cancelled/returned
 * 2) Return/dispute window ended (deliveredAt + configured hours)
 * 3) No open return/dispute case
 * 4) Not already reviewed (checked by caller via reviewed set)
 */
export function isOfferEligibleForReview(
  offer: OrderOffer,
  order: Order,
  nowMs: number = Date.now(),
): boolean {
  const fs = normalizeFulfillment(offer.fulfillmentStatus);
  if (NON_REVIEWABLE_FULFILLMENT.has(fs)) return false;

  // Prefer per-offer fulfillment; fall back to order-level delivered-like for single-offer payloads
  const orderStatus = String(order.status || '').toUpperCase();
  const looksDelivered =
    POST_DELIVERY_FULFILLMENT.has(fs) ||
    (!fs &&
      (orderStatus === 'DELIVERED' ||
        orderStatus === 'COMPLETED' ||
        orderStatus === 'WARRANTY_ACTIVE' ||
        orderStatus === 'PARTIALLY_DELIVERED'));

  if (!looksDelivered) return false;

  if (offer.hasOpenCase === true) return false;

  // COMPLETED (post-window auto-complete with no open case) is always reviewable
  if (fs === 'COMPLETED') return true;

  const deliveredMs =
    parseTime(offer.deliveredAt) ??
    parseTime(order.deliveredAt) ??
    null;

  if (deliveredMs == null) {
    return false;
  }

  const windowEndsMs =
    parseTime(offer.returnWindowEndsAt) ??
    deliveredMs + getReturnDisputeHours() * 60 * 60 * 1000;

  if (nowMs < windowEndsMs) return false;

  // Past window on DELIVERED: require explicit hasOpenCase === false when known.
  // List payloads without case meta: wait until COMPLETED (cron) to avoid false positives.
  if (offer.hasOpenCase === false) return true;
  return false;
}

/** Deduped accepted offers from both list + detail payload shapes. */
export function getAcceptedOffers(order: Order | null | undefined): OrderOffer[] {
  if (!order) return [];
  const fromAccepted = Array.isArray(order.acceptedOffers) ? order.acceptedOffers : [];
  const fromOffers = Array.isArray(order.offers) ? order.offers : [];
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

/** Accepted offers eligible for customer review (post return-window, no open case, not returned). */
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
  const now = Date.now();

  return acceptedList.filter((offer) => {
    if (!offer?.id) return false;
    if (reviewed.has(String(offer.id))) return false;
    return isOfferEligibleForReview(offer, order, now);
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

  const resolvedOfferId = primary?.id
    ? String(primary.id)
    : explicitId || undefined;

  const storeId =
    (primary?.storeId && isValidUuid(primary.storeId) ? primary.storeId : undefined) ??
    (isValidUuid((order as { storeId?: string }).storeId)
      ? (order as { storeId?: string }).storeId
      : undefined);

  if (!storeId) return null;

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
