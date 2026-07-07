import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  POST_DELIVERY_RETURN_DISPUTE_HOURS,
} from '../orders/order-time.constants';

export interface OrderDurationConfig {
  assemblyCartDays: number;
  returnWindowHours: number;
  disputeWindowHours: number;
  paymentTimeoutHours: number;
  reminderDaysBeforeAssemblyExpiry: number[];
}

const DEFAULTS: OrderDurationConfig = {
  assemblyCartDays: 7,
  returnWindowHours: POST_DELIVERY_RETURN_DISPUTE_HOURS,
  disputeWindowHours: POST_DELIVERY_RETURN_DISPUTE_HOURS,
  paymentTimeoutHours: 24,
  reminderDaysBeforeAssemblyExpiry: [5, 6],
};

@Injectable()
export class OrderDurationConfigService implements OnModuleInit {
  private readonly logger = new Logger(OrderDurationConfigService.name);
  private cache: { config: OrderDurationConfig; expiresAt: number } | null = null;
  private readonly TTL_MS = 60_000;

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit(): Promise<void> {
    await this.getConfig().catch(() => undefined);
  }

  invalidateCache(): void {
    this.cache = null;
  }

  /** Sync read — uses in-memory cache or safe defaults (for hot paths). */
  getCachedOrDefaults(): OrderDurationConfig {
    return this.cache?.config ?? { ...DEFAULTS };
  }

  getReturnDisputeMsSync(): number {
    const cfg = this.getCachedOrDefaults();
    const hours = Math.max(cfg.returnWindowHours, cfg.disputeWindowHours);
    return hours * 60 * 60 * 1000;
  }

  getAssemblyCartMsSync(): number {
    return this.getCachedOrDefaults().assemblyCartDays * 24 * 60 * 60 * 1000;
  }

  getReturnWindowHoursSync(): number {
    return this.getCachedOrDefaults().returnWindowHours;
  }

  async getConfig(): Promise<OrderDurationConfig> {
    if (this.cache && Date.now() < this.cache.expiresAt) {
      return this.cache.config;
    }

    try {
      const row = await this.prisma.platformSettings.findUnique({
        where: { settingKey: 'system_config' },
      });
      const raw = (row?.settingValue as Record<string, unknown>)?.orderDurations ?? {};
      const config = this.merge(raw as Partial<OrderDurationConfig>);
      this.cache = { config, expiresAt: Date.now() + this.TTL_MS };
      return config;
    } catch (e) {
      this.logger.warn('OrderDurationConfig fallback to defaults', e);
      return { ...DEFAULTS };
    }
  }

  async getAssemblyCartDays(): Promise<number> {
    return (await this.getConfig()).assemblyCartDays;
  }

  async getAssemblyCartMs(): Promise<number> {
    const days = await this.getAssemblyCartDays();
    return days * 24 * 60 * 60 * 1000;
  }

  async getReturnWindowHours(): Promise<number> {
    return (await this.getConfig()).returnWindowHours;
  }

  async getReturnWindowMs(): Promise<number> {
    const hours = await this.getReturnWindowHours();
    return hours * 60 * 60 * 1000;
  }

  async getDisputeWindowHours(): Promise<number> {
    return (await this.getConfig()).disputeWindowHours;
  }

  async getDisputeWindowMs(): Promise<number> {
    const hours = await this.getDisputeWindowHours();
    return hours * 60 * 60 * 1000;
  }

  /** Backward-compatible alias used during migration from constants */
  async getReturnDisputeHours(): Promise<number> {
    return this.getReturnWindowHours();
  }

  async getReturnDisputeMs(): Promise<number> {
    const cfg = await this.getConfig();
    const hours = Math.max(cfg.returnWindowHours, cfg.disputeWindowHours);
    return hours * 60 * 60 * 1000;
  }

  async getPaymentTimeoutHours(): Promise<number> {
    return (await this.getConfig()).paymentTimeoutHours;
  }

  async getReminderDaysBeforeAssemblyExpiry(): Promise<number[]> {
    return (await this.getConfig()).reminderDaysBeforeAssemblyExpiry;
  }

  private merge(fromDb: Partial<OrderDurationConfig>): OrderDurationConfig {
    const reminder = Array.isArray(fromDb.reminderDaysBeforeAssemblyExpiry)
      ? fromDb.reminderDaysBeforeAssemblyExpiry.map(Number).filter((n) => n > 0)
      : DEFAULTS.reminderDaysBeforeAssemblyExpiry;

    return {
      assemblyCartDays: this.clampInt(fromDb.assemblyCartDays, 1, 90, DEFAULTS.assemblyCartDays),
      returnWindowHours: this.clampInt(fromDb.returnWindowHours, 1, 720, DEFAULTS.returnWindowHours),
      disputeWindowHours: this.clampInt(fromDb.disputeWindowHours, 1, 720, DEFAULTS.disputeWindowHours),
      paymentTimeoutHours: this.clampInt(fromDb.paymentTimeoutHours, 1, 168, DEFAULTS.paymentTimeoutHours),
      reminderDaysBeforeAssemblyExpiry: reminder.length ? reminder : DEFAULTS.reminderDaysBeforeAssemblyExpiry,
    };
  }

  private clampInt(value: unknown, min: number, max: number, fallback: number): number {
    const n = Number(value);
    if (!Number.isFinite(n)) return fallback;
    return Math.min(max, Math.max(min, Math.round(n)));
  }
}
