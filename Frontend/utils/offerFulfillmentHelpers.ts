export type OfferFulfillmentStatus =
    | 'AWAITING_PAYMENT'
    | 'IN_PREPARATION'
    | 'PREPARED'
    | 'VERIFICATION'
    | 'VERIFICATION_SUCCESS'
    | 'READY_FOR_SHIPPING'
    | 'SHIPPED'
    | 'DELIVERED'
    | 'COMPLETED'
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
    COMPLETED: 80,
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
        COMPLETED: { ar: 'مكتمل', en: 'Completed' },
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

export function merchantCanMarkPrepared(
    fulfillmentStatus?: string,
    orderStatus?: string | null,
): boolean {
    if (isMerchantFulfillmentLocked(orderStatus)) return false;
    // Hard gate: payment must have moved the offer into IN_PREPARATION first.
    // Never allow Prepare while still AWAITING_PAYMENT (or missing status).
    return String(fulfillmentStatus || '').toUpperCase() === 'IN_PREPARATION';
}

export function normalizeOfferFulfillmentStatus(status?: string | null): OfferFulfillmentStatus {
    const s = String(status || '').toUpperCase();
    if (s && s in FULFILLMENT_RANK) return s as OfferFulfillmentStatus;
    // Order-level / post-delivery terminals that may appear on offer records
    if (
        [
            'WARRANTY_ACTIVE',
            'WARRANTY_EXPIRED',
            'RETURNED',
            'REFUNDED',
            'RESOLVED',
            'DISPUTED',
        ].includes(s)
    ) {
        return 'DELIVERED';
    }
    return 'AWAITING_PAYMENT';
}

const TERMINAL_ORDER_STATUSES = new Set([
    'COMPLETED',
    'WARRANTY_ACTIVE',
    'WARRANTY_EXPIRED',
    'RETURNED',
    'REFUNDED',
    'RESOLVED',
    'CANCELLED',
    'CLOSED',
]);

const CORRECTION_ORDER_STATUSES = new Set([
    'NON_MATCHING',
    'CORRECTION_PERIOD',
    'CORRECTION_SUBMITTED',
]);

/** Order-level correction / rematch family (SSOT for merchant badges). */
export function isCorrectionFamilyOrderStatus(orderStatus?: string | null): boolean {
    return CORRECTION_ORDER_STATUSES.has(String(orderStatus || '').toUpperCase());
}

/** Terminal / cancelled orders must not expose merchant fulfillment CTAs. */
export function isMerchantFulfillmentLocked(orderStatus?: string | null): boolean {
    return TERMINAL_ORDER_STATUSES.has(String(orderStatus || '').toUpperCase());
}
/**
 * Merchant-facing order timeline status from this merchant's accepted offers.
 * Payment stays active until every accepted offer for this store is paid
 * (fulfillment past AWAITING_PAYMENT). Preparation is never shown as current
 * while any offer is still unpaid.
 * Terminal order status is ground truth and cannot be overridden by offer drift.
 */
export function resolveMerchantTimelineFromOffers(
    offerStatuses: Array<string | null | undefined>,
    fallbackOrderStatus?: string | null,
): string {
    const fallback = String(fallbackOrderStatus || '').toUpperCase();
    if (fallback && TERMINAL_ORDER_STATUSES.has(fallback)) {
        return fallback;
    }
    // Correction-family is order-level SSOT (admin reject / merchant resubmit)
    if (fallback && CORRECTION_ORDER_STATUSES.has(fallback)) {
        return fallback;
    }

    if (!offerStatuses.length) {
        return fallback || 'AWAITING_PAYMENT';
    }

    const statuses = offerStatuses.map((s) => normalizeOfferFulfillmentStatus(s));
    const active = statuses.filter((s) => s !== 'CANCELLED');
    if (active.length === 0) {
        return fallback || 'CANCELLED';
    }

    const unpaid = active.filter((s) => s === 'AWAITING_PAYMENT');
    if (unpaid.length > 0) {
        const anyPaid = active.some((s) => getFulfillmentRank(s) >= FULFILLMENT_RANK.IN_PREPARATION);
        return anyPaid ? 'PARTIALLY_PAID' : 'AWAITING_PAYMENT';
    }

    let fromOffers: string;
    if (active.some((s) => s === 'IN_PREPARATION')) fromOffers = 'PREPARATION';
    else if (active.some((s) => s === 'PREPARED')) fromOffers = 'PREPARED';
    else if (active.some((s) => s === 'VERIFICATION')) fromOffers = 'VERIFICATION';
    else if (active.some((s) => s === 'VERIFICATION_SUCCESS')) fromOffers = 'VERIFICATION_SUCCESS';
    else if (active.some((s) => s === 'READY_FOR_SHIPPING')) fromOffers = 'READY_FOR_SHIPPING';
    else if (active.every((s) => s === 'DELIVERED' || s === 'COMPLETED')) {
        fromOffers =
            fallback && TERMINAL_ORDER_STATUSES.has(fallback) ? fallback : 'DELIVERED';
    } else if (active.every((s) => s === 'SHIPPED' || s === 'DELIVERED' || s === 'COMPLETED')) {
        fromOffers = 'SHIPPED';
    } else {
        fromOffers = fallback || active[0];
    }

    // Order-level SSOT wins when offers lag after rematch/admin approve
    if (fallback) {
        const orderStep = getOrderTimelineStepIndex(fallback);
        const offerStep = getOrderTimelineStepIndex(fromOffers);
        if (orderStep > offerStep) return fallback;
    }

    return fromOffers;
}

export function isOfferPaidForFulfillment(fulfillmentStatus?: string | null): boolean {
    return getFulfillmentRank(fulfillmentStatus) >= FULFILLMENT_RANK.IN_PREPARATION;
}

export function merchantCanSubmitVerification(
    fulfillmentStatus?: string,
    orderStatus?: string | null,
): boolean {
    if (isMerchantFulfillmentLocked(orderStatus)) return false;
    return String(fulfillmentStatus || '').toUpperCase() === 'PREPARED';
}

/**
 * True only while the offer is in first-pass admin verification review.
 * During correction/rematch (order-level), fulfillment often stays VERIFICATION —
 * that must NOT read as "under review".
 */
export function merchantOfferVerificationPending(
    fulfillmentStatus?: string,
    orderStatus?: string | null,
): boolean {
    if (isMerchantFulfillmentLocked(orderStatus)) return false;
    if (isCorrectionFamilyOrderStatus(orderStatus)) return false;
    // Order already past inspection — ignore stale offer.fulfillmentStatus=VERIFICATION
    if (isPostVerificationSuccessOrderStatus(orderStatus)) return false;
    return String(fulfillmentStatus || '').toUpperCase() === 'VERIFICATION';
}

/** Merchant-facing fulfillment label that respects correction/rematch order status. */
export function getMerchantFulfillmentDisplayLabel(
    fulfillmentStatus: string | undefined,
    orderStatus: string | null | undefined,
    isAr: boolean,
): string {
    const os = String(orderStatus || '').toUpperCase();
    if (os === 'CANCELLED' || os === 'CLOSED') {
        return isAr ? 'ملغى — لا يمكن إعادة التوثيق' : 'Cancelled — re-verification not allowed';
    }
    if (os === 'CORRECTION_PERIOD' || os === 'NON_MATCHING') {
        return isAr
            ? 'مطلوب إعادة التوثيق — فترة التصحيح'
            : 'Correction required — rematch';
    }
    if (os === 'CORRECTION_SUBMITTED') {
        return isAr
            ? 'تم إرسال التصحيح — بانتظار المراجعة'
            : 'Correction submitted — awaiting review';
    }
    // Order ahead of offer row (rematch approve lag) — show order-level success label
    if (
        isPostVerificationSuccessOrderStatus(os) &&
        getFulfillmentRank(fulfillmentStatus) < FULFILLMENT_RANK.VERIFICATION_SUCCESS
    ) {
        if (os === 'READY_FOR_SHIPPING' || getOrderTimelineStepIndex(os) >= 5) {
            if (os === 'SHIPPED' || os === 'PARTIALLY_SHIPPED') {
                return getFulfillmentLabel('SHIPPED', isAr);
            }
            if (os === 'READY_FOR_SHIPPING') {
                return getFulfillmentLabel('READY_FOR_SHIPPING', isAr);
            }
            return getFulfillmentLabel('VERIFICATION_SUCCESS', isAr);
        }
    }
    return getFulfillmentLabel(fulfillmentStatus, isAr);
}

export type VerificationDocSummary = {
    offerId?: string | null;
    adminStatus?: string | null;
    adminRejectionReason?: string | null;
    adminRejectionImages?: string[] | null;
    adminRejectionVideo?: string | null;
};

/** Post-inspection success — never show rematch CTAs even if a stale REJECTED doc remains. */
const POST_VERIFICATION_SUCCESS_STATUSES = new Set([
    'VERIFICATION_SUCCESS',
    'READY_FOR_SHIPPING',
    'PARTIALLY_SHIPPED',
    'SHIPPED',
    'RECEIVED_AT_HUB',
    'QUALITY_CHECK_PASSED',
    'PACKAGED_FOR_SHIPPING',
    'AWAITING_CARRIER_PICKUP',
    'PICKED_UP_BY_CARRIER',
    'IN_TRANSIT_TO_DESTINATION',
    'ARRIVED_AT_LOCAL_FACILITY',
    'CUSTOMS_CLEARANCE',
    'AT_LOCAL_WAREHOUSE',
    'OUT_FOR_DELIVERY',
    'DELIVERY_ATTEMPTED',
    'PARTIALLY_DELIVERED',
    'DELIVERED',
    'DELIVERED_TO_CUSTOMER',
]);

export function isPostVerificationSuccessOrderStatus(orderStatus?: string | null): boolean {
    return POST_VERIFICATION_SUCCESS_STATUSES.has(String(orderStatus || '').toUpperCase());
}

export function merchantOfferAdminRejected(
    fulfillmentStatus?: string,
    doc?: Pick<VerificationDocSummary, 'adminStatus'>,
    orderStatus?: string | null,
): boolean {
    if (isMerchantFulfillmentLocked(orderStatus)) return false;
    // Correction already sent — hide rematch CTAs while awaiting admin review
    if (String(orderStatus || '').toUpperCase() === 'CORRECTION_SUBMITTED') return false;
    if (isPostVerificationSuccessOrderStatus(orderStatus)) {
        return false;
    }
    if (String(doc?.adminStatus || '').toUpperCase() !== 'REJECTED') return false;
    const fs = String(fulfillmentStatus || '').toUpperCase();
    // Reject path keeps VERIFICATION (legacy rows may still be PREPARED)
    return fs === 'VERIFICATION' || fs === 'PREPARED';
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

export function merchantCanRequestReadyForShipping(
    fulfillmentStatus?: string,
    orderStatus?: string | null,
): boolean {
    if (isMerchantFulfillmentLocked(orderStatus)) return false;
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
    orderStatus?: string | null,
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
            if (isCorrectionFamilyOrderStatus(orderStatus)) {
                const os = String(orderStatus || '').toUpperCase();
                if (os === 'CORRECTION_SUBMITTED') {
                    return `${total}/${total} ${isAr ? 'تصحيح مُرسل' : 'correction sent'}`;
                }
                return `${total}/${total} ${isAr ? 'إعادة مطابقة' : 'rematch'}`;
            }
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
        case 'NON_MATCHING':
        case 'CORRECTION_PERIOD':
        case 'CORRECTION_SUBMITTED':
            return 4;
        // Shipping phase started (hub / ready) — step 5 current
        case 'VERIFICATION_SUCCESS':
        case 'RECEIVED_AT_HUB':
        case 'QUALITY_CHECK_PASSED':
        case 'PACKAGED_FOR_SHIPPING':
        case 'AWAITING_CARRIER_PICKUP':
        case 'READY_FOR_SHIPPING':
        case 'PARTIALLY_SHIPPED':
            return 5;
        // Carrier has the parcel / in transit — shipping COMPLETE, delivery step current
        case 'SHIPPED':
        case 'PICKED_UP_BY_CARRIER':
        case 'IN_TRANSIT_TO_DESTINATION':
        case 'ARRIVED_AT_LOCAL_FACILITY':
        case 'CUSTOMS_CLEARANCE':
        case 'CUSTOMS_DELAY':
        case 'AT_LOCAL_WAREHOUSE':
        case 'OUT_FOR_DELIVERY':
        case 'DELIVERY_ATTEMPTED':
            return 6;
        case 'PARTIALLY_DELIVERED':
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

/**
 * Map shipment tracker status onto an order-status equivalent for the shared StatusTimeline.
 * Keeps hub-side statuses on step 5 and carrier/transit on step 6 (shipping completed).
 */
export function mapShipmentStatusToTimelineStatus(shipmentStatus?: string | null): string | null {
    const st = String(shipmentStatus || '').toUpperCase();
    if (!st) return null;
    if (st === 'DELIVERED_TO_CUSTOMER') return 'DELIVERED';
    if (
        st === 'PICKED_UP_BY_CARRIER' ||
        st === 'IN_TRANSIT_TO_DESTINATION' ||
        st === 'ARRIVED_AT_LOCAL_FACILITY' ||
        st === 'CUSTOMS_CLEARANCE' ||
        st === 'CUSTOMS_DELAY' ||
        st === 'AT_LOCAL_WAREHOUSE' ||
        st === 'OUT_FOR_DELIVERY' ||
        st === 'DELIVERY_ATTEMPTED'
    ) {
        return 'SHIPPED';
    }
    if (
        st === 'RECEIVED_AT_HUB' ||
        st === 'QUALITY_CHECK_PASSED' ||
        st === 'PACKAGED_FOR_SHIPPING' ||
        st === 'AWAITING_CARRIER_PICKUP' ||
        st === 'PREPARED' ||
        st === 'PREPARATION'
    ) {
        return 'READY_FOR_SHIPPING';
    }
    return null;
}

/** Prefer whichever of order / shipment is further along the shared 7-step timeline. */
export function resolveOrderTimelineStatus(
    orderStatus?: string | null,
    shipmentStatus?: string | null,
): string {
    const order = String(orderStatus || '').toUpperCase();
    const fromShipment = mapShipmentStatusToTimelineStatus(shipmentStatus);
    if (!fromShipment) return order || 'AWAITING_OFFERS';
    if (!order) return fromShipment;
    const orderIdx = getOrderTimelineStepIndex(order);
    const shipIdx = getOrderTimelineStepIndex(fromShipment);
    return shipIdx > orderIdx ? fromShipment : order;
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
    const key = normalizeOfferFulfillmentStatus(status);
    return FULFILLMENT_RANK[key] ?? 0;
}

export { FULFILLMENT_RANK };
