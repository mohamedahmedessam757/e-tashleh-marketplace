const CUSTOMER_CANCEL_STATUSES = new Set(['COLLECTING_OFFERS', 'AWAITING_OFFERS']);

export function canCustomerCancelOrder(status: string): boolean {
    return CUSTOMER_CANCEL_STATUSES.has(status);
}
