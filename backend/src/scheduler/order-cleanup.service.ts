import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { OrderStateMachine } from '../orders/fsm/order-state-machine.service';
import { OrdersService } from '../orders/orders.service';
import { NotificationsService } from '../notifications/notifications.service';
import { OrderStatus, ActorType, ViolationTargetType } from '@prisma/client';
import { ViolationsService } from '../violations/violations.service';
import { OrderDurationConfigService } from '../common/order-duration-config.service';
import { OfferFulfillmentService } from '../orders/offer-fulfillment.service';
import { OrderSlaService } from '../orders/order-sla.service';
import { OfferFulfillmentStatus } from '@prisma/client';
import { EscrowService } from '../payments/escrow.service';
import { CronLockService } from '../common/cron-lock.service';

@Injectable()
export class OrderCleanupService {
    private readonly logger = new Logger(OrderCleanupService.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly orderStateMachine: OrderStateMachine,
        private readonly ordersService: OrdersService,
        private readonly notificationsService: NotificationsService,
        private readonly violationsService: ViolationsService,
        private readonly offerFulfillment: OfferFulfillmentService,
        private readonly escrowService: EscrowService,
        private readonly orderDurationConfig: OrderDurationConfigService,
        private readonly orderSla: OrderSlaService,
        private readonly cronLock: CronLockService,
    ) { }

    // Run every 1 minute to check for expired orders for near real-time expirations
    @Cron(CronExpression.EVERY_MINUTE)
    async handleCron() {
        this.logger.debug('Running Order Cleanup Job...');
        if (!(await this.prisma.ensureConnected())) {
            this.logger.warn('Skipping order cleanup — database unreachable.');
            return;
        }
        // Prevent overlapping runs across instances (and slow ticks overlapping themselves).
        const { ran } = await this.cronLock.runWithLock('order-cleanup-minute', async () => {
            await this.handleCollectingOffersReveal();
            await this.expireAwaitingSelection();
            await this.expireAwaitingPayment();
            await this.handlePreparationDelays();
            await this.handleCriticalPreparationFailures();
            await this.handleNonMatchingToCorrection();
            await this.handleCorrectionPeriodExpiry();
            await this.handleExpiredOfferCorrectionDocs();
            // Formerly hourly — keep ≤1 minute lag when nobody has the order open
            await this.handleOfferAutoCompletion();
            await this.handleSingleItemOrderAutoCompletion();
            await this.handleAssemblyCartExpiry();
            await this.expireActiveWarranties();
        });
        if (!ran) this.logger.debug('Order cleanup skipped (locked by another instance).');
    }

    // Safety-net duplicate (idempotent handlers). Primary path is the minute cron above.
    @Cron(CronExpression.EVERY_HOUR)
    async handleDeliveredReturnsAutoCompletion() {
        this.logger.debug('Running Delivered Orders Auto-Completion Job (hourly safety net)...');
        const { ran } = await this.cronLock.runWithLock('order-cleanup-delivered-hourly', async () => {
            await this.handleOfferAutoCompletion();
            await this.handleSingleItemOrderAutoCompletion();
        });
        if (!ran) this.logger.debug('Delivered auto-completion skipped (locked).');
    }

    /** Remind customers ~2 hours before per-offer return window expires (with catch-up) */
    @Cron(CronExpression.EVERY_30_MINUTES)
    async handleOfferReturnWindowReminder() {
        if (!(await this.prisma.ensureConnected())) return;

        const windowMs = await this.orderDurationConfig.getReturnDisputeMs();
        const reminderLeadMs = 2 * 60 * 60 * 1000;
        const minRemainingMs = 15 * 60 * 1000;
        const now = Date.now();
        // Ideal band: T-2h ±15m. Catch-up: any window ending within the next 2h15m (until 15m left)
        const catchUpEnd = new Date(now + reminderLeadMs + 15 * 60 * 1000);
        const catchUpStart = new Date(now + minRemainingMs);

        const offers = await this.prisma.offer.findMany({
            where: {
                fulfillmentStatus: OfferFulfillmentStatus.DELIVERED,
                deliveredAt: { not: null },
                resolutionLocked: false,
            },
            include: {
                orderPart: true,
                order: { select: { id: true, orderNumber: true, customerId: true } },
            },
        });

        for (const offer of offers) {
            if (!offer.deliveredAt) continue;
            const windowEndsAt = new Date(offer.deliveredAt.getTime() + windowMs);
            if (windowEndsAt < catchUpStart || windowEndsAt > catchUpEnd) continue;

            const hasCase = await this.offerFulfillment.hasOpenCaseForOffer(
                offer.id,
                offer.orderPartId,
            );
            if (hasCase) continue;

            const dedupeKey = `offer_return_reminder_${offer.id}`;
            const existing = await this.prisma.notification.findFirst({
                where: {
                    recipientId: offer.order.customerId,
                    link: { contains: dedupeKey },
                },
                select: { id: true },
            });
            if (existing) continue;

            const remainingMs = windowEndsAt.getTime() - now;
            const remainingHours = Math.max(1, Math.ceil(remainingMs / (60 * 60 * 1000)));
            const partName = offer.orderPart?.name || 'Part';
            await this.notificationsService.notifyWithDedup(
                offer.order.customerId,
                `wa:ORDER_STATUS:${offer.orderId}:grace_window_reminder`,
                120,
                {
                    recipientId: offer.order.customerId,
                    recipientRole: 'CUSTOMER',
                    titleAr: 'تذكير: مهلة الإرجاع/النزاع تنتهي قريباً',
                    titleEn: 'Reminder: return/dispute window ending soon',
                    messageAr: `تبقى حوالي ${remainingHours} ساعة على انتهاء مهلة الإرجاع/النزاع للقطعة «${partName}» في الطلب #${offer.order.orderNumber}.`,
                    messageEn: `About ${remainingHours} hour(s) left to request a return or dispute for "${partName}" in order #${offer.order.orderNumber}.`,
                    type: 'system_alert',
                    link: `/dashboard/orders/${offer.orderId}?${dedupeKey}=1`,
                    metadata: {
                        offerId: offer.id,
                        orderId: offer.orderId,
                        waEvent: 'ORDER_STATUS',
                        graceWindowReminder: true,
                    },
                },
            );
        }
    }

    /** Per-offer 24h window expiry for multi-item / partial delivery orders */
    private async handleOfferAutoCompletion() {
        const windowMs = await this.orderDurationConfig.getReturnDisputeMs();
        const returnHours = await this.orderDurationConfig.getReturnWindowHours();
        const windowEnd = new Date(Date.now() - windowMs);

        const eligibleOffers = await this.prisma.offer.findMany({
            where: {
                fulfillmentStatus: OfferFulfillmentStatus.DELIVERED,
                deliveredAt: { lt: windowEnd },
                resolutionLocked: false,
            },
            include: {
                orderPart: true,
                order: { select: { id: true, orderNumber: true, customerId: true, requestType: true, parts: true } },
            },
        });

        for (const offer of eligibleOffers) {
            try {
                const hasCase = await this.offerFulfillment.hasOpenCaseForOffer(
                    offer.id,
                    offer.orderPartId,
                );
                if (hasCase) continue;

                const result = await this.offerFulfillment.completeOfferAfterWindow(offer.id);
                if (!result) continue;

                const partName = offer.orderPart?.name || 'Part';
                const payment = await this.prisma.paymentTransaction.findFirst({
                    where: { offerId: offer.id, status: 'SUCCESS' },
                });
                if (payment) {
                    await this.escrowService
                        .releaseFundsForPayment(payment.id, 'AUTO_48H')
                        .catch((e) =>
                            this.logger.warn(
                                `Escrow release skipped for offer ${offer.id}: ${e?.message}`,
                            ),
                        );
                }

                await this.notificationsService.notifyWithDedup(
                    offer.order.customerId,
                    `wa:ORDER_STATUS:${offer.orderId}:grace_window_expired_item`,
                    120,
                    {
                        recipientId: offer.order.customerId,
                        recipientRole: 'CUSTOMER',
                        titleAr: 'انتهت مهلة الإرجاع للقطعة',
                        titleEn: 'Item return window expired',
                        messageAr: `انتهت مهلة الإرجاع/النزاع (${returnHours} ساعة) للقطعة «${partName}» في الطلب #${offer.order.orderNumber}.`,
                        messageEn: `The ${returnHours}-hour return/dispute window for "${partName}" in order #${offer.order.orderNumber} has expired.`,
                        type: 'system_alert',
                        link: `/dashboard/orders/${offer.orderId}`,
                        metadata: {
                            offerId: offer.id,
                            orderId: offer.orderId,
                            waEvent: 'ORDER_STATUS',
                            graceWindowExpired: true,
                        },
                    },
                );
            } catch (err) {
                this.logger.error(`Failed to auto-complete offer ${offer.id}:`, err);
            }
        }
    }

    /** Legacy single-item path: complete whole order after order.deliveredAt + 24h */
    private async handleSingleItemOrderAutoCompletion() {
        const windowMs = await this.orderDurationConfig.getReturnDisputeMs();
        const returnHours = await this.orderDurationConfig.getReturnWindowHours();
        const windowEnd = new Date(Date.now() - windowMs);

        const deliveredOrders = await this.prisma.order.findMany({
            where: {
                status: OrderStatus.DELIVERED,
                deliveredAt: { lt: windowEnd },
                OR: [
                    { requestType: { not: 'multiple' } },
                    { requestType: null },
                ],
            },
            select: { id: true, orderNumber: true, customerId: true, storeId: true, requestType: true, parts: { select: { id: true } } },
        });

        for (const order of deliveredOrders) {
            if (this.offerFulfillment.isMultiItemOrder(order)) continue;
            try {
                // Re-verify status to avoid race conditions or duplicates
                const currentOrder = await this.prisma.order.findUnique({
                    where: { id: order.id },
                    select: { status: true }
                });

                if (!currentOrder || currentOrder.status !== OrderStatus.DELIVERED) {
                    this.logger.debug(`Skipping order ${order.orderNumber} as it is no longer in DELIVERED status.`);
                    continue;
                }

                const hoursLabel = returnHours;
                this.logger.log(`Auto-completing delivered order ${order.orderNumber} (ID: ${order.id}) after ${hoursLabel}h return window`);

                await this.ordersService.transitionStatus(
                    order.id,
                    OrderStatus.COMPLETED,
                    { type: ActorType.SYSTEM, id: 'system-scheduler', name: 'System Scheduler' },
                    `System: Auto-completed after ${hoursLabel}-hour return/dispute window expired`
                );

                // Notify Customer
                await this.notificationsService
                    .notifyWithDedup(
                        order.customerId,
                        `wa:ORDER_STATUS:${order.id}:COMPLETED:grace_window_expired`,
                        180,
                        {
                            recipientId: order.customerId,
                            recipientRole: 'CUSTOMER',
                            titleAr: 'انتهاء فترة الاسترجاع للطلب',
                            titleEn: 'Return period expired for order',
                            messageAr: `تم اكتمال الطلب رقم #${order.orderNumber} بنجاح نظراً لمرور مهلة الإرجاع أو النزاع (${hoursLabel} ساعة).`,
                            messageEn: `Order #${order.orderNumber} has been completed because the ${hoursLabel}-hour return/dispute window has expired.`,
                            type: 'system_alert',
                            link: `/dashboard/orders`,
                            metadata: {
                                orderId: order.id,
                                waEvent: 'ORDER_STATUS',
                                graceWindowExpired: true,
                            },
                        },
                    )
                    .catch(() => undefined);

                // Notify Vendor (if applicable)
                if (order.storeId) {
                    await this.notificationsService.notifyMerchantByStoreId(order.storeId, {
                        titleAr: 'انتهاء مهلة الاسترجاع',
                        titleEn: 'Return window expired',
                        messageAr: `تم اكتمال الطلب #${order.orderNumber} وانتهت فترة الاسترجاع المسموحة له.`,
                        messageEn: `Order #${order.orderNumber} is now completed and the return period has expired.`,
                        type: 'system_alert',
                        link: `/merchant/orders`
                    });
                }
            } catch (err) {
                this.logger.error(`Failed to auto-complete delivered order ${order.id}:`, err);
            }
        }
    }

    // Safety-net for assembly cart (primary path runs every minute)
    @Cron(CronExpression.EVERY_HOUR)
    async handleAssemblyCartCron() {
        this.logger.debug('Running Assembly Cart Auto-Ship & Notifications Job (hourly safety net)...');
        const { ran } = await this.cronLock.runWithLock('order-cleanup-assembly-hourly', async () => {
            await this.handleAssemblyCartExpiry();
        });
        if (!ran) this.logger.debug('Assembly cart cron skipped (locked).');
    }

    private async handleAssemblyCartExpiry() {
        this.logger.debug('Checking assembly-cart / long prep timeouts...');
        const now = new Date();
        const assemblyDays = await this.orderDurationConfig.getAssemblyCartDays();
        const assemblyHoursLimit = assemblyDays * 24;
        const reminderDay = Math.max(assemblyDays - 1, 1);
        const orders = await this.prisma.order.findMany({
            where: {
                status: {
                    in: [
                        OrderStatus.PREPARATION,
                        OrderStatus.PARTIALLY_SHIPPED,
                        OrderStatus.VERIFICATION_SUCCESS,
                        OrderStatus.READY_FOR_SHIPPING,
                    ],
                },
            },
            include: {
                payments: true,
                parts: { select: { id: true } },
                offers: {
                    where: { status: 'accepted' },
                    include: {
                        payments: {
                            where: { status: 'SUCCESS' },
                            orderBy: { paidAt: 'asc' },
                            take: 1,
                            select: { paidAt: true, createdAt: true },
                        },
                    },
                },
            },
        });

        for (const order of orders) {
            try {
                const isMulti =
                    String(order.requestType || '').toLowerCase() === 'multiple' ||
                    (order.parts?.length ?? 0) > 1;

                if (isMulti) {
                    const agedReadyIds = order.offers
                        .filter((o) => {
                            if (o.shippedFromCart) return false;
                            if (o.fulfillmentStatus === OfferFulfillmentStatus.CANCELLED) {
                                return false;
                            }
                            if (o.fulfillmentStatus !== OfferFulfillmentStatus.READY_FOR_SHIPPING) {
                                return false;
                            }
                            const pay = o.payments?.[0];
                            const paidAt = pay?.paidAt || pay?.createdAt;
                            if (!paidAt) return false;
                            const diffHours =
                                (now.getTime() - new Date(paidAt).getTime()) / (1000 * 60 * 60);
                            return diffHours >= assemblyHoursLimit;
                        })
                        .map((o) => o.id);

                    if (agedReadyIds.length > 0) {
                        this.logger.log(
                            `Auto-shipping ${agedReadyIds.length} aged READY offer(s) for order ${order.orderNumber}`,
                        );
                        await this.ordersService.requestShipping(
                            order.customerId,
                            [],
                            agedReadyIds,
                            true,
                        );
                        await this.notificationsService.create({
                            recipientId: order.customerId,
                            recipientRole: 'CUSTOMER',
                            titleAr: 'شحن تلقائي لسلة التجميع 📦',
                            titleEn: 'Auto-Ship: Assembly Cart 📦',
                            messageAr: `لقد مضى ${assemblyDays} أيام على قطع جاهزة في طلبك رقم #${order.orderNumber}. تم إصدار البوليصة وشحن القطع الجاهزة تلقائياً.`,
                            messageEn: `${assemblyDays} days have passed for ready parts on order #${order.orderNumber}. Waybills were issued and those parts were auto-shipped.`,
                            type: 'system_alert',
                            link: `/dashboard/orders`,
                        });
                    }
                    continue;
                }

                if (order.status !== OrderStatus.PREPARATION) continue;

                // Single-item: earliest payment clock → cancel after assembly days
                const firstPayment = order.payments.sort(
                    (a, b) => (a.paidAt?.getTime() || 0) - (b.paidAt?.getTime() || 0),
                )[0];
                const paidAt = firstPayment?.paidAt || order.updatedAt;
                const diffHours = (now.getTime() - paidAt.getTime()) / (1000 * 60 * 60);

                if (diffHours >= assemblyHoursLimit) {
                    this.logger.error(
                        `Auto-cancelling single order ${order.orderNumber} due to merchant inaction (${assemblyDays} days)`,
                    );
                    await this.ordersService.transitionStatus(
                        order.id,
                        OrderStatus.CANCELLED,
                        { type: ActorType.SYSTEM, id: 'system-scheduler', name: 'System Scheduler' },
                        `System: Auto-cancelled after ${assemblyDays} days without preparation`,
                    );

                    await this.notificationsService.create({
                        recipientId: order.customerId,
                        recipientRole: 'CUSTOMER',
                        titleAr: 'تم إلغاء طلبك لعدم استجابة التاجر',
                        titleEn: 'Order Cancelled: Merchant Inaction',
                        messageAr: `نعتذر منك، تم إلغاء الطلب #${order.orderNumber} تلقائياً لعدم قيام التاجر بتجهيزه خلال مهلة ${assemblyDays} أيام. سيتم البدء بإجراءات استرداد المبلغ.`,
                        messageEn: `We apologize. Order #${order.orderNumber} was auto-cancelled as the merchant failed to prepare it within ${assemblyDays} days. Refund process initiated.`,
                        type: 'system_alert',
                        link: `/dashboard/orders`,
                    });

                    for (const offer of order.offers) {
                        if (offer.storeId) {
                            const store = await this.prisma.store.findUnique({
                                where: { id: offer.storeId },
                                select: { id: true, ownerId: true },
                            });
                            if (store) {
                                await this.violationsService.autoIssue({
                                    code: 'LATE_PREPARATION_AUTO_CANCEL',
                                    targetUserId: store.ownerId,
                                    targetStoreId: store.id,
                                    targetType: ViolationTargetType.MERCHANT,
                                    orderId: order.id,
                                    reason: `Order #${order.orderNumber} auto-cancelled after ${assemblyDays} days without preparation.`,
                                    metadata: { orderNumber: order.orderNumber },
                                    dedupSuffix: store.id,
                                });
                            }
                        }
                    }
                } else if (diffHours >= 48 && diffHours < 49) {
                    this.logger.warn(`Sending 48h urgent warning for order ${order.orderNumber}`);
                    for (const offer of order.offers) {
                        if (offer.storeId) {
                            await this.notificationsService.notifyMerchantByStoreId(offer.storeId, {
                                titleAr: '⚠️ إشعار عاجل: تبقت أيام على الإلغاء',
                                titleEn: '⚠️ Urgent: Days Until Cancellation',
                                messageAr: `مرت 48 ساعة على دفع الطلب #${order.orderNumber}. يرجى البدء بالتجهيز والتوثيق فوراً لتجنب الإلغاء التلقائي والمخالفات.`,
                                messageEn: `48 hours have passed since payment for Order #${order.orderNumber}. Please start preparation and verification immediately to avoid auto-cancellation and penalties.`,
                                type: 'system_alert',
                                link: `/merchant/orders/${order.id}`,
                            });
                        }
                    }
                } else if (diffHours >= reminderDay * 24 && diffHours < reminderDay * 24 + 1) {
                    await this.notificationsService.create({
                        recipientId: order.customerId,
                        recipientRole: 'CUSTOMER',
                        titleAr: 'تذكير: اقتراب الشحن التلقائي',
                        titleEn: 'Reminder: Auto-Ship Approaching',
                        messageAr: `عناصرك المحتجزة للطلب #${order.orderNumber} أوشكت على إنهاء مدة الحفظ (${assemblyDays} أيام). يرجى تأكيد استلام الشحنة إذا لم تكن ستنتظر قطعاً أخرى.`,
                        messageEn: `Your reserved items for order #${order.orderNumber} are nearing the ${assemblyDays}-day limit. Please request shipping soon.`,
                        type: 'system_alert',
                        link: `/dashboard/shipping-cart`,
                    });
                }
            } catch (err: any) {
                this.logger.error(
                    `Assembly cart expiry failed for order ${order.id}: ${err?.message || err}`,
                );
            }
        }
    }

    private async expireActiveWarranties() {
        const now = new Date();
        const expiredOrders = await this.prisma.order.findMany({
            where: {
                status: OrderStatus.WARRANTY_ACTIVE,
                warranty_end_at: { lt: now },
            },
            select: {
                id: true,
                orderNumber: true,
                customerId: true,
                storeId: true,
                store: { select: { ownerId: true } },
            },
        });

        for (const order of expiredOrders) {
            try {
                await this.ordersService.enforceExpiredSla(order.id, {
                    type: ActorType.SYSTEM,
                    id: 'system-scheduler',
                    name: 'System Scheduler',
                });
            } catch (err) {
                this.logger.error(`Failed warranty enforce for ${order.id}:`, err);
            }
        }
    }

    private async handleCollectingOffersReveal() {
        const readyToReveal = await this.prisma.order.findMany({
            where: {
                status: OrderStatus.COLLECTING_OFFERS,
            },
            include: {
                parts: { select: { id: true, name: true } },
                offers: {
                    where: { status: { not: 'rejected' } },
                    select: { id: true, orderPartId: true },
                },
            },
        });

        const durationCfg = await this.orderDurationConfig.getConfig();

        for (const order of readyToReveal) {
            if (!this.orderSla.isSlaExpired(order, durationCfg) && order.revealOffersAt && order.revealOffersAt > new Date()) {
                continue;
            }
            try {
                const hasOffers = order.offers.length > 0;

                // Zero offers after collection window → cancel immediately (do not open selection SLA)
                if (!hasOffers) {
                    this.logger.log(
                        `No offers for order ${order.orderNumber} (ID: ${order.id}). Cancelling after collection window.`,
                    );
                    await this.ordersService.transitionStatus(
                        order.id,
                        OrderStatus.CANCELLED,
                        { type: ActorType.SYSTEM, id: 'system-scheduler', name: 'System Scheduler' },
                        'System: No offers received after collection window.',
                    );
                    await this.notificationsService.notifyWithDedup(
                        order.customerId,
                        `wa:ORDER_STATUS:${order.id}:CANCELLED:collection_ended_no_offers`,
                        120,
                        {
                            recipientId: order.customerId,
                            recipientRole: 'CUSTOMER',
                            titleAr: 'انتهت مهلة جمع العروض',
                            titleEn: 'Collection Period Ended',
                            messageAr: `نعتذر منك، لم يتم استلام أي عروض للطلب رقم #${order.orderNumber} خلال الـ 24 ساعة الماضية. تم إغلاق الطلب تلقائياً.`,
                            messageEn: `We apologize, no offers were received for order #${order.orderNumber} during the last 24 hours. The order has been closed automatically.`,
                            type: 'system_alert',
                            link: `/dashboard/orders/${order.id}`,
                            metadata: {
                                orderId: order.id,
                                orderNumber: order.orderNumber,
                                waEvent: 'ORDER_STATUS',
                                status: 'CANCELLED',
                            },
                        },
                    );
                    continue;
                }

                this.logger.log(
                    `Revealing offers for order ${order.orderNumber} (ID: ${order.id}). Transitioning to AWAITING_SELECTION.`,
                );

                await this.ordersService.transitionStatus(
                    order.id,
                    OrderStatus.AWAITING_SELECTION,
                    { type: ActorType.SYSTEM, id: 'system-scheduler', name: 'System Scheduler' },
                    'System: Reveal time reached. Transitioning to Selection phase.',
                );

                // Customer + bidding merchants already notified via transitionStatus (AWAITING_SELECTION / OFFER_REVEAL)

                // Multi-part: some parts received no offers — customer can reorder those parts from order details
                if (order.requestType === 'multiple' && order.parts.length > 1) {
                    const partIdsWithOffers = new Set(
                        order.offers
                            .map((o) => o.orderPartId)
                            .filter((id): id is string => !!id),
                    );
                    const partsWithoutOffers = order.parts.filter(
                        (p) => !partIdsWithOffers.has(p.id),
                    );

                    if (
                        partsWithoutOffers.length > 0 &&
                        partsWithoutOffers.length < order.parts.length
                    ) {
                        const missingCount = partsWithoutOffers.length;
                        const totalCount = order.parts.length;
                        await this.notificationsService.create({
                            recipientId: order.customerId,
                            recipientRole: 'CUSTOMER',
                            titleAr: 'قطع بدون عروض في طلبك',
                            titleEn: 'Parts Without Offers',
                            messageAr: `لم تصل عروض لـ ${missingCount} من ${totalCount} قطع في الطلب #${order.orderNumber}. يمكنك إعادة طلب هذه القطع من صفحة تفاصيل الطلب بينما يستمر الطلب للقطع الأخرى.`,
                            messageEn: `No offers were received for ${missingCount} of ${totalCount} parts in order #${order.orderNumber}. You can reorder those parts from the order details page while the rest of your order continues.`,
                            type: 'system_alert',
                            link: `/dashboard/orders/${order.id}`,
                            metadata: {
                                orderId: order.id,
                                orderNumber: order.orderNumber,
                            },
                        });
                    }
                }
            } catch (error) {
                this.logger.error(`Failed to reveal offers for order ${order.id}: ${error.message}`);
            }
        }
    }

    private async expireAwaitingSelection() {
        const now = new Date();
        const expiredOrders = await this.prisma.order.findMany({
            where: {
                status: OrderStatus.AWAITING_SELECTION,
                OR: [
                    { selectionDeadlineAt: { lte: now } },
                    { selectionDeadlineAt: null },
                ],
            },
            include: {
                offers: {
                    where: { status: { not: 'rejected' } },
                    select: { id: true },
                },
            },
        });

        const durationCfg = await this.orderDurationConfig.getConfig();

        for (const order of expiredOrders) {
            const hasOffers = order.offers.length > 0;
            // Heal stuck selection orders that have zero offers (should have been cancelled at reveal)
            if (hasOffers && !this.orderSla.isSlaExpired(order, durationCfg)) continue;

            try {
                if (!hasOffers) {
                    this.logger.log(
                        `Healing zero-offer selection order ${order.orderNumber} (ID: ${order.id}) → CANCELLED`,
                    );
                    await this.ordersService.transitionStatus(
                        order.id,
                        OrderStatus.CANCELLED,
                        { type: ActorType.SYSTEM, id: 'system-scheduler', name: 'System Scheduler' },
                        'System: No offers received after collection window.',
                    );
                    await this.notificationsService.notifyWithDedup(
                        order.customerId,
                        `wa:ORDER_STATUS:${order.id}:CANCELLED:selection_ended_no_offers`,
                        120,
                        {
                            recipientId: order.customerId,
                            recipientRole: 'CUSTOMER',
                            titleAr: 'انتهت مهلة جمع العروض',
                            titleEn: 'Collection Period Ended',
                            messageAr: `نعتذر منك، لم يتم استلام أي عروض للطلب رقم #${order.orderNumber} خلال الـ 24 ساعة الماضية. تم إغلاق الطلب تلقائياً.`,
                            messageEn: `We apologize, no offers were received for order #${order.orderNumber} during the last 24 hours. The order has been closed automatically.`,
                            type: 'system_alert',
                            link: `/dashboard/orders/${order.id}`,
                            metadata: {
                                orderId: order.id,
                                orderNumber: order.orderNumber,
                                waEvent: 'ORDER_STATUS',
                                status: 'CANCELLED',
                            },
                        },
                    );
                    continue;
                }

                this.logger.log(
                    `Expiring order selection period ${order.orderNumber} (ID: ${order.id}) [hasOffers: ${hasOffers}]`,
                );

                await this.ordersService.transitionStatus(
                    order.id,
                    OrderStatus.CANCELLED,
                    { type: ActorType.SYSTEM, id: 'system-scheduler', name: 'System Scheduler' },
                    `System: Selection period expired (${durationCfg.offerSelectionHours}h). Customer failed to choose an offer.`,
                );

                await this.notificationsService.notifyWithDedup(
                    order.customerId,
                    `wa:ORDER_STATUS:${order.id}:CANCELLED:selection_ended`,
                    120,
                    {
                        recipientId: order.customerId,
                        recipientRole: 'CUSTOMER',
                        titleAr: 'انتهت مهلة اختيار العرض',
                        titleEn: 'Selection Period Expired',
                        messageAr: `انتهت المهلة المتاحة لاختيار عرض للطلب رقم (#${order.orderNumber}). تم إغلاق الطلب تلقائياً.`,
                        messageEn: `The deadline to select an offer for order (#${order.orderNumber}) has expired. The order has been closed automatically.`,
                        type: 'system_alert',
                        metadata: {
                            orderId: order.id,
                            orderNumber: order.orderNumber,
                            waEvent: 'ORDER_STATUS',
                            status: 'CANCELLED',
                        },
                    },
                );
            } catch (error) {
                this.logger.error(`Failed to expire order selection ${order.id}: ${error.message}`);
            }
        }
    }

    async expireAwaitingPayment() {
        const now = new Date();
        const expiredOrders = await this.prisma.order.findMany({
            where: {
                status: { in: [OrderStatus.AWAITING_PAYMENT, OrderStatus.PARTIALLY_PAID] },
                OR: [
                    { paymentDeadlineAt: { lte: now } },
                    { paymentDeadlineAt: null },
                ],
            },
            select: {
                id: true,
                orderNumber: true,
                customerId: true,
                status: true,
                createdAt: true,
                updatedAt: true,
                paymentDeadlineAt: true,
                offers: {
                    where: { status: 'accepted' },
                    select: { storeId: true },
                },
            },
        });

        const durationCfg = await this.orderDurationConfig.getConfig();

        for (const order of expiredOrders) {
            if (!this.orderSla.isSlaExpired(order, durationCfg)) continue;
            try {
                this.logger.log(`Expiring unpaid order ${order.orderNumber} (ID: ${order.id})`);
                await this.ordersService.transitionStatus(
                    order.id,
                    OrderStatus.CANCELLED,
                    { type: ActorType.SYSTEM, id: 'system-scheduler', name: 'System Scheduler' },
                    'System: Payment period expired after 24 hours',
                );

                // 2026 Auto-Violation: Customer accepted offer but failed to pay
                await this.violationsService.autoIssue({
                    code: 'ACCEPT_OFFER_NO_PAYMENT',
                    targetUserId: order.customerId,
                    targetType: ViolationTargetType.CUSTOMER,
                    orderId: order.id,
                    reason: `Customer accepted offer for order #${order.orderNumber} but did not pay within 24h.`,
                    metadata: { orderNumber: order.orderNumber },
                });

                // Notify Customer
                await this.notificationsService.notifyWithDedup(
                    order.customerId,
                    `wa:ORDER_STATUS:${order.id}:CANCELLED:payment_ended`,
                    120,
                    {
                        recipientId: order.customerId,
                        recipientRole: 'CUSTOMER',
                        titleAr: 'انتهاء مهلة الدفع للطلب',
                        titleEn: 'Payment Period Expired',
                        messageAr: `تم إلغاء طلبك (#${order.orderNumber}) لعدم إتمام خطوة السداد خلال الـ 24 ساعة المحددة.`,
                        messageEn: `Your order (#${order.orderNumber}) was cancelled as payment was not completed within the 24h limit.`,
                        type: 'system_alert',
                        link: `/dashboard/orders/${order.id}`,
                        metadata: {
                            orderId: order.id,
                            orderNumber: order.orderNumber,
                            status: 'CANCELLED',
                            waEvent: 'ORDER_STATUS',
                        },
                    },
                );

                // Notify Merchants (transitionStatus already WA-notifies accepted merchant;
                // keep in-app + WA with explicit waEvent for stores that only appear on offers)
                for (const offer of order.offers) {
                    if (offer.storeId) {
                        await this.notificationsService.notifyMerchantByStoreId(offer.storeId, {
                            titleAr: 'إلغاء الطلب المعتمد: لم يكتمل الدفع',
                            titleEn: 'Order Cancelled: Unpaid',
                            messageAr: `تم إلغاء الطلب (#${order.orderNumber}) من قبل النظام لتجاوز العميل مهلة السداد (24 ساعة).`,
                            messageEn: `Order (#${order.orderNumber}) was cancelled by the system as the customer missed the 24h payment deadline.`,
                            type: 'ORDER',
                            link: `/merchant/orders/${order.id}`,
                            metadata: {
                                orderId: order.id,
                                orderNumber: order.orderNumber,
                                status: 'CANCELLED',
                                waEvent: 'ORDER_STATUS',
                            },
                        });
                    }
                }
            } catch (error) {
                this.logger.error(`Failed to expire order ${order.id}: ${error.message}`);
            }
        }
    }

    async handlePreparationDelays() {
        const orders = await this.prisma.order.findMany({
            where: { status: OrderStatus.PREPARATION },
            select: { id: true, orderNumber: true },
        });

        for (const order of orders) {
            try {
                await this.ordersService.enforceExpiredSla(order.id, {
                    type: ActorType.SYSTEM,
                    id: 'system-scheduler',
                    name: 'System SLA',
                });
            } catch (err: any) {
                this.logger.error(
                    `Failed executing handlePreparationDelays on ${order.id}: ${err?.message || err}`,
                );
            }
        }
    }

    async handleCriticalPreparationFailures() {
        const criticalOrders = await this.prisma.order.findMany({
            where: { status: OrderStatus.DELAYED_PREPARATION },
            select: { id: true, orderNumber: true },
        });

        for (const order of criticalOrders) {
            try {
                await this.ordersService.enforceExpiredSla(order.id, {
                    type: ActorType.SYSTEM,
                    id: 'system-scheduler',
                    name: 'System SLA',
                });
            } catch (err: any) {
                this.logger.error(
                    `Failed executing handleCriticalPreparationFailures on ${order.id}: ${err?.message || err}`,
                );
            }
        }
    }

    private async handleNonMatchingToCorrection() {
        const orders = await this.prisma.order.findMany({
            where: { status: OrderStatus.NON_MATCHING },
            select: { id: true, orderNumber: true },
        });

        for (const order of orders) {
            try {
                await this.ordersService.enforceExpiredSla(order.id, {
                    type: ActorType.SYSTEM,
                    id: 'system-scheduler',
                    name: 'System Scheduler',
                });
            } catch (err) {
                this.logger.error(`Failed to start correction period for ${order.id}:`, err);
            }
        }
    }

    private async handleCorrectionPeriodExpiry() {
        const expiredOrders = await this.prisma.order.findMany({
            where: { status: OrderStatus.CORRECTION_PERIOD },
            select: { id: true, orderNumber: true },
        });

        for (const order of expiredOrders) {
            try {
                await this.ordersService.enforceExpiredSla(order.id, {
                    type: ActorType.SYSTEM,
                    id: 'system-scheduler',
                    name: 'System Scheduler',
                });
            } catch (err) {
                this.logger.error(`Failed processing correction timeout for ${order.id}:`, err);
            }
        }
    }

    /**
     * Multi-item: cancel offers whose verification-doc correction deadline expired
     * even when the parent order is not in CORRECTION_PERIOD (siblings still progressing).
     */
    private async handleExpiredOfferCorrectionDocs() {
        const now = new Date();
        const expiredDocs = await this.prisma.verificationDocument.findMany({
            where: {
                adminStatus: 'REJECTED',
                correctionDeadlineAt: { lt: now },
                offerId: { not: null },
                order: {
                    requestType: 'multiple',
                    status: {
                        notIn: [
                            OrderStatus.CANCELLED,
                            OrderStatus.CLOSED,
                            OrderStatus.REFUNDED,
                            OrderStatus.CORRECTION_PERIOD,
                        ],
                    },
                },
            },
            select: { id: true, orderId: true, offerId: true },
            take: 50,
        });

        const byOrder = new Map<string, string[]>();
        for (const doc of expiredDocs) {
            if (!doc.offerId) continue;
            const list = byOrder.get(doc.orderId) || [];
            if (!list.includes(doc.offerId)) list.push(doc.offerId);
            byOrder.set(doc.orderId, list);
        }

        for (const [orderId, offerIds] of byOrder) {
            try {
                await this.ordersService.cancelOffersForExpiredCorrection(orderId, offerIds);
            } catch (err) {
                this.logger.error(
                    `Failed offer-doc correction expiry for ${orderId}:`,
                    err,
                );
            }
        }
    }
}
