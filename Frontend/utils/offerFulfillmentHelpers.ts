export type OfferFulfillmentStatus =
    | 'AWAITING_PAYMENT'
    | 'IN_PREPARATION'
    | 'PREPARED'
    | 'VERIFICATION'
    | 'VERIFICATION_SUCCESS'
    | 'READY_FOR_SHIPPING'
    | 'SHIPPED'
    | 'DELIVERED'
    | 'CANCELLED';

const FULFILLMENT_RANK: Record<OfferFulfillmentStatus, number> = {
    AWAITING_PAYMENT: 0,
    IN_PREPARATION: 10,
    PREPARED: 20,
    VERIFICATION: 30,
    VERIFICATION_SUCCESS: 40,
    READY_FOR_SHIPPING: 50,
    SHIPPED: 60,
    DELIVERED: 70,
    CANCELLED: -1,
};

export function getFulfillmentLabel(
    status: string | undefined,
    isAr: boolean,
): string {
    const labels: Record<string, { ar: string; en: string }> = {
        AWAITING_PAYMENT: { ar: 'بانتظار الدفع', en: 'Awaiting payment' },
        IN_PREPARATION: { ar: 'قيد التجهيز', en: 'In preparation' },
        PREPARED: { ar: 'تم التجهيز', en: 'Prepared' },
        VERIFICATION: { ar: 'التوثيق قيد المراجعة', en: 'Verification in review' },
        VERIFICATION_SUCCESS: { ar: 'تم التوثيق', en: 'Verified' },
        READY_FOR_SHIPPING: { ar: 'جاهز للشحن', en: 'Ready for shipping' },
        SHIPPED: { ar: 'تم الشحن', en: 'Shipped' },
        DELIVERED: { ar: 'تم التسليم', en: 'Delivered' },
        CANCELLED: { ar: 'ملغى', en: 'Cancelled' },
    };
    const entry = labels[String(status || '').toUpperCase()];
    if (!entry) return status || (isAr ? 'غير معروف' : 'Unknown');
    return isAr ? entry.ar : entry.en;
}

export function canSelectOfferForShipping(
    fulfillmentStatus?: string,
    shippedFromCart?: boolean,
): boolean {
    return (
        String(fulfillmentStatus || '').toUpperCase() === 'READY_FOR_SHIPPING' &&
        !shippedFromCart
    );
}

export function merchantCanMarkPrepared(fulfillmentStatus?: string): boolean {
    const s = String(fulfillmentStatus || '').toUpperCase();
    return !s || s === 'IN_PREPARATION' || s === 'AWAITING_PAYMENT';
}

export function merchantCanSubmitVerification(fulfillmentStatus?: string): boolean {
    return String(fulfillmentStatus || '').toUpperCase() === 'PREPARED';
}

export function merchantOfferVerificationPending(fulfillmentStatus?: string): boolean {
    return String(fulfillmentStatus || '').toUpperCase() === 'VERIFICATION';
}

export type VerificationDocSummary = {
    offerId?: string | null;
    adminStatus?: string | null;
    adminRejectionReason?: string | null;
    adminRejectionImages?: string[] | null;
    adminRejectionVideo?: string | null;
};

export function merchantOfferAdminRejected(
    fulfillmentStatus?: string,
    doc?: Pick<VerificationDocSummary, 'adminStatus'>,
): boolean {
    return (
        String(fulfillmentStatus || '').toUpperCase() === 'PREPARED' &&
        String(doc?.adminStatus || '').toUpperCase() === 'REJECTED'
    );
}

export function getVerificationDocForOffer(
    documents: VerificationDocSummary[] | undefined,
    offerId: string,
): VerificationDocSummary | undefined {
    if (!documents?.length || !offerId) return undefined;
    return (
        documents.find(
            (d) =>
                d.offerId === offerId &&
                (!d.adminStatus || String(d.adminStatus).toUpperCase() === 'PENDING'),
        ) ?? documents.find((d) => d.offerId === offerId)
    );
}

export function merchantCanRequestReadyForShipping(fulfillmentStatus?: string): boolean {
    return String(fulfillmentStatus || '').toUpperCase() === 'VERIFICATION_SUCCESS';
}

export function buildFulfillmentStepHint(
    summary: {
        total: number;
        stepCounts: {
            preparation: number;
            prepared: number;
            verification: number;
            verificationSuccess: number;
            handoverPending?: number;
            readyForShipping: number;
            shipped?: number;
            inCart?: number;
        };
    } | null | undefined,
    stepIndex: number,
    isAr: boolean,
): string | undefined {
    if (!summary || summary.total <= 1) return undefined;
    const { total, stepCounts } = summary;
    const handover = stepCounts.handoverPending ?? 0;
    const shipped = stepCounts.shipped ?? 0;

    switch (stepIndex) {
        case 3: {
            const prepared = stepCounts.prepared ?? 0;
            if (prepared > 0 && stepCounts.preparation === 0) {
                return `${prepared}/${total} ${isAr ? 'تم التجهيز' : 'prepared'}`;
            }
            if (prepared > 0 && stepCounts.preparation > 0) {
                return `${prepared}/${total} ${isAr ? 'تم التجهيز' : 'prepared'} · ${stepCounts.preparation} ${isAr ? 'باقٍ' : 'left'}`;
            }
            return `${stepCounts.preparation}/${total} ${isAr ? 'في التجهيز' : 'in prep'}`;
        }
        case 4: {
            const inReview = stepCounts.verification ?? 0;
            if (inReview > 0) {
                return `${inReview}/${total} ${isAr ? 'قيد المراجعة' : 'under review'}`;
            }
            const base = `${stepCounts.verificationSuccess}/${total} ${isAr ? 'موثّق' : 'verified'}`;
            if (handover > 0) {
                return `${base} · ${handover} ${isAr ? 'بانتظار التاجر' : 'awaiting merchant'}`;
            }
            return base;
        }
        case 5: {
            if (shipped > 0) {
                const base = `${shipped}/${total} ${isAr ? 'شُحنت' : 'shipped'}`;
                const inCart = stepCounts.inCart ?? 0;
                if (inCart > 0) {
                    return `${base} · ${inCart} ${isAr ? 'في السلة' : 'in cart'}`;
                }
                return base;
            }
            return `${stepCounts.readyForShipping}/${total} ${isAr ? 'جاهز للشحن' : 'ready'}`;
        }
        case 6: {
            return undefined;
        }
        default:
            return undefined;
    }
}

export type ShipmentDeliverySummary = {
    total: number;
    delivered: number;
};

/** Order statuses before any carrier / batch delivery tracking applies. */
const ORDER_STATUSES_BEFORE_SHIPPING_PHASE = new Set([
    'AWAITING_OFFERS',
    'COLLECTING_OFFERS',
    'AWAITING_SELECTION',
    'AWAITING_PAYMENT',
    'PARTIALLY_PAID',
    'PREPARATION',
    'PREPARED',
    'VERIFICATION',
    'VERIFICATION_SUCCESS',
    'NON_MATCHING',
    'CORRECTION_PERIOD',
    'CORRECTION_SUBMITTED',
    'DELAYED_PREPARATION',
    'CANCELLED',
]);

/** Mirrors StatusTimeline active step (0=request … 6=delivery). */
export function getOrderTimelineStepIndex(status?: string): number {
    switch (String(status || '').toUpperCase()) {
        case 'AWAITING_OFFERS':
        case 'COLLECTING_OFFERS':
        case 'AWAITING_SELECTION':
            return 1;
        case 'AWAITING_PAYMENT':
        case 'PARTIALLY_PAID':
            return 2;
        case 'PREPARATION':
        case 'DELAYED_PREPARATION':
            return 3;
        case 'PREPARED':
        case 'VERIFICATION':
        case 'VERIFICATION_SUCCESS':
        case 'NON_MATCHING':
        case 'CORRECTION_PERIOD':
        case 'CORRECTION_SUBMITTED':
            return 4;
        case 'RECEIVED_AT_HUB':
        case 'QUALITY_CHECK_PASSED':
        case 'PACKAGED_FOR_SHIPPING':
        case 'AWAITING_CARRIER_PICKUP':
        case 'READY_FOR_SHIPPING':
        case 'PARTIALLY_SHIPPED':
        case 'SHIPPED':
        case 'PICKED_UP_BY_CARRIER':
        case 'IN_TRANSIT_TO_DESTINATION':
        case 'ARRIVED_AT_LOCAL_FACILITY':
        case 'CUSTOMS_CLEARANCE':
        case 'AT_LOCAL_WAREHOUSE':
        case 'OUT_FOR_DELIVERY':
        case 'DELIVERY_ATTEMPTED':
            return 5;
        case 'DELIVERED':
        case 'DELIVERED_TO_CUSTOMER':
        case 'COMPLETED':
        case 'RETURNED':
        case 'RETURN_REQUESTED':
        case 'RETURN_APPROVED':
        case 'RETURN_LABEL_ISSUED':
        case 'RETURN_STARTED':
        case 'RECEIVED_FROM_CUSTOMER':
        case 'DELIVERED_TO_VENDOR':
        case 'EXCHANGE_COMPLETED':
        case 'IN_TRANSIT_TO_CUSTOMER':
        case 'RETURN_COMPLETED_TO_CUSTOMER':
        case 'DISPUTED':
        case 'RESOLVED':
        case 'REFUNDED':
        case 'WARRANTY_ACTIVE':
        case 'WARRANTY_EXPIRED':
            return 6;
        default:
            return 0;
    }
}

export function computeShipmentDeliverySummary(
    shipments?: Array<{ status?: string }> | null,
    orderStatus?: string,
): ShipmentDeliverySummary | null {
    if (orderStatus && ORDER_STATUSES_BEFORE_SHIPPING_PHASE.has(String(orderStatus).toUpperCase())) {
        return null;
    }
    if (orderStatus && getOrderTimelineStepIndex(orderStatus) < 5) {
        return null;
    }
    if (!shipments?.length || shipments.length <= 1) return null;
    const delivered = shipments.filter(
        (s) => String(s.status || '').toUpperCase() === 'DELIVERED_TO_CUSTOMER',
    ).length;
    return { total: shipments.length, delivered };
}

export function buildShipmentDeliveryStepHint(
    summary: ShipmentDeliverySummary | null | undefined,
    stepIndex: number,
    isAr: boolean,
    activeStepIndex: number,
): string | undefined {
    if (!summary || summary.total <= 1 || stepIndex !== 6) return undefined;
    // Do not show batch-delivery text until the order has entered the shipping phase.
    if (activeStepIndex < 5) return undefined;

    if (summary.delivered === 0) {
        return isAr
            ? `بانتظار وصول ${summary.total} دفعات`
            : `Awaiting ${summary.total} batches`;
    }
    if (summary.delivered < summary.total) {
        return isAr
            ? `${summary.delivered}/${summary.total} دفعة وصلت — بانتظار الباقي`
            : `${summary.delivered}/${summary.total} batches arrived — waiting for rest`;
    }
    // All batches marked delivered in data — completion wording only on the delivery step.
    if (activeStepIndex < 6) {
        return isAr
            ? `${summary.delivered}/${summary.total} دفعة وصلت — بانتظار تأكيد الاستلام`
            : `${summary.delivered}/${summary.total} batches arrived — confirm receipt when ready`;
    }
    return isAr
        ? `كل الدفعات (${summary.total}) وصلت`
        : `All ${summary.total} batches delivered`;
}

export function allShipmentBatchesDelivered(
    shipments?: Array<{ status?: string }> | null,
): boolean {
    if (!shipments?.length) return true;
    return shipments.every(
        (s) => String(s.status || '').toUpperCase() === 'DELIVERED_TO_CUSTOMER',
    );
}

export function getFulfillmentRank(status?: string): number {
    const key = String(status || 'IN_PREPARATION').toUpperCase() as OfferFulfillmentStatus;
    return FULFILLMENT_RANK[key] ?? 0;
}

export { FULFILLMENT_RANK };
