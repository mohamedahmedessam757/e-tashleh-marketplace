import { describe, it, expect } from '@jest/globals';
import { computeStripeGatewayFee } from './gateway-fee.util';
import { computeCancelBeforeShippingRefund } from './cancel-refund.util';

describe('cancel refund uses absolute Stripe gateway fee', () => {
    const paidTotal = 1250;
    const pct = 2.99;
    const fixed = 0.3;
    const fee = computeStripeGatewayFee(paidTotal, pct, fixed); // 37.68

    it('computes Stripe-style fee from live settings (not flat 2%)', () => {
        expect(fee).toBe(37.68);
        expect(fee).not.toBe(25); // old hardcoded 2% of 1250
    });

    it('merchant-fault: full refund when feeAmount passed as 0', () => {
        const calc = computeCancelBeforeShippingRefund(paidTotal, 0, 0);
        expect(calc.refundAmount).toBe(1250);
        expect(calc.feeAmount).toBe(0);
        expect(calc.targetNetRefund).toBe(1250);
    });

    it('non-merchant-fault: deducts absolute Stripe fee from refund', () => {
        const calc = computeCancelBeforeShippingRefund(paidTotal, fee, 0);
        expect(calc.feeAmount).toBe(37.68);
        expect(calc.refundAmount).toBe(1212.32);
        expect(calc.targetNetRefund).toBe(1212.32);
    });

    it('clamps fee to paidTotal', () => {
        const calc = computeCancelBeforeShippingRefund(100, 999, 0);
        expect(calc.feeAmount).toBe(100);
        expect(calc.refundAmount).toBe(0);
    });
});
