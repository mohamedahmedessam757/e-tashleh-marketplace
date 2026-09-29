/**
 * Seed 4 test orders covering the scenario matrix:
 *   ORD-TEST-SCN-1 (multi, 5): مكينه/قير/دفرنش/كرونه/دبل
 *   ORD-TEST-SCN-2 (multi, 5): صدام/دبله صدام/جسر/شمعات/أصطمبات
 *   ORD-TEST-SCN-3 (single,1): طرمبة ماء (إرجاع ضمان)
 *   ORD-TEST-SCN-4 (single,1): صدام سيارة (مكتمل بدون أحداث)
 *
 * Actors (by email, IDs fallback):
 *   Customer: shreenhamedaladwy@gmail.com  / 2d1d3bda-1fca-4572-be95-41221a3c1141
 *   Vendor:   mohanedahmedessam@gmail.com  / 5f0ea599-c4d0-44e0-8986-9f5555fdaade
 *
 * Offer money (customer-facing ≈ 102 AED): unit 1 + ship 1 + min commission 100.
 *
 * Usage (from backend/):
 *   npx tsx scripts/seed-multi-six-scenarios.ts
 *   npx tsx scripts/seed-multi-six-scenarios.ts --selection-hours=24
 *   npx tsx scripts/seed-multi-six-scenarios.ts --cleanup-only
 */
import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { OrderStatus, Prisma } from '@prisma/client';
import { PrismaClient } from '../src/prisma/client';
import { createDatabasePool } from '../src/prisma/pg-pool';

const CUSTOMER_ID = '2d1d3bda-1fca-4572-be95-41221a3c1141';
const CUSTOMER_EMAIL = 'shreenhamedaladwy@gmail.com';
const VENDOR_ID = '5f0ea599-c4d0-44e0-8986-9f5555fdaade';
const VENDOR_EMAIL = 'mohanedahmedessam@gmail.com';

const LEGACY_ORDER_NUMBER = 'ORD-TEST-MULTI-SCENARIO-6';

const UNIT_PRICE = 1;
const SHIPPING_COST = 1;

const FALLBACK_PART_IMAGES = [
  'https://yhasbbmieqcgyjktgyro.supabase.co/storage/v1/object/public/marketplace-uploads/order-draft/fff4e6af-20cd-4274-874d-98535e434527/orders/parts/mt2nsjij4/1785089823969_vhervh.PNG',
  'https://yhasbbmieqcgyjktgyro.supabase.co/storage/v1/object/public/marketplace-uploads/order-draft/fff4e6af-20cd-4274-874d-98535e434527/orders/parts/n59fzxxjl/1785089823792_mdcl6.PNG',
];
const FALLBACK_OFFER_IMAGES = [
  'https://yhasbbmieqcgyjktgyro.supabase.co/storage/v1/object/public/offer-attachments/0.5117265946420609.PNG',
  'https://yhasbbmieqcgyjktgyro.supabase.co/storage/v1/object/public/offer-attachments/0.9692835320467281.PNG',
];

type ShippingClass = 'engine' | 'gearbox' | 'standard';

type PartSpec = {
  key: string;
  name: string;
  description: string;
  notes: string;
  scenario: string;
  shippingClass: ShippingClass;
  weightKg: number;
  cylinders?: number;
  hasWarranty: boolean;
  warrantyDuration: string | null;
};

type OrderSpec = {
  orderNumber: string;
  requestType: 'multiple' | 'single';
  shippingType: 'combined' | 'separate';
  vin: string;
  description: string;
  parts: PartSpec[];
};

const ORDERS: OrderSpec[] = [
  {
    orderNumber: 'ORD-TEST-SCN-1',
    requestType: 'multiple',
    shippingType: 'combined',
    vin: 'VIN-TEST-SCN-1',
    description: 'طلب مجمّع اختبار 1 — 5 سيناريوهات (مطابقة/تصحيح/نزاع 24س/رفض نزاع/خطأ متجر).',
    parts: [
      {
        key: 'engine', name: 'مكينه', shippingClass: 'engine', weightKg: 120, cylinders: 6,
        hasWarranty: false, warrantyDuration: null,
        description: 'مكينة — BMW X5 2020 — رفض مطابقة ثم إلغاء بعد 48 ساعة',
        notes: 'SCENARIO-1: reject matching → 48h → cancel matching (part-only)',
        scenario: '1) رفض المطابقة ومرور 48 ساعة ثم إلغاء الطلب تلقائيا',
      },
      {
        key: 'gearbox', name: 'قير', shippingClass: 'gearbox', weightKg: 80,
        hasWarranty: false, warrantyDuration: null,
        description: 'قير — BMW X5 2020 — رفض مطابقة ثم تصحيح في المهلة ثم قبول إعادة المطابقة',
        notes: 'SCENARIO-2: reject matching → correction window → correct part → accept re-match',
        scenario: '2) رفض المطابقة ثم تصحيح القطعة في مهلة التصحيح ثم قبول إعادة المطابقة',
      },
      {
        key: 'differential', name: 'دفرنش', shippingClass: 'standard', weightKg: 35,
        hasWarranty: false, warrantyDuration: null,
        description: 'دفرنش — BMW X5 2020 — نزاع/إرجاع بعد الاستلام قبل 24 ساعة',
        notes: 'SCENARIO-3: dispute/return after delivery within 24h window',
        scenario: '3) رفع نزاع/إرجاع بعد استلام العميل قبل مضي 24 ساعة',
      },
      {
        key: 'crankshaft', name: 'كرونه', shippingClass: 'standard', weightKg: 18,
        hasWarranty: false, warrantyDuration: null,
        description: 'كرونه — BMW X5 2020 — نزاع/إرجاع ثم رفضه',
        notes: 'SCENARIO-4: dispute/return then REJECT',
        scenario: '4) رفع نزاع/إرجاع ثم رفضه',
      },
      {
        key: 'double', name: 'دبل', shippingClass: 'standard', weightKg: 14,
        hasWarranty: false, warrantyDuration: null,
        description: 'دبل — BMW X5 2020 — إرجاع بسبب خطأ المتجر وتنفيذ الحكم على المتجر',
        notes: 'SCENARIO-5: return due to store error → verdict executed against store',
        scenario: '5) الإرجاع بسبب خطأ المتجر وتنفيذ الحكم على المتجر',
      },
    ],
  },
  {
    orderNumber: 'ORD-TEST-SCN-2',
    requestType: 'multiple',
    shippingType: 'combined',
    vin: 'VIN-TEST-SCN-2',
    description: 'طلب مجمّع اختبار 2 — 5 سيناريوهات (تأخير تجهيز/ضمان/شحن/رفض إرجاع/نافذة 24س).',
    parts: [
      {
        key: 'bumper', name: 'صدام', shippingClass: 'standard', weightKg: 25,
        hasWarranty: false, warrantyDuration: null,
        description: 'صدام — BMW X5 2020 — عدم تجهيز → تأخير تجهيز → إلغاء تلقائي',
        notes: 'SCENARIO-1: no prepare → DELAYED_PREPARATION → auto cancel late offer only',
        scenario: '1) عدم التجهيز من المتجر → تأخير التجهيز → إلغاء القطعة بسبب انتهاء المهلة',
      },
      {
        key: 'bumper-double', name: 'دبله صدام', shippingClass: 'standard', weightKg: 8,
        hasWarranty: true, warrantyDuration: '3months',
        description: 'دبلة صدام — BMW X5 2020 — إرجاع بضمان',
        notes: 'SCENARIO-2: warranty_claim return after delivery',
        scenario: '2) الإرجاع بسبب وجود ضمان (warranty_claim)',
      },
      {
        key: 'crossmember', name: 'جسر', shippingClass: 'standard', weightKg: 30,
        hasWarranty: false, warrantyDuration: null,
        description: 'جسر — BMW X5 2020 — إرجاع بسبب خطأ شركة الشحن',
        notes: 'SCENARIO-3: return shipping_error after delivery',
        scenario: '3) الإرجاع بسبب خطأ شركة الشحن (shipping_error)',
      },
      {
        key: 'spark-plugs', name: 'شمعات', shippingClass: 'standard', weightKg: 1,
        hasWarranty: false, warrantyDuration: null,
        description: 'شمعات — BMW X5 2020 — إرجاع ثم رفض طلب الإرجاع من الأدمن',
        notes: 'SCENARIO-4: return then admin REJECT on verdict',
        scenario: '4) الإرجاع ثم رفض طلب الإرجاع من الأدمن عند تنفيذ قرار الحكم',
      },
      {
        key: 'steering', name: 'أصطمبات', shippingClass: 'standard', weightKg: 12,
        hasWarranty: false, warrantyDuration: null,
        description: 'أصطمبات — BMW X5 2020 — نزاع/إرجاع بعد مضي 24 ساعة (يجب ألا ينفذ)',
        notes: 'SCENARIO-5: dispute/return after 24h from delivery (should be blocked)',
        scenario: '5) رفع نزاع/إرجاع بعد مضي 24 ساعة من الاستلام (يجب ألا ينفذ)',
      },
    ],
  },
  {
    orderNumber: 'ORD-TEST-SCN-3',
    requestType: 'single',
    shippingType: 'separate',
    vin: 'VIN-TEST-SCN-3',
    description: 'طلب مفرد اختبار 3 — طرمبة ماء بإرجاع ضمان.',
    parts: [
      {
        key: 'water-pump', name: 'ترمبة ماء', shippingClass: 'standard', weightKg: 3,
        hasWarranty: true, warrantyDuration: '3months',
        description: 'ترمبة ماء — BMW X5 2020 — طلب مفرد بإرجاع ضمان',
        notes: 'SCENARIO-3: single order with warranty return',
        scenario: 'طلب مفرد بارجاع ضمان لتجربة المفرد لوحدة في الضمان',
      },
    ],
  },
  {
    orderNumber: 'ORD-TEST-SCN-4',
    requestType: 'single',
    shippingType: 'separate',
    vin: 'VIN-TEST-SCN-4',
    description: 'طلب مفرد اختبار 4 — صدام سيارة مكتمل بدون أحداث.',
    parts: [
      {
        key: 'car-bumper', name: 'صدام سيارة', shippingClass: 'standard', weightKg: 22,
        hasWarranty: false, warrantyDuration: null,
        description: 'صدام سيارة — BMW X5 2020 — طلب مكتمل مفرد بدون أحداث',
        notes: 'SCENARIO-4: full single order, no return/dispute events',
        scenario: 'طلب مكتمل مفرد بدون أي أحداث (إرجاع/نزاع)',
      },
    ],
  },
];

const pool = createDatabasePool();
const prisma = new PrismaClient({ adapter: new PrismaPg(pool), log: ['error'] });

function parseArgs(argv: string[]) {
  let selectionHours = 72;
  let cleanupOnly = false;
  for (const a of argv) {
    if (a === '--cleanup-only') cleanupOnly = true;
    if (a.startsWith('--selection-hours=')) {
      const n = Number(a.slice('--selection-hours='.length));
      if (Number.isFinite(n) && n > 0) selectionHours = n;
    }
  }
  return { selectionHours, cleanupOnly };
}

function pickRoundRobin<T>(items: T[], index: number): T {
  return items[index % items.length];
}

async function loadImagePools(): Promise<{ partImages: string[]; offerImages: string[] }> {
  const parts = await prisma.orderPart.findMany({
    where: { images: { isEmpty: false } },
    select: { images: true },
    take: 40,
    orderBy: { createdAt: 'desc' },
  });
  const offers = await prisma.offer.findMany({
    where: { offerImage: { not: null } },
    select: { offerImage: true },
    take: 40,
    orderBy: { createdAt: 'desc' },
  });
  const partImages = Array.from(
    new Set(parts.flatMap((p) => p.images).filter((u) => typeof u === 'string' && u.startsWith('http'))),
  );
  const offerImages = Array.from(
    new Set(offers.map((o) => o.offerImage).filter((u): u is string => typeof u === 'string' && u.startsWith('http'))),
  );
  return {
    partImages: partImages.length ? partImages : FALLBACK_PART_IMAGES,
    offerImages: offerImages.length ? offerImages : FALLBACK_OFFER_IMAGES,
  };
}

async function assertActors(): Promise<{ customerId: string; vendorId: string; storeId: string; storeName: string }> {
  let customer = await prisma.user.findFirst({ where: { email: { equals: CUSTOMER_EMAIL, mode: 'insensitive' } } });
  if (!customer) customer = await prisma.user.findUnique({ where: { id: CUSTOMER_ID } });
  if (!customer) throw new Error(`Customer not found for ${CUSTOMER_EMAIL} / ${CUSTOMER_ID}`);
  if (customer.email?.toLowerCase() !== CUSTOMER_EMAIL.toLowerCase()) {
    throw new Error(`Customer email mismatch: expected ${CUSTOMER_EMAIL}, got ${customer.email} (id=${customer.id})`);
  }
  let vendor = await prisma.user.findFirst({ where: { email: { equals: VENDOR_EMAIL, mode: 'insensitive' } } });
  if (!vendor) vendor = await prisma.user.findUnique({ where: { id: VENDOR_ID } });
  if (!vendor) throw new Error(`Vendor not found for ${VENDOR_EMAIL} / ${VENDOR_ID}`);
  if (vendor.email?.toLowerCase() !== VENDOR_EMAIL.toLowerCase()) {
    throw new Error(`Vendor email mismatch: expected ${VENDOR_EMAIL}, got ${vendor.email} (id=${vendor.id})`);
  }
  const store = await prisma.store.findFirst({ where: { ownerId: vendor.id } });
  if (!store) throw new Error(`No store for vendor ${VENDOR_EMAIL} (${vendor.id})`);
  return { customerId: customer.id, vendorId: vendor.id, storeId: store.id, storeName: store.name };
}

async function cleanupPrevious(orderNumbers: string[]): Promise<void> {
  const all = Array.from(new Set([...orderNumbers, LEGACY_ORDER_NUMBER]));
  const existing = await prisma.order.findMany({
    where: { orderNumber: { in: all } },
    select: { id: true, orderNumber: true },
  });
  if (!existing.length) {
    console.log('No previous seed orders to clean.');
    return;
  }
  const orderIds = existing.map((o) => o.id);
  console.log(`Cleaning previous orders: ${existing.map((o) => o.orderNumber).join(', ')}...`);

  await prisma.$transaction(
    async (tx) => {
      await tx.order.updateMany({ where: { id: { in: orderIds } }, data: { acceptedOfferId: null } });
      const offers = await tx.offer.findMany({ where: { orderId: { in: orderIds } }, select: { id: true } });
      const offerIds = offers.map((o) => o.id);
      if (offerIds.length) {
        await tx.offerRejection.deleteMany({ where: { offerId: { in: offerIds } } });
        await tx.review.deleteMany({ where: { offerId: { in: offerIds } } });
        await tx.verificationDocument.deleteMany({ where: { offerId: { in: offerIds } } });
        await tx.verificationTask.deleteMany({ where: { offerId: { in: offerIds } } });
      }
      const payments = await tx.paymentTransaction.findMany({ where: { orderId: { in: orderIds } }, select: { id: true } });
      const paymentIds = payments.map((p) => p.id);
      const escrows = await tx.escrowTransaction.findMany({ where: { orderId: { in: orderIds } }, select: { id: true } });
      const escrowIds = escrows.map((e) => e.id);
      if (paymentIds.length || escrowIds.length) {
        await tx.walletTransaction.deleteMany({
          where: {
            OR: [
              ...(paymentIds.length ? [{ paymentId: { in: paymentIds } }] : []),
              ...(escrowIds.length ? [{ escrowId: { in: escrowIds } }] : []),
            ],
          },
        });
      }
      const returns = await tx.returnRequest.findMany({ where: { orderId: { in: orderIds } }, select: { id: true } });
      const disputes = await tx.dispute.findMany({ where: { orderId: { in: orderIds } }, select: { id: true } });
      const caseIds = [...returns.map((r) => r.id), ...disputes.map((d) => d.id)];
      if (caseIds.length) {
        await tx.caseMessage.deleteMany({ where: { caseId: { in: caseIds } } });
      }
      await tx.returnRequest.updateMany({ where: { orderId: { in: orderIds } }, data: { invoiceId: null, shipmentId: null, returnWaybillId: null } });
      await tx.dispute.updateMany({ where: { orderId: { in: orderIds } }, data: { invoiceId: null, shipmentId: null } });
      await tx.returnRequest.deleteMany({ where: { orderId: { in: orderIds } } });
      await tx.dispute.deleteMany({ where: { orderId: { in: orderIds } } });
      await tx.escrowTransaction.deleteMany({ where: { orderId: { in: orderIds } } });
      await tx.invoice.deleteMany({ where: { orderId: { in: orderIds } } });
      await tx.paymentTransaction.deleteMany({ where: { orderId: { in: orderIds } } });
      const shipments = await tx.shipment.findMany({ where: { orderId: { in: orderIds } }, select: { id: true } });
      const shipmentIds = shipments.map((s) => s.id);
      if (shipmentIds.length) {
        await tx.shipmentStatusLog.deleteMany({ where: { shipmentId: { in: shipmentIds } } });
      }
      if (offerIds.length) {
        await tx.offer.updateMany({ where: { id: { in: offerIds } }, data: { cartShipmentId: null, shippedFromCart: false, shippedFromCartAt: null } });
      }
      await tx.shipment.deleteMany({ where: { orderId: { in: orderIds } } });
      await tx.shippingWaybill.deleteMany({ where: { orderId: { in: orderIds } } });
      await tx.violation.updateMany({ where: { orderId: { in: orderIds } }, data: { orderId: null } });
      await tx.verificationDocument.deleteMany({ where: { orderId: { in: orderIds } } });
      await tx.verificationTask.deleteMany({ where: { orderId: { in: orderIds } } });
      const chats = await tx.orderChat.findMany({ where: { orderId: { in: orderIds } }, select: { id: true } });
      const chatIds = chats.map((c) => c.id);
      if (chatIds.length) {
        await tx.orderChatMessage.deleteMany({ where: { chatId: { in: chatIds } } });
      }
      await tx.orderChat.deleteMany({ where: { orderId: { in: orderIds } } });
      await tx.orderShippingAddress.deleteMany({ where: { orderId: { in: orderIds } } });
      await tx.review.deleteMany({ where: { orderId: { in: orderIds } } });
      await tx.auditLog.deleteMany({ where: { orderId: { in: orderIds } } });
      await tx.offer.deleteMany({ where: { orderId: { in: orderIds } } });
      await tx.orderPart.deleteMany({ where: { orderId: { in: orderIds } } });
      await tx.order.deleteMany({ where: { id: { in: orderIds } } });
    },
    { timeout: 60_000, maxWait: 15_000 },
  );
  console.log('Cleanup done.');
}
async function seedOrder(spec: OrderSpec, args: {
  customerId: string;
  storeId: string;
  storeName: string;
  partImages: string[];
  offerImages: string[];
  selectionHours: number;
}) {
  const { customerId, storeId, storeName, partImages, offerImages, selectionHours } = args;
  const now = new Date();
  const createdAt = new Date(now.getTime() - 4 * 60 * 60 * 1000);
  const revealAt = new Date(now.getTime() - 2 * 60 * 60 * 1000);
  const stopAt = new Date(revealAt.getTime() - 60 * 60 * 1000);
  const selectionDeadlineAt = new Date(now.getTime() + selectionHours * 60 * 60 * 1000);
  const first = spec.parts[0];

  const order = await prisma.order.create({
    data: {
      orderNumber: spec.orderNumber,
      customerId,
      storeId: null,
      status: OrderStatus.AWAITING_SELECTION,
      vehicleMake: 'BMW',
      vehicleModel: 'X5',
      vehicleYear: 2020,
      vin: spec.vin,
      partName: first.name,
      partDescription: spec.description,
      partImages: [pickRoundRobin(partImages, 0)] as Prisma.InputJsonValue,
      conditionPref: 'used',
      warrantyPreferred: true,
      requestType: spec.requestType,
      shippingType: spec.shippingType,
      revealOffersAt: revealAt,
      offersStopAt: stopAt,
      selectionDeadlineAt,
      createdAt,
      updatedAt: now,
      parts: {
        create: spec.parts.map((p, pi) => ({
          name: p.name,
          description: p.description,
          notes: p.notes,
          images: [pickRoundRobin(partImages, pi + 1)],
          quantity: 1,
          shippingClass: p.shippingClass,
          createdAt,
          updatedAt: createdAt,
        })),
      },
    },
    include: { parts: { orderBy: { createdAt: 'asc' } } },
  });

  if (order.parts.length !== spec.parts.length) {
    throw new Error(`Expected ${spec.parts.length} parts for ${spec.orderNumber}, got ${order.parts.length}`);
  }

  const offerRows: Array<{ partName: string; offerId: string; offerNumber: string; scenario: string }> = [];

  for (let pi = 0; pi < spec.parts.length; pi++) {
    const partSpec = spec.parts[pi];
    const part = order.parts[pi];
    if (!part) throw new Error(`Missing part row at index ${pi} in ${spec.orderNumber}`);
    if (part.name !== partSpec.name) {
      throw new Error(`Part order mismatch in ${spec.orderNumber} at ${pi}: DB=${part.name} expected=${partSpec.name}`);
    }
    const offerCreatedAt = new Date(createdAt.getTime() + (pi + 1) * 10 * 60 * 1000);
    const offerNumber = `OFR-TEST-${spec.orderNumber.slice(-1)}-${String(pi + 1).padStart(2, '0')}`;
    const offer = await prisma.offer.create({
      data: {
        offerNumber,
        orderId: order.id,
        orderPartId: part.id,
        storeId,
        unitPrice: UNIT_PRICE,
        weightKg: partSpec.weightKg,
        shippingCost: SHIPPING_COST,
        hasWarranty: partSpec.hasWarranty,
        warrantyDuration: partSpec.warrantyDuration,
        deliveryDays: 'd1_3',
        condition: 'used_clean',
        partType: partSpec.shippingClass,
        cylinders: partSpec.cylinders ?? null,
        notes: `${partSpec.name} — ${storeName} — ${partSpec.notes}`,
        offerImage: pickRoundRobin(offerImages, pi),
        status: 'pending',
        canEditUntil: stopAt,
        isWithdrawn: false,
        createdAt: offerCreatedAt,
        updatedAt: offerCreatedAt,
      },
    });
    offerRows.push({ partName: partSpec.name, offerId: offer.id, offerNumber, scenario: partSpec.scenario });
  }

  return { order, offerRows, selectionDeadlineAt };
}
async function main() {
  const args = parseArgs(process.argv.slice(2));
  console.log(`\nSeed 4 scenario orders @ ${new Date().toISOString()}`);
  console.log(`Order numbers: ${ORDERS.map((o) => o.orderNumber).join(', ')}`);
  console.log(`Selection window: ${args.selectionHours}h\n`);

  const actors = await assertActors();
  console.log(`Customer : ${CUSTOMER_EMAIL} (${actors.customerId})`);
  console.log(`Vendor   : ${VENDOR_EMAIL} (${actors.vendorId})`);
  console.log(`Store    : ${actors.storeName} (${actors.storeId})\n`);

  await cleanupPrevious(ORDERS.map((o) => o.orderNumber));
  if (args.cleanupOnly) {
    console.log('Cleanup-only requested. Done.\n');
    return;
  }

  const images = await loadImagePools();
  console.log(`Part image pool : ${images.partImages.length}`);
  console.log(`Offer image pool: ${images.offerImages.length}\n`);

  for (const spec of ORDERS) {
    const { order, offerRows, selectionDeadlineAt } = await seedOrder(spec, {
      customerId: actors.customerId,
      storeId: actors.storeId,
      storeName: actors.storeName,
      partImages: images.partImages,
      offerImages: images.offerImages,
      selectionHours: args.selectionHours,
    });

    const verify = await prisma.order.findUnique({
      where: { id: order.id },
      include: {
        parts: {
          orderBy: { createdAt: 'asc' },
          include: {
            offers: {
              select: { id: true, offerNumber: true, unitPrice: true, shippingCost: true, partType: true, cylinders: true, hasWarranty: true, warrantyDuration: true, status: true, storeId: true },
            },
          },
        },
      },
    });
    if (!verify) throw new Error(`Verify query returned null for ${spec.orderNumber}`);

    console.log('────────────────────────────────────────────────────────');
    console.log(`CREATED ${verify.orderNumber}`);
    console.log(`  id=${verify.id}`);
    console.log(`  status=${verify.status}`);
    console.log(`  requestType=${verify.requestType} shippingType=${verify.shippingType}`);
    console.log(`  vehicle=${verify.vehicleMake} ${verify.vehicleModel} ${verify.vehicleYear}`);
    console.log(`  selectionDeadlineAt=${selectionDeadlineAt.toISOString()}`);
    console.log('────────────────────────────────────────────────────────');
    console.log('Parts / offers / scenarios:\n');
    for (let i = 0; i < verify.parts.length; i++) {
      const p = verify.parts[i];
      const o = p.offers[0];
      const meta = offerRows[i];
      console.log(`  ${i + 1}. ${p.name}`);
      console.log(`     partId=${p.id}`);
      console.log(`     shippingClass=${p.shippingClass}`);
      console.log(
        `     offer=${o?.offerNumber} status=${o?.status} unit=${o?.unitPrice} ship=${o?.shippingCost} type=${o?.partType} cyl=${o?.cylinders ?? '-'} warranty=${o?.hasWarranty ? o.warrantyDuration : 'no'}`,
      );
      console.log(`     scenario: ${meta?.scenario}`);
      console.log('');
    }
  }

  console.log(`Customer-facing price per offer ≈ ${UNIT_PRICE} + ${SHIPPING_COST} + 100 commission = 102 AED`);
  console.log('\nNext steps (manual):');
  console.log('  1) Login as customer → open each order → accept all offers');
  console.log('  2) Pay (or from backend/: npx tsx scripts/skip-payment.ts --order=ORD-TEST-SCN-N)');
  console.log('  3) Walk each part scenario independently');
  console.log('  4) When you want shorter SLAs, tell me which deadline to shrink (today / now+minutes)');
  console.log('\nDone.\n');
}

main()
  .catch((err) => {
    console.error('\nSeed failed:', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
