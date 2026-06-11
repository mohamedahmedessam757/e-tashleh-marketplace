/** Shared offer status checks (API may return ACCEPTED or accepted). */
export const ACCEPTED_OFFER_STATUSES = new Set([
  'ACCEPTED',
  'COMPLETED',
  'SHIPPED',
  'DELIVERED',
  'PREPARATION',
  'PARTIALLY_SHIPPED',
  'PARTIALLY_PAID',
  'PAID',
]);

export function isAcceptedOfferStatus(status?: string | null): boolean {
  return ACCEPTED_OFFER_STATUSES.has(String(status || '').toUpperCase());
}

export function isRejectedOfferStatus(status?: string | null): boolean {
  return String(status || '').toUpperCase() === 'REJECTED';
}

/** Active offers visible to the customer (not rejected). */
export function isActiveOfferStatus(status?: string | null): boolean {
  return !isRejectedOfferStatus(status);
}
