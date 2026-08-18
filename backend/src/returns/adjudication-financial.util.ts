/**
 * Single source of truth for admin adjudication financial rules (disputes / returns).
 *
 * Frozen scenario matrix:
 * - MERCHANT/STORE/VENDOR + REFUND_CUSTOMER → full paid (capped); merchant pays fees + shipping
 * - MERCHANT/STORE/VENDOR + NO_CUSTOMER_REFUND → 0 customer refund; merchant still owes fees + shipping
 * - CUSTOMER + REFUND_CUSTOMER → paid − fees − shipping; customer bears fees/shipping
 * - CUSTOMER + NO_CUSTOMER_REFUND → 0 customer refund; customer still bears shipping
 * - SHIPPING_COMPANY + REFUND_CUSTOMER → full paid; platform fees; shipping-company liability
 * - CLOSE_COMPLETE_REFUND → forced REFUND_CUSTOMER; paid − fees; no shipping
 * - Stripe call only when REFUND_CUSTOMER and amount > 0
 */


export type AdjudicationFaultParty =
    | 'CUSTOMER'
    | 'MERCHANT'
    | 'STORE'
    | 'VENDOR'
    | 'SHIPPING_COMPANY'
    | 'CLOSE_COMPLETE_REFUND'
    | string;

export type FeeBearer = 'CUSTOMER' | 'MERCHANT' | 'PLATFORM' | 'MIXED_CLOSE';
export type ShippingBearer = 'CUSTOMER' | 'MERCHANT' | 'SHIPPING_COMPANY' | 'NONE';
export type FinalRefundDecision = 'REFUND_CUSTOMER' | 'NO_CUSTOMER_REFUND';
export type RefundExecutionStatus =
    | 'NOT_REQUIRED'
    | 'PENDING'
    | 'PROCESSING'
    | 'SUCCEEDED'
    | 'FAILED';

export interface AdjudicationFinancialInput {
    orderPaidTotal: number;
    gatewayFeePct: number;
    refundFeePct: number;
    shippingRoundtrip: number;
    faultParty: AdjudicationFaultParty;
    finalRefundDecision?: FinalRefundDecision;
    maxRefundable?: number;
}

export interface AdjudicationFinancialResult {
    gatewayFeeAmount: number;
    refundFeeAmount: number;
    platformFeesTotal: number;
    /** Amount sent to Stripe (customer refund) */
    customerStripeRefund: number;
    /** @deprecated alias */
    stripeRefundAmount: number;
    netRefundAmount: number;
    platformRetainedAmount: number;
    feeBearer: FeeBearer;
    shippingBearer: ShippingBearer;
    merchantWalletDebits: { shipping: number; platformFees: number };
    shippingCompanyLiability: number;
    stripeCapped: boolean;
    refundCappedFrom?: number;
    gatewayFeePct: number;
    refundFeePct: number;
    finalRefundDecision: FinalRefundDecision;
    finalCustomerRefundAmount: number;
    refundRequired: boolean;
    refundExecutionStatusSeed: RefundExecutionStatus;
}

function normalizeFault(faultParty: AdjudicationFaultParty): string {
    return String(faultParty || 'MERCHANT').toUpperCase();
}

function isMerchantFault(fault: string): boolean {
    return ['STORE', 'MERCHANT', 'VENDOR'].includes(fault);
}

function normalizeFinalRefundDecision(
    decision: FinalRefundDecision | string | undefined,
    fault: string,
): FinalRefundDecision {
    const normalized = String(decision || '').toUpperCase();
    if (normalized === 'REFUND_CUSTOMER' || normalized === 'NO_CUSTOMER_REFUND') {
        return normalized;
    }
    return fault === 'CLOSE_COMPLETE_REFUND' ? 'REFUND_CUSTOMER' : 'NO_CUSTOMER_REFUND';
}

function roundMoney2(amount: number): number {
    const n = Number(amount);
    if (!Number.isFinite(n) || n <= 0) return 0;
    return Math.round((n + Number.EPSILON) * 100) / 100;
}

function sanitizePct(value: unknown, fallback: number): number {
    const n = Number(value);
    if (!Number.isFinite(n) || n < 0) return fallback;
    return Math.min(n, 100);
}

export function computeAdjudicationFinancials(
    input: AdjudicationFinancialInput,
): AdjudicationFinancialResult {
    const orderPaidTotal = roundMoney2(Math.max(0, Number(input.orderPaidTotal) || 0));
    const gatewayFeePct = sanitizePct(input.gatewayFeePct ?? 3, 3);
    const refundFeePct = sanitizePct(input.refundFeePct ?? 1.5, 1.5);
    const shippingRoundtrip = roundMoney2(Math.max(0, Number(input.shippingRoundtrip) || 0));
    const fault = normalizeFault(input.faultParty);
    const isCloseComplete = fault === 'CLOSE_COMPLETE_REFUND';
    const finalRefundDecision = normalizeFinalRefundDecision(input.finalRefundDecision, fault);
    const refundRequired = finalRefundDecision === 'REFUND_CUSTOMER';

    const gatewayFeeAmount = (orderPaidTotal * gatewayFeePct) / 100;
    const refundFeeAmount = (orderPaidTotal * refundFeePct) / 100;
    const platformFeesTotal = gatewayFeeAmount + refundFeeAmount;

    let feeBearer: FeeBearer = 'CUSTOMER';
    let shippingBearer: ShippingBearer = 'NONE';
    let customerStripeRefund = 0;
    let platformRetainedAmount = 0;
    let merchantShippingDebit = 0;
    let merchantPlatformFeesDebit = 0;
    let shippingCompanyLiability = 0;

    if (!refundRequired) {
        feeBearer = isMerchantFault(fault) ? 'MERCHANT' : fault === 'SHIPPING_COMPANY' ? 'PLATFORM' : 'CUSTOMER';
        shippingBearer =
            fault === 'SHIPPING_COMPANY'
                ? shippingRoundtrip > 0
                    ? 'SHIPPING_COMPANY'
                    : 'NONE'
                : isMerchantFault(fault)
                  ? shippingRoundtrip > 0
                      ? 'MERCHANT'
                      : 'NONE'
                  : shippingRoundtrip > 0
                    ? 'CUSTOMER'
                    : 'NONE';
        merchantShippingDebit =
            shippingBearer === 'MERCHANT' ? shippingRoundtrip : 0;
        merchantPlatformFeesDebit =
            feeBearer === 'MERCHANT' ? platformFeesTotal : 0;
        shippingCompanyLiability =
            shippingBearer === 'SHIPPING_COMPANY' ? shippingRoundtrip : 0;
        platformRetainedAmount =
            feeBearer === 'CUSTOMER' || feeBearer === 'MERCHANT' ? platformFeesTotal : 0;
        customerStripeRefund = 0;
    } else if (isCloseComplete) {
        feeBearer = 'MIXED_CLOSE';
        shippingBearer = 'NONE';
        platformRetainedAmount = platformFeesTotal;
        customerStripeRefund = Math.max(0, orderPaidTotal - platformFeesTotal);
    } else if (isMerchantFault(fault)) {
        feeBearer = 'MERCHANT';
        shippingBearer = shippingRoundtrip > 0 ? 'MERCHANT' : 'NONE';
        customerStripeRefund = orderPaidTotal;
        merchantShippingDebit = shippingRoundtrip;
        merchantPlatformFeesDebit = platformFeesTotal;
        platformRetainedAmount = platformFeesTotal;
    } else if (fault === 'SHIPPING_COMPANY') {
        feeBearer = 'PLATFORM';
        shippingBearer = shippingRoundtrip > 0 ? 'SHIPPING_COMPANY' : 'NONE';
        customerStripeRefund = orderPaidTotal;
        shippingCompanyLiability = shippingRoundtrip;
        platformRetainedAmount = 0;
    } else {
        // CUSTOMER (default guilty party for claims)
        feeBearer = 'CUSTOMER';
        shippingBearer = shippingRoundtrip > 0 ? 'CUSTOMER' : 'NONE';
        platformRetainedAmount = platformFeesTotal;
        customerStripeRefund = Math.max(
            0,
            orderPaidTotal - platformFeesTotal - shippingRoundtrip,
        );
    }

    const netRefundAmount = customerStripeRefund;

    let stripeCapped = false;
    let refundCappedFrom: number | undefined;
    const maxRefundable =
        input.maxRefundable != null && input.maxRefundable >= 0
            ? input.maxRefundable
            : undefined;

    let cappedStripe = customerStripeRefund;
    if (maxRefundable != null && cappedStripe > maxRefundable) {
        stripeCapped = true;
        refundCappedFrom = cappedStripe;
        cappedStripe = maxRefundable;
    }

    return {
        gatewayFeeAmount: roundMoney2(gatewayFeeAmount),
        refundFeeAmount: roundMoney2(refundFeeAmount),
        platformFeesTotal: roundMoney2(platformFeesTotal),
        customerStripeRefund: roundMoney2(cappedStripe),
        stripeRefundAmount: roundMoney2(cappedStripe),
        netRefundAmount: roundMoney2(netRefundAmount),
        platformRetainedAmount: roundMoney2(platformRetainedAmount),
        feeBearer,
        shippingBearer,
        merchantWalletDebits: {
            shipping: roundMoney2(merchantShippingDebit),
            platformFees: roundMoney2(merchantPlatformFeesDebit),
        },
        shippingCompanyLiability: roundMoney2(shippingCompanyLiability),
        stripeCapped,
        refundCappedFrom: refundCappedFrom != null ? roundMoney2(refundCappedFrom) : undefined,
        gatewayFeePct,
        refundFeePct,
        finalRefundDecision,
        finalCustomerRefundAmount: roundMoney2(cappedStripe),
        refundRequired,
        refundExecutionStatusSeed:
            refundRequired && cappedStripe > 0 ? 'PENDING' : 'NOT_REQUIRED',
    };
}
