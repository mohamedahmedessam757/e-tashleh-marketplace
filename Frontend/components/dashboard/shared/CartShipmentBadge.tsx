import React from 'react';
import {
    computeCartBatchMeta,
    getCartBadgeLabels,
    resolveCartShippingBadgeKind,
    type CartBatchOfferLike,
    type CartShippingBadgeKind,
} from '../../../utils/cartShipmentBatch';

interface CartShipmentBadgeProps {
    offer: CartBatchOfferLike;
    order?: { requestType?: string; shippingType?: string };
    allOffers?: CartBatchOfferLike[];
    inAssemblyCart?: boolean;
    isAr: boolean;
    className?: string;
    /** Show grouped-order umbrella badge alongside specific state */
    showGroupedOrder?: boolean;
}

export const CartShipmentBadge: React.FC<CartShipmentBadgeProps> = ({
    offer,
    order = {},
    allOffers = [],
    inAssemblyCart = false,
    isAr,
    className = '',
    showGroupedOrder = false,
}) => {
    const kind = resolveCartShippingBadgeKind(offer, order, { inAssemblyCart }, allOffers);
    if (!kind && !showGroupedOrder) return null;

    const badges: CartShippingBadgeKind[] = [];
    if (showGroupedOrder && String(order.requestType || '').toLowerCase() === 'multiple') {
        badges.push('order_grouped');
    }
    if (kind && !badges.includes(kind)) {
        badges.push(kind);
    }

    if (badges.length === 0) return null;

    const batchSize =
        offer.cartBatchSize ??
        (offer.cartShipmentId
            ? computeCartBatchMeta(offer, allOffers.length ? allOffers : [offer]).cartBatchSize
            : undefined);

    return (
        <div className={`flex flex-wrap gap-1.5 ${className}`}>
            {badges.map((b) => {
                const { label, className: badgeClass } = getCartBadgeLabels(
                    b,
                    isAr,
                    b === 'batch_group' ? batchSize : undefined,
                );
                return (
                    <span
                        key={b}
                        className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold border ${badgeClass}`}
                    >
                        {label}
                    </span>
                );
            })}
        </div>
    );
};
