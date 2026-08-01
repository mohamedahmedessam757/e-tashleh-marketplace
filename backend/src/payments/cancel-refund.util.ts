/** Cancel-before-shipping fee SSOT (customer terms: 2% payment gateway fee). */
export const CANCEL_BEFORE_SHIPPING_FEE_PCT = 2;

export function roundMoney2(amount: number): number {
    return Math.round((Number(amount) + Number.EPSILON) * 100) / 100;
}

/**
 * Net refund after deducting cancel-before-shipping gateway fee.
 * Fee is computed on the original paid total; remaining to refund accounts for prior refunds.
 */
export function computeCancelBeforeShippingRefund(
    paidTotal: number,
    feePct: number = CANCEL_BEFORE_SHIPPING_FEE_PCT,
    alreadyRefunded: number = 0,
): {
    feeAmount: number;
    refundAmount: number;
    feePct: number;
    paidTotal: number;
    alreadyRefunded: number;
    targetNetRefund: number;
} {
    const paid = Math.max(0, roundMoney2(paidTotal));
    const prior = Math.max(0, roundMoney2(alreadyRefunded));
    const feeAmount = roundMoney2((paid * feePct) / 100);
    const targetNetRefund = roundMoney2(Math.max(0, paid - feeAmount));
    const remainingCap = roundMoney2(Math.max(0, paid - prior));
    const refundAmount = roundMoney2(
        Math.max(0, Math.min(remainingCap, targetNetRefund - prior)),
    );

    return {
        feeAmount,
        refundAmount,
        feePct,
        paidTotal: paid,
        alreadyRefunded: prior,
        targetNetRefund,
    };
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
