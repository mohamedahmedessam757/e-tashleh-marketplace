import { Injectable, Inject, forwardRef, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { LoyaltyTier } from '@prisma/client';
import { LoyaltyGateway } from './loyalty.gateway';
import { NotificationsService } from '../notifications/notifications.service';
import { MerchantPerformanceService } from '../merchant-performance/merchant-performance.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { FinancialConfigService, LoyaltyTierConfig } from '../common/financial-config.service';
import {
  reconcileStoreCounters,
  sumMerchantShareByStore,
} from '../payments/merchant-wallet-metrics.util';
import { computeCustomerTotalPurchases } from '../payments/customer-wallet-metrics.util';
import {
  CLOSED_DISPUTE_STATUSES,
  CLOSED_RETURN_STATUSES,
} from '../chat/chat-completion-lock.util';

const TERMINAL_REWARD_STATUSES = new Set([
  'COMPLETED',
  'WARRANTY_ACTIVE',
  'WARRANTY_EXPIRED',
  'CLOSED',
]);

const OPEN_DISPUTE_STATUS_FILTER = {
  notIn: [...CLOSED_DISPUTE_STATUSES, 'REJECTED'] as string[],
};

const OPEN_RETURN_STATUS_FILTER = {
  notIn: [...CLOSED_RETURN_STATUSES] as string[],
};

@Injectable()
export class LoyaltyService {
  private readonly logger = new Logger(LoyaltyService.name);

  constructor(
    private prisma: PrismaService,
    @Inject(forwardRef(() => LoyaltyGateway))
    private readonly loyaltyGateway: LoyaltyGateway,
    private notifications: NotificationsService,
    @Inject(forwardRef(() => MerchantPerformanceService))
    private readonly merchantPerformance: MerchantPerformanceService,
    private readonly auditLogs: AuditLogsService,
    private readonly financialConfig: FinancialConfigService,
  ) {}

  private async getTierConfigMap(): Promise<Record<string, LoyaltyTierConfig>> {
    const config = await this.financialConfig.getConfig();
    return config.loyaltyTiers;
  }

  /**
   * 2026 LOYALTY GOVERNANCE: Cancel ALL loyalty rewards for a user.
   * This is admin-gated via LoyaltyReviewAlert (see ViolationsService.decideLoyaltyAlert).
   *
   * Scope (per spec / chosen behavior):
   *   - Resets `loyaltyPoints` to 0
   *   - Resets `loyaltyTier` to BASIC
   *   - DOES NOT touch `customerBalance` nor reverse paid wallet transactions
   *     (cashback already realized stays with the customer).
   *
   * Always emits audit + realtime + bilingual notification.
   */
  async cancelAllRewards(userId: string, reason: string, adminId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, loyaltyTier: true, loyaltyPoints: true },
    });
    if (!user) {
      this.logger.warn(`[cancelAllRewards] User ${userId} not found.`);
      return null;
    }

    const previousTier = user.loyaltyTier;
    const previousPoints = user.loyaltyPoints;

    const updated = await this.prisma.$transaction(async (tx) => {
      const result = await tx.user.update({
        where: { id: userId },
        data: {
          loyaltyPoints: 0,
          loyaltyTier: 'BASIC' as LoyaltyTier,
          pointsLastResetAt: new Date(),
        },
        select: { id: true, loyaltyTier: true, loyaltyPoints: true, customerBalance: true, pointsLastResetAt: true },
      });

      await this.auditLogs.logAction(
        {
          action: 'LOYALTY_REWARDS_CANCELLED',
          entity: 'USER_LOYALTY',
          actorType: 'ADMIN',
          actorId: adminId,
          previousState: JSON.stringify({ tier: previousTier, points: previousPoints }),
          newState: JSON.stringify({ tier: 'BASIC', points: 0 }),
          reason,
          metadata: { userId, previousTier, previousPoints },
        },
        tx,
      );

      return result;
    });

    // Realtime
    this.loyaltyGateway.emitLoyaltyUpdate(userId, 'CUSTOMER', {
      tier: updated.loyaltyTier,
      loyaltyPoints: updated.loyaltyPoints,
      customerBalance: Number(updated.customerBalance),
      pointsLastResetAt: updated.pointsLastResetAt,
      cancelled: true,
    });

    // Bilingual user notification
    await this.notifications.create({
      recipientId: userId,
      recipientRole: 'CUSTOMER',
      titleAr: 'تم تصفير نقاط الولاء',
      titleEn: 'Loyalty Points Reset',
      messageAr: `تم تصفير نقاط الولاء وإعادة مستواك إلى BASIC بقرار إدارى. السبب: ${reason}`,
      messageEn: `Your loyalty points were reset and tier returned to BASIC by admin decision. Reason: ${reason}`,
      type: 'LOYALTY',
      link: '/dashboard/wallet',
      metadata: { previousTier, previousPoints, decidedBy: adminId },
    });

    this.logger.warn(
      `[cancelAllRewards] user=${userId} previousTier=${previousTier} previousPoints=${previousPoints} reason="${reason}" admin=${adminId}`,
    );

    return {
      resetPoints: previousPoints,
      previousTier,
      newTier: updated.loyaltyTier,
    };
  }

  /**
   * 2026 REWARD ENGINE: Called strictly when an order transitions to COMPLETED.
   * Hardened logic: Rewards are granted only for successful, non-disputed orders.
   * Covers BOTH sides: customer cashback/tier and merchant lifetime earnings/tier.
   */
  async grantOrderCompletionRewards(orderId: string) {
    this.logger.log(`[LoyaltyEngine] Processing 2026 hardened rewards for order ${orderId}`);

    // 1. Fetch Order with Security Audit Data
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        customer: true,
        store: true,
        payments: { where: { status: 'SUCCESS' } },
        disputes: { where: { status: OPEN_DISPUTE_STATUS_FILTER }, select: { id: true } },
        returns: { where: { status: OPEN_RETURN_STATUS_FILTER }, select: { id: true } },
      }
    });

    if (!order || !order.customer) {
      this.logger.error(`[LoyaltyError] Order ${orderId} context missing.`);
      return;
    }

    // Terminal fulfillment statuses (warranty is post-completion, not a failed order).
    // Only OPEN disputes/returns block rewards — closed historical cases do not.
    const isEligible =
        TERMINAL_REWARD_STATUSES.has(order.status) &&
        order.disputes.length === 0 &&
        order.returns.length === 0;

    if (!isEligible) {
      this.logger.warn(`[LoyaltyWarning] Order ${orderId} ineligible. Status: ${order.status}, Disputes: ${order.disputes.length}, Returns: ${order.returns.length}`);
      return;
    }

    const orderProfitWhere = {
      userId: order.customerId,
      transactionType: 'ORDER_PROFIT' as const,
      metadata: { path: ['orderId'], equals: orderId },
    };

    const existingOrderProfit = await this.prisma.walletTransaction.findFirst({
      where: orderProfitWhere,
    });
    if (existingOrderProfit) {
      this.logger.warn(`[LoyaltyEngine] Order ${orderId} rewards already granted. Skipping duplicate.`);
      return;
    }

    // 3. Compute Financial Basis
    const totalCommission = order.payments.reduce((sum, p) => sum + Number(p.commission || 0), 0);
    const orderTotalAmount = order.payments.reduce((sum, p) => sum + Number(p.totalAmount || 0), 0);

    if (totalCommission <= 0) {
      this.logger.log(`[LoyaltyEngine] Order ${orderId} has no platform commission. Skipping cash rewards.`);
      const marked = await this.prisma.$transaction(async (tx) => {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(87201601, hashtext(${orderId}))`;
        const existing = await tx.walletTransaction.findFirst({ where: orderProfitWhere, select: { id: true } });
        if (existing) return false;
        await tx.walletTransaction.create({
          data: {
            userId: order.customerId,
            role: 'CUSTOMER',
            type: 'CREDIT',
            transactionType: 'ORDER_PROFIT',
            amount: 0,
            currency: 'AED',
            description: `Order completion marker (no commission): #${order.orderNumber}`,
            balanceAfter: Number(order.customer.customerBalance),
            metadata: { orderId: order.id, skipReason: 'no_commission' },
          },
        });
        return true;
      });
      if (marked) await this.applyMerchantCompletionCounters(orderId);
      return;
    }

    // 4. SMART CAPS & TIER CONFIG (v2026 Core Specs — from platform financial settings)
    const tierConfig = await this.getTierConfigMap();
    const defaultTier = tierConfig.BASIC || { percent: 0.02, monthlyCap: 2000 };

    const config = tierConfig[order.customer.loyaltyTier] || defaultTier;
    
    // 5. Compute Profit with Smart Order-Level Caps
    const EARNED_RAW = totalCommission * config.percent;
    const MIN_ORDER_REWARD = 2.0;
    const MAX_ORDER_REWARD = 150.0;

    let earnedProfit = Math.max(MIN_ORDER_REWARD, Math.min(MAX_ORDER_REWARD, EARNED_RAW));

    // 6. DYNAMIC MONTHLY CAPS (Fiscal Protection)
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    // Calculate actual monthly cap for PARTNER (10% of monthly spent)
    let effectiveMonthlyCap = config.monthlyCap;
    if (order.customer.loyaltyTier === 'PARTNER') {
        const monthlySpentTotal = await this.prisma.order.aggregate({
            where: {
                customerId: order.customerId,
                status: 'COMPLETED',
                createdAt: { gte: startOfMonth }
            },
            _sum: { totalAmount: true }
        });
        effectiveMonthlyCap = Number(monthlySpentTotal._sum.totalAmount || 0) * 0.10;
        // PARTNER has a minimum safety cap of 5000 even if they didn't spend much this month
        if (effectiveMonthlyCap < 5000) effectiveMonthlyCap = 5000;
    }

    // Check current monthly earnings vs cap
    const monthlyProfits = await this.prisma.walletTransaction.aggregate({
      where: {
        userId: order.customerId,
        transactionType: 'ORDER_PROFIT',
        createdAt: { gte: startOfMonth }
      },
      _sum: { amount: true }
    });

    const currentMonthlyProfitTotal = Number(monthlyProfits._sum.amount || 0);
    let hitMonthlyCap = false;

    if (currentMonthlyProfitTotal >= effectiveMonthlyCap) {
      this.logger.warn(`[LoyaltyEngine] User ${order.customerId} reached monthly cap (${effectiveMonthlyCap}). Reward skipped.`);
      earnedProfit = 0;
      hitMonthlyCap = true;
    } else if (currentMonthlyProfitTotal + earnedProfit > effectiveMonthlyCap) {
      earnedProfit = effectiveMonthlyCap - currentMonthlyProfitTotal;
    }

    // 7. POINTS CALCULATION (1 AED Commission = 1 Reward Point)
    const earnedPoints = Math.floor(totalCommission);

    // 8. ATOMIC EXECUTION (Balance & Progress)
    const currentTotalSpent = Number(order.customer.totalSpent);
    const newTotalSpent = currentTotalSpent + orderTotalAmount;
    const oldTier = order.customer.loyaltyTier;
    const newTier = await this.calculateTier(newTotalSpent);

    const result = await this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(87201601, hashtext(${orderId}))`;
      const existing = await tx.walletTransaction.findFirst({
        where: orderProfitWhere,
        select: { id: true },
      });
      if (existing) return null;

      const updatedUser = await tx.user.update({
        where: { id: order.customerId },
        data: {
          totalSpent: newTotalSpent,
          loyaltyTier: newTier,
          loyaltyPoints: { increment: earnedPoints },
          customerBalance: { increment: earnedProfit }
        }
      });

      // Always write ORDER_PROFIT (amount may be 0 at monthly cap) so heal paths stay idempotent.
      await tx.walletTransaction.create({
        data: {
          userId: order.customerId,
          role: 'CUSTOMER',
          type: 'CREDIT',
          transactionType: 'ORDER_PROFIT',
          amount: earnedProfit,
          currency: 'AED',
          description: `Order Success Reward: #${order.orderNumber} (${oldTier} Level)`,
          balanceAfter: Number(updatedUser.customerBalance),
          metadata: { 
              orderId: order.id, 
              commission: totalCommission, 
              earnedPoints,
              rate: `${config.percent * 100}%`,
              capsApplied: earnedProfit < EARNED_RAW,
              skipReason: hitMonthlyCap ? 'monthly_cap' : undefined,
          }
        }
      });

      return updatedUser;
    });

    if (!result) {
      this.logger.warn(`[LoyaltyEngine] Order ${orderId} rewards already granted (race). Skipping duplicate.`);
      return;
    }

    await this.applyMerchantCompletionCounters(orderId);

    if (hitMonthlyCap) {
      await this.notifications.create({
        recipientId: order.customerId,
        recipientRole: 'CUSTOMER',
        titleAr: 'تم الوصول للحد الشهري! 🛑',
        titleEn: 'Monthly Cap Reached! 🛑',
        messageAr: `لقد حققت الحد الأقصى للأرباح لهذا الشهر (${effectiveMonthlyCap} درهم). ستتمكن من البدء في كسب مكافآت جديدة ابتداءً من الشهر القادم. استمر في التميز!`,
        messageEn: `You've reached your maximum profit cap for this month (${effectiveMonthlyCap} AED). You will start earning rewards again next month. Keep it up!`,
        type: 'loyalty',
        link: '/dashboard/wallet'
      });
    }

    // 9. REAL-TIME SYNCHRONIZATION
    this.loyaltyGateway.emitLoyaltyUpdate(order.customerId, 'CUSTOMER', {
      tier: newTier,
      loyaltyPoints: result.loyaltyPoints,
      customerBalance: Number(result.customerBalance),
      earnedPoints,
      earnedProfit,
      totalSpent: Number(result.totalSpent)
    });

    // 10. NOTIFICATION ENGINE — Customer Tier Upgrade
    if (this.isTierUpgrade(oldTier, newTier)) {
      await this.notifications.create({
        recipientId: order.customerId,
        recipientRole: 'CUSTOMER',
        titleAr: 'ارتقاء مستوى الولاء! 🎊',
        titleEn: 'Loyalty Level Ascended! 🎊',
        messageAr: `مبروك! لقد وصلت إلى مستوى ${newTier}. نسبة أرباحك الآن هي ${tierConfig[newTier].percent * 100}%.`,
        messageEn: `Congrats! You have reached ${newTier} level. Your profit share is now ${tierConfig[newTier].percent * 100}%.`,
        type: 'loyalty',
        link: '/dashboard/wallet'
      });
    }

    // 11. MERCHANT SIDE handled in applyMerchantCompletionCounters (multi-part via offer.storeId)

    return { earnedPoints, earnedProfit, newTier };
  }

  /** Increment lifetime earnings (unitPrice share) + completed order count per store on the order. */
  private async applyMerchantCompletionCounters(orderId: string): Promise<void> {
    const payments = await this.prisma.paymentTransaction.findMany({
      where: { orderId, status: 'SUCCESS' },
      include: { offer: { select: { storeId: true } } },
    });

    const byStore = sumMerchantShareByStore(payments);
    if (byStore.size === 0) return;

    for (const [storeId, share] of byStore.entries()) {
      if (share <= 0) continue;
      await this.prisma.store.update({
        where: { id: storeId },
        data: {
          lifetimeEarnings: { increment: share },
          completedOrdersCount: { increment: 1 },
        },
      });
      await this.merchantPerformance.recalculateAndPersist(storeId);
    }
  }

  /**
   * 2026 REFERRAL ENGINE v2 — Triggered when an order transitions to COMPLETED.
   * Rules:
   *   - Pays 1% of platform commission (sum of PaymentTransaction.commission) to the referrer
   *   - Only if the referred user is still inside their 6-month window (180 days from referralStartsAt)
   *   - Applies on EVERY successful (COMPLETED, no dispute, no return) order during the window
   *   - Idempotent: a single (referrer, orderId) pair can only be rewarded once
   */
  async processReferralReward(orderId: string) {
    const REFERRAL_RATE = 0.01;
    const REFERRAL_WINDOW_DAYS = 180;

    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            referredById: true,
            referralStartsAt: true,
            createdAt: true
          }
        },
        payments: { where: { status: 'SUCCESS' } },
        disputes: { where: { status: OPEN_DISPUTE_STATUS_FILTER }, select: { id: true } },
        returns: { where: { status: OPEN_RETURN_STATUS_FILTER }, select: { id: true } },
      }
    });

    if (!order || !order.customer || !order.customer.referredById) return;

    // Hard block: corrupted / self-referral link must never pay the buyer
    if (order.customer.referredById === order.customer.id) {
      this.logger.warn(
        `[Referral] Self-referral blocked for user ${order.customer.id} on order ${orderId}`,
      );
      return;
    }

    if (
      !TERMINAL_REWARD_STATUSES.has(order.status) ||
      order.disputes.length > 0 ||
      order.returns.length > 0
    ) {
      this.logger.warn(
        `[Referral] Order ${orderId} ineligible. status=${order.status} disputes=${order.disputes.length} returns=${order.returns.length}`
      );
      return;
    }

    // 6-month window check (referralStartsAt falls back to createdAt for legacy users)
    const startsAt: Date | null = order.customer.referralStartsAt || order.customer.createdAt || null;
    if (!startsAt) {
      this.logger.warn(`[Referral] Missing referralStartsAt and createdAt for user ${order.customer.id}`);
      return;
    }
    const expiresAt = new Date(new Date(startsAt).getTime() + REFERRAL_WINDOW_DAYS * 24 * 60 * 60 * 1000);
    if (new Date() > expiresAt) {
      this.logger.log(
        `[Referral] Window expired for user ${order.customer.id}. Expired on ${expiresAt.toISOString()}.`
      );
      return;
    }

    // Idempotency: prevent duplicate reward for the same order
    const existing = await this.prisma.walletTransaction.findFirst({
      where: {
        userId: order.customer.referredById,
        transactionType: 'REFERRAL_PROFIT',
        metadata: { path: ['orderId'], equals: orderId }
      }
    });
    if (existing) {
      this.logger.warn(`[Referral] Duplicate prevention: order ${orderId} already rewarded.`);
      return;
    }

    // Compute reward = 1% × sum of platform commission
    const totalCommission = order.payments.reduce((sum, p) => sum + Number(p.commission || 0), 0);
    if (totalCommission <= 0) {
      this.logger.log(`[Referral] Order ${orderId} has zero platform commission. Skipping.`);
      return;
    }
    const rewardAmount = Number((totalCommission * REFERRAL_RATE).toFixed(2));
    if (rewardAmount <= 0) return;

    const referredById = order.customer.referredById;

    const referralWhere = {
      userId: referredById,
      transactionType: 'REFERRAL_PROFIT' as const,
      metadata: { path: ['orderId'], equals: orderId },
    };

    const result = await this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(87201603, hashtext(${orderId}))`;
      const dup = await tx.walletTransaction.findFirst({
        where: referralWhere,
        select: { id: true },
      });
      if (dup) return null;

      const referrer = await tx.user.update({
        where: { id: referredById },
        data: {
          customerBalance: { increment: rewardAmount },
          loyaltyPoints: { increment: Math.floor(rewardAmount) }
        }
      });

      await tx.walletTransaction.create({
        data: {
          userId: referredById,
          role: 'CUSTOMER',
          type: 'CREDIT',
          transactionType: 'REFERRAL_PROFIT',
          amount: rewardAmount,
          currency: 'AED',
          description: `Referral commission 1%: friend ${order.customer.name || 'User'} order #${order.orderNumber}`,
          balanceAfter: Number(referrer.customerBalance),
          metadata: {
            orderId: order.id,
            orderNumber: order.orderNumber,
            referredUserId: order.customer.id,
            totalCommission,
            rate: REFERRAL_RATE,
            windowStartsAt: new Date(startsAt).toISOString(),
            windowExpiresAt: expiresAt.toISOString()
          }
        }
      });

      return referrer;
    });

    if (!result || !referredById) {
      this.logger.warn(`[Referral] Duplicate prevention: order ${orderId} already rewarded (race).`);
      return;
    }

    this.loyaltyGateway.emitLoyaltyUpdate(referredById, 'CUSTOMER', {
      customerBalance: Number(result.customerBalance),
      loyaltyPoints: result.loyaltyPoints,
      referralCount: result.referralCount
    });

    await this.notifications.create({
      recipientId: referredById,
      recipientRole: 'CUSTOMER',
      titleAr: 'مكافأة إحالة جديدة! 💸',
      titleEn: 'New Referral Reward! 💸',
      messageAr: `استلمت ${rewardAmount} درهم (1%) من طلب صديقك ${order.customer.name || ''} رقم #${order.orderNumber}.`,
      messageEn: `You received ${rewardAmount} AED (1%) from your friend ${order.customer.name || ''}'s order #${order.orderNumber}.`,
      type: 'loyalty',
      link: '/dashboard/wallet'
    });

    return { rewardAmount, referredById };
  }

  async redeemPoints(userId: string, amount: number, description: string) {
    if (!Number.isInteger(amount) || amount <= 0) {
      throw new BadRequestException('Invalid redeem amount');
    }

    const exists = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });
    if (!exists) throw new NotFoundException('User not found');

    // Atomic conditional decrement — prevents concurrent double-spend of points.
    // Only rows that still have enough points are updated.
    const claimed = await this.prisma.user.updateMany({
      where: { id: userId, loyaltyPoints: { gte: amount } },
      data: { loyaltyPoints: { decrement: amount } },
    });
    if (claimed.count === 0) {
      throw new BadRequestException('Insufficient points');
    }

    const updated = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: {
        loyaltyPoints: true,
        loyaltyTier: true,
        customerBalance: true,
        pointsLastResetAt: true,
      },
    });

    this.loyaltyGateway.emitLoyaltyUpdate(userId, 'CUSTOMER', {
      tier: updated.loyaltyTier,
      loyaltyPoints: updated.loyaltyPoints,
    });

    return {
      success: true,
      points: updated.loyaltyPoints,
      transaction: {
        id: `redeem-${Date.now()}`,
        points: -amount,
        type: 'REDEEM',
        description,
        created_at: new Date().toISOString(),
      },
    };
  }

  async getLoyaltyData(userId: string) {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: {
          loyaltyTier: true,
          totalSpent: true,
          loyaltyPoints: true,
          referralCount: true,
          referralCode: true,
          customerBalance: true,
          pointsLastResetAt: true,
        }
      });

      if (!user) {
        return {
          loyaltyTier: 'BASIC',
          totalSpent: 0,
          loyaltyPoints: 0,
          referralCount: 0,
          referralCode: null,
          pointsLastResetAt: new Date(),
          submittedReviews: []
        };
      }

      // Safe separate fetch for reviews to prevent schema mismatch from crashing the whole page
      let submittedReviews = [];
      try {
        const reviews = await this.prisma.review.findMany({
            where: { customerId: userId },
            include: { store: true },
            orderBy: { createdAt: 'desc' }
        });
        submittedReviews = reviews;
      } catch (reviewError) {
        this.logger.warn(`Failed to fetch reviews for user ${userId} (Schema mismatch likely): ${reviewError.message}`);
      }

      return {
          ...user,
          submittedReviews
      };
    } catch (error) {
      this.logger.error(`Error fetching loyalty data for user ${userId}`, error);
      // Fallback empty state for DB schema mismatch/migration issues
      return {
          loyaltyTier: 'BASIC',
          totalSpent: 0,
          loyaltyPoints: 0,
          referralCount: 0,
          referralCode: null,
          pointsLastResetAt: new Date(),
          submittedReviews: []
      };
    }
  }

  async getMerchantLoyalty(storeId: string) {
    const store = await this.prisma.store.findUnique({
      where: { id: storeId },
      select: {
        loyaltyTier: true,
        performanceScore: true,
        lifetimeEarnings: true,
        rating: true,
        subscriptionTier: true,
        subscriptionActive: true,
        completedOrdersCount: true,
        avgResponseScore: true,
        reviews: {
          take: 5,
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    return store;
  }

  async calculateTier(totalSpent: number): Promise<LoyaltyTier> {
    const config = await this.financialConfig.getConfig();
    const t = config.customerTierThresholds;
    if (totalSpent >= t.PARTNER) return 'PARTNER';
    if (totalSpent >= t.VIP) return 'VIP';
    if (totalSpent >= t.GOLD) return 'GOLD';
    if (totalSpent >= t.SILVER) return 'SILVER';
    return 'BASIC';
  }

  isTierUpgrade(oldTier: LoyaltyTier, newTier: LoyaltyTier): boolean {
    const ranks: Record<string, number> = { 'BASIC': 1, 'SILVER': 2, 'GOLD': 3, 'VIP': 4, 'PARTNER': 5 };
    return ranks[newTier] > ranks[oldTier];
  }

  /**
   * Public Stats for "Earn Monthly Income" Landing Page.
   * Returns authentic aggregates only (no inflated social-proof padding).
   */
  async getPublicStats() {
    try {
      const stats = await this.prisma.$transaction(async (tx) => {
        const totalUsers = await tx.user.count({ where: { role: 'CUSTOMER' } });
        const totalReferrals = await tx.user.count({ where: { NOT: { referredById: null } } });

        const totalRewards = await tx.walletTransaction.aggregate({
          where: {
            type: 'CREDIT',
            transactionType: { in: ['ORDER_PROFIT', 'REFERRAL_PROFIT'] },
          },
          _sum: { amount: true },
        });

        return {
          totalUsers,
          totalReferrals,
          totalDistributed: Number(totalRewards._sum.amount || 0),
          currency: 'AED',
        };
      });

      return stats;
    } catch (error) {
      this.logger.error('Failed to fetch public loyalty stats', error);
      return { totalUsers: 0, totalReferrals: 0, totalDistributed: 0, currency: 'AED' };
    }
  }

  /**
   * Returns per-referee statistics: first name only (privacy), window dates,
   * total earned by the referrer from each referee, orders count.
   * Optimized: 2 queries total (referees + all referral wallet_transactions),
   * grouped in-memory. O(R + T) where R = referees, T = referral txs.
   */
  async getReferralHistory(userId: string) {
    const REFERRAL_WINDOW_DAYS = 180;
    const windowMs = REFERRAL_WINDOW_DAYS * 24 * 60 * 60 * 1000;

    const referees = await this.prisma.user.findMany({
      where: { referredById: userId },
      select: {
        id: true,
        name: true,
        createdAt: true,
        referralStartsAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (referees.length === 0) {
      return {
        referrals: [],
        totals: { count: 0, earned: 0, activeCount: 0 },
      };
    }

    // Bulk-fetch all REFERRAL_PROFIT transactions for this referrer in one query
    const allRewards = await this.prisma.walletTransaction.findMany({
      where: {
        userId,
        type: 'CREDIT',
        transactionType: 'REFERRAL_PROFIT',
      },
      select: { amount: true, metadata: true, createdAt: true },
    });

    // Group rewards by referredUserId from metadata JSON
    const rewardsByReferee = new Map<
      string,
      { total: number; orders: number; lastAt?: Date }
    >();
    for (const tx of allRewards) {
      const refereeId = (tx.metadata as any)?.referredUserId;
      if (!refereeId) continue;
      const prev =
        rewardsByReferee.get(refereeId) || { total: 0, orders: 0, lastAt: undefined };
      prev.total += Number(tx.amount);
      prev.orders += 1;
      if (!prev.lastAt || tx.createdAt > prev.lastAt) prev.lastAt = tx.createdAt;
      rewardsByReferee.set(refereeId, prev);
    }

    const now = Date.now();
    const referrals = referees.map((r) => {
      const startsAt = r.referralStartsAt || r.createdAt;
      const expiresAt = new Date(startsAt.getTime() + windowMs);
      const msRemaining = expiresAt.getTime() - now;
      const daysRemaining = Math.max(
        0,
        Math.ceil(msRemaining / (24 * 60 * 60 * 1000))
      );
      const isActive = msRemaining > 0;
      const stats =
        rewardsByReferee.get(r.id) || { total: 0, orders: 0, lastAt: undefined };

      return {
        id: r.id,
        firstName: (r.name || '').split(' ')[0] || 'User',
        registeredAt: r.createdAt.toISOString(),
        windowStartsAt: startsAt.toISOString(),
        windowExpiresAt: expiresAt.toISOString(),
        daysRemaining,
        isActive,
        totalEarned: Number(stats.total.toFixed(2)),
        ordersCount: stats.orders,
        lastRewardAt: stats.lastAt?.toISOString() || null,
      };
    });

    const totals = {
      count: referrals.length,
      earned: Number(
        referrals.reduce((s, r) => s + r.totalEarned, 0).toFixed(2)
      ),
      activeCount: referrals.filter((r) => r.isActive).length,
    };

    return { referrals, totals };
  }

  /**
   * Reverse cashback + referral credits after a successful customer refund.
   * Idempotent via metadata.reverses + caseId.
   */
  async reverseRewardsForCustomerRefund(orderId: string, caseId: string): Promise<void> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        orderNumber: true,
        customerId: true,
        customer: { select: { id: true, customerBalance: true, loyaltyPoints: true } },
      },
    });
    if (!order?.customer) {
      await this.reverseMerchantCompletionCounters(orderId);
      return;
    }

    const profitCredits = await this.prisma.walletTransaction.findMany({
      where: {
        type: 'CREDIT',
        transactionType: { in: ['ORDER_PROFIT', 'REFERRAL_PROFIT'] },
        metadata: { path: ['orderId'], equals: orderId },
      },
    });

    for (const credit of profitCredits) {
      const amount = Number(credit.amount || 0);

      const existing = await this.prisma.walletTransaction.findFirst({
        where: {
          type: 'DEBIT',
          transactionType: credit.transactionType,
          metadata: { path: ['reverses'], equals: credit.id },
        },
        select: { id: true },
      });
      if (existing) continue;

      const user = await this.prisma.user.findUnique({
        where: { id: credit.userId },
        select: { id: true, customerBalance: true, loyaltyPoints: true },
      });
      if (!user) continue;

      const debitAmount = Math.min(Math.max(0, amount), Number(user.customerBalance || 0));
      const remainingLiability = Number(Math.max(0, amount - debitAmount).toFixed(2));
      const fullyRecovered = remainingLiability <= 0.009;
      const creditMeta = (credit.metadata || {}) as {
        commission?: number;
        earnedPoints?: number;
      };
      // ORDER_PROFIT points = floor(commission); REFERRAL_PROFIT points = floor(reward amount)
      const pointsToRemove =
        credit.transactionType === 'ORDER_PROFIT'
          ? Math.min(
              Number(user.loyaltyPoints || 0),
              Math.max(0, Math.floor(Number(creditMeta.commission || creditMeta.earnedPoints || 0))),
            )
          : credit.transactionType === 'REFERRAL_PROFIT'
            ? Math.min(
                Number(user.loyaltyPoints || 0),
                Math.max(0, Math.floor(amount)),
              )
            : 0;

      if (debitAmount <= 0 && pointsToRemove <= 0) {
        if (amount > 0) {
          this.logger.warn(
            `[LoyaltyEngine] Refund reversal deferred for tx=${credit.id} order=${orderId}: wallet empty, remaining=${amount}`,
          );
        }
        continue;
      }

      const updated = await this.prisma.user.update({
        where: { id: user.id },
        data: {
          ...(debitAmount > 0 ? { customerBalance: { decrement: debitAmount } } : {}),
          ...(pointsToRemove > 0 ? { loyaltyPoints: { decrement: pointsToRemove } } : {}),
        },
      });

      if (debitAmount > 0) {
        await this.prisma.walletTransaction.create({
          data: {
            userId: user.id,
            role: 'CUSTOMER',
            type: 'DEBIT',
            transactionType: credit.transactionType,
            amount: debitAmount,
            currency: 'AED',
            description:
              credit.transactionType === 'REFERRAL_PROFIT'
                ? `Referral reward reversed after refund — order #${order.orderNumber}`
                : `Cashback reversed after refund — order #${order.orderNumber}`,
            balanceAfter: Number(updated.customerBalance),
            metadata: {
              orderId,
              caseId,
              ...(fullyRecovered ? { reverses: credit.id } : {}),
              originalAmount: amount,
              remainingLiability,
              pointsReversed: pointsToRemove,
            },
          },
        });
      }

      this.loyaltyGateway.emitLoyaltyUpdate(user.id, 'CUSTOMER', {
        loyaltyPoints: updated.loyaltyPoints,
        customerBalance: Number(updated.customerBalance),
        reversed: fullyRecovered,
        orderId,
        caseId,
      });

      if (fullyRecovered || pointsToRemove > 0) {
        await this.notifications.create({
          recipientId: user.id,
          recipientRole: 'CUSTOMER',
          type: 'loyalty',
          titleAr: 'تم إلغاء مكافأة الطلب',
          titleEn: 'Order reward reversed',
          messageAr: `تم إلغاء الكاش باك / نقاط الولاء للطلب #${order.orderNumber} بعد استرداد المبلغ.`,
          messageEn: `Cashback / loyalty points for order #${order.orderNumber} were reversed after the refund.`,
          link: '/dashboard/wallet',
          metadata: { orderId, caseId, waEvent: 'ORDER_STATUS' },
        }).catch(() => {});
      }
    }

    await this.syncCustomerSpendAfterRefund(order.customerId);
    await this.reverseMerchantCompletionCounters(orderId);
  }

  /** Align users.totalSpent + loyaltyTier with live non-refunded purchases. */
  private async syncCustomerSpendAfterRefund(customerId: string): Promise<void> {
    const purchases = await computeCustomerTotalPurchases(this.prisma, customerId);
    const user = await this.prisma.user.findUnique({
      where: { id: customerId },
      select: { totalSpent: true },
    });
    if (!user) return;
    if (Math.abs(Number(user.totalSpent || 0) - purchases) <= 0.01) return;
    const loyaltyTier = await this.calculateTier(purchases);
    await this.prisma.user.update({
      where: { id: customerId },
      data: { totalSpent: purchases, loyaltyTier },
    });
  }

  /**
   * Re-sync store lifetimeEarnings + completedOrdersCount from live payments.
   * Idempotent — reconcile overwrites cached counters including zero after refund.
   */
  async reverseMerchantCompletionCounters(orderId: string): Promise<void> {
    const payments = await this.prisma.paymentTransaction.findMany({
      where: { orderId },
      include: { offer: { select: { storeId: true } } },
    });
    const storeIds = new Set<string>();
    for (const p of payments) {
      if (p.offer?.storeId) storeIds.add(p.offer.storeId);
    }
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      select: { storeId: true },
    });
    if (order?.storeId) storeIds.add(order.storeId);
    if (storeIds.size === 0) return;

    for (const storeId of storeIds) {
      await reconcileStoreCounters(this.prisma, storeId).catch(() => undefined);
      await this.merchantPerformance
        .recalculateAndPersist(storeId)
        .catch(() => undefined);
    }
  }
}
