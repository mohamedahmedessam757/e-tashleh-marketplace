import {
    BadRequestException,
    ConflictException,
    ForbiddenException,
    Injectable,
    Logger,
    NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OtpService } from '../auth/otp.service';
import { OtpPurpose } from '../auth/otp-purpose';
import { NotificationsService } from '../notifications/notifications.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { normalizeGulfPhone } from '../common/phone/gulf-phone.util';
import { ActorType } from '@prisma/client';

const MERCHANT_ROLES = ['VENDOR', 'MERCHANT'];
const MAX_REQUESTS_PER_DAY = 3;

@Injectable()
export class ProfileChangesService {
    private readonly logger = new Logger(ProfileChangesService.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly otpService: OtpService,
        private readonly notifications: NotificationsService,
        private readonly auditLogs: AuditLogsService,
    ) {}

    private assertMerchantRole(role: string) {
        if (!MERCHANT_ROLES.includes(role)) {
            throw new ForbiddenException('Profile change requests are available for merchants only');
        }
    }

    private normalizeNewValue(field: 'email' | 'phone', value: string): string {
        if (field === 'email') {
            return value.trim().toLowerCase();
        }
        return normalizeGulfPhone(value);
    }

    private async enforceDailyRateLimit(userId: string) {
        const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const count = await this.prisma.profileChangeRequest.count({
            where: { userId, requestedAt: { gte: since } },
        });
        if (count >= MAX_REQUESTS_PER_DAY) {
            throw new BadRequestException('Too many profile change requests. Try again in 24 hours.');
        }
    }

    async requestOtp(userId: string, field: 'email' | 'phone') {
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        if (!user) throw new NotFoundException('User not found');
        this.assertMerchantRole(user.role);

        const channel = field === 'email' ? 'email' : 'whatsapp';
        const target = field === 'email' ? user.email : user.phone;
        if (!target) {
            throw new BadRequestException(`No current ${field} on file`);
        }

        return this.otpService.issueAndSend({
            channel,
            purpose: OtpPurpose.PROFILE_CHANGE,
            audience: 'vendor',
            email: field === 'email' ? user.email : undefined,
            phone: field === 'phone' ? user.phone ?? undefined : user.phone ?? undefined,
            name: user.name,
            role: user.role,
        });
    }

    async submitChangeRequest(
        userId: string,
        field: 'email' | 'phone',
        rawNewValue: string,
        otp: string,
    ) {
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        if (!user) throw new NotFoundException('User not found');
        this.assertMerchantRole(user.role);

        const newValue = this.normalizeNewValue(field, rawNewValue);
        const oldValue = field === 'email' ? user.email : user.phone;

        if (oldValue && this.normalizeNewValue(field, oldValue) === newValue) {
            throw new BadRequestException('New value must differ from the current value');
        }

        const existingPending = await this.prisma.profileChangeRequest.findFirst({
            where: { userId, field, status: 'PENDING_REVIEW' },
        });
        if (existingPending) {
            throw new ConflictException('A pending change request already exists for this field');
        }

        await this.enforceDailyRateLimit(userId);

        const duplicateUser = await this.prisma.user.findFirst({
            where: field === 'email' ? { email: newValue, NOT: { id: userId } } : { phone: newValue, NOT: { id: userId } },
        });
        if (duplicateUser) {
            throw new ConflictException(`This ${field} is already registered`);
        }

        const channel = field === 'email' ? 'email' : 'whatsapp';
        await this.otpService.verify({
            channel,
            purpose: OtpPurpose.PROFILE_CHANGE,
            code: otp,
            email: field === 'email' ? user.email ?? undefined : undefined,
            phone: field === 'phone' ? user.phone ?? undefined : user.phone ?? undefined,
        });

        const request = await this.prisma.profileChangeRequest.create({
            data: {
                userId,
                field,
                oldValue: oldValue ?? null,
                newValue,
                status: 'PENDING_REVIEW',
            },
        });

        const admins = await this.prisma.user.findMany({
            where: { role: { in: ['ADMIN', 'SUPER_ADMIN', 'SUPPORT'] } },
            select: { id: true },
        });
        for (const admin of admins) {
            await this.notifications.create({
                recipientId: admin.id,
                recipientRole: 'ADMIN',
                type: 'SYSTEM',
                titleAr: 'طلب تغيير بيانات تاجر',
                titleEn: 'Merchant Profile Change Request',
                messageAr: `طلب التاجر ${user.name} تغيير ${field === 'email' ? 'البريد' : 'الجوال'} إلى ${newValue}`,
                messageEn: `Merchant ${user.name} requested ${field} change to ${newValue}`,
                metadata: { type: 'PROFILE_CHANGE_REQUEST', requestId: request.id },
            });
        }

        await this.auditLogs.logAction({
            action: 'PROFILE_CHANGE_REQUESTED',
            entity: 'ProfileChangeRequest',
            actorType: ActorType.VENDOR,
            actorId: userId,
            metadata: { requestId: request.id, field, newValue },
        });

        return { success: true, requestId: request.id, status: request.status };
    }

    async getMyPending(userId: string) {
        return this.prisma.profileChangeRequest.findMany({
            where: { userId, status: 'PENDING_REVIEW' },
            orderBy: { requestedAt: 'desc' },
        });
    }

    async getPendingForAdmin() {
        return this.prisma.profileChangeRequest.findMany({
            where: { status: 'PENDING_REVIEW' },
            include: {
                user: { select: { id: true, name: true, email: true, phone: true, role: true } },
            },
            orderBy: { requestedAt: 'asc' },
        });
    }

    private async syncSupabaseAuth(userId: string, field: 'email' | 'phone', newValue: string) {
        const supabaseUrl = process.env.SUPABASE_URL || '';
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
        if (!supabaseUrl || !supabaseServiceKey) {
            this.logger.warn('Supabase credentials missing; skipping auth sync for profile change');
            return;
        }

        const { createClient } = require('@supabase/supabase-js');
        const supabase = createClient(supabaseUrl, supabaseServiceKey);
        const payload = field === 'email' ? { email: newValue } : { phone: newValue };
        const { error } = await supabase.auth.admin.updateUserById(userId, payload);
        if (error) {
            this.logger.error(`Supabase auth update failed for ${userId}: ${error.message}`);
            throw new BadRequestException('Failed to sync authentication profile');
        }
    }

    async resolveRequest(
        requestId: string,
        action: 'APPROVE' | 'REJECT',
        adminId: string,
        rejectionReason?: string,
    ) {
        const request = await this.prisma.profileChangeRequest.findUnique({
            where: { id: requestId },
            include: { user: true },
        });

        if (!request || request.status !== 'PENDING_REVIEW') {
            throw new BadRequestException('Request not found or already resolved');
        }

        if (action === 'APPROVE') {
            const field = request.field as 'email' | 'phone';
            const duplicateUser = await this.prisma.user.findFirst({
                where:
                    field === 'email'
                        ? { email: request.newValue, NOT: { id: request.userId } }
                        : { phone: request.newValue, NOT: { id: request.userId } },
            });
            if (duplicateUser) {
                throw new ConflictException(`This ${field} is already registered`);
            }

            await this.syncSupabaseAuth(request.userId, field, request.newValue);

            await this.prisma.user.update({
                where: { id: request.userId },
                data: field === 'email' ? { email: request.newValue } : { phone: request.newValue },
            });

            await this.notifications.notifyUser(request.userId, request.user.role, {
                titleAr: 'تمت الموافقة على تغيير البيانات',
                titleEn: 'Profile Change Approved',
                messageAr: `تم تحديث ${field === 'email' ? 'بريدك' : 'رقم جوالك'} بنجاح.`,
                messageEn: `Your ${field} has been updated successfully.`,
                type: 'system',
            });
        } else {
            await this.notifications.notifyUser(request.userId, request.user.role, {
                titleAr: 'تم رفض طلب تغيير البيانات',
                titleEn: 'Profile Change Rejected',
                messageAr: rejectionReason || 'تم رفض طلبك. يرجى التواصل مع الدعم.',
                messageEn: rejectionReason || 'Your request was rejected. Please contact support.',
                type: 'alert',
            });
        }

        const updated = await this.prisma.profileChangeRequest.update({
            where: { id: requestId },
            data: {
                status: action === 'APPROVE' ? 'APPROVED' : 'REJECTED',
                resolvedAt: new Date(),
                resolvedBy: adminId,
                rejectionReason: action === 'REJECT' ? rejectionReason ?? null : null,
            },
        });

        await this.auditLogs.logAction({
            action: action === 'APPROVE' ? 'PROFILE_CHANGE_APPROVED' : 'PROFILE_CHANGE_REJECTED',
            entity: 'ProfileChangeRequest',
            actorType: ActorType.ADMIN,
            actorId: adminId,
            metadata: { requestId, targetUserId: request.userId, field: request.field, action },
        });

        return updated;
    }
}
