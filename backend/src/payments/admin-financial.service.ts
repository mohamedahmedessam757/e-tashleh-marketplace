import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ActorType, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { StripeService } from '../stripe/stripe.service';
import { FinancialConfigService } from '../common/financial-config.service';
import { NotificationsService } from '../notifications/notifications.service';
import {
  computeAdminFinancialKpis,
  buildAdminDateRange,
  computeSalesTrend,
  computeTopSpenders,
  computeTopEarners,
  roundMoney,
} from './admin-financial-metrics.util';
import {
  computeMerchantGrossSales,
  computeMerchantEscrowBalances,
} from './merchant-wallet-metrics.util';
import { countOpenMerchantCases } from './merchant-withdrawal-governance.util';
import {
  normalizeSearchQuery,
  resolveUserIds,
  resolveStoreIds,
  resolveOrderIds,
  mergeWhereWithSearch,
} from '../common/search/admin-entity-search.util';

export const FINANCIAL_REPORT_IDS = [
  'sales-summary',
  'commission-summary',
  'refund-summary',
  'withdrawal-summary',
  'escrow-summary',
  'penalty-summary',
  'seller-earnings',
  'customer-spending',
  'platform-revenue',
  'reconciliation',
  'daily-transactions',
  // Legacy / UI aliases (resolved before switch)
  'gateway-fees',
  'shipping-collected',
  'refunds-summary',
  'withdrawals-summary',
  'escrow-holdings',
  'seller-balances',
  'customer-balances',
  'penalties-summary',
  'platform-reconciliation',
] as const;

const REPORT_ID_ALIASES: Record<string, FinancialReportId> = {
  'gateway-fees': 'commission-summary',
  'shipping-collected': 'daily-transactions',
  'refunds-summary': 'refund-summary',
  'withdrawals-summary': 'withdrawal-summary',
  'escrow-holdings': 'escrow-summary',
  'seller-balances': 'seller-earnings',
  'customer-balances': 'customer-spending',
  'penalties-summary': 'penalty-summary',
  'platform-reconciliation': 'reconciliation',
};

type CoreReportId =
  | 'sales-summary'
  | 'commission-summary'
  | 'refund-summary'
  | 'withdrawal-summary'
  | 'escrow-summary'
  | 'penalty-summary'
  | 'seller-earnings'
  | 'customer-spending'
  | 'platform-revenue'
  | 'reconciliation'
  | 'daily-transactions';

export type FinancialReportId = (typeof FINANCIAL_REPORT_IDS)[number];

@Injectable()
export class AdminFinancialService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogs: AuditLogsService,
    private readonly stripeService: StripeService,
    private readonly financialConfig: FinancialConfigService,
    private readonly notifications: NotificationsService,
  ) {}

  async getSellerAccounts(filters?: { search?: string; page?: number; limit?: number }) {
    const page = Math.max(1, Number(filters?.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(filters?.limit) || 25));
    const skip = (page - 1) * limit;

    const search = normalizeSearchQuery(filters?.search);
    let storeWhere: Prisma.StoreWhereInput = {};
    if (search) {
      const storeIds = await resolveStoreIds(this.prisma, search);
      storeWhere = storeIds.length ? { id: { in: storeIds } } : { id: 'none' };
    }

    const [stores, total] = await Promise.all([
      this.prisma.store.findMany({
        where: storeWhere,
        select: {
          id: true,
          name: true,
          balance: true,
          pendingBalance: true,
          frozenBalance: true,
          ownerId: true,
        },
        orderBy: { name: 'asc' },
        skip,
        take: limit,
      }),
      this.prisma.store.count({ where: storeWhere }),
    ]);

    const rows = await Promise.all(
      stores.map(async (store) => {
        const [
          escrow,
          totalSales,
          refundsAgg,
          openCases,
          penaltiesAgg,
          withdrawalsAgg,
          pendingWithdrawalsAgg,
        ] = await Promise.all([
          computeMerchantEscrowBalances(this.prisma, store.id),
          computeMerchantGrossSales(this.prisma, store.id),
          this.prisma.paymentTransaction.aggregate({
            where: {
              status: { in: ['REFUNDED', 'SUCCESS'] },
              offer: { storeId: store.id },
              OR: [
                { status: 'REFUNDED' },
                { refundedAmount: { gt: 0 } },
              ],
            },
            _sum: { refundedAmount: true },
          }),
          countOpenMerchantCases(this.prisma, store.id),
          this.prisma.walletTransaction.aggregate({
            where: {
              userId: store.ownerId,
              role: 'VENDOR',
              transactionType: { equals: 'penalty', mode: 'insensitive' },
            },
            _sum: { amount: true },
          }),
          this.prisma.withdrawalRequest.aggregate({
            where: {
              storeId: store.id,
              status: { in: ['TRANSFERRED', 'COMPLETED'] },
            },
            _sum: { amount: true },
          }),
          this.prisma.withdrawalRequest.aggregate({
            where: { storeId: store.id, status: { in: ['PENDING', 'PROCESSING'] } },
            _sum: { amount: true },
          }),
        ]);

        const available = Number(store.balance || 0);
        const pending = Number(store.pendingBalance || 0) || escrow.pending;
        const frozen = Number(store.frozenBalance || 0) || escrow.frozen;
        const withdrawalHold = Number(pendingWithdrawalsAgg._sum.amount || 0);

        return {
          storeName: store.name,
          storeId: store.id,
          pending: roundMoney(pending),
          available: roundMoney(available),
          frozen: roundMoney(frozen),
          totalSales: roundMoney(totalSales),
          totalRefunds: roundMoney(Number(refundsAgg._sum.refundedAmount || 0)),
          disputes: openCases.openCasesCount,
          penalties: roundMoney(Number(penaltiesAgg._sum.amount || 0)),
          withdrawals: roundMoney(Number(withdrawalsAgg._sum.amount || 0)),
          frozenBreakdown: {
            withdrawalHold: roundMoney(withdrawalHold),
            disputeHold: roundMoney(openCases.hasOpenReturnOrDispute ? frozen * 0.5 : 0),
            penaltyHold: roundMoney(Math.max(0, frozen - withdrawalHold)),
            escrowHold: roundMoney(escrow.pending + escrow.frozen),
          },
        };
      }),
    );

    return { data: rows, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  async getCustomerAccounts(filters?: { search?: string; page?: number; limit?: number }) {
    const page = Math.max(1, Number(filters?.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(filters?.limit) || 25));
    const skip = (page - 1) * limit;

    const search = normalizeSearchQuery(filters?.search);
    let userWhere: Prisma.UserWhereInput = { role: 'CUSTOMER' };
    if (search) {
      const userIds = await resolveUserIds(this.prisma, search);
      userWhere = userIds.length
        ? { id: { in: userIds }, role: 'CUSTOMER' }
        : { id: 'none', role: 'CUSTOMER' };
    }

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where: userWhere,
        select: {
          id: true,
          name: true,
          email: true,
          customerBalance: true,
          customerFrozenBalance: true,
        },
        orderBy: { name: 'asc' },
        skip,
        take: limit,
      }),
      this.prisma.user.count({ where: userWhere }),
    ]);

    const rows = await Promise.all(
      users.map(async (user) => {
        const [ordersCount, refundsAgg, disputesCount, withdrawalsAgg] = await Promise.all([
          this.prisma.order.count({ where: { customerId: user.id } }),
          this.prisma.paymentTransaction.aggregate({
            where: { customerId: user.id, refundedAmount: { gt: 0 } },
            _sum: { refundedAmount: true },
          }),
          this.prisma.dispute.count({
            where: {
              customerId: user.id,
              status: { notIn: ['CLOSED', 'RESOLVED'] },
            },
          }),
          this.prisma.withdrawalRequest.aggregate({
            where: {
              userId: user.id,
              role: 'CUSTOMER',
              status: { in: ['TRANSFERRED', 'COMPLETED'] },
            },
            _sum: { amount: true },
          }),
        ]);

        return {
          customerName: user.name || user.email,
          customerId: user.id,
          walletBalance: roundMoney(Number(user.customerBalance || 0)),
          pending: 0,
          frozen: roundMoney(Number(user.customerFrozenBalance || 0)),
          totalOrders: ordersCount,
          totalRefunds: roundMoney(Number(refundsAgg._sum.refundedAmount || 0)),
          disputes: disputesCount,
          withdrawals: roundMoney(Number(withdrawalsAgg._sum.amount || 0)),
        };
      }),
    );

    return { data: rows, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  async getFinancialRefunds(filters?: { search?: string; page?: number; limit?: number }) {
    const page = Math.max(1, Number(filters?.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(filters?.limit) || 25));
    const skip = (page - 1) * limit;

    const search = normalizeSearchQuery(filters?.search);
    let baseWhere: Prisma.ReturnRequestWhereInput = {};
    if (search) {
      const [userIds, storeIds, orderIds] = await Promise.all([
        resolveUserIds(this.prisma, search),
        resolveStoreIds(this.prisma, search),
        resolveOrderIds(this.prisma, search),
      ]);
      const or: Prisma.ReturnRequestWhereInput[] = [];
      if (userIds.length) or.push({ customerId: { in: userIds } });
      if (storeIds.length) or.push({ storeId: { in: storeIds } });
      if (orderIds.length) or.push({ orderId: { in: orderIds } });
      if (or.length) baseWhere = { OR: or };
      else baseWhere = { id: 'none' };
    }

    const [returns, total] = await Promise.all([
      this.prisma.returnRequest.findMany({
        where: baseWhere,
        include: {
          customer: { select: { id: true, name: true, email: true } },
          store: { select: { id: true, name: true } },
          order: { select: { id: true, orderNumber: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.returnRequest.count({ where: baseWhere }),
    ]);

    const data = await Promise.all(
      returns.map(async (ret) => {
        const invoice = ret.invoiceId
          ? await this.prisma.invoice.findUnique({ where: { id: ret.invoiceId } })
          : await this.prisma.invoice.findFirst({ where: { orderId: ret.orderId } });
        const payment = invoice
          ? await this.prisma.paymentTransaction.findUnique({
              where: { id: invoice.paymentId },
              select: { id: true, status: true, refundedAmount: true, gatewayFee: true },
            })
          : null;

        return {
          id: ret.id,
          customer: ret.customer?.name || ret.customer?.email || 'Unknown',
          customerId: ret.customerId,
          store: ret.store?.name || 'Unknown',
          storeId: ret.storeId,
          orderId: ret.orderId,
          orderNumber: ret.order?.orderNumber,
          invoice: invoice?.invoiceNumber || null,
          invoiceId: invoice?.id || null,
          reason: ret.reason,
          refundAmount: roundMoney(Number(ret.refundAmount || ret.netRefundAmount || payment?.refundedAmount || 0)),
          shippingFee: roundMoney(Number(ret.shippingRoundtrip || ret.shippingRefund || 0)),
          gatewayFee: roundMoney(Number(ret.gatewayFeeAmount || payment?.gatewayFee || 0)),
          costBearer: ret.feeBearer || ret.faultParty || null,
          status: ret.status,
          createdAt: ret.createdAt,
        };
      }),
    );

    return { data, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  async getFinancialPenalties(filters?: { search?: string; page?: number; limit?: number }) {
    const page = Math.max(1, Number(filters?.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(filters?.limit) || 25));
    const skip = (page - 1) * limit;

    const search = normalizeSearchQuery(filters?.search);
    let baseWhere: Prisma.WalletTransactionWhereInput = {
      transactionType: { equals: 'penalty', mode: 'insensitive' },
    };
    if (search) {
      const userIds = await resolveUserIds(this.prisma, search);
      const storeIds = await resolveStoreIds(this.prisma, search);
      const or: Prisma.WalletTransactionWhereInput[] = [
        { description: { contains: search, mode: 'insensitive' } },
      ];
      if (userIds.length) or.push({ userId: { in: userIds } });
      if (storeIds.length) {
        const stores = await this.prisma.store.findMany({
          where: { id: { in: storeIds } },
          select: { ownerId: true },
        });
        or.push({ userId: { in: stores.map((s) => s.ownerId) } });
      }
      baseWhere = mergeWhereWithSearch(baseWhere, { OR: or });
    }

    const [rows, total] = await Promise.all([
      this.prisma.walletTransaction.findMany({
        where: baseWhere,
        include: {
          user: { select: { id: true, name: true, email: true, role: true } },
          payment: { select: { orderId: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.walletTransaction.count({ where: baseWhere }),
    ]);

    return {
      data: rows.map((tx) => ({
        id: tx.id,
        userId: tx.userId,
        userName: tx.user?.name || tx.user?.email || 'Unknown',
        userRole: tx.user?.role || tx.role,
        amount: roundMoney(Number(tx.amount)),
        type: tx.type,
        description: tx.description,
        orderId: tx.payment?.orderId || null,
        createdAt: tx.createdAt,
        metadata: tx.metadata,
      })),
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async getSettlementSummary() {
    const range = buildAdminDateRange({});
    const kpis = await computeAdminFinancialKpis(this.prisma, range);

    const [
      escrowHeldAgg,
      storeBalancesAgg,
      platformWallet,
      completedWithdrawalsAgg,
      lastSettlement,
    ] = await Promise.all([
      this.prisma.escrowTransaction.aggregate({
        where: { status: 'HELD' },
        _sum: { merchantAmount: true },
      }),
      this.prisma.store.aggregate({
        _sum: { balance: true, pendingBalance: true, frozenBalance: true },
      }),
      this.prisma.platformWallet.findFirst(),
      this.prisma.withdrawalRequest.aggregate({
        where: { status: { in: ['TRANSFERRED', 'COMPLETED'] } },
        _sum: { amount: true },
      }),
      this.prisma.financialSettlement.findFirst({
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    let stripeBalance: number | null = null;
    try {
      stripeBalance = await this.stripeService.getPlatformBalance();
    } catch {
      stripeBalance = null;
    }

    const escrowHeld = roundMoney(Number(escrowHeldAgg._sum.merchantAmount || 0));
    const transferable = roundMoney(
      Number(storeBalancesAgg._sum.balance || 0) +
        Number(platformWallet?.commissionBalance || 0),
    );
    const transferred = roundMoney(Number(completedWithdrawalsAgg._sum.amount || 0));

    return {
      stripeBalance,
      escrowHeld,
      transferable,
      transferred,
      reconciliationDelta: kpis.reconciliationDelta,
      platformCommissionBalance: kpis.platformCommissionBalance,
      pendingWithdrawals: kpis.pendingWithdrawals,
      lastSettlementAt: lastSettlement?.createdAt || null,
      lastSettlementDelta: lastSettlement
        ? roundMoney(Number(lastSettlement.reconciliationDelta))
        : null,
    };
  }

  async runSettlement(
    adminId: string,
    body: {
      notes?: string;
      reason: string;
      adminSignature?: string;
      adminName?: string;
    },
    auditContext?: { ip?: string | null },
  ) {
    if (!body.reason?.trim() || body.reason.trim().length < 10) {
      throw new BadRequestException('Settlement reason is required (min 10 characters)');
    }

    const summary = await this.getSettlementSummary();
    const snapshot = {
      ...summary,
      capturedAt: new Date().toISOString(),
    };

    const settlement = await this.prisma.financialSettlement.create({
      data: {
        stripeBalance: summary.stripeBalance ?? 0,
        escrowHeld: summary.escrowHeld,
        transferableAmount: summary.transferable,
        transferredAmount: summary.transferred,
        reconciliationDelta: summary.reconciliationDelta,
        dbSnapshot: snapshot as Prisma.InputJsonValue,
        runById: adminId,
        notes: body.notes || null,
      },
    });

    await this.auditLogs.logFinancialAction({
      entity: 'FINANCIAL',
      action: 'FINANCIAL_SETTLEMENT_RUN',
      actorType: ActorType.ADMIN,
      actorId: adminId,
      actorName: body.adminName,
      reason: body.reason.trim(),
      metadata: {
        settlementId: settlement.id,
        adminSignature: body.adminSignature,
        reconciliationDelta: summary.reconciliationDelta,
        ip: auditContext?.ip ?? null,
        beforeData: null,
        afterData: snapshot,
      },
    });

    return {
      success: true,
      message: 'Settlement snapshot recorded successfully',
      settlement,
      summary,
    };
  }

  async getSettlementHistory(limit = 5) {
    const rows = await this.prisma.financialSettlement.findMany({
      orderBy: { createdAt: 'desc' },
      take: Math.min(50, Math.max(1, limit)),
      include: {
        runBy: { select: { id: true, name: true, email: true } },
      },
    });
    return {
      data: rows.map((r) => ({
        id: r.id,
        reconciliationDelta: roundMoney(Number(r.reconciliationDelta)),
        escrowHeld: roundMoney(Number(r.escrowHeld)),
        transferableAmount: roundMoney(Number(r.transferableAmount)),
        transferredAmount: roundMoney(Number(r.transferredAmount)),
        notes: r.notes,
        createdAt: r.createdAt,
        runBy: r.runBy?.name || r.runBy?.email || r.runById,
      })),
    };
  }

  async getFinancialAdjustments(filters?: { search?: string; page?: number; limit?: number }) {
    const page = Math.max(1, Number(filters?.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(filters?.limit) || 25));
    const skip = (page - 1) * limit;

    const search = normalizeSearchQuery(filters?.search);
    let baseWhere: Prisma.FinancialAdjustmentWhereInput = {};
    if (search) {
      const or: Prisma.FinancialAdjustmentWhereInput[] = [
        { adjustmentNumber: { contains: search, mode: 'insensitive' } },
        { reason: { contains: search, mode: 'insensitive' } },
      ];
      const [userIds, orderIds] = await Promise.all([
        resolveUserIds(this.prisma, search),
        resolveOrderIds(this.prisma, search),
      ]);
      if (userIds.length) or.push({ targetUserId: { in: userIds } });
      if (orderIds.length) or.push({ orderId: { in: orderIds } });
      baseWhere = or.length ? { OR: or } : { id: 'none' };
    }

    const [rows, total] = await Promise.all([
      this.prisma.financialAdjustment.findMany({
        where: baseWhere,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.financialAdjustment.count({ where: baseWhere }),
    ]);

    return {
      data: rows.map((row) => ({
        ...row,
        amount: roundMoney(Number(row.amount)),
      })),
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async createFinancialAdjustment(
    adminId: string,
    body: {
      type: 'CREDIT' | 'DEBIT';
      amount: number;
      reason: string;
      invoiceId?: string;
      orderId?: string;
      targetUserId?: string;
      targetStoreId?: string;
      currency?: string;
    },
  ) {
    if (!body.amount || body.amount <= 0) {
      throw new BadRequestException('Amount must be positive');
    }
    if (!body.reason?.trim()) {
      throw new BadRequestException('Reason is required');
    }

    const adjustmentNumber = `ADJ-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

    const result = await this.prisma.$transaction(async (tx) => {
      const adjustment = await tx.financialAdjustment.create({
        data: {
          adjustmentNumber,
          type: body.type,
          amount: body.amount,
          currency: body.currency || 'AED',
          reason: body.reason.trim(),
          invoiceId: body.invoiceId || null,
          orderId: body.orderId || null,
          targetUserId: body.targetUserId || null,
          targetStoreId: body.targetStoreId || null,
          createdById: adminId,
          metadata: {},
        },
      });

      if (body.targetUserId) {
        // Lock the row to prevent concurrent adjustments racing the solvency check.
        await tx.$executeRaw`SELECT id FROM users WHERE id = ${body.targetUserId}::uuid FOR UPDATE`;
        const user = await tx.user.findUnique({ where: { id: body.targetUserId } });
        if (!user) throw new NotFoundException('Target user not found');

        const delta = body.type === 'CREDIT' ? body.amount : -body.amount;
        if (body.type === 'DEBIT' && Number(user.customerBalance || 0) < body.amount) {
          throw new BadRequestException('Insufficient balance for debit adjustment');
        }
        const updated = await tx.user.update({
          where: { id: body.targetUserId },
          data: { customerBalance: { increment: delta } },
        });

        await tx.walletTransaction.create({
          data: {
            userId: body.targetUserId,
            role: 'CUSTOMER',
            type: body.type === 'CREDIT' ? 'CREDIT' : 'DEBIT',
            transactionType: 'ADJUSTMENT',
            amount: body.amount,
            description: `Financial adjustment: ${body.reason}`,
            balanceAfter: Number(updated.customerBalance),
            metadata: { adjustmentId: adjustment.id },
          },
        });
      } else if (body.targetStoreId) {
        await tx.$executeRaw`SELECT id FROM stores WHERE id = ${body.targetStoreId}::uuid FOR UPDATE`;
        const store = await tx.store.findUnique({ where: { id: body.targetStoreId } });
        if (!store) throw new NotFoundException('Target store not found');

        const delta = body.type === 'CREDIT' ? body.amount : -body.amount;
        if (body.type === 'DEBIT' && Number(store.balance || 0) < body.amount) {
          throw new BadRequestException('Insufficient balance for debit adjustment');
        }
        const updated = await tx.store.update({
          where: { id: body.targetStoreId },
          data: { balance: { increment: delta } },
        });

        await tx.walletTransaction.create({
          data: {
            userId: store.ownerId,
            role: 'VENDOR',
            type: body.type === 'CREDIT' ? 'CREDIT' : 'DEBIT',
            transactionType: 'ADJUSTMENT',
            amount: body.amount,
            description: `Financial adjustment: ${body.reason}`,
            balanceAfter: Number(updated.balance),
            metadata: { adjustmentId: adjustment.id, storeId: store.id },
          },
        });
      }

      return adjustment;
    });

    await this.auditLogs.logAction({
      entity: 'FINANCIAL',
      action: 'FINANCIAL_ADJUSTMENT_CREATED',
      actorType: ActorType.ADMIN,
      actorId: adminId,
      orderId: body.orderId,
      metadata: {
        adjustmentId: result.id,
        adjustmentNumber: result.adjustmentNumber,
        type: body.type,
        amount: body.amount,
        beforeData: null,
        afterData: result,
      },
    });

    return { ...result, amount: roundMoney(Number(result.amount)) };
  }

  async getFinancialAudit(filters?: { search?: string; page?: number; limit?: number }) {
    const page = Math.max(1, Number(filters?.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(filters?.limit) || 25));
    const skip = (page - 1) * limit;

    const search = normalizeSearchQuery(filters?.search);
    let baseWhere: Prisma.AuditLogWhereInput = { entity: 'FINANCIAL' };
    if (search) {
      const or: Prisma.AuditLogWhereInput[] = [
        { action: { contains: search, mode: 'insensitive' } },
        { actorName: { contains: search, mode: 'insensitive' } },
        { reason: { contains: search, mode: 'insensitive' } },
      ];
      const userIds = await resolveUserIds(this.prisma, search);
      if (userIds.length) or.push({ actorId: { in: userIds } });
      baseWhere = mergeWhereWithSearch(baseWhere, { OR: or });
    }

    const [logs, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where: baseWhere,
        orderBy: { timestamp: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.auditLog.count({ where: baseWhere }),
    ]);

    return {
      data: logs.map((log) => {
        const meta = (log.metadata || {}) as Record<string, unknown>;
        return {
          id: log.id,
          userName: log.actorName || log.actorId || 'System',
          action: log.action,
          beforeData: meta.beforeData ?? log.previousState ?? null,
          afterData: meta.afterData ?? log.newState ?? null,
          timestamp: log.timestamp,
          ip: meta.ip ?? null,
          reason: log.reason,
          orderId: log.orderId,
          metadata: log.metadata,
        };
      }),
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async getFinancialReport(
    reportId: string,
    filters?: { startDate?: string; endDate?: string; limit?: number },
  ) {
    const resolvedId = (REPORT_ID_ALIASES[reportId] ?? reportId) as CoreReportId;
    const coreIds: CoreReportId[] = [
      'sales-summary',
      'commission-summary',
      'refund-summary',
      'withdrawal-summary',
      'escrow-summary',
      'penalty-summary',
      'seller-earnings',
      'customer-spending',
      'platform-revenue',
      'reconciliation',
      'daily-transactions',
    ];
    if (!coreIds.includes(resolvedId)) {
      throw new NotFoundException(`Unknown report type: ${reportId}`);
    }

    const range = buildAdminDateRange(filters);
    const limit = Math.min(500, Number(filters?.limit) || 100);
    const dateFilter = range.startDate || range.endDate
      ? {
          ...(range.startDate ? { gte: range.startDate } : {}),
          ...(range.endDate ? { lte: range.endDate } : {}),
        }
      : undefined;

    const base = { reportId, requestedReportId: reportId, generatedAt: new Date().toISOString() };

    switch (resolvedId) {
      case 'sales-summary': {
        const [kpis, trend] = await Promise.all([
          computeAdminFinancialKpis(this.prisma, range),
          computeSalesTrend(this.prisma, range),
        ]);
        const rows = (trend || []).map((t: { date?: string; total?: number; count?: number }) => ({
          date: t.date,
          total: t.total,
          count: t.count,
        }));
        return {
          ...base,
          summary: {
            totalSales: kpis.totalSales,
            grossCommission: kpis.grossCommission,
            netCommission: kpis.netCommission,
          },
          rows,
          kpis,
          trend,
        };
      }
      case 'commission-summary': {
        const kpis = await computeAdminFinancialKpis(this.prisma, range);
        const isGatewayOnly = reportId === 'gateway-fees';
        const rows = await this.prisma.paymentTransaction.findMany({
          where: {
            status: 'SUCCESS',
            ...(dateFilter ? { createdAt: dateFilter } : {}),
          },
          select: {
            id: true,
            orderId: true,
            commission: true,
            gatewayFee: true,
            totalAmount: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
          take: limit,
        });
        return {
          ...base,
          summary: isGatewayOnly
            ? { gatewayFees: kpis.gatewayFees }
            : {
                grossCommission: kpis.grossCommission,
                netCommission: kpis.netCommission,
                gatewayFees: kpis.gatewayFees,
              },
          rows: rows.map((r) => ({
            id: r.id,
            orderId: r.orderId,
            commission: roundMoney(Number(r.commission)),
            gatewayFee: roundMoney(Number(r.gatewayFee || 0)),
            totalAmount: roundMoney(Number(r.totalAmount)),
            createdAt: r.createdAt,
          })),
        };
      }
      case 'refund-summary': {
        const kpis = await computeAdminFinancialKpis(this.prisma, range);
        const rows = await this.prisma.returnRequest.findMany({
          where: dateFilter ? { createdAt: dateFilter } : {},
          select: {
            id: true,
            orderId: true,
            status: true,
            refundAmount: true,
            netRefundAmount: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
          take: limit,
        });
        return {
          ...base,
          summary: {
            totalRefunds: kpis.totalRefunds,
            fullRefunds: kpis.fullRefunds,
            partialRefunds: kpis.partialRefunds,
          },
          rows: rows.map((r) => ({
            id: r.id,
            orderId: r.orderId,
            status: r.status,
            refundAmount: roundMoney(Number(r.refundAmount || 0)),
            netRefundAmount: roundMoney(Number(r.netRefundAmount || 0)),
            createdAt: r.createdAt,
          })),
        };
      }
      case 'withdrawal-summary': {
        const rows = await this.prisma.withdrawalRequest.findMany({
          where: dateFilter ? { createdAt: dateFilter } : {},
          include: {
            store: { select: { name: true } },
            user: { select: { name: true, email: true } },
          },
          orderBy: { createdAt: 'desc' },
          take: limit,
        });
        const totals = await this.prisma.withdrawalRequest.groupBy({
          by: ['status'],
          where: dateFilter ? { createdAt: dateFilter } : {},
          _sum: { amount: true },
          _count: { id: true },
        });
        const byStatus = Object.fromEntries(
          totals.map((t) => [
            t.status,
            {
              amount: roundMoney(Number(t._sum.amount || 0)),
              count: t._count.id,
            },
          ]),
        );
        return {
          ...base,
          summary: {
            totalAmount: roundMoney(
              totals.reduce((sum, t) => sum + Number(t._sum.amount || 0), 0),
            ),
            totalCount: totals.reduce((sum, t) => sum + t._count.id, 0),
            pendingAmount: byStatus.PENDING?.amount ?? 0,
            pendingCount: byStatus.PENDING?.count ?? 0,
            approvedAmount: byStatus.APPROVED?.amount ?? 0,
            approvedCount: byStatus.APPROVED?.count ?? 0,
            transferredAmount:
              (byStatus.TRANSFERRED?.amount ?? 0) + (byStatus.COMPLETED?.amount ?? 0),
            transferredCount:
              (byStatus.TRANSFERRED?.count ?? 0) + (byStatus.COMPLETED?.count ?? 0),
            rejectedAmount: byStatus.REJECTED?.amount ?? 0,
            rejectedCount: byStatus.REJECTED?.count ?? 0,
          },
          rows: rows.map((r) => ({
            id: r.id,
            role: r.role,
            target: r.store?.name || r.user?.name || r.user?.email,
            amount: roundMoney(Number(r.amount)),
            status: r.status,
            payoutMethod: r.payoutMethod,
            createdAt: r.createdAt,
          })),
        };
      }
      case 'escrow-summary': {
        const grouped = await this.prisma.escrowTransaction.groupBy({
          by: ['status'],
          where: dateFilter ? { createdAt: dateFilter } : {},
          _sum: { merchantAmount: true, commissionAmount: true },
          _count: { id: true },
        });
        const byStatus = Object.fromEntries(grouped.map((g) => [g.status, g]));
        const held = byStatus.HELD;
        const released = byStatus.RELEASED;
        return {
          ...base,
          summary: {
            heldMerchantAmount: roundMoney(Number(held?._sum.merchantAmount || 0)),
            heldCommissionAmount: roundMoney(Number(held?._sum.commissionAmount || 0)),
            heldCount: held?._count.id ?? 0,
            releasedMerchantAmount: roundMoney(Number(released?._sum.merchantAmount || 0)),
            releasedCommissionAmount: roundMoney(Number(released?._sum.commissionAmount || 0)),
            releasedCount: released?._count.id ?? 0,
          },
          rows: grouped.map((g) => ({
            status: g.status,
            merchantAmount: roundMoney(Number(g._sum.merchantAmount || 0)),
            commissionAmount: roundMoney(Number(g._sum.commissionAmount || 0)),
            count: g._count.id,
          })),
        };
      }
      case 'penalty-summary': {
        const agg = await this.prisma.walletTransaction.aggregate({
          where: {
            transactionType: { equals: 'penalty', mode: 'insensitive' },
            ...(dateFilter ? { createdAt: dateFilter } : {}),
          },
          _sum: { amount: true },
          _count: { id: true },
        });
        const rows = await this.prisma.walletTransaction.findMany({
          where: {
            transactionType: { equals: 'penalty', mode: 'insensitive' },
            ...(dateFilter ? { createdAt: dateFilter } : {}),
          },
          include: { user: { select: { name: true, email: true } } },
          orderBy: { createdAt: 'desc' },
          take: limit,
        });
        return {
          ...base,
          summary: {
            totalPenalties: roundMoney(Number(agg._sum.amount || 0)),
            count: agg._count.id,
          },
          rows: rows.map((r) => ({
            id: r.id,
            user: r.user?.name || r.user?.email,
            amount: roundMoney(Number(r.amount)),
            transactionType: r.transactionType,
            createdAt: r.createdAt,
          })),
        };
      }
      case 'seller-earnings': {
        const earners = await computeTopEarners(this.prisma, range, limit);
        return { ...base, rows: earners };
      }
      case 'customer-spending': {
        const spenders = await computeTopSpenders(this.prisma, range, limit);
        return { ...base, rows: spenders };
      }
      case 'platform-revenue': {
        const kpis = await computeAdminFinancialKpis(this.prisma, range);
        const wallet = await this.prisma.platformWallet.findFirst();
        return {
          ...base,
          summary: {
            platformRevenue: kpis.platformRevenue,
            platformCommissionBalance: kpis.platformCommissionBalance,
            platformFeesBalance: kpis.platformFeesBalance,
            netPlatformPosition: kpis.netPlatformPosition,
          },
          rows: wallet
            ? [
                {
                  commissionBalance: roundMoney(Number(wallet.commissionBalance || 0)),
                  feesBalance: roundMoney(Number(wallet.feesBalance || 0)),
                  updatedAt: wallet.updatedAt,
                },
              ]
            : [],
        };
      }
      case 'reconciliation': {
        const recon = await this.getSettlementSummary();
        return {
          ...base,
          summary: {
            stripeBalance: recon.stripeBalance,
            escrowHeld: recon.escrowHeld,
            transferable: recon.transferable,
            transferred: recon.transferred,
            reconciliationDelta: recon.reconciliationDelta,
            platformCommissionBalance: recon.platformCommissionBalance,
            pendingWithdrawals: recon.pendingWithdrawals,
            lastSettlementAt: recon.lastSettlementAt,
            lastSettlementDelta: recon.lastSettlementDelta,
          },
          rows: [
            {
              stripeBalance: recon.stripeBalance,
              escrowHeld: recon.escrowHeld,
              transferable: recon.transferable,
              transferred: recon.transferred,
              reconciliationDelta: recon.reconciliationDelta,
            },
          ],
        };
      }
      case 'daily-transactions': {
        const trend = await computeSalesTrend(this.prisma, range);
        const kpis = await computeAdminFinancialKpis(this.prisma, range);
        const isShipping = reportId === 'shipping-collected';
        const rows = (trend || []).map((t: { date?: string; total?: number; count?: number }) => ({
          date: t.date,
          ...(isShipping
            ? { shippingCollected: kpis.shippingCollected ?? 0 }
            : { total: t.total, count: t.count }),
        }));
        return {
          ...base,
          summary: {
            dailyTxCount: kpis.dailyTxCount,
            monthlyTxCount: kpis.monthlyTxCount,
            shippingCollected: kpis.shippingCollected,
          },
          rows,
          trend,
        };
      }
      default:
        throw new NotFoundException(`Unknown report type: ${reportId}`);
    }
  }

  async getFinancialSettings() {
    const config = await this.financialConfig.getConfig();
    const withdrawalLimits = await this.prisma.platformSettings.findUnique({
      where: { settingKey: 'withdrawal_limits' },
    });
    return {
      financial: {
        commissionRate: config.commissionRatePercent,
        minCommission: config.minCommissionAed,
        gatewayFeePercent: config.gatewayFeePercent,
        escrowHoldHoursCustomer: config.escrowHoldHoursCustomer,
        escrowHoldHoursMerchant: config.escrowHoldHoursMerchant,
        payoutDelayDaysMerchant: config.payoutDelayDaysMerchant,
        payoutDelayDaysCustomer: config.payoutDelayDaysCustomer,
        loyaltyPointsRate: config.loyaltyPointsRate,
        minWithdrawalCustomer: config.minWithdrawalCustomer,
        minWithdrawalMerchant: config.minWithdrawalMerchant,
        supportedCurrencies: config.supportedCurrencies,
        currencyActivatedAt: config.currencyActivatedAt,
        loyaltyTiers: config.loyaltyTiers,
        customerTierThresholds: config.customerTierThresholds,
        storeLoyaltyTiers: config.storeLoyaltyTiers,
        stripeConnectEnabled: config.stripeConnectEnabled,
      },
      withdrawalLimits: withdrawalLimits?.settingValue ?? null,
    };
  }

  async updateFinancialSettings(
    adminId: string,
    financial: Record<string, unknown>,
    auditContext?: { ip?: string | null },
  ) {
    const reason = String(financial.reason || '').trim();
    if (reason.length < 10) {
      throw new BadRequestException('Financial audit reason is required (min 10 characters)');
    }
    const { reason: _r, adminName, adminSignature, ...financialFields } = financial;
    const existing = await this.prisma.platformSettings.findUnique({
      where: { settingKey: 'system_config' },
    });
    const currentValue = (existing?.settingValue as Record<string, unknown>) ?? {};
    const beforeFinancial = (currentValue.financial as Record<string, unknown>) ?? {};
    const prevStripeEnabled = beforeFinancial.stripeConnectEnabled === true;

    const prevCurrencies = Array.isArray(beforeFinancial.supportedCurrencies)
      ? (beforeFinancial.supportedCurrencies as string[])
      : ['AED'];
    const nextCurrencies = Array.isArray(financialFields.supportedCurrencies)
      ? (financialFields.supportedCurrencies as string[])
      : prevCurrencies;
    const prevActivated =
      typeof beforeFinancial.currencyActivatedAt === 'object' &&
      beforeFinancial.currencyActivatedAt !== null
        ? { ...(beforeFinancial.currencyActivatedAt as Record<string, string>) }
        : { AED: new Date(0).toISOString() };
    const currencyActivatedAt = { ...prevActivated };
    for (const code of nextCurrencies) {
      if (!prevCurrencies.includes(code)) {
        currencyActivatedAt[code] = new Date().toISOString();
      }
    }

    const nextFinancial: Record<string, unknown> = {
      ...beforeFinancial,
      ...financialFields,
      supportedCurrencies: nextCurrencies,
      currencyActivatedAt,
    };

    await this.prisma.platformSettings.upsert({
      where: { settingKey: 'system_config' },
      update: {
        settingValue: { ...currentValue, financial: nextFinancial } as Prisma.InputJsonValue,
      },
      create: {
        settingKey: 'system_config',
        settingValue: { financial: nextFinancial } as Prisma.InputJsonValue,
      },
    });

    const customerMin = Number(
      nextFinancial.minWithdrawalCustomer ?? beforeFinancial.minWithdrawalCustomer ?? 100,
    );
    const merchantMin = Number(
      nextFinancial.minWithdrawalMerchant ?? beforeFinancial.minWithdrawalMerchant ?? 100,
    );
    const withdrawalRow = await this.prisma.platformSettings.findUnique({
      where: { settingKey: 'withdrawal_limits' },
    });
    const prevLimits = (withdrawalRow?.settingValue as Record<string, unknown>) ?? {};
    const nextLimits = {
      ...prevLimits,
      min: customerMin,
      customerMin,
      merchantMin,
    };
    await this.prisma.platformSettings.upsert({
      where: { settingKey: 'withdrawal_limits' },
      update: { settingValue: nextLimits as Prisma.InputJsonValue },
      create: { settingKey: 'withdrawal_limits', settingValue: nextLimits as Prisma.InputJsonValue },
    });

    this.financialConfig.invalidateCache();

    const nextStripeEnabled = nextFinancial.stripeConnectEnabled === true;
    if (prevStripeEnabled !== nextStripeEnabled) {
      await this.broadcastStripeConnectToggle(nextStripeEnabled);
      await this.auditLogs.logFinancialAction({
        entity: 'FINANCIAL',
        action: 'STRIPE_CONNECT_TOGGLED',
        actorType: ActorType.ADMIN,
        actorId: adminId,
        actorName: typeof adminName === 'string' ? adminName : undefined,
        reason,
        metadata: {
          adminSignature,
          ip: auditContext?.ip ?? null,
          enabled: nextStripeEnabled,
        },
      });
    }

    await this.auditLogs.logFinancialAction({
      entity: 'FINANCIAL',
      action: 'UPDATE_FINANCIAL_SETTINGS',
      actorType: ActorType.ADMIN,
      actorId: adminId,
      actorName: typeof adminName === 'string' ? adminName : undefined,
      reason,
      metadata: {
        adminSignature,
        ip: auditContext?.ip ?? null,
        beforeData: beforeFinancial,
        afterData: nextFinancial,
      },
    });

    return this.getFinancialSettings();
  }

  private async broadcastStripeConnectToggle(enabled: boolean) {
    const batchSize = 200;
    let skip = 0;
    for (;;) {
      const users = await this.prisma.user.findMany({
        where: { role: { in: ['CUSTOMER', 'VENDOR'] } },
        select: { id: true, role: true },
        skip,
        take: batchSize,
        orderBy: { createdAt: 'asc' },
      });
      if (!users.length) break;

      for (const user of users) {
        await this.notifications.create({
          recipientId: user.id,
          recipientRole: user.role,
          type: 'SYSTEM',
          titleAr: enabled ? 'تم تفعيل Stripe Connect' : 'تم إيقاف Stripe Connect',
          titleEn: enabled ? 'Stripe Connect Enabled' : 'Stripe Connect Disabled',
          messageAr: enabled
            ? 'يمكنك الآن اختيار Stripe Connect كطريقة سحب أسرع من إعدادات المحفظة.'
            : 'تم إيقاف خيار Stripe Connect. السحب متاح عبر التحويل البنكي فقط.',
          messageEn: enabled
            ? 'You can now choose Stripe Connect as a faster payout method in your wallet settings.'
            : 'Stripe Connect has been disabled. Withdrawals are available via bank transfer only.',
          metadata: { type: 'STRIPE_CONNECT_TOGGLED', enabled },
        });
      }

      skip += batchSize;
      if (users.length < batchSize) break;
    }
  }
}
