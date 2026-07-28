/**
 * Pure helper: whether vendor–customer order chat should lock when an order
 * reaches a completion-like status (no open dispute/return).
 *
 * Product rule (2026): cancelled / completed chats stay OPEN so parties can
 * still communicate. Auto-lock on completion is disabled.
 */

export type ChatCompletionLockReason = 'ORDER_COMPLETED';

export const CLOSED_DISPUTE_STATUSES = ['RESOLVED', 'CLOSED'] as const;
export const CLOSED_RETURN_STATUSES = [
  'RESOLVED',
  'CLOSED',
  'CANCELLED',
  'REJECTED',
  'COMPLETED',
] as const;

/** Order statuses that mean the order has finished successfully. */
export const COMPLETION_LIKE_ORDER_STATUSES = [
  'COMPLETED',
  'WARRANTY_ACTIVE',
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
 * Always keep chat open on completion/cancel — do not auto-lock.
 * Dispute/return helpers above remain for other governance callers.
 */
export function shouldLockChatOnCompletion(_input: {
  orderStatus: string;
  disputeStatuses?: Array<string | null | undefined>;
  returnStatuses?: Array<string | null | undefined>;
}): { shouldLock: boolean; reason: ChatCompletionLockReason | null } {
  return { shouldLock: false, reason: null };
}
