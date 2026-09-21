/**
 * Shrink مكينة (engine) correctionDeadlineAt on the multi-scenario test order
 * so expiry can be observed in ~5 minutes instead of ~48h.
 *
 * Usage (from backend/):
 *   npx tsx scripts/shrink-engine-correction-deadline.ts
 *   npx tsx scripts/shrink-engine-correction-deadline.ts --minutes=5
 *   npx tsx scripts/shrink-engine-correction-deadline.ts --order=ORD-TEST-MULTI-SCENARIO-6
 */
import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/prisma/client';
import { createDatabasePool } from '../src/prisma/pg-pool';

const DEFAULT_ORDER = 'ORD-TEST-MULTI-SCENARIO-6';
const ENGINE_NAME = 'مكينه';

function parseArgs(argv: string[]) {
  let minutes = 5;
  let orderNumber = DEFAULT_ORDER;
  for (const a of argv) {
    if (a.startsWith('--minutes=')) {
      const n = Number(a.slice('--minutes='.length));
      if (Number.isFinite(n) && n > 0) minutes = n;
    }
    if (a.startsWith('--order=')) {
      orderNumber = a.slice('--order='.length).trim() || DEFAULT_ORDER;
    }
  }
  return { minutes, orderNumber };
}

async function main() {
  const { minutes, orderNumber } = parseArgs(process.argv.slice(2));
  const pool = createDatabasePool();
  const prisma = new PrismaClient({
    adapter: new PrismaPg(pool),
    log: ['error'],
  });

  try {
    const order = await prisma.order.findFirst({
      where: { orderNumber },
      select: {
        id: true,
        orderNumber: true,
        status: true,
        correctionDeadlineAt: true,
        parts: { select: { id: true, name: true } },
        offers: {
          select: {
            id: true,
            status: true,
            fulfillmentStatus: true,
            orderPartId: true,
            orderPart: { select: { name: true } },
          },
        },
      },
    });

    if (!order) {
      throw new Error(`Order not found: ${orderNumber}`);
    }

    const enginePart = order.parts.find((p) => p.name === ENGINE_NAME);
    if (!enginePart) {
      throw new Error(`Part "${ENGINE_NAME}" not found on ${orderNumber}`);
    }

    const engineOffer = order.offers.find(
      (o) => o.orderPartId === enginePart.id || o.orderPart?.name === ENGINE_NAME,
    );
    if (!engineOffer) {
      throw new Error(`No offer found for "${ENGINE_NAME}" on ${orderNumber}`);
    }

    const docs = await prisma.verificationDocument.findMany({
      where: {
        orderId: order.id,
        OR: [{ offerId: engineOffer.id }, { offerId: null }],
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        offerId: true,
        adminStatus: true,
        correctionDeadlineAt: true,
        createdAt: true,
      },
    });

    const rejected =
      docs.find(
        (d) =>
          String(d.offerId || '') === String(engineOffer.id) &&
          String(d.adminStatus || '').toUpperCase() === 'REJECTED',
      ) ||
      docs.find((d) => String(d.adminStatus || '').toUpperCase() === 'REJECTED');

    if (!rejected) {
      console.log('Order snapshot:', {
        orderNumber: order.orderNumber,
        status: order.status,
        engineOffer: {
          id: engineOffer.id,
          status: engineOffer.status,
          fulfillmentStatus: engineOffer.fulfillmentStatus,
        },
        docs: docs.map((d) => ({
          id: d.id,
          offerId: d.offerId,
          adminStatus: d.adminStatus,
          correctionDeadlineAt: d.correctionDeadlineAt,
        })),
      });
      throw new Error(
        `No REJECTED verification document found for "${ENGINE_NAME}". Reject matching first.`,
      );
    }

    const deadline = new Date(Date.now() + minutes * 60_000);

    const updated = await prisma.verificationDocument.update({
      where: { id: rejected.id },
      data: { correctionDeadlineAt: deadline, updatedAt: new Date() },
      select: {
        id: true,
        offerId: true,
        adminStatus: true,
        correctionDeadlineAt: true,
      },
    });

    // Keep order-level deadline in sync only when it is already set (single-item path).
    let orderDeadline: Date | null = order.correctionDeadlineAt;
    if (order.correctionDeadlineAt) {
      const o = await prisma.order.update({
        where: { id: order.id },
        data: { correctionDeadlineAt: deadline, updatedAt: new Date() },
        select: { correctionDeadlineAt: true },
      });
      orderDeadline = o.correctionDeadlineAt;
    }

    console.log(
      JSON.stringify(
        {
          ok: true,
          orderNumber: order.orderNumber,
          orderStatus: order.status,
          part: ENGINE_NAME,
          offerId: engineOffer.id,
          offerStatus: engineOffer.status,
          fulfillmentStatus: engineOffer.fulfillmentStatus,
          previousDocDeadline: rejected.correctionDeadlineAt,
          newDocDeadline: updated.correctionDeadlineAt,
          orderCorrectionDeadlineAt: orderDeadline,
          minutesLeft: minutes,
        },
        null,
        2,
      ),
    );
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main().catch((e) => {
  console.error(e?.message || e);
  process.exit(1);
});
