import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface WeightBracket {
  id: string;
  minWeight: number;
  maxWeight: number;
  price: number;
}

export interface ShipmentTypeConfig {
  id: string;
  nameAr: string;
  nameEn: string;
  basePrice: number;
  isWeightBound: boolean;
  weightBrackets: WeightBracket[];
  hasCylinders?: boolean;
  cylinderRates?: { cylinders: number; price: number }[];
}

export interface LogisticsConfig {
  globalMinWeightKg: number;
  globalMaxWeightKg: number;
  shipmentTypes: ShipmentTypeConfig[];
}

const DEFAULTS: LogisticsConfig = {
  globalMinWeightKg: 0,
  globalMaxWeightKg: 50,
  shipmentTypes: [],
};

@Injectable()
export class LogisticsConfigService {
  private readonly logger = new Logger(LogisticsConfigService.name);
  private cache: { config: LogisticsConfig; expiresAt: number } | null = null;
  private readonly TTL_MS = 60_000;

  constructor(private readonly prisma: PrismaService) {}

  invalidateCache(): void {
    this.cache = null;
  }

  async getConfig(): Promise<LogisticsConfig> {
    if (this.cache && Date.now() < this.cache.expiresAt) {
      return this.cache.config;
    }

    try {
      const row = await this.prisma.platformSettings.findUnique({
        where: { settingKey: 'system_config' },
      });
      const logistics = (row?.settingValue as Record<string, unknown>)?.logistics ?? {};
      const config = this.merge(logistics as Partial<LogisticsConfig>);
      this.cache = { config, expiresAt: Date.now() + this.TTL_MS };
      return config;
    } catch (e) {
      this.logger.warn('LogisticsConfig fallback to defaults', e);
      return { ...DEFAULTS };
    }
  }

  async assertWeightAllowed(
    weightKg: number,
    options?: { shipmentTypeId?: string },
    lang: 'ar' | 'en' = 'en',
  ): Promise<void> {
    const cfg = await this.getConfig();
    if (!this.isWeightEnforcementEnabled(cfg)) {
      return;
    }

    if (options?.shipmentTypeId) {
      const type = cfg.shipmentTypes.find((t) => t.id === options.shipmentTypeId);
      if (type && !type.isWeightBound) {
        return;
      }
    }

    const w = Number(weightKg);
    if (!Number.isFinite(w) || w < 0) {
      throw new BadRequestException(
        lang === 'ar' ? 'الوزن غير صالح' : 'Invalid weight',
      );
    }
    if (w > 0 && (w < cfg.globalMinWeightKg || w > cfg.globalMaxWeightKg)) {
      throw new BadRequestException(
        lang === 'ar'
          ? `الوزن يجب أن يكون بين ${cfg.globalMinWeightKg} و ${cfg.globalMaxWeightKg} كجم`
          : `Weight must be between ${cfg.globalMinWeightKg} and ${cfg.globalMaxWeightKg} kg`,
      );
    }
  }

  isWeightEnforcementEnabled(config?: LogisticsConfig): boolean {
    const cfg = config ?? this.cache?.config;
    if (!cfg) return false;
    return cfg.shipmentTypes.some((t) => t.isWeightBound);
  }

  getPublicSnapshot(config: LogisticsConfig) {
    return {
      globalMinWeightKg: config.globalMinWeightKg,
      globalMaxWeightKg: config.globalMaxWeightKg,
      shipmentTypes: config.shipmentTypes.map((t) => ({
        id: t.id,
        nameAr: t.nameAr,
        nameEn: t.nameEn,
        basePrice: t.basePrice,
        isWeightBound: t.isWeightBound,
        weightBrackets: t.weightBrackets,
        hasCylinders: Boolean(t.hasCylinders),
        cylinderRates: t.cylinderRates || [],
      })),
    };
  }

  /**
   * Canonical shipping cost used by merchant UI and offer create/update.
   * - hasCylinders → cylinder rate
   * - isWeightBound → matched bracket price only (no basePrice); weight<=0 → 0
   * - else → basePrice only
   */
  computeShippingCost(params: {
    partType?: string | null;
    weightKg?: number | null;
    cylinders?: number | null;
    config?: LogisticsConfig;
  }): number {
    const cfg = params.config;
    if (!cfg) return 0;
    const typeId = params.partType || 'standard';
    const shipmentType = cfg.shipmentTypes.find((t) => t.id === typeId);
    if (!shipmentType) return 0;

    if (shipmentType.hasCylinders) {
      const rate = (shipmentType.cylinderRates || []).find(
        (r) => r.cylinders === Number(params.cylinders),
      );
      return rate ? Number(rate.price) || 0 : 0;
    }

    if (shipmentType.isWeightBound) {
      const w = Number(params.weightKg) || 0;
      if (!(w > 0)) return 0;
      const brackets = shipmentType.weightBrackets || [];
      const bracket = brackets.find((b) => w >= b.minWeight && w <= b.maxWeight);
      if (bracket) return Number(bracket.price) || 0;
      if (brackets.length > 0) {
        const sorted = [...brackets].sort((a, b) => b.maxWeight - a.maxWeight);
        if (w > sorted[0].maxWeight) return Number(sorted[0].price) || 0;
      }
      return 0;
    }

    return Number(shipmentType.basePrice) || 0;
  }

  private merge(fromDb: Partial<LogisticsConfig>): LogisticsConfig {
    const min = this.clampNum(fromDb.globalMinWeightKg, 0, 10_000, DEFAULTS.globalMinWeightKg);
    let max = this.clampNum(fromDb.globalMaxWeightKg, min, 10_000, DEFAULTS.globalMaxWeightKg);
    if (max < min) max = min;

    const shipmentTypes = Array.isArray(fromDb.shipmentTypes)
      ? (fromDb.shipmentTypes as ShipmentTypeConfig[])
      : DEFAULTS.shipmentTypes;

    return {
      globalMinWeightKg: min,
      globalMaxWeightKg: max,
      shipmentTypes,
    };
  }

  private clampNum(value: unknown, min: number, max: number, fallback: number): number {
    const n = Number(value);
    if (!Number.isFinite(n)) return fallback;
    return Math.min(max, Math.max(min, n));
  }
}
