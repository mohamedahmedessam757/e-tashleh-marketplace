/** Which part a billing row belongs to. Never the order's first part. */
export function invoiceRowPartName(input: {
  offerPartName?: string | null;
  partNameSnapshot?: string | null;
}): string | null {
  const fromOffer = String(input.offerPartName || '').trim();
  if (fromOffer) return fromOffer;
  const fromSnapshot = String(input.partNameSnapshot || '').trim();
  return fromSnapshot || null;
}

/** Refund totals are negative and must stay visible. Null only when the value is not a number. */
export function invoiceRowAmount(total: unknown): number | null {
  if (total === null || total === undefined || total === '') return null;
  const value = Number(total);
  return Number.isFinite(value) ? value : null;
}
