#!/usr/bin/env node
/** Audit only — 0 sends. Compare Meta template vars vs Nest registry expectations. */
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

// Nest registry body field counts (from template-registry.ts)
const nestBody = {
  auth_otp_customer_ar_v2: 1,
  auth_otp_vendor_ar_v2: 1,
  auth_otp_admin_ar_v2: 1,
  welcome_customer_ar_v2: 1,
  welcome_vendor_ar_v2: 1,
  txn_order_customer_ar_v2: 3,
  txn_order_merchant_ar_v2: 3,
  txn_shipment_customer_ar_v2: 4,
  txn_shipment_merchant_ar_v2: 4,
  // v3: body {{4}} = Nest-generated follow_url; no URL button
  txn_order_customer_ar_v3: 4,
  txn_order_merchant_ar_v3: 4,
  txn_shipment_customer_ar_v3: 4,
  txn_shipment_merchant_ar_v3: 4,
  txn_invoice_customer_ar_v2: 5,
  txn_invoice_merchant_ar_v2: 5,
  txn_waybill_customer_ar_v2: 3,
  txn_waybill_merchant_ar_v2: 3,
  txn_document_vendor_ar_v2: 3,
  txn_verification_customer_ar_v2: 3,
  txn_verification_vendor_ar_v2: 3,
};

function countPlaceholders(text) {
  if (!text) return 0;
  const ms = String(text).match(/\{\{(\d+)\}\}/g);
  if (!ms) return 0;
  return Math.max(...ms.map((m) => Number(m.replace(/\D/g, ''))));
}

const res = await fetch(`${api}/getTemplates?token=${encodeURIComponent(token)}`);
const j = await res.json();
const templates = j.templates || [];

const rows = [];
for (const t of templates) {
  let comps = t.components;
  if (typeof comps === 'string') {
    try {
      comps = JSON.parse(comps);
    } catch {
      comps = [];
    }
  }
  const body = comps.find((c) => String(c.type).toUpperCase() === 'BODY');
  const header = comps.find((c) => String(c.type).toUpperCase() === 'HEADER');
  const buttons = comps.find((c) => String(c.type).toUpperCase() === 'BUTTONS');
  const bodyVars = countPlaceholders(body?.text);
  const headerVars = countPlaceholders(header?.text);
  let buttonVars = 0;
  const buttonUrls = [];
  for (const b of buttons?.buttons || []) {
    const n = countPlaceholders(b.url || b.text || '');
    buttonVars += n;
    buttonUrls.push({ type: b.type, url: b.url, vars: n });
  }
  const nest = nestBody[t.name];
  rows.push({
    name: t.name,
    cat: t.category,
    bodyVars,
    headerVars,
    buttonVars,
    nestBody: nest ?? 'MISSING',
    match: nest === bodyVars ? 'OK' : nest == null ? 'NOT_IN_NEST' : 'MISMATCH',
    headerText: header?.text || null,
    bodyPreview: String(body?.text || '').slice(0, 80).replace(/\n/g, ' '),
    buttons: buttonUrls,
  });
}

rows.sort((a, b) => a.name.localeCompare(b.name));
console.log(JSON.stringify(rows, null, 2));
console.log('\n=== MISMATCHES / GAPS ===');
for (const r of rows) {
  if (r.match !== 'OK') console.log(r.match, r.name, 'metaBody=', r.bodyVars, 'nest=', r.nestBody, 'hdr=', r.headerVars, 'btn=', r.buttonVars);
}
