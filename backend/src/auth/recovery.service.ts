import {
    Injectable,
    BadRequestException,
    UnauthorizedException,
} from '@nestjs/common';
import { createHash, randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { PlatformSettingsService } from '../platform-settings/platform-settings.service';
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

const NEUTRAL_START_MSG =
    'If an account matches, a verification code was sent to the registered contact.';

@Injectable()
export class RecoveryService {
    constructor(
        private prisma: PrismaService,
        private notifications: NotificationsService,
        private auditLogs: AuditLogsService,
        private platformSettings: PlatformSettingsService,
        private otpService: OtpService,
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

    private async findUserByPhone(phone: string, role: UiRole) {
        return this.prisma.user.findFirst({
            where: { phone, role: this.toDbRole(role) },
        });
    }

    private async findUserByEmail(email: string, role: UiRole) {
        return this.prisma.user.findFirst({
            where: { email: email.trim().toLowerCase(), role: this.toDbRole(role) },
        });
    }

    // ─── Case 1: Lost phone — identify by accessible email ────────────

    async lostPhoneStart(emailRaw: string, role: UiRole) {
        const email = emailRaw.trim().toLowerCase();
        const user = await this.findUserByEmail(email, role);
        await this.delayNeutral();

        if (!user?.email) {
            return {
                success: true,
                message: NEUTRAL_START_MSG,
                // Always return a masked form of the submitted email (anti-enumeration)
                maskedEmail: this.maskEmail(email),
                expiresInMinutes: OTP_EXPIRY_MINUTES,
            };
        }

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
            message: NEUTRAL_START_MSG,
            maskedEmail: this.maskEmail(user.email),
            expiresInMinutes: OTP_EXPIRY_MINUTES,
        };
    }

    async lostPhoneVerifyProof(emailRaw: string, otp: string, role: UiRole, ip?: string) {
        const email = emailRaw.trim().toLowerCase();
        const user = await this.findUserByEmail(email, role);
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
        const email = emailRaw.trim().toLowerCase();
        const user = await this.findUserByEmail(email, role);
        if (!user?.email) throw new BadRequestException('Session expired. Restart recovery.');

        await this.otpService.assertRecoveryProofVerified({
            role,
            channel: 'email',
            email: user.email,
        });

        const newPhone = this.normPhone(newPhoneRaw, newCountryCode);
        if (user.phone && newPhone === user.phone) {
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
            metadata: { caseType: 'LOST_PHONE', newPhone },
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
        const email = emailRaw.trim().toLowerCase();
        const newPhone = this.normPhone(newPhoneRaw, newCountryCode);
        const user = await this.findUserByEmail(email, role);
        if (!user?.email) throw new BadRequestException('Session expired. Restart recovery.');

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
        const phone = this.normPhone(phoneRaw, countryCode);
        const user = await this.findUserByPhone(phone, role);
        await this.delayNeutral();

        if (!user?.phone) {
            return {
                success: true,
                message: NEUTRAL_START_MSG,
                // Always return a masked form of the submitted phone (anti-enumeration)
                maskedPhone: this.maskPhone(phone),
                expiresInMinutes: OTP_EXPIRY_MINUTES,
            };
        }

        await this.otpService.issueAndSend({
            channel: 'whatsapp',
            phone: user.phone,
            email: user.email ?? undefined,
            purpose: OtpPurpose.RECOVERY_PROOF,
            audience: this.audience(role),
            name: user.name ?? undefined,
            role,
            metadata: { caseType: 'LOST_EMAIL', userId: user.id },
        });

        await this.logSecurityEvent(user.email || phone, 'RECOVERY_LOST_EMAIL_PROOF_SENT', true);
        return {
            success: true,
            message: NEUTRAL_START_MSG,
            maskedPhone: this.maskPhone(user.phone),
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
        const phone = this.normPhone(phoneRaw, countryCode);
        const user = await this.findUserByPhone(phone, role);
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
                user.email || phone,
                'RECOVERY_LOST_EMAIL_PROOF_FAILED',
                false,
                ip,
            );
            throw err;
        }

        await this.logSecurityEvent(user.email || phone, 'RECOVERY_LOST_EMAIL_PROOF_OK', true, ip);
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
        const phone = this.normPhone(phoneRaw, countryCode);
        const newEmail = newEmailRaw.trim().toLowerCase();
        const user = await this.findUserByPhone(phone, role);
        if (!user?.phone) throw new BadRequestException('Session expired. Restart recovery.');

        await this.otpService.assertRecoveryProofVerified({
            role,
            channel: 'whatsapp',
            phone: user.phone,
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
            phone: user.phone,
            purpose: OtpPurpose.RECOVERY_NEW_CONTACT,
            audience: this.audience(role),
            name: user.name ?? undefined,
            role,
            metadata: { caseType: 'LOST_EMAIL', newEmail },
        });

        await this.logSecurityEvent(user.email || phone, 'RECOVERY_NEW_EMAIL_OTP_SENT', true, ip);
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
        const phone = this.normPhone(phoneRaw, countryCode);
        const newEmail = newEmailRaw.trim().toLowerCase();
        const user = await this.findUserByPhone(phone, role);
        if (!user?.phone) throw new BadRequestException('Session expired. Restart recovery.');

        await this.otpService.assertRecoveryProofVerified({
            role,
            channel: 'whatsapp',
            phone: user.phone,
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

        const user = await this.prisma.user.findFirst({
            where: {
                role: this.toDbRole(role),
                phone,
                email,
            },
            include: { store: true },
        });

        if (!user) {
            return {
                success: true,
                action: 'PENDING_REVIEW',
                message:
                    'If the details match an account, a high-risk recovery request was submitted for admin review.',
            };
        }

        const existing = await this.prisma.accountRecoveryRequest.findFirst({
            where: {
                userId: user.id,
                caseType: 'LOST_BOTH',
                status: { in: ['PENDING_REVIEW', 'APPROVED_AWAITING_CONTACTS'] },
            },
        });
        if (existing) {
            return {
                success: true,
                action: 'PENDING_REVIEW',
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

        await this.notifications.notifyAdmins({
            titleAr: 'طلب استعادة عالي الخطورة',
            titleEn: 'High-Risk Account Recovery',
            messageAr: `المستخدم لا يستطيع الوصول للجوال والإيميل المسجّلين. يرجى التحقق من ملكية الحساب قبل تغيير وسائل الدخول.`,
            messageEn: `User cannot access registered phone and email. Verify ownership before changing login methods.`,
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
        ]);

        await this.auditLogs.logAction({
            action: 'RECOVERY_APPROVED',
            entity: 'AccountRecoveryRequest',
            actorType: user.role as any,
            actorId: user.id,
            actorName: user.name,
            reason: 'LOST_BOTH recovery completed with dual OTP',
            metadata: { requestId: request.id, newPhone, newEmail },
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
                    rejectionReason: rejectionReason || null,
                    resolvedAt: new Date(),
                    resolvedBy: adminId || null,
                },
            });

            await this.notifications.notifyUser(request.userId, request.user.role, {
                titleAr: 'تم رفض طلب استرداد الحساب',
                titleEn: 'Account Recovery Rejected',
                messageAr: 'تم رفض طلب الاستعادة. لم يتم تغيير بيانات الدخول.',
                messageEn: 'Your recovery request was rejected. Login details were not changed.',
                type: 'alert',
            });

            await this.auditLogs.logAction({
                action: 'RECOVERY_REJECTED',
                entity: 'AccountRecoveryRequest',
                actorType: 'ADMIN',
                actorId: adminId,
                reason: rejectionReason || 'Admin rejected recovery',
                metadata: { requestId },
            });

            return { success: true, status: 'REJECTED' };
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

            await this.platformSettings.logAdminActivity(
                adminId || 'SYSTEM',
                request.user.email || request.userId,
                'ACCOUNT_RECOVERY_APPROVE',
                { requestId, caseType: request.caseType },
                { ip, ua: userAgent },
            );

            await this.auditLogs.logAction({
                action: 'RECOVERY_APPROVED',
                entity: 'AccountRecoveryRequest',
                actorType: 'ADMIN',
                actorId: adminId,
                reason: 'Admin approved — awaiting user contact update via resume token',
                metadata: { requestId },
            });

            return {
                success: true,
                status: 'APPROVED_AWAITING_CONTACTS',
                resumeToken: rawToken,
                resumeTokenExpiresAt: expires.toISOString(),
                warning:
                    'Copy this resume token now. It is shown once. Deliver it to the user via a verified channel.',
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
        const [phoneTaken, emailTaken] = await Promise.all([
            this.prisma.user.findFirst({
                where: { phone: newPhone, NOT: { id: userId } },
                select: { id: true },
            }),
            this.prisma.user.findFirst({
                where: { email: newEmail, NOT: { id: userId } },
                select: { id: true },
            }),
        ]);
        if (phoneTaken) throw new BadRequestException('This phone number is already in use');
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
        email: string | null | undefined,
        action: string,
        isSuccess: boolean,
        ip?: string,
        device?: string,
    ) {
        if (!email) return;
        const user = await this.prisma.user.findUnique({
            where: { email },
            select: { id: true },
        });
        await this.prisma.securityLog.create({
            data: {
                email,
                userId: user?.id,
                action,
                isSuccess,
                ipAddress: ip,
                device,
            },
        });
    }
}
