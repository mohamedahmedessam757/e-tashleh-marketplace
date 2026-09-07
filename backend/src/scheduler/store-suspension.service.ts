import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';

/**
 * StoreSuspensionService
 * Handles automated lifting of temporary store suspensions.
 * Frequency: Every 12 Minutes (as requested per 2026 Admin Optimization standards).
 */
@Injectable()
export class StoreSuspensionService {
    private readonly logger = new Logger(StoreSuspensionService.name);

    constructor(
        private prisma: PrismaService,
        private notifications: NotificationsService,
        private auditLogs: AuditLogsService,
    ) { }

    @Cron('*/12 * * * *')
    async handleExpiredSuspensions() {
        const now = new Date();
        this.logger.log(`Checking for expired suspensions at ${now.toISOString()}...`);

        try {
            // Find stores that are suspended and their time has passed
            const expiredStores = await this.prisma.store.findMany({
                where: {
                    status: 'SUSPENDED',
                    suspendedUntil: {
                        lte: now,
                        not: null
                    }
                },
                select: {
                    id: true,
                    name: true,
                    ownerId: true,
                    status: true,
                    stripeActivationRequired: true,
                    stripeChargesEnabled: true,
                    stripePayoutsEnabled: true,
                    stripeAccountId: true,
                    stripeDisabledReason: true,
                    stripeRequirementsDue: true,
                }
            });

            if (expiredStores.length === 0) {
                return;
            }

            this.logger.log(`Found ${expiredStores.length} stores to re-activate.`);

            for (const store of expiredStores) {
                const stripeReady =
                    Boolean(store.stripeAccountId) &&
                    Boolean(store.stripeChargesEnabled) &&
                    Boolean(store.stripePayoutsEnabled) &&
                    !store.stripeDisabledReason &&
                    !(Array.isArray(store.stripeRequirementsDue) && store.stripeRequirementsDue.length > 0);

                let restoreStatus: 'ACTIVE' | 'PENDING_STRIPE' | 'STRIPE_RESTRICTED' = 'ACTIVE';
                if (store.stripeActivationRequired) {
                    restoreStatus = stripeReady ? 'ACTIVE' : 'PENDING_STRIPE';
                }

                await this.prisma.$transaction(async (tx) => {
                    // 1. Update store status
                    await tx.store.update({
                        where: { id: store.id },
                        data: {
                            status: restoreStatus,
                            suspendedUntil: null
                        }
                    });

                    // 2. Task 10.4: Log the action in Audit Logs as SYSTEM
                    await this.auditLogs.logAction({
                        action: 'AUTO_UNBAN',
                        entity: 'STORE',
                        actorType: 'SYSTEM',
                        actorName: 'Scheduler:StoreSuspension',
                        reason: 'Suspension period expired (Standard Protocol 2026)',
                        metadata: {
                            storeId: store.id,
                            storeName: store.name,
                            previousStatus: 'SUSPENDED',
                            restoreStatus,
                        }
                    }, tx);

                    // 3. Task 10.5: Bilingual Notifications
                    // Notify Store Owner
                    await this.notifications.notifyUser(store.ownerId, 'VENDOR', {
                        titleAr: restoreStatus === 'ACTIVE' ? 'متجرك الآن نشط' : 'انتهى الإيقاف — أكمل التحقق المالي',
                        titleEn: restoreStatus === 'ACTIVE' ? 'Your store is now ACTIVE' : 'Suspension ended — complete financial verification',
                        messageAr:
                            restoreStatus === 'ACTIVE'
                                ? `تمت إعادة تفعيل متجر (${store.name}) تلقائياً بعد انتهاء مدة الإيقاف.`
                                : `انتهى إيقاف متجر (${store.name}). أكمل تفعيل Stripe قبل تقديم العروض.`,
                        messageEn:
                            restoreStatus === 'ACTIVE'
                                ? `Store (${store.name}) was automatically reactivated after the suspension period ended.`
                                : `Suspension ended for (${store.name}). Complete Stripe activation before submitting offers.`,
                        type: 'SUCCESS',
                        link: '/dashboard',
                        metadata: { storeId: store.id, event: 'STORE_AUTO_UNSUSPEND', restoreStatus },
                    });

                    // Notify Admins
                    await this.notifications.notifyAdmins({
                        titleAr: 'تنبيه النظام: إعادة تفعيل متجر',
                        titleEn: 'System Alert: Store Reactivated',
                        messageAr: `تمت إعادة تفعيل متجر [${store.name}] تلقائياً بعد انتهاء فترة الإيقاف (الحالة: ${restoreStatus}).`,
                        messageEn: `Store [${store.name}] has been automatically reactivated after the suspension period expired (status: ${restoreStatus}).`,
                        type: 'alert',
                        metadata: { storeId: store.id, restoreStatus },
                    });
                });

                this.logger.log(`Store [${store.name}] restored to ${restoreStatus} and parties notified.`);
            }
        } catch (error) {
            this.logger.error('Failed to process expired suspensions:', error.stack);
        }
    }
}
