import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { buildAdminDateRange } from './admin-financial-metrics.util';
import {
  normalizeSearchQuery,
  resolveUserIds,
  resolveStoreIds,
  resolveOrderIds,
  isUuid,
} from '../common/search/admin-entity-search.util';

export interface FeedFilters {
  startDate?: string;
  endDate?: string;
  search?: string;
  type?: string;
  role?: string;
  limit?: number;
  cursor?: string;
}

export interface FeedCursor {
  sortAt: string;
  source: string;
  id: string;
}

export interface FeedIndexRow {
  source: string;
  id: string;
  sortAt: Date;
}

export function encodeFeedCursor(row: FeedIndexRow): string {
  return `${row.sortAt.toISOString()}|${row.source}|${row.id}`;
}

export function decodeFeedCursor(cursor?: string): FeedCursor | null {
  if (!cursor) return null;
  const parts = cursor.split('|');
  if (parts.length < 3) return null;
  const id = parts.slice(2).join('|');
  return { sortAt: parts[0], source: parts[1], id };
}

function matchesTypeFilter(source: string, eventType: string, filterType: string): boolean {
  if (filterType === 'ALL') return true;
  if (filterType === source) return true;
  if (source === 'WALLET' && eventType.toUpperCase() === filterType.toUpperCase()) return true;
  if (source === 'PAYMENT' && filterType === 'PAYMENT') return true;
  if (eventType === filterType) return true;
  return false;
}

function buildDateSql(range: ReturnType<typeof buildAdminDateRange>, column: string): Prisma.Sql {
  if (range.startDate && range.endDate) {
    return Prisma.sql`${Prisma.raw(column)} BETWEEN ${range.startDate} AND ${range.endDate}`;
  }
  if (range.startDate) {
    return Prisma.sql`${Prisma.raw(column)} >= ${range.startDate}`;
  }
  if (range.endDate) {
    return Prisma.sql`${Prisma.raw(column)} <= ${range.endDate}`;
  }
  return Prisma.sql`TRUE`;
}

function buildOuterCursorSql(cursor: FeedCursor | null): Prisma.Sql {
  if (!cursor) return Prisma.sql`TRUE`;
  const sortAt = new Date(cursor.sortAt);
  return Prisma.sql`(
    "sortAt" < ${sortAt}
    OR ("sortAt" = ${sortAt} AND source < ${cursor.source})
    OR ("sortAt" = ${sortAt} AND source = ${cursor.source} AND id < ${cursor.id})
  )`;
}

interface FeedSearchContext {
  search: string;
  userIds: string[];
  storeIds: string[];
  orderIds: string[];
}

async function resolveFeedSearchContext(
  prisma: PrismaService,
  rawSearch?: string,
): Promise<FeedSearchContext | null> {
  const search = normalizeSearchQuery(rawSearch);
  if (!search) return null;

  const [userIds, storeIds, orderIds] = await Promise.all([
    resolveUserIds(prisma, search),
    resolveStoreIds(prisma, search),
    resolveOrderIds(prisma, search),
  ]);

  return { search, userIds, storeIds, orderIds };
}

function buildPaymentSearchSql(ctx: FeedSearchContext | null): Prisma.Sql {
  if (!ctx) return Prisma.empty;

  const parts: Prisma.Sql[] = [
    Prisma.sql`pt."transaction_number" ILIKE ${'%' + ctx.search + '%'}`,
  ];
  if (ctx.userIds.length) {
    parts.push(Prisma.sql`pt."customer_id" IN (${Prisma.join(ctx.userIds)})`);
  }
  if (ctx.orderIds.length) {
    parts.push(Prisma.sql`pt."order_id" IN (${Prisma.join(ctx.orderIds)})`);
  }
  if (isUuid(ctx.search)) {
    parts.push(Prisma.sql`pt."id"::text = ${ctx.search}`);
  }

  return Prisma.sql`AND (${Prisma.join(parts, ' OR ')})`;
}

function buildWalletSearchSql(ctx: FeedSearchContext | null): Prisma.Sql {
  if (!ctx) return Prisma.empty;

  const parts: Prisma.Sql[] = [
    Prisma.sql`wt."description" ILIKE ${'%' + ctx.search + '%'}`,
    Prisma.sql`wt."transaction_type" ILIKE ${'%' + ctx.search + '%'}`,
  ];
  if (ctx.userIds.length) {
    parts.push(Prisma.sql`wt."user_id" IN (${Prisma.join(ctx.userIds)})`);
  }
  if (isUuid(ctx.search)) {
    parts.push(Prisma.sql`wt."id"::text = ${ctx.search}`);
  }

  return Prisma.sql`AND (${Prisma.join(parts, ' OR ')})`;
}

function buildEscrowSearchSql(ctx: FeedSearchContext | null): Prisma.Sql {
  if (!ctx) return Prisma.empty;

  const parts: Prisma.Sql[] = [];
  if (ctx.orderIds.length) {
    parts.push(Prisma.sql`et."order_id" IN (${Prisma.join(ctx.orderIds)})`);
  }
  parts.push(
    Prisma.sql`EXISTS (
      SELECT 1 FROM "orders" o
      WHERE o."id" = et."order_id"
        AND o."order_number" ILIKE ${'%' + ctx.search + '%'}
    )`,
  );
  if (ctx.userIds.length) {
    parts.push(
      Prisma.sql`EXISTS (
        SELECT 1 FROM "orders" o
        WHERE o."id" = et."order_id"
          AND o."customer_id" IN (${Prisma.join(ctx.userIds)})
      )`,
    );
  }
  if (ctx.storeIds.length) {
    parts.push(
      Prisma.sql`EXISTS (
        SELECT 1 FROM "orders" o
        WHERE o."id" = et."order_id"
          AND o."store_id" IN (${Prisma.join(ctx.storeIds)})
      )`,
    );
  }
  if (isUuid(ctx.search)) {
    parts.push(Prisma.sql`et."id"::text = ${ctx.search}`);
  }

  return Prisma.sql`AND (${Prisma.join(parts, ' OR ')})`;
}

function buildWithdrawalSearchSql(ctx: FeedSearchContext | null): Prisma.Sql {
  if (!ctx) return Prisma.empty;

  const parts: Prisma.Sql[] = [
    Prisma.sql`CAST(wr."amount" AS TEXT) ILIKE ${'%' + ctx.search + '%'}`,
    Prisma.sql`EXISTS (
      SELECT 1 FROM "users" u
      WHERE u."id" = wr."user_id"
        AND (
          u."name" ILIKE ${'%' + ctx.search + '%'}
          OR u."email" ILIKE ${'%' + ctx.search + '%'}
          OR u."phone" ILIKE ${'%' + ctx.search + '%'}
        )
    )`,
    Prisma.sql`EXISTS (
      SELECT 1 FROM "stores" s
      WHERE s."id" = wr."store_id"
        AND (
          s."name" ILIKE ${'%' + ctx.search + '%'}
          OR s."store_code" ILIKE ${'%' + ctx.search + '%'}
        )
    )`,
  ];
  if (ctx.userIds.length) {
    parts.push(Prisma.sql`wr."user_id" IN (${Prisma.join(ctx.userIds)})`);
  }
  if (ctx.storeIds.length) {
    parts.push(Prisma.sql`wr."store_id" IN (${Prisma.join(ctx.storeIds)})`);
  }
  if (isUuid(ctx.search)) {
    parts.push(Prisma.sql`wr."id"::text = ${ctx.search}`);
  }

  return Prisma.sql`AND (${Prisma.join(parts, ' OR ')})`;
}

export async function fetchUnifiedFeedIndex(
  prisma: PrismaService,
  filters: FeedFilters,
): Promise<{ rows: FeedIndexRow[]; hasMore: boolean }> {
  const range = buildAdminDateRange(filters);
  const limit = Math.min(Math.max(Number(filters.limit) || 50, 1), 100);
  const cursor = decodeFeedCursor(filters.cursor);
  const searchCtx = await resolveFeedSearchContext(prisma, filters.search);
  const typeFilter = filters.type && filters.type !== 'ALL' ? filters.type : null;
  const roleFilter = filters.role && filters.role !== 'ALL' ? filters.role : null;

  const includePayments =
    !typeFilter ||
    typeFilter === 'PAYMENT' ||
    typeFilter === 'PAYMENT_REFUNDED' ||
    typeFilter.startsWith('PAYMENT_');
  const includeWallet =
    !typeFilter ||
    typeFilter === 'WALLET' ||
    [
      'ORDER_PROFIT',
      'REFERRAL_PROFIT',
      'COMMISSION',
      'GATEWAY_FEE',
      'REFUND',
      'PENALTY',
      'SHIPPING_FEE',
      'MANUAL_PAYOUT',
      'ADJUDICATION_FEE',
      'ADJUSTMENT',
      'FRAUD_PENALTY',
      'PLATFORM_FEE_RETENTION',
      'ESCROW_RELEASE',
    ].includes(typeFilter);
  const includeEscrow = !typeFilter || typeFilter === 'ESCROW';
  const includeWithdrawals = !typeFilter || typeFilter === 'WITHDRAWAL';

  const paymentSearch = buildPaymentSearchSql(searchCtx);
  const walletSearch = buildWalletSearchSql(searchCtx);
  const walletRole = roleFilter ? Prisma.sql`AND wt."role" = ${roleFilter}` : Prisma.empty;
  const walletType =
    typeFilter && typeFilter !== 'WALLET'
      ? Prisma.sql`AND UPPER(wt."transaction_type") = ${typeFilter.toUpperCase()}`
      : Prisma.empty;
  const withdrawalRole = roleFilter ? Prisma.sql`AND wr."role" = ${roleFilter}` : Prisma.empty;
  const withdrawalSearch = buildWithdrawalSearchSql(searchCtx);
  const escrowSearch = buildEscrowSearchSql(searchCtx);

  const unions: Prisma.Sql[] = [];

  const paymentStatus =
    typeFilter === 'PAYMENT_REFUNDED'
      ? Prisma.sql`AND pt."status" = 'REFUNDED'`
      : typeFilter === 'PAYMENT'
        ? Prisma.sql`AND pt."status" = 'SUCCESS'`
        : Prisma.empty;

  if (includePayments) {
    unions.push(Prisma.sql`
      SELECT 'PAYMENT'::text AS source, pt."id"::text AS id,
             COALESCE(pt."paid_at", pt."created_at") AS "sortAt"
      FROM "payment_transactions" pt
      WHERE ${buildDateSql(range, 'COALESCE(pt."paid_at", pt."created_at")')}
        ${paymentSearch}
        ${paymentStatus}
    `);
  }

  if (includeWallet) {
    unions.push(Prisma.sql`
      SELECT 'WALLET'::text AS source, wt."id"::text AS id, wt."created_at" AS "sortAt"
      FROM "wallet_transactions" wt
      WHERE ${buildDateSql(range, 'wt."created_at"')}
        ${walletSearch}
        ${walletRole}
        ${walletType}
    `);
  }

  if (includeEscrow) {
    unions.push(Prisma.sql`
      SELECT 'ESCROW'::text AS source, et."id"::text AS id, et."created_at" AS "sortAt"
      FROM "escrow_transactions" et
      WHERE ${buildDateSql(range, 'et."created_at"')}
        ${escrowSearch}
    `);
  }

  if (includeWithdrawals) {
    unions.push(Prisma.sql`
      SELECT 'WITHDRAWAL'::text AS source, wr."id"::text AS id, wr."created_at" AS "sortAt"
      FROM "withdrawal_requests" wr
      WHERE ${buildDateSql(range, 'wr."created_at"')}
        ${withdrawalRole}
        ${withdrawalSearch}
    `);
  }

  if (unions.length === 0) {
    return { rows: [], hasMore: false };
  }

  const unionSql = unions.reduce((acc, part, idx) =>
    idx === 0 ? part : Prisma.sql`${acc} UNION ALL ${part}`,
  );

  const rows = await prisma.$queryRaw<FeedIndexRow[]>`
    SELECT source, id, "sortAt"
    FROM (${unionSql}) AS unified
    WHERE ${buildOuterCursorSql(cursor)}
    ORDER BY "sortAt" DESC, source DESC, id DESC
    LIMIT ${limit + 1}
  `;

  const hasMore = rows.length > limit;
  const pageRows = hasMore ? rows.slice(0, limit) : rows;
  return { rows: pageRows, hasMore };
}

export async function countUnifiedFeed(
  prisma: PrismaService,
  filters: FeedFilters,
): Promise<number> {
  const range = buildAdminDateRange(filters);
  const searchCtx = await resolveFeedSearchContext(prisma, filters.search);
  const typeFilter = filters.type && filters.type !== 'ALL' ? filters.type : null;
  const roleFilter = filters.role && filters.role !== 'ALL' ? filters.role : null;

  const includePayments =
    !typeFilter ||
    typeFilter === 'PAYMENT' ||
    typeFilter === 'PAYMENT_REFUNDED' ||
    typeFilter.startsWith('PAYMENT_');
  const includeWallet =
    !typeFilter ||
    typeFilter === 'WALLET' ||
    [
      'ORDER_PROFIT',
      'REFERRAL_PROFIT',
      'COMMISSION',
      'GATEWAY_FEE',
      'REFUND',
      'PENALTY',
      'SHIPPING_FEE',
      'MANUAL_PAYOUT',
      'ADJUDICATION_FEE',
      'ADJUSTMENT',
      'FRAUD_PENALTY',
      'PLATFORM_FEE_RETENTION',
      'ESCROW_RELEASE',
    ].includes(typeFilter);
  const includeEscrow = !typeFilter || typeFilter === 'ESCROW';
  const includeWithdrawals = !typeFilter || typeFilter === 'WITHDRAWAL';

  const counts: number[] = [];

  if (includePayments) {
    const paymentOr: Prisma.PaymentTransactionWhereInput[] = [];
    if (searchCtx) {
      paymentOr.push(
        { transactionNumber: { contains: searchCtx.search, mode: 'insensitive' } },
      );
      if (searchCtx.userIds.length) {
        paymentOr.push({ customerId: { in: searchCtx.userIds } });
      }
      if (searchCtx.orderIds.length) {
        paymentOr.push({ orderId: { in: searchCtx.orderIds } });
      }
      if (isUuid(searchCtx.search)) {
        paymentOr.push({ id: searchCtx.search });
      }
    }
    const dateFilter =
      range.startDate || range.endDate
        ? {
            ...(range.startDate || range.endDate
              ? {
                  OR: [
                    { paidAt: { ...(range.startDate ? { gte: range.startDate } : {}), ...(range.endDate ? { lte: range.endDate } : {}) } },
                    {
                      paidAt: null,
                      createdAt: {
                        ...(range.startDate ? { gte: range.startDate } : {}),
                        ...(range.endDate ? { lte: range.endDate } : {}),
                      },
                    },
                  ],
                }
              : {}),
          }
        : undefined;
    counts.push(
      await prisma.paymentTransaction.count({
        where: {
          ...(dateFilter ? dateFilter : {}),
          ...(paymentOr.length ? { OR: paymentOr } : {}),
        },
      }),
    );
  }

  if (includeWallet) {
    const dateFilter = range.startDate || range.endDate
      ? {
          ...(range.startDate ? { gte: range.startDate } : {}),
          ...(range.endDate ? { lte: range.endDate } : {}),
        }
      : undefined;
    const walletOr: Prisma.WalletTransactionWhereInput[] = [];
    if (searchCtx) {
      walletOr.push(
        { description: { contains: searchCtx.search, mode: 'insensitive' } },
        { transactionType: { contains: searchCtx.search, mode: 'insensitive' } },
      );
      if (searchCtx.userIds.length) {
        walletOr.push({ userId: { in: searchCtx.userIds } });
      }
      if (isUuid(searchCtx.search)) {
        walletOr.push({ id: searchCtx.search });
      }
    }
    counts.push(
      await prisma.walletTransaction.count({
        where: {
          ...(dateFilter ? { createdAt: dateFilter } : {}),
          ...(roleFilter ? { role: roleFilter } : {}),
          ...(typeFilter && typeFilter !== 'WALLET'
            ? { transactionType: { equals: typeFilter, mode: 'insensitive' } }
            : {}),
          ...(walletOr.length ? { OR: walletOr } : {}),
        },
      }),
    );
  }

  if (includeEscrow) {
    const dateFilter = range.startDate || range.endDate
      ? {
          ...(range.startDate ? { gte: range.startDate } : {}),
          ...(range.endDate ? { lte: range.endDate } : {}),
        }
      : undefined;
    const escrowOr: Prisma.EscrowTransactionWhereInput[] = [];
    if (searchCtx) {
      if (searchCtx.orderIds.length) {
        escrowOr.push({ orderId: { in: searchCtx.orderIds } });
      }
      escrowOr.push({
        order: { orderNumber: { contains: searchCtx.search, mode: 'insensitive' } },
      });
      if (searchCtx.userIds.length) {
        escrowOr.push({ order: { customerId: { in: searchCtx.userIds } } });
      }
      if (searchCtx.storeIds.length) {
        escrowOr.push({ order: { storeId: { in: searchCtx.storeIds } } });
      }
      if (isUuid(searchCtx.search)) {
        escrowOr.push({ id: searchCtx.search });
      }
    }
    counts.push(
      await prisma.escrowTransaction.count({
        where: {
          ...(dateFilter ? { createdAt: dateFilter } : {}),
          ...(escrowOr.length ? { OR: escrowOr } : {}),
        },
      }),
    );
  }

  if (includeWithdrawals) {
    const dateFilter = range.startDate || range.endDate
      ? {
          ...(range.startDate ? { gte: range.startDate } : {}),
          ...(range.endDate ? { lte: range.endDate } : {}),
        }
      : undefined;
    const withdrawalOr: Prisma.WithdrawalRequestWhereInput[] = [];
    if (searchCtx) {
      withdrawalOr.push(
        { user: { name: { contains: searchCtx.search, mode: 'insensitive' } } },
        { user: { email: { contains: searchCtx.search, mode: 'insensitive' } } },
        { user: { phone: { contains: searchCtx.search, mode: 'insensitive' } } },
        { store: { name: { contains: searchCtx.search, mode: 'insensitive' } } },
        { store: { storeCode: { contains: searchCtx.search, mode: 'insensitive' } } },
      );
      if (searchCtx.userIds.length) {
        withdrawalOr.push({ userId: { in: searchCtx.userIds } });
      }
      if (searchCtx.storeIds.length) {
        withdrawalOr.push({ storeId: { in: searchCtx.storeIds } });
      }
      if (isUuid(searchCtx.search)) {
        withdrawalOr.push({ id: searchCtx.search });
      }
    }
    counts.push(
      await prisma.withdrawalRequest.count({
        where: {
          ...(dateFilter ? { createdAt: dateFilter } : {}),
          ...(roleFilter ? { role: roleFilter } : {}),
          ...(withdrawalOr.length ? { OR: withdrawalOr } : {}),
        },
      }),
    );
  }

  return counts.reduce((a, b) => a + b, 0);
}

export { matchesTypeFilter };
