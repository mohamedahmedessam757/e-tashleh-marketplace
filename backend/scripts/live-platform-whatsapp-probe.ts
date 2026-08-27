/**
 * Live platform-path probe without Nest DI:
 * 1) resolveTemplateFamily (same mapper as production)
 * 2) sendByFamily / sendOtp via WidersService (same channel builders)
 *
 * This mirrors NotificationsService → maybeSend → sendByFamily.
 *
 *   npx tsx scripts/live-platform-whatsapp-probe.ts
 *   npx tsx scripts/live-platform-whatsapp-probe.ts --families=welcome_vendor,txn_order_merchant
 */
import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  resolveTemplateFamily,
  type NotificationDispatchInput,
  type WhatsAppAudienceRole,
} from '../src/widers/whatsapp-notification.mapper';
import {
  getTemplateDefinition,
  resolveTemplateName,
  truncateWhatsAppParam,
  type TemplateBodyField,
} from '../src/widers/template-registry';
import {
  buildAuthOtpSendAttempts,
  buildTemplateComponentVariants,
  buildWelcomeSendAttempts,
  resolveTemplateBodyValue,
} from '../src/widers/widers-template-components.util';
import { createStandalonePrismaClient } from '../src/prisma/create-standalone-client';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

type Case = {
  family: string;
  role: WhatsAppAudienceRole;
  input: NotificationDispatchInput;
  fields: Partial<Record<TemplateBodyField, string>>;
};

const CASES: Case[] = [
  {
    family: 'welcome_vendor',
    role: 'MERCHANT',
    input: {
      recipientRole: 'MERCHANT',
      type: 'SUCCESS',
      titleAr: 'تم تفعيل متجرك المشترك!',
      titleEn: 'Store activated',
      messageAr: 'مبروك! تم اعتماد متجرك.',
      messageEn: 'Approved.',
      metadata: { docType: 'store_activation' },
    },
    fields: { name: 'ABD_ALKAREM' },
  },
  {
    family: 'txn_order_customer',
    role: 'CUSTOMER',
    input: {
      recipientRole: 'CUSTOMER',
      type: 'ORDER',
      titleAr: 'تم استلام طلبك',
      titleEn: 'Order received',
      messageAr: 'طلب ORD-PROBE قيد المراجعة',
      messageEn: 'ORD-PROBE under review',
      metadata: { orderNumber: 'ORD-PROBE' },
    },
    fields: { name: 'عميل', order_number: 'ORD-PROBE', status_detail: 'طلب ORD-PROBE قيد المراجعة', follow_url: 'https://e-tashleh.net/dashboard/order-details/00000000-0000-4000-8000-000000000001' },
  },
  {
    family: 'txn_order_merchant',
    role: 'MERCHANT',
    input: {
      recipientRole: 'MERCHANT',
      type: 'ORDER',
      titleAr: 'فرصة بيع جديدة',
      titleEn: 'New opportunity',
      messageAr: 'طلب جديد لسيارة تويوتا',
      messageEn: 'New Toyota request',
      metadata: { orderNumber: 'ORD-PROBE' },
    },
    fields: { name: 'ABD_ALKAREM', order_number: 'ORD-PROBE', status_detail: 'طلب جديد لسيارة تويوتا', follow_url: 'https://e-tashleh.net/dashboard/explore-offer/00000000-0000-4000-8000-000000000001' },
  },
  {
    family: 'txn_shipment_customer',
    role: 'CUSTOMER',
    input: {
      recipientRole: 'CUSTOMER',
      type: 'SHIPMENT_UPDATE',
      titleAr: 'تحديث شحنة',
      titleEn: 'Shipment',
      messageAr: 'تم الاستلام في المركز',
      messageEn: 'Received at hub',
    },
    fields: {
      name: 'عميل',
      order_number: 'ORD-PROBE',
      status_detail: 'تم الاستلام في المركز | رقم التتبع: TRK-1',
      tracking_number: 'https://e-tashleh.net/dashboard/order-details/00000000-0000-4000-8000-000000000001?tab=waybills',
      follow_url: 'https://e-tashleh.net/dashboard/order-details/00000000-0000-4000-8000-000000000001?tab=waybills',
    },
  },
  {
    family: 'txn_shipment_merchant',
    role: 'MERCHANT',
    input: {
      recipientRole: 'MERCHANT',
      type: 'SHIPMENT_UPDATE',
      titleAr: 'تحديث شحن',
      titleEn: 'Shipment',
      messageAr: 'تم الاستلام في المركز',
      messageEn: 'Received at hub',
    },
    fields: {
      name: 'ABD_ALKAREM',
      order_number: 'ORD-PROBE',
      status_detail: 'تم الاستلام في المركز | رقم التتبع: TRK-1',
      tracking_number: 'https://e-tashleh.net/dashboard/explore-offer/00000000-0000-4000-8000-000000000001?tab=waybills',
      follow_url: 'https://e-tashleh.net/dashboard/explore-offer/00000000-0000-4000-8000-000000000001?tab=waybills',
    },
  },
  {
    family: 'txn_invoice_customer',
    role: 'CUSTOMER',
    input: {
      recipientRole: 'CUSTOMER',
      type: 'payment',
      titleAr: 'فاتورة',
      titleEn: 'Invoice',
      messageAr: 'تم الدفع',
      messageEn: 'Paid',
      metadata: { invoiceNumber: 'INV-PROBE', amount: '150' },
    },
    fields: {
      name: 'عميل',
      order_number: 'ORD-PROBE',
      invoice_number: 'INV-PROBE',
      amount: '150 AED',
      summary: 'تم الدفع',
    },
  },
  {
    family: 'txn_invoice_merchant',
    role: 'MERCHANT',
    input: {
      recipientRole: 'MERCHANT',
      type: 'payment',
      titleAr: 'فاتورة',
      titleEn: 'Invoice',
      messageAr: 'دفعة مستلمة',
      messageEn: 'Payment received',
      metadata: { invoiceNumber: 'INV-PROBE', amount: '150' },
    },
    fields: {
      name: 'ABD_ALKAREM',
      order_number: 'ORD-PROBE',
      invoice_number: 'INV-PROBE',
      amount: '150 AED',
      summary: 'دفعة مستلمة',
    },
  },
  {
    family: 'txn_waybill_customer',
    role: 'CUSTOMER',
    input: {
      recipientRole: 'CUSTOMER',
      type: 'order_update',
      titleAr: 'بوليصة الشحن جاهزة',
      titleEn: 'Waybill ready',
      messageAr: 'تم إصدار بوليصة الشحن',
      messageEn: 'Waybill issued',
    },
    fields: { name: 'عميل', order_number: 'ORD-PROBE', status_detail: 'تم إصدار بوليصة الشحن' },
  },
  {
    family: 'txn_waybill_merchant',
    role: 'MERCHANT',
    input: {
      recipientRole: 'MERCHANT',
      type: 'order_update',
      titleAr: 'بوليصة الشحن جاهزة',
      titleEn: 'Waybill ready',
      messageAr: 'تم إصدار بوليصة الشحن',
      messageEn: 'Waybill issued',
    },
    fields: { name: 'ABD_ALKAREM', order_number: 'ORD-PROBE', status_detail: 'تم إصدار بوليصة الشحن' },
  },
  {
    family: 'txn_document_vendor',
    role: 'MERCHANT',
    input: {
      recipientRole: 'MERCHANT',
      type: 'DOC_EXPIRY',
      titleAr: 'تنبيه مستند',
      titleEn: 'Document',
      messageAr: 'اقترب انتهاء الرخصة',
      messageEn: 'License expiring',
      metadata: { docType: 'LICENSE' },
    },
    fields: {
      store_name: 'ELLIPP',
      doc_type: 'LICENSE',
      status_detail: 'اقترب انتهاء الرخصة',
    },
  },
  {
    family: 'txn_verification_customer',
    role: 'CUSTOMER',
    input: {
      recipientRole: 'CUSTOMER',
      type: 'ORDER',
      titleAr: 'توثيق',
      titleEn: 'Verification',
      messageAr: 'تم التوثيق',
      messageEn: 'Verified',
      metadata: { verification: true },
    },
    fields: { name: 'عميل', order_number: 'ORD-PROBE', status_detail: 'تم التوثيق' },
  },
  {
    family: 'txn_verification_vendor',
    role: 'MERCHANT',
    input: {
      recipientRole: 'MERCHANT',
      type: 'ORDER',
      titleAr: 'توثيق',
      titleEn: 'Verification',
      messageAr: 'تم التوثيق',
      messageEn: 'Verified',
      metadata: { verification: true },
    },
    fields: { name: 'ABD_ALKAREM', order_number: 'ORD-PROBE', status_detail: 'تم التوثيق' },
  },
];

function arg(name: string): string | undefined {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit?.slice(name.length + 3);
}

async function postTemplate(phone: string, templateName: string, bodyTexts: string[], isWelcome: boolean, isOtp = false, otpCode?: string) {
  const token = process.env.WIDERS_API_TOKEN;
  const base = (process.env.WIDERS_API_BASE_URL || 'https://apps.widers.net').replace(/\/$/, '');
  const api = base.endsWith('/api/wpbox') ? base : `${base}/api/wpbox`;

  let components;
  if (isOtp && otpCode) {
    components = buildAuthOtpSendAttempts(otpCode)[0]?.components;
  } else {
    const def = getTemplateDefinition(templateName)!;
    const attempts = isWelcome
      ? buildWelcomeSendAttempts({
          bodyTexts,
          bodyFields: def.bodyFields,
          contactName: bodyTexts[0] || 'مستخدم',
        })
      : buildTemplateComponentVariants({
          bodyTexts,
          bodyFields: def.bodyFields,
        });
    components = attempts[0]?.components;
  }

  const res = await fetch(`${api}/sendtemplatemessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      token,
      phone,
      template_name: templateName,
      template_language: 'ar',
      components,
    }),
  });
  return res.json();
}

async function main() {
  const phone =
    arg('phone') ||
    process.env.WIDERS_TEST_PHONE ||
    '+966565048183';

  if (process.env.WIDERS_ENABLED !== 'true') {
    console.error('WIDERS_ENABLED must be true');
    process.exit(1);
  }
  if (!process.env.WIDERS_API_TOKEN) {
    console.error('WIDERS_API_TOKEN missing');
    process.exit(1);
  }

  const familiesArg = arg('families');
  const wanted = familiesArg
    ? new Set(familiesArg.split(',').map((s) => s.trim()).filter(Boolean))
    : null;
  const cases = wanted ? CASES.filter((c) => wanted.has(c.family)) : CASES;

  console.log('Phone:', phone);
  console.log('Cases:', cases.map((c) => c.family).join(', '));
  console.log('');

  const prisma = createStandalonePrismaClient();
  const results: Array<Record<string, unknown>> = [];

  for (const c of cases) {
    const mapped = resolveTemplateFamily(c.input, c.role, {
      hasInvoice: Boolean(c.input.metadata?.invoiceNumber),
    });
    if (mapped !== c.family) {
      console.log('❌ mapper', c.family, '→', mapped);
      results.push({ family: c.family, ok: false, stage: 'mapper', got: mapped });
      continue;
    }

    const templateName = resolveTemplateName(c.family, 'ar');
    const def = getTemplateDefinition(templateName);
    if (!def) {
      results.push({ family: c.family, ok: false, stage: 'registry' });
      continue;
    }

    const bodyTexts = def.bodyFields.map((f) =>
      truncateWhatsAppParam(resolveTemplateBodyValue(f, c.fields[f])),
    );

    console.log(`→ ${c.family} (${templateName}) body=${bodyTexts.length}`);
    const send = await postTemplate(
      phone,
      templateName,
      bodyTexts,
      c.family.startsWith('welcome_'),
    );
    const ok =
      typeof send.message_wamid === 'string' && send.message_wamid.startsWith('wamid')
        ? true
        : Boolean(send.message_id) && !send.error;

    // Persist log like Nest (best-effort)
    try {
      await prisma.whatsAppMessageLog.create({
        data: {
          phone,
          templateName,
          templateLanguage: 'ar',
          deliveryStatus: ok ? 'SENT' : 'FAILED',
          externalMessageId: send.message_id ? String(send.message_id) : send.message_wamid || undefined,
          errorMessage: ok ? undefined : JSON.stringify(send.error || send.message || send).slice(0, 500),
          payload: send as object,
          metadata: { familyBase: c.family, probe: 'live-platform-whatsapp-probe' },
          sentAt: ok ? new Date() : undefined,
          failedAt: ok ? undefined : new Date(),
        },
      });
    } catch (e) {
      console.warn('log persist failed', e instanceof Error ? e.message : e);
    }

    results.push({
      family: c.family,
      templateName,
      ok,
      message_id: send.message_id,
      wamid: send.message_wamid,
      error: send.error || null,
    });
    console.log(ok ? '✅' : '❌', c.family, ok ? `id=${send.message_id}` : JSON.stringify(send).slice(0, 180));
    await new Promise((r) => setTimeout(r, 1300));
  }

  // AUTH control
  if (!wanted || wanted.has('auth_otp_vendor')) {
    const code = String(100000 + Math.floor(Math.random() * 899999));
    const templateName = 'auth_otp_vendor_ar_v2';
    console.log(`\n→ auth_otp_vendor (${templateName})`);
    const send = await postTemplate(phone, templateName, [code], false, true, code);
    const ok =
      typeof send.message_wamid === 'string' && send.message_wamid.startsWith('wamid')
        ? true
        : Boolean(send.message_id) && !send.error;
    results.push({ family: 'auth_otp_vendor', templateName, ok, message_id: send.message_id, wamid: send.message_wamid, error: send.error || null });
    console.log(ok ? '✅' : '❌', 'auth_otp_vendor', ok ? `id=${send.message_id}` : JSON.stringify(send).slice(0, 180));
  }

  const out = path.join(__dirname, 'live-platform-whatsapp-probe-results.json');
  fs.writeFileSync(out, JSON.stringify(results, null, 2));
  const passed = results.filter((r) => r.ok).length;
  console.log('\n======== SUMMARY ========');
  console.log(`${passed}/${results.length} OK`);
  console.log('Wrote', out);

  await prisma.$disconnect();
  process.exit(passed === results.length ? 0 : 1);
}

main().catch(async (e) => {
  console.error(e);
  process.exit(1);
});
