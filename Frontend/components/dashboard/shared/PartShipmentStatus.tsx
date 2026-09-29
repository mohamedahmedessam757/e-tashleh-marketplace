import React from 'react';
import { Truck } from 'lucide-react';
import { Badge, StatusType } from '../../ui/Badge';
import { resolvePartShipment } from '../../../utils/offerFulfillmentHelpers';

interface PartShipmentStatusProps {
    shipments?: Array<{
        id?: string;
        status?: string;
        createdAt?: string | Date;
        waybill?: { partId?: string | null; waybillNumber?: string | null } | null;
    }> | null;
    orderPartId?: string | null;
    cartShipmentId?: string | null;
    isAr: boolean;
    className?: string;
}

/** Per-part shipping status for multi-item orders (each part follows its own shipment). */
export const PartShipmentStatus: React.FC<PartShipmentStatusProps> = ({
    shipments,
    orderPartId,
    cartShipmentId,
    isAr,
    className = '',
}) => {
    const shipment = resolvePartShipment(shipments, { orderPartId, cartShipmentId });
    if (!shipment?.status) return null;

    return (
        <div className={`flex flex-wrap items-center gap-1.5 ${className}`}>
            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-white/50">
                <Truck size={11} className="shrink-0" />
                {isAr ? 'حالة الشحن:' : 'Shipping:'}
            </span>
            <Badge status={shipment.status as StatusType} className="scale-90 origin-left rtl:origin-right" />
            {shipment.waybill?.waybillNumber && (
                <span className="text-[10px] font-mono text-white/35">{shipment.waybill.waybillNumber}</span>
            )}
        </div>
    );
};
