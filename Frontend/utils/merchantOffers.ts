import { isVisibleMarketplaceOffer } from './offerStatusHelpers';

/** Offer still counts as "submitted by this merchant" on marketplace cards */
export function isActiveMerchantOffer(offer: {
    isWithdrawn?: boolean;
    status?: string;
}): boolean {
    return isVisibleMarketplaceOffer(offer);
}

export function getActiveOffersForStore<
    T extends { storeId?: string; isWithdrawn?: boolean; status?: string },
>(offers: T[] | undefined, storeId: string | null | undefined): T[] {
    if (!storeId || !offers?.length) return [];
    return offers.filter(
        (o) => String(o.storeId) === String(storeId) && isActiveMerchantOffer(o),
    );
}

const GOVERNANCE_MONTHLY_DELETION_LIMIT = 50;
const GOVERNANCE_MONTHLY_DELETION_WARN_AT = 35;

/** Monthly deletion/withdrawal quota (50/month) — replaces legacy 5% rate bar. */
export function getMonthlyOfferDeletionMetrics(metrics: {
    monthlyOfferDeletionCount?: number;
    monthlyDeletionLimit?: number;
    monthlyDeletionWarnAt?: number;
    offerBiddingRestrictedUntil?: string | Date | null;
}) {
    const limit = metrics.monthlyDeletionLimit ?? GOVERNANCE_MONTHLY_DELETION_LIMIT;
    const warnAt = metrics.monthlyDeletionWarnAt ?? GOVERNANCE_MONTHLY_DELETION_WARN_AT;
    const count = Math.max(metrics.monthlyOfferDeletionCount ?? 0, 0);
    const remaining = Math.max(limit - count, 0);
    const barPercent = Math.min((count / limit) * 100, 100);
    const nearLimit = count >= warnAt;
    const atLimit = count >= limit;
    const restrictedUntil = metrics.offerBiddingRestrictedUntil
        ? new Date(metrics.offerBiddingRestrictedUntil)
        : null;
    const isBiddingRestricted = !!(restrictedUntil && restrictedUntil.getTime() > Date.now());

    return {
        count,
        limit,
        remaining,
        barPercent,
        nearLimit,
        atLimit,
        isBiddingRestricted,
        restrictedUntil,
        hasSample: true,
    };
}

/** @deprecated Prefer getMonthlyOfferDeletionMetrics — kept for transitional UI */
export function getOfferModificationMetrics(metrics: {
    editCount?: number;
    withdrawalCount?: number;
    totalOffersSent?: number;
    monthlyOfferDeletionCount?: number;
    monthlyDeletionLimit?: number;
    monthlyDeletionWarnAt?: number;
    offerBiddingRestrictedUntil?: string | Date | null;
}) {
    if (
        metrics.monthlyOfferDeletionCount !== undefined ||
        metrics.offerBiddingRestrictedUntil !== undefined
    ) {
        const m = getMonthlyOfferDeletionMetrics(metrics);
        return {
            rate: m.count / m.limit,
            percentLabel: `${m.count}`,
            barPercent: m.barPercent,
            exceedsThreshold: m.nearLimit,
            modActions: m.count,
            total: m.limit,
            hasSample: true,
            monthly: m,
        };
    }
    const GOVERNANCE_MOD_RATE_CAP = 0.05;
    const total = Math.max(metrics.totalOffersSent ?? 0, 0);
    const modActions = (metrics.editCount ?? 0) + (metrics.withdrawalCount ?? 0);
    const rate = total > 0 ? modActions / total : 0;
    const percentLabel = (rate * 100).toFixed(1);
    const barPercent = Math.min((rate / GOVERNANCE_MOD_RATE_CAP) * 100, 100);
    const exceedsThreshold = rate > GOVERNANCE_MOD_RATE_CAP;
    return {
        rate,
        percentLabel,
        barPercent,
        exceedsThreshold,
        modActions,
        total,
        hasSample: total > 0,
    };
}
