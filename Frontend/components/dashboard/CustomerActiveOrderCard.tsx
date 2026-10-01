import React from 'react';
import { motion } from 'framer-motion';
import { Car, ChevronLeft, ChevronRight, Eye } from 'lucide-react';
import { GlassCard } from '../ui/GlassCard';
import { Badge, StatusType } from '../ui/Badge';
import { OrderStatusCountdown } from '../ui/OrderStatusCountdown';
import { isAcceptedOfferStatus } from '../../utils/offerStatusHelpers';
import { formatOrderDisplayId } from '../../utils/orderDisplayId';

interface CustomerActiveOrderCardProps {
    order: any;
    isAr: boolean;
    language: string;
    t: any;
    dh: any;
    getProgress: (status: StatusType) => number;
    onNavigate: (path: string, id?: number) => void;
}

export const CustomerActiveOrderCard: React.FC<CustomerActiveOrderCardProps> = ({
    order,
    isAr,
    language,
    t,
    dh,
    getProgress,
    onNavigate,
}) => {
    const ChevronIcon = isAr ? ChevronLeft : ChevronRight;

    return (
        <GlassCard className="p-0 overflow-hidden bg-[#1A1814] border-gold-500/30 shadow-[0_0_30px_rgba(168,139,62,0.05)]">
            <div className="p-4 sm:p-6 md:p-8">
                <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-6 min-w-0">
                    <div className="flex items-center gap-4 min-w-0 flex-1">
                        <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-white/40 shrink-0">
                            <Car size={28} />
                        </div>
                        <div className="min-w-0">
                            <h4 className="text-xl font-bold text-white mb-1 truncate">{order.car}</h4>
                            <div className="flex flex-wrap items-center gap-2 text-sm text-white/50">
                                <span className="truncate max-w-[12rem]">{order.part}</span>
                                <span className="w-1 h-1 rounded-full bg-white/20 shrink-0" />
                                <span className="text-gold-400 font-mono text-xs truncate">
                                    #{formatOrderDisplayId(order)}
                                </span>
                            </div>
                        </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 shrink-0 w-full sm:w-auto sm:justify-end">
                        <Badge status={order.status as StatusType} />
                        <OrderStatusCountdown order={order} variant="compact" />
                    </div>
                </div>

                <div className="mb-2">
                    <div className="flex justify-between text-xs font-bold mb-2">
                        <span className="text-gold-400">{t.dashboard.orders.status}</span>
                        <span className="text-white/40">{getProgress(order.status)}%</span>
                    </div>
                    <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                        <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${getProgress(order.status)}%` }}
                            transition={{ duration: 1, ease: 'easeOut' }}
                            className="h-full bg-gradient-to-r from-gold-600 to-gold-400"
                        />
                    </div>
                    <div className="mt-2 text-xs text-white/40 text-right">
                        {order.date}
                    </div>
                    {order.requestType === 'multiple' &&
                        (order.status === 'PARTIALLY_SHIPPED' ||
                            (order.offers?.some(
                                (o: any) =>
                                    isAcceptedOfferStatus(o.status) &&
                                    o.shippedFromCart,
                            ) &&
                                order.offers?.some(
                                    (o: any) =>
                                        isAcceptedOfferStatus(o.status) &&
                                        !o.shippedFromCart,
                                ))) && (
                            <p className="mt-2 text-[10px] text-blue-300/90 font-medium">
                                {language === 'ar'
                                    ? 'شحن جزئي — بعض القطع في سلة التجميع'
                                    : 'Partial shipping — some parts still in assembly cart'}
                            </p>
                        )}
                </div>
            </div>

            <button
                type="button"
                aria-label={dh?.actions.viewDetails}
                onClick={() => onNavigate('order-details', order.id)}
                className="w-full m-0 border-t border-gold-500/20 bg-gold-500/15 hover:bg-gold-500/25 px-4 py-3.5 flex items-center justify-center gap-2 text-gold-300 font-bold text-sm transition-all hover:shadow-[0_0_20px_rgba(196,169,92,0.35)]"
            >
                <Eye size={18} />
                <span>{dh?.actions.viewDetails}</span>
                <ChevronIcon size={16} className="opacity-70" />
            </button>
        </GlassCard>
    );
};
