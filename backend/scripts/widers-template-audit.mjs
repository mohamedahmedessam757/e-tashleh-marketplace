#!/usr/bin/env node
/**
 * Compare TEMPLATE_REGISTRY with Widers getTemplates API.
 * Usage: node scripts/widers-template-audit.mjs
 * Requires: WIDERS_API_TOKEN, optional WIDERS_API_BASE_URL
 */
const baseUrl = (
    process.env.WIDERS_API_BASE_URL?.trim() || 'https://apps.widers.net'
).replace(/\/$/, '');
const token = process.env.WIDERS_API_TOKEN?.trim();

const REGISTRY_NAMES = [
    'auth_otp_customer_ar',
    'auth_otp_vendor_ar',
    'txn_order_customer_ar',
    'txn_order_merchant_ar',
    'txn_shipment_customer_ar',
    'txn_shipment_merchant_ar',
    'txn_invoice_customer_ar',
    'txn_invoice_merchant_ar',
    'txn_waybill_customer_ar',
    'txn_waybill_merchant_ar',
    'txn_document_vendor_ar',
    'txn_verification_customer_ar',
    'txn_verification_merchant_ar',
    'welcome_customer_ar',
    'welcome_vendor_ar',
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

    const missing = REGISTRY_NAMES.filter((name) => {
        const lower = name.toLowerCase();
        const base = lower.replace(/_ar$/, '');
        return !apiNames.has(lower) && ![...apiNames].some((a) => a.includes(base));
    });

    console.log(`Registry: ${REGISTRY_NAMES.length} templates`);
    console.log(`Widers API: ${apiNames.size} templates`);
    if (missing.length === 0) {
        console.log('OK — all registry templates found in Widers API');
        process.exit(0);
    }

    console.error('Missing in Widers API:');
    for (const m of missing) console.error(`  - ${m}`);
    process.exit(1);
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
