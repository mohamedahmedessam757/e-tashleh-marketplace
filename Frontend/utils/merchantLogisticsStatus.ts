import { statusTranslations } from '../components/dashboard/shipments/ShipmentTracker';

export function isGroupedShippingOrder(order: {
    requestType?: string;
    parts?: unknown[];
}): boolean {
    return order.requestType === 'multiple' || (order.parts?.length ?? 0) > 1;
}

export type MerchantHandoverPhase =
    | 'awaiting_waybill'
    | 'waybill_issued'
    | 'at_hub'
    | 'pickup_pending'
    | 'in_transit'
    | 'delivered';

const EARLY_SHIPMENT_STATUSES = new Set(['PREPARATION', 'PREPARED']);
const PICKUP_STATUSES = new Set(['RECEIVED_AT_HUB', 'QUALITY_CHECK_PASSED', 'PACKAGED_FOR_SHIPPING', 'AWAITING_CARRIER_PICKUP']);
const TRANSIT_STATUSES = new Set([
    'PICKED_UP_BY_CARRIER',
    'IN_TRANSIT_TO_DESTINATION',
    'ARRIVED_AT_LOCAL_FACILITY',
    'CUSTOMS_CLEARANCE',
    'CUSTOMS_DELAY',
    'AT_LOCAL_WAREHOUSE',
    'OUT_FOR_DELIVERY',
    'DELIVERY_ATTEMPTED',
]);

export function resolveMerchantHandoverPhase(params: {
    orderStatus: string;
    waybills?: unknown[];
    shipmentStatus?: string | null;
}): MerchantHandoverPhase {
    const { orderStatus, waybills, shipmentStatus } = params;
    const st = String(shipmentStatus || '').toUpperCase();

    if (orderStatus === 'DELIVERED' || orderStatus === 'COMPLETED' || st === 'DELIVERED_TO_CUSTOMER') {
        return 'delivered';
    }
    if (orderStatus === 'SHIPPED' || TRANSIT_STATUSES.has(st)) {
        return 'in_transit';
    }
    if (PICKUP_STATUSES.has(st)) {
        return st === 'AWAITING_CARRIER_PICKUP' ? 'pickup_pending' : 'at_hub';
    }
    if (st && !EARLY_SHIPMENT_STATUSES.has(st)) {
        return 'in_transit';
    }
    if ((waybills?.length ?? 0) > 0) {
        return 'waybill_issued';
    }
    return 'awaiting_waybill';
}

export function getMerchantHandoverStatusCopy(
    phase: MerchantHandoverPhase,
    isAr: boolean,
    shipmentStatus?: string | null,
): { title: string; desc: string; actionLabel: string } {
    const shipmentLabel = shipmentStatus
        ? (isAr
            ? statusTranslations[shipmentStatus]?.ar
            : statusTranslations[shipmentStatus]?.en) || shipmentStatus
        : null;

    switch (phase) {
        case 'delivered':
            return {
                title: isAr ? 'تم تسليم الشحنة' : 'Shipment delivered',
                desc: isAr
                    ? 'تم استلام الشحنة من قبل العميل. لا يلزم أي إجراء إضافي منك.'
                    : 'The shipment was received by the customer. No further action is required.',
                actionLabel: isAr ? 'تم التسليم للعميل' : 'Delivered to customer',
            };
        case 'in_transit':
            return {
                title: isAr ? 'الشحنة في الطريق' : 'Shipment in transit',
                desc: isAr
                    ? `الشحنة قيد النقل حالياً${shipmentLabel ? ` (${shipmentLabel})` : ''}. يمكنك متابعة التتبع من الأسفل.`
                    : `The shipment is on its way${shipmentLabel ? ` (${shipmentLabel})` : ''}. Track progress below.`,
                actionLabel: shipmentLabel || (isAr ? 'الشحنة في الطريق' : 'In transit'),
            };
        case 'pickup_pending':
            return {
                title: isAr ? 'بانتظار استلام المندوب' : 'Awaiting courier pickup',
                desc: isAr
                    ? 'تم إصدار بوليصة الشحن. بانتظار وصول مندوب المنصة لاستلام الشحنة من موقعك.'
                    : 'The waybill was issued. A platform courier will pick up the shipment from your location soon.',
                actionLabel: isAr ? 'بانتظار استلام المندوب' : 'Awaiting courier pickup',
            };
        case 'at_hub':
            return {
                title: isAr ? 'الشحنة لدى مركز التجميع' : 'Shipment at hub',
                desc: isAr
                    ? `تم استلام الشحنة${shipmentLabel ? `: ${shipmentLabel}` : ''}. جاري تجهيزها للشحن.`
                    : `Shipment received${shipmentLabel ? `: ${shipmentLabel}` : ''}. Processing for dispatch.`,
                actionLabel: shipmentLabel || (isAr ? 'الشحنة لدى المركز' : 'At hub'),
            };
        case 'waybill_issued':
            return {
                title: isAr ? 'تم إصدار بوليصة الشحن' : 'Waybill issued',
                desc: isAr
                    ? 'صدرت بوليصة الشحن. سيتم إرسال مندوب لاستلام الشحنة من موقعك قريباً.'
                    : 'The shipping waybill has been issued. A courier will pick up the shipment from your location soon.',
                actionLabel: isAr ? 'بوليصة الشحن صادرة' : 'Waybill issued',
            };
        default:
            return {
                title: isAr ? 'تم طلب تسليم الشحنة' : 'Handover requested',
                desc: isAr
                    ? 'تم إرسال طلبك للإدارة. بانتظار إصدار بوليصة الشحن واستلام المندوب للشحنة.'
                    : 'Your handover request was sent. Awaiting waybill issuance and courier pickup.',
                actionLabel: isAr ? 'بانتظار إصدار بوليصة الشحن' : 'Awaiting waybill issuance',
            };
    }
}

export function getMerchantPartLogisticsLabel(params: {
    order: { requestType?: string; parts?: unknown[]; shippingWaybills?: unknown[] };
    partOffer: { fulfillmentStatus?: string; shippedFromCart?: boolean; status?: string };
    shipmentStatus?: string | null;
    isAr: boolean;
}): { show: boolean; title: string; value: string } {
    const { order, partOffer, shipmentStatus, isAr } = params;
    if (String(partOffer.status).toLowerCase() !== 'accepted') {
        return { show: false, title: '', value: '' };
    }
    if (String(partOffer.fulfillmentStatus || '').toUpperCase() !== 'READY_FOR_SHIPPING') {
        return { show: false, title: '', value: '' };
    }

    const grouped = isGroupedShippingOrder(order);
    const phase = resolveMerchantHandoverPhase({
        orderStatus: 'READY_FOR_SHIPPING',
        waybills: order.shippingWaybills,
        shipmentStatus,
    });

    if (grouped && !partOffer.shippedFromCart) {
        return {
            show: true,
            title: isAr ? 'حالة اللوجستيات' : 'Logistics',
            value: isAr ? 'في سلة الشحن (طلب مجمع)' : 'In shipping cart (grouped order)',
        };
    }

    if (grouped && partOffer.shippedFromCart) {
        const shipmentLabel = shipmentStatus
            ? (isAr ? statusTranslations[shipmentStatus]?.ar : statusTranslations[shipmentStatus]?.en)
            : null;
        return {
            show: true,
            title: isAr ? 'حالة اللوجستيات' : 'Logistics',
            value: shipmentLabel || (isAr ? 'تم الشحن من السلة' : 'Shipped from cart'),
        };
    }

    // Single / non-grouped order — never mention shipping cart
    const copy = getMerchantHandoverStatusCopy(phase, isAr, shipmentStatus);
    return {
        show: true,
        title: isAr ? 'حالة الشحن' : 'Shipping status',
        value: copy.actionLabel,
    };
}
