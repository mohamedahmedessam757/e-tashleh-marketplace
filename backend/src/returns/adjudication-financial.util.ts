/**
 * Single source of truth for admin adjudication financial rules (disputes / returns).
 *
 * Frozen scenario matrix:
 * - MERCHANT/STORE/VENDOR + REFUND_CUSTOMER → full paid (capped); merchant pays fees + shipping
 * - MERCHANT/STORE/VENDOR + NO_CUSTOMER_REFUND → 0 customer refund; merchant still owes fees + shipping
 * - CUSTOMER + REFUND_CUSTOMER → paid − fees − shipping; customer bears fees/shipping
 * - CUSTOMER + NO_CUSTOMER_REFUND → 0 customer refund; 0 fees/shipping charges (claim dismissed)
 * - SHIPPING_COMPANY + REFUND_CUSTOMER → full paid; platform absorbs Stripe fees initially;
 *   shipping-company liability = RT shipping + (optional) Stripe/refund fees
 * - SHIPPING_COMPANY + NO_CUSTOMER_REFUND → 0 refund; liability = RT shipping + (optional) fees
 *   (includePlatformFeesInCarrierLiability defaults to true for SHIPPING_COMPANY)
 * - WARRANTY / WARRANTY_EXCHANGE → 0 customer refund; 0 platform fees; merchant pays round-trip shipping only
 * - CLOSE_COMPLETE_REFUND → forced REFUND_CUSTOMER; paid − fees; no shipping
 * - Stripe call only when REFUND_CUSTOMER and amount > 0
 */


export type AdjudicationFaultParty =
    | 'CUSTOMER'
    | 'MERCHANT'
    | 'STORE'
    | 'VENDOR'
    | 'SHIPPING_COMPANY'
    | 'WARRANTY'
    | 'WARRANTY_EXCHANGE'
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
    /**
     * When fault is SHIPPING_COMPANY: include gateway + refund fees in carrier liability.
     * Defaults to true (admin can turn off via verdict UI).
     */
    includePlatformFeesInCarrierLiability?: boolean;
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
    /** Fees portion inside shippingCompanyLiability (0 when toggle off). */
    shippingCompanyFeesInLiability: number;
    includePlatformFeesInCarrierLiability: boolean;
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

export function isWarrantyFault(fault: string): boolean {
    return ['WARRANTY', 'WARRANTY_EXCHANGE'].includes(fault);
}

function normalizeFinalRefundDecision(
    decision: FinalRefundDecision | string | undefined,
    fault: string,
): FinalRefundDecision {
    const normalized = String(decision || '').toUpperCase();
    if (isWarrantyFault(fault)) return 'NO_CUSTOMER_REFUND';
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

function resolveIncludeFeesOnCarrier(
    fault: string,
    explicit: boolean | undefined,
): boolean {
    if (fault !== 'SHIPPING_COMPANY') return false;
    // Default ON for carrier fault — admin can disable in the verdict UI.
    return explicit !== false;
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
    const includePlatformFeesInCarrierLiability = resolveIncludeFeesOnCarrier(
        fault,
        input.includePlatformFeesInCarrierLiability,
    );

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
    let shippingCompanyFeesInLiability = 0;

    const applyShippingCompanyLiability = () => {
        shippingCompanyFeesInLiability = includePlatformFeesInCarrierLiability
            ? roundMoney2(platformFeesTotal)
            : 0;
        shippingCompanyLiability = roundMoney2(
            shippingRoundtrip + shippingCompanyFeesInLiability,
        );
        shippingBearer = shippingCompanyLiability > 0 ? 'SHIPPING_COMPANY' : 'NONE';
        feeBearer = 'PLATFORM';
        platformRetainedAmount = 0;
    };

    if (!refundRequired) {
        if (fault === 'CUSTOMER') {
            // Claim dismissed / customer at fault without refund: zero all money movement
            feeBearer = 'CUSTOMER';
            shippingBearer = 'NONE';
            customerStripeRefund = 0;
            platformRetainedAmount = 0;
            merchantShippingDebit = 0;
            merchantPlatformFeesDebit = 0;
            shippingCompanyLiability = 0;
        } else if (isWarrantyFault(fault)) {
            // Warranty replacement: no cash refund, no platform fees — merchant pays RT shipping only.
            feeBearer = 'PLATFORM';
            shippingBearer = shippingRoundtrip > 0 ? 'MERCHANT' : 'NONE';
            customerStripeRefund = 0;
            platformRetainedAmount = 0;
            merchantShippingDebit = shippingBearer === 'MERCHANT' ? shippingRoundtrip : 0;
            merchantPlatformFeesDebit = 0;
            shippingCompanyLiability = 0;
        } else if (fault === 'SHIPPING_COMPANY') {
            applyShippingCompanyLiability();
            customerStripeRefund = 0;
        } else {
            feeBearer = isMerchantFault(fault) ? 'MERCHANT' : 'CUSTOMER';
            shippingBearer = isMerchantFault(fault)
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
            shippingCompanyLiability = 0;
            platformRetainedAmount =
                feeBearer === 'CUSTOMER' || feeBearer === 'MERCHANT' ? platformFeesTotal : 0;
            customerStripeRefund = 0;
        }
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
        applyShippingCompanyLiability();
        customerStripeRefund = orderPaidTotal;
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
        shippingCompanyFeesInLiability: roundMoney2(shippingCompanyFeesInLiability),
        includePlatformFeesInCarrierLiability,
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
