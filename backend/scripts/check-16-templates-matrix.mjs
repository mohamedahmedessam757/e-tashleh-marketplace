/**
 * Zero-send matrix: expected APPROVED templates vs Meta/Widers list.
 * Order/shipment v3 are optional until Meta APPROVED + cutover.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const env = fs.readFileSync(path.join(__dirname, '..', '.env'), 'utf8');
const get = (k) => {
  const m = env.match(new RegExp(`^${k}=(.*)$`, 'm'));
  return m?.[1]?.replace(/^["']|["']$/g, '').trim();
};

const token = get('WIDERS_API_TOKEN');
const base = (get('WIDERS_API_BASE_URL') || 'https://apps.widers.net').replace(/\/$/, '');
const api = base.endsWith('/api/wpbox') ? base : `${base}/api/wpbox`;

const REQUIRED = [
  'auth_otp_admin_ar_v2',
  'auth_otp_vendor_ar_v2',
  'auth_otp_customer_ar_v2',
  'welcome_vendor_ar_v2',
  'welcome_customer_ar_v2',
  'txn_verification_vendor_ar_v2',
  'txn_verification_customer_ar_v2',
  'txn_document_vendor_ar_v2',
  'txn_waybill_merchant_ar_v2',
  'txn_waybill_customer_ar_v2',
  'txn_invoice_merchant_ar_v2',
  'txn_invoice_customer_ar_v2',
  'txn_shipment_merchant_ar_v2',
  'txn_shipment_customer_ar_v2',
  'txn_order_merchant_ar_v2',
  'txn_order_customer_ar_v2',
  'txn_offer_restriction_vendor_ar_v2',
  'txn_violation_customer_ar_v2',
  'txn_violation_vendor_ar_v2',
];

/** Body follow_url, no URL button — create in Meta before setting WIDERS_ORDER_SHIPMENT_TEMPLATE_VERSION=v3 */
const OPTIONAL_V3 = [
  'txn_order_customer_ar_v3',
  'txn_order_merchant_ar_v3',
  'txn_shipment_customer_ar_v3',
  'txn_shipment_merchant_ar_v3',
];

const res = await fetch(`${api}/getTemplates?token=${encodeURIComponent(token)}`);
const data = await res.json();
const list = data.templates || [];
const names = new Set(list.map((t) => t.name).filter(Boolean));

console.log('Meta/Widers templates fetched:', names.size);
let missingRequired = 0;
for (const e of REQUIRED) {
  const ok = names.has(e);
  if (!ok) missingRequired++;
  console.log(ok ? 'OK' : 'MISSING', e);
}

console.log('\n--- order/shipment v3 (optional until APPROVED) ---');
let missingV3 = 0;
for (const e of OPTIONAL_V3) {
  const ok = names.has(e);
  if (!ok) missingV3++;
  console.log(ok ? 'OK' : 'PENDING', e);
}

if (missingRequired === 0) {
  console.log(`\nMATRIX required ${REQUIRED.length}/${REQUIRED.length} OK`);
} else {
  console.log(`\nMISSING required ${missingRequired}`);
}
console.log(
  missingV3 === 0
    ? `v3 ready ${OPTIONAL_V3.length}/${OPTIONAL_V3.length}`
    : `v3 pending ${missingV3}/${OPTIONAL_V3.length} (safe — production stays on v2)`,
);
process.exit(missingRequired === 0 ? 0 : 1);
