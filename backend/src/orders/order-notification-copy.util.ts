/**
 * Single vs multi-item WhatsApp / in-app notification copy.
 * Meta templates stay shared; only status_detail (messageAr/En) branches here.
 */

export type OrderCopyContext = {
    isMulti: boolean;
    orderNumber: string;
    partName?: string;
};

export type BilingualMessage = {
    messageAr: string;
    messageEn: string;
};

export type BilingualTitleMessage = BilingualMessage & {
    titleAr: string;
    titleEn: string;
};

/** Same rule as OfferFulfillmentService.isMultiItemOrder — keep one source of truth. */
export function isMultiItemOrder(order: {
    requestType?: string | null;
    parts?: unknown[] | null;
}): boolean {
    return (
        String(order.requestType || '').toLowerCase() === 'multiple' ||
        (order.parts?.length ?? 0) > 1
    );
}

export function offersAcceptedForPayment(ctx: OrderCopyContext): BilingualTitleMessage {
    const { isMulti, orderNumber } = ctx;
    if (isMulti) {
        return {
            titleAr: 'تم قبول عرض — بانتظار الدفع',
            titleEn: 'Offer accepted — awaiting payment',
            messageAr: `تم قبول عروض جميع القطع في الطلب #${orderNumber}. يمكنك المتابعة للدفع.`,
            messageEn: `All selectable parts for Order #${orderNumber} have accepted offers. You can proceed to payment.`,
        };
    }
    return {
        titleAr: 'تم قبول عرض — بانتظار الدفع',
        titleEn: 'Offer accepted — awaiting payment',
        messageAr: `تم قبول العرض في الطلب #${orderNumber}. يمكنك المتابعة للدفع.`,
        messageEn: `The offer for Order #${orderNumber} was accepted. You can proceed to payment.`,
    };
}

export function offerAcceptedPartial(ctx: OrderCopyContext): BilingualTitleMessage {
    const { isMulti, orderNumber } = ctx;
    if (isMulti) {
        return {
            titleAr: 'تم قبول عرض للقطعة — أكمل اختيار باقي القطع',
            titleEn: 'Part offer accepted — finish selecting remaining parts',
            messageAr: `تم قبول عرض لقطعة في الطلب #${orderNumber}. أكمل اختيار عروض باقي القطع قبل المتابعة للدفع.`,
            messageEn: `An offer was accepted for a part in Order #${orderNumber}. Finish selecting offers for the remaining parts before checkout.`,
        };
    }
    return {
        titleAr: 'تم قبول عرض — أكمل الخطوات',
        titleEn: 'Offer accepted — continue',
        messageAr: `تم قبول عرض في الطلب #${orderNumber}. أكمل الخطوات المتبقية قبل المتابعة للدفع.`,
        messageEn: `An offer was accepted for Order #${orderNumber}. Complete the remaining steps before checkout.`,
    };
}

export function preparationStarted(ctx: OrderCopyContext): BilingualMessage {
    if (ctx.isMulti) {
        return {
            messageAr: 'بدأ تجهيز قطع طلبك الآن.',
            messageEn: 'Your parts are now being prepared.',
        };
    }
    return {
        messageAr: 'بدأ تجهيز طلبك الآن.',
        messageEn: 'Your order is now being prepared.',
    };
}

export function partsPreparedAggregate(ctx: OrderCopyContext): BilingualMessage {
    if (ctx.isMulti) {
        return {
            messageAr: 'تم تجهيز القطع وهي جاهزة لمرحلة التوثيق/الشحن.',
            messageEn: 'Parts are prepared and ready for verification/shipping.',
        };
    }
    return {
        messageAr: 'تم تجهيز القطعة وهي جاهزة لمرحلة التوثيق/الشحن.',
        messageEn: 'The part is prepared and ready for verification/shipping.',
    };
}

export function partiallyShipped(ctx: OrderCopyContext): BilingualMessage {
    return {
        messageAr: 'تم شحن جزء من قطع طلبك.',
        messageEn: 'Some parts of your order have shipped.',
    };
}

export function partiallyDelivered(ctx: OrderCopyContext): BilingualMessage {
    return {
        messageAr: 'تم تسليم جزء من قطع طلبك.',
        messageEn: 'Some parts of your order were delivered.',
    };
}

export function partPrepared(ctx: OrderCopyContext): BilingualMessage {
    const partName = ctx.partName || 'القطعة';
    const { orderNumber, isMulti } = ctx;
    if (isMulti) {
        return {
            messageAr: `أنهى التاجر تجهيز «${partName}» في الطلب #${orderNumber}. باقي القطع قيد المتابعة.`,
            messageEn: `Merchant finished preparing "${partName}" for order #${orderNumber}. Other parts may still be in progress.`,
        };
    }
    return {
        messageAr: `أنهى التاجر تجهيز «${partName}» في الطلب #${orderNumber}.`,
        messageEn: `Merchant finished preparing "${partName}" for order #${orderNumber}.`,
    };
}

export function allPartsPrepared(ctx: OrderCopyContext): BilingualTitleMessage {
    const { orderNumber, isMulti } = ctx;
    if (isMulti) {
        return {
            titleAr: 'جميع القطع جاهزة للتوثيق',
            titleEn: 'All parts prepared',
            messageAr: `تم تجهيز جميع قطع الطلب #${orderNumber}. سيبدأ التوثيق قريباً.`,
            messageEn: `All parts for order #${orderNumber} are prepared.`,
        };
    }
    return {
        titleAr: 'القطعة جاهزة للتوثيق',
        titleEn: 'Part prepared',
        messageAr: `تم تجهيز القطعة في الطلب #${orderNumber}. سيبدأ التوثيق قريباً.`,
        messageEn: `The part for order #${orderNumber} is prepared. Verification will begin soon.`,
    };
}

export function partReadyForShipping(ctx: OrderCopyContext): BilingualMessage {
    const partName = ctx.partName || 'القطعة';
    if (ctx.isMulti) {
        return {
            messageAr: `«${partName}» جاهزة — يمكنك اختيارها من سلة الشحن عند الجاهزية.`,
            messageEn: `"${partName}" is ready — select it in the shipping cart when available.`,
        };
    }
    return {
        messageAr: `«${partName}» جاهزة للشحن.`,
        messageEn: `"${partName}" is ready for shipping.`,
    };
}

export function allReadyForShipping(ctx: OrderCopyContext): BilingualTitleMessage {
    const { orderNumber, isMulti } = ctx;
    if (isMulti) {
        return {
            titleAr: 'كل القطع جاهزة للشحن',
            titleEn: 'All parts ready to ship',
            messageAr: `جميع قطع الطلب #${orderNumber} جاهزة في سلة الشحن.`,
            messageEn: `All parts for order #${orderNumber} are ready in your shipping cart.`,
        };
    }
    return {
        titleAr: 'طلبك جاهز للشحن',
        titleEn: 'Order ready to ship',
        messageAr: `طلبك #${orderNumber} جاهز للشحن.`,
        messageEn: `Your order #${orderNumber} is ready for shipping.`,
    };
}

export function paymentConfirmedPrepare(ctx: OrderCopyContext): BilingualMessage {
    const { orderNumber, isMulti } = ctx;
    if (isMulti) {
        return {
            messageAr: `تم دفع قيمة الطلب #${orderNumber}. يرجى البدء في تجهيز القطع للشحن.`,
            messageEn: `Payment for Order #${orderNumber} confirmed. Please start preparing parts for shipment.`,
        };
    }
    return {
        messageAr: `تم دفع قيمة الطلب #${orderNumber}. يرجى البدء في تجهيز القطعة للشحن.`,
        messageEn: `Payment for Order #${orderNumber} confirmed. Please start preparing the part for shipment.`,
    };
}

/** Customer deep-link for ready-to-ship notifications. */
export function readyForShippingCustomerLink(isMulti: boolean, orderId: string): string {
    return isMulti ? `/dashboard/shipping-cart` : `/dashboard/orders/${orderId}`;
}

/**
 * Aggregate order-status copy that differs for single vs multi.
 * Returns null when the status uses a shared (non-branching) string elsewhere.
 */
export function aggregateStatusBranch(
    ctx: OrderCopyContext,
    status: string,
): BilingualMessage | null {
    switch (status) {
        case 'PREPARATION':
            return preparationStarted(ctx);
        case 'PREPARED':
            return partsPreparedAggregate(ctx);
        case 'PARTIALLY_SHIPPED':
            return partiallyShipped(ctx);
        case 'PARTIALLY_DELIVERED':
            return partiallyDelivered(ctx);
        default:
            return null;
    }
}
