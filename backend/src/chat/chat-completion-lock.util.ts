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

export function isOpenDisputeStatus(status: string | null | undefined): boolean {
  if (!status) return true;
  return !(CLOSED_DISPUTE_STATUSES as readonly string[]).includes(status);
}

export function isOpenReturnStatus(status: string | null | undefined): boolean {
  if (!status) return true;
  return !(CLOSED_RETURN_STATUSES as readonly string[]).includes(status);
}

/** Per-part statuses after which that part needs no further vendor–customer chat. */
export const CHAT_CLOSED_OFFER_STATUSES = ['CANCELLED', 'COMPLETED'] as const;

/**
 * Chat scoped to one vendor (and optionally one part) on an order. Closes when the
 * order is terminal, or — for multi-part orders — when every accepted offer in scope
 * is cancelled/completed and no return/dispute is still open on them.
 */
export function shouldCloseScopedOrderChat(input: {
  orderStatus: string | null | undefined;
  offers: Array<{ fulfillmentStatus: string | null | undefined }>;
  hasOpenCase: boolean;
}): boolean {
  if (shouldCloseOrderChat(input.orderStatus)) return true;
  if (!input.offers.length || input.hasOpenCase) return false;
  return input.offers.every((o) =>
    (CHAT_CLOSED_OFFER_STATUSES as readonly string[]).includes(
      String(o.fulfillmentStatus || '').toUpperCase(),
    ),
  );
}

/**
 * Lock order chat whenever status is in the terminal close set.
 * Dispute/return helpers remain for other governance callers.
 */
export function shouldLockChatOnCompletion(input: {
  orderStatus: string;
}): { shouldLock: boolean; reason: ChatCompletionLockReason | null } {
  if (!shouldCloseOrderChat(input.orderStatus)) {
    return { shouldLock: false, reason: null };
  }
  return { shouldLock: true, reason: 'ORDER_COMPLETED' };
}
