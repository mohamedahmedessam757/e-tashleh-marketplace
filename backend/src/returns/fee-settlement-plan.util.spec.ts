import { computeAdjudicationFinancials } from './adjudication-financial.util';
import { buildFeeSettlementPlan, FeeSettlementLineItem } from './fee-settlement-plan.util';

const BASE = {
    orderPaidTotal: 100,
    gatewayFeePct: 3,
    refundFeePct: 1.5,
    shippingRoundtrip: 20,
};

function getLine(kind: string, lineItems: FeeSettlementLineItem[]) {
    return lineItems.find((x) => x.kind === kind);
}

describe('buildFeeSettlementPlan — mapping + invariants', () => {
    it('merchant fault + refund yes => commission+shipping paid by merchant wallet debit', () => {
        const fin = computeAdjudicationFinancials({
            ...BASE,
            faultParty: 'MERCHANT',
            finalRefundDecision: 'REFUND_CUSTOMER',
        });
        const plan = buildFeeSettlementPlan({
            caseId: 'case_1',
            shippingRoundtrip: BASE.shippingRoundtrip,
            refundExecutionStatus: fin.refundExecutionStatusSeed,
            fin,
        });

        const gateway = getLine('GATEWAY_FEE', plan.lineItems);
        const refundFee = getLine('REFUND_FEE', plan.lineItems);
        const shipping = getLine('ROUNDTRIP_SHIPPING', plan.lineItems);

        expect(plan.feeBearer).toBe('MERCHANT');
        expect(plan.shippingBearer).toBe('MERCHANT');
        expect(gateway?.fundingPath).toBe('WALLET_DEBIT');
        expect(refundFee?.fundingPath).toBe('WALLET_DEBIT');
        expect(shipping?.fundingPath).toBe('WALLET_DEBIT');

        expect(plan.invariants.expectedCustomerRefundCreditAmount).toBe(fin.finalCustomerRefundAmount);
        expect(plan.invariants.expectedWalletShippingDebitAmount).toBe(BASE.shippingRoundtrip);
    });

    it('customer fault + refund yes => commission+shipping withheld from Stripe refund', () => {
        const fin = computeAdjudicationFinancials({
            ...BASE,
            faultParty: 'CUSTOMER',
            finalRefundDecision: 'REFUND_CUSTOMER',
        });
        const plan = buildFeeSettlementPlan({
            caseId: 'case_1',
            shippingRoundtrip: BASE.shippingRoundtrip,
            refundExecutionStatus: fin.refundExecutionStatusSeed,
            fin,
        });

        const gateway = getLine('GATEWAY_FEE', plan.lineItems);
        const refundFee = getLine('REFUND_FEE', plan.lineItems);
        const shipping = getLine('ROUNDTRIP_SHIPPING', plan.lineItems);

        expect(plan.feeBearer).toBe('CUSTOMER');
        expect(plan.shippingBearer).toBe('CUSTOMER');
        expect(gateway?.fundingPath).toBe('WITHHELD_FROM_STRIPE_REFUND');
        expect(refundFee?.fundingPath).toBe('WITHHELD_FROM_STRIPE_REFUND');
        expect(shipping?.fundingPath).toBe('WITHHELD_FROM_STRIPE_REFUND');

        expect(plan.invariants.expectedWalletShippingDebitAmount).toBe(0);
        expect(plan.invariants.expectedCustomerRefundCreditAmount).toBe(fin.finalCustomerRefundAmount);
    });

    it('shipping company + refund yes => platform for commission, shipping-company liability (doc) not wallet debit', () => {
        const fin = computeAdjudicationFinancials({
            ...BASE,
            faultParty: 'SHIPPING_COMPANY',
            finalRefundDecision: 'REFUND_CUSTOMER',
        });
        const plan = buildFeeSettlementPlan({
            caseId: 'case_1',
            shippingRoundtrip: BASE.shippingRoundtrip,
            refundExecutionStatus: fin.refundExecutionStatusSeed,
            fin,
        });

        const gateway = getLine('GATEWAY_FEE', plan.lineItems);
        const shipping = getLine('ROUNDTRIP_SHIPPING', plan.lineItems);

        expect(plan.feeBearer).toBe('PLATFORM');
        expect(plan.shippingBearer).toBe('SHIPPING_COMPANY');
        expect(gateway?.fundingPath).toBe('PLATFORM_RETENTION_ONLY');
        expect(shipping?.fundingPath).toBe('PLATFORM_RETENTION_ONLY');

        expect(plan.invariants.expectedWalletShippingDebitAmount).toBe(0);
    });

    it('close-complete refund => commission withheld, shipping none', () => {
        const fin = computeAdjudicationFinancials({
            ...BASE,
            faultParty: 'CLOSE_COMPLETE_REFUND',
            finalRefundDecision: 'REFUND_CUSTOMER',
        });
        const plan = buildFeeSettlementPlan({
            caseId: 'case_1',
            shippingRoundtrip: BASE.shippingRoundtrip,
            refundExecutionStatus: fin.refundExecutionStatusSeed,
            fin,
        });

        const shipping = getLine('ROUNDTRIP_SHIPPING', plan.lineItems);
        const gateway = getLine('GATEWAY_FEE', plan.lineItems);

        expect(plan.feeBearer).toBe('MIXED_CLOSE');
        expect(plan.shippingBearer).toBe('NONE');
        expect(shipping).toBeUndefined();
        expect(gateway?.fundingPath).toBe('WITHHELD_FROM_STRIPE_REFUND');
    });

    it('customer fault + refund no => commission+shipping paid by customer wallet debit', () => {
        const fin = computeAdjudicationFinancials({
            ...BASE,
            faultParty: 'CUSTOMER',
            finalRefundDecision: 'NO_CUSTOMER_REFUND',
        });
        const plan = buildFeeSettlementPlan({
            caseId: 'case_1',
            shippingRoundtrip: BASE.shippingRoundtrip,
            refundExecutionStatus: fin.refundExecutionStatusSeed,
            fin,
        });

        const gateway = getLine('GATEWAY_FEE', plan.lineItems);
        const shipping = getLine('ROUNDTRIP_SHIPPING', plan.lineItems);

        expect(plan.feeBearer).toBe('CUSTOMER');
        expect(plan.shippingBearer).toBe('CUSTOMER');
        expect(gateway?.fundingPath).toBe('WALLET_DEBIT');
        expect(shipping?.fundingPath).toBe('WALLET_DEBIT');
        expect(plan.invariants.expectedWalletShippingDebitAmount).toBe(BASE.shippingRoundtrip);
    });

    it('uses a stable idempotency key for the same case + kind + status', () => {
        const fin = computeAdjudicationFinancials({
            ...BASE,
            faultParty: 'MERCHANT',
            finalRefundDecision: 'REFUND_CUSTOMER',
        });
        const a = buildFeeSettlementPlan({
            caseId: 'case_1',
            shippingRoundtrip: BASE.shippingRoundtrip,
            refundExecutionStatus: fin.refundExecutionStatusSeed,
            fin,
        });
        const b = buildFeeSettlementPlan({
            caseId: 'case_1',
            shippingRoundtrip: BASE.shippingRoundtrip,
            refundExecutionStatus: fin.refundExecutionStatusSeed,
            fin,
        });
        expect(a.lineItems.map((l) => l.idempotencyKey)).toEqual(b.lineItems.map((l) => l.idempotencyKey));
        expect(new Set(a.lineItems.map((l) => l.idempotencyKey)).size).toBe(a.lineItems.length);
    });
});

