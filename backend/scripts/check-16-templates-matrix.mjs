/**
 * Zero-send matrix: expected APPROVED templates vs Meta/Widers list.
 * Order/shipment use _ar_v3 (required). Retired _ar_v2 order/shipment are optional-gone.
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
  'txn_shipment_merchant_ar_v3',
  'txn_shipment_customer_ar_v3',
  'txn_order_merchant_ar_v3',
  'txn_order_customer_ar_v3',
  'txn_offer_restriction_vendor_ar_v2',
  'txn_violation_customer_ar_v2',
  'txn_violation_vendor_ar_v2',
];

/** Retired — safe to delete in Meta after Nest cutover to v3 */
const RETIRED_V2 = [
  'txn_order_customer_ar_v2',
  'txn_order_merchant_ar_v2',
  'txn_shipment_customer_ar_v2',
  'txn_shipment_merchant_ar_v2',
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

console.log('\n--- retired order/shipment v2 (delete in Meta when ready) ---');
for (const e of RETIRED_V2) {
  console.log(names.has(e) ? 'STILL_PRESENT (delete OK)' : 'GONE', e);
}

if (missingRequired === 0) {
  console.log(`\nMATRIX required ${REQUIRED.length}/${REQUIRED.length} OK`);
} else {
  console.log(`\nMISSING required ${missingRequired}`);
}
process.exit(missingRequired === 0 ? 0 : 1);
