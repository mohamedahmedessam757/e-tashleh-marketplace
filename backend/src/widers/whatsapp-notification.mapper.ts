export type WhatsAppAudienceRole = 'CUSTOMER' | 'MERCHANT';

/** Explicit WhatsApp routing key — preferred over keyword heuristics. */
export type WhatsAppEvent =
    | 'ORDER_CREATED'
    | 'ORDER_STATUS'
    | 'OFFER_REVEAL'
    | 'OFFER_ACCEPTED'
    | 'OFFER_BIDDING_RESTRICTED'
    | 'VIOLATION_ISSUED'
    | 'PAYMENT_SUCCESS'
    | 'INVOICE_ISSUED'
    | 'SHIPMENT_STATUS'
    | 'WAYBILL_ISSUED'
    | 'VERIFICATION'
    | 'DOCUMENT'
    | 'STORE_ACTIVATION'
    | 'STORE_UNDER_REVIEW'
    | 'CHAT_MESSAGE';

export const WHATSAPP_EVENTS: readonly WhatsAppEvent[] = [
    'ORDER_CREATED',
    'ORDER_STATUS',
    'OFFER_REVEAL',
    'OFFER_ACCEPTED',
    'OFFER_BIDDING_RESTRICTED',
    'VIOLATION_ISSUED',
    'PAYMENT_SUCCESS',
    'INVOICE_ISSUED',
    'SHIPMENT_STATUS',
    'WAYBILL_ISSUED',
    'VERIFICATION',
    'DOCUMENT',
    'STORE_ACTIVATION',
    'STORE_UNDER_REVIEW',
    'CHAT_MESSAGE',
] as const;

export interface NotificationDispatchInput {
    recipientRole: string;
    type?: string;
    titleAr: string;
    titleEn: string;
    messageAr: string;
    messageEn: string;
    link?: string;
    metadata?: Record<string, unknown> | null;
}

const UUID_RE =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const ORDER_WA_EVENTS = new Set<WhatsAppEvent>([
    'ORDER_CREATED',
    'ORDER_STATUS',
    'OFFER_REVEAL',
    'OFFER_ACCEPTED',
]);

export function normalizeWhatsAppRole(role: string): WhatsAppAudienceRole | null {
    const upper = role.toUpperCase();
    if (upper === 'CUSTOMER') return 'CUSTOMER';
    if (upper === 'MERCHANT' || upper === 'VENDOR') return 'MERCHANT';
    return null;
}

export function isWhatsAppEligibleRole(role: string): boolean {
    return normalizeWhatsAppRole(role) !== null;
}

export function extractOrderId(
    metadata?: Record<string, unknown> | null,
    link?: string,
): string | null {
    const fromMeta = metadata?.orderId;
    if (typeof fromMeta === 'string' && UUID_RE.test(fromMeta)) {
        return fromMeta;
    }
    if (!link) return null;
    const match = link.match(
        /[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i,
    );
    return match?.[0] ?? null;
}

export function extractOfferId(metadata?: Record<string, unknown> | null): string | null {
    const raw = metadata?.offerId;
    if (typeof raw === 'string' && UUID_RE.test(raw)) {
        return raw;
    }
    return null;
}

export function extractWaEvent(
    metadata?: Record<string, unknown> | null,
): WhatsAppEvent | null {
    const raw = metadata?.waEvent;
    if (typeof raw !== 'string') return null;
    const upper = raw.toUpperCase() as WhatsAppEvent;
    return (WHATSAPP_EVENTS as readonly string[]).includes(upper) ? upper : null;
}

function containsAny(haystack: string, needles: string[]): boolean {
    const lower = haystack.toLowerCase();
    return needles.some((n) => lower.includes(n.toLowerCase()));
}

function isWaybillNotification(input: NotificationDispatchInput): boolean {
    const blob = `${input.titleAr} ${input.titleEn} ${input.messageAr} ${input.messageEn}`;
    return containsAny(blob, ['بوليصة', 'waybill', 'return label', 'بوليصة الإرجاع']);
}

function isDocumentNotification(input: NotificationDispatchInput, role: WhatsAppAudienceRole): boolean {
    if (role !== 'MERCHANT') return false;
    const type = (input.type ?? '').toUpperCase();
    if (['DOC_EXPIRY', 'SUCCESS'].includes(type)) return true;
    if (input.metadata?.docType) return true;
    const blob = `${input.titleAr} ${input.titleEn} ${input.messageAr} ${input.messageEn}`;
    return containsAny(blob, ['مستند', 'document', 'doc_type', 'إعادة رفع']);
}

function isVerificationNotification(input: NotificationDispatchInput): boolean {
    const type = (input.type ?? '').toLowerCase();
    if (input.metadata?.verification === true) return true;
    const blob = `${input.titleAr} ${input.titleEn} ${input.messageAr} ${input.messageEn}`;
    return (
        type === 'system_alert' &&
        containsAny(blob, [
            'توثيق',
            'verification',
            'مطابقة',
            'non-match',
            'non matching',
            'عدم المطابقة',
        ])
    );
}

function isPaymentFailure(input: NotificationDispatchInput): boolean {
    if (input.metadata?.failureReason) return true;
    const blob = `${input.titleAr} ${input.titleEn}`;
    return containsAny(blob, ['فشل', 'failed', 'failure']);
}

function orderFamily(role: WhatsAppAudienceRole): string {
    return role === 'CUSTOMER' ? 'txn_order_customer' : 'txn_order_merchant';
}

function shipmentFamily(role: WhatsAppAudienceRole): string {
    return role === 'CUSTOMER' ? 'txn_shipment_customer' : 'txn_shipment_merchant';
}

function invoiceFamily(role: WhatsAppAudienceRole): string {
    return role === 'CUSTOMER' ? 'txn_invoice_customer' : 'txn_invoice_merchant';
}

function waybillFamily(role: WhatsAppAudienceRole): string {
    return role === 'CUSTOMER' ? 'txn_waybill_customer' : 'txn_waybill_merchant';
}

function verificationFamily(role: WhatsAppAudienceRole): string {
    return role === 'CUSTOMER' ? 'txn_verification_customer' : 'txn_verification_vendor';
}

/**
 * Resolve via explicit metadata.waEvent (preferred path).
 * Returns undefined when no waEvent — caller falls back to type/heuristics.
 */
function resolveByWaEvent(
    waEvent: WhatsAppEvent,
    role: WhatsAppAudienceRole,
    opts?: { hasInvoice?: boolean },
): string | null {
    switch (waEvent) {
        case 'STORE_ACTIVATION':
            return role === 'MERCHANT' ? 'welcome_vendor' : null;
        case 'STORE_UNDER_REVIEW':
            return role === 'MERCHANT' ? 'txn_store_under_review' : null;
        case 'CHAT_MESSAGE':
            return 'txn_chat_message';
        case 'DOCUMENT':
            return role === 'MERCHANT' ? 'txn_document_vendor' : null;
        case 'WAYBILL_ISSUED':
            return waybillFamily(role);
        case 'VERIFICATION':
            return verificationFamily(role);
        case 'SHIPMENT_STATUS':
            return shipmentFamily(role);
        case 'PAYMENT_SUCCESS':
        case 'INVOICE_ISSUED':
            if (opts?.hasInvoice) return invoiceFamily(role);
            return orderFamily(role);
        case 'ORDER_CREATED':
        case 'ORDER_STATUS':
        case 'OFFER_REVEAL':
        case 'OFFER_ACCEPTED':
            return orderFamily(role);
        case 'OFFER_BIDDING_RESTRICTED':
            return role === 'MERCHANT' ? 'txn_offer_restriction_vendor' : null;
        case 'VIOLATION_ISSUED':
            return role === 'MERCHANT' ? 'txn_violation_vendor' : 'txn_violation_customer';
        default:
            return null;
    }
}

/**
 * Maps in-app notification → Widers template family base (without _ar/_en suffix).
 */
export function resolveTemplateFamily(
    input: NotificationDispatchInput,
    role: WhatsAppAudienceRole,
    opts?: { hasInvoice?: boolean },
): string | null {
    const type = (input.type ?? '').toUpperCase();
    const docType = String(input.metadata?.docType ?? '');
    const waEvent = extractWaEvent(input.metadata);

    // Explicit waEvent wins — including DOCUMENT over blocked ALERT/SYSTEM types
    if (waEvent) {
        const fromEvent = resolveByWaEvent(waEvent, role, opts);
        if (fromEvent) return fromEvent;
        // STORE_ACTIVATION for customer etc. → fall through only if null intentionally
        if (ORDER_WA_EVENTS.has(waEvent) || waEvent === 'SHIPMENT_STATUS') {
            return fromEvent;
        }
    }

    // Blocked types (unless waEvent DOCUMENT already handled above)
    if (['REFERRAL', 'CHAT', 'FINANCIAL', 'WALLET', 'SYSTEM'].includes(type)) {
        return null;
    }

    // Store under review (register / PENDING_REVIEW)
    if (role === 'MERCHANT' && docType === 'store_under_review') {
        return 'txn_store_under_review';
    }

    // Store activation → welcome_vendor (PHASE0 / Meta header: تم تفعيل متجرك بنجاح)
    if (role === 'MERCHANT' && docType === 'store_activation') {
        return 'welcome_vendor';
    }

    if (isDocumentNotification(input, role)) {
        return 'txn_document_vendor';
    }

    if (type === 'OFFER') {
        return orderFamily(role);
    }

    if (type === 'SHIPMENT_UPDATE') {
        return shipmentFamily(role);
    }

    if (type === 'PAYMENT' || type === 'payment') {
        if (isPaymentFailure(input)) return null;
        if (opts?.hasInvoice) {
            return invoiceFamily(role);
        }
        return orderFamily(role);
    }

    if (type === 'ORDER_UPDATE' || type === 'order_update') {
        if (isWaybillNotification(input)) {
            return waybillFamily(role);
        }
        if (isVerificationNotification(input)) {
            return verificationFamily(role);
        }
        return orderFamily(role);
    }

    // ORDER → txn_order_* (or verification when flagged)
    if (type === 'ORDER') {
        if (isVerificationNotification(input)) {
            return verificationFamily(role);
        }
        return orderFamily(role);
    }

    // SYSTEM_ALERT without explicit waEvent must NOT become txn_order_* (spam / wrong template).
    // Intentional WA uses metadata.waEvent (ORDER_STATUS, VERIFICATION, …) handled above.
    if (type === 'SYSTEM_ALERT' || type === 'system_alert') {
        if (isVerificationNotification(input)) {
            return verificationFamily(role);
        }
        return null;
    }

    if (['ALERT', 'SECURITY'].includes(type)) {
        return null;
    }

    return null;
}
