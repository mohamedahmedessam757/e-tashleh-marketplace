/**
 * Detects when a pre-payment order has expired (no offers / selection window closed).
 * Supports per-part evaluation for multi-part orders.
 */

import { isVisibleMarketplaceOffer } from './offerStatusHelpers';
import { getServerNowMs } from './serverClock';

export type OrderExpiryScenario = 'no_offers' | 'selection_expired' | 'customer_cancelled';

export interface OrderExpiryContext {
  status: string;
  createdAt?: string;
  date?: string;
  updatedAt?: string;
  requestType?: string | null;
  selectionDeadlineAt?: string | null;
  revealOffersAt?: string | null;
}

const CUSTOMER_CANCEL_FLAG_PREFIX = 'order_cancelled_by_customer_';

export function markOrderCancelledByCustomer(orderId: string): void {
  try {
    localStorage.setItem(`${CUSTOMER_CANCEL_FLAG_PREFIX}${orderId}`, '1');
  } catch {
    /* ignore storage errors */
  }
}

export function clearOrderCancelledByCustomer(orderId: string): void {
  try {
    localStorage.removeItem(`${CUSTOMER_CANCEL_FLAG_PREFIX}${orderId}`);
  } catch {
    /* ignore storage errors */
  }
}

export function wasOrderCancelledByCustomer(orderId: string): boolean {
  try {
    return localStorage.getItem(`${CUSTOMER_CANCEL_FLAG_PREFIX}${orderId}`) === '1';
  } catch {
    return false;
  }
}

/** True when the customer cancelled before SLA/system expiry. */
export function isCustomerInitiatedCancellation(
  order: OrderExpiryContext,
  orderId?: string,
): boolean {
  if (order.status !== 'CANCELLED') return false;
  if (orderId && wasOrderCancelledByCustomer(orderId)) return true;

  if (!order.updatedAt) return false;
  const updatedMs = new Date(order.updatedAt).getTime();
  const createdMs = new Date(order.createdAt || order.date || getServerNowMs()).getTime();
  const deadline24h = createdMs + 24 * 60 * 60 * 1000;

  if (order.revealOffersAt) {
    return updatedMs < new Date(order.revealOffersAt).getTime();
  }
  return updatedMs < deadline24h;
}

function resolveCancelledScenario(
  order: OrderExpiryContext,
  visibleCount: number,
  orderId?: string,
): OrderExpiryScenario {
  if (isCustomerInitiatedCancellation(order, orderId)) return 'customer_cancelled';
  return visibleCount > 0 ? 'selection_expired' : 'no_offers';
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
      isVisibleMarketplaceOffer(o) &&
      (String(o.orderPartId) === String(partId) ||
        (!o.orderPartId && isSinglePartOrder)),
  );
}

/** True once the merchant offer collection window has ended. */
export function isOfferCollectionClosed(order: OrderExpiryContext): boolean {
  if (POST_COLLECTION_STATUSES.has(order.status)) return true;

  if (order.status === 'COLLECTING_OFFERS' && order.revealOffersAt) {
    return getServerNowMs() > new Date(order.revealOffersAt).getTime();
  }

  if (order.status === 'AWAITING_OFFERS') {
    const base = new Date(order.createdAt || order.date || getServerNowMs());
    base.setHours(base.getHours() + 24);
    return getServerNowMs() > base.getTime();
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
    return getServerNowMs() > new Date(order.selectionDeadlineAt).getTime();
  }
  const base = new Date(order.createdAt || order.date || getServerNowMs());
  base.setHours(base.getHours() + 48);
  return getServerNowMs() > base.getTime();
}

function isAwaitingPaymentPastDeadline(order: {
  status?: string;
  paymentDeadlineAt?: string | null;
  updatedAt?: string | null;
  createdAt?: string | null;
}): boolean {
  const status = String(order.status || '');
  if (status !== 'AWAITING_PAYMENT' && status !== 'PARTIALLY_PAID') return false;
  if (order.paymentDeadlineAt) {
    return getServerNowMs() > new Date(order.paymentDeadlineAt).getTime();
  }
  const base = new Date(order.updatedAt || order.createdAt || getServerNowMs());
  base.setHours(base.getHours() + 24);
  return getServerNowMs() > base.getTime();
}

/**
 * Status shown in badges while backend cancel is in-flight after an SLA deadline.
 * Keeps customer/merchant/admin UI consistent the moment the window ends.
 */
export function getDisplayOrderStatus(order: {
  status?: string;
  selectionDeadlineAt?: string | null;
  paymentDeadlineAt?: string | null;
  createdAt?: string;
  date?: string;
  updatedAt?: string | null;
}): string {
  const status = String(order.status || '');
  if (!status) return status;
  if (status === 'CANCELLED') return status;

  if (
    isAwaitingSelectionPastDeadline({
      status,
      selectionDeadlineAt: order.selectionDeadlineAt,
      createdAt: order.createdAt,
      date: order.date,
    })
  ) {
    return 'CANCELLED';
  }

  if (
    isAwaitingPaymentPastDeadline({
      status,
      paymentDeadlineAt: order.paymentDeadlineAt,
      updatedAt: order.updatedAt,
      createdAt: order.createdAt,
    })
  ) {
    return 'CANCELLED';
  }

  return status;
}

export function shouldEnforceExpiredSla(order: {
  status?: string;
  selectionDeadlineAt?: string | null;
  paymentDeadlineAt?: string | null;
  createdAt?: string;
  date?: string;
  updatedAt?: string | null;
}): boolean {
  const status = String(order.status || '');
  if (!status || status === 'CANCELLED') return false;
  return getDisplayOrderStatus(order) === 'CANCELLED' && status !== 'CANCELLED';
}

function isAwaitingOffersPastDeadline(order: OrderExpiryContext): boolean {
  if (order.status !== 'AWAITING_OFFERS') return false;
  const base = new Date(order.createdAt || order.date || getServerNowMs());
  base.setHours(base.getHours() + 24);
  return getServerNowMs() > base.getTime();
}

function isCollectingOffersPastReveal(order: OrderExpiryContext): boolean {
  if (order.status !== 'COLLECTING_OFFERS') return false;
  if (order.revealOffersAt) {
    return getServerNowMs() > new Date(order.revealOffersAt).getTime();
  }
  const base = new Date(order.createdAt || order.date || getServerNowMs());
  base.setHours(base.getHours() + 24);
  return getServerNowMs() > base.getTime();
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
  orderId?: string;
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

  const {
    order,
    orderId,
    offers,
    parts = [],
    visibleOffersCount: visibleCount,
    acceptedOffersCount: acceptedCount,
  } = input;

  if (acceptedCount > 0) return null;

  // Stuck / healed path: selection status with zero visible offers → treat as no_offers immediately
  if (order.status === 'AWAITING_SELECTION' && visibleCount === 0) {
    if (parts.length > 1) {
      if (allPartsHaveNoOffers(offers, parts)) return 'no_offers';
    } else {
      return 'no_offers';
    }
  }

  const isMultiPart =
    order.requestType === 'multiple' || (parts.length > 1 && order.requestType !== 'single');

  if (isMultiPart && parts.length > 1) {
    const collectionClosed = isOfferCollectionClosed(order);
    const allEmpty = allPartsHaveNoOffers(offers, parts);

    if (collectionClosed && allEmpty) {
      return 'no_offers';
    }

    if (order.status === 'CANCELLED') {
      return resolveCancelledScenario(order, visibleCount, orderId);
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
    return resolveCancelledScenario(order, visibleCount, orderId);
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
