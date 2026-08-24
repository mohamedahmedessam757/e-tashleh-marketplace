import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { computeStripeGatewayFee } from '../payments/gateway-fee.util';

export interface LoyaltyTierConfig {
  percent: number;
  monthlyCap: number;
  withdrawalMin?: number;
  withdrawalMax?: number;
}

export interface CustomerTierThresholds {
  SILVER: number;
  GOLD: number;
  VIP: number;
  PARTNER: number;
}

export interface StoreLoyaltyTierConfig {
  rate: number;
  pointsRequired: number;
  minRating: number;
  maxViolations: number;
  minOrders: number;
  minAgeDays: number;
  withdrawalMin?: number;
  withdrawalMax?: number;
}

export interface FinancialConfig {
  commissionRatePercent: number;
  minCommissionAed: number;
  gatewayFeePercent: number;
  /** Fixed AED added on top of percent (Stripe-style, e.g. 0.30). */
  gatewayFeeFixedAed: number;
  escrowHoldHoursCustomer: number;
  escrowHoldHoursMerchant: number;
  payoutDelayDaysMerchant: number;
  payoutDelayDaysCustomer: number;
  loyaltyPointsRate: number;
  minWithdrawalCustomer: number;
  minWithdrawalMerchant: number;
  stripeConnectEnabled: boolean;
  supportedCurrencies: string[];
  currencyActivatedAt: Record<string, string>;
  loyaltyTiers: Record<string, LoyaltyTierConfig>;
  customerTierThresholds: CustomerTierThresholds;
  storeLoyaltyTiers: Record<string, StoreLoyaltyTierConfig>;
}

export interface WithdrawalLimitProfile {
  min: number;
  max: number;
  tier: string;
  payoutMethods: ('BANK_TRANSFER' | 'STRIPE')[];
  stripeConnectEnabled: boolean;
}

const DEFAULT_TIER_WITHDRAWAL: Record<string, { withdrawalMin: number; withdrawalMax: number }> = {
  BASIC: { withdrawalMin: 100, withdrawalMax: 2000 },
  SILVER: { withdrawalMin: 100, withdrawalMax: 3000 },
  GOLD: { withdrawalMin: 100, withdrawalMax: 5000 },
  VIP: { withdrawalMin: 100, withdrawalMax: 8000 },
  PARTNER: { withdrawalMin: 100, withdrawalMax: 10000 },
  ELITE: { withdrawalMin: 100, withdrawalMax: 10000 },
};

const DEFAULT_STORE_TIER_WITHDRAWAL: Record<string, { withdrawalMin: number; withdrawalMax: number }> = {
  BASIC: { withdrawalMin: 100, withdrawalMax: 2000 },
  SILVER: { withdrawalMin: 100, withdrawalMax: 3000 },
  GOLD: { withdrawalMin: 100, withdrawalMax: 5000 },
  VIP: { withdrawalMin: 100, withdrawalMax: 8000 },
  ELITE: { withdrawalMin: 100, withdrawalMax: 10000 },
};

const DEFAULT_LOYALTY_TIERS: Record<string, LoyaltyTierConfig> = {
  BASIC: { percent: 0.02, monthlyCap: 2000, ...DEFAULT_TIER_WITHDRAWAL.BASIC },
  SILVER: { percent: 0.03, monthlyCap: 2000, ...DEFAULT_TIER_WITHDRAWAL.SILVER },
  GOLD: { percent: 0.04, monthlyCap: 2000, ...DEFAULT_TIER_WITHDRAWAL.GOLD },
  VIP: { percent: 0.05, monthlyCap: 5000, ...DEFAULT_TIER_WITHDRAWAL.VIP },
  PARTNER: { percent: 0.06, monthlyCap: -1, ...DEFAULT_TIER_WITHDRAWAL.PARTNER },
  ELITE: { percent: 0.06, monthlyCap: 5000, ...DEFAULT_TIER_WITHDRAWAL.ELITE },
};

const DEFAULT_CUSTOMER_TIER_THRESHOLDS: CustomerTierThresholds = {
  SILVER: 1000,
  GOLD: 3000,
  VIP: 10000,
  PARTNER: 20000,
};

const DEFAULT_STORE_LOYALTY_TIERS: Record<string, StoreLoyaltyTierConfig> = {
  BASIC: { rate: 0.02, pointsRequired: 0, minRating: 0, maxViolations: 999, minOrders: 0, minAgeDays: 0, ...DEFAULT_STORE_TIER_WITHDRAWAL.BASIC },
  SILVER: { rate: 0.03, pointsRequired: 35, minRating: 3.5, maxViolations: 40, minOrders: 0, minAgeDays: 0, ...DEFAULT_STORE_TIER_WITHDRAWAL.SILVER },
  GOLD: { rate: 0.04, pointsRequired: 55, minRating: 4.0, maxViolations: 25, minOrders: 10, minAgeDays: 30, ...DEFAULT_STORE_TIER_WITHDRAWAL.GOLD },
  VIP: { rate: 0.05, pointsRequired: 70, minRating: 4.5, maxViolations: 10, minOrders: 50, minAgeDays: 0, ...DEFAULT_STORE_TIER_WITHDRAWAL.VIP },
  ELITE: { rate: 0.05, pointsRequired: 100, minRating: 5.0, maxViolations: 0, minOrders: 100, minAgeDays: 90, ...DEFAULT_STORE_TIER_WITHDRAWAL.ELITE },
};

const DEFAULTS: FinancialConfig = {
  commissionRatePercent: 25,
  minCommissionAed: 100,
  gatewayFeePercent: 2.99,
  gatewayFeeFixedAed: 0.3,
  escrowHoldHoursCustomer: 24,
  escrowHoldHoursMerchant: 24,
  payoutDelayDaysMerchant: 0,
  payoutDelayDaysCustomer: 0,
  loyaltyPointsRate: 0,
  minWithdrawalCustomer: 100,
  minWithdrawalMerchant: 100,
  stripeConnectEnabled: false,
  supportedCurrencies: ['AED'],
  currencyActivatedAt: { AED: new Date(0).toISOString() },
  loyaltyTiers: DEFAULT_LOYALTY_TIERS,
  customerTierThresholds: DEFAULT_CUSTOMER_TIER_THRESHOLDS,
  storeLoyaltyTiers: DEFAULT_STORE_LOYALTY_TIERS,
};

function mergeTierConfig<T extends object>(
  defaults: Record<string, T>,
  fromDb: Record<string, Partial<T>> | null,
): Record<string, T> {
  const merged = { ...defaults };
  if (!fromDb) return merged;
  for (const key of Object.keys(defaults)) {
    merged[key] = { ...defaults[key], ...(fromDb[key] ?? {}) };
  }
  return merged;
}

@Injectable()
export class FinancialConfigService {
  private readonly logger = new Logger(FinancialConfigService.name);
  private cache: { config: FinancialConfig; expiresAt: number } | null = null;
  private readonly TTL_MS = 60_000;

  constructor(private readonly prisma: PrismaService) {}

  async getConfig(): Promise<FinancialConfig> {
    if (this.cache && Date.now() < this.cache.expiresAt) {
      return this.cache.config;
    }

    try {
      const row = await this.prisma.platformSettings.findUnique({
        where: { settingKey: 'system_config' },
      });
      const financial = (row?.settingValue as any)?.financial ?? {};
      const config: FinancialConfig = {
        commissionRatePercent: Number(financial.commissionRate ?? DEFAULTS.commissionRatePercent),
        minCommissionAed: Number(financial.minCommission ?? DEFAULTS.minCommissionAed),
        gatewayFeePercent: Number(financial.gatewayFeePercent ?? DEFAULTS.gatewayFeePercent),
        gatewayFeeFixedAed: Number(
          financial.gatewayFeeFixedAed ?? DEFAULTS.gatewayFeeFixedAed,
        ),
        escrowHoldHoursCustomer: Number(
          financial.escrowHoldHoursCustomer ?? DEFAULTS.escrowHoldHoursCustomer,
        ),
        escrowHoldHoursMerchant: Number(
          financial.escrowHoldHoursMerchant ?? DEFAULTS.escrowHoldHoursMerchant,
        ),
        payoutDelayDaysMerchant: Number(
          financial.payoutDelayDaysMerchant ?? DEFAULTS.payoutDelayDaysMerchant,
        ),
        payoutDelayDaysCustomer: Number(
          financial.payoutDelayDaysCustomer ?? DEFAULTS.payoutDelayDaysCustomer,
        ),
        loyaltyPointsRate: Number(financial.loyaltyPointsRate ?? DEFAULTS.loyaltyPointsRate),
        minWithdrawalCustomer: Number(
          financial.minWithdrawalCustomer ?? DEFAULTS.minWithdrawalCustomer,
        ),
        minWithdrawalMerchant: Number(
          financial.minWithdrawalMerchant ?? DEFAULTS.minWithdrawalMerchant,
        ),
        stripeConnectEnabled: financial.stripeConnectEnabled === true,
        supportedCurrencies: Array.isArray(financial.supportedCurrencies)
          ? financial.supportedCurrencies
          : DEFAULTS.supportedCurrencies,
        currencyActivatedAt:
          typeof financial.currencyActivatedAt === 'object' &&
          financial.currencyActivatedAt !== null
            ? (financial.currencyActivatedAt as Record<string, string>)
            : DEFAULTS.currencyActivatedAt,
        loyaltyTiers: mergeTierConfig(
          DEFAULT_LOYALTY_TIERS,
          typeof financial.loyaltyTiers === 'object' && financial.loyaltyTiers !== null
            ? (financial.loyaltyTiers as Record<string, LoyaltyTierConfig>)
            : null,
        ),
        customerTierThresholds: {
          ...DEFAULT_CUSTOMER_TIER_THRESHOLDS,
          ...(typeof financial.customerTierThresholds === 'object' &&
          financial.customerTierThresholds !== null
            ? (financial.customerTierThresholds as CustomerTierThresholds)
            : {}),
        },
        storeLoyaltyTiers: mergeTierConfig(
          DEFAULT_STORE_LOYALTY_TIERS,
          typeof financial.storeLoyaltyTiers === 'object' && financial.storeLoyaltyTiers !== null
            ? (financial.storeLoyaltyTiers as Record<string, StoreLoyaltyTierConfig>)
            : null,
        ),
      };
      this.cache = { config, expiresAt: Date.now() + this.TTL_MS };
      return config;
    } catch (err) {
      this.logger.warn('Failed to load financial config, using defaults', err);
      return { ...DEFAULTS };
    }
  }

  invalidateCache() {
    this.cache = null;
  }

  getCustomerCashbackRate(tier: string, config?: FinancialConfig): number {
    const c = config?.loyaltyTiers ?? DEFAULT_LOYALTY_TIERS;
    return c[tier]?.percent ?? c.BASIC?.percent ?? 0.02;
  }

  getActiveCurrencies(config: FinancialConfig): string[] {
    return config.supportedCurrencies.filter(
      (code) => config.currencyActivatedAt[code] != null,
    );
  }

  async getGlobalWithdrawalLimits(): Promise<{ customerMin: number; merchantMin: number; max: number }> {
    const config = await this.getConfig();
    const row = await this.prisma.platformSettings.findUnique({
      where: { settingKey: 'withdrawal_limits' },
    });
    const stored = (row?.settingValue as Record<string, unknown>) ?? {};
    return {
      customerMin: Number(stored.customerMin ?? stored.min ?? config.minWithdrawalCustomer),
      merchantMin: Number(stored.merchantMin ?? config.minWithdrawalMerchant),
      max: Number(stored.max ?? 10000),
    };
  }

  async getWithdrawalLimitsForUser(userId: string): Promise<WithdrawalLimitProfile> {
    const config = await this.getConfig();
    const [user, global] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: userId },
        select: { loyaltyTier: true },
      }),
      this.getGlobalWithdrawalLimits(),
    ]);
    const tier = user?.loyaltyTier || 'BASIC';
    const tierCfg = config.loyaltyTiers[tier] ?? config.loyaltyTiers.BASIC;
    const tierMin = tierCfg.withdrawalMin ?? global.customerMin;
    const tierMax = tierCfg.withdrawalMax ?? global.max;
    const min = Math.max(global.customerMin, tierMin);
    const max = Math.min(global.max, tierMax);
    const payoutMethods: ('BANK_TRANSFER' | 'STRIPE')[] = ['BANK_TRANSFER'];
    if (config.stripeConnectEnabled) payoutMethods.push('STRIPE');
    return { min, max, tier, payoutMethods, stripeConnectEnabled: config.stripeConnectEnabled };
  }

  async getWithdrawalLimitsForStore(storeId: string): Promise<WithdrawalLimitProfile> {
    const config = await this.getConfig();
    const [store, global] = await Promise.all([
      this.prisma.store.findUnique({
        where: { id: storeId },
        select: { loyaltyTier: true },
      }),
      this.getGlobalWithdrawalLimits(),
    ]);
    const tier = store?.loyaltyTier || 'BASIC';
    const tierCfg = config.storeLoyaltyTiers[tier] ?? config.storeLoyaltyTiers.BASIC;
    const tierMin = tierCfg.withdrawalMin ?? global.merchantMin;
    const tierMax = tierCfg.withdrawalMax ?? global.max;
    const min = Math.max(global.merchantMin, tierMin);
    const max = Math.min(global.max, tierMax);
    const payoutMethods: ('BANK_TRANSFER' | 'STRIPE')[] = ['BANK_TRANSFER'];
    if (config.stripeConnectEnabled) payoutMethods.push('STRIPE');
    return { min, max, tier, payoutMethods, stripeConnectEnabled: config.stripeConnectEnabled };
  }

  computeCommission(unitPrice: number, config?: FinancialConfig): number {
    return this.computeCommissionSync(unitPrice, config ?? DEFAULTS);
  }

  async computeCommissionForPrice(unitPrice: number): Promise<number> {
    const config = await this.getConfig();
    return this.computeCommissionSync(unitPrice, config);
  }

  private computeCommissionSync(unitPrice: number, config: FinancialConfig): number {
    if (unitPrice <= 0) return 0;
    const percentCommission = Math.round(unitPrice * (config.commissionRatePercent / 100));
    return Math.max(percentCommission, config.minCommissionAed);
  }

  /** Stripe-style gateway fee from current (or provided) financial settings. */
  computeGatewayFee(orderTotal: number, config?: FinancialConfig): number {
    const c = config ?? DEFAULTS;
    return computeStripeGatewayFee(orderTotal, c.gatewayFeePercent, c.gatewayFeeFixedAed);
  }

  async computeGatewayFeeForTotal(orderTotal: number): Promise<number> {
    const config = await this.getConfig();
    return this.computeGatewayFee(orderTotal, config);
  }
}
