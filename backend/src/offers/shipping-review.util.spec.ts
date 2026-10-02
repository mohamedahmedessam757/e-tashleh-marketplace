import {
    computeShippingReviewStatus,
    isCustomerVisibleShippingReview,
    SHIPPING_REVIEW,
} from './shipping-review.util';

describe('computeShippingReviewStatus', () => {
    it('is NONE when classes match', () => {
        expect(computeShippingReviewStatus('engine', 'engine')).toBe(SHIPPING_REVIEW.NONE);
    });

    it('is PENDING when classes differ', () => {
        expect(computeShippingReviewStatus('standard', 'gearbox')).toBe(SHIPPING_REVIEW.PENDING);
    });

    it('is NONE when either side is undeclared', () => {
        expect(computeShippingReviewStatus(null, 'engine')).toBe(SHIPPING_REVIEW.NONE);
        expect(computeShippingReviewStatus('engine', null)).toBe(SHIPPING_REVIEW.NONE);
        expect(computeShippingReviewStatus(undefined, undefined)).toBe(SHIPPING_REVIEW.NONE);
    });
});

describe('isCustomerVisibleShippingReview', () => {
    it('shows NONE / APPROVED and legacy null', () => {
        expect(isCustomerVisibleShippingReview('NONE')).toBe(true);
        expect(isCustomerVisibleShippingReview('APPROVED')).toBe(true);
        expect(isCustomerVisibleShippingReview(null)).toBe(true);
    });

    it('hides PENDING / EXPIRED', () => {
        expect(isCustomerVisibleShippingReview('PENDING')).toBe(false);
        expect(isCustomerVisibleShippingReview('EXPIRED')).toBe(false);
    });
});
