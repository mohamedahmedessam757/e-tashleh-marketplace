/**
 * One-off repair: COMPLETED orders with warrantied accepted offers but missing
 * WARRANTY_ACTIVE / warranty_end_at (e.g. ORD-TEST-AS-SINGLE class).
 *
 * Standalone Prisma script — does NOT boot Nest (avoids DI / circular deps).
 * Does NOT auto-run against production — invoke explicitly after review.
 *
 * Usage (from backend/):
 *   npx tsx scripts/backfill-completed-warranty.ts --dry-run
 *   npx tsx scripts/backfill-completed-warranty.ts --apply
 *   npx tsx scripts/backfill-completed-warranty.ts --apply --order=ORD-TEST-AS-SINGLE
 *   npx tsx scripts/backfill-completed-warranty.ts --apply --notify
 *
 * Optional --notify inserts one in-app ORDER notification with metadata
 * backfillKey=WARRANTY_ACTIVATED_BACKFILL (skips if already present).
 * Note: this does not go through NotificationsService WhatsApp fan-out.
 */
import 'dotenv/config';
import { OrderStatus } from '@prisma/client';
import { createStandalonePrismaClient } from '../src/prisma/create-standalone-client';
import { resolveCompletionWarranty } from '../src/orders/warranty-activation.util';

type Args = {
  dryRun: boolean;
  apply: boolean;
  notify: boolean;
  order?: string;
};

function parseArgs(argv: string[]): Args {
  const out: Args = { dryRun: true, apply: false, notify: false };
  for (const a of argv) {
    if (a === '--apply') {
      out.apply = true;
      out.dryRun = false;
    }
    if (a === '--dry-run') out.dryRun = true;
    if (a === '--notify') out.notify = true;
    if (a.startsWith('--order=')) out.order = a.slice('--order='.length).trim();
  }
  if (out.apply) out.dryRun = false;
  return out;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const prisma = createStandalonePrismaClient();

  try {
    const isUuid =
      !!args.order &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        args.order,
      );

    const candidates = await prisma.order.findMany({
      where: args.order
        ? {
            status: OrderStatus.COMPLETED,
            ...(isUuid
              ? { OR: [{ orderNumber: args.order }, { id: args.order }] }
              : { orderNumber: args.order }),
          }
        : {
            status: OrderStatus.COMPLETED,
            warranty_end_at: null,
          },
      include: {
        offers: {
          where: { status: { in: ['accepted', 'ACCEPTED'] } },
          select: { hasWarranty: true, warrantyDuration: true },
        },
      },
    });

    const now = new Date();
    let repaired = 0;
    let skipped = 0;

    for (const order of candidates) {
      const activeAt = order.deliveredAt || order.updatedAt || now;
      const warranty = resolveCompletionWarranty(
        order.offers,
        activeAt instanceof Date ? activeAt : new Date(activeAt),
        OrderStatus.COMPLETED,
      );
      if (!warranty.activate || !warranty.endAt) {
        skipped += 1;
        console.log(`SKIP ${order.orderNumber}: no usable warranty on accepted offers`);
        continue;
      }

      const endAt = warranty.endAt;
      const effective =
        endAt.getTime() > Date.now()
          ? OrderStatus.WARRANTY_ACTIVE
          : OrderStatus.WARRANTY_EXPIRED;

      console.log(
        `${args.dryRun ? 'DRY' : 'APPLY'} ${order.orderNumber}: ${order.status} → ${effective}, end=${endAt.toISOString()}`,
      );

      if (!args.dryRun) {
        await prisma.order.update({
          where: { id: order.id },
          data: {
            status: effective,
            warranty_active_at: activeAt,
            warranty_end_at: endAt,
            updatedAt: now,
          },
        });

        if (args.notify && effective === OrderStatus.WARRANTY_ACTIVE) {
          const recent = await prisma.notification.findMany({
            where: {
              recipientId: order.customerId,
              type: 'ORDER',
            },
            orderBy: { createdAt: 'desc' },
            take: 40,
            select: { metadata: true },
          });
          const alreadyNotified = recent.some((n) => {
            const m = n.metadata as Record<string, unknown> | null;
            return (
              m?.backfillKey === 'WARRANTY_ACTIVATED_BACKFILL' &&
              m?.orderId === order.id
            );
          });

          if (!alreadyNotified) {
            await prisma.notification.create({
              data: {
                recipientId: order.customerId,
                recipientRole: 'CUSTOMER',
                titleAr: `تحديث حالة الطلب #${order.orderNumber}`,
                titleEn: `Order Status Update #${order.orderNumber}`,
                messageAr:
                  'تم تفعيل الضمان على طلبك 🛡️ يمكنك متابعة مدة الحماية من تفاصيل الطلب.',
                messageEn:
                  'Warranty is now active on your order 🛡️ Track remaining protection from order details.',
                type: 'ORDER',
                link: `/dashboard/orders/${order.id}`,
                metadata: {
                  orderId: order.id,
                  status: OrderStatus.WARRANTY_ACTIVE,
                  waEvent: 'ORDER_STATUS',
                  backfillKey: 'WARRANTY_ACTIVATED_BACKFILL',
                  source: 'WARRANTY_BACKFILL',
                },
              },
            });
            console.log(`NOTIFY in-app created for ${order.orderNumber}`);
          } else {
            console.log(`NOTIFY skipped (already backfilled) for ${order.orderNumber}`);
          }
        }
      }

      repaired += 1;
    }

    console.log(
      `\nDone. ${args.dryRun ? 'Would repair' : 'Repaired'}: ${repaired}, skipped: ${skipped}, total scanned: ${candidates.length}`,
    );
    console.log(
      'Run with --apply to persist. Add --notify for in-app warranty-started notification (idempotent).',
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
