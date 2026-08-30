#!/usr/bin/env node
/**
 * Live send probe for order/shipment _ar_v3 + control templates (welcome/invoice).
 * Success = message_wamid starts with wamid.
 * Uses WIDERS_API_TOKEN + WIDERS_TEST_PHONE from backend/.env — never logs secrets.
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
const origin = (get('FRONTEND_URL') || 'https://e-tashleh.net').replace(/\/$/, '');
const orderId = '00000000-0000-4000-8000-000000000001';

const TEMPLATES = [
  // Control: known-good other templates (same send shape: body only / static button ignored)
  { name: 'welcome_customer_ar_v2', body: ['اختبار'] },
  {
    name: 'txn_invoice_customer_ar_v2',
    body: ['اختبار', 'ORD-V3', 'INV-1', '100 AED', 'ملخص تجريبي'],
  },
  // Under test: order/shipment v3 — 4 body vars, {{4}} = absolute follow_url, NO button
  {
    name: 'txn_order_customer_ar_v3',
    body: [
      'اختبار',
      'ORD-V3',
      'تم التجهيز',
      `${origin}/dashboard/order-details/${orderId}`,
    ],
  },
  {
    name: 'txn_order_merchant_ar_v3',
    body: [
      'اختبار',
      'ORD-V3',
      'عرض جديد',
      `${origin}/dashboard/explore-offer/${orderId}`,
    ],
  },
  {
    name: 'txn_shipment_customer_ar_v3',
    body: [
      'اختبار',
      'ORD-V3',
      'تم الشحن | رقم التتبع: TRK-1',
      `${origin}/dashboard/order-details/${orderId}?tab=waybills`,
    ],
  },
  {
    name: 'txn_shipment_merchant_ar_v3',
    body: [
      'اختبار',
      'ORD-V3',
      'تم الشحن | رقم التتبع: TRK-1',
      `${origin}/dashboard/explore-offer/${orderId}?tab=waybills`,
    ],
  },
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

if (!token || !phone) {
  console.error('WIDERS_API_TOKEN and WIDERS_TEST_PHONE required in backend/.env');
  process.exit(1);
}

console.log('Phone:', phone.replace(/\d(?=\d{4})/g, '*'), '| templates:', TEMPLATES.length);

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
    bodyN: t.body.length,
    wamid: ok ? send.message_wamid.slice(0, 24) + '…' : null,
    error: ok ? null : send.error || send.message || JSON.stringify(send).slice(0, 180),
  };
  results.push(row);
  console.log(ok ? 'OK' : 'FAIL', t.name, `| body=${t.body.length}`, ok ? '' : `| ${row.error}`);
  await sleep(1200);
}

const v3 = results.filter((r) => r.name.includes('_ar_v3'));
const controls = results.filter((r) => !r.name.includes('_ar_v3'));
console.log('\n======== SUMMARY ========');
console.log(`Controls OK ${controls.filter((r) => r.ok).length}/${controls.length}`);
console.log(`v3 OK ${v3.filter((r) => r.ok).length}/${v3.length}`);
console.log(`Total OK ${results.filter((r) => r.ok).length}/${results.length}`);
process.exit(v3.every((r) => r.ok) ? 0 : 1);
