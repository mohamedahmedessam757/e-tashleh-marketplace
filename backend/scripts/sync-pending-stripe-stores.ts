/**
 * Backfill: live-sync Stripe Connect readiness for stores stuck in
 * PENDING_STRIPE / STRIPE_RESTRICTED (or stripeActivationRequired without onboarded).
 *
 * Dry-run by default. Pass --apply to write DB updates via Nest sync service.
 *
 * Usage (from backend/):
 *   npx tsx scripts/sync-pending-stripe-stores.ts
 *   npx tsx scripts/sync-pending-stripe-stores.ts --apply
 *   npx tsx scripts/sync-pending-stripe-stores.ts --apply --store=<uuid>
 *
 * Requires STRIPE_SECRET_KEY + DATABASE_URL in backend/.env
 */
import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { StoreStatus } from '@prisma/client';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { StripeService } from '../src/stripe/stripe.service';
import { StoreStripeActivationService } from '../src/stores/store-stripe-activation.service';
import {
  mapStripeAccountToStoreFields,
  stripeMerchantPhase,
} from '../src/stores/store-activation.policy';

const apply = process.argv.includes('--apply');
const storeArg = process.argv.find((a) => a.startsWith('--store='));
const onlyStoreId = storeArg ? storeArg.slice('--store='.length).trim() : null;

async function main() {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  try {
    const prisma = app.get(PrismaService);
    const stripe = app.get(StripeService);
    const activation = app.get(StoreStripeActivationService);

    if (!stripe.isConfigured()) {
      console.error('STRIPE_SECRET_KEY missing — abort');
      process.exitCode = 1;
      return;
    }

    const where = onlyStoreId
      ? { id: onlyStoreId }
      : {
          stripeAccountId: { not: null },
          OR: [
            { status: { in: [StoreStatus.PENDING_STRIPE, StoreStatus.STRIPE_RESTRICTED] } },
            {
              stripeActivationRequired: true,
              stripeOnboarded: false,
            },
          ],
        };

    const stores = await prisma.store.findMany({
      where,
      select: {
        id: true,
        name: true,
        status: true,
        stripeAccountId: true,
        stripeOnboarded: true,
        stripeDetailsSubmitted: true,
        stripeChargesEnabled: true,
        stripePayoutsEnabled: true,
      },
      orderBy: { updatedAt: 'desc' },
      take: 500,
    });

    console.log(`Candidates: ${stores.length}. Mode: ${apply ? 'APPLY' : 'DRY-RUN'}`);

    let readyCount = 0;
    let updatedCount = 0;
    let skipped = 0;

    for (const store of stores) {
      const accountId = store.stripeAccountId;
      if (!accountId) {
        skipped += 1;
        console.log(`SKIP ${store.id} (${store.name}): no stripeAccountId`);
        continue;
      }

      const account = await stripe.retrieveAccountOrNull(accountId);
      if (!account) {
        skipped += 1;
        console.log(`SKIP ${store.id}: could not retrieve ${accountId}`);
        continue;
      }

      const mapped = mapStripeAccountToStoreFields(account);
      const phase = stripeMerchantPhase(mapped.readiness);
      console.log(
        `${store.id} | ${store.name} | db=${store.status} | phase=${phase} | ready=${mapped.ready} | details=${mapped.stripeDetailsSubmitted} | charges=${mapped.stripeChargesEnabled} | payouts=${mapped.stripePayoutsEnabled}`,
      );

      if (mapped.ready) readyCount += 1;

      if (!apply) continue;

      const before = store.status;
      const result = await activation.syncStoreFromStripeAccount(store.id, account);
      if (result.status !== before || result.ready !== Boolean(store.stripeOnboarded)) {
        updatedCount += 1;
        console.log(`  → UPDATED status ${before} → ${result.status} ready=${result.ready}`);
      } else {
        console.log(`  → synced fields, status unchanged (${result.status})`);
      }
    }

    console.log(
      `Done. readyOnStripe=${readyCount} updated=${updatedCount} skipped=${skipped}`,
    );
  } finally {
    await app.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
