/**
 * Compute how much of an order-level loyalty credit to reverse for a partial refund.
 * proportion = refundBasis / orderPaidTotal, clamped to [0, 1].
 */
export function computeLoyaltyReverseProportion(
  refundBasis: number,
  orderPaidTotal: number,
): number {
  const basis = Math.max(0, Number(refundBasis) || 0);
  const total = Math.max(0, Number(orderPaidTotal) || 0);
  if (total <= 0.009) return 1;
  return Math.min(1, Math.max(0, basis / total));
}

export function computePartialReverseAmount(
  originalCreditAmount: number,
  alreadyReversed: number,
  proportion: number,
): number {
  const original = Math.max(0, Number(originalCreditAmount) || 0);
  const reversed = Math.max(0, Number(alreadyReversed) || 0);
  const remaining = Math.max(0, original - reversed);
  const target = Number((original * Math.min(1, Math.max(0, proportion))).toFixed(2));
  const stillNeeded = Math.max(0, target - reversed);
  return Number(Math.min(remaining, stillNeeded).toFixed(2));
}
