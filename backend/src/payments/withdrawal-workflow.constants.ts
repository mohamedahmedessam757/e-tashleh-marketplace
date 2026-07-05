/** Active withdrawal statuses — only one request allowed per user/store */
export const WITHDRAWAL_ACTIVE_STATUSES = ['PENDING', 'PROCESSING'] as const;

export const WITHDRAWAL_STATUS = {
  PENDING: 'PENDING',
  PROCESSING: 'PROCESSING',
  COMPLETED: 'COMPLETED',
  REJECTED: 'REJECTED',
  CANCELLED: 'CANCELLED',
  /** Legacy — mapped on read */
  TRANSFERRED: 'TRANSFERRED',
  APPROVED: 'APPROVED',
  FAILED: 'FAILED',
} as const;

export type WithdrawalStatus = (typeof WITHDRAWAL_STATUS)[keyof typeof WITHDRAWAL_STATUS];
