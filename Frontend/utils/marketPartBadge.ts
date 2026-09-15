/**
 * Pure market-intel badge priority used by MarketplaceOfferDetails.
 * Kept free of React so security/UX rules can be unit-tested.
 */
export type MarketPartBadgeKind = 'cancelled' | 'rejected' | 'other_merchant' | 'competition';

export function resolveMarketPartBadgeKind(input: {
    orderStatus?: string | null;
    myOfferStatus?: string | null;
    myOfferWithdrawn?: boolean;
    myFulfillmentStatus?: string | null;
    adminRejected?: boolean;
    awardedToOther?: boolean;
}): MarketPartBadgeKind {
    const statusLower = String(input.myOfferStatus || '').toLowerCase();
    const fulfillmentUpper = String(input.myFulfillmentStatus || '').toUpperCase();
    const isCancelled =
        String(input.orderStatus || '').toUpperCase() === 'CANCELLED' ||
        statusLower === 'rejected' ||
        statusLower === 'withdrawn' ||
        !!input.myOfferWithdrawn ||
        fulfillmentUpper === 'CANCELLED';

    if (isCancelled) return 'cancelled';
    if (statusLower === 'accepted' && input.adminRejected) return 'rejected';
    if (input.awardedToOther) return 'other_merchant';
    return 'competition';
}
