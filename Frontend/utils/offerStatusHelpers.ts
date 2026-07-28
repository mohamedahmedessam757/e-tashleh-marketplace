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

/** Soft-deleted / cancelled / withdrawn — must not appear as a live marketplace offer. */
export function isWithdrawnOfferStatus(status?: string | null): boolean {
  const s = String(status || '').toUpperCase();
  return s === 'WITHDRAWN' || s === 'CANCELLED';
}

export function isHiddenMarketplaceOffer(offer?: {
  status?: string | null;
  isWithdrawn?: boolean;
} | null): boolean {
  if (!offer) return true;
  if (offer.isWithdrawn) return true;
  return isRejectedOfferStatus(offer.status) || isWithdrawnOfferStatus(offer.status);
}

/** Active offers visible to customer/admin marketplace lists. */
export function isActiveOfferStatus(status?: string | null): boolean {
  return !isRejectedOfferStatus(status) && !isWithdrawnOfferStatus(status);
}

export function isVisibleMarketplaceOffer(offer?: {
  status?: string | null;
  isWithdrawn?: boolean;
} | null): boolean {
  return !isHiddenMarketplaceOffer(offer);
}
