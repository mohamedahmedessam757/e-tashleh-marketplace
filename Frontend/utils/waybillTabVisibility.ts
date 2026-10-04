/** Order statuses where a waybill can already exist (single or multi-part). */
const WAYBILL_TAB_STATUSES = new Set([
    'PREPARED',
    'VERIFICATION',
    'VERIFICATION_SUCCESS',
    'READY_FOR_SHIPPING',
    'PARTIALLY_SHIPPED',
    'PARTIALLY_DELIVERED',
    'SHIPPED',
    'DELIVERED',
    'COMPLETED',
    'DISPUTED',
    'RETURNED',
    'RETURN_REQUESTED',
    'RETURN_APPROVED',
    'REFUNDED',
    'RESOLVED',
    'WARRANTY_ACTIVE',
    'WARRANTY_EXPIRED',
    'NON_MATCHING',
    'CORRECTION_PERIOD',
    'CORRECTION_SUBMITTED',
]);

export function shouldShowWaybillTab(order?: {
    status?: string | null;
    shippingWaybills?: unknown[] | null;
} | null): boolean {
    if (!order) return false;
    if ((order.shippingWaybills?.length ?? 0) > 0) return true;
    return WAYBILL_TAB_STATUSES.has(String(order.status || '').toUpperCase());
}
