import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import {
  Prisma,
  StoreLoyaltyTier,
  StoreSubscriptionTier,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { LoyaltyGateway } from '../loyalty/loyalty.gateway';
import { NotificationsService } from '../notifications/notifications.service';
import {
  FinancialConfigService,
  StoreLoyaltyTierConfig,
} from '../common/financial-config.service';

const TIER_ORDER: Record<StoreLoyaltyTier, number> = {
  BASIC: 1,
  SILVER: 2,
  GOLD: 3,
  VIP: 4,
  ELITE: 5,
};

export type MerchantPerformanceBenefit = { ar: string; en: string };

const STATIC_TIER_BENEFITS: Record<StoreLoyaltyTier, MerchantPerformanceBenefit[]> = {
  BASIC: [{ ar: 'ظهور عادي وعدد عروض محدود', en: 'Standard visibility, limited offers' }],
  SILVER: [{ ar: 'ظهور أفضل وزيادة في عدد العروض', en: 'Better visibility and more offers' }],
  GOLD: [{ ar: 'أولوية الظهور وشارة موثوق', en: 'Search priority and trusted badge' }],
  VIP: [
    { ar: 'أعلى أولوية ظهور', en: 'Highest search priority' },
    { ar: 'شارة خاصة وأولوية في الطلبات', en: 'Special badge and order priority' },
    { ar: 'مدير حساب مميز', en: 'Dedicated account manager' },
  ],
  ELITE: [
    { ar: 'أعلى مستوى — دعوة فقط', en: 'Top tier — invite only' },
    { ar: 'مزايا VIP بالإضافة إلى دعم مخصص', en: 'All VIP benefits plus bespoke support' },
  ],
};

@Injectable()
export class MerchantPerformanceService {
  private readonly logger = new Logger(MerchantPerformanceService.name);

  /** Legacy accessor — rates come from financial config at runtime */
  readonly tierBenefits: Record<
    StoreLoyaltyTier,
    { rate: number; benefits: MerchantPerformanceBenefit[] }
  > = {
    BASIC: { rate: 0.02, benefits: STATIC_TIER_BENEFITS.BASIC },
    SILVER: { rate: 0.03, benefits: STATIC_TIER_BENEFITS.SILVER },
    GOLD: { rate: 0.04, benefits: STATIC_TIER_BENEFITS.GOLD },
    VIP: { rate: 0.05, benefits: STATIC_TIER_BENEFITS.VIP },
    ELITE: { rate: 0.05, benefits: STATIC_TIER_BENEFITS.ELITE },
  };

  constructor(
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => LoyaltyGateway))
    private readonly loyaltyGateway: LoyaltyGateway,
    private readonly notifications: NotificationsService,
    private readonly financialConfig: FinancialConfigService,
  ) {}

  private async getStoreTierRules(): Promise<Record<string, StoreLoyaltyTierConfig>> {
    const config = await this.financialConfig.getConfig();
    return config.storeLoyaltyTiers;
  }

  tierBenefitsFor(
    tier: StoreLoyaltyTier,
    rules: Record<string, StoreLoyaltyTierConfig>,
  ): { rate: number; benefits: MerchantPerformanceBenefit[] } {
    const rule = rules[tier] ?? rules.BASIC;
    return {
      rate: rule?.rate ?? 0.02,
      benefits: STATIC_TIER_BENEFITS[tier] ?? STATIC_TIER_BENEFITS.BASIC,
    };
  }

  tierRank(tier: StoreLoyaltyTier): number {
    return TIER_ORDER[tier] ?? 1;
  }

  /** 40% level + 40% rating + 20% response (0–5 scale). Response falls back to store rating if unset. */
  computeRankingScore(
    tier: StoreLoyaltyTier,
    rating: number,
    avgResponseScore: number,
  ): number {
    const maxAuto = 4; // BASIC..VIP for normalization; ELITE uses 5
    const rank = this.tierRank(tier);
    const normLevel = rank >= 5 ? 1 : (rank - 1) / (maxAuto - 1);
    const normRating = Math.min(1, Math.max(0, rating / 5));
    const response = avgResponseScore > 0 ? avgResponseScore : rating;
    const normResponse = Math.min(1, Math.max(0, response / 5));
    const raw =
      0.4 * normLevel + 0.4 * normRating + 0.2 * normResponse;
    return Math.round(raw * 10000) / 100;
  }

  subscriptionEffective(
    active: boolean,
    tier: StoreSubscriptionTier,
    expiresAt: Date | null,
  ): boolean {
    if (!active || tier === StoreSubscriptionTier.NONE) return false;
    if (expiresAt && expiresAt.getTime() < Date.now()) return false;
    return true;
  }

  computeAutoTier(
    input: {
    rating: number;
    violationPoints: number;
    subscriptionTier: StoreSubscriptionTier;
    subscriptionActive: boolean;
    subscriptionExpiresAt: Date | null;
    completedOrders: number;
    storeCreatedAt: Date;
  },
    rules: Record<string, StoreLoyaltyTierConfig>,
  ): StoreLoyaltyTier {
    const subOk = this.subscriptionEffective(
      input.subscriptionActive,
      input.subscriptionTier,
      input.subscriptionExpiresAt,
    );
    if (!subOk) return StoreLoyaltyTier.BASIC;

    const r = input.rating;
    const v = input.violationPoints;
    const o = input.completedOrders;
    const ageMs = Date.now() - input.storeCreatedAt.getTime();
    const ageDays = ageMs / (24 * 60 * 60 * 1000);

    const isStdOrPrem =
      input.subscriptionTier === StoreSubscriptionTier.STANDARD ||
      input.subscriptionTier === StoreSubscriptionTier.PREMIUM;

    const vip = rules.VIP;
    const gold = rules.GOLD;
    const silver = rules.SILVER;

    if (
      r >= vip.minRating &&
      v < vip.maxViolations &&
      input.subscriptionTier === StoreSubscriptionTier.PREMIUM &&
      o >= vip.minOrders
    ) {
      return StoreLoyaltyTier.VIP;
    }
    if (
      r >= gold.minRating &&
      v < gold.maxViolations &&
      isStdOrPrem &&
      o >= gold.minOrders &&
      ageDays >= gold.minAgeDays
    ) {
      return StoreLoyaltyTier.GOLD;
    }
    if (r >= silver.minRating && v < silver.maxViolations && isStdOrPrem) {
      return StoreLoyaltyTier.SILVER;
    }
    return StoreLoyaltyTier.BASIC;
  }

  isTierUpgrade(oldTier: StoreLoyaltyTier, newTier: StoreLoyaltyTier): boolean {
    return this.tierRank(newTier) > this.tierRank(oldTier);
  }

  isTierDowngrade(oldTier: StoreLoyaltyTier, newTier: StoreLoyaltyTier): boolean {
    return this.tierRank(newTier) < this.tierRank(oldTier);
  }

  /**
   * Single source of truth: persist loyaltyTier + performanceScore, notify, realtime.
   */
  async recalculateAndPersist(
    storeId: string,
    opts?: { skipNotifications?: boolean; skipRealtime?: boolean },
  ): Promise<{
    store: { id: string; loyaltyTier: StoreLoyaltyTier; performanceScore: Prisma.Decimal };
    previousTier: StoreLoyaltyTier;
    nextTier: StoreLoyaltyTier;
  } | null> {
    const store = await this.prisma.store.findUnique({
      where: { id: storeId },
      include: {
        owner: { select: { id: true, violationScore: true } },
      },
    });
    if (!store || !store.owner) {
      this.logger.warn(`recalculateAndPersist: store ${storeId} not found or missing owner`);
      return null;
    }

    const rules = await this.getStoreTierRules();
    const preserveElite = store.loyaltyTier === StoreLoyaltyTier.ELITE;
    const autoTier = this.computeAutoTier({
      rating: Number(store.rating),
      violationPoints: store.owner.violationScore,
      subscriptionTier: store.subscriptionTier,
      subscriptionActive: store.subscriptionActive,
      subscriptionExpiresAt: store.subscriptionExpiresAt,
      completedOrders: store.completedOrdersCount,
      storeCreatedAt: store.createdAt,
    }, rules);

    const nextTier = preserveElite ? StoreLoyaltyTier.ELITE : autoTier;
    const rankingScore = this.computeRankingScore(
      nextTier,
      Number(store.rating),
      Number(store.avgResponseScore),
    );
    const previousTier = store.loyaltyTier;

    const updated = await this.prisma.store.update({
      where: { id: storeId },
      data: {
        loyaltyTier: nextTier,
        performanceScore: rankingScore,
      },
      select: { id: true, loyaltyTier: true, performanceScore: true },
    });

    if (!opts?.skipRealtime) {
      const fresh = await this.prisma.store.findUnique({
        where: { id: storeId },
        select: { lifetimeEarnings: true },
      });
      this.loyaltyGateway.emitLoyaltyUpdate(storeId, 'VENDOR', {
        tier: nextTier,
        performanceScore: rankingScore,
        violationPoints: store.owner.violationScore,
        subscriptionActive: this.subscriptionEffective(
          store.subscriptionActive,
          store.subscriptionTier,
          store.subscriptionExpiresAt,
        ),
        completedOrdersCount: store.completedOrdersCount,
        rating: Number(store.rating),
        lifetimeEarnings: fresh ? Number(fresh.lifetimeEarnings) : undefined,
      });
    }

    if (!opts?.skipNotifications && !preserveElite) {
      if (this.isTierUpgrade(previousTier, nextTier)) {
        await this.notifications.create({
          recipientId: store.ownerId,
          recipientRole: 'MERCHANT',
          titleAr: 'ترقية مستوى الأداء! 🏆',
          titleEn: 'Performance tier upgraded! 🏆',
          messageAr: `وصل متجرك إلى مستوى ${nextTier}.`,
          messageEn: `Your store reached performance tier ${nextTier}.`,
          type: 'loyalty',
        });
      } else if (this.isTierDowngrade(previousTier, nextTier)) {
        await this.notifications.create({
          recipientId: store.ownerId,
          recipientRole: 'MERCHANT',
          titleAr: 'تغيير في مستوى الأداء',
          titleEn: 'Performance tier adjusted',
          messageAr: `تم تعديل مستوى متجرك إلى ${nextTier}. راجع التقييم والمخالفات والاشتراك.`,
          messageEn: `Your store tier was adjusted to ${nextTier}. Review rating, violations, and subscription.`,
          type: 'alert',
        });
      }
    }

    return { store: updated, previousTier, nextTier };
  }

  /** Full payload for merchant dashboard + Gemini UI */
  async getDashboardForOwner(ownerId: string) {
    const store = await this.prisma.store.findUnique({
      where: { ownerId },
      include: {
        owner: { select: { id: true, violationScore: true, referralCode: true } },
      },
    });
    if (!store) return null;

    const subEffective = this.subscriptionEffective(
      store.subscriptionActive,
      store.subscriptionTier,
      store.subscriptionExpiresAt,
    );

    const rules = await this.getStoreTierRules();
    const autoTier = this.computeAutoTier({
      rating: Number(store.rating),
      violationPoints: store.owner.violationScore,
      subscriptionTier: store.subscriptionTier,
      subscriptionActive: store.subscriptionActive,
      subscriptionExpiresAt: store.subscriptionExpiresAt,
      completedOrders: store.completedOrdersCount,
      storeCreatedAt: store.createdAt,
    }, rules);

    const nextTierUp = this.nextTier(store.loyaltyTier);
    const progress = this.buildProgressSnapshot({
      currentTier: store.loyaltyTier,
      nextTier: nextTierUp,
      rating: Number(store.rating),
      violationPoints: store.owner.violationScore,
      completedOrders: store.completedOrdersCount,
      storeCreatedAt: store.createdAt,
      subscriptionTier: store.subscriptionTier,
      subscriptionEffective: subEffective,
    }, rules);

    const tierRow = this.tierBenefitsFor(store.loyaltyTier, rules);
    const benefitsTable = (
      ['BASIC', 'SILVER', 'GOLD', 'VIP', 'ELITE'] as StoreLoyaltyTier[]
    ).map((tier) => {
      const row = this.tierBenefitsFor(tier, rules);
      return {
        tier,
        benefits: row.benefits,
        rate: row.rate,
        pointsRequired: rules[tier]?.pointsRequired ?? 0,
      };
    });

    const silver = rules.SILVER;
    const gold = rules.GOLD;
    const vip = rules.VIP;

    return {
      storeId: store.id,
      loyaltyTier: store.loyaltyTier,
      computedTierCap: store.loyaltyTier === StoreLoyaltyTier.ELITE ? StoreLoyaltyTier.ELITE : autoTier,
      performanceScore: Number(store.performanceScore),
      rankingBreakdown: {
        levelWeight: 0.4,
        ratingWeight: 0.4,
        responseWeight: 0.2,
        rating: Number(store.rating),
        avgResponseScore: Number(store.avgResponseScore),
      },
      subscription: {
        tier: store.subscriptionTier,
        active: store.subscriptionActive,
        effective: subEffective,
        expiresAt: store.subscriptionExpiresAt,
      },
      completedOrdersCount: store.completedOrdersCount,
      violationPoints: store.owner.violationScore,
      violationLimits: {
        freezeAt: 50,
        suspendAt: 80,
      },
      lifetimeEarnings: Number(store.lifetimeEarnings),
      referralCode: store.owner.referralCode,
      currentTierBenefits: tierRow.benefits,
      profitRate: tierRow.rate,
      benefitsByTier: benefitsTable,
      storeLoyaltyTiers: rules,
      progressToNext: progress,
      thresholds: {
        silver: {
          minRating: silver.minRating,
          maxViolationPoints: silver.maxViolations - 1,
          needsPaidSubscription: true,
          pointsRequired: silver.pointsRequired,
        },
        gold: {
          minRating: gold.minRating,
          maxViolationPoints: gold.maxViolations - 1,
          minCompletedOrders: gold.minOrders,
          minAccountAgeDays: gold.minAgeDays,
          minSubscriptionTier: StoreSubscriptionTier.STANDARD,
          pointsRequired: gold.pointsRequired,
        },
        vip: {
          minRating: vip.minRating,
          maxViolationPoints: vip.maxViolations - 1,
          minCompletedOrders: vip.minOrders,
          minSubscriptionTier: StoreSubscriptionTier.PREMIUM,
          pointsRequired: vip.pointsRequired,
        },
      },
    };
  }

  private nextTier(current: StoreLoyaltyTier): StoreLoyaltyTier | null {
    if (current === StoreLoyaltyTier.ELITE) return null;
    const order: StoreLoyaltyTier[] = [
      StoreLoyaltyTier.BASIC,
      StoreLoyaltyTier.SILVER,
      StoreLoyaltyTier.GOLD,
      StoreLoyaltyTier.VIP,
      StoreLoyaltyTier.ELITE,
    ];
    const idx = order.indexOf(current);
    if (idx < 0 || idx >= order.length - 1) return null;
    return order[idx + 1];
  }

  /** 0–1 progress toward a numeric target (0 when value is 0). */
  private ratioToward(value: number, target: number): number {
    if (target <= 0) return value >= target ? 1 : 0;
    if (value <= 0) return 0;
    return Math.min(1, Math.max(0, value / target));
  }

  private weightedPercent(weights: { ratio: number; weight: number }[]): number {
    const totalWeight = weights.reduce((sum, w) => sum + w.weight, 0);
    if (totalWeight <= 0) return 0;
    const raw = weights.reduce((sum, w) => sum + w.ratio * w.weight, 0) / totalWeight;
    return Math.round(raw * 100);
  }

  private buildProgressSnapshot(
    p: {
    currentTier: StoreLoyaltyTier;
    nextTier: StoreLoyaltyTier | null;
    rating: number;
    violationPoints: number;
    completedOrders: number;
    storeCreatedAt: Date;
    subscriptionTier: StoreSubscriptionTier;
    subscriptionEffective: boolean;
  },
    rules: Record<string, StoreLoyaltyTierConfig>,
  ) {
    const silver = rules.SILVER;
    const gold = rules.GOLD;
    const vip = rules.VIP;

    if (!p.nextTier) {
      return {
        nextTier: null,
        percent: 100,
        summaryAr: 'أنت على أعلى مستوى متاح تلقائياً.',
        summaryEn: 'You are at the highest auto-assigned tier.',
        remaining: {} as Record<string, number | boolean | string>,
      };
    }

    if (p.nextTier === StoreLoyaltyTier.ELITE) {
      return {
        nextTier: StoreLoyaltyTier.ELITE,
        percent: 0,
        summaryAr: 'مستوى ELITE يتم عبر دعوة من المنصة فقط.',
        summaryEn: 'ELITE tier is invite-only.',
        remaining: {},
      };
    }

    const remaining: Record<string, number | boolean | string> = {};
    const noActivity = p.rating <= 0 && p.completedOrders <= 0;

    if (noActivity) {
      remaining.ratingGap =
        p.nextTier === StoreLoyaltyTier.SILVER
          ? Math.max(0, silver.minRating - p.rating)
          : p.nextTier === StoreLoyaltyTier.GOLD
            ? Math.max(0, gold.minRating - p.rating)
            : Math.max(0, vip.minRating - p.rating);
      if (p.nextTier === StoreLoyaltyTier.GOLD) {
        remaining.ordersToGold = gold.minOrders;
      } else if (p.nextTier === StoreLoyaltyTier.VIP) {
        remaining.ordersToVip = vip.minOrders;
      }
      return {
        nextTier: p.nextTier,
        percent: 0,
        summaryAr: `المستوى التالي: ${p.nextTier} — ابدأ بإكمال الطلبات وتحسين التقييم`,
        summaryEn: `Next tier: ${p.nextTier} — complete orders and improve rating to begin`,
        remaining,
      };
    }

    let percent = 0;

    if (p.nextTier === StoreLoyaltyTier.SILVER) {
      if (p.violationPoints >= silver.maxViolations) {
        return {
          nextTier: p.nextTier,
          percent: 0,
          summaryAr: 'تجاوزت حد المخالفات — قلّل النقاط للترقية إلى فضي',
          summaryEn: 'Violation limit exceeded — reduce points to reach Silver',
          remaining: { violationHeadroom: 0 },
        };
      }
      remaining.ratingGap = Math.max(0, silver.minRating - p.rating);
      remaining.violationHeadroom = Math.max(0, silver.maxViolations - p.violationPoints);
      percent = this.weightedPercent([
        { ratio: this.ratioToward(p.rating, silver.minRating), weight: 65 },
        { ratio: p.subscriptionEffective ? 1 : 0, weight: 35 },
      ]);
    } else if (p.nextTier === StoreLoyaltyTier.GOLD) {
      if (p.violationPoints >= gold.maxViolations) {
        return {
          nextTier: p.nextTier,
          percent: 0,
          summaryAr: 'تجاوزت حد المخالفات — قلّل النقاط للترقية إلى ذهبي',
          summaryEn: 'Violation limit exceeded — reduce points to reach Gold',
          remaining: { violationHeadroom: 0 },
        };
      }
      const ageDays =
        (Date.now() - p.storeCreatedAt.getTime()) / (24 * 60 * 60 * 1000);
      const hasPaidSub =
        p.subscriptionTier === StoreSubscriptionTier.STANDARD ||
        p.subscriptionTier === StoreSubscriptionTier.PREMIUM;
      remaining.ordersToGold = Math.max(0, gold.minOrders - p.completedOrders);
      remaining.daysToGoldAge = Math.max(0, gold.minAgeDays - ageDays);
      remaining.ratingGap = Math.max(0, gold.minRating - p.rating);
      percent = this.weightedPercent([
        { ratio: this.ratioToward(p.rating, gold.minRating), weight: 25 },
        { ratio: this.ratioToward(p.completedOrders, gold.minOrders), weight: 25 },
        { ratio: this.ratioToward(ageDays, gold.minAgeDays), weight: 15 },
        { ratio: hasPaidSub ? 1 : 0, weight: 17.5 },
        { ratio: p.subscriptionEffective ? 1 : 0, weight: 17.5 },
      ]);
    } else if (p.nextTier === StoreLoyaltyTier.VIP) {
      if (p.violationPoints >= vip.maxViolations) {
        return {
          nextTier: p.nextTier,
          percent: 0,
          summaryAr: 'تجاوزت حد المخالفات — قلّل النقاط للترقية إلى VIP',
          summaryEn: 'Violation limit exceeded — reduce points to reach VIP',
          remaining: { violationHeadroom: 0 },
        };
      }
      remaining.ordersToVip = Math.max(0, vip.minOrders - p.completedOrders);
      remaining.ratingGap = Math.max(0, vip.minRating - p.rating);
      percent = this.weightedPercent([
        { ratio: this.ratioToward(p.rating, vip.minRating), weight: 35 },
        { ratio: this.ratioToward(p.completedOrders, vip.minOrders), weight: 35 },
        { ratio: p.subscriptionTier === StoreSubscriptionTier.PREMIUM ? 1 : 0, weight: 15 },
        { ratio: p.subscriptionEffective ? 1 : 0, weight: 15 },
      ]);
    }

    return {
      nextTier: p.nextTier,
      percent,
      summaryAr: `المستوى التالي: ${p.nextTier}`,
      summaryEn: `Next tier: ${p.nextTier}`,
      remaining,
    };
  }

  /** Nightly full scan — no notifications / realtime (idempotent reconciliation). */
  async recalculateAllActiveStoresBatch() {
    const take = 150;
    let skip = 0;
    let total = 0;
    for (;;) {
      const stores = await this.prisma.store.findMany({
        where: { status: 'ACTIVE' },
        select: { id: true },
        take,
        skip,
      });
      if (!stores.length) break;
      for (const s of stores) {
        try {
          await this.recalculateAndPersist(s.id, {
            skipNotifications: true,
            skipRealtime: true,
          });
        } catch (e) {
          this.logger.error(`Batch recalc failed for ${s.id}`, e);
        }
      }
      total += stores.length;
      skip += take;
    }
    return { processed: total };
  }
}
