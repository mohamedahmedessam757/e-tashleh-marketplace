import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Truck } from 'lucide-react';
import { isAcceptedOfferStatus } from '../../../utils/offerStatusHelpers';
import { isOfferFulfillmentCancelled } from '../../../utils/offerFulfillmentHelpers';

interface PartialShippingProgressCardProps {
    order: {
        status?: string;
        requestType?: string;
        offers?: Array<{
            status?: string;
            shippedFromCart?: boolean;
            fulfillmentStatus?: string;
        }>;
    };
    isAr: boolean;
    className?: string;
}

const IN_TRANSIT = new Set(['SHIPPED']);
const DELIVERED = new Set(['DELIVERED', 'COMPLETED']);

export const PartialShippingProgressCard: React.FC<PartialShippingProgressCardProps> = ({
    order,
    isAr,
    className = '',
}) => {
    const stats = useMemo(() => {
        const accepted =
            order.offers?.filter((o) => isAcceptedOfferStatus(o.status)) || [];
        const fs = (o: { fulfillmentStatus?: string }) =>
            String(o.fulfillmentStatus || '').toUpperCase();

        const excluded = accepted.filter((o) => isOfferFulfillmentCancelled(o.fulfillmentStatus)).length;
        const active = accepted.filter((o) => !isOfferFulfillmentCancelled(o.fulfillmentStatus));
        const inTransit = active.filter((o) => IN_TRANSIT.has(fs(o))).length;
        const delivered = active.filter((o) => DELIVERED.has(fs(o))).length;
        const shipped = inTransit + delivered;
        const pending = active.filter((o) => !IN_TRANSIT.has(fs(o)) && !DELIVERED.has(fs(o)));
        const inCart = pending.length;
        const handoverPending = pending.filter((o) => fs(o) === 'VERIFICATION_SUCCESS').length;
        const readyInCart = pending.filter((o) => fs(o) === 'READY_FOR_SHIPPING').length;
        const total = active.length;
        const pct = total > 0 ? Math.round((shipped / total) * 100) : 0;
        return { total, shipped, inTransit, delivered, inCart, handoverPending, readyInCart, excluded, pct };
    }, [order.offers]);

    const isGrouped = String(order.requestType || '').toLowerCase() === 'multiple';
    const show =
        isGrouped &&
        stats.total > 0 &&
        (order.status === 'PARTIALLY_SHIPPED' ||
            (stats.shipped > 0 && (stats.inCart > 0 || stats.excluded > 0)));

    if (!show) return null;

    const allShipped = stats.inCart === 0;

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`bg-gradient-to-br from-blue-500/10 to-transparent border border-blue-500/20 rounded-2xl p-6 ${className}`}
        >
            <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
                        <Truck size={18} className="text-blue-400" />
                    </div>
                    <div>
                        <h4 className="text-white font-bold text-sm">
                            {isAr ? 'تقدم الشحن الجزئي' : 'Partial shipping progress'}
                        </h4>
                        <p className="text-white/40 text-[10px] uppercase tracking-wider">
                            {allShipped
                                ? isAr
                                    ? 'تم شحن جميع القطع النشطة في الطلب'
                                    : 'All active parts of this order have shipped'
                                : isAr
                                    ? 'يتم شحن طلبك على دفعات'
                                    : 'Your grouped order ships in batches'}
                        </p>
                    </div>
                </div>
                <span className="text-blue-400 font-bold text-lg">{stats.pct}%</span>
            </div>

            <div className="relative h-2 bg-white/5 rounded-full overflow-hidden">
                <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${stats.pct}%` }}
                    className="absolute inset-y-0 left-0 rtl:left-auto rtl:right-0 bg-gradient-to-r from-blue-600 to-blue-400 shadow-[0_0_10px_rgba(59,130,246,0.5)]"
                />
            </div>

            <div className="flex flex-wrap justify-between gap-2 mt-3">
                <span className="text-[10px] text-white/30 font-bold uppercase">
                    {stats.shipped}/{stats.total}{' '}
                    {isAr ? 'قطعة شُحنت' : 'shipped'}
                </span>
                {stats.delivered > 0 && (
                    <span className="text-[10px] text-emerald-400/80 font-bold uppercase">
                        {stats.delivered} {isAr ? 'تم توصيلها' : 'delivered'}
                    </span>
                )}
                {stats.inTransit > 0 && (
                    <span className="text-[10px] text-blue-300/80 font-bold uppercase">
                        {stats.inTransit} {isAr ? 'قيد الشحن' : 'in transit'}
                    </span>
                )}
                {stats.inCart > 0 && (
                    <span className="text-[10px] text-white/30 font-bold uppercase">
                        {stats.inCart} {isAr ? 'في السلة' : 'in cart'}
                    </span>
                )}
                {stats.readyInCart > 0 && (
                    <span className="text-[10px] text-green-400/80 font-bold uppercase">
                        {stats.readyInCart} {isAr ? 'جاهزة للاختيار' : 'ready to ship'}
                    </span>
                )}
                {stats.handoverPending > 0 && (
                    <span className="text-[10px] text-amber-400/80 font-bold uppercase">
                        {stats.handoverPending}{' '}
                        {isAr ? 'بانتظار تسليم التاجر' : 'awaiting merchant handover'}
                    </span>
                )}
                {stats.excluded > 0 && (
                    <span className="text-[10px] text-rose-400/80 font-bold uppercase">
                        {stats.excluded}{' '}
                        {isAr ? 'ملغاة / مستردة (خارج الحساب)' : 'cancelled / refunded (excluded)'}
                    </span>
                )}
            </div>
        </motion.div>
    );
};
