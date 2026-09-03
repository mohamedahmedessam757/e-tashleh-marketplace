/**
 * Pure merchant offer action policy (create / edit / cancel / re-bid).
 * Used by unit tests and kept in sync with OffersService gates.
 */

import { OrderStatus } from '@prisma/client';
import { getVoluntaryWithdrawEnd, type OrderTimingContext } from './offer-governance.util';

const OPEN_BIDDING = new Set<string>([
  OrderStatus.COLLECTING_OFFERS,
  OrderStatus.AWAITING_OFFERS,
]);

export interface MerchantActionOrder extends OrderTimingContext {
  status: string;
}

/** Cancel records a violation but must NOT lock the part for re-bidding. */
export const CANCEL_BLOCKS_SAME_PART_REBID = false;

export function isOpenBiddingStatus(status: string): boolean {
  return OPEN_BIDDING.has(status);
}

/** True while merchants may create / edit / cancel (server clock). */
export function isWithinMerchantActionWindow(
  order: MerchantActionOrder,
  now: Date = new Date(),
): boolean {
  if (!isOpenBiddingStatus(order.status)) return false;
  const end = getVoluntaryWithdrawEnd(order);
  return now.getTime() < end.getTime();
}

/** Final hour (and beyond): no create, edit, or cancel. */
export function isBiddingStoppedForMerchants(
  order: MerchantActionOrder,
  now: Date = new Date(),
): boolean {
  if (!isOpenBiddingStatus(order.status)) return true;
  return !isWithinMerchantActionWindow(order, now);
}

export type MerchantActionDenyReason =
  | 'ORDER_STATUS_CLOSED'
  | 'BIDDING_STOPPED'
  | 'ALREADY_WITHDRAWN'
  | 'NOT_OWNER'
  | null;

export function denyReasonForCancel(params: {
  now?: Date;
  order: MerchantActionOrder | null | undefined;
  offerStoreId: string;
  actorStoreId: string;
  isWithdrawn: boolean;
}): MerchantActionDenyReason {
  if (params.offerStoreId !== params.actorStoreId) return 'NOT_OWNER';
  if (params.isWithdrawn) return 'ALREADY_WITHDRAWN';
  if (!params.order || !isOpenBiddingStatus(params.order.status)) return 'ORDER_STATUS_CLOSED';
  if (isBiddingStoppedForMerchants(params.order, params.now ?? new Date())) {
    return 'BIDDING_STOPPED';
  }
  return null;
}

export function denyReasonForEdit(params: {
  now?: Date;
  order: MerchantActionOrder | null | undefined;
  offerStoreId: string;
  actorStoreId: string;
  isWithdrawn: boolean;
}): MerchantActionDenyReason {
  return denyReasonForCancel(params);
}

export function denyReasonForCreate(params: {
  now?: Date;
  order: MerchantActionOrder | null | undefined;
}): MerchantActionDenyReason {
  if (!params.order || !isOpenBiddingStatus(params.order.status)) return 'ORDER_STATUS_CLOSED';
  if (isBiddingStoppedForMerchants(params.order, params.now ?? new Date())) {
    return 'BIDDING_STOPPED';
  }
  return null;
}

/**
 * After cancel/withdraw, which part ids should be blocked from re-bid?
 * Current product policy: none (empty). Kept as a pure function for regression tests.
 */
export function blockedPartIdsAfterWithdrawals(
  _withdrawn: Array<{ orderPartId: string | null; withdrawalType?: string | null }>,
): string[] {
  if (CANCEL_BLOCKS_SAME_PART_REBID) {
    return _withdrawn
      .map((w) => w.orderPartId)
      .filter((id): id is string => Boolean(id));
  }
  return [];
}
