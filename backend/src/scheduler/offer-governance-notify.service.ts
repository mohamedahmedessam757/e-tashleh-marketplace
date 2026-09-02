import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { OrderStatus, ActorType } from '@prisma/client';
import { getVoluntaryWithdrawEnd } from '../offers/offer-governance.util';
import { OfferBiddingRestrictionService } from '../offers/offer-bidding-restriction.service';

@Injectable()
export class OfferGovernanceNotifyService {
    private readonly logger = new Logger(OfferGovernanceNotifyService.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly notifications: NotificationsService,
        private readonly biddingRestriction: OfferBiddingRestrictionService,
    ) {}

    @Cron(CronExpression.EVERY_HOUR)
    async handleExpiredBiddingRestrictions() {
        if (!(await this.prisma.ensureConnected())) return;
        try {
            const lifted = await this.biddingRestriction.clearExpiredRestrictions();
            if (lifted > 0) {
                this.logger.log(`Lifted ${lifted} expired offer-bidding restriction(s).`);
            }
        } catch (e: any) {
            this.logger.error(`clearExpiredRestrictions failed: ${e?.message || e}`);
        }
    }

    /**
     * Reminds merchants when less than ~1 hour remains to edit/cancel (before offersStopAt).
     * The old "voluntary window opened after 3h free edit" reminder was removed.
     */
    @Cron(CronExpression.EVERY_5_MINUTES)
    async handleVoluntaryWithdrawReminders() {
        if (!(await this.prisma.ensureConnected())) return;

        const now = new Date();

        const activeOffers = await this.prisma.offer.findMany({
            where: {
                isWithdrawn: false,
                status: 'pending',
                order: {
                    status: { in: [OrderStatus.COLLECTING_OFFERS, OrderStatus.AWAITING_OFFERS] },
                },
            },
            include: {
                order: {
                    select: {
                        id: true,
                        orderNumber: true,
                        revealOffersAt: true,
                        createdAt: true,
                        offersStopAt: true,
                    },
                },
                store: { select: { ownerId: true } },
            },
            take: 80,
        });

        for (const offer of activeOffers) {
            if (!offer.store?.ownerId || !offer.order) continue;
            const actionEnd = getVoluntaryWithdrawEnd({
                revealOffersAt: offer.order.revealOffersAt,
                createdAt: offer.order.createdAt,
                offersStopAt: offer.order.offersStopAt,
            });
            const msUntilEnd = actionEnd.getTime() - now.getTime();
            // Remind when ≤ 65 minutes remain until bidding stop
            if (msUntilEnd <= 0 || msUntilEnd > 65 * 60 * 1000) continue;

            await this.notifyOnce(offer.id, offer.orderId, 'ACTION_WINDOW_CLOSING', async () => {
                await this.notifications.create({
                    recipientId: offer.store!.ownerId!,
                    recipientRole: 'VENDOR',
                    titleAr: 'تبقى أقل من ساعة للتعديل أو إلغاء العرض',
                    titleEn: 'Less Than 1 Hour Left to Edit or Cancel',
                    messageAr: `تبقى وقت قصير لتعديل أو إلغاء عرضك على الطلب #${offer.order!.orderNumber} قبل إغلاق باب التقديم (ساعة قبل كشف العروض).`,
                    messageEn: `Little time remains to edit or cancel your offer on request #${offer.order!.orderNumber} before bidding closes (1 hour before reveal).`,
                    type: 'system_alert',
                    link: `/dashboard/merchant/orders/${offer.orderId}`,
                    metadata: { offerId: offer.id, notifyKey: 'ACTION_WINDOW_CLOSING' },
                });
            });
        }
    }

    private async notifyOnce(
        offerId: string,
        orderId: string,
        action: string,
        send: () => Promise<void>,
    ) {
        const existing = await this.prisma.auditLog.findFirst({
            where: {
                orderId,
                action,
                metadata: { path: ['offerId'], equals: offerId },
            },
        });
        if (existing) return;

        try {
            await send();
            await this.prisma.auditLog.create({
                data: {
                    orderId,
                    action,
                    entity: 'Offer',
                    actorType: ActorType.SYSTEM,
                    actorId: 'offer-governance-cron',
                    actorName: 'Offer Governance Cron',
                    metadata: { offerId },
                },
            });
        } catch (err) {
            this.logger.warn(`Failed governance notify ${action} for offer ${offerId}: ${(err as Error).message}`);
        }
    }
}
