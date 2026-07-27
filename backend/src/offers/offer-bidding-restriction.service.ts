import { ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';

export const MONTHLY_OFFER_DELETION_LIMIT = 50;
export const MONTHLY_OFFER_DELETION_WARN_AT = 35;
export const DEFAULT_OFFER_BIDDING_RESTRICTION_DAYS = 5;

@Injectable()
export class OfferBiddingRestrictionService {
    private readonly logger = new Logger(OfferBiddingRestrictionService.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly notifications: NotificationsService,
        private readonly auditLogs: AuditLogsService,
    ) {}

    /** UTC calendar month key YYYY-MM */
    currentMonthKey(now = new Date()): string {
        return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
    }

    async ensureMonthBucket(storeId: string, now = new Date()) {
        const month = this.currentMonthKey(now);
        const store = await this.prisma.store.findUnique({
            where: { id: storeId },
            select: {
                id: true,
                name: true,
                ownerId: true,
                monthlyOfferDeletionCount: true,
                monthlyOfferDeletionMonth: true,
                offerBiddingRestrictedUntil: true,
                offerBiddingRestrictionReason: true,
            },
        });
        if (!store) throw new NotFoundException('Store not found');

        if (store.monthlyOfferDeletionMonth !== month) {
            return this.prisma.store.update({
                where: { id: storeId },
                data: {
                    monthlyOfferDeletionMonth: month,
                    monthlyOfferDeletionCount: 0,
                },
                select: {
                    id: true,
                    name: true,
                    ownerId: true,
                    monthlyOfferDeletionCount: true,
                    monthlyOfferDeletionMonth: true,
                    offerBiddingRestrictedUntil: true,
                    offerBiddingRestrictionReason: true,
                },
            });
        }
        return store;
    }

    assertNotRestricted(store: {
        offerBiddingRestrictedUntil?: Date | null;
    }) {
        const until = store.offerBiddingRestrictedUntil
            ? new Date(store.offerBiddingRestrictedUntil)
            : null;
        if (until && until > new Date()) {
            throw new ForbiddenException(
                `Offer bidding is restricted until ${until.toISOString()}. You cannot submit new offers.`,
            );
        }
    }

    /**
     * +1 monthly deletion (cancel within 15m or voluntary withdraw).
     * At 35: warn merchant + admins. At 50: auto 5-day bidding restriction.
     */
    async recordDeletion(storeId: string, meta?: { orderNumber?: string; kind?: string }) {
        const before = await this.ensureMonthBucket(storeId);
        const updated = await this.prisma.store.update({
            where: { id: storeId },
            data: { monthlyOfferDeletionCount: { increment: 1 } },
            select: {
                id: true,
                name: true,
                ownerId: true,
                monthlyOfferDeletionCount: true,
                monthlyOfferDeletionMonth: true,
                offerBiddingRestrictedUntil: true,
            },
        });

        const count = updated.monthlyOfferDeletionCount;
        if (count === MONTHLY_OFFER_DELETION_WARN_AT) {
            await this.notifyThreshold(updated, 'WARN', meta);
        }
        if (count >= MONTHLY_OFFER_DELETION_LIMIT) {
            const already =
                updated.offerBiddingRestrictedUntil &&
                new Date(updated.offerBiddingRestrictedUntil) > new Date();
            if (!already) {
                await this.applyRestriction(
                    storeId,
                    DEFAULT_OFFER_BIDDING_RESTRICTION_DAYS,
                    `Auto: reached ${MONTHLY_OFFER_DELETION_LIMIT} offer deletions/withdrawals in ${updated.monthlyOfferDeletionMonth}`,
                    { actorType: 'SYSTEM', actorId: undefined },
                );
            } else {
                await this.notifyThreshold(updated, 'LIMIT', meta);
            }
        }

        return updated;
    }

    async applyRestriction(
        storeId: string,
        days: number,
        reason: string,
        actor: { actorType: 'ADMIN' | 'SYSTEM'; actorId?: string },
    ) {
        const safeDays = Math.max(1, Math.min(90, Math.floor(days) || DEFAULT_OFFER_BIDDING_RESTRICTION_DAYS));
        const until = new Date(Date.now() + safeDays * 24 * 60 * 60 * 1000);

        const store = await this.prisma.store.update({
            where: { id: storeId },
            data: {
                offerBiddingRestrictedUntil: until,
                offerBiddingRestrictionReason: reason,
            },
            select: {
                id: true,
                name: true,
                ownerId: true,
                monthlyOfferDeletionCount: true,
                monthlyOfferDeletionMonth: true,
                offerBiddingRestrictedUntil: true,
                offerBiddingRestrictionReason: true,
            },
        });

        await this.auditLogs.logAction({
            action: 'OFFER_BIDDING_RESTRICTED',
            entity: 'STORE',
            actorType: actor.actorType,
            actorId: actor.actorId,
            actorName: actor.actorType === 'SYSTEM' ? 'OfferBiddingRestriction' : undefined,
            reason,
            metadata: {
                storeId,
                store_name: store.name,
                days: safeDays,
                until: until.toISOString(),
                monthlyOfferDeletionCount: store.monthlyOfferDeletionCount,
                source: actor.actorType,
            },
        });

        if (store.ownerId) {
            const untilLabel = until.toLocaleString('ar-EG');
            const statusDetailAr = `تقييد تقديم العروض لمدة ${safeDays} أيام حتى ${untilLabel}. السبب: الوصول لحد 50 حذف/انسحاب شهري.`;
            const statusDetailEn = `Offer bidding restricted for ${safeDays} days until ${until.toISOString()}. Reason: reached monthly 50 deletion/withdrawal limit.`;
            await this.notifications
                .create({
                    recipientId: store.ownerId,
                    recipientRole: 'VENDOR',
                    titleAr: 'تقييد تقديم العروض',
                    titleEn: 'Offer Bidding Restricted',
                    messageAr: `تم تقييد تقديم العروض على متجرك "${store.name}" لمدة ${safeDays} أيام (حتى ${untilLabel}) بسبب الوصول لحد الحذف/الانسحاب الشهري. باقي لوحة التحكم تعمل بشكل طبيعي.`,
                    messageEn: `Offer bidding on your store "${store.name}" is restricted for ${safeDays} days (until ${until.toISOString()}) due to the monthly deletion/withdrawal limit. The rest of your dashboard still works.`,
                    type: 'GOVERNANCE_ALERT',
                    link: '/dashboard/merchant/home',
                    metadata: {
                        waEvent: 'OFFER_BIDDING_RESTRICTED',
                        storeId,
                        store_name: store.name,
                        days: safeDays,
                        until: until.toISOString(),
                        status_detail: statusDetailAr,
                        status_detail_en: statusDetailEn,
                        source: actor.actorType,
                    },
                })
                .catch((e) => this.logger.warn(`restriction notify merchant failed: ${e?.message}`));
        }

        await this.notifications
            .notifyAdmins({
                titleAr:
                    actor.actorType === 'SYSTEM'
                        ? `تقييد عروض تلقائي — ${store.name}`
                        : `تقييد عروض — ${store.name}`,
                titleEn:
                    actor.actorType === 'SYSTEM'
                        ? `Auto offer-bidding restriction — ${store.name}`
                        : `Offer bidding restriction — ${store.name}`,
                messageAr: `تم تطبيق تقييد تقديم العروض لمدة ${safeDays} أيام على المتجر "${store.name}". العداد الشهري: ${store.monthlyOfferDeletionCount ?? '—'}. السبب: ${reason}`,
                messageEn: `Offer bidding restricted for ${safeDays} days on "${store.name}". Monthly count: ${store.monthlyOfferDeletionCount ?? '—'}. Reason: ${reason}`,
                type: 'ALERT',
                link: `/admin/stores/${storeId}`,
                metadata: {
                    storeId,
                    store_name: store.name,
                    priority: 'urgent',
                    until: until.toISOString(),
                    monthlyOfferDeletionCount: store.monthlyOfferDeletionCount,
                    source: actor.actorType,
                },
            })
            .catch((e) => this.logger.warn(`restriction notify admins failed: ${e?.message}`));

        return store;
    }

    async clearRestriction(
        storeId: string,
        opts?: { actorType?: 'ADMIN' | 'SYSTEM'; actorId?: string; notify?: boolean },
    ) {
        const store = await this.prisma.store.findUnique({
            where: { id: storeId },
            select: {
                id: true,
                name: true,
                ownerId: true,
                offerBiddingRestrictedUntil: true,
            },
        });
        if (!store) throw new NotFoundException('Store not found');
        if (!store.offerBiddingRestrictedUntil) return store;

        const updated = await this.prisma.store.update({
            where: { id: storeId },
            data: {
                offerBiddingRestrictedUntil: null,
                offerBiddingRestrictionReason: null,
            },
            select: {
                id: true,
                name: true,
                ownerId: true,
                offerBiddingRestrictedUntil: true,
            },
        });

        await this.auditLogs.logAction({
            action: 'OFFER_BIDDING_RESTRICTION_LIFTED',
            entity: 'STORE',
            actorType: opts?.actorType || 'SYSTEM',
            actorId: opts?.actorId,
            actorName: opts?.actorType === 'ADMIN' ? undefined : 'OfferBiddingRestriction',
            reason: 'Offer bidding restriction cleared',
            metadata: { storeId },
        });

        if (opts?.notify !== false && store.ownerId) {
            await this.notifications
                .create({
                    recipientId: store.ownerId,
                    recipientRole: 'VENDOR',
                    titleAr: 'تم رفع تقييد تقديم العروض',
                    titleEn: 'Offer Bidding Restriction Lifted',
                    messageAr: `تم رفع تقييد تقديم العروض عن متجرك "${store.name}". يمكنك تقديم عروض جديدة مرة أخرى.`,
                    messageEn: `Offer bidding restriction on "${store.name}" has been lifted. You can submit new offers again.`,
                    type: 'ORDER',
                    link: '/dashboard/merchant/marketplace',
                    metadata: {
                        waEvent: 'ORDER_STATUS',
                        storeId,
                        status: 'RESTRICTION_LIFTED',
                        order_number: store.id.slice(0, 8),
                        status_detail: 'تم رفع تقييد تقديم العروض',
                    },
                })
                .catch(() => {});
        }

        return updated;
    }

    async clearExpiredRestrictions() {
        const now = new Date();
        const expired = await this.prisma.store.findMany({
            where: {
                offerBiddingRestrictedUntil: { lte: now, not: null },
            },
            select: { id: true },
            take: 100,
        });
        for (const s of expired) {
            await this.clearRestriction(s.id, { actorType: 'SYSTEM', notify: true });
        }
        return expired.length;
    }

    private async notifyThreshold(
        store: { id: string; name: string; ownerId: string; monthlyOfferDeletionCount: number },
        level: 'WARN' | 'LIMIT',
        meta?: { orderNumber?: string; kind?: string },
    ) {
        const remaining = Math.max(0, MONTHLY_OFFER_DELETION_LIMIT - store.monthlyOfferDeletionCount);
        const titleAr =
            level === 'WARN'
                ? 'تحذير حوكمة: اقتراب حد حذف العروض'
                : 'تنبيه حوكمة: الوصول لحد حذف العروض';
        const titleEn =
            level === 'WARN'
                ? 'Governance warning: nearing offer deletion limit'
                : 'Governance alert: offer deletion limit reached';
        const messageAr =
            level === 'WARN'
                ? `متجرك وصل إلى ${store.monthlyOfferDeletionCount} حذف/انسحاب هذا الشهر (الحد ${MONTHLY_OFFER_DELETION_LIMIT}). متبقي ${remaining}.`
                : `متجرك وصل إلى ${store.monthlyOfferDeletionCount}/${MONTHLY_OFFER_DELETION_LIMIT} حذف/انسحاب هذا الشهر.`;
        const messageEn =
            level === 'WARN'
                ? `Your store reached ${store.monthlyOfferDeletionCount} deletions/withdrawals this month (limit ${MONTHLY_OFFER_DELETION_LIMIT}). ${remaining} remaining.`
                : `Your store reached ${store.monthlyOfferDeletionCount}/${MONTHLY_OFFER_DELETION_LIMIT} deletions/withdrawals this month.`;

        await this.notifications
            .notifyAdmins({
                titleAr: `${titleAr} — ${store.name}`,
                titleEn: `${titleEn} — ${store.name}`,
                messageAr: `${messageAr}${meta?.orderNumber ? ` الطلب #${meta.orderNumber}` : ''}`,
                messageEn: `${messageEn}${meta?.orderNumber ? ` Order #${meta.orderNumber}` : ''}`,
                type: 'ALERT',
                link: `/admin/stores/${store.id}`,
                metadata: {
                    storeId: store.id,
                    priority: 'urgent',
                    monthlyOfferDeletionCount: store.monthlyOfferDeletionCount,
                    level,
                },
            })
            .catch(() => {});

        if (store.ownerId) {
            await this.notifications
                .create({
                    recipientId: store.ownerId,
                    recipientRole: 'VENDOR',
                    titleAr,
                    titleEn,
                    messageAr,
                    messageEn,
                    type: 'GOVERNANCE_ALERT',
                    link: '/dashboard/merchant/marketplace',
                    metadata: {
                        storeId: store.id,
                        monthlyOfferDeletionCount: store.monthlyOfferDeletionCount,
                        level,
                    },
                })
                .catch(() => {});
        }
    }
}
