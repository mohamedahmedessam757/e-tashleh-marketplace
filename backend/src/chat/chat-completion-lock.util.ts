/**
 * Pure helper: whether vendor–customer order chat should lock when an order
 * reaches a terminal status (cancel / complete / warranty).
 *
 * Product rule (2026): ALWAYS close on CANCELLED | COMPLETED | WARRANTY_ACTIVE |
 * WARRANTY_EXPIRED. DELIVERED stays open for return/dispute communication.
 * Support chats are out of scope (callers filter type === 'order').
 */

import { shouldCloseOrderChat } from './chat-offer-expiry.util';

export type ChatCompletionLockReason = 'ORDER_COMPLETED';

export const CLOSED_DISPUTE_STATUSES = ['RESOLVED', 'CLOSED'] as const;
export const CLOSED_RETURN_STATUSES = [
  'RESOLVED',
  'CLOSED',
  'CANCELLED',
  'REJECTED',
  'COMPLETED',
] as const;

/** Order statuses that mean the order has finished / warranty / cancelled. */
export const COMPLETION_LIKE_ORDER_STATUSES = [
  'COMPLETED',
  'WARRANTY_ACTIVE',
  'WARRANTY_EXPIRED',
  'CANCELLED',
] as const;

export function isOpenDisputeStatus(status: string | null | undefined): boolean {
  if (!status) return true;
  return !(CLOSED_DISPUTE_STATUSES as readonly string[]).includes(status);
}

export function isOpenReturnStatus(status: string | null | undefined): boolean {
  if (!status) return true;
  return !(CLOSED_RETURN_STATUSES as readonly string[]).includes(status);
}

/**
 * Lock order chat whenever status is in the terminal close set.
 * Dispute/return helpers remain for other governance callers.
 */
export function shouldLockChatOnCompletion(input: {
  orderStatus: string;
  disputeStatuses?: Array<string | null | undefined>;
  returnStatuses?: Array<string | null | undefined>;
}): { shouldLock: boolean; reason: ChatCompletionLockReason | null } {
  if (!shouldCloseOrderChat(input.orderStatus)) {
    return { shouldLock: false, reason: null };
  }
  return { shouldLock: true, reason: 'ORDER_COMPLETED' };
}
