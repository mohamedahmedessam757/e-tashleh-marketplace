/**
 * Pure helper: whether vendor–customer order chat should lock when an order
 * reaches a completion-like status (no open dispute/return).
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

export function shouldLockChatOnCompletion(input: {
  orderStatus: string;
  disputeStatuses?: Array<string | null | undefined>;
  returnStatuses?: Array<string | null | undefined>;
}): { shouldLock: boolean; reason: ChatCompletionLockReason | null } {
  const isCompletionLike = (
    COMPLETION_LIKE_ORDER_STATUSES as readonly string[]
  ).includes(input.orderStatus);

  if (!isCompletionLike) {
    return { shouldLock: false, reason: null };
  }

  const hasOpenDispute = (input.disputeStatuses ?? []).some(isOpenDisputeStatus);
  const hasOpenReturn = (input.returnStatuses ?? []).some(isOpenReturnStatus);

  if (hasOpenDispute || hasOpenReturn) {
    return { shouldLock: false, reason: null };
  }

  return { shouldLock: true, reason: 'ORDER_COMPLETED' };
}
