import {
    BadRequestException,
    ForbiddenException,
    Inject,
    Injectable,
    NotFoundException,
    forwardRef,
} from '@nestjs/common';
import {
    ActorType,
    OfferFulfillmentStatus,
    OrderStatus,
    Prisma,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { NotificationsService } from '../notifications/notifications.service';
import { OrderStateMachine } from './fsm/order-state-machine.service';

import { OrderDurationConfigService } from '../common/order-duration-config.service';
import { ChatService } from '../chat/chat.service';
import { aggregateMultiItemDeliveryStatus } from './offer-resolution.helpers';
import {
    calculateWarrantyEndDate,
    resolveCompletionWarranty,
} from './warranty-activation.util';
import { shouldCloseOrderChat } from '../chat/chat-offer-expiry.util';
import { OrderCompletionFinanceService } from '../payments/order-completion-finance.service';

const FULFILLMENT_RANK: Record<OfferFulfillmentStatus, number> = {
    [OfferFulfillmentStatus.AWAITING_PAYMENT]: 0,
    [OfferFulfillmentStatus.IN_PREPARATION]: 10,
    [OfferFulfillmentStatus.PREPARED]: 20,
    [OfferFulfillmentStatus.VERIFICATION]: 30,
    [OfferFulfillmentStatus.VERIFICATION_SUCCESS]: 40,
    [OfferFulfillmentStatus.READY_FOR_SHIPPING]: 50,
    [OfferFulfillmentStatus.SHIPPED]: 60,
    [OfferFulfillmentStatus.DELIVERED]: 70,
    [OfferFulfillmentStatus.COMPLETED]: 80,
    [OfferFulfillmentStatus.CANCELLED]: -1,
};

type OfferWithPayments = Prisma.OfferGetPayload<{
    include: { payments: true; orderPart: true; store: true };
}>;

const MERCHANT_FULFILLMENT_LOCKED_STATUSES = new Set<OrderStatus>([
    OrderStatus.CANCELLED,
    OrderStatus.COMPLETED,
    OrderStatus.REFUNDED,
    OrderStatus.RETURNED,
    OrderStatus.RESOLVED,
    OrderStatus.CLOSED,
    OrderStatus.WARRANTY_ACTIVE,
    OrderStatus.WARRANTY_EXPIRED,
    // Active post-delivery resolution — block rematch / prepare / verify CTAs
    OrderStatus.RETURN_REQUESTED,
    OrderStatus.RETURN_APPROVED,
    OrderStatus.DISPUTED,
]);

@Injectable()
export class OfferFulfillmentService {
    constructor(
        private prisma: PrismaService,
        private fsm: OrderStateMachine,
        private auditLogs: AuditLogsService,
        private notifications: NotificationsService,
        private orderDurationConfig: OrderDurationConfigService,
        @Inject(forwardRef(() => ChatService))
        private chatService: ChatService,
        @Inject(forwardRef(() => OrderCompletionFinanceService))
        private completionFinance: OrderCompletionFinanceService,
    ) {}

    private isAcceptedOffer(status: string) {
        return ['accepted', 'ACCEPTED'].includes(String(status));
    }

    private hasSuccessfulPayment(offer: OfferWithPayments) {
        return offer.payments?.some((p) => p.status === 'SUCCESS') ?? false;
    }

    private partLabel(offer: OfferWithPayments, order: { partName: string }) {
        return offer.orderPart?.name || order.partName || 'Part';
    }

    async getPaidAcceptedOffers(orderId: string): Promise<OfferWithPayments[]> {
        const offers = await this.prisma.offer.findMany({
            where: { orderId, status: { in: ['accepted', 'ACCEPTED'] } },
            include: {
                payments: { where: { status: 'SUCCESS' } },
                orderPart: true,
                store: true,
            },
        });
        return offers.filter((o) => this.hasSuccessfulPayment(o));
    }

    aggregateOrderStatusFromOffers(
        allAccepted: OfferWithPayments[],
        paidOffers: OfferWithPayments[],
    ): OrderStatus {
        if (allAccepted.length === 0) {
            return OrderStatus.COLLECTING_OFFERS;
        }
        if (paidOffers.length === 0) {
            return OrderStatus.AWAITING_PAYMENT;
        }
        if (paidOffers.length < allAccepted.length) {
            return OrderStatus.PARTIALLY_PAID;
        }

        const shippedCount = paidOffers.filter(
            (o) =>
                o.shippedFromCart ||
                o.fulfillmentStatus === OfferFulfillmentStatus.SHIPPED ||
                o.fulfillmentStatus === OfferFulfillmentStatus.DELIVERED ||
                o.fulfillmentStatus === OfferFulfillmentStatus.COMPLETED,
        ).length;

        if (shippedCount > 0 && shippedCount < paidOffers.length) {
            return OrderStatus.PARTIALLY_SHIPPED;
        }
        if (shippedCount === paidOffers.length && shippedCount > 0) {
            return aggregateMultiItemDeliveryStatus(
                paidOffers.map((o) => o.fulfillmentStatus),
            );
        }

        const minRank = Math.min(
            ...paidOffers.map((o) => FULFILLMENT_RANK[o.fulfillmentStatus] ?? 0),
        );

        if (minRank <= FULFILLMENT_RANK.IN_PREPARATION) {
            return OrderStatus.PREPARATION;
        }
        if (minRank <= FULFILLMENT_RANK.PREPARED) {
            return OrderStatus.PREPARED;
        }
        if (minRank <= FULFILLMENT_RANK.VERIFICATION) {
            return OrderStatus.VERIFICATION;
        }
        if (minRank <= FULFILLMENT_RANK.VERIFICATION_SUCCESS) {
            return OrderStatus.VERIFICATION_SUCCESS;
        }
        return OrderStatus.READY_FOR_SHIPPING;
    }

    async recomputeOrderStatus(orderId: string): Promise<OrderStatus> {
        const order = await this.prisma.order.findUnique({
            where: { id: orderId },
            include: {
                offers: {
                    where: { status: { in: ['accepted', 'ACCEPTED'] } },
                    include: {
                        payments: { where: { status: 'SUCCESS' } },
                        orderPart: true,
                        store: true,
                    },
                },
            },
        });
        if (!order) throw new NotFoundException('Order not found');

        // Terminal cancel must never be resurrected by offer aggregation.
        if (order.status === OrderStatus.CANCELLED) {
            return order.status;
        }

        const allAccepted = order.offers as OfferWithPayments[];
        const paidOffers = allAccepted.filter((o) => this.hasSuccessfulPayment(o));
        const nextStatus = this.aggregateOrderStatusFromOffers(
            allAccepted,
            paidOffers,
        );

        // Correction-family is owned by admin review / merchant resubmit — never let
        // min-rank aggregation wipe NON_MATCHING / CORRECTION_* back to PREPARED.
        const correctionFamily = new Set<OrderStatus>([
            OrderStatus.NON_MATCHING,
            OrderStatus.CORRECTION_PERIOD,
            OrderStatus.CORRECTION_SUBMITTED,
        ]);
        const aggregateDowngrade = new Set<OrderStatus>([
            OrderStatus.PREPARATION,
            OrderStatus.DELAYED_PREPARATION,
            OrderStatus.PREPARED,
            OrderStatus.VERIFICATION,
        ]);
        if (
            correctionFamily.has(order.status) &&
            aggregateDowngrade.has(nextStatus)
        ) {
            return order.status;
        }

        if (order.status !== nextStatus) {
            // Multi-part orders follow the slowest offer; backward steps are valid
            // (e.g. VERIFICATION → PREPARED when one part is approved but others are not verified yet).

            const now = new Date();
            const warranty = resolveCompletionWarranty(allAccepted, now, nextStatus);
            const effectiveStatus = warranty.effectiveStatus;

            await this.prisma.order.update({
                where: { id: orderId },
                data: {
                    status: effectiveStatus,
                    updatedAt: now,
                    ...(warranty.activate
                        ? {
                              warranty_active_at: now,
                              warranty_end_at: warranty.endAt,
                          }
                        : {}),
                },
            });

            await this.auditLogs.logAction({
                orderId,
                action: 'AGGREGATE_STATUS',
                entity: 'Order',
                actorType: ActorType.SYSTEM,
                actorId: 'FULFILLMENT_ENGINE',
                actorName: 'Offer Fulfillment',
                previousState: order.status,
                newState: effectiveStatus,
                reason: 'Recomputed from per-offer fulfillment statuses',
            });

            // Aggregate path bypasses OrdersService.transitionStatus — emit ORDER_STATUS WA/in-app here.
            await this.notifyAggregateStatusChange({
                orderId,
                orderNumber: order.orderNumber,
                customerId: order.customerId,
                newStatus: effectiveStatus,
                paidOffers,
            }).catch((err) => {
                console.error(
                    `Failed aggregate status notify for order ${orderId}:`,
                    err instanceof Error ? err.message : err,
                );
            });

            if (shouldCloseOrderChat(effectiveStatus)) {
                this.chatService.lockOrderVendorChatOnCompletion(orderId).catch((err) => {
                    console.error(`Failed to lock chat on completion for order ${orderId}:`, err);
                });
            }

            if (this.completionFinance.isTerminalFinanceStatus(effectiveStatus)) {
                void this.completionFinance.settleCompletedOrder(orderId).catch((err) => {
                    console.error(
                        `Completion finance settlement failed for order ${orderId}:`,
                        err instanceof Error ? err.message : err,
                    );
                });
            }

            return effectiveStatus;
        }

        return nextStatus;
    }

    /** Statuses that should fan out customer/merchant WhatsApp via txn_order_* */
    private static readonly AGGREGATE_NOTIFY_STATUSES = new Set<OrderStatus>([
        OrderStatus.PREPARATION,
        OrderStatus.DELAYED_PREPARATION,
        OrderStatus.PREPARED,
        OrderStatus.VERIFICATION,
        OrderStatus.VERIFICATION_SUCCESS,
        OrderStatus.NON_MATCHING,
        OrderStatus.CORRECTION_PERIOD,
        OrderStatus.READY_FOR_SHIPPING,
        OrderStatus.PARTIALLY_SHIPPED,
        OrderStatus.SHIPPED,
        OrderStatus.PARTIALLY_DELIVERED,
        OrderStatus.DELIVERED,
        OrderStatus.COMPLETED,
        OrderStatus.WARRANTY_ACTIVE,
        OrderStatus.CANCELLED,
    ]);

    private async notifyAggregateStatusChange(params: {
        orderId: string;
        orderNumber: string;
        customerId: string;
        newStatus: OrderStatus;
        paidOffers: OfferWithPayments[];
    }) {
        if (!OfferFulfillmentService.AGGREGATE_NOTIFY_STATUSES.has(params.newStatus)) {
            return;
        }

        const messagesAr: Partial<Record<OrderStatus, string>> = {
            [OrderStatus.PREPARATION]: 'بدأ تجهيز قطع طلبك الآن.',
            [OrderStatus.DELAYED_PREPARATION]: 'يوجد تأخير في التجهيز. نعمل على تسريع طلبك.',
            [OrderStatus.PREPARED]: 'تم تجهيز القطع وهي جاهزة لمرحلة التوثيق/الشحن.',
            [OrderStatus.VERIFICATION]: 'طلبك قيد فحص القطعة والتوثيق.',
            [OrderStatus.VERIFICATION_SUCCESS]: 'تم اعتماد التوثيق بنجاح.',
            [OrderStatus.NON_MATCHING]: 'نتيجة الفحص: غير مطابق. يرجى متابعة التعليمات.',
            [OrderStatus.CORRECTION_PERIOD]: 'أنت في فترة التصحيح. يرجى استكمال المطلوب.',
            [OrderStatus.READY_FOR_SHIPPING]: 'طلبك جاهز للشحن.',
            [OrderStatus.PARTIALLY_SHIPPED]: 'تم شحن جزء من قطع طلبك.',
            [OrderStatus.SHIPPED]: 'طلبك الآن في الطريق إليك.',
            [OrderStatus.PARTIALLY_DELIVERED]: 'تم تسليم جزء من قطع طلبك.',
            [OrderStatus.DELIVERED]: 'تم تسليم طلبك.',
            [OrderStatus.COMPLETED]: 'اكتمل طلبك بنجاح.',
            [OrderStatus.WARRANTY_ACTIVE]: 'تم تفعيل الضمان على طلبك. يمكنك متابعة مدة الحماية من تفاصيل الطلب.',
            [OrderStatus.CANCELLED]: 'تم إلغاء الطلب.',
        };
        const messagesEn: Partial<Record<OrderStatus, string>> = {
            [OrderStatus.PREPARATION]: 'Your parts are now being prepared.',
            [OrderStatus.DELAYED_PREPARATION]: 'Preparation is delayed. We are speeding up your order.',
            [OrderStatus.PREPARED]: 'Parts are prepared and ready for verification/shipping.',
            [OrderStatus.VERIFICATION]: 'Your order is under part verification.',
            [OrderStatus.VERIFICATION_SUCCESS]: 'Verification approved successfully.',
            [OrderStatus.NON_MATCHING]: 'Verification result: non-matching. Please follow instructions.',
            [OrderStatus.CORRECTION_PERIOD]: 'You are in the correction window. Complete the required steps.',
            [OrderStatus.READY_FOR_SHIPPING]: 'Your order is ready for shipping.',
            [OrderStatus.PARTIALLY_SHIPPED]: 'Some parts of your order have shipped.',
            [OrderStatus.SHIPPED]: 'Your order is on the way.',
            [OrderStatus.PARTIALLY_DELIVERED]: 'Some parts of your order were delivered.',
            [OrderStatus.DELIVERED]: 'Your order has been delivered.',
            [OrderStatus.COMPLETED]: 'Your order is complete.',
            [OrderStatus.WARRANTY_ACTIVE]: 'Warranty is now active on your order. Track remaining protection from order details.',
            [OrderStatus.CANCELLED]: 'The order was cancelled.',
        };

        const messageAr = messagesAr[params.newStatus];
        const messageEn = messagesEn[params.newStatus];
        if (!messageAr || !messageEn) return;

        const verificationStatuses = new Set<OrderStatus>([
            OrderStatus.VERIFICATION,
            OrderStatus.VERIFICATION_SUCCESS,
            OrderStatus.NON_MATCHING,
            OrderStatus.CORRECTION_PERIOD,
        ]);
        const isVerification = verificationStatuses.has(params.newStatus);
        const metadata = {
            orderId: params.orderId,
            orderNumber: params.orderNumber,
            status: params.newStatus,
            waEvent: isVerification ? 'VERIFICATION' : 'ORDER_STATUS',
            ...(isVerification ? { verification: true } : {}),
            source: 'AGGREGATE_STATUS',
        };

        await this.notifications.create({
            recipientId: params.customerId,
            recipientRole: 'CUSTOMER',
            titleAr: `تحديث حالة الطلب #${params.orderNumber}`,
            titleEn: `Order Status Update #${params.orderNumber}`,
            messageAr,
            messageEn,
            type: 'ORDER',
            link: `/dashboard/orders/${params.orderId}`,
            metadata,
        });

        const merchantOwnerIds = new Set<string>();
        for (const offer of params.paidOffers) {
            const ownerId = offer.store?.ownerId;
            if (ownerId) merchantOwnerIds.add(ownerId);
        }

        for (const ownerId of merchantOwnerIds) {
            await this.notifications.create({
                recipientId: ownerId,
                recipientRole: 'MERCHANT',
                titleAr: `تحديث حالة الطلب #${params.orderNumber}`,
                titleEn: `Order Status Update #${params.orderNumber}`,
                messageAr,
                messageEn,
                type: 'ORDER',
                link: `/merchant/orders/${params.orderId}`,
                metadata,
            });
        }
    }

    private orderStatusToFulfillmentFloor(
        status: OrderStatus,
    ): OfferFulfillmentStatus {
        const map: Partial<Record<OrderStatus, OfferFulfillmentStatus>> = {
            [OrderStatus.AWAITING_PAYMENT]: OfferFulfillmentStatus.AWAITING_PAYMENT,
            [OrderStatus.PARTIALLY_PAID]: OfferFulfillmentStatus.AWAITING_PAYMENT,
            [OrderStatus.PREPARATION]: OfferFulfillmentStatus.IN_PREPARATION,
            [OrderStatus.DELAYED_PREPARATION]: OfferFulfillmentStatus.IN_PREPARATION,
            [OrderStatus.PREPARED]: OfferFulfillmentStatus.PREPARED,
            [OrderStatus.VERIFICATION]: OfferFulfillmentStatus.VERIFICATION,
            [OrderStatus.CORRECTION_SUBMITTED]: OfferFulfillmentStatus.VERIFICATION,
            [OrderStatus.NON_MATCHING]: OfferFulfillmentStatus.VERIFICATION,
            [OrderStatus.CORRECTION_PERIOD]: OfferFulfillmentStatus.VERIFICATION,
            [OrderStatus.VERIFICATION_SUCCESS]:
                OfferFulfillmentStatus.VERIFICATION_SUCCESS,
            [OrderStatus.READY_FOR_SHIPPING]:
                OfferFulfillmentStatus.READY_FOR_SHIPPING,
            [OrderStatus.PARTIALLY_SHIPPED]: OfferFulfillmentStatus.READY_FOR_SHIPPING,
            [OrderStatus.SHIPPED]: OfferFulfillmentStatus.SHIPPED,
            [OrderStatus.PARTIALLY_DELIVERED]: OfferFulfillmentStatus.DELIVERED,
            [OrderStatus.DELIVERED]: OfferFulfillmentStatus.DELIVERED,
            [OrderStatus.COMPLETED]: OfferFulfillmentStatus.COMPLETED,
        };
        return map[status] ?? OfferFulfillmentStatus.AWAITING_PAYMENT;
    }

    /** Blocks merchant prepare / verify / ready-for-shipping on terminal orders. */
    assertOrderAllowsMerchantFulfillment(order: { status: OrderStatus | string }) {
        const status = String(order.status || '').toUpperCase() as OrderStatus;
        if (MERCHANT_FULFILLMENT_LOCKED_STATUSES.has(status)) {
            throw new BadRequestException('ORDER_FULFILLMENT_LOCKED');
        }
    }

    async markOfferPaid(offerId: string, orderId: string) {
        await this.prisma.offer.update({
            where: { id: offerId },
            data: { fulfillmentStatus: OfferFulfillmentStatus.IN_PREPARATION },
        });
        return this.recomputeOrderStatus(orderId);
    }

    async assertMerchantOffer(
        orderId: string,
        offerId: string,
        storeId: string,
    ): Promise<OfferWithPayments> {
        const offer = await this.prisma.offer.findFirst({
            where: { id: offerId, orderId, storeId },
            include: {
                payments: { where: { status: 'SUCCESS' } },
                orderPart: true,
                store: true,
            },
        });
        if (!offer || !this.isAcceptedOffer(offer.status)) {
            throw new ForbiddenException('No accepted offer for your store on this order.');
        }
        if (!this.hasSuccessfulPayment(offer)) {
            throw new BadRequestException('Offer must be paid before fulfillment actions.');
        }
        return offer;
    }

    async markOfferPrepared(orderId: string, offerId: string, storeId: string) {
        const offer = await this.assertMerchantOffer(orderId, offerId, storeId);
        const order = await this.prisma.order.findUnique({ where: { id: orderId } });
        if (!order) throw new NotFoundException('Order not found');
        this.assertOrderAllowsMerchantFulfillment(order);

        if (
            offer.fulfillmentStatus === OfferFulfillmentStatus.AWAITING_PAYMENT ||
            !this.hasSuccessfulPayment(offer)
        ) {
            throw new BadRequestException(
                'Offer must be paid by the customer before preparation. Fulfillment is locked while awaiting payment.',
            );
        }
        if (
            offer.fulfillmentStatus !== OfferFulfillmentStatus.IN_PREPARATION &&
            offer.fulfillmentStatus !== OfferFulfillmentStatus.PREPARED
        ) {
            throw new BadRequestException(
                `Offer cannot be marked prepared from ${offer.fulfillmentStatus}`,
            );
        }

        await this.prisma.offer.update({
            where: { id: offerId },
            data: {
                fulfillmentStatus: OfferFulfillmentStatus.PREPARED,
                preparedAt: new Date(),
            },
        });

        const partName = this.partLabel(offer, order);
        const prevOrderStatus = order.status;
        const newStatus = await this.recomputeOrderStatus(orderId);

        await this.auditLogs.logAction({
            orderId,
            action: 'MARK_OFFER_PREPARED',
            entity: 'Offer',
            actorType: ActorType.VENDOR,
            actorId: storeId,
            actorName: 'Store Vendor',
            previousState: offer.fulfillmentStatus,
            newState: OfferFulfillmentStatus.PREPARED,
            reason: `Prepared: ${partName}`,
            metadata: { offerId, partName },
        });

        await this.notifications.create({
            recipientId: order.customerId,
            recipientRole: 'CUSTOMER',
            titleAr: `تم تجهيز قطعة: ${partName}`,
            titleEn: `Part prepared: ${partName}`,
            messageAr: `أنهى التاجر تجهيز «${partName}» في الطلب #${order.orderNumber}. باقي القطع قيد المتابعة.`,
            messageEn: `Merchant finished preparing "${partName}" for order #${order.orderNumber}. Other parts may still be in progress.`,
            type: 'ORDER',
            link: `/dashboard/orders/${order.id}`,
            metadata: { offerId, orderId },
        }).catch(() => {});

        await this.notifications.notifyAdmins({
            titleAr: `تجهيز قطعة — #${order.orderNumber}`,
            titleEn: `Part prepared — #${order.orderNumber}`,
            messageAr: `تم تجهيز «${partName}» من قبل المتجر.`,
            messageEn: `Part "${partName}" marked prepared by merchant.`,
            type: 'ORDER',
            link: `/admin/orders/${order.id}`,
            metadata: { offerId, orderId },
        }).catch(() => {});

        if (newStatus === OrderStatus.PREPARED && prevOrderStatus !== OrderStatus.PREPARED) {
            await this.notifications.create({
                recipientId: order.customerId,
                recipientRole: 'CUSTOMER',
                titleAr: 'جميع القطع جاهزة للتوثيق',
                titleEn: 'All parts prepared',
                messageAr: `تم تجهيز جميع قطع الطلب #${order.orderNumber}. سيبدأ التوثيق قريباً.`,
                messageEn: `All parts for order #${order.orderNumber} are prepared.`,
                type: 'ORDER',
                link: `/dashboard/orders/${order.id}`,
            }).catch(() => {});
        }

        return { offerId, orderStatus: newStatus, fulfillmentStatus: OfferFulfillmentStatus.PREPARED };
    }

    /** Legacy: resolve merchant's offer on order when offerId omitted */
    async markAsPreparedForStore(orderId: string, storeId: string, offerId?: string) {
        if (offerId) {
            return this.markOfferPrepared(orderId, offerId, storeId);
        }
        const offer = await this.prisma.offer.findFirst({
            where: {
                orderId,
                storeId,
                status: { in: ['accepted', 'ACCEPTED'] },
            },
        });
        if (!offer) {
            throw new ForbiddenException('No accepted offer for your store.');
        }
        return this.markOfferPrepared(orderId, offer.id, storeId);
    }

    async submitOfferVerification(
        orderId: string,
        offerId: string,
        storeId: string,
        data: any,
    ) {
        const offer = await this.assertMerchantOffer(orderId, offerId, storeId);

        const order = await this.prisma.order.findUnique({ where: { id: orderId } });
        if (!order) throw new NotFoundException('Order not found');
        this.assertOrderAllowsMerchantFulfillment(order);

        const canSubmitFresh = offer.fulfillmentStatus === OfferFulfillmentStatus.PREPARED;
        const canResubmit =
            offer.fulfillmentStatus === OfferFulfillmentStatus.VERIFICATION;

        if (!canSubmitFresh && !canResubmit) {
            throw new BadRequestException(
                `Cannot submit verification while offer is ${offer.fulfillmentStatus}. Mark the part as prepared first.`,
            );
        }

        let parsedImages: unknown[] = [];
        if (typeof data.images === 'string') {
            try {
                parsedImages = JSON.parse(data.images);
            } catch {
                parsedImages = [data.images];
            }
        } else if (Array.isArray(data.images)) {
            parsedImages = data.images;
        }

        if (!parsedImages.length) {
            throw new BadRequestException('At least one verification image is required.');
        }
        if (!data.videoUrl || typeof data.videoUrl !== 'string') {
            throw new BadRequestException('Verification video URL is required.');
        }
        if (!String(data.videoUrl).startsWith('http')) {
            throw new BadRequestException('Verification video must be uploaded before submitting.');
        }

        const docPayload = {
            images: parsedImages as Prisma.InputJsonValue,
            videoUrl: data.videoUrl,
            description: data.description,
            recipientName: data.recipientName,
            recipientSignature: data.recipientSignature,
            signatureType: data.signatureType || 'DRAWN',
            signatureText: data.signatureText || null,
            handoverDate: data.handoverDate ? new Date(data.handoverDate) : null,
            handoverTime: data.handoverTime,
        };

        const partName = this.partLabel(offer, order);

        if (canResubmit) {
            const pending = await this.prisma.verificationDocument.findFirst({
                where: { orderId, offerId, adminStatus: 'PENDING' },
                orderBy: { createdAt: 'desc' },
            });
            if (pending) {
                await this.prisma.verificationDocument.update({
                    where: { id: pending.id },
                    data: docPayload,
                });
                return { success: true, orderStatus: order.status, updated: true };
            }
            throw new BadRequestException(
                'Verification is already under admin review and cannot be changed.',
            );
        }

        await this.prisma.$transaction([
            this.prisma.verificationDocument.create({
                data: {
                    orderId,
                    offerId,
                    storeId,
                    ...docPayload,
                },
            }),
            this.prisma.offer.update({
                where: { id: offerId },
                data: {
                    fulfillmentStatus: OfferFulfillmentStatus.VERIFICATION,
                    verificationSubmittedAt: new Date(),
                },
            }),
        ]);

        const newStatus = await this.recomputeOrderStatus(orderId);

        await this.notifications.notifyAdmins({
            titleAr: `توثيق قطعة — #${order.orderNumber}`,
            titleEn: `Part verification — #${order.orderNumber}`,
            messageAr: `رفع المتجر توثيق «${partName}».`,
            messageEn: `Merchant submitted verification for "${partName}".`,
            type: 'system_alert',
            link: `/admin/orders/${order.id}`,
            metadata: { offerId },
        }).catch(() => {});

        await this.notifications.create({
            recipientId: order.customerId,
            recipientRole: 'CUSTOMER',
            titleAr: `توثيق قيد المراجعة: ${partName}`,
            titleEn: `Verification in review: ${partName}`,
            messageAr: `تم رفع توثيق «${partName}» وهو قيد مراجعة الإدارة.`,
            messageEn: `Verification for "${partName}" is under admin review.`,
            type: 'ORDER',
            link: `/dashboard/orders/${order.id}`,
            metadata: { offerId, orderId, verification: true, waEvent: 'VERIFICATION' },
        }).catch(() => {});

        return { success: true, orderStatus: newStatus };
    }

    async applyVerificationDecision(
        orderId: string,
        offerId: string,
        approved: boolean,
    ) {
        const offer = await this.prisma.offer.findFirst({
            where: { id: offerId, orderId },
            include: { orderPart: true, store: true },
        });
        if (!offer) return;

        await this.prisma.offer.update({
            where: { id: offerId },
            data: {
                // Reject keeps VERIFICATION so aggregate cannot collapse order back to PREPARED
                fulfillmentStatus: approved
                    ? OfferFulfillmentStatus.VERIFICATION_SUCCESS
                    : OfferFulfillmentStatus.VERIFICATION,
            },
        });

        await this.recomputeOrderStatus(orderId);
    }

    async markOfferReadyForShipping(
        orderId: string,
        offerId: string,
        storeId: string,
    ) {
        const offer = await this.assertMerchantOffer(orderId, offerId, storeId);
        if (offer.fulfillmentStatus !== OfferFulfillmentStatus.VERIFICATION_SUCCESS) {
            throw new BadRequestException(
                'Offer must pass verification before ready for shipping.',
            );
        }

        const order = await this.prisma.order.findUnique({ where: { id: orderId } });
        if (!order) throw new NotFoundException('Order not found');
        this.assertOrderAllowsMerchantFulfillment(order);

        await this.prisma.offer.update({
            where: { id: offerId },
            data: {
                fulfillmentStatus: OfferFulfillmentStatus.READY_FOR_SHIPPING,
                readyForShippingAt: new Date(),
            },
        });

        const partName = this.partLabel(offer, order);
        const newStatus = await this.recomputeOrderStatus(orderId);

        await this.notifications.create({
            recipientId: order.customerId,
            recipientRole: 'CUSTOMER',
            titleAr: `جاهزة للشحن: ${partName}`,
            titleEn: `Ready to ship: ${partName}`,
            messageAr: `«${partName}» جاهزة — يمكنك اختيارها من سلة الشحن عند الجاهزية.`,
            messageEn: `"${partName}" is ready — select it in the shipping cart when available.`,
            type: 'ORDER',
            link: `/dashboard/shipping-cart`,
            metadata: { offerId, orderId },
        }).catch(() => {});

        const paid = await this.getPaidAcceptedOffers(orderId);
        const allReady = paid.every(
            (o) =>
                o.fulfillmentStatus === OfferFulfillmentStatus.READY_FOR_SHIPPING ||
                o.fulfillmentStatus === OfferFulfillmentStatus.SHIPPED,
        );
        if (allReady) {
            await this.notifications.create({
                recipientId: order.customerId,
                recipientRole: 'CUSTOMER',
                titleAr: 'كل القطع جاهزة للشحن',
                titleEn: 'All parts ready to ship',
                messageAr: `جميع قطع الطلب #${order.orderNumber} جاهزة في سلة الشحن.`,
                messageEn: `All parts for order #${order.orderNumber} are ready in your shipping cart.`,
                type: 'ORDER',
                link: `/dashboard/shipping-cart`,
            }).catch(() => {});
        }

        return { orderStatus: newStatus, fulfillmentStatus: OfferFulfillmentStatus.READY_FOR_SHIPPING };
    }

    async markOfferReadyForStore(orderId: string, storeId: string, offerId?: string) {
        if (offerId) {
            return this.markOfferReadyForShipping(orderId, offerId, storeId);
        }
        const offer = await this.prisma.offer.findFirst({
            where: {
                orderId,
                storeId,
                status: { in: ['accepted', 'ACCEPTED'] },
            },
        });
        if (!offer) throw new ForbiddenException('No accepted offer for your store.');
        return this.markOfferReadyForShipping(orderId, offer.id, storeId);
    }

    async markOffersShippedFromCart(offerIds: string[]) {
        if (!offerIds.length) return;
        await this.prisma.offer.updateMany({
            where: { id: { in: offerIds } },
            data: { fulfillmentStatus: OfferFulfillmentStatus.SHIPPED },
        });
        const offers = await this.prisma.offer.findMany({
            where: { id: { in: offerIds } },
            select: { orderId: true },
        });
        const orderIds = [...new Set(offers.map((o) => o.orderId))];
        for (const orderId of orderIds) {
            await this.recomputeOrderStatus(orderId);
        }
    }

    getFulfillmentSummary(
        paidOffers: Array<{
            id: string;
            fulfillmentStatus: OfferFulfillmentStatus;
            orderPartId?: string | null;
            orderPart?: { name: string } | null;
            shippedFromCart?: boolean;
            deliveredAt?: Date | null;
            completedAt?: Date | null;
            resolutionLocked?: boolean;
            hasOpenCase?: boolean;
            warrantyEndAt?: Date | null;
        }>,
    ) {
        const total = paidOffers.length;
        const stepCounts = {
            preparation: 0,
            prepared: 0,
            verification: 0,
            verificationSuccess: 0,
            handoverPending: 0,
            readyForShipping: 0,
            shipped: 0,
            inCart: 0,
        };

        for (const o of paidOffers) {
            const r = FULFILLMENT_RANK[o.fulfillmentStatus] ?? 0;
            if (r >= FULFILLMENT_RANK.IN_PREPARATION) stepCounts.preparation++;
            if (r >= FULFILLMENT_RANK.PREPARED) stepCounts.prepared++;
            if (r >= FULFILLMENT_RANK.VERIFICATION) stepCounts.verification++;
            if (r >= FULFILLMENT_RANK.VERIFICATION_SUCCESS) {
                stepCounts.verificationSuccess++;
            }
            if (o.fulfillmentStatus === OfferFulfillmentStatus.VERIFICATION_SUCCESS) {
                stepCounts.handoverPending++;
            }
            if (r >= FULFILLMENT_RANK.READY_FOR_SHIPPING) {
                stepCounts.readyForShipping++;
            }
            if (
                o.shippedFromCart ||
                o.fulfillmentStatus === OfferFulfillmentStatus.SHIPPED
            ) {
                stepCounts.shipped++;
            }
            if (!o.shippedFromCart) {
                stepCounts.inCart++;
            }
        }

        const minRank =
            total > 0
                ? Math.min(
                      ...paidOffers.map(
                          (o) => FULFILLMENT_RANK[o.fulfillmentStatus] ?? 0,
                      ),
                  )
                : 0;

        return {
            total,
            stepCounts,
            minRank,
            parts: paidOffers.map((o) => ({
                offerId: o.id,
                orderPartId: o.orderPartId ?? null,
                partName: o.orderPart?.name || 'Part',
                fulfillmentStatus: o.fulfillmentStatus,
                canSelectForShipping:
                    o.fulfillmentStatus === OfferFulfillmentStatus.READY_FOR_SHIPPING &&
                    !o.shippedFromCart,
                ...this.buildOfferResolutionMeta(o, !!o.hasOpenCase),
            })),
        };
    }

    getLockReason(
        status: OfferFulfillmentStatus,
    ): { ar: string; en: string } {
        switch (status) {
            case OfferFulfillmentStatus.COMPLETED:
                return {
                    ar: 'انتهت مهلة الإرجاع — القطعة مكتملة',
                    en: 'Return window closed — item completed',
                };
            case OfferFulfillmentStatus.DELIVERED:
                return {
                    ar: 'وصلت — مهلة الإرجاع/النزاع نشطة',
                    en: 'Delivered — return/dispute window active',
                };
            case OfferFulfillmentStatus.AWAITING_PAYMENT:
                return {
                    ar: 'بانتظار دفع العميل',
                    en: 'Awaiting customer payment',
                };
            case OfferFulfillmentStatus.IN_PREPARATION:
                return {
                    ar: 'بانتظار تجهيز التاجر',
                    en: 'Awaiting merchant preparation',
                };
            case OfferFulfillmentStatus.PREPARED:
                return {
                    ar: 'بانتظار رفع التوثيق',
                    en: 'Awaiting verification upload',
                };
            case OfferFulfillmentStatus.VERIFICATION:
                return {
                    ar: 'التوثيق قيد مراجعة الإدارة',
                    en: 'Verification under admin review',
                };
            case OfferFulfillmentStatus.VERIFICATION_SUCCESS:
                return {
                    ar: 'بانتظار تسليم التاجر للإدارة',
                    en: 'Awaiting merchant handover to admin',
                };
            default:
                return {
                    ar: 'غير جاهزة للشحن بعد',
                    en: 'Not ready for shipping yet',
                };
        }
    }

    isMultiItemOrder(order: { requestType?: string | null; parts?: unknown[] | null }) {
        return (
            String(order.requestType || '').toLowerCase() === 'multiple' ||
            (order.parts?.length ?? 0) > 1
        );
    }

    getOfferReturnWindowEndsAt(offer: { deliveredAt?: Date | null }) {
        if (!offer.deliveredAt) return null;
        const windowMs = this.orderDurationConfig.getReturnDisputeMsSync();
        return new Date(offer.deliveredAt.getTime() + windowMs);
    }

    isOfferReturnEligible(offer: {
        fulfillmentStatus: OfferFulfillmentStatus;
        deliveredAt?: Date | null;
        resolutionLocked?: boolean;
    }) {
        if (offer.resolutionLocked) return false;
        if (offer.fulfillmentStatus === OfferFulfillmentStatus.COMPLETED) return false;
        if (offer.fulfillmentStatus !== OfferFulfillmentStatus.DELIVERED) return false;
        if (!offer.deliveredAt) return false;
        const endsAt = this.getOfferReturnWindowEndsAt(offer);
        return endsAt != null && Date.now() <= endsAt.getTime();
    }

    async hasOpenCaseForOffer(
        offerId: string,
        orderPartId?: string | null,
        tx?: Prisma.TransactionClient,
    ) {
        const db = tx || this.prisma;
        const [openReturn, openDispute] = await Promise.all([
            db.returnRequest.findFirst({
                where: {
                    offerId,
                    status: { notIn: ['CANCELLED', 'REJECTED', 'REFUNDED', 'RESOLVED'] },
                },
            }),
            db.dispute.findFirst({
                where: {
                    offerId,
                    status: { notIn: ['CLOSED', 'RESOLVED'] },
                },
            }),
        ]);
        if (openReturn || openDispute) return true;
        if (orderPartId) {
            const [partReturn, partDispute] = await Promise.all([
                db.returnRequest.findFirst({
                    where: {
                        orderPartId,
                        status: { notIn: ['CANCELLED', 'REJECTED', 'REFUNDED', 'RESOLVED'] },
                    },
                }),
                db.dispute.findFirst({
                    where: {
                        orderPartId,
                        status: { notIn: ['CLOSED', 'RESOLVED'] },
                    },
                }),
            ]);
            return !!(partReturn || partDispute);
        }
        return false;
    }

    assertOfferReturnWindow(offer: {
        id: string;
        fulfillmentStatus: OfferFulfillmentStatus;
        deliveredAt?: Date | null;
        resolutionLocked?: boolean;
        orderPart?: { name: string } | null;
    }) {
        const partName = offer.orderPart?.name || 'this item';
        if (offer.resolutionLocked || offer.fulfillmentStatus === OfferFulfillmentStatus.COMPLETED) {
            throw new BadRequestException(
                `Return/dispute window has closed for "${partName}" (item completed).`,
            );
        }
        if (offer.fulfillmentStatus !== OfferFulfillmentStatus.DELIVERED) {
            throw new BadRequestException(
                `"${partName}" must be delivered before requesting return or dispute.`,
            );
        }
        if (!offer.deliveredAt) {
            throw new BadRequestException(
                `Delivery timestamp missing for "${partName}". Please contact support.`,
            );
        }
        const endsAt = this.getOfferReturnWindowEndsAt(offer);
        if (!endsAt || Date.now() > endsAt.getTime()) {
            const returnHours = this.orderDurationConfig.getReturnWindowHoursSync();
            throw new BadRequestException(
                `Return/dispute window (${returnHours} hours) has expired for "${partName}".`,
            );
        }
    }

    async completeOfferAfterWindow(
        offerId: string,
        reason = 'System: Auto-completed after return/dispute window expired',
    ) {
        const windowMs = this.orderDurationConfig.getReturnDisputeMsSync();
        const windowEnd = new Date(Date.now() - windowMs);

        const txnResult = await this.prisma.$transaction(async (tx) => {
            await tx.$executeRaw`SELECT id FROM offers WHERE id = ${offerId}::uuid FOR UPDATE`;

            const offer = await tx.offer.findUnique({
                where: { id: offerId },
                include: { orderPart: true, order: true },
            });
            if (!offer) return null;
            if (
                offer.fulfillmentStatus !== OfferFulfillmentStatus.DELIVERED ||
                offer.resolutionLocked ||
                !offer.deliveredAt ||
                offer.deliveredAt > windowEnd
            ) {
                return null;
            }

            const hasCase = await this.hasOpenCaseForOffer(
                offer.id,
                offer.orderPartId,
                tx,
            );
            if (hasCase) return null;

            const now = new Date();
            const warrantyData =
                offer.hasWarranty && offer.warrantyDuration
                    ? {
                          warrantyActiveAt: now,
                          warrantyEndAt: calculateWarrantyEndDate(
                              now,
                              offer.warrantyDuration,
                          ),
                      }
                    : {};

            const updated = await tx.offer.updateMany({
                where: {
                    id: offerId,
                    fulfillmentStatus: OfferFulfillmentStatus.DELIVERED,
                    resolutionLocked: false,
                    deliveredAt: { lte: windowEnd },
                },
                data: {
                    fulfillmentStatus: OfferFulfillmentStatus.COMPLETED,
                    completedAt: now,
                    resolutionLocked: true,
                    ...warrantyData,
                },
            });

            if (updated.count === 0) return null;
            return { offer, orderId: offer.orderId };
        });

        if (!txnResult) return null;

        await this.auditLogs.logAction({
            orderId: txnResult.orderId,
            action: 'OFFER_AUTO_COMPLETED',
            entity: 'Offer',
            actorType: ActorType.SYSTEM,
            actorId: 'OFFER_RESOLUTION_CRON',
            actorName: 'Offer Resolution',
            previousState: OfferFulfillmentStatus.DELIVERED,
            newState: OfferFulfillmentStatus.COMPLETED,
            reason,
            metadata: { offerId, partName: txnResult.offer.orderPart?.name },
        });

        const nextStatus = await this.recomputeOrderStatus(txnResult.orderId);
        return { offer: txnResult.offer, orderStatus: nextStatus };
    }

    buildOfferResolutionMeta(
        offer: {
            id: string;
            fulfillmentStatus: OfferFulfillmentStatus;
            deliveredAt?: Date | null;
            completedAt?: Date | null;
            resolutionLocked?: boolean;
            orderPartId?: string | null;
            warrantyEndAt?: Date | null;
        },
        hasOpenCase = false,
    ) {
        const endsAt = this.getOfferReturnWindowEndsAt(offer);
        const isReturnEligible =
            !hasOpenCase && this.isOfferReturnEligible(offer);
        return {
            deliveredAt: offer.deliveredAt?.toISOString() ?? null,
            completedAt: offer.completedAt?.toISOString() ?? null,
            returnWindowEndsAt: endsAt?.toISOString() ?? null,
            isReturnEligible,
            resolutionLocked: !!offer.resolutionLocked,
            hasOpenCase,
            warrantyEndAt: offer.warrantyEndAt?.toISOString() ?? null,
        };
    }
}
