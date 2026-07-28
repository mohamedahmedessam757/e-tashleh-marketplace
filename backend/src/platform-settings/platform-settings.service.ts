import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { UAParser } from 'ua-parser-js';
import {
  normalizeClientIp,
  resolveIpLocationSync,
} from '../common/ip/ip-geolocation.util';
import { FinancialConfigService } from '../common/financial-config.service';
import { OrderDurationConfigService } from '../common/order-duration-config.service';
import { LogisticsConfigService } from '../common/logistics-config.service';
import { PlatformBrandingService } from '../common/platform-branding.service';

@Injectable()
export class PlatformSettingsService {
  private readonly logger = new Logger(PlatformSettingsService.name);

  // 2026 Standard: Centralized Setting Keys
  static readonly KEYS = {
    CHAT_ATTACHMENTS_ENABLED: 'CHAT_ATTACHMENTS_ENABLED',
    ALLOW_CUSTOMER_ACCOUNT_DELETION: 'ALLOW_CUSTOMER_ACCOUNT_DELETION',
    ENABLE_PREFERENCES_STEP: 'ENABLE_PREFERENCES_STEP',
    SYSTEM_CONFIG: 'system_config',
    SYSTEM_STATUS: 'system_status',
  };

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogs: AuditLogsService,
    private readonly financialConfig: FinancialConfigService,
    private readonly orderDurationConfig: OrderDurationConfigService,
    private readonly logisticsConfig: LogisticsConfigService,
    private readonly platformBranding: PlatformBrandingService,
  ) {}

  private parseBoolSetting(setting: unknown, defaultVal: boolean): boolean {
    if (setting === undefined || setting === null) return defaultVal;
    if (typeof setting === 'boolean') return setting;
    if (typeof setting === 'string') return setting.toLowerCase() === 'true';
    if (typeof setting === 'number') return setting !== 0;
    if (typeof setting === 'object' && setting !== null && 'value' in (setting as object)) {
      return this.parseBoolSetting((setting as { value: unknown }).value, defaultVal);
    }
    return defaultVal;
  }

  /**
   * Helper to check if account deletion is enabled globally
   */
  async isAccountDeletionEnabled(): Promise<boolean> {
    try {
      const setting = await this.getSetting(PlatformSettingsService.KEYS.ALLOW_CUSTOMER_ACCOUNT_DELETION);
      return this.parseBoolSetting(setting, true);
    } catch (e) {
      return true; // Default to true if setting not found
    }
  }

  /** Global switch for customer/merchant chat file attachments */
  async isChatAttachmentsEnabled(): Promise<boolean> {
    try {
      const setting = await this.getSetting(PlatformSettingsService.KEYS.CHAT_ATTACHMENTS_ENABLED);
      return this.parseBoolSetting(setting, true);
    } catch {
      return true;
    }
  }

  /** Global switch for customer create-order preferences step (new/used) */
  async isPreferencesStepEnabled(): Promise<boolean> {
    try {
      const setting = await this.getSetting(PlatformSettingsService.KEYS.ENABLE_PREFERENCES_STEP);
      return this.parseBoolSetting(setting, true);
    } catch {
      // Backward-compat: older installs stored the flag inside system_config.general
      try {
        const config = (await this.getSetting(PlatformSettingsService.KEYS.SYSTEM_CONFIG)) as Record<string, unknown>;
        const general = (config?.general ?? {}) as Record<string, unknown>;
        return general.enablePreferencesStep !== false;
      } catch {
        return true;
      }
    }
  }

  async getPublicFeatureFlags(): Promise<{
    CHAT_ATTACHMENTS_ENABLED: boolean;
    ALLOW_CUSTOMER_ACCOUNT_DELETION: boolean;
    ENABLE_PREFERENCES_STEP: boolean;
  }> {
    const [attachments, deletion, preferences] = await Promise.all([
      this.isChatAttachmentsEnabled(),
      this.isAccountDeletionEnabled(),
      this.isPreferencesStepEnabled(),
    ]);
    return {
      CHAT_ATTACHMENTS_ENABLED: attachments,
      ALLOW_CUSTOMER_ACCOUNT_DELETION: deletion,
      ENABLE_PREFERENCES_STEP: preferences,
    };
  }

  /**
   * Fetches all platform settings as a key-value object
   */
  async getAllSettings() {
    const settings = await this.prisma.platformSettings.findMany();
    return settings.reduce((acc, curr) => {
      acc[curr.settingKey] = curr.settingValue;
      return acc;
    }, {});
  }

  /**
   * Fetches a specific setting by key
   */
  async getSetting(key: string) {
    const setting = await this.prisma.platformSettings.findUnique({
      where: { settingKey: key },
    });
    if (!setting) {
      throw new NotFoundException(`Setting with key "${key}" not found`);
    }
    return setting.settingValue;
  }

  /**
   * Updates a specific setting and logs the action
   */
  async updateSetting(
    userId: string,
    email: string,
    key: string,
    value: any,
    reason?: string,
    context?: { ip: string; ua: string },
    audit?: { adminName?: string; adminSignature?: string; adminSignatureType?: string },
  ) {
    const oldSetting = await this.prisma.platformSettings.findUnique({
      where: { settingKey: key },
    });

    const updated = await this.prisma.platformSettings.upsert({
      where: { settingKey: key },
      update: {
        settingValue: value,
        updatedAt: new Date(),
      },
      create: {
        settingKey: key,
        settingValue: value,
      },
    });

    // Parse Device Context if available
    let enriched = {};
    if (context) {
      const parser = new UAParser(context.ua);
      const ua = parser.getResult();
      const browser = ua.browser.name
        ? `${ua.browser.name} ${ua.browser.version || ''}`
        : 'Unknown Browser';
      const device = ua.device.model
        ? `${ua.device.vendor || ''} ${ua.device.model}`
        : 'Desktop';

      const cleanIp = normalizeClientIp(context.ip);
      const location =
        resolveIpLocationSync(cleanIp, 'en') || 'Unknown Location';

      enriched = {
        ip: context.ip,
        ua: context.ua,
        browser,
        device,
        location,
      };
    }

    // AUDIT LOGGING (2026 Best Practice)
    await this.auditLogs.logAction({
      actorId: userId,
      actorType: 'ADMIN',
      action: 'UPDATE',
      entity: 'SYSTEM',
      metadata: {
        settingKey: key,
        oldValue: oldSetting?.settingValue || null,
        newValue: value,
        adminName: audit?.adminName,
        adminSignature: audit?.adminSignature,
        adminSignatureType: audit?.adminSignatureType,
      },
      reason: reason || `Updated system setting: ${key}`,
    });

    // ALSO log to Admin Activity Logs
    await this.logAdminActivity(
      userId,
      email || 'unknown@admin.com',
      `UPDATE_SYSTEM_SETTING_${key.toUpperCase()}`,
      { key, value },
      enriched,
    );

    this.logger.log(`Setting "${key}" updated by user ${userId}`);

    if (key === PlatformSettingsService.KEYS.SYSTEM_CONFIG) {
      this.financialConfig.invalidateCache();
      this.orderDurationConfig.invalidateCache();
      this.logisticsConfig.invalidateCache();
      this.platformBranding.invalidateCache();
      const financial = (value as Record<string, unknown>)?.financial;
      if (financial) {
        await this.auditLogs.logAction({
          actorId: userId,
          actorType: 'ADMIN',
          action: 'UPDATE_FINANCIAL_SETTINGS',
          entity: 'FINANCIAL',
          metadata: {
            beforeData: (oldSetting?.settingValue as Record<string, unknown>)?.financial ?? null,
            afterData: financial,
            ip: context?.ip ?? null,
          },
          reason: reason || 'Updated financial settings via platform config',
        });
      }
    }

    return updated.settingValue;
  }

  async logAdminActivity(
    userId: string | null,
    email: string,
    action: string,
    metadata: any = {},
    context: { ip?: string; ua?: string; device?: string; browser?: string; location?: string } = {}
  ) {
    // 2026 Resiliency: Ensure logging never crashes the main flow
    try {
      const isMock = userId != null && userId.startsWith('ADM-');
      const resolvedAdminId = await this.resolveAdminIdForActivityLog(userId);

      const logData = {
        adminId: resolvedAdminId,
        email: email || (isMock ? `${userId}@mock.local` : 'system@platform.com'),
        action: action,
        ipAddress: context.ip || null,
        userAgent: context.ua || null,
        deviceType: context.device || null,
        browser: context.browser || null,
        location: context.location || 'Unknown',
        metadata: {
          ...metadata,
          originalUserId: userId,
          loggedAt: new Date().toISOString()
        },
      };

      // Append-only audit trail. Previously this method DELETED all prior activity records
      // for the admin (keeping only the latest), which destroyed the audit history and let
      // an actor erase evidence simply by performing another action. Audit logs must never be
      // mutated/deleted here — always insert a new immutable record.
      try {
        return await this.prisma.adminActivityLog.create({ data: logData });
      } catch (prismaError) {
        // FK targets auth.users — retry without adminId (user id kept in metadata)
        this.logger.debug(`Activity log FK fallback for user ${userId ?? 'unknown'}`);
        return await this.prisma.adminActivityLog.create({
          data: { ...logData, adminId: null },
        });
      }
    } catch (criticalError) {
      this.logger.error('CRITICAL: Admin activity logging failed completely', criticalError);
      return null;
    }
  }

  /**
   * admin_activity_logs.admin_id FK references auth.users(id), not public.users.
   * Only set adminId when the UUID exists in auth.users.
   */
  private async resolveAdminIdForActivityLog(userId: string | null): Promise<string | null> {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!userId || !uuidRegex.test(userId) || userId.startsWith('ADM-')) {
      return null;
    }

    try {
      const rows = await this.prisma.$queryRaw<{ id: string }[]>`
        SELECT id FROM auth.users WHERE id = ${userId}::uuid LIMIT 1
      `;
      return rows.length > 0 ? userId : null;
    } catch {
      // auth schema unavailable — never guess; metadata.originalUserId preserves the actor
      return null;
    }
  }

  /**
   * Fetches the administration activity logs for security audit
   */
  async getAdminActivityLogs() {
    return this.prisma.adminActivityLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: {
        admin: {
          select: {
            email: true,
            name: true,
            role: true
          }
        }
      }
    });
  }
}
