import { computeAdjudicationFinancials } from './adjudication-financial.util';

const BASE = {
    orderPaidTotal: 100,
    gatewayFeePct: 3,
    refundFeePct: 1.5,
    shippingRoundtrip: 20,
};

describe('computeAdjudicationFinancials — explicit refund decision', () => {
    it('merchant fault + refund yes: full paid to customer, merchant owes fees and shipping', () => {
        const r = computeAdjudicationFinancials({
            ...BASE,
            faultParty: 'MERCHANT',
            finalRefundDecision: 'REFUND_CUSTOMER',
        });
        expect(r.refundRequired).toBe(true);
        expect(r.finalCustomerRefundAmount).toBe(100);
        expect(r.feeBearer).toBe('MERCHANT');
        expect(r.shippingBearer).toBe('MERCHANT');
        expect(r.merchantWalletDebits.platformFees).toBeCloseTo(4.5);
        expect(r.merchantWalletDebits.shipping).toBe(20);
        expect(r.refundExecutionStatusSeed).toBe('PENDING');
    });

    it('merchant fault + refund no: zero customer refund, merchant still owes fees and shipping', () => {
        const r = computeAdjudicationFinancials({
            ...BASE,
            faultParty: 'VENDOR',
            finalRefundDecision: 'NO_CUSTOMER_REFUND',
        });
        expect(r.refundRequired).toBe(false);
        expect(r.finalCustomerRefundAmount).toBe(0);
        expect(r.customerStripeRefund).toBe(0);
        expect(r.feeBearer).toBe('MERCHANT');
        expect(r.shippingBearer).toBe('MERCHANT');
        expect(r.merchantWalletDebits.platformFees).toBeCloseTo(4.5);
        expect(r.merchantWalletDebits.shipping).toBe(20);
        expect(r.refundExecutionStatusSeed).toBe('NOT_REQUIRED');
    });

    it('customer fault + refund yes: paid minus fees minus shipping', () => {
        const r = computeAdjudicationFinancials({
            ...BASE,
            faultParty: 'CUSTOMER',
            finalRefundDecision: 'REFUND_CUSTOMER',
        });
        expect(r.finalCustomerRefundAmount).toBeCloseTo(75.5);
        expect(r.feeBearer).toBe('CUSTOMER');
        expect(r.shippingBearer).toBe('CUSTOMER');
        expect(r.merchantWalletDebits.platformFees).toBe(0);
        expect(r.merchantWalletDebits.shipping).toBe(0);
    });

    it('customer fault + refund no: zero refund, customer still bears shipping', () => {
        const r = computeAdjudicationFinancials({
            ...BASE,
            faultParty: 'CUSTOMER',
            finalRefundDecision: 'NO_CUSTOMER_REFUND',
        });
        expect(r.finalCustomerRefundAmount).toBe(0);
        expect(r.feeBearer).toBe('CUSTOMER');
        expect(r.shippingBearer).toBe('CUSTOMER');
        expect(r.merchantWalletDebits.shipping).toBe(0);
        expect(r.refundExecutionStatusSeed).toBe('NOT_REQUIRED');
    });

    it('shipping company + refund yes: full paid, platform fees, shipping-company liability', () => {
        const r = computeAdjudicationFinancials({
            ...BASE,
            faultParty: 'SHIPPING_COMPANY',
            finalRefundDecision: 'REFUND_CUSTOMER',
        });
        expect(r.finalCustomerRefundAmount).toBe(100);
        expect(r.feeBearer).toBe('PLATFORM');
        expect(r.shippingBearer).toBe('SHIPPING_COMPANY');
        expect(r.shippingCompanyLiability).toBe(20);
        expect(r.platformRetainedAmount).toBe(0);
        expect(r.merchantWalletDebits.platformFees).toBe(0);
    });

    it('CLOSE_COMPLETE_REFUND forces customer refund of paid minus fees and no shipping', () => {
        const r = computeAdjudicationFinancials({
            ...BASE,
            faultParty: 'CLOSE_COMPLETE_REFUND',
        });
        expect(r.finalRefundDecision).toBe('REFUND_CUSTOMER');
        expect(r.finalCustomerRefundAmount).toBeCloseTo(95.5);
        expect(r.feeBearer).toBe('MIXED_CLOSE');
        expect(r.shippingBearer).toBe('NONE');
        expect(r.merchantWalletDebits.shipping).toBe(0);
    });

    it('caps customer refund to maxRefundable without changing merchant fee/shipping obligations', () => {
        const r = computeAdjudicationFinancials({
            ...BASE,
            faultParty: 'MERCHANT',
            finalRefundDecision: 'REFUND_CUSTOMER',
            maxRefundable: 40,
        });
        expect(r.stripeCapped).toBe(true);
        expect(r.finalCustomerRefundAmount).toBe(40);
        expect(r.merchantWalletDebits.platformFees).toBeCloseTo(4.5);
        expect(r.merchantWalletDebits.shipping).toBe(20);
    });

    it('shipping company + refund no: zero customer refund, shipping liability still recorded', () => {
        const r = computeAdjudicationFinancials({
            ...BASE,
            faultParty: 'SHIPPING_COMPANY',
            finalRefundDecision: 'NO_CUSTOMER_REFUND',
        });
        expect(r.finalCustomerRefundAmount).toBe(0);
        expect(r.feeBearer).toBe('PLATFORM');
        expect(r.shippingBearer).toBe('SHIPPING_COMPANY');
        expect(r.shippingCompanyLiability).toBe(20);
        expect(r.merchantWalletDebits.platformFees).toBe(0);
        expect(r.refundExecutionStatusSeed).toBe('NOT_REQUIRED');
    });

    it('ignores non-finite fee percents and rounds money to cents', () => {
        const r = computeAdjudicationFinancials({
            orderPaidTotal: 100.009,
            gatewayFeePct: Number.NaN,
            refundFeePct: Number.POSITIVE_INFINITY,
            shippingRoundtrip: 10.004,
            faultParty: 'MERCHANT',
            finalRefundDecision: 'REFUND_CUSTOMER',
        });
        expect(r.gatewayFeePct).toBe(3);
        expect(r.refundFeePct).toBe(1.5);
        expect(r.finalCustomerRefundAmount).toBe(100.01);
        expect(r.merchantWalletDebits.shipping).toBe(10);
    });

    it('does not let a leftover client net override close-complete refund', () => {
        const r = computeAdjudicationFinancials({
            ...BASE,
            faultParty: 'CLOSE_COMPLETE_REFUND',
            finalRefundDecision: 'REFUND_CUSTOMER',
        });
        expect(r.finalCustomerRefundAmount).toBe(95.5);
    });

    it('missing decision defaults to no customer refund except close-complete', () => {
        const merchant = computeAdjudicationFinancials({
            ...BASE,
            faultParty: 'MERCHANT',
        });
        expect(merchant.finalRefundDecision).toBe('NO_CUSTOMER_REFUND');
        expect(merchant.finalCustomerRefundAmount).toBe(0);

        const close = computeAdjudicationFinancials({
            ...BASE,
            faultParty: 'CLOSE_COMPLETE_REFUND',
        });
        expect(close.finalRefundDecision).toBe('REFUND_CUSTOMER');
        expect(close.finalCustomerRefundAmount).toBeGreaterThan(0);
    });
});
