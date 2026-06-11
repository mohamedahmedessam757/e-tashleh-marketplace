/** Active order statuses in the verification / correction workflow. */
export const VERIFICATION_FLOW_STATUSES = [
  'VERIFICATION',
  'VERIFICATION_SUCCESS',
  'NON_MATCHING',
  'CORRECTION_PERIOD',
  'CORRECTION_SUBMITTED',
  'READY_FOR_SHIPPING',
] as const;

export function orderHasVerificationRecord(order: {
  verificationDocuments?: unknown[];
  verificationSubmittedAt?: string | null;
}): boolean {
  return (
    (order.verificationDocuments?.length ?? 0) > 0 ||
    !!order.verificationSubmittedAt
  );
}

export function shouldShowAdminVerificationSections(order: {
  status: string;
  verificationDocuments?: unknown[];
  verificationSubmittedAt?: string | null;
}): boolean {
  return (
    orderHasVerificationRecord(order) ||
    (VERIFICATION_FLOW_STATUSES as readonly string[]).includes(order.status)
  );
}

export function isVerificationFlowStatus(status: string): boolean {
  return (VERIFICATION_FLOW_STATUSES as readonly string[]).includes(status);
}
