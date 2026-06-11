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

export function isValidUuid(value: unknown): value is string {
  return typeof value === 'string' && UUID_RE.test(value);
}

function isAcceptedOffer(offer?: OrderOffer | null): boolean {
  if (!offer) return false;
  return isAcceptedOfferStatus(offer.status);
}

export function orderNeedsReview(order: Order | null | undefined): boolean {
  if (!order) return false;
  return (
    REVIEWABLE_ORDER_STATUSES.includes(order.status as (typeof REVIEWABLE_ORDER_STATUSES)[number]) &&
    !order.review
  );
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
