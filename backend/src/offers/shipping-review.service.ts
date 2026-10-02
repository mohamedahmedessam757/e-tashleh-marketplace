import { Injectable, Logger } from '@nestjs/common';
import { ActorType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { getVoluntaryWithdrawEnd } from './offer-governance.util';
import { SHIPPING_REVIEW, SHIPPING_REVIEW_EXPIRED_WITHDRAWAL } from './shipping-review.util';
import { runDetached } from '../common/utils/run-detached';

/**
 * Shipping-class review lifecycle shared by offers (create/edit), orders (admin decision,
 * SLA enforcement) and the scheduler. Stateless — safe to provide in several modules.
 */
@Injectable()
export class ShippingReviewService {
    private readonly logger = new Logger(ShippingReviewService.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly notificationsService: NotificationsService,
        private readonly auditLogs: AuditLogsService,
    ) {}

    /** Urgent admin alert: offer is held (hidden from customer) until a shipping-class decision. */
    async notifyShippingClassMismatch(params: {
        orderId: string;
        orderNumber: string;
        offerId: string;
        storeName: string;
        orderPartId: string;
        partName: string | null;
        customerShippingClass: string;
        merchantPartType: string;
    }): Promise<void> {
        try {
            const partLabel = params.partName || params.orderPartId;
            await this.notificationsService.notifyAdmins({
                titleAr: '🚨 عاجل: اختلاف نوع الشحن بين العميل والتاجر',
                titleEn: '🚨 Urgent: shipping class mismatch (customer vs merchant)',
                messageAr: `الطلب #${params.orderNumber} — القطعة «${partLabel}»: العميل=${params.customerShippingClass} / التاجر (${params.storeName})=${params.merchantPartType}. العرض مخفي عن العميل حتى قرارك. يجب اتخاذ القرار قبل نهاية ساعة التقديم 23 وإلا سيُلغى العرض تلقائياً.`,
                messageEn: `Order #${params.orderNumber} — part "${partLabel}": customer=${params.customerShippingClass} / merchant (${params.storeName})=${params.merchantPartType}. The offer is hidden from the customer until you decide. Decide before bidding closes (hour 23) or the offer will be cancelled automatically.`,
                type: 'alert',
                link: `/admin/orders/${params.orderId}`,
                metadata: {
                    orderId: params.orderId,
                    offerId: params.offerId,
                    orderPartId: params.orderPartId,
                    customerShippingClass: params.customerShippingClass,
                    merchantPartType: params.merchantPartType,
                    urgent: true,
                    priority: 'critical',
                    shippingClassMismatch: true,
                },
            });
        } catch (e) {
            this.logger.error(
                `notifyShippingClassMismatch failed: ${e instanceof Error ? e.message : String(e)}`,
            );
        }
    }

    /**
     * Auto-withdraw offers whose shipping review is still PENDING once bidding has stopped
     * (offersStopAt, i.e. hour 23 of a 24h window). Each offer is claimed atomically so an
     * admin decision racing with this job can never be overwritten.
     */
    async expireUnresolvedShippingReviews(orderId?: string): Promise<number> {
        const now = new Date();
        const candidates = await this.prisma.offer.findMany({
            where: {
                shippingReviewStatus: SHIPPING_REVIEW.PENDING,
                status: 'pending',
                isWithdrawn: false,
                ...(orderId ? { orderId } : {}),
            },
            select: {
                id: true,
                offerNumber: true,
                orderId: true,
                orderPart: { select: { name: true } },
                store: { select: { name: true, ownerId: true } },
                order: {
                    select: {
                        orderNumber: true,
                        createdAt: true,
                        offersStopAt: true,
                        revealOffersAt: true,
                    },
                },
            },
            take: 200,
        });

        let expired = 0;
        for (const offer of candidates) {
            const stopAt = getVoluntaryWithdrawEnd({
                createdAt: offer.order.createdAt,
                offersStopAt: offer.order.offersStopAt,
                revealOffersAt: offer.order.revealOffersAt,
            });
            if (stopAt.getTime() > now.getTime()) continue;

            try {
                const res = await this.prisma.offer.updateMany({
                    where: {
                        id: offer.id,
                        shippingReviewStatus: SHIPPING_REVIEW.PENDING,
                        status: 'pending',
                        isWithdrawn: false,
                    },
                    data: {
                        shippingReviewStatus: SHIPPING_REVIEW.EXPIRED,
                        shippingReviewResolvedAt: now,
                        status: 'withdrawn',
                        isWithdrawn: true,
                        withdrawalType: SHIPPING_REVIEW_EXPIRED_WITHDRAWAL,
                        updatedAt: now,
                    },
                });
                if (res.count === 0) continue;
                expired++;

                await this.auditLogs.logAction({
                    orderId: offer.orderId,
                    action: 'SHIPPING_REVIEW_EXPIRED',
                    entity: 'Offer',
                    actorType: ActorType.SYSTEM,
                    actorId: 'system-scheduler',
                    actorName: 'System Scheduler',
                    previousState: SHIPPING_REVIEW.PENDING,
                    newState: SHIPPING_REVIEW.EXPIRED,
                    reason: 'No admin shipping-class decision before bidding stopped',
                    metadata: { offerId: offer.id, offerNumber: offer.offerNumber },
                });

                this.notifyExpired({
                    orderId: offer.orderId,
                    orderNumber: offer.order.orderNumber,
                    offerId: offer.id,
                    offerNumber: offer.offerNumber,
                    partName: offer.orderPart?.name || '',
                    storeName: offer.store?.name || '',
                    ownerId: offer.store?.ownerId || null,
                });
            } catch (err) {
                this.logger.error(
                    `Failed to expire shipping review for offer ${offer.id}: ${err instanceof Error ? err.message : err}`,
                );
            }
        }
        if (expired > 0) {
            this.logger.log(`Expired ${expired} offer(s) with unresolved shipping review.`);
        }
        return expired;
    }

    private notifyExpired(p: {
        orderId: string;
        orderNumber: string;
        offerId: string;
        offerNumber: string;
        partName: string;
        storeName: string;
        ownerId: string | null;
    }): void {
        runDetached('shippingReviewExpired:notify', async () => {
            const tasks: Promise<unknown>[] = [];
            if (p.ownerId) {
                tasks.push(
                    this.notificationsService.create({
                        recipientId: p.ownerId,
                        recipientRole: 'MERCHANT',
                        titleAr: 'تم تقييد عرضك من الإدارة',
                        titleEn: 'Your offer was restricted by administration',
                        messageAr: `تم تقييد هذا العرض${p.partName ? ` على القطعة «${p.partName}»` : ''} في الطلب #${p.orderNumber} من الإدارة بسبب اختلاف نوع الشحن بين المتجر والعميل. يمكنك إعادة التقديم مرة أخرى في حال طلب العميل القطع.`,
                        messageEn: `This offer${p.partName ? ` on "${p.partName}"` : ''} for order #${p.orderNumber} was restricted by administration due to a shipping-type mismatch between the store and the customer. You may submit again if the customer requests the parts.`,
                        type: 'ORDER',
                        link: `/dashboard/merchant/orders/${p.orderId}`,
                        metadata: {
                            orderId: p.orderId,
                            offerId: p.offerId,
                            shippingReview: SHIPPING_REVIEW.EXPIRED,
                            hidePrice: true,
                        },
                    }),
                );
            }
            tasks.push(
                this.notificationsService.notifyAdmins({
                    titleAr: 'إلغاء عرض لانتهاء مهلة قرار الشحن',
                    titleEn: 'Offer cancelled — shipping decision deadline passed',
                    messageAr: `الطلب #${p.orderNumber} — العرض ${p.offerNumber} (${p.storeName}) أُلغي تلقائياً لعدم حسم اختلاف نوع الشحن قبل إغلاق التقديم.`,
                    messageEn: `Order #${p.orderNumber} — offer ${p.offerNumber} (${p.storeName}) was auto-cancelled: shipping mismatch was not resolved before bidding closed.`,
                    type: 'alert',
                    link: `/admin/orders/${p.orderId}`,
                    metadata: { orderId: p.orderId, offerId: p.offerId, shippingReview: SHIPPING_REVIEW.EXPIRED },
                }),
            );
            await Promise.allSettled(tasks);
        });
    }
}
