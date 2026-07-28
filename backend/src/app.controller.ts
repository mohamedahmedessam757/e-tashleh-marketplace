import { Controller, Get, Header } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service';
import { PlatformBrandingService } from './common/platform-branding.service';
import { OrderDurationConfigService } from './common/order-duration-config.service';
import { LogisticsConfigService } from './common/logistics-config.service';

@Controller()
export class AppController {
    constructor(
        private prisma: PrismaService,
        private readonly platformBranding: PlatformBrandingService,
        private readonly orderDurationConfig: OrderDurationConfigService,
        private readonly logisticsConfig: LogisticsConfigService,
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
    @Header('Cache-Control', 'public, max-age=60, stale-while-revalidate=120')
    async getPublicConfig() {
        const [branding, orderDurations, logistics, statusSetting, configRow] = await Promise.all([
            this.platformBranding.getConfig(),
            this.orderDurationConfig.getConfig(),
            this.logisticsConfig.getConfig(),
            this.prisma.platformSettings.findUnique({ where: { settingKey: 'system_status' } }),
            this.prisma.platformSettings.findUnique({ where: { settingKey: 'system_config' } }),
        ]);

        const status = (statusSetting?.settingValue ?? {}) as Record<string, unknown>;
        const configValue = (configRow?.settingValue ?? {}) as Record<string, unknown>;
        const company = (configValue.company ?? {}) as Record<string, unknown>;
        const generalCfg = (configValue.general ?? {}) as Record<string, unknown>;

        return {
            general: {
                ...this.platformBranding.getPublicSnapshot(branding),
                // Customer create-order wizard reads this; default ON when unset
                enablePreferencesStep: generalCfg.enablePreferencesStep !== false,
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
    async getFeatureFlags() {
        const settings = await this.prisma.platformSettings.findMany({
            where: {
                settingKey: {
                    in: ['CHAT_ATTACHMENTS_ENABLED', 'ALLOW_CUSTOMER_ACCOUNT_DELETION']
                }
            }
        });
        
        const getVal = (key: string, defaultVal: boolean) => {
            const s = settings.find(x => x.settingKey === key);
            if (s) {
                if (typeof s.settingValue === 'boolean') return s.settingValue;
                if (typeof s.settingValue === 'string') return s.settingValue.toLowerCase() === 'true';
                if (typeof s.settingValue === 'object' && s.settingValue !== null) {
                    const obj = s.settingValue as any;
                    if ('value' in obj) return obj.value;
                }
                return Boolean(s.settingValue);
            }
            return defaultVal;
        };

        return {
            CHAT_ATTACHMENTS_ENABLED: getVal('CHAT_ATTACHMENTS_ENABLED', true),
            ALLOW_CUSTOMER_ACCOUNT_DELETION: getVal('ALLOW_CUSTOMER_ACCOUNT_DELETION', true)
        };
    }

}
