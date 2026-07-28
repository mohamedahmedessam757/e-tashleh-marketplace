import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { WidersConfig } from './widers.config';
import { WidersService } from './widers.service';
import {
    buildButtonSuffix,
    getTemplateDefinition,
    resolveTemplateName,
    truncateWhatsAppParam,
    type TemplateBodyField,
} from './template-registry';
import {
    buildAuthOtpSendAttempts,
    buildTemplateComponentVariants,
    buildWelcomeSendAttempts,
    formatWidersError,
    isWhatsAppInvalidParameterError,
    resolveTemplateBodyValue,
    type TemplateSendAttempt,
} from './widers-template-components.util';
import type { WidersTemplateLanguage } from './widers.types';
import {
    extractOfferId,
    extractOrderId,
    isWhatsAppEligibleRole,
    normalizeWhatsAppRole,
    resolveTemplateFamily,
    type NotificationDispatchInput,
    type WhatsAppAudienceRole,
} from './whatsapp-notification.mapper';
import { WhatsAppMessageLogService } from './whatsapp-message-log.service';
import { resolveUserPhone } from '../common/phone/gulf-phone.util';
import { buildShipmentFollowUrl } from './shipment-follow-url.util';

export interface WhatsAppDispatchContext {
    phone: string;
    language?: WidersTemplateLanguage;
    fields: Partial<Record<TemplateBodyField, string>>;
    orderId?: string;
    offerId?: string;
    logContext?: {
        recipientUserId?: string;
        notificationId?: string;
    };
}

/**
 * High-level dispatcher — wired to NotificationsService in Phase 5.
 * Phase 1: infrastructure + send helpers only.
 */
export interface WhatsAppMaybeSendParams extends NotificationDispatchInput {
    recipientId: string;
    notificationId?: string;
}

@Injectable()
export class WhatsAppChannelService {
    private readonly logger = new Logger(WhatsAppChannelService.name);

    constructor(
        private readonly widers: WidersService,
        private readonly config: WidersConfig,
        private readonly prisma: PrismaService,
        private readonly messageLog: WhatsAppMessageLogService,
    ) {}

    resolveLanguage(preferred?: string | null): WidersTemplateLanguage {
        return preferred === 'en' ? 'en' : 'ar';
    }

    buildCtaSuffix(pattern: string, orderId?: string, offerId?: string): string {
        return buildButtonSuffix(pattern, { orderId, offerId });
    }

    private async dispatchTemplateAttempts(
        templateName: string,
        templateLanguage: string,
        phone: string,
        attempts: TemplateSendAttempt[],
        retryAllOnFailure: boolean,
    ) {
        let lastResult = await this.sendTemplateAttempt(
            phone,
            templateName,
            templateLanguage,
            attempts[0],
        );

        const shouldRetry = (result: typeof lastResult) =>
            retryAllOnFailure ||
            isWhatsAppInvalidParameterError(
                formatWidersError(result.error, result.message),
            );

        for (let i = 1; i < attempts.length && !lastResult.success; i += 1) {
            if (!shouldRetry(lastResult)) break;

            const attempt = attempts[i];
            lastResult = await this.sendTemplateAttempt(
                phone,
                templateName,
                templateLanguage,
                attempt,
            );

            if (lastResult.success) {
                this.logger.warn(
                    `WhatsApp template ${templateName} recovered via "${attempt.label}" (attempt ${i + 1}/${attempts.length})`,
                );
            }
        }

        return lastResult;
    }

    private sendTemplateAttempt(
        phone: string,
        templateName: string,
        templateLanguage: string,
        attempt?: TemplateSendAttempt,
    ) {
        return this.widers.sendTemplateMessage({
            phone,
            templateName,
            templateLanguage,
            components: attempt?.components,
            bodyParameters: attempt?.bodyParameters,
            parameterFormat: attempt?.parameterFormat,
        });
    }

    async sendByFamily(
        familyBase: string,
        ctx: WhatsAppDispatchContext,
    ): Promise<{ sent: boolean; error?: string; templateName?: string }> {
        const lang = ctx.language ?? 'ar';
        const templateName = resolveTemplateName(familyBase, lang);
        const definition = getTemplateDefinition(templateName);

        if (!definition) {
            // Fallback to Arabic if English template not registered yet
            if (lang === 'en') {
                this.logger.warn(`Template ${templateName} missing — fallback to _ar`);
                return this.sendByFamily(familyBase, { ...ctx, language: 'ar' });
            }
            return { sent: false, error: `Unknown template: ${templateName}` };
        }

        // Never route AUTH OTP through generic variants (risk of name+code → #132000)
        if (familyBase.startsWith('auth_otp_') || definition.category === 'AUTHENTICATION') {
            const audience: 'customer' | 'vendor' | 'admin' = familyBase.includes('vendor')
                ? 'vendor'
                : familyBase.includes('admin')
                  ? 'admin'
                  : 'customer';
            const otpCode = ctx.fields.otp_code?.trim() || '000000';
            const contactName = ctx.fields.name?.trim() || 'مستخدم';
            const otpResult = await this.sendOtp(audience, ctx.phone, contactName, otpCode, lang);
            return {
                sent: otpResult.sent,
                error: otpResult.error,
                templateName,
            };
        }

        const bodyTexts = definition.bodyFields.map((field) =>
            resolveTemplateBodyValue(field, ctx.fields[field]),
        );

        const buttonSuffix =
            definition.buttonSuffixPattern && definition.buttonUrlDynamic === true
                ? this.buildCtaSuffix(definition.buttonSuffixPattern, ctx.orderId, ctx.offerId)
                : undefined;

        const contactName =
            ctx.fields.name?.trim() ||
            bodyTexts[definition.bodyFields.indexOf('name')] ||
            'مستخدم';

        const isWelcome = familyBase.startsWith('welcome_');
        // headerText on registry is documentation only (static Meta header) — never send as param
        const sendAttempts: TemplateSendAttempt[] = isWelcome
            ? buildWelcomeSendAttempts({
                  bodyTexts,
                  bodyFields: definition.bodyFields,
                  buttonSuffix,
                  contactName,
              })
            : buildTemplateComponentVariants({
                  bodyTexts,
                  bodyFields: definition.bodyFields,
                  buttonSuffix,
              });

        let result = await this.dispatchTemplateAttempts(
            definition.name,
            definition.language,
            ctx.phone,
            sendAttempts,
            true,
        );

        // Await log write — void was dropping outbound rows when the HTTP request ended.
        try {
            await this.messageLog.logOutbound({
                phone: ctx.phone,
                templateName: definition.name,
                templateLanguage: definition.language,
                recipientUserId: ctx.logContext?.recipientUserId,
                notificationId: ctx.logContext?.notificationId,
                sendResult: result,
                metadata: {
                    familyBase: familyBase,
                    orderId: ctx.orderId,
                    offerId: ctx.offerId,
                },
            });
        } catch (err) {
            this.logger.warn(
                `Failed to persist WhatsApp message log: ${err instanceof Error ? err.message : err}`,
            );
        }

        if (!result.success) {
            return {
                sent: false,
                error: formatWidersError(result.error, result.message),
                templateName: definition.name,
            };
        }

        return { sent: true, templateName: definition.name };
    }

    async sendOtp(
        audience: 'customer' | 'vendor' | 'admin',
        phone: string,
        name: string,
        otpCode: string,
        language?: WidersTemplateLanguage,
    ): Promise<{
        sent: boolean;
        error?: string;
        payloadVersion?: string;
        templateName?: string;
    }> {
        const family =
            audience === 'vendor'
                ? 'auth_otp_vendor'
                : audience === 'admin'
                  ? 'auth_otp_admin'
                  : 'auth_otp_customer';
        const lang = language ?? 'ar';
        const templateName = resolveTemplateName(family, lang);

        // Meta COPY_CODE: body {{1}} + button url {{1}} — never name, never flat [name,code]
        const attempts = buildAuthOtpSendAttempts(otpCode);
        const bodyParams = attempts[0]?.components?.find((c) => c.type === 'body')?.parameters;
        const buttonParams = attempts[0]?.components?.find((c) => c.type === 'button')?.parameters;
        if (!bodyParams || bodyParams.length !== 1 || !buttonParams || buttonParams.length !== 1) {
            this.logger.error(
                `OTP payload guard failed for ${templateName}: expected body=1 button=1`,
            );
            return { sent: false, error: 'Invalid OTP template payload (COPY_CODE shape)' };
        }

        this.logger.log(
            `OTP send ${templateName} → ${phone} [auth-copy-code-v4 body=1 button=1 audience=${audience}]`,
        );

        const result = await this.dispatchTemplateAttempts(
            templateName,
            lang,
            phone,
            attempts,
            false,
        );

        try {
            await this.messageLog.logOutbound({
                phone,
                templateName,
                templateLanguage: lang,
                sendResult: result,
                metadata: {
                    familyBase: family,
                    audience,
                    otpMode: 'authentication',
                    otpPayloadVersion: 'auth-copy-code-v4',
                    bodyParamCount: 1,
                    buttonParamCount: 1,
                    nameProvided: Boolean(name?.trim()),
                },
            });
        } catch (err) {
            this.logger.warn(
                `Failed to persist WhatsApp OTP log: ${err instanceof Error ? err.message : err}`,
            );
        }

        return {
            sent: Boolean(result.success),
            error: formatWidersError(result.error, result.message),
            payloadVersion: 'auth-copy-code-v4',
            templateName,
        };
    }

    /**
     * Phase 5 — dispatch transactional WhatsApp after in-app notification persist.
     * Callers MUST await this — fire-and-forget drops sends when the HTTP response ends.
     */
    async maybeSend(params: WhatsAppMaybeSendParams): Promise<void> {
        const persistSkip = async (reason: string, phone?: string, family?: string) => {
            this.logger.warn(
                `WhatsApp maybeSend skip: ${reason} (recipient=${params.recipientId} type=${params.type ?? ''} waEvent=${String(params.metadata?.waEvent ?? '')})`,
            );
            try {
                await this.messageLog.logOutbound({
                    phone,
                    templateName: family ? `${family}:skipped` : `skipped:${reason}`,
                    templateLanguage: 'ar',
                    recipientUserId: params.recipientId,
                    notificationId: params.notificationId,
                    sendResult: { success: false, error: `skipped:${reason}` },
                    metadata: {
                        skipped: true,
                        skipReason: reason,
                        type: params.type,
                        waEvent: params.metadata?.waEvent,
                    },
                });
            } catch (err) {
                this.logger.warn(
                    `Failed to persist WhatsApp skip log: ${err instanceof Error ? err.message : err}`,
                );
            }
        };

        if (!this.config.enabled) {
            await persistSkip('disabled');
            return;
        }
        if (!isWhatsAppEligibleRole(params.recipientRole)) {
            // Admins/support intentionally never get WA — warn only, no DB spam
            this.logger.warn(
                `WhatsApp maybeSend skip: role (${params.recipientRole}) recipient=${params.recipientId}`,
            );
            return;
        }

        const audienceRole = normalizeWhatsAppRole(params.recipientRole);
        if (!audienceRole) {
            await persistSkip('role_normalize');
            return;
        }

        try {
            const user = await this.prisma.user.findUnique({
                where: { id: params.recipientId },
                select: {
                    phone: true,
                    countryCode: true,
                    name: true,
                    whatsappOptIn: true,
                    store: { select: { name: true } },
                },
            });

            if (!user?.phone) {
                await persistSkip('no_phone');
                return;
            }
            if (user.whatsappOptIn === false) {
                await persistSkip('opt_out');
                return;
            }

            const normalizedPhone = resolveUserPhone(user.phone, user.countryCode);
            if (!normalizedPhone) {
                await persistSkip('phone_normalize');
                return;
            }

            // Prefer user_settings.preferred_language; never block WA if settings join fails
            let preferredLanguage: string | null = null;
            try {
                const settings = await this.prisma.userSettings.findUnique({
                    where: { userId: params.recipientId },
                    select: { preferredLanguage: true },
                });
                preferredLanguage = settings?.preferredLanguage ?? null;
            } catch (settingsErr) {
                this.logger.warn(
                    `WhatsApp language lookup failed for ${params.recipientId}: ${settingsErr instanceof Error ? settingsErr.message : settingsErr}`,
                );
            }

            const orderId = extractOrderId(params.metadata, params.link);
            const offerId = extractOfferId(params.metadata);
            const invoiceContext = await this.resolveInvoiceContext(
                params,
                orderId,
                offerId,
            );

            const family = resolveTemplateFamily(params, audienceRole, {
                hasInvoice: invoiceContext.hasInvoice,
            });
            if (!family) {
                await persistSkip('family_null', normalizedPhone);
                return;
            }

            const lang = this.resolveLanguage(preferredLanguage);
            const statusDetail = lang === 'en' ? params.messageEn : params.messageAr;
            const orderNumber = await this.resolveOrderNumber(orderId, params);

            const fields: Partial<Record<TemplateBodyField, string>> = {
                name: truncateWhatsAppParam(user.name || 'مستخدم', 60),
                order_number: orderNumber,
                status_detail: statusDetail,
            };

            if (family.startsWith('txn_shipment_')) {
                const tracking = await this.resolveTrackingNumber(
                    orderId,
                    params.metadata,
                );
                if (tracking && tracking !== 'غير متوفر') {
                    const trackingLabel =
                        lang === 'en' ? `Tracking: ${tracking}` : `رقم التتبع: ${tracking}`;
                    fields.status_detail = truncateWhatsAppParam(
                        `${fields.status_detail || statusDetail} | ${trackingLabel}`,
                    );
                }
                const followUrl = this.resolveShipmentFollowUrl(audienceRole, orderId);
                fields.tracking_number = followUrl ?? 'غير متوفر';
            }

            if (family.startsWith('txn_invoice_')) {
                fields.invoice_number = invoiceContext.invoiceNumber ?? '-';
                fields.amount = invoiceContext.amount ?? this.formatAmount(params.metadata?.amount);
                fields.summary = truncateWhatsAppParam(statusDetail, 200);
            }

            if (family.startsWith('txn_document_')) {
                fields.store_name = truncateWhatsAppParam(
                    user.store?.name || user.name || 'متجر',
                    60,
                );
                fields.doc_type = truncateWhatsAppParam(
                    String(params.metadata?.docType ?? 'مستند'),
                    60,
                );
                fields.status_detail = statusDetail;
            }

            // txn_offer_restriction_vendor_ar_v2 / txn_violation_*:
            // {{1}} name · {{2}} store_name · {{3}} status_detail
            if (family.startsWith('txn_offer_restriction_') || family.startsWith('txn_violation_')) {
                const metaStore =
                    typeof params.metadata?.store_name === 'string'
                        ? params.metadata.store_name
                        : typeof params.metadata?.storeName === 'string'
                          ? params.metadata.storeName
                          : '';
                if (family.startsWith('txn_violation_vendor') || family.startsWith('txn_offer_restriction_')) {
                    fields.store_name = truncateWhatsAppParam(
                        metaStore.trim() || user.store?.name || user.name || 'متجر',
                        60,
                    );
                }
                const metaDetailKey = lang === 'en' ? 'status_detail_en' : 'status_detail';
                const metaDetailRaw =
                    typeof params.metadata?.[metaDetailKey] === 'string'
                        ? String(params.metadata[metaDetailKey]).trim()
                        : typeof params.metadata?.status_detail === 'string'
                          ? params.metadata.status_detail.trim()
                          : '';
                if (metaDetailRaw) {
                    fields.status_detail = truncateWhatsAppParam(metaDetailRaw, 500);
                }
            }

            const result = await this.sendByFamily(family, {
                phone: normalizedPhone,
                language: lang,
                fields,
                orderId: orderId ?? undefined,
                offerId: invoiceContext.offerId ?? offerId ?? undefined,
                logContext: {
                    recipientUserId: params.recipientId,
                    notificationId: params.notificationId,
                },
            });

            if (!result.sent) {
                this.logger.warn(
                    `WhatsApp maybeSend failed (${family}) → ${normalizedPhone} notif=${params.notificationId ?? '-'}: ${result.error}`,
                );
            } else {
                this.logger.log(
                    `WhatsApp maybeSend ok (${family}/${result.templateName}) → ${normalizedPhone} notif=${params.notificationId ?? '-'}`,
                );
            }
        } catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            this.logger.warn(`WhatsApp maybeSend error for ${params.recipientId}: ${message}`);
            try {
                await this.messageLog.logOutbound({
                    templateName: 'error',
                    templateLanguage: 'ar',
                    recipientUserId: params.recipientId,
                    notificationId: params.notificationId,
                    sendResult: { success: false, error: message },
                    metadata: {
                        error: true,
                        type: params.type,
                        waEvent: params.metadata?.waEvent,
                    },
                });
            } catch {
                /* ignore secondary log failure */
            }
        }
    }

    private formatAmount(raw: unknown): string {
        if (raw == null || raw === '') return '-';
        const n = Number(raw);
        if (Number.isFinite(n)) return `${n} AED`;
        return String(raw);
    }

    private async resolveOrderNumber(
        orderId: string | null,
        params: NotificationDispatchInput,
    ): Promise<string> {
        if (orderId) {
            const order = await this.prisma.order.findUnique({
                where: { id: orderId },
                select: { orderNumber: true },
            });
            if (order?.orderNumber) return order.orderNumber;
        }

        const metaNum = params.metadata?.orderNumber;
        if (typeof metaNum === 'string' && metaNum.trim()) {
            return metaNum;
        }

        const blob = `${params.messageAr} ${params.messageEn}`;
        const match = blob.match(/#([A-Z0-9-]+)/i);
        return match?.[1] ?? '-';
    }

    private resolveShipmentFollowUrl(
        role: WhatsAppAudienceRole,
        orderId: string | null,
    ): string | null {
        if (!this.config.frontendUrl) {
            this.logger.warn(
                'WhatsApp shipment link: FRONTEND_URL missing — falling back to https://e-tashleh.net',
            );
        }
        return buildShipmentFollowUrl({
            role,
            orderId,
            frontendUrl: this.config.frontendUrl,
        });
    }

    private async resolveTrackingNumber(
        orderId: string | null,
        metadata?: Record<string, unknown> | null,
    ): Promise<string> {
        const fromMeta = metadata?.trackingNumber;
        if (typeof fromMeta === 'string' && fromMeta.trim()) {
            return fromMeta;
        }

        if (!orderId) return 'غير متوفر';

        const shipment = await this.prisma.shipment.findFirst({
            where: { orderId },
            orderBy: { updatedAt: 'desc' },
            select: { trackingNumber: true },
        });

        return shipment?.trackingNumber?.trim() || 'غير متوفر';
    }

    private async resolveInvoiceContext(
        params: NotificationDispatchInput,
        orderId: string | null,
        offerId: string | null,
    ): Promise<{
        hasInvoice: boolean;
        invoiceNumber?: string;
        amount?: string;
        offerId?: string;
    }> {
        const type = (params.type ?? '').toLowerCase();
        if (type !== 'payment') {
            return { hasInvoice: false };
        }

        const metaInvoice = params.metadata?.invoiceNumber;
        if (typeof metaInvoice === 'string' && metaInvoice.trim()) {
            return {
                hasInvoice: true,
                invoiceNumber: metaInvoice,
                amount: this.formatAmount(params.metadata?.amount),
                offerId: offerId ?? undefined,
            };
        }

        if (!offerId) {
            return { hasInvoice: false };
        }

        const payment = await this.prisma.paymentTransaction.findFirst({
            where: { offerId, status: 'SUCCESS' },
            orderBy: { createdAt: 'desc' },
            select: { id: true, totalAmount: true, offerId: true },
        });

        if (!payment) {
            return { hasInvoice: false };
        }

        const invoice = await this.prisma.invoice.findFirst({
            where: { paymentId: payment.id },
            select: { invoiceNumber: true, total: true, currency: true },
        });

        if (!invoice) {
            return { hasInvoice: false };
        }

        return {
            hasInvoice: true,
            invoiceNumber: invoice.invoiceNumber,
            amount: `${invoice.total} ${invoice.currency}`,
            offerId: payment.offerId,
        };
    }
}
