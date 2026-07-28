import type {
    WidersAudience,
    WidersTemplateCategory,
    WidersTemplateLanguage,
} from './widers.types';

/** Semantic keys sent by WhatsAppChannelService — mapped to {{1}}…{{n}} in order */
export type TemplateBodyField =
    | 'name'
    | 'otp_code'
    | 'order_number'
    | 'status_detail'
    | 'tracking_number'
    | 'invoice_number'
    | 'amount'
    | 'summary'
    | 'store_name'
    | 'doc_type';

export interface TemplateDefinition {
    name: string;
    language: WidersTemplateLanguage;
    category: WidersTemplateCategory;
    audience: WidersAudience;
    headerText?: string;
    bodyFields: TemplateBodyField[];
    buttonLabel?: string;
    /** Path after `/dashboard/` — may include `{orderId}`, `{offerId}` placeholders */
    buttonSuffixPattern?: string;
    /** False when Widers button URL is fully static (no {{1}} suffix) */
    buttonUrlDynamic?: boolean;
}

const suffix = {
    orderCustomer: 'order-details/{orderId}',
    orderMerchant: 'explore-offer/{orderId}',
    invoiceCustomer: 'order-details/{orderId}?tab=invoices&offerId={offerId}',
    invoiceMerchant: 'explore-offer/{orderId}?tab=invoices&offerId={offerId}',
    waybillCustomer: 'order-details/{orderId}?tab=waybills',
    waybillMerchant: 'explore-offer/{orderId}?tab=waybills',
    storeHome: 'home',
} as const;

function def(
    baseName: string,
    language: WidersTemplateLanguage,
    audience: WidersAudience,
    bodyFields: TemplateBodyField[],
    opts: Partial<Omit<TemplateDefinition, 'name' | 'language' | 'audience' | 'bodyFields'>> = {},
): TemplateDefinition {
    return {
        name: `${baseName}_${language}_v2`,
        language,
        audience,
        category: opts.category ?? 'UTILITY',
        bodyFields,
        ...opts,
    };
}

/** Mirrors Widers Dashboard templates — single source of truth for dispatch */
export const TEMPLATE_REGISTRY: TemplateDefinition[] = [
    // OTP — Meta AUTHENTICATION (body {{1}} = otp_code + copy-code button)
    def('auth_otp_customer', 'ar', 'customer', ['otp_code'], {
        category: 'AUTHENTICATION',
        buttonUrlDynamic: false,
    }),
    def('auth_otp_vendor', 'ar', 'vendor', ['otp_code'], {
        category: 'AUTHENTICATION',
        buttonUrlDynamic: false,
    }),
    def('auth_otp_admin', 'ar', 'admin', ['otp_code'], {
        category: 'AUTHENTICATION',
        buttonUrlDynamic: false,
    }),

    // Orders — Meta button URLs are static (no {{n}}); do not send button params
    def('txn_order_customer', 'ar', 'customer', ['name', 'order_number', 'status_detail'], {
        headerText: 'تحديث حالة الطلب',
        buttonLabel: 'عرض الطلب',
        buttonSuffixPattern: suffix.orderCustomer,
        buttonUrlDynamic: false,
    }),
    def('txn_order_merchant', 'ar', 'merchant', ['name', 'order_number', 'status_detail'], {
        headerText: 'تحديث حالة الطلب',
        buttonLabel: 'فتح الطلب',
        buttonSuffixPattern: suffix.orderMerchant,
        buttonUrlDynamic: false,
    }),

    // Shipments
    def('txn_shipment_customer', 'ar', 'customer', [
        'name',
        'order_number',
        'status_detail',
        'tracking_number',
    ], {
        headerText: 'تحديث الشحن',
        buttonLabel: 'تتبع الشحنة',
        buttonSuffixPattern: suffix.orderCustomer,
        buttonUrlDynamic: false,
    }),
    def('txn_shipment_merchant', 'ar', 'merchant', [
        'name',
        'order_number',
        'status_detail',
        'tracking_number',
    ], {
        headerText: 'تحديث شحن الطلب',
        buttonLabel: 'فتح الطلب',
        buttonSuffixPattern: suffix.orderMerchant,
        buttonUrlDynamic: false,
    }),

    // Invoices (per offer)
    def('txn_invoice_customer', 'ar', 'customer', [
        'name',
        'order_number',
        'invoice_number',
        'amount',
        'summary',
    ], {
        headerText: 'فاتورة جاهزة',
        buttonLabel: 'عرض الفاتورة',
        buttonSuffixPattern: suffix.invoiceCustomer,
        buttonUrlDynamic: false,
    }),
    def('txn_invoice_merchant', 'ar', 'merchant', [
        'name',
        'order_number',
        'invoice_number',
        'amount',
        'summary',
    ], {
        headerText: 'فاتورة جديدة',
        buttonLabel: 'عرض الفاتورة',
        buttonSuffixPattern: suffix.invoiceMerchant,
        buttonUrlDynamic: false,
    }),

    // Waybills
    def('txn_waybill_customer', 'ar', 'customer', ['name', 'order_number', 'status_detail'], {
        headerText: 'بوليصة الشحن',
        buttonLabel: 'عرض البوليصة',
        buttonSuffixPattern: suffix.waybillCustomer,
        buttonUrlDynamic: false,
    }),
    def('txn_waybill_merchant', 'ar', 'merchant', ['name', 'order_number', 'status_detail'], {
        headerText: 'بوليصة الشحن',
        buttonLabel: 'عرض البوليصة',
        buttonSuffixPattern: suffix.waybillMerchant,
        buttonUrlDynamic: false,
    }),

    // Store documents (vendor only)
    def('txn_document_vendor', 'ar', 'vendor', ['store_name', 'doc_type', 'status_detail'], {
        headerText: 'مستندات المتجر',
        buttonLabel: 'فتح لوحة المتجر',
        buttonSuffixPattern: suffix.storeHome,
        buttonUrlDynamic: false,
    }),

    // Offer bidding restriction (vendor)
    // Body: {{1}} name · {{2}} store_name · {{3}} status_detail
    def('txn_offer_restriction_vendor', 'ar', 'merchant', ['name', 'store_name', 'status_detail'], {
        headerText: 'تقييد تقديم العروض',
        buttonLabel: 'فتح اللوحة',
        buttonSuffixPattern: suffix.storeHome,
        buttonUrlDynamic: false,
    }),

    // Violations & penalties
    // Customer: {{1}} name · {{2}} status_detail
    def('txn_violation_customer', 'ar', 'customer', ['name', 'status_detail'], {
        headerText: 'تنبيه مخالفة',
        buttonLabel: 'عرض المخالفات',
        buttonSuffixPattern: 'violations',
        buttonUrlDynamic: false,
    }),
    // Vendor: {{1}} name · {{2}} store_name · {{3}} status_detail
    def('txn_violation_vendor', 'ar', 'merchant', ['name', 'store_name', 'status_detail'], {
        headerText: 'تنبيه مخالفة للمتجر',
        buttonLabel: 'عرض المخالفات',
        buttonSuffixPattern: 'violations',
        buttonUrlDynamic: false,
    }),

    // Part verification
    def('txn_verification_customer', 'ar', 'customer', ['name', 'order_number', 'status_detail'], {
        headerText: 'توثيق الطلب',
        buttonLabel: 'عرض الطلب',
        buttonSuffixPattern: suffix.orderCustomer,
        buttonUrlDynamic: false,
    }),
    def('txn_verification_vendor', 'ar', 'merchant', ['name', 'order_number', 'status_detail'], {
        headerText: 'توثيق الطلب',
        buttonLabel: 'فتح الطلب',
        buttonSuffixPattern: suffix.orderMerchant,
        buttonUrlDynamic: false,
    }),

    // Marketing welcome — body {{1}} only; button URL is static in Widers (no API suffix)
    def('welcome_customer', 'ar', 'customer', ['name'], {
        category: 'MARKETING',
        buttonLabel: 'ابدأ الآن',
        buttonUrlDynamic: false,
    }),
    def('welcome_vendor', 'ar', 'vendor', ['name'], {
        category: 'UTILITY',
        buttonLabel: 'ابدأ الآن',
        buttonUrlDynamic: false,
    }),
];

const registryByName = new Map(
    TEMPLATE_REGISTRY.map((t) => [t.name, t]),
);

export function getTemplateDefinition(name: string): TemplateDefinition | undefined {
    return registryByName.get(name);
}

/** Widers/Meta template suffix after full Arabic rebuild (June 2026). */
export const TEMPLATE_NAME_VERSION_SUFFIX = '_v2';

export function resolveTemplateName(
    familyBase: string,
    language: WidersTemplateLanguage,
): string {
    return `${familyBase}_${language}${TEMPLATE_NAME_VERSION_SUFFIX}`;
}

/** Meta/WhatsApp per-variable body limit (safe default) */
export const WHATSAPP_BODY_PARAM_MAX = 1024;

/**
 * Meta rejects many body-variable shapes (#100): newlines, tabs,
 * long space runs, and frequently emoji / variation selectors.
 */
export function sanitizeWhatsAppParam(value: string): string {
    return value
        .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE00}-\u{FE0F}\u{200D}\u{20E3}]/gu, '')
        .replace(/[\r\n\t]+/g, ' ')
        .replace(/ {5,}/g, '    ')
        .replace(/\s+/g, ' ')
        .trim();
}

export function truncateWhatsAppParam(value: string, max = WHATSAPP_BODY_PARAM_MAX): string {
    const trimmed = sanitizeWhatsAppParam(value);
    if (trimmed.length <= max) return trimmed || '-';
    return `${trimmed.slice(0, max - 1)}…`;
}

export function buildButtonSuffix(
    pattern: string,
    vars: { orderId?: string; offerId?: string },
): string {
    return pattern
        .replace('{orderId}', vars.orderId ?? '')
        .replace('{offerId}', vars.offerId ?? '');
}
