/**
 * Client-side mirror of backend adjudication-financial.util.ts (keep in sync).
 */

export type AdjudicationFaultParty =
    | 'CUSTOMER'
    | 'MERCHANT'
    | 'SHIPPING_COMPANY'
    | 'CLOSE_COMPLETE_REFUND'
    | string;
export type FinalRefundDecision = 'REFUND_CUSTOMER' | 'NO_CUSTOMER_REFUND';

export interface AdjudicationPreviewInput {
    orderPaidTotal: number;
    gatewayFeePct: number;
    refundFeePct: number;
    shippingRoundtrip: number;
    faultParty: AdjudicationFaultParty;
    finalRefundDecision?: FinalRefundDecision;
    maxRefundable?: number | null;
}

export interface AdjudicationPreviewResult {
    gatewayFee: number;
    refundFee: number;
    platformFees: number;
    net: number;
    retained: number;
    stripeExecutable: number;
    stripeCapped: boolean;
    feeBearer: string;
    shippingBearer: string;
    customerFullRefund: boolean;
    merchantDebits: { shipping: number; platformFees: number };
    shippingCompanyLiability: number;
    showFeesOnCustomerNet: boolean;
    showShippingOnCustomerNet: boolean;
    finalRefundDecision: FinalRefundDecision;
    finalCustomerRefundAmount: number;
    refundRequired: boolean;
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
        return normalized as FinalRefundDecision;
    }
    return fault === 'CLOSE_COMPLETE_REFUND' ? 'REFUND_CUSTOMER' : 'NO_CUSTOMER_REFUND';
}

export function computeAdjudicationPreview(
    input: AdjudicationPreviewInput,
): AdjudicationPreviewResult {
    const orderPaidTotal = Math.max(0, Number(input.orderPaidTotal) || 0);
    const gatewayFeePct = Number(input.gatewayFeePct ?? 3);
    const refundFeePct = Number(input.refundFeePct ?? 1.5);
    const shippingRoundtrip = Math.max(0, Number(input.shippingRoundtrip) || 0);
    const fault = normalizeFault(input.faultParty);
    const isCloseComplete = fault === 'CLOSE_COMPLETE_REFUND';
    const finalRefundDecision = normalizeFinalRefundDecision(input.finalRefundDecision, fault);
    const refundRequired = finalRefundDecision === 'REFUND_CUSTOMER';

    const gatewayFee = (orderPaidTotal * gatewayFeePct) / 100;
    const refundFee = (orderPaidTotal * refundFeePct) / 100;
    const platformFees = gatewayFee + refundFee;

    let feeBearer = 'CUSTOMER';
    let shippingBearer = 'NONE';
    let net = 0;
    let retained = 0;
    let merchantDebits = { shipping: 0, platformFees: 0 };
    let shippingCompanyLiability = 0;
    let customerFullRefund = false;
    let showFeesOnCustomerNet = true;
    let showShippingOnCustomerNet = false;

    if (!refundRequired) {
        if (fault === 'CUSTOMER') {
            feeBearer = 'CUSTOMER';
            shippingBearer = 'NONE';
            retained = 0;
            net = 0;
            merchantDebits = { shipping: 0, platformFees: 0 };
            shippingCompanyLiability = 0;
            showFeesOnCustomerNet = false;
            showShippingOnCustomerNet = false;
        } else {
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
            retained = feeBearer === 'CUSTOMER' || feeBearer === 'MERCHANT' ? platformFees : 0;
            merchantDebits = {
                shipping: shippingBearer === 'MERCHANT' ? shippingRoundtrip : 0,
                platformFees: feeBearer === 'MERCHANT' ? platformFees : 0,
            };
            shippingCompanyLiability =
                shippingBearer === 'SHIPPING_COMPANY' ? shippingRoundtrip : 0;
            net = 0;
            showFeesOnCustomerNet = false;
            showShippingOnCustomerNet = false;
        }
    } else if (isCloseComplete) {
        feeBearer = 'MIXED_CLOSE';
        retained = platformFees;
        net = Math.max(0, orderPaidTotal - platformFees);
        showFeesOnCustomerNet = true;
    } else if (isMerchantFault(fault)) {
        feeBearer = 'MERCHANT';
        shippingBearer = shippingRoundtrip > 0 ? 'MERCHANT' : 'NONE';
        net = orderPaidTotal;
        customerFullRefund = true;
        merchantDebits = { shipping: shippingRoundtrip, platformFees: platformFees };
        retained = platformFees;
        showFeesOnCustomerNet = false;
    } else if (fault === 'SHIPPING_COMPANY') {
        feeBearer = 'PLATFORM';
        shippingBearer = shippingRoundtrip > 0 ? 'SHIPPING_COMPANY' : 'NONE';
        net = orderPaidTotal;
        customerFullRefund = true;
        shippingCompanyLiability = shippingRoundtrip;
        showFeesOnCustomerNet = false;
    } else {
        feeBearer = 'CUSTOMER';
        shippingBearer = shippingRoundtrip > 0 ? 'CUSTOMER' : 'NONE';
        retained = platformFees;
        net = Math.max(0, orderPaidTotal - platformFees - shippingRoundtrip);
        showShippingOnCustomerNet = shippingRoundtrip > 0;
    }

    const maxStripe =
        input.maxRefundable != null && input.maxRefundable >= 0
            ? input.maxRefundable
            : null;
    const stripeExecutable = maxStripe != null ? Math.min(net, maxStripe) : net;
    const stripeCapped = maxStripe != null && net > maxStripe + 0.01;

    return {
        gatewayFee,
        refundFee,
        platformFees,
        net,
        retained,
        stripeExecutable,
        stripeCapped,
        feeBearer,
        shippingBearer,
        customerFullRefund,
        merchantDebits,
        shippingCompanyLiability,
        showFeesOnCustomerNet,
        showShippingOnCustomerNet,
        finalRefundDecision,
        finalCustomerRefundAmount: stripeExecutable,
        refundRequired,
    };
}
