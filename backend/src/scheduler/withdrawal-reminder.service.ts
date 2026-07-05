import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class WithdrawalReminderService {
    private readonly logger = new Logger(WithdrawalReminderService.name);

    constructor(
        private prisma: PrismaService,
        private notifications: NotificationsService
    ) {}

    @Cron(CronExpression.EVERY_12_HOURS)
    async checkPendingWithdrawals() {
        this.logger.log('Checking overdue withdrawal requests...');

        try {
            const fortyEightHoursAgo = new Date(Date.now() - 48 * 60 * 60 * 1000);
            const threeBusinessDaysAgo = this.subtractBusinessDays(new Date(), 3);

            const [overduePending, overdueProcessing] = await Promise.all([
                this.prisma.withdrawalRequest.findMany({
                    where: {
                        status: 'PENDING',
                        createdAt: { lte: fortyEightHoursAgo },
                    },
                    include: {
                        store: { select: { name: true } },
                        user: { select: { name: true, email: true } },
                    },
                }),
                this.prisma.withdrawalRequest.findMany({
                    where: {
                        status: 'PROCESSING',
                        approvedAt: { lte: threeBusinessDaysAgo },
                    },
                    include: {
                        store: { select: { name: true } },
                        user: { select: { name: true, email: true } },
                    },
                }),
            ]);

            for (const request of overduePending) {
                const entityName = request.role === 'CUSTOMER'
                    ? (request.user?.name || request.user?.email)
                    : request.store?.name;

                await this.notifications.notifyAdmins({
                    type: 'SYSTEM',
                    titleAr: 'تذكير: طلب سحب متأخر ⏳',
                    titleEn: 'Reminder: Overdue Withdrawal Request ⏳',
                    messageAr: `طلب السحب الخاص بـ (${entityName}) بمبلغ ${request.amount} معلّق منذ أكثر من 48 ساعة.`,
                    messageEn: `Withdrawal for (${entityName}) — ${request.amount} AED — pending over 48 hours.`,
                    metadata: { type: 'WITHDRAWAL_REMINDER', requestId: request.id, role: request.role },
                });
            }

            for (const request of overdueProcessing) {
                const entityName = request.role === 'CUSTOMER'
                    ? (request.user?.name || request.user?.email)
                    : request.store?.name;

                await this.notifications.notifyAdmins({
                    type: 'SYSTEM',
                    titleAr: 'تذكير: سحب قيد التنفيذ منذ 3 أيام عمل',
                    titleEn: 'Reminder: Processing Withdrawal SLA Breach',
                    messageAr: `طلب سحب (${entityName}) بمبلغ ${request.amount} في حالة «جارٍ التنفيذ» منذ أكثر من 3 أيام عمل.`,
                    messageEn: `Withdrawal for (${entityName}) — ${request.amount} AED — processing over 3 business days.`,
                    metadata: { type: 'WITHDRAWAL_PROCESSING_SLA', requestId: request.id, role: request.role },
                });
            }

            if (overduePending.length || overdueProcessing.length) {
                this.logger.log(`Sent ${overduePending.length + overdueProcessing.length} withdrawal reminders.`);
            }
        } catch (error) {
            this.logger.error(`Error in checkPendingWithdrawals: ${(error as Error).message}`);
        }
    }

    private subtractBusinessDays(from: Date, days: number): Date {
        const result = new Date(from);
        let remaining = days;
        while (remaining > 0) {
            result.setDate(result.getDate() - 1);
            const dow = result.getDay();
            if (dow !== 0 && dow !== 6) remaining -= 1;
        }
        return result;
    }
}
