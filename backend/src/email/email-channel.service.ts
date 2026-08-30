import { Injectable, Logger } from '@nestjs/common';
import { Resend } from 'resend';
import { EMAIL_LOGO_CID, EmailConfig } from './email.config';
import { buildOtpEmail, type OtpEmailLanguage } from './templates/otp-email.template';
import {
    buildRecoveryRejectionEmail,
    buildRecoveryResumeEmail,
} from './templates/recovery-admin-email.template';
import type { OtpPurpose } from '../auth/otp-purpose';

const PURPOSE_LABELS: Partial<Record<OtpPurpose, { ar: string; en: string }>> = {
    REGISTER: { ar: 'تفعيل الحساب', en: 'Account activation' },
    LOGIN: { ar: 'تسجيل الدخول', en: 'Sign in' },
    RECOVERY_STEP1: { ar: 'استرداد الحساب', en: 'Account recovery' },
    RECOVERY_PHONE: { ar: 'تأكيد رقم الجوال', en: 'Phone verification' },
    RECOVERY_PROOF: { ar: 'التحقق من الهوية لاستعادة الحساب', en: 'Recovery identity verification' },
    RECOVERY_NEW_CONTACT: { ar: 'تأكيد وسيلة الدخول الجديدة', en: 'Confirm new login contact' },
    PROFILE_CHANGE: { ar: 'تأكيد تغيير بيانات التواصل', en: 'Confirm contact change' },
};

@Injectable()
export class EmailChannelService {
    private readonly logger = new Logger(EmailChannelService.name);
    private readonly client: Resend | null;

    constructor(private readonly config: EmailConfig) {
        this.client = this.config.apiKey ? new Resend(this.config.apiKey) : null;
    }

    private brand() {
        return {
            siteUrl: this.config.siteUrl,
            logoUrl: this.config.logoUrl,
        };
    }

    private async dispatch(
        to: string,
        content: { subject: string; html: string; text: string },
        logLabel: string,
    ): Promise<{ sent: boolean; error?: string }> {
        if (!this.config.enabled || !this.client) {
            return { sent: false, error: 'Email delivery disabled' };
        }

        try {
            const attachments =
                this.config.useEmbeddedLogo && this.config.embeddedLogoBuffer
                    ? [
                          {
                              filename: 'logo.png',
                              content: this.config.embeddedLogoBuffer,
                              contentId: EMAIL_LOGO_CID,
                          },
                      ]
                    : undefined;

            const { data, error } = await this.client.emails.send({
                from: this.config.fromEmail,
                to,
                subject: content.subject,
                html: content.html,
                text: content.text,
                attachments,
            });

            if (error) {
                this.logger.error(
                    `Resend ${logLabel} failed → ${maskEmail(to)}: ${error.message}`,
                );
                return { sent: false, error: error.message };
            }

            this.logger.log(
                `${logLabel} email sent → ${maskEmail(to)} id=${data?.id ?? 'unknown'}`,
            );
            return { sent: true };
        } catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            this.logger.error(`Resend ${logLabel} exception → ${maskEmail(to)}: ${message}`);
            return { sent: false, error: message };
        }
    }

    async sendOtp(params: {
        to: string;
        name: string;
        otpCode: string;
        language?: OtpEmailLanguage;
        purpose?: OtpPurpose;
    }): Promise<{ sent: boolean; error?: string }> {
        const lang = params.language ?? 'ar';
        const labels = params.purpose ? PURPOSE_LABELS[params.purpose] : undefined;
        const purposeLabel = labels ? (lang === 'en' ? labels.en : labels.ar) : undefined;

        const content = buildOtpEmail({
            name: params.name,
            code: params.otpCode,
            language: lang,
            purposeLabel,
            brand: this.brand(),
        });

        return this.dispatch(params.to, content, 'OTP');
    }

    async sendRecoveryResumeToken(params: {
        to: string;
        name: string;
        resumeToken: string;
        expiresAt: Date;
        language?: OtpEmailLanguage;
    }): Promise<{ sent: boolean; error?: string }> {
        const content = buildRecoveryResumeEmail({
            name: params.name,
            resumeToken: params.resumeToken,
            expiresAt: params.expiresAt,
            language: params.language ?? 'ar',
            brand: this.brand(),
        });
        return this.dispatch(params.to, content, 'recovery-resume');
    }

    async sendRecoveryRejectionEmail(params: {
        to: string;
        name: string;
        reason: string;
        language?: OtpEmailLanguage;
    }): Promise<{ sent: boolean; error?: string }> {
        const content = buildRecoveryRejectionEmail({
            name: params.name,
            reason: params.reason,
            language: params.language ?? 'ar',
            brand: this.brand(),
        });
        return this.dispatch(params.to, content, 'recovery-reject');
    }
}

function maskEmail(email: string): string {
    const [local, domain] = email.split('@');
    if (!local || !domain) return '***';
    const visible = local.slice(0, Math.min(2, local.length));
    return `${visible}***@${domain}`;
}
