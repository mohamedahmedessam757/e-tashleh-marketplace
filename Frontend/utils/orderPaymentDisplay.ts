export type OrderPaymentDisplay = 'unpaid' | 'partial' | 'paid' | 'cancelled';

const UNPAID_STATUSES = new Set([
    'AWAITING_OFFERS',
    'COLLECTING_OFFERS',
    'AWAITING_SELECTION',
    'AWAITING_PAYMENT',
]);

export function getOrderPaymentDisplay(status: string): OrderPaymentDisplay {
    if (status === 'CANCELLED') return 'cancelled';
    if (status === 'PARTIALLY_PAID') return 'partial';
    if (UNPAID_STATUSES.has(status)) return 'unpaid';
    return 'paid';
}

export function getOrderPaymentDisplayClasses(display: OrderPaymentDisplay): {
    dot: string;
    text: string;
} {
    switch (display) {
        case 'partial':
            return { dot: 'bg-amber-500 animate-pulse', text: 'text-amber-400' };
        case 'paid':
            return { dot: 'bg-green-500', text: 'text-green-400' };
        case 'unpaid':
        case 'cancelled':
        default:
            return { dot: 'bg-red-500 animate-pulse', text: 'text-red-400' };
    }
}
