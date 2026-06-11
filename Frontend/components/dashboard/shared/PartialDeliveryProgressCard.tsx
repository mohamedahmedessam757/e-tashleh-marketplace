import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, Package } from 'lucide-react';
import { getOrderTimelineStepIndex } from '../../../utils/offerFulfillmentHelpers';

interface PartialDeliveryProgressCardProps {
    shipments?: Array<{ id?: string; status?: string }>;
    shipmentBatches?: Array<{ shipmentId: string; partNames?: string[]; status?: string }>;
    orderStatus?: string;
    isAr: boolean;
    className?: string;
}

export const PartialDeliveryProgressCard: React.FC<PartialDeliveryProgressCardProps> = ({
    shipments = [],
    shipmentBatches = [],
    orderStatus,
    isAr,
    className = '',
}) => {
    if (getOrderTimelineStepIndex(orderStatus) < 5) {
        return null;
    }

    const stats = useMemo(() => {
        const list =
            shipments.length > 0
                ? shipments
                : shipmentBatches.map((b) => ({
                      id: b.shipmentId,
                      status: b.status,
                  }));
        const total = list.length;
        if (total <= 1) return null;
        const delivered = list.filter(
            (s) => String(s.status || '').toUpperCase() === 'DELIVERED_TO_CUSTOMER',
        ).length;
        const pct = Math.round((delivered / total) * 100);
        return { total, delivered, pending: total - delivered, pct, list };
    }, [shipments, shipmentBatches, orderStatus]);

    if (!stats || stats.delivered === 0 || stats.delivered >= stats.total) {
        return null;
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`bg-gradient-to-br from-cyan-500/10 to-transparent border border-cyan-500/25 rounded-2xl p-6 ${className}`}
        >
            <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-cyan-500/20 flex items-center justify-center">
                        <CheckCircle2 size={18} className="text-cyan-400" />
                    </div>
                    <div>
                        <h4 className="text-white font-bold text-sm">
                            {isAr ? 'استلام جزئي — بانتظار باقي الدفعات' : 'Partial delivery — batches pending'}
                        </h4>
                        <p className="text-white/40 text-[10px] uppercase tracking-wider">
                            {isAr
                                ? 'كل دفعة لها مهلة 24 ساعة مستقلة للإرجاع/النزاع بعد وصولها'
                                : 'Each batch gets its own 24h return/dispute window when delivered'}
                        </p>
                    </div>
                </div>
                <span className="text-cyan-400 font-bold text-lg">{stats.pct}%</span>
            </div>

            <div className="relative h-2 bg-white/5 rounded-full overflow-hidden mb-4">
                <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${stats.pct}%` }}
                    className="absolute inset-y-0 left-0 rtl:left-auto rtl:right-0 bg-gradient-to-r from-cyan-600 to-cyan-400"
                />
            </div>

            <ul className="space-y-2">
                {(shipmentBatches.length > 0 ? shipmentBatches : stats.list).map((row: any, i) => {
                    const delivered =
                        String(row.status || '').toUpperCase() === 'DELIVERED_TO_CUSTOMER';
                    const label =
                        row.partNames?.length > 1
                            ? row.partNames.join(' · ')
                            : row.partNames?.[0] ||
                              (isAr ? `دفعة ${i + 1}` : `Batch ${i + 1}`);
                    return (
                        <li
                            key={row.shipmentId || row.id || i}
                            className="flex items-center justify-between gap-2 text-xs bg-white/5 rounded-lg px-3 py-2 border border-white/5"
                        >
                            <span className="flex items-center gap-2 text-white/80 min-w-0">
                                <Package size={12} className="text-cyan-400 shrink-0" />
                                <span className="truncate">{label}</span>
                            </span>
                            <span
                                className={`shrink-0 font-bold ${delivered ? 'text-emerald-400' : 'text-amber-400'}`}
                            >
                                {delivered
                                    ? isAr
                                        ? 'وصلت'
                                        : 'Delivered'
                                    : isAr
                                      ? 'في الطريق'
                                      : 'In transit'}
                            </span>
                        </li>
                    );
                })}
            </ul>

            <p className="text-[10px] text-white/30 mt-3 text-center">
                {stats.delivered}/{stats.total}{' '}
                {isAr ? 'دفعة تم تسليمها للعميل' : 'batches delivered to customer'}
            </p>
        </motion.div>
    );
};
