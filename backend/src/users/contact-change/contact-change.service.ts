import {
    BadRequestException,
    ConflictException,
    ForbiddenException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { OtpService } from '../../auth/otp.service';
import { OtpPurpose } from '../../auth/otp-purpose';
import { AuditLogsService } from '../../audit-logs/audit-logs.service';
import { normalizeGulfPhone } from '../../common/phone/gulf-phone.util';
import { ActorType } from '@prisma/client';

const MAX_INIT_PER_DAY = 3;

@Injectable()
export class ContactChangeService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly otpService: OtpService,
        private readonly auditLogs: AuditLogsService,
    ) {}

    private assertCustomer(role: string) {
        if (role !== 'CUSTOMER') {
            throw new ForbiddenException('Contact change OTP is available for customers only');
        }
    }

    private normalize(field: 'email' | 'phone', value: string): string {
        if (field === 'email') return value.trim().toLowerCase();
        return normalizeGulfPhone(value);
    }

    private async enforceDailyRateLimit(userId: string) {
        const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const count = await this.prisma.securityLog.count({
            where: {
                userId,
                action: { in: ['CONTACT_CHANGE_INIT', 'CONTACT_CHANGE_SUCCESS'] },
                createdAt: { gte: since },
            },
        });
        if (count >= MAX_INIT_PER_DAY) {
            throw new BadRequestException('Too many contact change attempts. Try again in 24 hours.');
        }
    }

    private async assertUnique(field: 'email' | 'phone', value: string, excludeUserId: string) {
        const existing =
            field === 'email'
                ? await this.prisma.user.findFirst({
                      where: { email: value, id: { not: excludeUserId } },
                      select: { id: true },
                  })
                : await this.prisma.user.findFirst({
                      where: { phone: value, id: { not: excludeUserId } },
                      select: { id: true },
                  });
        if (existing) {
            throw new ConflictException(
                field === 'email' ? 'Email is already in use' : 'Phone number is already in use',
            );
        }
    }

    private async logSecurity(params: {
        userId: string;
        email?: string | null;
        action: string;
        isSuccess: boolean;
        ip?: string | null;
        device?: string | null;
    }) {
        await this.prisma.securityLog.create({
            data: {
                userId: params.userId,
                email: params.email ?? undefined,
                action: params.action,
                isSuccess: params.isSuccess,
                ipAddress: params.ip ?? undefined,
                device: params.device ?? undefined,
            },
        });
    }

    async init(
        userId: string,
        field: 'email' | 'phone',
        rawNewValue: string,
        ctx?: { ip?: string | null; userAgent?: string | null },
    ) {
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        if (!user) throw new NotFoundException('User not found');
        this.assertCustomer(user.role);

        const newValue = this.normalize(field, rawNewValue);
        const oldValue = field === 'email' ? user.email : user.phone;

        if (oldValue && this.normalize(field, oldValue) === newValue) {
            throw new BadRequestException('New value must differ from the current value');
        }

        try {
            await this.enforceDailyRateLimit(userId);
            await this.assertUnique(field, newValue, userId);

            const otpResult = await this.otpService.issueAndSend({
                channel: field === 'email' ? 'email' : 'whatsapp',
                purpose: OtpPurpose.PROFILE_CHANGE,
                audience: 'customer',
                email: field === 'email' ? newValue : user.email,
                phone: field === 'phone' ? newValue : user.phone ?? undefined,
                name: user.name ?? undefined,
                role: 'customer',
                metadata: {
                    audience: 'customer',
                    target: 'new',
                    field,
                    newValue,
                },
            });
            if (!otpResult.sent) {
                throw new BadRequestException(
                    field === 'email'
                        ? 'Failed to send verification email'
                        : 'Failed to send WhatsApp OTP',
                );
            }

            await this.logSecurity({
                userId,
                email: user.email,
                action: 'CONTACT_CHANGE_INIT',
                isSuccess: true,
                ip: ctx?.ip,
                device: ctx?.userAgent,
            });

            await this.auditLogs.logAction({
                action: 'CONTACT_CHANGE_INIT',
                entity: 'USER',
                actorType: ActorType.CUSTOMER,
                actorId: userId,
                actorName: user.name ?? undefined,
                reason: `OTP sent to new ${field}`,
                metadata: {
                    field,
                    oldValue,
                    newValue,
                    ipAddress: ctx?.ip,
                    userAgent: ctx?.userAgent,
                },
            });

            return {
                success: true,
                message:
                    field === 'email'
                        ? 'Verification code sent to the new email address'
                        : 'Verification code sent to the new phone via WhatsApp',
                channel: field === 'email' ? 'email' : 'whatsapp',
            };
        } catch (err) {
            const reason = err instanceof Error ? err.message : String(err);
            await this.logSecurity({
                userId,
                email: user.email,
                action: 'CONTACT_CHANGE_INIT_FAILED',
                isSuccess: false,
                ip: ctx?.ip,
                device: ctx?.userAgent,
            }).catch(() => undefined);
            await this.auditLogs
                .logAction({
                    action: 'CONTACT_CHANGE_INIT_FAILED',
                    entity: 'USER',
                    actorType: ActorType.CUSTOMER,
                    actorId: userId,
                    actorName: user.name ?? undefined,
                    reason,
                    metadata: {
                        field,
                        oldValue,
                        newValue,
                        ipAddress: ctx?.ip,
                        userAgent: ctx?.userAgent,
                    },
                })
                .catch(() => undefined);
            throw err;
        }
    }

    async verify(
        userId: string,
        field: 'email' | 'phone',
        rawNewValue: string,
        otp: string,
        ctx?: { ip?: string | null; userAgent?: string | null },
    ) {
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        if (!user) throw new NotFoundException('User not found');
        this.assertCustomer(user.role);

        const newValue = this.normalize(field, rawNewValue);
        const oldValue = field === 'email' ? user.email : user.phone;

        try {
            await this.assertUnique(field, newValue, userId);

            await this.otpService.verify({
                channel: field === 'email' ? 'email' : 'whatsapp',
                purpose: OtpPurpose.PROFILE_CHANGE,
                code: otp,
                email: field === 'email' ? newValue : user.email,
                phone: field === 'phone' ? newValue : undefined,
            });

            const updated = await this.prisma.user.update({
                where: { id: userId },
                data: field === 'email' ? { email: newValue } : { phone: newValue },
            });

            await this.logSecurity({
                userId,
                email: updated.email,
                action: 'CONTACT_CHANGE_SUCCESS',
                isSuccess: true,
                ip: ctx?.ip,
                device: ctx?.userAgent,
            });

            await this.auditLogs.logAction({
                action: 'CONTACT_CHANGE_SUCCESS',
                entity: 'USER',
                actorType: ActorType.CUSTOMER,
                actorId: userId,
                actorName: user.name ?? undefined,
                previousState: oldValue ?? undefined,
                newState: newValue,
                reason: `${field} updated after OTP verification`,
                metadata: {
                    field,
                    oldValue,
                    newValue,
                    ipAddress: ctx?.ip,
                    userAgent: ctx?.userAgent,
                },
            });

            return {
                success: true,
                field,
                value: newValue,
                user: { id: updated.id, email: updated.email, phone: updated.phone },
            };
        } catch (err) {
            const reason = err instanceof Error ? err.message : String(err);
            await this.logSecurity({
                userId,
                email: user.email,
                action: 'CONTACT_CHANGE_VERIFY_FAILED',
                isSuccess: false,
                ip: ctx?.ip,
                device: ctx?.userAgent,
            }).catch(() => undefined);
            await this.auditLogs
                .logAction({
                    action: 'CONTACT_CHANGE_VERIFY_FAILED',
                    entity: 'USER',
                    actorType: ActorType.CUSTOMER,
                    actorId: userId,
                    actorName: user.name ?? undefined,
                    reason,
                    metadata: {
                        field,
                        oldValue,
                        newValue,
                        ipAddress: ctx?.ip,
                        userAgent: ctx?.userAgent,
                    },
                })
                .catch(() => undefined);
            throw err;
        }
    }
}
