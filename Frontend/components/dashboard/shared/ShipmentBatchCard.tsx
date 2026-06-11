import React from 'react';
import { Package, Truck } from 'lucide-react';
import type { ShipmentBatchSummary } from '../../../stores/useOrderStore';

export type { ShipmentBatchSummary };

interface ShipmentBatchCardProps {
    batch: ShipmentBatchSummary;
    orderNumber?: string;
    isAr: boolean;
    className?: string;
}

function triggerLabel(trigger: string | null | undefined, isAr: boolean): string | null {
    if (!trigger) return null;
    const map: Record<string, { ar: string; en: string }> = {
        CART_BATCH: { ar: 'اختيار من سلة الشحن', en: 'Shipping cart selection' },
        AUTO_7DAY: { ar: 'شحن تلقائي بعد 7 أيام', en: 'Auto-ship after 7 days' },
        ADMIN_MANUAL: { ar: 'إصدار إداري', en: 'Admin issuance' },
        AUTO_SINGLE: { ar: 'تلقائي — طلب مفرد', en: 'Auto — single order' },
    };
    const entry = map[String(trigger).toUpperCase()];
    return entry ? (isAr ? entry.ar : entry.en) : trigger;
}

export const ShipmentBatchCard: React.FC<ShipmentBatchCardProps> = ({
    batch,
    orderNumber,
    isAr,
    className = '',
}) => {
    const isGrouped = batch.batchSize > 1;
    const trigger = triggerLabel(batch.trigger, isAr);

    return (
        <div
            className={`rounded-xl border border-blue-500/25 bg-blue-500/10 p-4 space-y-3 ${className}`}
        >
            <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 text-blue-200">
                    <Truck size={18} className="shrink-0 text-blue-400" />
                    <div>
                        <p className="text-sm font-bold">
                            {isGrouped
                                ? isAr
                                    ? `شحنة مجمعة — ${batch.batchSize} قطع`
                                    : `Grouped shipment — ${batch.batchSize} parts`
                                : isAr
                                  ? 'شحنة قطعة واحدة'
                                  : 'Single-part shipment'}
                        </p>
                        {orderNumber && (
                            <p className="text-[10px] text-white/40 font-mono mt-0.5">
                                {isAr ? 'طلب' : 'Order'} #{orderNumber}
                            </p>
                        )}
                    </div>
                </div>
                {batch.waybillNumber && (
                    <span className="text-[10px] font-mono text-amber-400/90 shrink-0">
                        {batch.waybillNumber}
                    </span>
                )}
            </div>

            <ul className="space-y-1">
                {batch.partNames.map((name, i) => (
                    <li
                        key={`${batch.shipmentId}-${i}`}
                        className="flex items-center gap-2 text-xs text-white/80"
                    >
                        <Package size={12} className="text-blue-400/80 shrink-0" />
                        <span>{name}</span>
                    </li>
                ))}
            </ul>

            <div className="flex flex-wrap gap-2 text-[10px] text-white/40">
                {trigger && (
                    <span className="px-2 py-0.5 rounded bg-white/5 border border-white/10">
                        {trigger}
                    </span>
                )}
                {batch.status && (
                    <span className="px-2 py-0.5 rounded bg-white/5 border border-white/10 font-mono">
                        {batch.status}
                    </span>
                )}
            </div>
        </div>
    );
};
