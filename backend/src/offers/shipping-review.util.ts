/**
 * Shipping-class review for offers whose merchant partType differs from the
 * customer's declared OrderPart.shippingClass.
 *
 * NONE      — classes match (or one side undeclared); visible normally
 * PENDING   — mismatch awaiting an admin decision; hidden from the customer
 * APPROVED  — admin decided; visible normally
 * EXPIRED   — no decision before bidding stopped; offer auto-withdrawn
 */
export const SHIPPING_REVIEW = {
    NONE: 'NONE',
    PENDING: 'PENDING',
    APPROVED: 'APPROVED',
    EXPIRED: 'EXPIRED',
} as const;

export type ShippingReviewStatus = (typeof SHIPPING_REVIEW)[keyof typeof SHIPPING_REVIEW];

export const SHIPPING_REVIEW_EXPIRED_WITHDRAWAL = 'shipping_review_expired';

/** Statuses a CUSTOMER may see, count at reveal, and accept. */
export const CUSTOMER_VISIBLE_SHIPPING_REVIEW_STATUSES: string[] = [
    SHIPPING_REVIEW.NONE,
    SHIPPING_REVIEW.APPROVED,
];

/** Prisma where-fragment for customer-visible offers. */
export const CUSTOMER_VISIBLE_SHIPPING_REVIEW = {
    shippingReviewStatus: { in: CUSTOMER_VISIBLE_SHIPPING_REVIEW_STATUSES },
};

export function computeShippingReviewStatus(
    customerClass?: string | null,
    merchantPartType?: string | null,
): 'NONE' | 'PENDING' {
    if (!customerClass || !merchantPartType) return SHIPPING_REVIEW.NONE;
    return String(customerClass) === String(merchantPartType)
        ? SHIPPING_REVIEW.NONE
        : SHIPPING_REVIEW.PENDING;
}

export function isCustomerVisibleShippingReview(status?: string | null): boolean {
    return CUSTOMER_VISIBLE_SHIPPING_REVIEW_STATUSES.includes(String(status ?? SHIPPING_REVIEW.NONE));
}
