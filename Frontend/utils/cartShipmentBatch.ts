export type CartBatchType = 'solo' | 'group' | null;

export type CartShippingBadgeKind =
    | 'order_grouped'
    | 'in_cart'
    | 'handover_pending'
    | 'ready_in_cart'
    | 'batch_solo'
    | 'batch_group';

export interface CartBatchOfferLike {
    shippedFromCart?: boolean;
    cartShipmentId?: string | null;
    fulfillmentStatus?: string;
    cartBatchType?: CartBatchType;
    cartBatchSize?: number | null;
}

export function computeCartBatchMeta(
    offer: CartBatchOfferLike,
    allOffers: CartBatchOfferLike[],
): { cartBatchType: CartBatchType; cartBatchSize: number } {
    if (offer.cartBatchType != null && offer.cartBatchSize != null) {
        return {
            cartBatchType: offer.cartBatchType,
            cartBatchSize: offer.cartBatchSize,
        };
    }
    if (!offer.shippedFromCart || !offer.cartShipmentId) {
        return { cartBatchType: null, cartBatchSize: 0 };
    }
    const size = allOffers.filter((o) => o.cartShipmentId === offer.cartShipmentId).length;
    return {
        cartBatchType: size > 1 ? 'group' : 'solo',
        cartBatchSize: size,
    };
}

export function resolveCartShippingBadgeKind(
    offer: CartBatchOfferLike,
    order: { requestType?: string; shippingType?: string },
    options?: { inAssemblyCart?: boolean },
    allOffers: CartBatchOfferLike[] = [],
): CartShippingBadgeKind | null {
    const grouped =
        String(order.requestType || '').toLowerCase() === 'multiple' &&
        String(order.shippingType || '').toLowerCase() === 'combined';

    if (!grouped) return null;

    if (offer.shippedFromCart && offer.cartShipmentId) {
        const { cartBatchType } = computeCartBatchMeta(
            offer,
            allOffers.length ? allOffers : [offer],
        );
        if (cartBatchType === 'group') {
            return 'batch_group';
        }
        return 'batch_solo';
    }

    if (options?.inAssemblyCart) {
        if (offer.fulfillmentStatus === 'READY_FOR_SHIPPING') {
            return 'ready_in_cart';
        }
        if (offer.fulfillmentStatus === 'VERIFICATION_SUCCESS') {
            return 'handover_pending';
        }
        return 'in_cart';
    }

    if (!offer.shippedFromCart && offer.fulfillmentStatus === 'VERIFICATION_SUCCESS') {
        return 'handover_pending';
    }

    return 'order_grouped';
}

export function getCartBadgeLabels(
    kind: CartShippingBadgeKind,
    isAr: boolean,
    batchSize?: number,
): { label: string; className: string } {
    const labels: Record<CartShippingBadgeKind, { ar: string; en: string; className: string }> = {
        order_grouped: {
            ar: 'طلب مجمع',
            en: 'Grouped order',
            className: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30',
        },
        in_cart: {
            ar: 'في سلة التجميع',
            en: 'In assembly cart',
            className: 'bg-white/10 text-white/60 border-white/20',
        },
        handover_pending: {
            ar: 'بانتظار تسليم التاجر',
            en: 'Awaiting merchant handover',
            className: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
        },
        ready_in_cart: {
            ar: 'جاهزة للاختيار',
            en: 'Ready to select',
            className: 'bg-green-500/15 text-green-300 border-green-500/30',
        },
        batch_solo: {
            ar: 'شحنة منفردة (طلب مجمع)',
            en: 'Solo batch (grouped order)',
            className: 'bg-teal-500/15 text-teal-300 border-teal-500/30',
        },
        batch_group: {
            ar: `شحنة مجمعة — ${batchSize ?? ''} قطع`,
            en: `Grouped batch — ${batchSize ?? ''} parts`,
            className: 'bg-blue-500/15 text-blue-300 border-blue-500/30',
        },
    };
    const entry = labels[kind];
    return {
        label: isAr ? entry.ar : entry.en,
        className: entry.className,
    };
}
