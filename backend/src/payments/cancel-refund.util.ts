/**
 * Cancel-before-shipping gateway fee helpers.
 * Fee amount MUST come from live Stripe settings:
 * (paidTotal × gatewayFeePercent/100) + gatewayFeeFixedAed
 * via FinancialConfigService / computeStripeGatewayFee — never a hardcoded %.
 */

export function roundMoney2(amount: number): number {
    return Math.round((Number(amount) + Number.EPSILON) * 100) / 100;
}

/**
 * Net refund after deducting an absolute cancel-before-shipping gateway fee.
 * Pass feeAmount=0 for merchant-fault full customer refund (fee charged to store separately).
 */
export function computeCancelBeforeShippingRefund(
    paidTotal: number,
    feeAmountInput: number = 0,
    alreadyRefunded: number = 0,
): {
    feeAmount: number;
    refundAmount: number;
    paidTotal: number;
    alreadyRefunded: number;
    targetNetRefund: number;
} {
    const paid = Math.max(0, roundMoney2(paidTotal));
    const prior = Math.max(0, roundMoney2(alreadyRefunded));
    const feeAmount = roundMoney2(
        Math.min(Math.max(0, Number(feeAmountInput) || 0), paid),
    );
    const targetNetRefund = roundMoney2(Math.max(0, paid - feeAmount));
    const remainingCap = roundMoney2(Math.max(0, paid - prior));
    const refundAmount = roundMoney2(
        Math.max(0, Math.min(remainingCap, targetNetRefund - prior)),
    );

    return {
        feeAmount,
        refundAmount,
        paidTotal: paid,
        alreadyRefunded: prior,
        targetNetRefund,
    };
}

/**
 * Merchant bears unrecovered gateway fee when cancel is caused by merchant SLA /
 * non-match faults (prep delay, correction timeout, repeated non-match).
 * Explicit metadata.merchantFault wins when set.
 */
export function isMerchantFaultPreShipCancel(input: {
    previousStatus?: string | null;
    reason?: string | null;
    merchantFault?: boolean | null;
}): boolean {
    if (input.merchantFault === true) return true;
    if (input.merchantFault === false) return false;

    const status = String(input.previousStatus || '').toUpperCase();
    if (
        status === 'DELAYED_PREPARATION' ||
        status === 'CORRECTION_PERIOD' ||
        status === 'NON_MATCHING' ||
        status === 'CORRECTION_SUBMITTED'
    ) {
        return true;
    }

    const reason = String(input.reason || '');
    return /non-matching|verification rejection|correction (limit|window|deadline)|abandoned by merchant|without preparation|late preparation|preparation SLA|prep deadline|prep expiry|exceeded extra grace/i.test(
        reason,
    );
}

/** Order statuses where auto cancel-refund is forbidden (post first actual ship). */
export const POST_SHIP_CANCEL_REFUND_BLOCKED = new Set([
    'SHIPPED',
    'PARTIALLY_SHIPPED',
    'DELIVERED',
    'PARTIALLY_DELIVERED',
    'COMPLETED',
    'WARRANTY_ACTIVE',
    'WARRANTY_EXPIRED',
]);

export function isPostShipCancelRefundBlocked(status?: string | null): boolean {
    return POST_SHIP_CANCEL_REFUND_BLOCKED.has(String(status || '').toUpperCase());
}
