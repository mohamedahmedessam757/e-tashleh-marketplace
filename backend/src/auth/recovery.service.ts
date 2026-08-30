import {
    Injectable,
    BadRequestException,
    UnauthorizedException,
    ForbiddenException,
    Logger,
} from '@nestjs/common';
import { createHash, randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { PlatformSettingsService } from '../platform-settings/platform-settings.service';
import { UsersService } from '../users/users.service';
import { EmailChannelService } from '../email/email-channel.service';
import { Prisma } from '@prisma/client';
import { OtpService } from './otp.service';
import { OtpPurpose, OTP_EXPIRY_MINUTES } from './otp-purpose';
import { normalizeGulfPhone } from '../common/phone/gulf-phone.util';
import {
    normalizeSearchQuery,
    normalizePhone,
    resolveUserIds,
    isUuid,
} from '../common/search/admin-entity-search.util';

type UiRole = 'customer' | 'merchant';

const MSG_EMAIL_NOT_REGISTERED =
    'لا يوجد حساب مسجّل بهذا البريد الإلكتروني لنوع الحساب المحدد. استخدم البريد المسجّل مسبقاً في النظام.';
const MSG_PHONE_NOT_REGISTERED =
    'لا يوجد حساب مسجّل برقم الجوال هذا لنوع الحساب المحدد. استخدم الرقم المسجّل مسبقاً في النظام.';
const MSG_WRONG_ACCOUNT_TYPE =
    'نوع الحساب غير مطابق (جرّب التبديل بين عميل/تاجر).';
const MSG_PROOF_SENT_EMAIL =
    'تم إرسال رمز التحقق إلى البريد الإلكتروني المسجّل في النظام.';
const MSG_PROOF_SENT_PHONE =
    'تم إرسال رمز التحقق إلى رقم الجوال المسجّل في النظام عبر واتساب.';
const MSG_REJECT_REASON_REQUIRED =
    'سبب الرفض إلزامي وسيُرسل إلى الإيميل المسجّل للعميل/التاجر.';

@Injectable()
export class RecoveryService {
    private readonly logger = new Logger(RecoveryService.name);

    constructor(
        private prisma: PrismaService,
        private notifications: NotificationsService,
        private auditLogs: AuditLogsService,
        private platformSettings: PlatformSettingsService,
        private otpService: OtpService,
        private usersService: UsersService,
        private emailChannel: EmailChannelService,
    ) {}

    private toDbRole(role: UiRole): 'CUSTOMER' | 'VENDOR' {
        return role === 'merchant' ? 'VENDOR' : 'CUSTOMER';
    }

    private audience(role: UiRole): 'customer' | 'vendor' {
        return role === 'merchant' ? 'vendor' : 'customer';
    }

    private normPhone(phone: string, countryCode?: string): string {
        return normalizeGulfPhone(phone, countryCode);
    }

    private maskEmail(email: string): string {
        const [local, domain] = email.split('@');
        if (!domain) return '***';
        const keep = local.slice(0, Math.min(2, local.length));
        return `${keep}***@${domain}`;
    }

    private maskPhone(phone: string): string {
        const digits = phone.replace(/\D/g, '');
        if (digits.length < 4) return '****';
        return `+****${digits.slice(-4)}`;
    }

    private hashToken(token: string): string {
        return createHash('sha256').update(token).digest('hex');
    }

    private async delayNeutral(): Promise<void> {
        await new Promise((r) => setTimeout(r, 400 + Math.floor(Math.random() * 200)));
    }

    /**
     * Resolve a user by registered email for the selected panel role.
     * Never sends OTP unless this returns a user — same gate as login.
     */
    private async requireRegisteredByEmail(emailRaw: string, role: UiRole) {
        const email = emailRaw.trim().toLowerCase();
        const user =
            (await this.usersService.findByEmail(email)) ||
            (email !== emailRaw.trim()
                ? await this.usersService.findByEmail(emailRaw.trim())
                : null);

        if (!user?.email) {
            await this.logSecurityEvent(email, 'RECOVERY_UNREGISTERED_EMAIL', false);
            throw new BadRequestException(MSG_EMAIL_NOT_REGISTERED);
        }

        if (user.role !== this.toDbRole(role)) {
            await this.logSecurityEvent(user.email, 'RECOVERY_WRONG_ROLE', false);
            throw new ForbiddenException(MSG_WRONG_ACCOUNT_TYPE);
        }

        return user;
    }

    /**
     * Resolve a user by registered phone (multi-format, same as login).
     * OTP is only ever sent to the phone stored on that account.
     */
    private async requireRegisteredByPhone(
        phoneRaw: string,
        role: UiRole,
        countryCode?: string,
    ) {
        const phone = this.normPhone(phoneRaw, countryCode);
        const user = await this.usersService.findByPhone(phone);

        if (!user?.phone) {
            await this.logSecurityEvent(phone, 'RECOVERY_UNREGISTERED_PHONE', false);
            throw new BadRequestException(MSG_PHONE_NOT_REGISTERED);
        }

        if (user.role !== this.toDbRole(role)) {
            await this.logSecurityEvent(
                user.email || phone,
                'RECOVERY_WRONG_ROLE',
                false,
            );
            throw new ForbiddenException(MSG_WRONG_ACCOUNT_TYPE);
        }

        return user;
    }

    /** Soft lookup (verify/confirm paths) — no existence leak beyond invalid OTP. */
    private async findRegisteredByEmail(emailRaw: string, role: UiRole) {
        try {
            return await this.requireRegisteredByEmail(emailRaw, role);
        } catch {
            return null;
        }
    }

    private async findRegisteredByPhone(
        phoneRaw: string,
        role: UiRole,
        countryCode?: string,
    ) {
        try {
            return await this.requireRegisteredByPhone(phoneRaw, role, countryCode);
        } catch {
            return null;
        }
    }

    private storedPhoneMatchesClaim(
        storedPhone: string | null | undefined,
        storedCountryCode: string | null | undefined,
        claimPhone: string,
    ): boolean {
        if (!storedPhone) return false;
        const storedNorm = this.normPhone(storedPhone, storedCountryCode);
        if (storedNorm === claimPhone) return true;
        // Multi-format: if login-style lookup of claim resolves to same digits as stored
        const claimDigits = claimPhone.replace(/\D/g, '');
        const storedDigits = storedNorm.replace(/\D/g, '');
        return claimDigits.length >= 9 && storedDigits.endsWith(claimDigits.slice(-9));
    }

    // ─── Case 1: Lost phone — identify by accessible email ────────────

    async lostPhoneStart(emailRaw: string, role: UiRole) {
        await this.delayNeutral();
        // Gate: registered email must exist — never OTP arbitrary inboxes
        const user = await this.requireRegisteredByEmail(emailRaw, role);

        await this.otpService.issueAndSend({
            channel: 'email',
            email: user.email,
            phone: user.phone ?? undefined,
            purpose: OtpPurpose.RECOVERY_PROOF,
            audience: this.audience(role),
            name: user.name ?? undefined,
            role,
            metadata: { caseType: 'LOST_PHONE', userId: user.id },
        });

        await this.logSecurityEvent(user.email, 'RECOVERY_LOST_PHONE_PROOF_SENT', true);
        await this.auditLogs.logAction({
            action: 'RECOVERY_REQUEST',
            entity: 'USER',
            actorType: user.role as any,
            actorId: user.id,
            actorName: user.name,
            reason: 'Lost-phone recovery: proof OTP to accessible email',
            metadata: { caseType: 'LOST_PHONE', role },
        });

        return {
            success: true,
            otpSent: true,
            accountRegistered: true,
            message: MSG_PROOF_SENT_EMAIL,
            maskedEmail: this.maskEmail(user.email),
            expiresInMinutes: OTP_EXPIRY_MINUTES,
        };
    }

    async lostPhoneVerifyProof(emailRaw: string, otp: string, role: UiRole, ip?: string) {
        const user = await this.findRegisteredByEmail(emailRaw, role);
        if (!user?.email) {
            throw new BadRequestException('Invalid verification code');
        }

        try {
            await this.otpService.verify({
                channel: 'email',
                email: user.email,
                purpose: OtpPurpose.RECOVERY_PROOF,
                code: otp,
            });
        } catch (err) {
            await this.logSecurityEvent(user.email, 'RECOVERY_LOST_PHONE_PROOF_FAILED', false, ip);
            throw err;
        }

        await this.logSecurityEvent(user.email, 'RECOVERY_LOST_PHONE_PROOF_OK', true, ip);
        return {
            success: true,
            message: 'تم التحقق من هويتك بنجاح.',
            messageEn: 'Identity verified successfully.',
            identityVerified: true,
        };
    }

    async lostPhoneRequestNewOtp(
        emailRaw: string,
        newPhoneRaw: string,
        role: UiRole,
        newCountryCode?: string,
        ip?: string,
    ) {
        // Identifying contact must already be a registered account email
        const user = await this.requireRegisteredByEmail(emailRaw, role);

        await this.otpService.assertRecoveryProofVerified({
            role,
            channel: 'email',
            email: user.email,
        });

        const newPhone = this.normPhone(newPhoneRaw, newCountryCode);
        if (
            user.phone &&
            this.storedPhoneMatchesClaim(user.phone, user.countryCode, newPhone)
        ) {
            throw new BadRequestException('New phone must differ from the old phone');
        }

        const taken = await this.prisma.user.findFirst({
            where: { phone: newPhone, NOT: { id: user.id } },
            select: { id: true },
        });
        if (taken) throw new BadRequestException('This phone number is already in use');

        await this.otpService.issueAndSend({
            channel: 'whatsapp',
            phone: newPhone,
            email: user.email,
            purpose: OtpPurpose.RECOVERY_NEW_CONTACT,
            audience: this.audience(role),
            name: user.name ?? undefined,
            role,
            metadata: { caseType: 'LOST_PHONE', userId: user.id, newPhone },
        });

        await this.logSecurityEvent(user.email, 'RECOVERY_NEW_PHONE_OTP_SENT', true, ip);
        return {
            success: true,
            message: 'OTP sent to new phone via WhatsApp',
            channel: 'whatsapp',
            expiresInMinutes: OTP_EXPIRY_MINUTES,
        };
    }

    async lostPhoneConfirm(
        emailRaw: string,
        newPhoneRaw: string,
        phoneOtp: string,
        role: UiRole,
        newCountryCode?: string,
        ip?: string,
        device?: string,
    ) {
        const newPhone = this.normPhone(newPhoneRaw, newCountryCode);
        const user = await this.requireRegisteredByEmail(emailRaw, role);

        await this.otpService.assertRecoveryProofVerified({
            role,
            channel: 'email',
            email: user.email,
        });

        await this.otpService.verify({
            channel: 'whatsapp',
            phone: newPhone,
            email: user.email,
            purpose: OtpPurpose.RECOVERY_NEW_CONTACT,
            code: phoneOtp,
        });

        const taken = await this.prisma.user.findFirst({
            where: { phone: newPhone, NOT: { id: user.id } },
            select: { id: true },
        });
        if (taken) throw new BadRequestException('This phone number is already in use');

        const previousPhone = user.phone;

        await this.prisma.user.update({
            where: { id: user.id },
            data: {
                phone: newPhone,
                recoveryStatus: null,
                withdrawalsFrozenUntil: new Date(Date.now() + 12 * 60 * 60 * 1000),
            },
        });

        await this.prisma.accountRecoveryRequest.create({
            data: {
                userId: user.id,
                caseType: 'LOST_PHONE',
                oldPhone: previousPhone,
                newPhone,
                oldEmail: user.email,
                status: 'APPROVED',
                requestIp: ip,
                requestDevice: device,
                resolvedAt: new Date(),
            },
        });

        await this.auditLogs.logAction({
            action: 'RECOVERY_APPROVED',
            entity: 'USER',
            actorType: user.role as any,
            actorId: user.id,
            actorName: user.name,
            reason: 'Lost-phone recovery completed — phone updated in place',
            metadata: { oldPhone: previousPhone, newPhone, identifiedBy: 'email' },
        });

        await this.logSecurityEvent(user.email, 'RECOVERY_LOST_PHONE_COMPLETED', true, ip, device);

        return {
            success: true,
            action: 'APPROVED',
            message:
                'تم تحديث رقم الجوال بنجاح، ويمكنك الآن تسجيل الدخول باستخدام رقم الجوال الجديد.',
            messageEn:
                'Phone number updated successfully. You can now sign in with your new number.',
        };
    }

    // ─── Case 2: Lost email — identify by accessible phone ────────────

    async lostEmailStart(phoneRaw: string, role: UiRole, countryCode?: string) {
        await this.delayNeutral();
        // Gate: registered phone must exist — never WhatsApp OTP to arbitrary numbers
        const user = await this.requireRegisteredByPhone(phoneRaw, role, countryCode);

        await this.otpService.issueAndSend({
            channel: 'whatsapp',
            // Always deliver to the phone on file, not a client-invented format
            phone: user.phone!,
            email: user.email ?? undefined,
            purpose: OtpPurpose.RECOVERY_PROOF,
            audience: this.audience(role),
            name: user.name ?? undefined,
            role,
            metadata: { caseType: 'LOST_EMAIL', userId: user.id },
        });

        await this.logSecurityEvent(
            user.email || user.phone!,
            'RECOVERY_LOST_EMAIL_PROOF_SENT',
            true,
        );
        return {
            success: true,
            otpSent: true,
            accountRegistered: true,
            message: MSG_PROOF_SENT_PHONE,
            maskedPhone: this.maskPhone(user.phone!),
            expiresInMinutes: OTP_EXPIRY_MINUTES,
        };
    }

    async lostEmailVerifyProof(
        phoneRaw: string,
        otp: string,
        role: UiRole,
        countryCode?: string,
        ip?: string,
    ) {
        const user = await this.findRegisteredByPhone(phoneRaw, role, countryCode);
        if (!user?.phone) throw new BadRequestException('Invalid verification code');

        try {
            await this.otpService.verify({
                channel: 'whatsapp',
                phone: user.phone,
                email: user.email ?? undefined,
                purpose: OtpPurpose.RECOVERY_PROOF,
                code: otp,
            });
        } catch (err) {
            await this.logSecurityEvent(
                user.email || user.phone,
                'RECOVERY_LOST_EMAIL_PROOF_FAILED',
                false,
                ip,
            );
            throw err;
        }

        await this.logSecurityEvent(
            user.email || user.phone,
            'RECOVERY_LOST_EMAIL_PROOF_OK',
            true,
            ip,
        );
        return {
            success: true,
            message: 'تم التحقق من هويتك بنجاح.',
            messageEn: 'Identity verified successfully.',
            identityVerified: true,
        };
    }

    async lostEmailRequestNewOtp(
        phoneRaw: string,
        newEmailRaw: string,
        role: UiRole,
        countryCode?: string,
        ip?: string,
    ) {
        const newEmail = newEmailRaw.trim().toLowerCase();
        const user = await this.requireRegisteredByPhone(phoneRaw, role, countryCode);

        await this.otpService.assertRecoveryProofVerified({
            role,
            channel: 'whatsapp',
            phone: user.phone!,
        });

        if (user.email && newEmail === user.email.trim().toLowerCase()) {
            throw new BadRequestException('New email must differ from the old email');
        }

        const taken = await this.prisma.user.findFirst({
            where: { email: newEmail, NOT: { id: user.id } },
            select: { id: true },
        });
        if (taken) throw new BadRequestException('This email is already in use');

        await this.otpService.issueAndSend({
            channel: 'email',
            email: newEmail,
            phone: user.phone!,
            purpose: OtpPurpose.RECOVERY_NEW_CONTACT,
            audience: this.audience(role),
            name: user.name ?? undefined,
            role,
            metadata: { caseType: 'LOST_EMAIL', userId: user.id, newEmail },
        });

        await this.logSecurityEvent(
            user.email || user.phone!,
            'RECOVERY_NEW_EMAIL_OTP_SENT',
            true,
            ip,
        );
        return {
            success: true,
            channel: 'email',
            expiresInMinutes: OTP_EXPIRY_MINUTES,
        };
    }

    async lostEmailConfirm(
        phoneRaw: string,
        newEmailRaw: string,
        emailOtp: string,
        role: UiRole,
        countryCode?: string,
        ip?: string,
        device?: string,
    ) {
        const newEmail = newEmailRaw.trim().toLowerCase();
        const user = await this.requireRegisteredByPhone(phoneRaw, role, countryCode);

        await this.otpService.assertRecoveryProofVerified({
            role,
            channel: 'whatsapp',
            phone: user.phone!,
        });

        await this.otpService.verify({
            channel: 'email',
            email: newEmail,
            purpose: OtpPurpose.RECOVERY_NEW_CONTACT,
            code: emailOtp,
        });

        const taken = await this.prisma.user.findFirst({
            where: { email: newEmail, NOT: { id: user.id } },
            select: { id: true },
        });
        if (taken) throw new BadRequestException('This email is already in use');

        const previousEmail = user.email;

        await this.prisma.user.update({
            where: { id: user.id },
            data: { email: newEmail, recoveryStatus: null },
        });

        await this.prisma.accountRecoveryRequest.create({
            data: {
                userId: user.id,
                caseType: 'LOST_EMAIL',
                oldPhone: user.phone,
                oldEmail: previousEmail,
                newEmail,
                status: 'APPROVED',
                requestIp: ip,
                requestDevice: device,
                resolvedAt: new Date(),
            },
        });

        await this.auditLogs.logAction({
            action: 'RECOVERY_APPROVED',
            entity: 'USER',
            actorType: user.role as any,
            actorId: user.id,
            actorName: user.name,
            reason: 'Lost-email recovery completed — email updated in place',
            metadata: { oldEmail: previousEmail, newEmail, identifiedBy: 'phone' },
        });

        await this.logSecurityEvent(newEmail, 'RECOVERY_LOST_EMAIL_COMPLETED', true, ip, device);

        return {
            success: true,
            action: 'APPROVED',
            message:
                'تم تحديث البريد الإلكتروني بنجاح، ويمكنك الآن استخدام البريد الإلكتروني الجديد للدخول إلى حسابك.',
            messageEn:
                'Email updated successfully. You can now use the new email to sign in to your account.',
        };
    }

    // ─── Case 3: Lost both (High Risk) ────────────────────────────────

    /**
     * Resolve LOST_BOTH claimant by registered phone OR email (same role), then
     * require BOTH claimed contacts to match that single account on file.
     */
    private async resolveLostBothUser(phone: string, email: string, role: UiRole) {
        const dbRole = this.toDbRole(role);
        const [byPhoneRaw, byEmailRaw] = await Promise.all([
            this.usersService.findByPhone(phone),
            this.usersService.findByEmail(email),
        ]);

        const byPhone =
            byPhoneRaw && byPhoneRaw.role === dbRole && byPhoneRaw.phone ? byPhoneRaw : null;
        const byEmail =
            byEmailRaw && byEmailRaw.role === dbRole && byEmailRaw.email ? byEmailRaw : null;

        if (byPhone && byEmail && byPhone.id !== byEmail.id) {
            return { user: null as null, reason: 'conflicting_users' as const };
        }

        const matched = byPhone || byEmail;
        if (!matched) {
            return { user: null, reason: 'no_match' as const };
        }

        const userEmail = (matched.email || '').trim().toLowerCase();
        const emailOk = !!userEmail && userEmail === email;
        const phoneOk = this.storedPhoneMatchesClaim(
            matched.phone,
            matched.countryCode,
            phone,
        );

        // Both registered contacts on the account must match the claim
        if (!emailOk || !phoneOk) {
            return { user: null, reason: 'partial_mismatch' as const };
        }

        const user = await this.prisma.user.findUnique({
            where: { id: matched.id },
            include: { store: true },
        });
        if (!user) {
            return { user: null, reason: 'no_match' as const };
        }

        return { user, reason: 'matched' as const };
    }

    private async safeNotifyAdmins(
        data: Parameters<NotificationsService['notifyAdmins']>[0],
    ): Promise<void> {
        try {
            await this.notifications.notifyAdmins(data);
        } catch (err) {
            this.logger.error(
                `notifyAdmins failed during recovery: ${(err as Error)?.message || err}`,
            );
        }
    }

    async lostBothSubmit(
        oldPhone: string,
        oldEmail: string,
        role: UiRole,
        countryCode?: string,
        ip?: string,
        device?: string,
    ) {
        const phone = this.normPhone(oldPhone, countryCode);
        const email = oldEmail.trim().toLowerCase();
        await this.delayNeutral();

        const neutralPending = {
            success: true as const,
            action: 'PENDING_REVIEW' as const,
            message:
                'If the details match an account, a high-risk recovery request was submitted for admin review.',
        };

        const { user, reason } = await this.resolveLostBothUser(phone, email, role);

        if (!user) {
            this.logger.warn(
                `LOST_BOTH unmatched role=${role} reason=${reason} phone=${this.maskPhone(phone)} email=${this.maskEmail(email)}`,
            );
            await this.logSecurityEvent(
                email,
                'RECOVERY_LOST_BOTH_UNMATCHED',
                false,
                ip,
                device,
            );
            await this.safeNotifyAdmins({
                titleAr: 'محاولة استعادة عالية الخطورة — لم تُطابق حساباً',
                titleEn: 'High-risk recovery attempt — no matching account',
                messageAr: `تم تقديم مطالبة فقد الجوال والإيميل دون مطابقة حساب (${this.maskPhone(phone)} / ${this.maskEmail(email)}). راجع سجلات الأمان.`,
                messageEn: `A lost-both claim did not match an account (${this.maskPhone(phone)} / ${this.maskEmail(email)}). Review security logs.`,
                type: 'alert',
                link: '/dashboard/security-audit',
            });
            return neutralPending;
        }

        const existing = await this.prisma.accountRecoveryRequest.findFirst({
            where: {
                userId: user.id,
                caseType: 'LOST_BOTH',
                status: { in: ['PENDING_REVIEW', 'APPROVED_AWAITING_CONTACTS'] },
            },
        });
        if (existing) {
            this.logger.log(`LOST_BOTH existing ticket ${existing.id} for user ${user.id}`);
            return {
                ...neutralPending,
                requestId: existing.id,
                message: 'A recovery request is already pending review.',
            };
        }

        const snapshot = await this.buildRiskSnapshot(user);

        const request = await this.prisma.accountRecoveryRequest.create({
            data: {
                userId: user.id,
                caseType: 'LOST_BOTH',
                oldPhone: phone,
                oldEmail: email,
                status: 'PENDING_REVIEW',
                balanceSnapshot: snapshot.balance,
                openOrdersCount: snapshot.openOrders,
                disputesCount: snapshot.disputes,
                requestIp: ip,
                requestDevice: device,
            },
        });

        // Freeze withdrawals immediately until review completes (no auto login disable)
        await this.prisma.user.update({
            where: { id: user.id },
            data: {
                recoveryStatus: 'PENDING_REVIEW',
                withdrawalsFrozen: true,
                withdrawalFreezeNote: 'High-risk LOST_BOTH recovery — pending admin review',
                withdrawalsFrozenUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            },
        });

        await this.safeNotifyAdmins({
            titleAr: 'طلب استعادة عالي الخطورة',
            titleEn: 'High-Risk Account Recovery',
            messageAr:
                'العميل لا يستطيع الوصول إلى رقم الجوال المسجل والبريد الإلكتروني المسجل. يرجى التحقق من ملكية الحساب قبل تغيير وسائل الدخول.',
            messageEn:
                'User cannot access the registered mobile number and registered email. Verify ownership before changing login methods.',
            type: 'alert',
            link: '/dashboard/security-audit',
        });

        await this.auditLogs.logAction({
            action: 'RECOVERY_SUBMITTED',
            entity: 'AccountRecoveryRequest',
            actorType: user.role as any,
            actorId: user.id,
            actorName: user.name,
            reason: 'High-risk LOST_BOTH recovery ticket opened',
            metadata: { requestId: request.id, caseType: 'LOST_BOTH' },
        });

        await this.logSecurityEvent(email, 'RECOVERY_LOST_BOTH_SUBMITTED', true, ip, device);

        this.logger.log(`LOST_BOTH ticket ${request.id} created for user ${user.id}`);

        return {
            success: true,
            action: 'PENDING_REVIEW',
            requestId: request.id,
            message:
                'Your high-risk recovery request was submitted. Withdrawals are paused until review completes.',
        };
    }

    async lostBothRequestOtps(
        resumeToken: string,
        newPhoneRaw: string,
        newEmailRaw: string,
        newCountryCode?: string,
    ) {
        const request = await this.findRequestByResumeToken(resumeToken);
        const user = request.user;
        const role: UiRole = user.role === 'VENDOR' ? 'merchant' : 'customer';
        const newPhone = this.normPhone(newPhoneRaw, newCountryCode);
        const newEmail = newEmailRaw.trim().toLowerCase();

        await this.assertContactsAvailable(user.id, newPhone, newEmail);

        await this.otpService.issueAndSend({
            channel: 'whatsapp',
            phone: newPhone,
            email: newEmail,
            purpose: OtpPurpose.RECOVERY_NEW_CONTACT,
            audience: this.audience(role),
            name: user.name ?? undefined,
            role,
            metadata: { caseType: 'LOST_BOTH', contact: 'phone', requestId: request.id },
        });

        await this.otpService.issueAndSend({
            channel: 'email',
            email: newEmail,
            phone: newPhone,
            purpose: OtpPurpose.RECOVERY_NEW_CONTACT,
            audience: this.audience(role),
            name: user.name ?? undefined,
            role,
            metadata: { caseType: 'LOST_BOTH', contact: 'email', requestId: request.id },
        });

        return {
            success: true,
            expiresInMinutes: OTP_EXPIRY_MINUTES,
            message: 'OTP codes sent to the new phone and new email',
        };
    }

    async lostBothComplete(
        resumeToken: string,
        newPhoneRaw: string,
        newEmailRaw: string,
        phoneOtp: string,
        emailOtp: string,
        newCountryCode?: string,
        ip?: string,
        device?: string,
    ) {
        const request = await this.findRequestByResumeToken(resumeToken);
        const user = request.user;
        const newPhone = this.normPhone(newPhoneRaw, newCountryCode);
        const newEmail = newEmailRaw.trim().toLowerCase();

        await this.assertContactsAvailable(user.id, newPhone, newEmail);

        await this.otpService.verify({
            channel: 'whatsapp',
            phone: newPhone,
            email: newEmail,
            purpose: OtpPurpose.RECOVERY_NEW_CONTACT,
            code: phoneOtp,
        });
        await this.otpService.verify({
            channel: 'email',
            email: newEmail,
            phone: newPhone,
            purpose: OtpPurpose.RECOVERY_NEW_CONTACT,
            code: emailOtp,
        });

        await this.prisma.$transaction([
            this.prisma.user.update({
                where: { id: user.id },
                data: {
                    phone: newPhone,
                    email: newEmail,
                    recoveryStatus: null,
                    withdrawalsFrozen: false,
                    withdrawalFreezeNote: null,
                    withdrawalsFrozenUntil: new Date(Date.now() + 12 * 60 * 60 * 1000),
                },
            }),
            this.prisma.accountRecoveryRequest.update({
                where: { id: request.id },
                data: {
                    status: 'APPROVED',
                    newPhone,
                    newEmail,
                    resumeTokenHash: null,
                    resumeTokenExpiresAt: null,
                    resolvedAt: new Date(),
                },
            }),
            // Invalidate all sessions — old login methods no longer apply
            this.prisma.session.deleteMany({ where: { userId: user.id } }),
        ]);

        await this.auditLogs.logAction({
            action: 'RECOVERY_APPROVED',
            entity: 'AccountRecoveryRequest',
            actorType: user.role as any,
            actorId: user.id,
            actorName: user.name,
            reason: 'LOST_BOTH recovery completed with dual OTP — old contacts replaced, sessions revoked',
            metadata: {
                requestId: request.id,
                newPhone,
                newEmail,
                oldPhone: request.oldPhone,
                oldEmail: request.oldEmail,
                sessionsRevoked: true,
            },
        });

        await this.logSecurityEvent(newEmail, 'RECOVERY_LOST_BOTH_COMPLETED', true, ip, device);

        return {
            success: true,
            action: 'APPROVED',
            message:
                'تم التحقق من طلبك وتحديث بيانات الدخول بنجاح. يمكنك الآن الدخول إلى حسابك باستخدام بياناتك الجديدة.',
            messageEn:
                'Your request was verified and login details updated successfully. You can now sign in with your new credentials.',
        };
    }

    /** Validate resume token and return masked registered contacts only (no PII leak). */
    async validateResumeToken(resumeToken: string) {
        const request = await this.findRequestByResumeToken(resumeToken);
        const user = request.user;
        const oldPhone = request.oldPhone || user.phone || '';
        const oldEmail = request.oldEmail || user.email || '';

        return {
            valid: true,
            maskedOldPhone: oldPhone ? this.maskPhone(oldPhone) : null,
            maskedOldEmail: oldEmail ? this.maskEmail(oldEmail) : null,
            expiresAt: request.resumeTokenExpiresAt?.toISOString() ?? null,
        };
    }

    // ─── Admin ────────────────────────────────────────────────────────

    async getPendingRequests(search?: string) {
        const q = normalizeSearchQuery(search);
        let where: Prisma.AccountRecoveryRequestWhereInput | undefined;

        if (q) {
            const or: Prisma.AccountRecoveryRequestWhereInput[] = [
                { oldPhone: { contains: q, mode: 'insensitive' } },
                { newPhone: { contains: q, mode: 'insensitive' } },
                { oldEmail: { contains: q, mode: 'insensitive' } },
                { newEmail: { contains: q, mode: 'insensitive' } },
                { user: { name: { contains: q, mode: 'insensitive' } } },
                { user: { email: { contains: q, mode: 'insensitive' } } },
                { user: { phone: { contains: q, mode: 'insensitive' } } },
            ];
            const phoneNorm = normalizePhone(q);
            if (phoneNorm && phoneNorm !== q) {
                or.push(
                    { oldPhone: { contains: phoneNorm, mode: 'insensitive' } },
                    { newPhone: { contains: phoneNorm, mode: 'insensitive' } },
                );
            }
            if (isUuid(q)) {
                or.push({ id: q }, { userId: q });
            }
            const userIds = await resolveUserIds(this.prisma, q);
            if (userIds.length) or.push({ userId: { in: userIds } });
            where = { OR: or };
        }

        const requests = await this.prisma.accountRecoveryRequest.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            include: {
                user: {
                    include: { store: { select: { balance: true, id: true } } },
                },
            },
        });

        return requests.map((req) => ({
            ...req,
            userRole: req.user.role,
            userName: req.user.name,
        }));
    }

    async resolveRequest(
        requestId: string,
        action: 'APPROVE' | 'REJECT',
        adminId?: string,
        ip?: string,
        userAgent?: string,
        rejectionReason?: string,
    ) {
        const request = await this.prisma.accountRecoveryRequest.findUnique({
            where: { id: requestId },
            include: { user: true },
        });

        if (!request || request.status !== 'PENDING_REVIEW') {
            throw new BadRequestException('Request not found or already resolved');
        }

        if (action === 'REJECT') {
            const reason = (rejectionReason || '').trim();
            if (reason.length < 5) {
                throw new BadRequestException(MSG_REJECT_REASON_REQUIRED);
            }

            await this.prisma.user.update({
                where: { id: request.userId },
                data: {
                    recoveryStatus: null,
                    // Lift the automatic high-risk freeze from this ticket (manual fraud freeze is separate)
                    withdrawalsFrozen: false,
                    withdrawalFreezeNote: null,
                    withdrawalsFrozenUntil: null,
                },
            });

            await this.prisma.accountRecoveryRequest.update({
                where: { id: requestId },
                data: {
                    status: 'REJECTED',
                    rejectionReason: reason,
                    resolvedAt: new Date(),
                    resolvedBy: adminId || null,
                },
            });

            const registeredEmail = request.user.email?.trim().toLowerCase() || null;
            let emailSent = false;
            if (registeredEmail) {
                try {
                    const sendResult = await this.emailChannel.sendRecoveryRejectionEmail({
                        to: registeredEmail,
                        name: request.user.name || 'مستخدم',
                        reason,
                    });
                    emailSent = sendResult.sent;
                    if (!sendResult.sent) {
                        this.logger.warn(
                            `Rejection email failed for request ${requestId}: ${sendResult.error}`,
                        );
                    }
                } catch (err) {
                    this.logger.error(
                        `Rejection email exception for request ${requestId}: ${(err as Error)?.message || err}`,
                    );
                }
            }

            await this.notifications.notifyUser(request.userId, request.user.role, {
                titleAr: 'تم رفض طلب استرداد الحساب',
                titleEn: 'Account Recovery Rejected',
                messageAr: `تم رفض طلب الاستعادة. لم يتم تغيير بيانات الدخول. السبب: ${reason}`,
                messageEn: `Your recovery request was rejected. Login details were not changed. Reason: ${reason}`,
                type: 'alert',
            });

            await this.auditLogs.logAction({
                action: 'RECOVERY_REJECTED',
                entity: 'AccountRecoveryRequest',
                actorType: 'ADMIN',
                actorId: adminId,
                reason,
                metadata: {
                    requestId,
                    emailSent,
                    maskedEmail: registeredEmail ? this.maskEmail(registeredEmail) : null,
                },
            });

            return {
                success: true,
                status: 'REJECTED',
                emailSent,
                maskedEmail: registeredEmail ? this.maskEmail(registeredEmail) : null,
                warning: emailSent
                    ? 'Rejection reason was emailed to the registered address.'
                    : 'Rejection saved; email to registered address failed or was unavailable — deliver the reason manually if needed.',
            };
        }

        // APPROVE — for LOST_BOTH: issue resume token; for legacy phone-only with newPhone: apply immediately
        if (request.caseType === 'LOST_BOTH' || !request.newPhone) {
            const rawToken = randomBytes(32).toString('hex');
            const hash = this.hashToken(rawToken);
            const expires = new Date(Date.now() + 24 * 60 * 60 * 1000);

            await this.prisma.accountRecoveryRequest.update({
                where: { id: requestId },
                data: {
                    status: 'APPROVED_AWAITING_CONTACTS',
                    resumeTokenHash: hash,
                    resumeTokenExpiresAt: expires,
                    resolvedAt: new Date(),
                    resolvedBy: adminId || null,
                },
            });

            await this.prisma.user.update({
                where: { id: request.userId },
                data: { recoveryStatus: 'APPROVED_AWAITING_CONTACTS' },
            });

            const registeredEmail = request.user.email?.trim().toLowerCase() || null;
            let emailSent = false;
            if (registeredEmail) {
                try {
                    const sendResult = await this.emailChannel.sendRecoveryResumeToken({
                        to: registeredEmail,
                        name: request.user.name || 'مستخدم',
                        resumeToken: rawToken,
                        expiresAt: expires,
                    });
                    emailSent = sendResult.sent;
                    if (!sendResult.sent) {
                        this.logger.warn(
                            `Resume token email failed for request ${requestId}: ${sendResult.error}`,
                        );
                    }
                } catch (err) {
                    this.logger.error(
                        `Resume token email exception for request ${requestId}: ${(err as Error)?.message || err}`,
                    );
                }
            }

            const maskedEmail = registeredEmail ? this.maskEmail(registeredEmail) : null;

            await this.platformSettings.logAdminActivity(
                adminId || 'SYSTEM',
                request.user.email || request.userId,
                'ACCOUNT_RECOVERY_APPROVE',
                { requestId, caseType: request.caseType, emailSent, maskedEmail },
                { ip, ua: userAgent },
            );

            await this.auditLogs.logAction({
                action: 'RECOVERY_APPROVED',
                entity: 'AccountRecoveryRequest',
                actorType: 'ADMIN',
                actorId: adminId,
                reason: 'Admin approved — resume token issued; awaiting user contact update',
                metadata: { requestId, emailSent, maskedEmail },
            });

            return {
                success: true,
                status: 'APPROVED_AWAITING_CONTACTS',
                resumeToken: rawToken,
                resumeTokenExpiresAt: expires.toISOString(),
                emailSent,
                maskedEmail,
                warning: emailSent
                    ? `Resume token emailed to ${maskedEmail}. Copy below is a one-time admin backup.`
                    : 'Email to registered address failed or unavailable. Copy the resume token now and deliver it via a verified channel.',
            };
        }

        // Legacy LOST_PHONE with newPhone already on request
        await this.prisma.user.update({
            where: { id: request.userId },
            data: {
                phone: request.newPhone,
                recoveryStatus: 'APPROVED',
                withdrawalsFrozenUntil: new Date(Date.now() + 12 * 60 * 60 * 1000),
            },
        });
        await this.prisma.accountRecoveryRequest.update({
            where: { id: requestId },
            data: {
                status: 'APPROVED',
                resolvedAt: new Date(),
                resolvedBy: adminId || null,
            },
        });

        return { success: true, status: 'APPROVED' };
    }

    async adminFreezeUser(userId: string, adminId: string, note?: string, ip?: string) {
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        if (!user) throw new BadRequestException('User not found');

        await this.prisma.user.update({
            where: { id: userId },
            data: {
                withdrawalsFrozen: true,
                withdrawalFreezeNote: note || 'Manual freeze after recovery fraud review',
                suspendedUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                suspendReason: note || 'Manual freeze — suspected account takeover',
            },
        });

        await this.auditLogs.logAction({
            action: 'USER_FROZEN',
            entity: 'USER',
            actorType: 'ADMIN',
            actorId: adminId,
            reason: note || 'Manual freeze from recovery panel',
            metadata: { userId, ip },
        });

        return { success: true };
    }

    // ─── Legacy wrappers (deprecated) ─────────────────────────────────

    async requestEmailOtp(email: string, role: UiRole) {
        throw new BadRequestException(
            'This recovery flow was updated. Please use the new account recovery wizard.',
        );
    }

    async verifyEmailOtp(_email: string, _otp: string, _role: UiRole, _ip?: string) {
        throw new BadRequestException(
            'This recovery flow was updated. Please use the new account recovery wizard.',
        );
    }

    async requestPhoneOtp(_email: string, _newPhone: string, _role: UiRole, _ip?: string) {
        throw new BadRequestException(
            'This recovery flow was updated. Please use the new account recovery wizard.',
        );
    }

    async submitRecovery(
        _email: string,
        _newPhone: string,
        _phoneOtp: string,
        _role: UiRole,
        _ip?: string,
        _device?: string,
    ) {
        throw new BadRequestException(
            'This recovery flow was updated. Please use the new account recovery wizard.',
        );
    }

    // ─── helpers ──────────────────────────────────────────────────────

    private async findRequestByResumeToken(resumeToken: string) {
        const hash = this.hashToken(resumeToken);
        const request = await this.prisma.accountRecoveryRequest.findFirst({
            where: {
                resumeTokenHash: hash,
                status: 'APPROVED_AWAITING_CONTACTS',
                resumeTokenExpiresAt: { gt: new Date() },
            },
            include: { user: true },
        });
        if (!request) {
            throw new UnauthorizedException('Invalid or expired resume token');
        }
        return request;
    }

    private async assertContactsAvailable(userId: string, newPhone: string, newEmail: string) {
        const [phoneTakenExact, emailTaken, phoneTakenFlexible] = await Promise.all([
            this.prisma.user.findFirst({
                where: { phone: newPhone, NOT: { id: userId } },
                select: { id: true },
            }),
            this.prisma.user.findFirst({
                where: { email: newEmail, NOT: { id: userId } },
                select: { id: true },
            }),
            this.usersService.findByPhone(newPhone),
        ]);
        if (phoneTakenExact || (phoneTakenFlexible && phoneTakenFlexible.id !== userId)) {
            throw new BadRequestException('This phone number is already in use');
        }
        if (emailTaken) throw new BadRequestException('This email is already in use');
    }

    private async buildRiskSnapshot(user: {
        id: string;
        customerBalance: unknown;
        store?: { id: string; balance: unknown } | null;
    }) {
        const [ordersCount, disputesCount, returnsCount] = await Promise.all([
            this.prisma.order.count({
                where: {
                    customerId: user.id,
                    status: { notIn: ['COMPLETED', 'CANCELLED'] },
                },
            }),
            this.prisma.dispute.count({
                where: {
                    order: { customerId: user.id },
                    status: { notIn: ['RESOLVED', 'CLOSED'] },
                },
            }),
            this.prisma.returnRequest.count({
                where: {
                    order: { customerId: user.id },
                    status: { notIn: ['REJECTED'] },
                },
            }),
        ]);

        let balance = Number(user.customerBalance) || 0;
        let vendorOrders = 0;
        let merchantDisputes = 0;
        if (user.store) {
            balance += Number(user.store.balance) || 0;
            const [vOrders, mDisputes] = await Promise.all([
                this.prisma.order.count({
                    where: {
                        storeId: user.store.id,
                        status: { notIn: ['COMPLETED', 'CANCELLED'] },
                    },
                }),
                this.prisma.dispute.count({
                    where: {
                        order: { storeId: user.store.id },
                        status: { notIn: ['RESOLVED'] },
                    },
                }),
            ]);
            vendorOrders = vOrders;
            merchantDisputes = mDisputes;
        }

        return {
            balance,
            openOrders: ordersCount + vendorOrders,
            disputes: disputesCount + returnsCount + merchantDisputes,
        };
    }

    private async logSecurityEvent(
        emailOrPhone: string | null | undefined,
        action: string,
        isSuccess: boolean,
        ip?: string,
        device?: string,
    ) {
        if (!emailOrPhone) return;
        const key = emailOrPhone.trim();
        const looksLikeEmail = key.includes('@');
        const user = looksLikeEmail
            ? await this.prisma.user.findUnique({
                  where: { email: key.toLowerCase() },
                  select: { id: true },
              })
            : await this.usersService.findByPhone(key);

        await this.prisma.securityLog.create({
            data: {
                email: looksLikeEmail ? key.toLowerCase() : key,
                userId: user?.id,
                action,
                isSuccess,
                ipAddress: ip,
                device,
            },
        });
    }
}
