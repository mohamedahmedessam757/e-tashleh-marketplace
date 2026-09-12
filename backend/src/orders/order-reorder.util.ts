/**
 * Pure helpers for multi-order part reorder (create-from-source path).
 * Kept free of Nest DI so security rules can be unit-tested in isolation.
 */

export type ReorderIdsShapeError =
  | 'REORDER_FIELDS_INCOMPLETE'
  | 'REORDER_PARTS_MISMATCH'
  | 'REORDER_PARTS_DUPLICATE';

/** Only absolute http(s) URLs — blocks javascript:, data:, relative paths, etc. */
export function isSafePublicMediaUrl(url: string | null | undefined): boolean {
  if (url == null) return true;
  const raw = String(url);
  if (!raw.trim()) return true;
  // Reject control chars / embedded whitespace before trimming (CRLF / null injection)
  if (/[\u0000-\u001F\u007F]/.test(raw)) return false;
  const trimmed = raw.trim();
  if (/\s/.test(trimmed)) return false;
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
}

/**
 * Shape checks before DB lookup (ownership / offers checked separately).
 * Returns null when valid, or an error code.
 */
export function validateReorderIdsShape(input: {
  reorderFromOrderId?: string | null;
  reorderPartIds?: string[] | null;
  partsLength: number;
}): ReorderIdsShapeError | null {
  const orderId = input.reorderFromOrderId?.trim() || '';
  const partIds = (input.reorderPartIds ?? [])
    .map((id) => String(id).trim())
    .filter(Boolean);
  const hasOrderId = !!orderId;
  const hasPartIds = partIds.length > 0;

  if (!hasOrderId && !hasPartIds) return null;
  if (!hasOrderId || !hasPartIds) return 'REORDER_FIELDS_INCOMPLETE';
  if (partIds.length !== input.partsLength) return 'REORDER_PARTS_MISMATCH';
  if (new Set(partIds).size !== partIds.length) return 'REORDER_PARTS_DUPLICATE';
  return null;
}

/** Whether a source order status may seed a reorder create. */
export function isReorderEligibleSourceStatus(status: string): boolean {
  return status === 'AWAITING_SELECTION' || status === 'CANCELLED';
}

/**
 * Quota exemption: only skip the cooldown when the blocking active multiple
 * is the same order the customer is reordering from.
 */
export function shouldExemptMultipleCooldown(opts: {
  reorderExempt: boolean;
  reorderSourceOrderId?: string | null;
  blockingOrderId?: string | null;
}): boolean {
  if (!opts.reorderExempt) return false;
  if (!opts.reorderSourceOrderId || !opts.blockingOrderId) return false;
  return opts.reorderSourceOrderId === opts.blockingOrderId;
}
