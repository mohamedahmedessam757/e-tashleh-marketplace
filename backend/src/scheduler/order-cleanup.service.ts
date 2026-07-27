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
        });
        if (!ran) this.logger.debug('Order cleanup skipped (locked by another instance).');
    }

    // Run every hour to auto-complete offers after return window (multi-item) and single-item orders
    @Cron(CronExpression.EVERY_HOUR)
    async handleDeliveredReturnsAutoCompletion() {
        this.logger.debug('Running Delivered Orders Auto-Completion Job...');
        await this.handleOfferAutoCompletion();
        await this.handleSingleItemOrderAutoCompletion();
    }

    /** Remind customers 2 hours before per-offer return window expires */
    @Cron(CronExpression.EVERY_30_MINUTES)
    async handleOfferReturnWindowReminder() {
        if (!(await this.prisma.ensureConnected())) return;

        const windowMs = await this.orderDurationConfig.getReturnDisputeMs();
        const returnHours = await this.orderDurationConfig.getReturnWindowHours();
        const reminderLeadMs = 2 * 60 * 60 * 1000;
        const now = Date.now();
        const reminderStart = new Date(now + reminderLeadMs - 15 * 60 * 1000);
        const reminderEnd = new Date(now + reminderLeadMs + 15 * 60 * 1000);

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
            if (windowEndsAt < reminderStart || windowEndsAt > reminderEnd) continue;

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

            const partName = offer.orderPart?.name || 'Part';
            await this.notificationsService.create({
                recipientId: offer.order.customerId,
                recipientRole: 'CUSTOMER',
                titleAr: 'تذكير: مهلة الإرجاع/النزاع تنتهي قريباً',
                titleEn: 'Reminder: return/dispute window ending soon',
                messageAr: `تبقى ساعتان على انتهاء مهلة الإرجاع/النزاع للقطعة «${partName}» في الطلب #${offer.order.orderNumber}.`,
                messageEn: `2 hours left to request a return or dispute for "${partName}" in order #${offer.order.orderNumber}.`,
                type: 'system_alert',
                link: `/dashboard/orders/${offer.orderId}?${dedupeKey}=1`,
            });
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

                await this.notificationsService.create({
                    recipientId: offer.order.customerId,
                    recipientRole: 'CUSTOMER',
                    titleAr: 'انتهت مهلة الإرجاع للقطعة',
                    titleEn: 'Item return window expired',
                    messageAr: `انتهت مهلة الإرجاع/النزاع (${returnHours} ساعة) للقطعة «${partName}» في الطلب #${offer.order.orderNumber}.`,
                    messageEn: `The ${returnHours}-hour return/dispute window for "${partName}" in order #${offer.order.orderNumber} has expired.`,
                    type: 'system_alert',
                    link: `/dashboard/orders/${offer.orderId}`,
                });
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
                await this.notificationsService.create({
                    recipientId: order.customerId,
                    recipientRole: 'CUSTOMER',
                    titleAr: 'انتهاء فترة الاسترجاع للطلب',
                    titleEn: 'Return period expired for order',
                    messageAr: `تم اكتمال الطلب رقم #${order.orderNumber} بنجاح نظراً لمرور مهلة الإرجاع أو النزاع (${hoursLabel} ساعة).`,
                    messageEn: `Order #${order.orderNumber} has been completed because the ${hoursLabel}-hour return/dispute window has expired.`,
                    type: 'system_alert',
                    link: `/dashboard/orders`
                });

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

    // Run every hour to check PREPARATION (assembly cart) items for 7-day limits and reminders
    @Cron(CronExpression.EVERY_HOUR)
    async handleAssemblyCartCron() {
        this.logger.debug('Running Assembly Cart Auto-Ship & Notifications Job...');
        const now = new Date();
        const assemblyDays = await this.orderDurationConfig.getAssemblyCartDays();
        const assemblyHoursLimit = assemblyDays * 24;
        const reminderDay = Math.max(assemblyDays - 1, 1);
        const orders = await this.prisma.order.findMany({
            where: { status: OrderStatus.PREPARATION },
            include: { 
                payments: true,
                offers: {
                    where: { status: 'accepted' }
                }
            }
        });

        for (const order of orders) {
            try {
                // Determine when the earliest element was paid
                const firstPayment = order.payments.sort((a, b) =>
                    (a.paidAt?.getTime() || 0) - (b.paidAt?.getTime() || 0)
                )[0];
                const paidAt = firstPayment?.paidAt || order.updatedAt;
                const diffHours = (now.getTime() - paidAt.getTime()) / (1000 * 60 * 60);

                // 1. Check 7 Days passed -> AUTO-SHIP (Consolidation) or AUTO-CANCEL (Single Merchant Inaction)
                if (diffHours >= assemblyHoursLimit) {
                    if (order.requestType === 'multiple') {
                        this.logger.log(`Auto-shipping assembly cart for order ${order.orderNumber} due to ${assemblyDays}-day timeout`);
                        
                        const pendingOfferIds = order.offers
                            .filter(o => !o.shippedFromCart)
                            .map(o => o.id);

                        if (pendingOfferIds.length > 0) {
                            // Force shipment of remaining items
                            await this.ordersService.requestShipping(order.customerId, [], pendingOfferIds);
                            
                            // Notify Customer
                            await this.notificationsService.create({
                                recipientId: order.customerId, recipientRole: 'CUSTOMER',
                                titleAr: 'شحن تلقائي لسلة التجميع 📦', titleEn: 'Auto-Ship: Assembly Cart 📦',
                                messageAr: `لقد مضى ${assemblyDays} أيام على تجميع طلبك رقم #${order.orderNumber}. تم شحن القطع المتاحة حالياً إليك تلقائياً لضمان وصولها في الوقت المحدد.`,
                                messageEn: `${assemblyDays} days have passed for your assembly cart #${order.orderNumber}. Available items have been auto-shipped to ensure timely delivery.`,
                                type: 'system_alert', link: `/dashboard/orders`
                            });
                        }
                    } else {
                        // Single order auto-cancel (standard behavior)
                        this.logger.error(`Auto-cancelling single order ${order.orderNumber} due to merchant inaction (${assemblyDays} days)`);
                        await this.ordersService.transitionStatus(
                            order.id, OrderStatus.CANCELLED,
                            { type: ActorType.SYSTEM, id: 'system-scheduler', name: 'System Scheduler' },
                            `System: Auto-cancelled after ${assemblyDays} days without preparation`
                        );

                        await this.notificationsService.create({
                            recipientId: order.customerId, recipientRole: 'CUSTOMER',
                            titleAr: 'تم إلغاء طلبك لعدم استجابة التاجر', titleEn: 'Order Cancelled: Merchant Inaction',
                            messageAr: `نعتذر منك، تم إلغاء الطلب #${order.orderNumber} تلقائياً لعدم قيام التاجر بتجهيزه خلال مهلة ${assemblyDays} أيام. سيتم البدء بإجراءات استرداد المبلغ.`,
                            messageEn: `We apologize. Order #${order.orderNumber} was auto-cancelled as the merchant failed to prepare it within ${assemblyDays} days. Refund process initiated.`,
                            type: 'system_alert', link: `/dashboard/orders`
                        });

                        for (const offer of order.offers) {
                            if (offer.storeId) {
                                // 2026 Auto-Violation: 7-day no-prep auto-cancel
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
                    }
                }
                // 2. Check 48 Hours passed -> URGENT MERCHANT WARNING
                else if (diffHours >= 48 && diffHours < 49) {
                    this.logger.warn(`Sending 48h urgent warning for order ${order.orderNumber}`);
                    for (const offer of order.offers) {
                        if (offer.storeId) {
                            await this.notificationsService.notifyMerchantByStoreId(offer.storeId, {
                                titleAr: '⚠️ إشعار عاجل: تبقت 5 أيام على الإلغاء', titleEn: '⚠️ Urgent: 5 Days Until Cancellation',
                                messageAr: `مرت 48 ساعة على دفع الطلب #${order.orderNumber}. يرجى البدء بالتجهيز والتوثيق فوراً لتجنب الإلغاء التلقائي والمخالفات.`,
                                messageEn: `48 hours have passed since payment for Order #${order.orderNumber}. Please start preparation and verification immediately to avoid auto-cancellation and penalties.`,
                                type: 'system_alert', link: `/merchant/orders/${order.id}`
                            });
                        }
                    }
                }
                // 3. 6 Day reminder for customer
                else if (diffHours >= reminderDay * 24 && diffHours < (reminderDay * 24) + 1) {
                    await this.notificationsService.create({
                        recipientId: order.customerId, recipientRole: 'CUSTOMER',
                        titleAr: 'تذكير: اقتراب الشحن التلقائي', titleEn: 'Reminder: Auto-Ship Approaching',
                        messageAr: `عناصرك المحتجزة للطلب #${order.orderNumber} أوشكت على إنهاء مدة الحفظ (${assemblyDays} أيام). يرجى تأكيد استلام الشحنة إذا لم تكن ستنتظر قطعاً أخرى.`,
                        messageEn: `Your reserved items for order #${order.orderNumber} are nearing the ${assemblyDays}-day limit. Please request shipping soon.`,
                        type: 'system_alert', link: `/dashboard/shipping-cart`
                    });
                }
            } catch (err) {
                this.logger.error(`Error processing assembly cart auto-ship for order ${order.id}:`, err);
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
                    await this.notificationsService.create({
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
                    });
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
                                waEvent: 'ORDER_STATUS',
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
        const expiredOrders = await this.prisma.order.findMany({
            where: {
                status: OrderStatus.AWAITING_SELECTION,
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
                    await this.notificationsService.create({
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
                    });
                    continue;
                }

                this.logger.log(
                    `Expiring order selection period ${order.orderNumber} (ID: ${order.id}) [hasOffers: ${hasOffers}]`,
                );

                await this.ordersService.transitionStatus(
                    order.id,
                    OrderStatus.CANCELLED,
                    { type: ActorType.SYSTEM, id: 'system-scheduler', name: 'System Scheduler' },
                    'System: Selection period expired (48h total elapsed). Customer failed to choose an offer.',
                );

                await this.notificationsService.create({
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
                });
            } catch (error) {
                this.logger.error(`Failed to expire order selection ${order.id}: ${error.message}`);
            }
        }
    }

    async expireAwaitingPayment() {
        const expiredOrders = await this.prisma.order.findMany({
            where: {
                status: OrderStatus.AWAITING_PAYMENT,
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
                await this.notificationsService.create({
                    recipientId: order.customerId,
                    recipientRole: 'CUSTOMER',
                    titleAr: 'انتهاء مهلة الدفع للطلب',
                    titleEn: 'Payment Period Expired',
                    messageAr: `تم إلغاء طلبك (#${order.orderNumber}) لعدم إتمام خطوة السداد خلال الـ 24 ساعة المحددة.`,
                    messageEn: `Your order (#${order.orderNumber}) was cancelled as payment was not completed within the 24h limit.`,
                    type: 'ORDER',
                    link: `/dashboard/orders/${order.id}`,
                    metadata: {
                        orderId: order.id,
                        orderNumber: order.orderNumber,
                        status: 'CANCELLED',
                        waEvent: 'ORDER_STATUS',
                    },
                });

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
        const durationCfg = await this.orderDurationConfig.getConfig();
        const prepMs = this.orderDurationConfig.hoursToMs(durationCfg.preparationHours);
        const graceMs = this.orderDurationConfig.hoursToMs(durationCfg.delayedPreparationGraceHours);

        const orders = await this.prisma.order.findMany({
            where: { status: OrderStatus.PREPARATION },
            include: {
                payments: {
                    where: { status: 'COMPLETED' },
                    orderBy: { createdAt: 'asc' },
                    take: 1
                },
                offers: {
                    where: { status: 'accepted' },
                    select: { storeId: true }
                }
            }
        });

        const now = Date.now();

        for (const order of orders) {
            try {
                let prepStartTime = order.updatedAt.getTime();
                if (order.payments.length > 0) {
                    prepStartTime = order.payments[0].createdAt.getTime();
                }

                const deadline = prepStartTime + prepMs;

                if (now > deadline) {
                    this.logger.warn(`Order ${order.orderNumber} exceeded prep SLA. Shifting to DELAYED_PREPARATION.`);
                    
                    const delayedDeadline = new Date(now + graceMs);

                    await this.ordersService.transitionStatus(
                        order.id,
                        OrderStatus.DELAYED_PREPARATION,
                        { type: ActorType.SYSTEM, id: 'system-scheduler', name: 'System SLA' },
                        'Merchant exceeded 48-hour preparation SLA timeframe'
                    );

                    await this.prisma.order.update({
                        where: { id: order.id },
                        data: {
                            delayedPreparationDeadlineAt: delayedDeadline
                        }
                    });

                    // Notifications to Merchants
                    for (const offer of order.offers) {
                        if (offer.storeId) {
                            await this.notificationsService.notifyMerchantByStoreId(offer.storeId, {
                                titleAr: 'تحذير عاجل: لقد تأخرت في التجهيز',
                                titleEn: 'Urgent: Delayed Preparation SLA',
                                messageAr: `تجاوز الطلب #${order.orderNumber} مهلة 48 ساعة للتجهيز. أمامك 24 ساعة فقط لتسليمه لشركة الشحن لتجنب تسجيل مخالفة للنظام وإلغاء الطلب!`,
                                messageEn: `Order #${order.orderNumber} exceeded the 48h limit. You have exactly 24h to prepare it to avoid SLA violations and cancellation!`,
                                type: 'system_alert',
                                link: `/merchant/orders`
                            });
                        }
                    }

                    // Notification to Admins
                    const admins = await this.prisma.user.findMany({ where: { role: 'ADMIN' } });
                    for (const admin of admins) {
                        await this.notificationsService.create({
                            recipientId: admin.id,
                            recipientRole: 'ADMIN',
                            titleAr: 'تأخير تاجر عن تجهيز طلب',
                            titleEn: 'Store Preparation Delayed',
                            messageAr: `الطلب המعتمد رقم #${order.orderNumber} متأخر في التجهيز لمرور 48 ساعة كاملة. وتم منح التاجر إشعار مهلة حمراء لـ 24 ساعة للإجراء المخالفة التلقائية.`,
                            messageEn: `Order #${order.orderNumber} exceeded the 48h preparation barrier. Merchant was granted a 24h red grace period before auto penalty.`,
                            type: 'system_alert',
                            link: `/admin/orders`
                        });
                    }
                }
            } catch (err) {
                this.logger.error(`Failed executing handlePreparationDelays on ${order.id}: ${err.message}`);
            }
        }
    }

    async handleCriticalPreparationFailures() {
        const criticalOrders = await this.prisma.order.findMany({
            where: {
                status: OrderStatus.DELAYED_PREPARATION,
            },
            include: {
                payments: {
                    select: { createdAt: true, status: true },
                    orderBy: { createdAt: 'asc' },
                    take: 1,
                },
                offers: {
                    where: { status: 'accepted' },
                    select: { storeId: true }
                }
            }
        });

        const durationCfg = await this.orderDurationConfig.getConfig();

        for (const order of criticalOrders) {
            if (!this.orderSla.isSlaExpired(order, durationCfg)) continue;
            try {
                this.logger.error(`Order ${order.orderNumber} exceeded 24h grace period. Issuing violation and cancellation.`);

                await this.ordersService.transitionStatus(
                    order.id,
                    OrderStatus.CANCELLED,
                    { type: ActorType.SYSTEM, id: 'system-scheduler', name: 'System SLA' },
                    'System: Exceeded 24h extra grace period for preparation. Order abandoned by merchant.',
                );

                for (const offer of order.offers) {
                    if (offer.storeId) {
                        // 2026 Auto-Violation: 48h+24h SLA breach
                        const store = await this.prisma.store.findUnique({
                            where: { id: offer.storeId },
                            select: { id: true, ownerId: true },
                        });
                        if (store) {
                            await this.violationsService.autoIssue({
                                code: 'LATE_SHIPPING',
                                targetUserId: store.ownerId,
                                targetStoreId: store.id,
                                targetType: ViolationTargetType.MERCHANT,
                                orderId: order.id,
                                reason: `Merchant exceeded the 48h+24h preparation SLA on order #${order.orderNumber}.`,
                                metadata: { orderNumber: order.orderNumber },
                                dedupSuffix: store.id,
                            });
                        }
                    }
                }

                const admins = await this.prisma.user.findMany({ where: { role: 'ADMIN' } });
                for (const admin of admins) {
                    await this.notificationsService.create({
                        recipientId: admin.id,
                        recipientRole: 'ADMIN',
                        titleAr: 'تطبيق مخالفة على متجر وتوقف طلب',
                        titleEn: 'Violation Applied to Store & Order Stopped',
                        messageAr: `تم إلغاء الطلب #${order.orderNumber} لعدم استجابة التاجر خلال مرحلة "التجهيز المتأخر". يجب التحقق واتخاذ اجراءات الخصم وارجاع المبلغ للعميل.`,
                        messageEn: `Order #${order.orderNumber} auto-cancelled. Store failed entirely. Process refund routing and apply penalty.`,
                        type: 'system_alert',
                        link: `/admin/orders`
                    });
                }

                await this.notificationsService.create({
                    recipientId: order.customerId,
                    recipientRole: 'CUSTOMER',
                    titleAr: 'نأسف حقاً: إلغاء طلبك لعدم استجابة التاجر',
                    titleEn: 'Apology: Order Cancelled & Merchant Penalized',
                    messageAr: `نعتذر لك بشدة، قامت الإدارة بشكل تلقائي بإلغاء الطلب #${order.orderNumber} لعدم التزام التاجر بوقت التجهيز، سيتم محاسبة المتجر وبدء ارجاع أموالك الى المحفظة خلال أيام العمل.`,
                    messageEn: `We apologize. Order #${order.orderNumber} was cancelled. The merchant failed to prepare the items. A penalty was issued and your refund has been queued.`,
                    type: 'ORDER',
                    link: `/dashboard/orders/${order.id}`,
                    metadata: {
                        orderId: order.id,
                        orderNumber: order.orderNumber,
                        status: 'CANCELLED',
                        waEvent: 'ORDER_STATUS',
                    },
                });
            } catch (err) {
                this.logger.error(`Failed executing handleCriticalPreparationFailures on ${order.id}: ${err.message}`);
            }
        }
    }

    private async handleNonMatchingToCorrection() {
        const durationCfg = await this.orderDurationConfig.getConfig();
        const graceMs = this.orderDurationConfig.minutesToMs(durationCfg.nonMatchingGraceMinutes);
        const cutoff = new Date(Date.now() - graceMs);
        
        const orders = await this.prisma.order.findMany({
            where: {
                status: OrderStatus.NON_MATCHING,
                updatedAt: { lt: cutoff }
            }
        });

        for (const order of orders) {
            try {
                this.logger.log(`Transitioning ${order.orderNumber} from NON_MATCHING to CORRECTION_PERIOD`);
                await this.ordersService.transitionStatus(
                    order.id,
                    OrderStatus.CORRECTION_PERIOD,
                    { type: ActorType.SYSTEM, id: 'system-scheduler', name: 'System Scheduler' },
                    'System: 2 minutes passed since NON_MATCHING, entering CORRECTION_PERIOD.'
                );

                // Notifications were already sent during adminReviewVerification, so we might just add an audit.
            } catch (err) {
                this.logger.error(`Failed to start correction period for ${order.id}:`, err);
            }
        }
    }

    private async handleCorrectionPeriodExpiry() {
        const expiredOrders = await this.prisma.order.findMany({
            where: {
                status: OrderStatus.CORRECTION_PERIOD,
            },
            include: {
                offers: true
            }
        });

        const durationCfg = await this.orderDurationConfig.getConfig();

        for (const order of expiredOrders) {
            if (!this.orderSla.isSlaExpired(order, durationCfg)) continue;
            try {
                this.logger.log(`Cancelling order ${order.orderNumber} due to CORRECTION_PERIOD timeout.`);
                
                await this.ordersService.transitionStatus(
                    order.id,
                    OrderStatus.CANCELLED,
                    { type: ActorType.SYSTEM, id: 'system-scheduler', name: 'System Scheduler' },
                    'System: Merchant failed to provide corrected verification within 48h limit.'
                );

                // Notify Merchant
                if (order.storeId) {
                    // 2026 Auto-Violation: missed 48h correction window
                    const store = await this.prisma.store.findUnique({
                        where: { id: order.storeId },
                        select: { id: true, ownerId: true },
                    });
                    if (store) {
                        await this.violationsService.autoIssue({
                            code: 'LATE_CORRECTION',
                            targetUserId: store.ownerId,
                            targetStoreId: store.id,
                            targetType: ViolationTargetType.MERCHANT,
                            orderId: order.id,
                            reason: `Merchant did not provide corrected verification within 48h on order #${order.orderNumber}.`,
                            metadata: { orderNumber: order.orderNumber },
                        });
                    }
                }
                
                // Notify Customer
                await this.notificationsService.create({
                    recipientId: order.customerId, recipientRole: 'CUSTOMER',
                    titleAr: 'إلغاء الطلب واسترجاع المبلغ', titleEn: 'Order Cancelled & Refunded',
                    messageAr: `تم إلغاء طلبك #${order.orderNumber} لعدم تمكن البائع من تقديم القطعة المطابقة للمواصفات. جاري استرجاع أموالك.`,
                    messageEn: `Order #${order.orderNumber} cancelled as the seller failed to provide a matching part. Refund initiated.`,
                    type: 'ORDER',
                    link: `/dashboard/orders/${order.id}`,
                    metadata: {
                        orderId: order.id,
                        orderNumber: order.orderNumber,
                        status: 'CANCELLED',
                        waEvent: 'ORDER_STATUS',
                    },
                });

                // Admin Notification
                const admins = await this.prisma.user.findMany({ where: { role: 'ADMIN' } });
                for (const admin of admins) {
                    await this.notificationsService.create({
                        recipientId: admin.id, recipientRole: 'ADMIN',
                        titleAr: 'تطبيق مخالفة على متجر وتوقف طلب', titleEn: 'Store Violation & Order Cancelled',
                        messageAr: `تم إلغاء الطلب #${order.orderNumber} لانتهاء مهلة التصحيح (48 ساعة). يرجى معالجة الاسترجاع للعميل وتطبيق المخالفة على المتجر.`,
                        messageEn: `Order #${order.orderNumber} cancelled due to correction timeout. Please process refund and store penalty.`,
                        type: 'system_alert', link: `/admin/orders`
                    });
                }
            } catch (err) {
                this.logger.error(`Failed processing correction timeout for ${order.id}:`, err);
            }
        }
    }
}
