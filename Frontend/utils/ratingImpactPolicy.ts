export type RatingImpactRuleLike = {
    isActive?: boolean;
    minRating: number | string;
    maxRating: number | string;
    actionType: string;
    actionLabelAr?: string;
    actionLabelEn?: string;
    suspendDurationDays?: number | null;
};

/** Rating impact rules apply only after at least one published review exists. */
export function hasRatingSample(totalReviews: number): boolean {
    return totalReviews > 0;
}

export function findApplicableRatingImpactRule(
    rules: RatingImpactRuleLike[],
    averageRating: number,
    totalReviews: number,
): RatingImpactRuleLike | null {
    if (!hasRatingSample(totalReviews)) return null;
    return (
        rules
            .filter((r) => r.isActive !== false)
            .find(
                (r) =>
                    averageRating >= Number(r.minRating) &&
                    averageRating <= Number(r.maxRating),
            ) ?? null
    );
}

export function isFeaturedMerchantByRules(
    rules: RatingImpactRuleLike[],
    averageRating: number,
    totalReviews: number,
): boolean {
    return findApplicableRatingImpactRule(rules, averageRating, totalReviews)?.actionType === 'FEATURED';
}
