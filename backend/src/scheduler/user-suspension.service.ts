import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { AccountAccessNotifyService } from '../notifications/account-access-notify.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';

/**
 * Lifts temporary user suspensions (customers / staff) when suspendedUntil has passed.
 */
@Injectable()
export class UserSuspensionService {
  private readonly logger = new Logger(UserSuspensionService.name);

  constructor(
    private prisma: PrismaService,
    private accountAccessNotify: AccountAccessNotifyService,
    private auditLogs: AuditLogsService,
  ) {}

  @Cron('*/12 * * * *')
  async handleExpiredUserSuspensions() {
    const now = new Date();
    this.logger.log(`Checking expired user suspensions at ${now.toISOString()}...`);

    try {
      const expired = await this.prisma.user.findMany({
        where: {
          status: 'SUSPENDED',
          suspendedUntil: { lte: now, not: null },
        },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          status: true,
        },
      });

      if (expired.length === 0) return;

      this.logger.log(`Found ${expired.length} users to reactivate.`);

      for (const user of expired) {
        await this.prisma.user.update({
          where: { id: user.id },
          data: {
            status: 'ACTIVE',
            suspendedUntil: null,
            suspendReason: null,
          },
        });

        await this.auditLogs.logAction({
          action: 'AUTO_UNBAN',
          entity: 'USER',
          actorType: 'SYSTEM',
          actorName: 'Scheduler:UserSuspension',
          reason: 'User suspension period expired',
          metadata: {
            userId: user.id,
            email: user.email,
            previousStatus: 'SUSPENDED',
          },
        });

        const scope =
          user.role === 'VENDOR'
            ? 'MERCHANT'
            : [
                  'ADMIN',
                  'SUPER_ADMIN',
                  'SUPPORT',
                  'VERIFICATION_OFFICER',
                  'ACCOUNTANT',
                ].includes(user.role)
              ? 'ADMIN'
              : 'CUSTOMER';

        void this.accountAccessNotify.notify({
          recipientId: user.id,
          recipientRole: user.role,
          scope: scope as 'CUSTOMER' | 'MERCHANT' | 'ADMIN',
          action: 'UNBAN',
          banKind: 'NONE',
          reason: 'Suspension period expired',
          recipientName: user.name,
        });

        this.logger.log(`User [${user.email}] auto-reactivated.`);
      }
    } catch (error) {
      this.logger.error(
        'Failed to process expired user suspensions:',
        (error as Error)?.stack,
      );
    }
  }
}
