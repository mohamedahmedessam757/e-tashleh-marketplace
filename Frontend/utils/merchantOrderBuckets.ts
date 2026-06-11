import type { Order } from '../stores/useOrderStore';

/** Open marketplace orders a merchant can still engage with */
export const MERCHANT_MARKETPLACE_OPEN_STATUSES = [
    'AWAITING_OFFERS',
    'COLLECTING_OFFERS',
    'AWAITING_SELECTION',
] as const;

/** Bidding / payment negotiation phase */
export const MERCHANT_NEGOTIATING_STATUSES = [
    'COLLECTING_OFFERS',
    'AWAITING_OFFERS',
    'AWAITING_SELECTION',
    'AWAITING_PAYMENT',
    'PARTIALLY_PAID',
] as const;

/** Active fulfillment & resolution */
export const MERCHANT_IN_PROGRESS_STATUSES = [
    'PREPARATION',
    'PREPARED',
    'VERIFICATION',
    'VERIFICATION_SUCCESS',
    'READY_FOR_SHIPPING',
    'NON_MATCHING',
    'CORRECTION_PERIOD',
    'CORRECTION_SUBMITTED',
    'DELAYED_PREPARATION',
    'PARTIALLY_SHIPPED',
    'SHIPPED',
    'DISPUTED',
    'RETURN_REQUESTED',
    'RETURN_APPROVED',
] as const;

/** Finished / closed outcomes */
export const MERCHANT_COMPLETED_STATUSES = [
    'COMPLETED',
    'DELIVERED',
    'RETURNED',
    'WARRANTY_ACTIVE',
    'WARRANTY_EXPIRED',
    'RESOLVED',
    'REFUNDED',
    'CLOSED',
] as const;

/** Statuses that should not appear in "recent active" sidebar */
export const MERCHANT_TERMINAL_STATUSES = [
    'DELIVERED',
    'COMPLETED',
    'CANCELLED',
    'RETURNED',
    'REFUNDED',
    'CLOSED',
    'WARRANTY_EXPIRED',
] as const;

/** Priority order for live tracking card */
export const MERCHANT_LIVE_TRACKING_STATUSES = [
    'PREPARED',
    'VERIFICATION',
    'NON_MATCHING',
    'CORRECTION_PERIOD',
    'PREPARATION',
    'DELAYED_PREPARATION',
    'AWAITING_PAYMENT',
    'READY_FOR_SHIPPING',
    'PARTIALLY_SHIPPED',
    'SHIPPED',
    'AWAITING_SELECTION',
    'COLLECTING_OFFERS',
    'AWAITING_OFFERS',
] as const;

export const isMerchantMarketplaceOpen = (status: string) =>
    (MERCHANT_MARKETPLACE_OPEN_STATUSES as readonly string[]).includes(status);

export const isMerchantNegotiating = (status: string) =>
    (MERCHANT_NEGOTIATING_STATUSES as readonly string[]).includes(status);

export const isMerchantInProgress = (status: string) =>
    (MERCHANT_IN_PROGRESS_STATUSES as readonly string[]).includes(status);

export const isMerchantCompleted = (status: string) =>
    (MERCHANT_COMPLETED_STATUSES as readonly string[]).includes(status);

export const belongsToMerchantStore = (order: Order, storeId: string | null | undefined): boolean => {
    if (!storeId) return false;

    if (order.merchantId && String(order.merchantId) === String(storeId)) return true;
    if (order.acceptedOffer && String(order.acceptedOffer.storeId) === String(storeId)) return true;

    const merchantOffers = order.offers?.filter((off) => String(off.storeId) === String(storeId)) || [];
    return merchantOffers.length > 0 && merchantOffers.some((off) => off.status?.toLowerCase() !== 'rejected');
};

export const getMerchantOrderProgress = (status: string): number => {
    switch (status) {
        case 'AWAITING_OFFERS': return 10;
        case 'COLLECTING_OFFERS': return 20;
        case 'AWAITING_SELECTION': return 30;
        case 'AWAITING_PAYMENT': return 40;
        case 'PARTIALLY_PAID': return 45;
        case 'PREPARATION': return 50;
        case 'DELAYED_PREPARATION': return 55;
        case 'PREPARED': return 60;
        case 'VERIFICATION': return 70;
        case 'NON_MATCHING': return 72;
        case 'CORRECTION_PERIOD': return 74;
        case 'CORRECTION_SUBMITTED': return 76;
        case 'VERIFICATION_SUCCESS': return 80;
        case 'READY_FOR_SHIPPING': return 85;
        case 'PARTIALLY_SHIPPED': return 88;
        case 'SHIPPED': return 90;
        case 'DELIVERED': return 95;
        case 'WARRANTY_ACTIVE': return 98;
        case 'COMPLETED': return 100;
        case 'RETURN_REQUESTED':
        case 'RETURN_APPROVED':
        case 'DISPUTED': return 75;
        case 'RETURNED':
        case 'REFUNDED':
        case 'RESOLVED':
        case 'CLOSED':
        case 'WARRANTY_EXPIRED': return 100;
        case 'CANCELLED': return 0;
        default: return 5;
    }
};

export const getMerchantStatusLabel = (status: string, isAr: boolean): string => {
    const labels: Record<string, { ar: string; en: string }> = {
        AWAITING_OFFERS: { ar: 'في انتظار العروض', en: 'Awaiting Offers' },
        COLLECTING_OFFERS: { ar: 'جمع العروض', en: 'Collecting Offers' },
        AWAITING_SELECTION: { ar: 'اختيار العرض', en: 'Awaiting Selection' },
        AWAITING_PAYMENT: { ar: 'في انتظار الدفع', en: 'Awaiting Payment' },
        PARTIALLY_PAID: { ar: 'مدفوع جزئياً', en: 'Partially Paid' },
        PREPARATION: { ar: 'قيد التجهيز', en: 'In Preparation' },
        DELAYED_PREPARATION: { ar: 'تأخير في التجهيز', en: 'Delayed Preparation' },
        PREPARED: { ar: 'تم التجهيز', en: 'Prepared' },
        VERIFICATION: { ar: 'قيد التوثيق', en: 'Verification' },
        VERIFICATION_SUCCESS: { ar: 'تم التوثيق', en: 'Verified' },
        READY_FOR_SHIPPING: { ar: 'جاهز للشحن', en: 'Ready for Shipping' },
        PARTIALLY_SHIPPED: { ar: 'شحن جزئي', en: 'Partially Shipped' },
        SHIPPED: { ar: 'تم الشحن', en: 'Shipped' },
        DELIVERED: { ar: 'تم التسليم', en: 'Delivered' },
        COMPLETED: { ar: 'مكتمل', en: 'Completed' },
        WARRANTY_ACTIVE: { ar: 'الضمان نشط', en: 'Warranty Active' },
        WARRANTY_EXPIRED: { ar: 'انتهى الضمان', en: 'Warranty Expired' },
        DISPUTED: { ar: 'نزاع', en: 'Disputed' },
        RETURN_REQUESTED: { ar: 'طلب إرجاع', en: 'Return Requested' },
        RETURN_APPROVED: { ar: 'إرجاع مقبول', en: 'Return Approved' },
        RETURNED: { ar: 'مرتجع', en: 'Returned' },
        REFUNDED: { ar: 'مسترد', en: 'Refunded' },
        RESOLVED: { ar: 'تم الحل', en: 'Resolved' },
        CLOSED: { ar: 'مغلق', en: 'Closed' },
        CANCELLED: { ar: 'ملغي', en: 'Cancelled' },
        NON_MATCHING: { ar: 'غير مطابق', en: 'Non-Matching' },
        CORRECTION_PERIOD: { ar: 'فترة تصحيح', en: 'Correction Period' },
        CORRECTION_SUBMITTED: { ar: 'تم التصحيح', en: 'Correction Submitted' },
    };

    const label = labels[status];
    return label ? (isAr ? label.ar : label.en) : status;
};
