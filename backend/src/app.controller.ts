import { Controller, Get, Header } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service';
import { PlatformBrandingService } from './common/platform-branding.service';
import { OrderDurationConfigService } from './common/order-duration-config.service';
import { LogisticsConfigService } from './common/logistics-config.service';
import { PlatformSettingsService } from './platform-settings/platform-settings.service';

@Controller()
export class AppController {
    constructor(
        private prisma: PrismaService,
        private readonly platformBranding: PlatformBrandingService,
        private readonly orderDurationConfig: OrderDurationConfigService,
        private readonly logisticsConfig: LogisticsConfigService,
        private readonly platformSettings: PlatformSettingsService,
    ) {}

    @Get()
    getRoot() {
        return { status: 'ok', message: 'E-Tashleh API is running' };
    }

    @Get('health')
    async healthCheck() {
        const dbOk = await this.prisma.isHealthy();
        return {
            status: dbOk ? 'healthy' : 'degraded',
            database: dbOk ? 'connected' : 'unreachable',
            timestamp: new Date().toISOString(),
        };
    }

    /** Public server clock for client countdown skew correction (display only). */
    @Get('meta/server-time')
    @Header('Cache-Control', 'no-store')
    getServerTime() {
        return { serverNow: new Date().toISOString() };
    }

    @Get('system/status')
    @Header('Cache-Control', 'public, max-age=30, stale-while-revalidate=60')
    async getSystemStatus() {
        const statusSetting = await this.prisma.platformSettings.findUnique({
            where: { settingKey: 'system_status' }
        });
        
        if (!statusSetting || !statusSetting.settingValue) {
            return { maintenanceMode: false };
        }
        
        const value = statusSetting.settingValue as any;
        
        return {
            maintenanceMode: value?.maintenanceMode === true,
            endTime: value?.endTime || null,
            maintenanceMsgAr: value?.maintenanceMsgAr || 'النظام في وضع الصيانة',
            maintenanceMsgEn: value?.maintenanceMsgEn || 'System Under Maintenance',
        };
    }

    @Get('system/public-config')
    @Header('Cache-Control', 'no-store')
    async getPublicConfig() {
        const [branding, orderDurations, logistics, statusSetting, configRow, preferencesEnabled] = await Promise.all([
            this.platformBranding.getConfig(),
            this.orderDurationConfig.getConfig(),
            this.logisticsConfig.getConfig(),
            this.prisma.platformSettings.findUnique({ where: { settingKey: 'system_status' } }),
            this.prisma.platformSettings.findUnique({ where: { settingKey: 'system_config' } }),
            this.platformSettings.isPreferencesStepEnabled(),
        ]);

        const status = (statusSetting?.settingValue ?? {}) as Record<string, unknown>;
        const configValue = (configRow?.settingValue ?? {}) as Record<string, unknown>;
        const company = (configValue.company ?? {}) as Record<string, unknown>;

        return {
            general: {
                ...this.platformBranding.getPublicSnapshot(branding),
                enablePreferencesStep: preferencesEnabled,
            },
            orderDurations,
            logistics: this.logisticsConfig.getPublicSnapshot(logistics),
            company: {
                legalNameAr: company.legalNameAr ?? null,
                legalNameEn: company.legalNameEn ?? null,
                crNumber: company.crNumber ?? null,
                taxNumber: company.taxNumber ?? null,
                licenseNumber: company.licenseNumber ?? null,
                licenseExpiry: company.licenseExpiry ?? null,
                hqAddressAr: company.hqAddressAr ?? null,
                hqAddressEn: company.hqAddressEn ?? null,
                economicRegistryNumber: company.economicRegistryNumber ?? null,
                nomoDocumentUrl: company.nomoDocumentUrl ?? null,
            },
            maintenance: {
                maintenanceMode: status?.maintenanceMode === true,
                endTime: status?.endTime ?? null,
                maintenanceMsgAr: status?.maintenanceMsgAr ?? null,
                maintenanceMsgEn: status?.maintenanceMsgEn ?? null,
            },
        };
    }

    /** @deprecated Use GET /system/public-config — returns sanitized subset only */
    @Get('system/config')
    async getSystemConfig() {
        const pub = await this.getPublicConfig();
        return pub;
    }

    @Get('system/feature-flags')
    @Header('Cache-Control', 'no-store')
    async getFeatureFlags() {
        return this.platformSettings.getPublicFeatureFlags();
    }

}
