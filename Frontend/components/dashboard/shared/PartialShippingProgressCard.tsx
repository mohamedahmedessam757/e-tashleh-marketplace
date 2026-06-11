import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Truck } from 'lucide-react';
import { isAcceptedOfferStatus } from '../../../utils/offerStatusHelpers';

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

export const PartialShippingProgressCard: React.FC<PartialShippingProgressCardProps> = ({
    order,
    isAr,
    className = '',
}) => {
    const stats = useMemo(() => {
        const accepted =
            order.offers?.filter((o) => isAcceptedOfferStatus(o.status)) || [];
        const total = accepted.length || 1;
        const shipped = accepted.filter((o) => o.shippedFromCart).length;
        const inCart = accepted.filter((o) => !o.shippedFromCart).length;
        const handoverPending = accepted.filter(
            (o) =>
                !o.shippedFromCart &&
                String(o.fulfillmentStatus || '').toUpperCase() === 'VERIFICATION_SUCCESS',
        ).length;
        const readyInCart = accepted.filter(
            (o) =>
                !o.shippedFromCart &&
                String(o.fulfillmentStatus || '').toUpperCase() === 'READY_FOR_SHIPPING',
        ).length;
        const pct = Math.round((shipped / total) * 100);
        return { total, shipped, inCart, handoverPending, readyInCart, pct };
    }, [order.offers]);

    const isGrouped = String(order.requestType || '').toLowerCase() === 'multiple';
    const show =
        isGrouped &&
        (order.status === 'PARTIALLY_SHIPPED' ||
            (stats.shipped > 0 && stats.inCart > 0));

    if (!show) return null;

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
                            {isAr
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
                <span className="text-[10px] text-white/30 font-bold uppercase">
                    {stats.inCart} {isAr ? 'في السلة' : 'in cart'}
                </span>
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
            </div>
        </motion.div>
    );
};
