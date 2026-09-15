/** Customer WhatsApp copy for merchant-fault pre-ship cancels (Widers template). */

export const MERCHANT_FAULT_CANCEL_REASON_AR = {
    LATE_PREP: 'عدم قيام المتجر بتجهيز القطعة خلال المدة المحددة.',
    NON_MATCH:
        'تم رفض القطعة من قبلنا لعدم مطابقتها لطلبك ولشروط ومعايير المنصة.',
} as const;

export type MerchantFaultCancelKind = keyof typeof MERCHANT_FAULT_CANCEL_REASON_AR;

export function merchantFaultCancelReasonAr(
    kind: MerchantFaultCancelKind,
): string {
    return MERCHANT_FAULT_CANCEL_REASON_AR[kind];
}

/** Prefer explicit part name; fall back to joined names or a safe label. */
export function resolveCancelPartLabel(input: {
    partName?: string | null;
    partNames?: Array<string | null | undefined>;
}): string {
    const explicit = String(input.partName || '').trim();
    if (explicit) return explicit.slice(0, 80);
    const joined = (input.partNames || [])
        .map((n) => String(n || '').trim())
        .filter(Boolean);
    if (joined.length === 1) return joined[0].slice(0, 80);
    if (joined.length > 1) return joined.slice(0, 3).join('، ').slice(0, 80);
    return 'القطعة';
}
