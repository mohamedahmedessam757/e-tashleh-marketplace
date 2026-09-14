/**
 * Ops: report remaining prep SLA, then backfill sticky deadlines.
 * - PREPARATION → preparationDeadlineAt = now + 48h
 * - DELAYED_PREPARATION without deadline → delayedPreparationDeadlineAt = now + 24h
 *
 * Usage (from backend/):
 *   npx tsx scripts/backfill-preparation-deadline.ts
 *   npx tsx scripts/backfill-preparation-deadline.ts --dry-run
 */
import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/prisma/client';
import { createDatabasePool } from '../src/prisma/pg-pool';

const PREP_HOURS = 48;
const GRACE_HOURS = 24;
const dryRun = process.argv.includes('--dry-run');

function fmtRemaining(ms: number): string {
  if (ms <= 0) return 'EXPIRED';
  const totalMin = Math.floor(ms / 60000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return `${h}h ${m}m`;
}

function endsAtMs(o: {
  status: string;
  updatedAt: Date;
  preparationDeadlineAt?: Date | null;
  delayedPreparationDeadlineAt?: Date | null;
  payments: Array<{ createdAt: Date; paidAt: Date | null }>;
}): number {
  const pay = o.payments[0];
  const startMs = pay
    ? new Date(pay.paidAt || pay.createdAt).getTime()
    : new Date(o.updatedAt).getTime();

  if (o.status === 'DELAYED_PREPARATION') {
    return o.delayedPreparationDeadlineAt
      ? new Date(o.delayedPreparationDeadlineAt).getTime()
      : new Date(o.updatedAt).getTime() + GRACE_HOURS * 3600_000;
  }
  if (o.preparationDeadlineAt) {
    return new Date(o.preparationDeadlineAt).getTime();
  }
  return startMs + PREP_HOURS * 3600_000;
}

async function main() {
  const pool = createDatabasePool();
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter } as ConstructorParameters<typeof PrismaClient>[0]);

  const now = Date.now();
  const nowDate = new Date(now);

  try {
    const orders = await prisma.order.findMany({
      where: { status: { in: ['PREPARATION', 'DELAYED_PREPARATION'] } },
      select: {
        id: true,
        orderNumber: true,
        status: true,
        updatedAt: true,
        requestType: true,
        preparationDeadlineAt: true,
        delayedPreparationDeadlineAt: true,
        payments: {
          where: { status: { in: ['SUCCESS', 'COMPLETED'] } },
          orderBy: { createdAt: 'asc' },
          take: 1,
          select: { createdAt: true, paidAt: true, status: true },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    console.log(
      `serverNow=${nowDate.toISOString()} dryRun=${dryRun} livePrepOrders=${orders.length}`,
    );
    console.log('--- BEFORE ---');
    console.log(
      ['orderNumber', 'status', 'requestType', 'computedEndsAt', 'remaining'].join('\t'),
    );

    for (const o of orders) {
      const ends = endsAtMs(o);
      console.log(
        [o.orderNumber, o.status, o.requestType || '-', new Date(ends).toISOString(), fmtRemaining(ends - now)].join(
          '\t',
        ),
      );
    }

    const prepIds = orders.filter((o) => o.status === 'PREPARATION').map((o) => o.id);
    const delayedMissing = orders.filter(
      (o) => o.status === 'DELAYED_PREPARATION' && !o.delayedPreparationDeadlineAt,
    );

    const prepDeadline = new Date(now + PREP_HOURS * 3600_000);
    const delayedDeadline = new Date(now + GRACE_HOURS * 3600_000);

    if (!dryRun) {
      if (prepIds.length) {
        await prisma.order.updateMany({
          where: { id: { in: prepIds } },
          data: { preparationDeadlineAt: prepDeadline },
        });
      }
      for (const o of delayedMissing) {
        await prisma.order.update({
          where: { id: o.id },
          data: { delayedPreparationDeadlineAt: delayedDeadline },
        });
      }
    }

    console.log('--- AFTER (projected) ---');
    console.log(
      `PREPARATION updated=${prepIds.length} deadline=${prepDeadline.toISOString()}`,
    );
    console.log(
      `DELAYED_PREPARATION deadline filled=${delayedMissing.length} deadline=${delayedDeadline.toISOString()}`,
    );
    for (const o of orders) {
      let ends: number;
      if (o.status === 'PREPARATION') {
        ends = prepDeadline.getTime();
      } else if (!o.delayedPreparationDeadlineAt) {
        ends = delayedDeadline.getTime();
      } else {
        ends = new Date(o.delayedPreparationDeadlineAt).getTime();
      }
      console.log(
        [o.orderNumber, o.status, new Date(ends).toISOString(), fmtRemaining(ends - now)].join(
          '\t',
        ),
      );
    }
  } finally {
    await prisma.$disconnect().catch(() => undefined);
    await pool.end().catch(() => undefined);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
