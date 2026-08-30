#!/usr/bin/env node
/**
 * One send per non-OTP template. Success = message_wamid starts with wamid.
 * Phone: WIDERS_TEST_PHONE (must be real WhatsApp — use +971525700525).
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
const phone = get('WIDERS_TEST_PHONE');
const base = (get('WIDERS_API_BASE_URL') || 'https://apps.widers.net').replace(/\/$/, '');
const api = base.endsWith('/api/wpbox') ? base : `${base}/api/wpbox`;

/** Exact body params matching Nest registry + Meta {{n}} counts */
const TEMPLATES = [
  { name: 'welcome_customer_ar_v2', body: ['عبدالكريم'] },
  { name: 'welcome_vendor_ar_v2', body: ['عبدالكريم'] },
  {
    name: 'txn_order_customer_ar_v3',
    body: [
      'عبدالكريم',
      'ORD-1',
      'تم التجهيز',
      'https://e-tashleh.net/dashboard/order-details/00000000-0000-4000-8000-000000000001',
    ],
  },
  {
    name: 'txn_order_merchant_ar_v3',
    body: [
      'عبدالكريم',
      'ORD-1',
      'تم التجهيز',
      'https://e-tashleh.net/dashboard/explore-offer/00000000-0000-4000-8000-000000000001',
    ],
  },
  {
    name: 'txn_shipment_customer_ar_v3',
    body: [
      'عبدالكريم',
      'ORD-1',
      'تم الشحن',
      'https://e-tashleh.net/dashboard/order-details/00000000-0000-4000-8000-000000000001?tab=waybills',
    ],
  },
  {
    name: 'txn_shipment_merchant_ar_v3',
    body: [
      'عبدالكريم',
      'ORD-1',
      'تم الشحن',
      'https://e-tashleh.net/dashboard/explore-offer/00000000-0000-4000-8000-000000000001?tab=waybills',
    ],
  },
  { name: 'txn_invoice_customer_ar_v2', body: ['عبدالكريم', 'ORD-1', 'INV-1', '100 AED', 'ملخص تجريبي'] },
  { name: 'txn_invoice_merchant_ar_v2', body: ['عبدالكريم', 'ORD-1', 'INV-1', '100 AED', 'ملخص تجريبي'] },
  { name: 'txn_waybill_customer_ar_v2', body: ['عبدالكريم', 'ORD-1', 'بوليصة جاهزة'] },
  { name: 'txn_waybill_merchant_ar_v2', body: ['عبدالكريم', 'ORD-1', 'بوليصة جاهزة'] },
  { name: 'txn_document_vendor_ar_v2', body: ['متجر تجريبي', 'رخصة تجارية', 'مقبول'] },
  { name: 'txn_verification_customer_ar_v2', body: ['عبدالكريم', 'ORD-1', 'تم التوثيق'] },
  { name: 'txn_verification_vendor_ar_v2', body: ['عبدالكريم', 'ORD-1', 'تم التوثيق'] },
];

async function post(seg, body) {
  const res = await fetch(`${api}/${seg}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, ...body }),
  });
  return res.json();
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

console.log('Phone:', phone, '| templates:', TEMPLATES.length, '(1 each, no OTP)\n');

const results = [];
for (const t of TEMPLATES) {
  const components = [
    {
      type: 'body',
      parameters: t.body.map((text) => ({ type: 'text', text })),
    },
  ];
  const send = await post('sendtemplatemessage', {
    phone,
    template_name: t.name,
    template_language: 'ar',
    components,
  });
  const ok =
    typeof send.message_wamid === 'string' && send.message_wamid.startsWith('wamid');
  const row = {
    name: t.name,
    ok,
    id: send.message_id,
    wamid: send.message_wamid,
    bodyN: t.body.length,
    error: send.error || send.message || null,
  };
  results.push(row);
  console.log(ok ? '✅' : '❌', t.name, `| body=${t.body.length}`, `| id=${send.message_id}`, ok ? '' : `| ${JSON.stringify(send).slice(0, 200)}`);
  await sleep(1200); // gentle spacing, still one attempt each
}

// If any failed, pull getMessages errors for contact
const failed = results.filter((r) => !r.ok);
if (failed.length) {
  console.log('\n--- fetching errors for failed ---');
  const mc = await post('makeContact', { phone, name: 'adb_alkarem' });
  const contactId = mc.contact?.id;
  if (contactId) {
    const msgs = await post('getMessages', { contact_id: contactId });
    const byId = new Map((msgs.data || []).map((m) => [m.id, m]));
    for (const f of failed) {
      const m = byId.get(f.id);
      console.log(f.name, '→', m?.error || '(no message row)', '| comps:', String(m?.components || '').slice(0, 120));
    }
  }
}

console.log('\n======== SUMMARY ========');
console.log(`OK ${results.filter((r) => r.ok).length}/${results.length}`);
for (const r of results) console.log(r.ok ? '✅' : '❌', r.name);
process.exit(failed.length ? 1 : 0);
