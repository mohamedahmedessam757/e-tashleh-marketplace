import {
    Controller,
    ForbiddenException,
    Get,
    Post,
    Body,
    Param,
    Query,
    Req,
    HttpCode,
    HttpStatus,
    UseGuards,
} from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { WidersConfig } from './widers.config';
import { WidersService } from './widers.service';
import { WhatsAppChannelService } from './whatsapp-channel.service';
import { WidersContactSyncService } from './widers-contact-sync.service';
import { WidersReadinessService } from './widers-readiness.service';
import { WidersTemplateAuditService } from './widers-template-audit.service';
import { WhatsAppMessageLogService } from './whatsapp-message-log.service';
import { NotificationsService } from '../notifications/notifications.service';
import { TEMPLATE_REGISTRY } from './template-registry';
import type { WidersHealthStatus } from './widers.types';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
    resolveTemplateFamily,
    type NotificationDispatchInput,
    type WhatsAppAudienceRole,
} from './whatsapp-notification.mapper';

class TestOtpDto {
    phone?: string;
    name?: string;
    code?: string;
}

class TestTemplateDto {
    phone?: string;
    name?: string;
}

class NotificationPathProbeDto {
    recipientId: string;
    families?: string[];
}

const ADMIN_ROLES = ['ADMIN', 'SUPER_ADMIN'];

function assertAdmin(role: string) {
    if (!ADMIN_ROLES.includes(role)) {
        throw new ForbiddenException('Admin access required');
    }
}

function notificationPayloadForFamily(
    family: string,
): { role: WhatsAppAudienceRole; input: NotificationDispatchInput } | null {
    const orderId = '00000000-0000-4000-8000-000000000001';
    const base = {
        titleAr: 'اختبار مسار المنصة',
        titleEn: 'Platform path test',
        messageAr: 'رسالة اختبار عبر NotificationsService',
        messageEn: 'Test message via NotificationsService',
        link: `/dashboard/orders/${orderId}`,
        metadata: { orderId, orderNumber: 'ORD-PROBE-001' } as Record<string, unknown>,
    };

    switch (family) {
        case 'welcome_vendor':
            return {
                role: 'MERCHANT',
                input: {
                    ...base,
                    recipientRole: 'MERCHANT',
                    type: 'SUCCESS',
                    titleAr: 'تم تفعيل متجرك المشترك!',
                    titleEn: 'Store activated',
                    metadata: { docType: 'store_activation', storeId: orderId },
                },
            };
        case 'txn_order_customer':
            return {
                role: 'CUSTOMER',
                input: { ...base, recipientRole: 'CUSTOMER', type: 'ORDER' },
            };
        case 'txn_order_merchant':
            return {
                role: 'MERCHANT',
                input: { ...base, recipientRole: 'MERCHANT', type: 'ORDER' },
            };
        case 'txn_shipment_customer':
            return {
                role: 'CUSTOMER',
                input: { ...base, recipientRole: 'CUSTOMER', type: 'SHIPMENT_UPDATE' },
            };
        case 'txn_shipment_merchant':
            return {
                role: 'MERCHANT',
                input: { ...base, recipientRole: 'MERCHANT', type: 'SHIPMENT_UPDATE' },
            };
        case 'txn_invoice_customer':
            return {
                role: 'CUSTOMER',
                input: {
                    ...base,
                    recipientRole: 'CUSTOMER',
                    type: 'payment',
                    metadata: {
                        ...base.metadata,
                        invoiceNumber: 'INV-PROBE-001',
                        amount: '100',
                        offerId: '00000000-0000-4000-8000-000000000002',
                    },
                },
            };
        case 'txn_invoice_merchant':
            return {
                role: 'MERCHANT',
                input: {
                    ...base,
                    recipientRole: 'MERCHANT',
                    type: 'payment',
                    metadata: {
                        ...base.metadata,
                        invoiceNumber: 'INV-PROBE-001',
                        amount: '100',
                        offerId: '00000000-0000-4000-8000-000000000002',
                    },
                },
            };
        case 'txn_waybill_customer':
            return {
                role: 'CUSTOMER',
                input: {
                    ...base,
                    recipientRole: 'CUSTOMER',
                    type: 'order_update',
                    titleAr: 'بوليصة الشحن جاهزة',
                    titleEn: 'Waybill ready',
                    messageAr: 'تم إصدار بوليصة الشحن',
                    messageEn: 'Waybill issued',
                },
            };
        case 'txn_waybill_merchant':
            return {
                role: 'MERCHANT',
                input: {
                    ...base,
                    recipientRole: 'MERCHANT',
                    type: 'order_update',
                    titleAr: 'بوليصة الشحن جاهزة',
                    titleEn: 'Waybill ready',
                    messageAr: 'تم إصدار بوليصة الشحن',
                    messageEn: 'Waybill issued',
                },
            };
        case 'txn_document_vendor':
            return {
                role: 'MERCHANT',
                input: {
                    ...base,
                    recipientRole: 'MERCHANT',
                    type: 'DOC_EXPIRY',
                    metadata: { docType: 'LICENSE' },
                },
            };
        case 'txn_verification_customer':
            return {
                role: 'CUSTOMER',
                input: {
                    ...base,
                    recipientRole: 'CUSTOMER',
                    type: 'ORDER',
                    metadata: { ...base.metadata, verification: true },
                },
            };
        case 'txn_verification_vendor':
            return {
                role: 'MERCHANT',
                input: {
                    ...base,
                    recipientRole: 'MERCHANT',
                    type: 'ORDER',
                    metadata: { ...base.metadata, verification: true },
                },
            };
        default:
            return null;
    }
}

@Controller('widers')
export class WidersController {
    constructor(
        private readonly widersConfig: WidersConfig,
        private readonly widersService: WidersService,
        private readonly whatsappChannel: WhatsAppChannelService,
        private readonly contactSync: WidersContactSyncService,
        private readonly readiness: WidersReadinessService,
        private readonly templateAudit: WidersTemplateAuditService,
        private readonly messageLog: WhatsAppMessageLogService,
        private readonly moduleRef: ModuleRef,
    ) {}

    @Get('health')
    async health(): Promise<WidersHealthStatus> {
        const configured = this.widersService.isReady();
        const ping = configured ? await this.widersService.ping() : { reachable: false };

        return {
            enabled: this.widersConfig.enabled,
            configured,
            apiReachable: ping.reachable,
            frontendUrl: this.widersConfig.frontendUrl ?? null,
            otpMode: this.widersConfig.otpMode,
            templateCount: ping.templateCount,
            message: ping.error,
        };
    }

    @Get('readiness')
    async readinessReport() {
        return this.readiness.evaluate();
    }

    @Get('templates/registry')
    listRegistry() {
        if (process.env.NODE_ENV === 'production') {
            throw new ForbiddenException('Template registry disabled in production');
        }
        return {
            count: TEMPLATE_REGISTRY.length,
            templates: TEMPLATE_REGISTRY.map((t) => ({
                name: t.name,
                language: t.language,
                category: t.category,
                audience: t.audience,
                bodyFields: t.bodyFields,
                buttonSuffixPattern: t.buttonSuffixPattern,
            })),
        };
    }

    @Get('templates/audit')
    @UseGuards(JwtAuthGuard)
    async templatesAudit(@Req() req: { user?: { role?: string } }) {
        assertAdmin(req.user?.role ?? '');
        return this.templateAudit.audit();
    }

    @Get('message-logs')
    @UseGuards(JwtAuthGuard)
    async messageLogs(
        @Req() req: { user?: { role?: string } },
        @Query('limit') limit?: string,
    ) {
        assertAdmin(req.user?.role ?? '');
        const n = limit ? Number(limit) : 50;
        return this.messageLog.listRecent(Number.isFinite(n) ? n : 50);
    }

    @Post('test/notification-path')
    @UseGuards(JwtAuthGuard)
    @HttpCode(HttpStatus.OK)
    async testNotificationPath(
        @Req() req: { user?: { role?: string } },
        @Body() body: NotificationPathProbeDto,
    ) {
        assertAdmin(req.user?.role ?? '');
        if (!this.widersConfig.enabled) {
            return { ok: false, error: 'WIDERS_ENABLED is false', results: [] };
        }
        if (!body?.recipientId) {
            return { ok: false, error: 'recipientId required', results: [] };
        }

        const notifications = this.moduleRef.get(NotificationsService, { strict: false });
        if (!notifications) {
            return { ok: false, error: 'NotificationsService unavailable', results: [] };
        }

        const allFamilies = [
            'welcome_vendor',
            'txn_order_customer',
            'txn_order_merchant',
            'txn_shipment_customer',
            'txn_shipment_merchant',
            'txn_invoice_customer',
            'txn_invoice_merchant',
            'txn_waybill_customer',
            'txn_waybill_merchant',
            'txn_document_vendor',
            'txn_verification_customer',
            'txn_verification_vendor',
        ];
        const families = (body.families?.length ? body.families : allFamilies).filter(Boolean);
        const results: Array<Record<string, unknown>> = [];

        for (const family of families) {
            const mapped = notificationPayloadForFamily(family);
            if (!mapped) {
                results.push({ family, skipped: true, reason: 'no_notification_payload' });
                continue;
            }
            const expected = resolveTemplateFamily(mapped.input, mapped.role, {
                hasInvoice: Boolean(mapped.input.metadata?.invoiceNumber),
            });
            if (expected !== family) {
                results.push({
                    family,
                    skipped: true,
                    reason: 'mapper_mismatch',
                    expected,
                });
                continue;
            }

            try {
                const notif = await notifications.create({
                    recipientId: body.recipientId,
                    recipientRole: mapped.input.recipientRole,
                    type: mapped.input.type,
                    titleAr: mapped.input.titleAr,
                    titleEn: mapped.input.titleEn,
                    messageAr: mapped.input.messageAr,
                    messageEn: mapped.input.messageEn,
                    link: mapped.input.link,
                    metadata: mapped.input.metadata as Record<string, any>,
                });
                results.push({
                    family,
                    notificationId: notif?.id ?? null,
                    created: Boolean(notif),
                    mapperFamily: expected,
                });
            } catch (err) {
                results.push({
                    family,
                    error: err instanceof Error ? err.message : String(err),
                });
            }
        }

        return { ok: true, results };
    }

    @Post('test/template/:family')
    @HttpCode(HttpStatus.OK)
    async testTemplate(
        @Param('family') family: string,
        @Body() body: TestTemplateDto,
    ) {
        if (process.env.NODE_ENV === 'production') {
            throw new ForbiddenException('Test endpoint disabled in production');
        }
        if (!this.widersConfig.enabled) {
            return { sent: false, error: 'Set WIDERS_ENABLED=true to send test messages' };
        }

        const phone = body.phone ?? this.widersConfig.testPhone;
        if (!phone) {
            return { sent: false, error: 'Provide phone or set WIDERS_TEST_PHONE' };
        }

        const fields = this.templateAudit.sampleFieldsForFamily(family);
        if (body.name) fields.name = body.name;

        return this.whatsappChannel.sendByFamily(family, {
            phone,
            language: 'ar',
            fields,
            orderId: '00000000-0000-4000-8000-000000000001',
            offerId: '00000000-0000-4000-8000-000000000002',
        });
    }

    @Post('test/otp')
    @HttpCode(HttpStatus.OK)
    async testOtp(@Body() body: TestOtpDto) {
        if (process.env.NODE_ENV === 'production') {
            throw new ForbiddenException('Test endpoint disabled in production');
        }
        if (!this.widersConfig.enabled) {
            return {
                sent: false,
                error: 'Set WIDERS_ENABLED=true to send test messages',
            };
        }

        const phone = body.phone ?? this.widersConfig.testPhone;
        if (!phone) {
            return { sent: false, error: 'Provide phone or set WIDERS_TEST_PHONE' };
        }

        const code = body.code ?? String(Math.floor(100000 + Math.random() * 900000));
        return this.whatsappChannel.sendOtp(
            'customer',
            phone,
            body.name ?? 'اختبار',
            code,
            'ar',
        );
    }

    @Post('contacts/sync-batch')
    @HttpCode(HttpStatus.OK)
    async syncContactsBatch(@Body() body: { limit?: number }) {
        if (process.env.NODE_ENV === 'production') {
            throw new ForbiddenException('Batch sync disabled in production');
        }

        const limit = Math.min(Math.max(body?.limit ?? 50, 1), 200);
        return this.contactSync.batchSyncMissing(limit);
    }
}
