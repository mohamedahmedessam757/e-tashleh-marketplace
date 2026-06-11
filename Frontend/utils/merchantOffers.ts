/** Offer still counts as "submitted by this merchant" on marketplace cards */
export function isActiveMerchantOffer(offer: {
    isWithdrawn?: boolean;
    status?: string;
}): boolean {
    if (offer.isWithdrawn) return false;
    const status = String(offer.status ?? '').toLowerCase();
    return status !== 'withdrawn' && status !== 'rejected';
}

export function getActiveOffersForStore<
    T extends { storeId?: string; isWithdrawn?: boolean; status?: string },
>(offers: T[] | undefined, storeId: string | null | undefined): T[] {
    if (!storeId || !offers?.length) return [];
    return offers.filter(
        (o) => String(o.storeId) === String(storeId) && isActiveMerchantOffer(o),
    );
}

const GOVERNANCE_MOD_RATE_CAP = 0.05;

/** Modification rate vs 5% governance cap — used for label + progress bar. */
export function getOfferModificationMetrics(metrics: {
    editCount?: number;
    withdrawalCount?: number;
    totalOffersSent?: number;
}) {
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
