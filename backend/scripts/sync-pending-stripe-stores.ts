/**
 * Backfill: live-sync Stripe Connect readiness for stores stuck in
 * PENDING_STRIPE / STRIPE_RESTRICTED (or stripeActivationRequired without onboarded).
 *
 * Standalone script (Prisma adapter + Stripe SDK) — does NOT boot Nest AppModule
 * (avoids OrdersService circular DI under tsx).
 *
 * Dry-run by default. Pass --apply to write DB updates.
 * In-app notifications are created on status transitions; WhatsApp is skipped here
 * (production path remains webhook / live API sync).
 *
 * Usage (from backend/):
 *   npx tsx scripts/sync-pending-stripe-stores.ts
 *   npx tsx scripts/sync-pending-stripe-stores.ts --apply
 *   npx tsx scripts/sync-pending-stripe-stores.ts --apply --store=<uuid>
 *
 * Requires STRIPE_SECRET_KEY + DATABASE_URL in backend/.env
 */
import 'dotenv/config';
import Stripe = require('stripe');
import { PrismaPg } from '@prisma/adapter-pg';
import { Prisma, StoreStatus } from '@prisma/client';
import { PrismaClient } from '../src/prisma/client';
import { createDatabasePool } from '../src/prisma/pg-pool';
import {
  mapStripeAccountToStoreFields,
  stripeMerchantPhase,
} from '../src/stores/store-activation.policy';

const apply = process.argv.includes('--apply');
const storeArg = process.argv.find((a) => a.startsWith('--store='));
const onlyStoreId = storeArg ? storeArg.slice('--store='.length).trim() : null;

const pool = createDatabasePool();
const prisma = new PrismaClient({
  adapter: new PrismaPg(pool),
  log: ['error'],
});

function createStripeClient(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  if (!key) return null;
  return new Stripe(key, {
    apiVersion: '2026-03-25.dahlia' as any,
  });
}

async function retrieveAccountOrNull(
  stripe: Stripe,
  accountId: string,
): Promise<{ account: Stripe.Account | null; skipReason?: string }> {
  try {
    const account = await stripe.accounts.retrieve(accountId);
    return { account };
  } catch (error: unknown) {
    const err = error as {
      code?: string;
      statusCode?: number;
      type?: string;
      message?: string;
    };
    if (err?.code === 'resource_missing' || err?.statusCode === 404) {
      return { account: null, skipReason: 'not_found' };
    }
    // Connected account inaccessible for this platform key (wrong mode, revoked, etc.)
    if (
      err?.code === 'account_invalid' ||
      err?.type === 'StripePermissionError' ||
      err?.statusCode === 403
    ) {
      return {
        account: null,
        skipReason: 'inaccessible_for_platform_key',
      };
    }
    throw error;
  }
}

async function syncStoreFromStripeAccount(
  storeId: string,
  account: Stripe.Account,
): Promise<{ ready: boolean; status: string; transitioned: boolean }> {
  const mapped = mapStripeAccountToStoreFields(account as unknown as Record<string, unknown>);
  const store = await prisma.store.findUnique({
    where: { id: storeId },
    select: {
      id: true,
      name: true,
      status: true,
      ownerId: true,
      adminApprovedAt: true,
      stripeActivationRequired: true,
      stripeAccountId: true,
      stripeDetailsSubmitted: true,
    },
  });

  if (!store) {
    return { ready: false, status: 'MISSING', transitioned: false };
  }

  if (
    mapped.readiness.stripeAccountId &&
    store.stripeAccountId &&
    store.stripeAccountId !== mapped.readiness.stripeAccountId
  ) {
    console.warn(
      `Refusing sync for ${storeId}: account mismatch ${mapped.readiness.stripeAccountId} != ${store.stripeAccountId}`,
    );
    return { ready: false, status: store.status, transitioned: false };
  }

  const data: Prisma.StoreUpdateInput = {
    stripeChargesEnabled: mapped.stripeChargesEnabled,
    stripePayoutsEnabled: mapped.stripePayoutsEnabled,
    stripeDetailsSubmitted: mapped.stripeDetailsSubmitted,
    stripeDisabledReason: mapped.stripeDisabledReason,
    stripeRequirementsDue: mapped.stripeRequirementsDue as Prisma.InputJsonValue,
    stripeRequirementsPending: mapped.stripeRequirementsPending as Prisma.InputJsonValue,
    stripeOnboarded: mapped.ready,
    stripeStatusUpdatedAt: mapped.stripeStatusUpdatedAt,
  };

  if (mapped.readiness.stripeAccountId && !store.stripeAccountId) {
    data.stripeAccountId = mapped.readiness.stripeAccountId;
  }

  let nextStatus: StoreStatus | null = null;
  const requiresStripe = Boolean(store.stripeActivationRequired);
  const ready = mapped.ready;
  const adminApproved = Boolean(store.adminApprovedAt);

  if (requiresStripe) {
    if (
      ready &&
      adminApproved &&
      (store.status === StoreStatus.PENDING_STRIPE ||
        store.status === StoreStatus.STRIPE_RESTRICTED)
    ) {
      nextStatus = StoreStatus.ACTIVE;
    } else if (!ready && store.status === StoreStatus.ACTIVE && store.stripeAccountId) {
      nextStatus = StoreStatus.STRIPE_RESTRICTED;
    }
  }

  if (nextStatus) {
    data.status = nextStatus;
  }

  const updated = await prisma.store.update({
    where: { id: storeId },
    data,
    select: { id: true, status: true, name: true, ownerId: true },
  });

  const transitioned = Boolean(nextStatus && nextStatus !== store.status);

  if (transitioned && nextStatus === StoreStatus.ACTIVE && store.ownerId) {
    await prisma.notification
      .create({
        data: {
          recipientId: store.ownerId,
          recipientRole: 'MERCHANT',
          titleAr: 'تم تفعيل متجرك بالكامل',
          titleEn: 'Your store is fully activated',
          messageAr:
            'اكتمل التحقق المالي عبر Stripe. يمكنك الآن تقديم العروض واستقبال الأرباح.',
          messageEn:
            'Stripe financial verification is complete. You can now submit offers and receive payouts.',
          type: 'SUCCESS',
          link: '/dashboard',
          metadata: {
            storeId: store.id,
            event: 'STORE_STRIPE_ACTIVATED',
          },
        },
      })
      .catch((e) => console.warn('Failed merchant activation notify', e));
  }

  if (transitioned && nextStatus === StoreStatus.STRIPE_RESTRICTED && store.ownerId) {
    const due =
      mapped.readiness.currentlyDue?.slice(0, 5).join(', ') ||
      mapped.readiness.disabledReason ||
      'requirements';
    await prisma.notification
      .create({
        data: {
          recipientId: store.ownerId,
          recipientRole: 'MERCHANT',
          titleAr: 'مطلوب إعادة التحقق المالي',
          titleEn: 'Financial re-verification required',
          messageAr: `حساب Stripe لم يعد جاهزًا. التفاصيل: ${due}`,
          messageEn: `Your Stripe account is no longer ready. Details: ${due}`,
          type: 'WARNING',
          link: '/dashboard/wallet',
          metadata: { storeId: store.id, event: 'STORE_STRIPE_RESTRICTED' },
        },
      })
      .catch((e) => console.warn('Failed merchant restrict notify', e));
  }

  return { ready, status: updated.status, transitioned };
}

async function main() {
  const stripe = createStripeClient();
  if (!stripe) {
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

    const retrieved = await retrieveAccountOrNull(stripe, accountId);
    if (!retrieved.account) {
      skipped += 1;
      console.log(
        `SKIP ${store.id}: could not retrieve ${accountId}` +
          (retrieved.skipReason ? ` (${retrieved.skipReason})` : ''),
      );
      continue;
    }
    const account = retrieved.account;

    const mapped = mapStripeAccountToStoreFields(account as unknown as Record<string, unknown>);
    const phase = stripeMerchantPhase(mapped.readiness);
    console.log(
      `${store.id} | ${store.name} | db=${store.status} | phase=${phase} | ready=${mapped.ready} | details=${mapped.stripeDetailsSubmitted} | charges=${mapped.stripeChargesEnabled} | payouts=${mapped.stripePayoutsEnabled}`,
    );

    if (mapped.ready) readyCount += 1;

    if (!apply) continue;

    const before = store.status;
    const result = await syncStoreFromStripeAccount(store.id, account);
    if (result.status !== before || result.ready !== Boolean(store.stripeOnboarded) || result.transitioned) {
      updatedCount += 1;
      console.log(`  → UPDATED status ${before} → ${result.status} ready=${result.ready}`);
    } else {
      console.log(`  → synced fields, status unchanged (${result.status})`);
    }
  }

  console.log(
    `Done. readyOnStripe=${readyCount} updated=${updatedCount} skipped=${skipped}`,
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect().catch(() => undefined);
    await pool.end().catch(() => undefined);
  });
