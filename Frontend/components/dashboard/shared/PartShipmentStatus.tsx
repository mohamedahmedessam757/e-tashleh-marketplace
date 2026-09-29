import React from 'react';
import { Truck } from 'lucide-react';
import { Badge, StatusType } from '../../ui/Badge';
import { isOfferFulfillmentCancelled, resolvePartShipment } from '../../../utils/offerFulfillmentHelpers';

interface PartShipmentStatusProps {
    shipments?: Array<{
        id?: string;
        status?: string;
        createdAt?: string | Date;
        waybill?: { partId?: string | null; waybillNumber?: string | null } | null;
    }> | null;
    orderPartId?: string | null;
    cartShipmentId?: string | null;
    fulfillmentStatus?: string | null;
    isAr: boolean;
    className?: string;
}

/** Per-part shipping status for multi-item orders (each part follows its own shipment). */
export const PartShipmentStatus: React.FC<PartShipmentStatusProps> = ({
    shipments,
    orderPartId,
    cartShipmentId,
    fulfillmentStatus,
    isAr,
    className = '',
}) => {
    const shipment = resolvePartShipment(shipments, { orderPartId, cartShipmentId });
    const cancelled = isOfferFulfillmentCancelled(fulfillmentStatus);

    return (
        <div className={`flex flex-wrap items-center gap-1.5 ${className}`}>
            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-white/50">
                <Truck size={11} className="shrink-0" />
                {isAr ? 'حالة الشحن:' : 'Shipping:'}
            </span>
            {shipment?.status ? (
                <>
                    <Badge status={shipment.status as StatusType} className="scale-90 origin-left rtl:origin-right" />
                    {shipment.waybill?.waybillNumber && (
                        <span className="text-[10px] font-mono text-white/35">{shipment.waybill.waybillNumber}</span>
                    )}
                </>
            ) : (
                <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-md border text-[10px] font-bold ${
                        cancelled
                            ? 'border-rose-500/30 bg-rose-500/10 text-rose-200/80'
                            : 'border-white/15 bg-white/5 text-white/50'
                    }`}
                >
                    {cancelled
                        ? isAr ? 'لن تُشحن — ملغاة' : 'Not shipping — cancelled'
                        : isAr ? 'لم تُشحن بعد' : 'Not shipped yet'}
                </span>
            )}
        </div>
    );
};
