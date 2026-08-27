#!/usr/bin/env node
/**
 * Compare TEMPLATE_REGISTRY with Widers getTemplates API.
 * Usage: node scripts/widers-template-audit.mjs
 * Requires: WIDERS_API_TOKEN, optional WIDERS_API_BASE_URL
 *
 * Order/shipment v3 are soft-checked (warn only) until Meta APPROVED.
 */
const baseUrl = (
    process.env.WIDERS_API_BASE_URL?.trim() || 'https://apps.widers.net'
).replace(/\/$/, '');
const token = process.env.WIDERS_API_TOKEN?.trim();

const REQUIRED_NAMES = [
    'auth_otp_customer_ar_v2',
    'auth_otp_vendor_ar_v2',
    'auth_otp_admin_ar_v2',
    'txn_order_customer_ar_v2',
    'txn_order_merchant_ar_v2',
    'txn_shipment_customer_ar_v2',
    'txn_shipment_merchant_ar_v2',
    'txn_invoice_customer_ar_v2',
    'txn_invoice_merchant_ar_v2',
    'txn_waybill_customer_ar_v2',
    'txn_waybill_merchant_ar_v2',
    'txn_document_vendor_ar_v2',
    'txn_verification_customer_ar_v2',
    'txn_verification_vendor_ar_v2',
    'welcome_customer_ar_v2',
    'welcome_vendor_ar_v2',
];

const OPTIONAL_V3_NAMES = [
    'txn_order_customer_ar_v3',
    'txn_order_merchant_ar_v3',
    'txn_shipment_customer_ar_v3',
    'txn_shipment_merchant_ar_v3',
];

async function main() {
    if (!token) {
        console.error('WIDERS_API_TOKEN is required');
        process.exit(1);
    }

    const apiPath = baseUrl.endsWith('/api/wpbox')
        ? `${baseUrl}/getTemplates`
        : `${baseUrl}/api/wpbox/getTemplates`;
    const url = `${apiPath}?token=${encodeURIComponent(token)}`;

    const res = await fetch(url, { headers: { Accept: 'application/json' } });
    const text = await res.text();
    let parsed;
    try {
        parsed = JSON.parse(text);
    } catch {
        console.error('Invalid JSON from Widers API:', text.slice(0, 200));
        process.exit(1);
    }

    const data = parsed.data ?? parsed.templates ?? parsed;
    const apiNames = new Set();
    if (Array.isArray(data)) {
        for (const item of data) {
            if (typeof item === 'string') apiNames.add(item.toLowerCase());
            else if (item && typeof item === 'object') {
                const n = item.name ?? item.template_name ?? item.templateName;
                if (typeof n === 'string') apiNames.add(n.toLowerCase());
            }
        }
    }

    const missingRequired = REQUIRED_NAMES.filter(
        (name) => !apiNames.has(name.toLowerCase()),
    );
    const missingV3 = OPTIONAL_V3_NAMES.filter(
        (name) => !apiNames.has(name.toLowerCase()),
    );

    console.log(`Required: ${REQUIRED_NAMES.length} | Optional v3: ${OPTIONAL_V3_NAMES.length}`);
    console.log(`Widers API: ${apiNames.size} templates`);

    if (missingV3.length) {
        console.warn('Pending order/shipment v3 in Widers (non-fatal):');
        for (const m of missingV3) console.warn(`  - ${m}`);
    } else {
        console.log('OK — order/shipment v3 templates present');
    }

    if (missingRequired.length === 0) {
        console.log('OK — all required registry templates found in Widers API');
        process.exit(0);
    }

    console.error('Missing required in Widers API:');
    for (const m of missingRequired) console.error(`  - ${m}`);
    process.exit(1);
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
