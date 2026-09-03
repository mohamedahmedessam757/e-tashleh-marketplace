import { Injectable, NotFoundException, BadRequestException, ForbiddenException, Inject, forwardRef, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrderStateMachine } from './fsm/order-state-machine.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { NotificationsService } from '../notifications/notifications.service';
import { ActorType, Order, OrderStatus, Prisma, ShipmentStatus, StoreLoyaltyTier, ViolationTargetType } from '@prisma/client';
import { FindAllOrdersDto } from './dto/find-all-orders.dto';

import { ChatService } from '../chat/chat.service';
import { ShipmentsService } from '../shipments/shipments.service';
import { LoyaltyService } from '../loyalty/loyalty.service';
import { UsersService } from '../users/users.service';
import { OrderDurationConfigService } from '../common/order-duration-config.service';
import { LogisticsConfigService } from '../common/logistics-config.service';
import { WaybillsService } from '../waybills/waybills.service';
import { OfferFulfillmentService } from './offer-fulfillment.service';
import { OrderSlaService } from './order-sla.service';
import { OfferFulfillmentStatus } from '@prisma/client';
import { VerificationTasksService } from '../verification-tasks/verification-tasks.service';
import { EscrowService } from '../payments/escrow.service';
import { OrderCompletionFinanceService } from '../payments/order-completion-finance.service';
import { ViolationsService } from '../violations/violations.service';
import {
  isUuid,
  mergeWhereWithSearch,
  normalizeSearchQuery,
  resolveOrderIds,
  resolveStoreIds,
  resolveUserIds,
} from '../common/search/admin-entity-search.util';
import { resolveCompletionWarranty } from './warranty-activation.util';
import { shouldCloseOrderChat } from '../chat/chat-offer-expiry.util';
import { OrderCreateQuotaService } from './order-create-quota.service';
import { ORDER_CREATE_RULES } from './order-create-rules.util';
import { computeOffersStopAt } from '../offers/offer-governance.util';

@Injectable()
export class OrdersService {
    private readonly logger = new Logger(OrdersService.name);

    constructor(
        private prisma: PrismaService,
        private fsm: OrderStateMachine,
        private auditLogs: AuditLogsService,
        private notifications: NotificationsService,
        private chatService: ChatService, // Injected
        private shipmentsService: ShipmentsService,
        private loyaltyService: LoyaltyService,
        private usersService: UsersService,
        private waybillsService: WaybillsService,
        private offerFulfillment: OfferFulfillmentService,
        @Inject(forwardRef(() => VerificationTasksService))
        private verificationTasks: VerificationTasksService,
        @Inject(forwardRef(() => EscrowService))
        private escrowService: EscrowService,
        @Inject(forwardRef(() => OrderCompletionFinanceService))
        private completionFinance: OrderCompletionFinanceService,
        private orderDurationConfig: OrderDurationConfigService,
        private logisticsConfig: LogisticsConfigService,
        private orderSla: OrderSlaService,
        @Inject(forwardRef(() => ViolationsService))
        private violationsService: ViolationsService,
        private orderCreateQuota: OrderCreateQuotaService,
    ) { }

    /** Side-effects when an order reaches a chat-lock terminal status. */
    afterOrderReachedCompletion(orderId: string) {
        this.chatService.lockOrderVendorChatOnCompletion(orderId).catch((err) => {
            console.error(`Failed to lock chat on terminal status for order ${orderId}:`, err);
        });
    }

    /** Backward-compatible singular `review` field for API consumers (first review). */
    private attachLegacyReviewField<T extends { reviews?: unknown[] | null }>(
        order: T,
    ): T & { review: unknown | null } {
        const reviews = order.reviews ?? [];
        return { ...order, review: reviews[0] ?? null };
    }

    private async attachActiveSlaToOrder<T extends Record<string, unknown>>(order: T) {
        const cfg = await this.orderDurationConfig.getConfig();
        return this.orderSla.attachActiveSla(order, cfg);
    }

    async create(customerId: string, createOrderDto: CreateOrderDto): Promise<Order> {
        // [Verified] Type safety confirmed: 'parts' relation exists in Prisma Client
        const clientRequestId = createOrderDto.clientRequestId?.trim() || undefined;

        // Idempotency: replay returns the same order (no second row / no re-notify)
        if (clientRequestId) {
            const existing = await this.prisma.order.findFirst({
                where: { customerId, clientRequestId },
                include: { parts: true },
            });
            if (existing) return existing;
        }

        // --- 2026 Governance Enforcement: Order Limit ---
        const customer = await this.prisma.user.findUnique({
            where: { id: customerId },
            select: { orderLimit: true, dailyOrderCount: true, restrictionAlertMessage: true }
        });

        if (customer && customer.orderLimit !== -1 && customer.dailyOrderCount >= customer.orderLimit) {
            throw new ForbiddenException(customer.restrictionAlertMessage || `You have reached your daily limit of ${customer.orderLimit} orders. Please try again tomorrow.`);
        }
        // ------------------------------------------------

        // Early create-rules check (fast fail before order number / tx)
        await this.orderCreateQuota.assertCanCreate(customerId, createOrderDto);

        // 1. Generate Order Number
        const orderNumber = await this.generateOrderNumber();
        const durationCfg = await this.orderDurationConfig.getConfig();
        const collectionMs = this.orderDurationConfig.hoursToMs(durationCfg.offerCollectionHours);

        let result: Order;
        try {
            // 2. Transaction: Create Order + Parts + Audit Log + Update Count
            result = await this.prisma.$transaction(async (tx) => {
                // Serialize concurrent creates for this customer
                await tx.$executeRaw`SELECT id FROM users WHERE id = ${customerId}::uuid FOR UPDATE`;

                // Re-check rules under lock (race-safe)
                await this.orderCreateQuota.assertCanCreate(customerId, createOrderDto, tx);

                // Increment daily count
                await tx.user.update({
                    where: { id: customerId },
                    data: { dailyOrderCount: { increment: 1 } }
                });

                // Helper: Get primary part for legacy fields compatibility
                // Ensure parts exists and has at least one item, otherwise default to empty/null logic
                const primaryPart = (createOrderDto.parts && createOrderDto.parts.length > 0) ? createOrderDto.parts[0] : null;
                const primaryName = primaryPart ? primaryPart.name : (createOrderDto.partName || 'Multi-Part Order');
                const primaryDesc = primaryPart ? primaryPart.description : (createOrderDto.partDescription || 'See parts list');
                const primaryImages = primaryPart ? primaryPart.images : (createOrderDto.partImages || []);

                const order = await tx.order.create({
                    data: {
                        vehicleMake: createOrderDto.vehicleMake,
                        vehicleModel: createOrderDto.vehicleModel,
                        vehicleYear: createOrderDto.vehicleYear,
                        vin: createOrderDto.vin,
                        vinImage: createOrderDto.vinImage,
                        requestType: createOrderDto.requestType,
                        shippingType: createOrderDto.shippingType,

                        // Legacy Support: Populate single-part fields from the first part
                        partName: primaryName,
                        partDescription: primaryDesc,
                        partImages: primaryImages,

                        conditionPref: createOrderDto.conditionPref,
                        warrantyPreferred: createOrderDto.warrantyPreferred,
                        clientRequestId: clientRequestId ?? null,

                        customerId,
                        orderNumber,
                        status: OrderStatus.COLLECTING_OFFERS,
                        revealOffersAt: new Date(Date.now() + collectionMs),
                        offersStopAt: computeOffersStopAt(new Date(Date.now() + collectionMs)),
                        selectionDeadlineAt: null, // Set dynamically upon reveal

                        // New Relation: Create all parts
                        // @ts-ignore: IDE stale type definition
                        parts: {
                            create: createOrderDto.parts ? createOrderDto.parts.map(part => ({
                                name: part.name,
                                description: part.description,
                                notes: part.notes,
                                images: part.images || [],
                                video: part.video,
                            })) : []
                        }
                    },
                    include: {
                        // @ts-ignore: IDE stale type definition
                        parts: true // Return parts in response
                    }
                });

                // Update Audit Log to reflect new structure
                await this.auditLogs.logAction({
                    orderId: order.id,
                    action: 'CREATE',
                    entity: 'Order',
                    actorType: ActorType.CUSTOMER,
                    actorId: customerId,
                    actorName: 'Customer', // In real app, fetch name
                    newState: OrderStatus.COLLECTING_OFFERS,
                    metadata: {
                        car: `${createOrderDto.vehicleMake} ${createOrderDto.vehicleModel} ${createOrderDto.vehicleYear}`,
                        partsCount: createOrderDto.parts ? createOrderDto.parts.length : 0,
                        vinImage: createOrderDto.vinImage,
                        // Captured from frontend payload
                        requestType: createOrderDto.requestType,
                        shippingType: createOrderDto.shippingType
                    },
                }, tx);

                return order;
            });
        } catch (error) {
            // Concurrent duplicate create with same clientRequestId → return winner
            if (
                clientRequestId &&
                error instanceof Prisma.PrismaClientKnownRequestError &&
                error.code === 'P2002'
            ) {
                const existing = await this.prisma.order.findFirst({
                    where: { customerId, clientRequestId },
                    include: { parts: true },
                });
                if (existing) return existing;
            }
            throw error;
        }

        // 3. Notifications / WhatsApp: fire-and-forget after commit (do not block HTTP)
        void this.dispatchOrderCreatedNotifications(customerId, result.id, orderNumber, createOrderDto)
            .catch((e) => this.logger.error('Failed to send order-created notifications', e));

        // Single-request quota warning (after successful create)
        if (String(createOrderDto.requestType).toLowerCase() === 'single') {
            void this.dispatchSingleQuotaWarning(customerId).catch((e) =>
                this.logger.error('Failed to send single-quota warning', e),
            );
        }

        return result;
    }

    /** Notify customer when approaching / hitting the 24h single-order cap. */
    private async dispatchSingleQuotaWarning(customerId: string): Promise<void> {
        const quota = await this.orderCreateQuota.getQuota(customerId);
        const used = quota.single.used;
        const max = quota.single.max;
        if (used < ORDER_CREATE_RULES.singleWarnThreshold) return;

        const atLimit = used >= max;
        const dedupKey = atLimit
            ? `single_quota_limit_${quota.single.nextUnlockAt || 'now'}`
            : `single_quota_warn_${quota.single.nextUnlockAt || 'now'}`;

        await this.notifications.notifyWithDedup(customerId, dedupKey, 24 * 60, {
            recipientId: customerId,
            recipientRole: 'CUSTOMER',
            titleAr: atLimit ? 'وصلت لحد الطلبات المفردة' : 'تنبيه حد الطلبات المفردة',
            titleEn: atLimit ? 'Single request limit reached' : 'Single request limit warning',
            messageAr: atLimit
                ? `استخدمت ${used}/${max} طلبات مفردة خلال 24 ساعة. لا يمكنك تقديم طلب مفرد جديد حتى انتهاء المدة.`
                : `استخدمت ${used}/${max} طلبات مفردة خلال 24 ساعة. تبقّى لك ${quota.single.remaining} طلبات.`,
            messageEn: atLimit
                ? `You used ${used}/${max} single requests within 24 hours. You cannot submit another single request until the window resets.`
                : `You used ${used}/${max} single requests within 24 hours. ${quota.single.remaining} remaining.`,
            type: 'ORDER',
            link: `/dashboard/create-order`,
            metadata: {
                waEvent: 'ORDER_SINGLE_QUOTA',
                used,
                max,
                nextUnlockAt: quota.single.nextUnlockAt,
            },
        });
    }

    /** Background fan-out after order commit — never awaited on the create HTTP path */
    private async dispatchOrderCreatedNotifications(
        customerId: string,
        orderId: string,
        orderNumber: string,
        createOrderDto: CreateOrderDto,
    ): Promise<void> {
        try {
            await this.notifications.create({
                recipientId: customerId,
                recipientRole: 'CUSTOMER',
                titleAr: 'تم استلام طلبك بنجاح! 🌟',
                titleEn: 'Order Received Successfully! 🌟',
                messageAr: `شكراً لثقتك بنا! طلبك رقم ${orderNumber} قيد المراجعة الآن وسنقوم بجلب أفضل العروض لك في أقرب وقت.`,
                messageEn: `Thank you for your trust! Order #${orderNumber} is now under review, and we'll bring you the best offers soon.`,
                type: 'ORDER',
                link: `/dashboard/orders`,
                metadata: { orderId, orderNumber, waEvent: 'ORDER_CREATED' }
            });

            await this.notifications.notifyAdmins({
                titleAr: 'طلب جديد في السوق!',
                titleEn: 'New Order in Marketplace!',
                messageAr: `تم إنشاء طلب جديد رقم ${orderNumber} بانتظار عروض التجار.`,
                messageEn: `A new order #${orderNumber} has been created, awaiting merchant offers.`,
                type: 'ORDER',
                link: `/admin/orders/${orderId}`,
                metadata: { orderId, orderNumber }
            });

            const matchingStores = await this.prisma.store.findMany({
                where: {
                    status: 'ACTIVE',
                    OR: [
                        { selectedMakes: { has: createOrderDto.vehicleMake } },
                        { customMake: { equals: createOrderDto.vehicleMake, mode: 'insensitive' } }
                    ]
                },
                select: { ownerId: true }
            });

            if (matchingStores.length > 0) {
                const merchantMessageAr = `طلب جديد لسيارة ${createOrderDto.vehicleMake} ${createOrderDto.vehicleModel}. هل تتوفر لديك القطعة؟ قدم عرضك الآن!`;
                const merchantMessageEn = `New request for ${createOrderDto.vehicleMake} ${createOrderDto.vehicleModel}. Do you have the part? Submit your offer now!`;

                await Promise.allSettled(
                    matchingStores.map((store) =>
                        this.notifications.create({
                            recipientId: store.ownerId,
                            recipientRole: 'MERCHANT',
                            titleAr: 'فرصة بيع جديدة! 💰',
                            titleEn: 'New Sales Opportunity! 💰',
                            messageAr: merchantMessageAr,
                            messageEn: merchantMessageEn,
                            type: 'ORDER',
                            link: `/merchant/orders/${orderId}`,
                            metadata: { orderId, orderNumber, waEvent: 'ORDER_CREATED' },
                        }),
                    ),
                );
            }
        } catch (e) {
            this.logger.error('Failed to send notification', e instanceof Error ? e.stack : e);
        }
    }


    async findAll(user: any, query: FindAllOrdersDto = {}) {
        const { page = 1, limit = 20, status, search } = query;
        const skip = (page - 1) * limit;
        const take = limit;

        const where: Prisma.OrderWhereInput = {};

        // 1. Role-Based Access Control Filtering
        if (user.role === 'CUSTOMER') {
            where.customerId = user.id;
        }
        else if (user.role === 'VENDOR') {
            const store = await this.prisma.store.findFirst({
                where: { ownerId: user.id },
                select: { id: true, selectedMakes: true, selectedModels: true, visibilityRestricted: true, visibilityRate: true }
            });

            if (store) {
                const storeId = store.id;
                const hasMakes = store.selectedMakes && store.selectedMakes.length > 0;
                const hasModels = store.selectedModels && store.selectedModels.length > 0;

                // --- 2026 Governance Enforcement: Visibility Restriction ---
                const allowedOrderEnds: string[] = [];
                if (store.visibilityRestricted && store.visibilityRate < 100) {
                    for (let i = 0; i < store.visibilityRate; i++) {
                        allowedOrderEnds.push(i.toString().padStart(2, '0'));
                    }
                }
                const visibilityFilter: Prisma.OrderWhereInput = allowedOrderEnds.length > 0 ? {
                    OR: allowedOrderEnds.map(end => ({ orderNumber: { endsWith: end } }))
                } : {};
                // ------------------------------------------------------------

                // Marketplace discovery: ONLY open bidding. Never AWAITING_SELECTION/PAYMENT.
                // Prior bids still appear via offers.some / acceptedOffer / storeId below.
                const now = new Date();
                where.OR = [
                    {
                        AND: [
                            {
                                status: {
                                    in: [OrderStatus.AWAITING_OFFERS, OrderStatus.COLLECTING_OFFERS],
                                },
                            },
                            {
                                status: {
                                    notIn: [
                                        OrderStatus.AWAITING_SELECTION,
                                        OrderStatus.AWAITING_PAYMENT,
                                        OrderStatus.PARTIALLY_PAID,
                                        OrderStatus.CANCELLED,
                                    ],
                                },
                            },
                            {
                                OR: [
                                    { offersStopAt: { gt: now } },
                                    // Legacy rows without stop: hide once reveal started
                                    {
                                        AND: [
                                            { offersStopAt: null },
                                            {
                                                OR: [
                                                    { revealOffersAt: null },
                                                    { revealOffersAt: { gt: now } },
                                                ],
                                            },
                                        ],
                                    },
                                ],
                            },
                            {
                                parts: {
                                    some: {
                                        offers: {
                                            none: { status: 'accepted' },
                                        },
                                    },
                                },
                            },
                            hasMakes
                                ? {
                                      OR: store.selectedMakes.map((make) => ({
                                          vehicleMake: { equals: make, mode: 'insensitive' as const },
                                      })),
                                  }
                                : {},
                            hasModels
                                ? {
                                      OR: store.selectedModels.map((model) => ({
                                          vehicleModel: { equals: model, mode: 'insensitive' as const },
                                      })),
                                  }
                                : {},
                            visibilityFilter,
                        ],
                    },
                    { storeId: storeId },
                    { acceptedOffer: { storeId: storeId } },
                    { offers: { some: { storeId: storeId } } },
                ];
            } else {
                where.offers = { some: { store: { ownerId: user.id } } };
            }
        }

        // 2. Status Filtering
        if (status) {
            if (where.OR) {
                where.AND = [
                    { status: status },
                    { OR: where.OR } // Combine with existing RBAC OR
                ];
                delete where.OR;
            } else {
                where.status = status;
            }
        }

        // 3. Search Logic (OrderNumber, Part, Car, Customer, IDs)
        if (search) {
            const q = normalizeSearchQuery(search);
            const [userIds, storeIds] = await Promise.all([
                resolveUserIds(this.prisma, q),
                resolveStoreIds(this.prisma, q),
            ]);

            const or: Prisma.OrderWhereInput[] = [
                { orderNumber: { contains: q, mode: 'insensitive' } },
                { partName: { contains: q, mode: 'insensitive' } },
                { vehicleMake: { contains: q, mode: 'insensitive' } },
                { vehicleModel: { contains: q, mode: 'insensitive' } },
                { customer: { name: { contains: q, mode: 'insensitive' } } },
            ];

            if (isUuid(q)) or.push({ id: q });
            if (userIds.length) {
                or.push({ customerId: { in: userIds } });
                or.push({ offers: { some: { store: { ownerId: { in: userIds } } } } });
            }
            if (storeIds.length) {
                or.push({ storeId: { in: storeIds } });
                or.push({ offers: { some: { storeId: { in: storeIds } } } });
            }

            const searchFilter: Prisma.OrderWhereInput = { OR: or };

            if (where.AND) {
                (where.AND as any).push(searchFilter);
            } else if (where.id || where.customerId || where.OR || where.status) {
                // If we already have some primitive filters, wrap them in AND
                const existing = { ...where };
                for (const key in where) delete where[key];
                where.AND = [existing, searchFilter];
            } else {
                Object.assign(where, searchFilter);
            }
        }

        // 4. Optimized Execution (Parallel Count + Fetch)
        const [items, total] = await Promise.all([
            this.prisma.order.findMany({
                where,
                skip,
                take,
                orderBy: { createdAt: 'desc' },
                include: {
                    parts: { select: { id: true, name: true, quantity: true, description: true, images: true, notes: true } },
                    customer: { select: { id: true, name: true, email: true, avatar: true } },
                    reviews: {
                        select: {
                            id: true,
                            rating: true,
                            comment: true,
                            adminStatus: true,
                            offerId: true,
                            createdAt: true,
                        },
                        take: 1,
                        orderBy: { createdAt: 'desc' },
                    },
                    offers: {
                        where: { status: { not: 'rejected' }, isWithdrawn: false },
                        orderBy: { createdAt: 'asc' },
                        include: {
                            store: {
                                select: {
                                    id: true,
                                    name: true,
                                    storeCode: true,
                                    logo: true,
                                    rating: true,
                                    _count: {
                                        select: {
                                            reviews: { where: { adminStatus: 'PUBLISHED' } },
                                        },
                                    },
                                },
                            },
                        }
                    },
                    verificationDocuments: {
                        select: { id: true, adminStatus: true, createdAt: true },
                        orderBy: { createdAt: 'desc' }
                    },
                    shipments: {
                        select: { id: true, status: true, carrierName: true, trackingNumber: true, createdAt: true },
                        orderBy: { createdAt: 'desc' }
                    },
                    payments: {
                        select: { id: true, createdAt: true, status: true },
                        orderBy: { createdAt: 'asc' },
                        take: 3,
                    },
                    _count: {
                        select: { offers: true }
                    }
                }
            }),
            this.prisma.order.count({ where })
        ]);
        
        // --- 2026 Governance: Visibility Filtering ---
        const now = new Date();
        // Must assign return value — attachLegacyReviewField returns a new object (does not mutate)
        const itemsWithReview = (items as any[]).map((order) => {
            const withReview = this.attachLegacyReviewField(order);
            // 1. Hide ALL offers from CUSTOMER if reveal time not reached AND not in selection phase
            if (user.role === 'CUSTOMER' && withReview.status !== OrderStatus.AWAITING_SELECTION && withReview.revealOffersAt && withReview.revealOffersAt > now) {
                withReview.offers = [];
                // @ts-ignore
                if (withReview._count) withReview._count.offers = 0;
            }

            // 2. Hide OTHER merchants' offers from VENDOR during bidding phase
            if (user.role === 'VENDOR' && (withReview.status === OrderStatus.COLLECTING_OFFERS || withReview.status === OrderStatus.AWAITING_SELECTION)) {
                const myStoreId = user.storeId;
                if (myStoreId) {
                    withReview.offers = withReview.offers.filter((o: { storeId: string }) => o.storeId === myStoreId);
                    // @ts-ignore
                    if (withReview._count) withReview._count.offers = withReview.offers.length;
                }
            }
            return withReview;
        });

        const durationCfg = await this.orderDurationConfig.getConfig();
        const itemsWithSla = this.orderSla.attachActiveSlaBatch(itemsWithReview as any[], durationCfg);

        return {
            items: itemsWithSla,
            total,
            page,
            limit,
            hasMore: total > skip + items.length
        };
    }

    async findOne(id: string, options?: { includeAuditLogs?: boolean }) {
        const includeAuditLogs = options?.includeAuditLogs ?? true;
        const order = await this.prisma.order.findUnique({
            where: { id },
            include: {
                parts: true,
                customer: { select: { id: true, name: true, email: true, phone: true } },
                acceptedOffer: { include: { store: true } },
                reviews: true,
                shipments: { orderBy: { createdAt: 'desc' } },
                offers: {
                    orderBy: { createdAt: 'asc' },
                    include: {
                        store: {
                            select: {
                                id: true,
                                name: true,
                                storeCode: true,
                                logo: true,
                                loyaltyTier: true,
                                rating: true,
                                _count: {
                                    select: {
                                        reviews: { where: { adminStatus: 'PUBLISHED' } },
                                    },
                                },
                            },
                        },
                    },
                },
                invoices: { 
                    orderBy: { issuedAt: 'desc' }
                },
                shippingWaybills: { orderBy: { issuedAt: 'desc' } },
                ...(includeAuditLogs
                    ? { auditLogs: { orderBy: { timestamp: 'desc' as const } } }
                    : {}),
                verificationDocuments: { orderBy: { createdAt: 'desc' } },
                shippingAddresses: { orderBy: { createdAt: 'asc' } },
                payments: {
                    select: { id: true, createdAt: true, status: true },
                    orderBy: { createdAt: 'asc' },
                },
                _count: {
                    select: { offers: true }
                }
            },
        });
        if (!order) throw new NotFoundException(`Order #${id} not found`);
        const withReview = this.attachLegacyReviewField(order);
        return this.attachActiveSlaToOrder(withReview);
    }

    async issueWaybillsForAdmin(
        orderId: string,
        adminId: string,
        dto: {
            mode: 'per_part' | 'single_batch' | 'custom';
            offerIds?: string[];
            groups?: { offerIds: string[] }[];
        },
    ) {
        return this.waybillsService.adminIssueWaybills(orderId, adminId, dto);
    }

    /**
     * Enhanced findOne with user role context for visibility filtering (2026 Blind Auction)
     */
    async findOneWithContext(id: string, user: any) {
        const includeAuditLogs = user?.role !== 'CUSTOMER';
        const order = await this.findOne(id, { includeAuditLogs });

        const now = new Date();
        
        // 1. Hide ALL offers from CUSTOMER if reveal time not reached AND not in selection phase
        if (user.role === 'CUSTOMER' && order.status !== OrderStatus.AWAITING_SELECTION && order.revealOffersAt && order.revealOffersAt > now) {
            order.offers = [];
            if (order._count) order._count.offers = 0;
        }

        // 2. Hide OTHER merchants' offers from VENDOR during bidding phase
        if (user.role === 'VENDOR' && (order.status === OrderStatus.COLLECTING_OFFERS || order.status === OrderStatus.AWAITING_SELECTION)) {
            const myStoreId = user.storeId;
            if (myStoreId) {
                order.offers = order.offers.filter(o => o.storeId === myStoreId);
                if (order._count) order._count.offers = order.offers.length;
            }
        }

        // Customer offer ranking: tier (desc) → rating (desc) → unit price (asc)
        if (user.role === 'CUSTOMER' && order.offers?.length) {
            const rank: Record<StoreLoyaltyTier, number> = {
                BASIC: 1,
                SILVER: 2,
                GOLD: 3,
                VIP: 4,
                ELITE: 5,
            };
            order.offers = [...order.offers].sort((a, b) => {
                const ta = rank[(a as any).store?.loyaltyTier as StoreLoyaltyTier] ?? 0;
                const tb = rank[(b as any).store?.loyaltyTier as StoreLoyaltyTier] ?? 0;
                if (tb !== ta) return tb - ta;
                const ra = Number((b as any).store?.rating ?? 0) - Number((a as any).store?.rating ?? 0);
                if (ra !== 0) return ra;
                return Number((a as any).unitPrice) - Number((b as any).unitPrice);
            });
        }

        if (order.offers?.length) {
            order.offers = this.enrichOffersWithCartBatch(order.offers as any[]) as any;
        }

        let shipmentBatches: Awaited<
            ReturnType<WaybillsService['buildShipmentBatchesForOrder']>
        > = [] as Awaited<ReturnType<WaybillsService['buildShipmentBatchesForOrder']>>;
        if (String(order.requestType || '').toLowerCase() === 'multiple') {
            try {
                shipmentBatches =
                    await this.waybillsService.buildShipmentBatchesForOrder(id);
            } catch (err) {
                this.logger.warn(
                    `shipmentBatches omitted for order ${id}: ${err instanceof Error ? err.message : err}`,
                );
            }
        }

        return { ...order, shipmentBatches };
    }

    async transitionStatus(
        orderId: string,
        newStatus: OrderStatus,
        actor: { id: string; type: ActorType; name?: string },
        reason?: string,
        metadata?: any
    ): Promise<Order> {
        const order = await this.findOne(orderId);

        if (
            newStatus === OrderStatus.CANCELLED &&
            actor.type === ActorType.CUSTOMER &&
            order.status !== OrderStatus.COLLECTING_OFFERS &&
            order.status !== OrderStatus.AWAITING_OFFERS
        ) {
            throw new ForbiddenException('Customer can only cancel during offer collection phase');
        }

        // 1. Validate Transition (Guard)
        this.fsm.validateTransition(order.status, newStatus);

        const durationCfg = await this.orderDurationConfig.getConfig();
        const selectionDeadlineAt =
            newStatus === OrderStatus.AWAITING_SELECTION
                ? new Date(Date.now() + this.orderDurationConfig.hoursToMs(durationCfg.offerSelectionHours))
                : undefined;

        const shouldSetCorrectionDeadline = newStatus === OrderStatus.CORRECTION_PERIOD;
        const correctionDeadlineAt = shouldSetCorrectionDeadline
            ? new Date(
                  Date.now() +
                      this.orderDurationConfig.hoursToMs(durationCfg.correctionPeriodHours),
              )
            : undefined;

        // 2. Transaction: Update Status + Audit Log
        // Status-conditional updateMany: cron + enforceExpiredSla cannot both win the same transition.
        let transitionApplied = true;
        const result = await this.prisma.$transaction(async (tx) => {
            // New 2026 Logic: Check all accepted offers for warranty (Multi-part support)
            const acceptedOffers = order.offers?.filter(o => ['accepted', 'ACCEPTED'].includes(o.status)) || [];
            const now = new Date();
            const warranty = resolveCompletionWarranty(acceptedOffers, now, newStatus);
            const effectiveStatus = warranty.effectiveStatus;
            const isTransitioningToWarranty = warranty.activate;

            const isFirstDeliveredTransition =
                newStatus === OrderStatus.DELIVERED &&
                effectiveStatus === OrderStatus.DELIVERED &&
                !order.deliveredAt;

            const applied = await tx.order.updateMany({
                where: { id: orderId, status: order.status },
                data: {
                    status: effectiveStatus,
                    updatedAt: now,
                    warranty_active_at: isTransitioningToWarranty ? now : undefined,
                    warranty_end_at: isTransitioningToWarranty ? warranty.endAt : undefined,
                    selectionDeadlineAt,
                    ...(correctionDeadlineAt ? { correctionDeadlineAt } : {}),
                    deliveredAt: isFirstDeliveredTransition ? now : undefined,
                },
            });

            if (applied.count === 0) {
                transitionApplied = false;
                const current = await tx.order.findUnique({ where: { id: orderId } });
                return current ?? order;
            }

            const updatedOrder = await tx.order.findUniqueOrThrow({
                where: { id: orderId },
            });

            // --- 2026 Risk Management: Update Customer Return Stats ---
            // If the order is newly DELIVERED, increment totalDeliveredOrders
            if (newStatus === OrderStatus.DELIVERED && order.status !== OrderStatus.DELIVERED) {
                await this.usersService.updateCustomerReturnStats(order.customerId, false, tx);
            }
            
            // If the order transitions to a NEGATIVE outcome after being delivered/completed
            const isNegativeOutcome = ([
                OrderStatus.RETURN_REQUESTED, 
                OrderStatus.RETURNED, 
                OrderStatus.DISPUTED
            ] as OrderStatus[]).includes(newStatus);

            const wasDeliveredOrCompleted = ([
                OrderStatus.DELIVERED, 
                OrderStatus.COMPLETED, 
                OrderStatus.WARRANTY_ACTIVE
            ] as OrderStatus[]).includes(order.status);

            if (isNegativeOutcome && wasDeliveredOrCompleted) {
                await this.usersService.updateCustomerReturnStats(order.customerId, true, tx);
            }
            // -----------------------------------------------------------

            await this.auditLogs.logAction({
                orderId: order.id,
                action: 'STATUS_CHANGE',
                entity: 'Order',
                actorType: actor.type,
                actorId: actor.id,
                actorName: actor.name,
                previousState: order.status,
                newState: effectiveStatus,
                reason,
                metadata,
            }, tx);

            return updatedOrder;
        }, { timeout: 15000 });

        if (!transitionApplied) {
            this.logger.warn(
                `transitionStatus skipped (lost race) order=${orderId} from=${order.status} to=${newStatus}`,
            );
            return result as Order;
        }

        const notifyStatus = (result as Order).status;

        if (
            result.status === OrderStatus.COMPLETED ||
            result.status === OrderStatus.WARRANTY_ACTIVE ||
            result.status === OrderStatus.WARRANTY_EXPIRED ||
            result.status === OrderStatus.CLOSED
        ) {
            void this.completionFinance.settleCompletedOrder(orderId).catch((err) => {
                this.logger.warn(
                    `Completion finance settlement failed for ${orderId}: ${
                        err instanceof Error ? err.message : String(err)
                    }`,
                );
            });
        }

        if (
            notifyStatus === OrderStatus.CANCELLED &&
            order.status !== OrderStatus.CANCELLED
        ) {
            void this.escrowService
                .refundPaidOrderOnCancel(
                    orderId,
                    reason || 'Order cancelled before shipping',
                    { previousStatus: order.status },
                )
                .catch((err) => {
                    this.logger.warn(
                        `Cancel refund failed for ${orderId}: ${
                            err instanceof Error ? err.message : String(err)
                        }`,
                    );
                });
        }

        // 3. Notification: Notify Customer & Merchant (Async)
        try {
            const statusMessagesAr: Record<string, string> = {
                [OrderStatus.AWAITING_SELECTION]: 'حان وقت الاختيار! 🛒 راجع العروض المتاحة واختر الأنسب لك قبل انتهاء المهلة.',
                [OrderStatus.PREPARATION]: 'بدأ الحماس! 🔥 القِطع الخاصة بك قيد التجهيز الآن بكل عناية.',
                [OrderStatus.DELAYED_PREPARATION]: 'تأخير في التجهيز ⏳ نعمل على تسريع تجهيز طلبك، شكراً لصبرك.',
                [OrderStatus.VERIFICATION]: 'طلبك قيد فحص القطعة والتوثيق 🔬 سنُعلمك بالنتيجة قريباً.',
                [OrderStatus.VERIFICATION_SUCCESS]: 'تم اعتماد التوثيق بنجاح ✅ طلبك يتقدم للمرحلة التالية.',
                [OrderStatus.NON_MATCHING]: 'نتيجة الفحص: غير مطابق ⚠️ يرجى متابعة التعليمات لتصحيح الطلب.',
                [OrderStatus.CORRECTION_PERIOD]: 'أنت في فترة التصحيح 🛠️ يرجى استكمال المطلوب قبل انتهاء المهلة.',
                [OrderStatus.SHIPPED]: 'انطلقت إليك! 🚀 طلبك الآن في الطريق، استعد لاستلام الجودة.',
                [OrderStatus.DELIVERED]: 'وصلت الأمانة! 🏠 نأمل أن تنال إعجابك، يومك سعيد بقطعك الجديدة.',
                [OrderStatus.COMPLETED]: 'اكتمل طلبك بنجاح 🎉 شكراً لثقتك بمنصة إي-تشليح.',
                [OrderStatus.WARRANTY_ACTIVE]: 'تم تفعيل الضمان على طلبك 🛡️ يمكنك متابعة مدة الحماية من تفاصيل الطلب.',
                [OrderStatus.CLOSED]: 'تم إغلاق الطلب. يمكنك دائماً إنشاء طلب جديد عند الحاجة.',
                [OrderStatus.CANCELLED]: 'تم إلغاء طلبك بنجاح. نتمنى خدمتك في أقرب وقت ممكن.',
                [OrderStatus.AWAITING_PAYMENT]: 'اختيار موفق! 👌 يرجى إتمام عملية الدفع لنبدأ في تجهيز طلبك فوراً.',
                [OrderStatus.RETURNED]: 'حقك محفوظ 🤝 تمت الموافقة على طلب الإرجاع الخاص بك، سنقوم باللازم فوراً.'
            };
            const statusMessagesEn: Record<string, string> = {
                [OrderStatus.AWAITING_SELECTION]: 'Time to choose! 🛒 Review available offers and pick the best one before the deadline.',
                [OrderStatus.PREPARATION]: 'The excitement begins! 🔥 Your items are being carefully prepared now.',
                [OrderStatus.DELAYED_PREPARATION]: 'Preparation delay ⏳ We are speeding up your order — thank you for your patience.',
                [OrderStatus.VERIFICATION]: 'Your order is under part verification 🔬 We will update you soon.',
                [OrderStatus.VERIFICATION_SUCCESS]: 'Verification approved ✅ Your order is moving to the next step.',
                [OrderStatus.NON_MATCHING]: 'Verification result: non-matching ⚠️ Please follow correction instructions.',
                [OrderStatus.CORRECTION_PERIOD]: 'You are in the correction window 🛠️ Complete the required steps before the deadline.',
                [OrderStatus.SHIPPED]: 'On its way! 🚀 Your order is now shipped and heading to you.',
                [OrderStatus.DELIVERED]: 'Delivered! 🏠 We hope you love it. Have a great day with your new items!',
                [OrderStatus.COMPLETED]: 'Your order is complete 🎉 Thank you for trusting E-TASHLEH.',
                [OrderStatus.WARRANTY_ACTIVE]: 'Warranty is now active on your order 🛡️ Track remaining protection from order details.',
                [OrderStatus.CLOSED]: 'This order has been closed. You can create a new request anytime.',
                [OrderStatus.CANCELLED]: 'Your order has been cancelled. We look forward to serving you again soon.',
                [OrderStatus.AWAITING_PAYMENT]: 'Great choice! 👌 Please complete payment to start processing your order right away.',
                [OrderStatus.RETURNED]: 'Your rights are protected 🤝 Your return request has been approved.'
            };

            // Lock vendor–customer chat on terminal statuses (cancel / complete / warranty)
            if (shouldCloseOrderChat(newStatus) || shouldCloseOrderChat(notifyStatus)) {
                this.afterOrderReachedCompletion(orderId);
            }

            const verificationStatuses = new Set<OrderStatus>([
                OrderStatus.VERIFICATION,
                OrderStatus.VERIFICATION_SUCCESS,
                OrderStatus.NON_MATCHING,
                OrderStatus.CORRECTION_PERIOD,
            ]);
            // 3.1 Notify Customer (system CANCELLED uses cleanup-specific copy — skip generic here)
            const skipSystemCancelCustomer =
                notifyStatus === OrderStatus.CANCELLED && actor.type === ActorType.SYSTEM;
            if (statusMessagesAr[notifyStatus] && !skipSystemCancelCustomer) {
                const isVerificationStatus = verificationStatuses.has(notifyStatus);
                let messageAr = statusMessagesAr[notifyStatus];
                let messageEn = statusMessagesEn[notifyStatus];
                // Include return/dispute grace window on delivery (was missing — only partial multi-item mentioned it)
                if (notifyStatus === OrderStatus.DELIVERED) {
                    const returnHours = await this.orderDurationConfig.getReturnWindowHours();
                    messageAr = `وصلت الأمانة! 🏠 لديك ${returnHours} ساعة لطلب الإرجاع أو فتح نزاع إن لزم الأمر. نأمل أن تنال إعجابك.`;
                    messageEn = `Delivered! 🏠 You have ${returnHours} hours to request a return or open a dispute if needed. We hope you love it!`;
                }
                await this.notifications.create({
                    recipientId: order.customerId,
                    recipientRole: 'CUSTOMER',
                    titleAr: 'تحديث حالة الطلب #' + order.orderNumber,
                    titleEn: 'Order Status Update #' + order.orderNumber,
                    messageAr,
                    messageEn,
                    type: 'ORDER',
                    link: `/dashboard/orders/${order.id}`,
                    metadata: {
                        orderId: order.id,
                        status: notifyStatus,
                        waEvent: isVerificationStatus ? 'VERIFICATION' : 'ORDER_STATUS',
                        ...(isVerificationStatus ? { verification: true } : {}),
                        ...(notifyStatus === OrderStatus.DELIVERED ? { graceWindow: true } : {}),
                    },
                });
            }

            // 3.1.5 Notify All Bidding Merchants about AWAITING_SELECTION (Reveal phase)
            if (newStatus === OrderStatus.AWAITING_SELECTION) {
                const biddingMerchants = await this.prisma.offer.findMany({
                    where: { orderId: order.id },
                    select: { store: { select: { ownerId: true } } },
                    distinct: ['storeId'],
                });

                for (const bidder of biddingMerchants) {
                    if (bidder.store?.ownerId) {
                        await this.notifications.create({
                            recipientId: bidder.store.ownerId,
                            recipientRole: 'MERCHANT',
                            titleAr: `تم كشف العروض للطلب #${order.orderNumber}`,
                            titleEn: `Offers Revealed for Order #${order.orderNumber}`,
                            messageAr: `انتهت فترة جمع العروض. طلب العميل متاح الآن للاختيار، وعرضك قيد المراجعة.`,
                            messageEn: `The collection period has ended. The order is now open for selection, and your offer is under review.`,
                            type: 'ORDER',
                            link: `/merchant/orders/${order.id}`,
                            metadata: { orderId: order.id, status: newStatus, waEvent: 'OFFER_REVEAL' },
                        }).catch(() => {});
                    }
                }
            }

            // 3.2 Notify Merchant (accepted offer — broader lifecycle coverage)
            const merchantNotifyStatuses: OrderStatus[] = [
                OrderStatus.PREPARATION,
                OrderStatus.DELAYED_PREPARATION,
                OrderStatus.VERIFICATION,
                OrderStatus.VERIFICATION_SUCCESS,
                OrderStatus.NON_MATCHING,
                OrderStatus.CORRECTION_PERIOD,
                OrderStatus.SHIPPED,
                OrderStatus.DELIVERED,
                OrderStatus.CANCELLED,
                OrderStatus.RETURNED,
                OrderStatus.COMPLETED,
                OrderStatus.WARRANTY_ACTIVE,
            ];
            if (order.acceptedOfferId && merchantNotifyStatuses.includes(notifyStatus)) {
                let merchantOwnerId = null;
                const orderWithRelations = order as any;

                if (orderWithRelations.offers && orderWithRelations.offers.length > 0) {
                    const accepted = orderWithRelations.offers.find((o) => o.id === order.acceptedOfferId);
                    if (accepted && accepted.store) merchantOwnerId = accepted.store.ownerId;
                } else if (orderWithRelations.acceptedOffer && orderWithRelations.acceptedOffer.store) {
                    merchantOwnerId = orderWithRelations.acceptedOffer.store.ownerId;
                } else {
                    const offerFetch = await this.prisma.offer.findUnique({
                        where: { id: order.acceptedOfferId },
                        include: { store: true },
                    });
                    if (offerFetch?.store?.ownerId) merchantOwnerId = offerFetch.store.ownerId;
                }

                if (merchantOwnerId) {
                    const mTitleAr = `تحديث بخصوص الطلب #${order.orderNumber}`;
                    const mTitleEn = `Update for Order #${order.orderNumber}`;
                    let mMsgAr = statusMessagesAr[notifyStatus] || `تم تحديث حالة الطلب إلى ${notifyStatus}.`;
                    let mMsgEn = statusMessagesEn[notifyStatus] || `Order status updated to ${notifyStatus}.`;

                    if (notifyStatus === OrderStatus.PREPARATION) {
                        mMsgAr = 'تم تأكيد الدفع من العميل. يرجى البدء بتجهيز الشحنة.';
                        mMsgEn = 'Customer payment confirmed. Please begin preparing the shipment.';
                    } else if (notifyStatus === OrderStatus.CANCELLED) {
                        mMsgAr = 'تم توقيف أو إلغاء الطلب من قبل النظام أو العميل.';
                        mMsgEn = 'The order was cancelled by the system or customer.';
                    } else if (notifyStatus === OrderStatus.RETURNED) {
                        mMsgAr = 'تم تحديث حالة الطلب إلى (مرتجع).';
                        mMsgEn = 'The order status was updated to (Returned).';
                    }

                    const isVerificationStatus = verificationStatuses.has(notifyStatus);

                    await this.notifications.create({
                        recipientId: merchantOwnerId,
                        recipientRole: 'MERCHANT',
                        titleAr: mTitleAr,
                        titleEn: mTitleEn,
                        messageAr: mMsgAr,
                        messageEn: mMsgEn,
                        type: 'ORDER',
                        link: `/merchant/orders/${order.id}`,
                        metadata: {
                            orderId: order.id,
                            status: notifyStatus,
                            waEvent: isVerificationStatus ? 'VERIFICATION' : 'ORDER_STATUS',
                            ...(isVerificationStatus ? { verification: true } : {}),
                        },
                    });
                }
            }

            // 3.3 Notify Admins about ANY status transition (Oversight Policy)
            await this.notifications.notifyAdmins({
                titleAr: `تحديث حالة الطلب #${order.orderNumber}`,
                titleEn: `Order #${order.orderNumber} Status Updated`,
                messageAr: `تغيرت حالة الطلب إلى: ${notifyStatus}. المنفذ: ${actor.name || actor.type}`,
                messageEn: `Order status changed to: ${notifyStatus}. Actor: ${actor.name || actor.type}`,
                type: 'ORDER',
                link: `/admin/orders/${order.id}`,
                metadata: { orderId: order.id, status: notifyStatus, actor: actor.type }
            });

            // --- 2026 Selection Context: Chat System Message ---
            if (newStatus === OrderStatus.AWAITING_SELECTION) {
                try {
                    // Find all chats for this order
                    const orderChats = await this.prisma.orderChat.findMany({
                        where: { orderId: order.id, type: 'order' }
                    });

                    for (const chat of orderChats) {
                        const msgAr = '🚨 تم كشف العروض! حان وقت الاختيار. لديك 24 ساعة لاختيار العرض المناسب قبل إغلاق الطلب تلقائياً.';
                        const msgEn = '🚨 Offers Revealed! It is time to choose. You have 24 hours to select the best offer before the order is auto-cancelled.';
                        
                        await this.chatService.sendMessage(
                            chat.id, 
                            null, // SYSTEM
                            msgAr,
                            'SYSTEM',
                            undefined, undefined, undefined, undefined,
                            'Offers Revealed'
                        );

                        // [2026] Extend Chat Expiry to match Selection Deadline
                        await this.prisma.orderChat.update({
                            where: { id: chat.id },
                            data: { expiryAt: new Date(Date.now() + 24 * 60 * 60 * 1000) }
                        });
                    }
                } catch (chatErr) {
                    console.error('Failed to update reveal system messages/expiry:', chatErr);
                }
            }
        } catch (e) {
            console.error('Failed to send notification', e);
        }

        return result;
    }

    async acceptOffer(orderId: string, offerId: string, customerId: string): Promise<Order> {
        const order = await this.findOne(orderId);

        // Ownership: a customer may only accept offers on their OWN order (IDOR fix).
        if (order.customerId !== customerId) {
            throw new ForbiddenException('You can only accept offers for your own orders');
        }

        // 1. Validate Transition
        this.fsm.validateTransition(order.status, OrderStatus.AWAITING_PAYMENT);

        // 2. Transaction
        const paymentCfg = await this.orderDurationConfig.getConfig();
        const paymentDeadline = new Date(
            Date.now() + this.orderDurationConfig.hoursToMs(paymentCfg.paymentTimeoutHours),
        );

        const result = await this.prisma.$transaction(async (tx) => {
            // Lock the order row so two concurrent accepts can't both win.
            await tx.$executeRaw`SELECT id FROM orders WHERE id = ${orderId}::uuid FOR UPDATE`;

            // Atomically claim the offer ONLY if it belongs to this order and is still pending.
            const claimed = await tx.offer.updateMany({
                where: { id: offerId, orderId, status: 'pending' },
                data: { status: 'accepted' },
            });
            if (claimed.count === 0) {
                throw new BadRequestException('Offer is not available for acceptance on this order');
            }

            // Auto-reject sibling offers on the same part
            const acceptedOffer = await tx.offer.findUnique({
                where: { id: offerId },
                select: { orderPartId: true }
            });
            if (acceptedOffer?.orderPartId) {
                await tx.offer.updateMany({
                    where: {
                        orderPartId: acceptedOffer.orderPartId,
                        id: { not: offerId },
                        status: 'pending'
                    },
                    data: { status: 'rejected' }
                });
            }

            // Enforce payment deadline from platform config
            // Link Offer and Update Status
            const updatedOrder = await tx.order.update({
                where: { id: orderId },
                data: {
                    status: OrderStatus.AWAITING_PAYMENT,
                    acceptedOfferId: offerId,
                    paymentDeadlineAt: paymentDeadline
                },
                include: { acceptedOffer: true }
            });

            // Log
            await this.auditLogs.logAction({
                orderId: order.id,
                action: 'ACCEPT_OFFER',
                entity: 'Order',
                actorType: ActorType.CUSTOMER,
                actorId: customerId,
                actorName: 'Customer',
                previousState: order.status,
                newState: OrderStatus.AWAITING_PAYMENT,
                reason: `Accepted offer ${offerId}`,
                metadata: { offerId },
            }, tx);

            return updatedOrder;
        }, { timeout: 15000 });

        // 3. Close other chats (Exclusivity Rule)
        try {
            // We need the vendor ID of the accepted offer
            const offer = await this.prisma.offer.findUnique({
                where: { id: offerId },
                include: { store: true }
            });
            if (offer) {
                await this.chatService.closeOtherChats(orderId, offer.storeId);

                // Notify Winning Merchant
                if (offer.store?.ownerId) {
                    await this.notifications.create({
                        recipientId: offer.store.ownerId,
                        recipientRole: 'MERCHANT',
                        titleAr: 'عُرضك تم قبوله!',
                        titleEn: 'Your offer was accepted!',
                        messageAr: `وافق العميل للتو على عرضك للطلب #${order.orderNumber}. بانتظار إتمام عملية الدفع.`,
                        messageEn: `The customer just accepted your offer for Order #${order.orderNumber}. Awaiting payment.`,
                        type: 'ORDER',
                        link: `/merchant/orders/${order.id}`,
                        metadata: {
                            orderId: order.id,
                            orderNumber: order.orderNumber,
                            offerId,
                            waEvent: 'OFFER_ACCEPTED',
                        },
                    }).catch(e => console.error('Failed to notify merchant of acceptance', e));
                }

                // Notify customer — awaiting payment (WhatsApp via NotificationsService)
                await this.notifications.create({
                    recipientId: customerId,
                    recipientRole: 'CUSTOMER',
                    titleAr: 'تم قبول العرض — بانتظار الدفع',
                    titleEn: 'Offer accepted — awaiting payment',
                    messageAr: `تم قبول العرض للطلب #${order.orderNumber}. يرجى إتمام الدفع خلال المهلة المحددة.`,
                    messageEn: `An offer was accepted for Order #${order.orderNumber}. Please complete payment within the deadline.`,
                    type: 'ORDER',
                    link: `/dashboard/orders/${order.id}`,
                    metadata: {
                        orderId: order.id,
                        orderNumber: order.orderNumber,
                        offerId,
                        waEvent: 'OFFER_ACCEPTED',
                    },
                }).catch(e => console.error('Failed to notify customer of acceptance', e));

                // Notify Losing Merchants (Reject Offers)
                const losingOffers = await this.prisma.offer.findMany({
                    where: {
                        orderId: orderId,
                        id: { not: offerId },
                        status: 'rejected' // Those just updated
                    },
                    include: { store: true }
                });

                for (const losingOffer of losingOffers) {
                    if (losingOffer.store?.ownerId) {
                        await this.notifications.create({
                            recipientId: losingOffer.store.ownerId,
                            recipientRole: 'MERCHANT',
                            titleAr: 'تم رفض عرضك',
                            titleEn: 'Your offer was rejected',
                            messageAr: `نأسف، لقد قام العميل باختيار عرض آخر للطلب #${order.orderNumber}. حظاً أوفر المرة القادمة!`,
                            messageEn: `Sorry, the customer selected another offer for Order #${order.orderNumber}. Better luck next time!`,
                            type: 'ORDER',
                            link: `/dashboard/orders/${order.id}`,
                            metadata: {
                                orderId: order.id,
                                orderNumber: order.orderNumber,
                                waEvent: 'ORDER_STATUS',
                            },
                        }).catch(e => console.error('Failed to notify merchant of explicit rejection', e));
                    }
                }
            }
        } catch (e) {
            console.error('Failed to close other chats or notify', e);
        }

        return result;
    }

    /**
     * Idempotent near-realtime SLA / timer enforcement for one order.
     * Mirrors minute/hourly cron transitions; cron remains the safety net.
     * Server clock + FSM only — clients never cancel locally.
     */
    async enforceExpiredSla(
        orderId: string,
        actor: { id: string; type: ActorType; name?: string },
    ): Promise<{ changed: boolean; order: Order; reason?: string }> {
        const order = await this.prisma.order.findUnique({
            where: { id: orderId },
            include: {
                offers: {
                    where: { status: { not: 'rejected' } },
                    select: {
                        id: true,
                        status: true,
                        storeId: true,
                        orderPartId: true,
                        fulfillmentStatus: true,
                        deliveredAt: true,
                        resolutionLocked: true,
                        shippedFromCart: true,
                    },
                },
                parts: { select: { id: true, name: true } },
                payments: {
                    where: { status: { in: ['SUCCESS', 'COMPLETED'] } },
                    orderBy: { createdAt: 'asc' },
                    take: 1,
                    select: { createdAt: true, paidAt: true, status: true },
                },
                store: { select: { id: true, ownerId: true } },
            },
        });
        if (!order) throw new NotFoundException('Order not found');

        const terminal = new Set<OrderStatus>([
            OrderStatus.CANCELLED,
            OrderStatus.CLOSED,
            OrderStatus.REFUNDED,
            OrderStatus.COMPLETED,
            OrderStatus.WARRANTY_EXPIRED,
        ]);
        if (terminal.has(order.status as OrderStatus)) {
            return { changed: false, order, reason: 'already_terminal' };
        }

        const durationCfg = await this.orderDurationConfig.getConfig();
        const status = order.status as OrderStatus;
        const systemActor =
            actor.type === ActorType.SYSTEM
                ? actor
                : { type: ActorType.SYSTEM, id: 'system-sla-enforce', name: 'SLA Enforce' };
        const meta = { triggeredBy: actor.id, triggerActorType: actor.type, source: 'enforceExpiredSla' };
        const expired = this.orderSla.isSlaExpired(order, durationCfg);

        // --- Collection → reveal or cancel ---
        if (status === OrderStatus.COLLECTING_OFFERS || status === OrderStatus.AWAITING_OFFERS) {
            if (!expired) return { changed: false, order, reason: 'not_expired' };
            const hasOffers = order.offers.length > 0;
            if (!hasOffers) {
                const updated = await this.transitionStatus(
                    orderId,
                    OrderStatus.CANCELLED,
                    systemActor,
                    'System: No offers received after collection window.',
                    meta,
                );
                await this.notifications
                    .notifyWithDedup(
                        order.customerId,
                        `wa:ORDER_STATUS:${order.id}:CANCELLED:collection_ended_no_offers`,
                        120,
                        {
                            recipientId: order.customerId,
                            recipientRole: 'CUSTOMER',
                            titleAr: 'انتهت مهلة جمع العروض',
                            titleEn: 'Collection Period Ended',
                            messageAr: `نعتذر منك، لم يتم استلام أي عروض للطلب رقم #${order.orderNumber}. تم إغلاق الطلب تلقائياً.`,
                            messageEn: `We apologize, no offers were received for order #${order.orderNumber}. The order has been closed automatically.`,
                            type: 'system_alert',
                            link: `/dashboard/orders/${order.id}`,
                            metadata: {
                                orderId: order.id,
                                orderNumber: order.orderNumber,
                                waEvent: 'ORDER_STATUS',
                                status: 'CANCELLED',
                            },
                        },
                    )
                    .catch((e) =>
                        this.logger.warn(`enforce notify failed: ${e?.message || e}`),
                    );
                return { changed: true, order: updated, reason: 'cancelled_no_offers' };
            }
            if (status === OrderStatus.COLLECTING_OFFERS) {
                const updated = await this.transitionStatus(
                    orderId,
                    OrderStatus.AWAITING_SELECTION,
                    systemActor,
                    'System: Reveal time reached. Transitioning to Selection phase.',
                    meta,
                );
                return { changed: true, order: updated, reason: 'revealed_selection' };
            }
            // Legacy AWAITING_OFFERS cannot FSM-transition to AWAITING_SELECTION
            return { changed: false, order, reason: 'not_expired' };
        }

        // --- Selection cancel ---
        if (status === OrderStatus.AWAITING_SELECTION) {
            if (order.offers.length > 0 && !expired) {
                return { changed: false, order, reason: 'not_expired' };
            }
            const noOffers = order.offers.length === 0;
            const updated = await this.transitionStatus(
                orderId,
                OrderStatus.CANCELLED,
                systemActor,
                noOffers
                    ? 'System: No offers received after collection window.'
                    : `System: Selection period expired (${durationCfg.offerSelectionHours}h). Customer failed to choose an offer.`,
                meta,
            );
            const dedupKey = noOffers
                ? `wa:ORDER_STATUS:${order.id}:CANCELLED:selection_ended_no_offers`
                : `wa:ORDER_STATUS:${order.id}:CANCELLED:selection_ended`;
            await this.notifications
                .notifyWithDedup(order.customerId, dedupKey, 120, {
                    recipientId: order.customerId,
                    recipientRole: 'CUSTOMER',
                    titleAr: noOffers ? 'انتهت مهلة جمع العروض' : 'انتهت مهلة اختيار العرض',
                    titleEn: noOffers ? 'Collection Period Ended' : 'Selection Period Expired',
                    messageAr: noOffers
                        ? `نعتذر منك، لم يتم استلام أي عروض للطلب رقم #${order.orderNumber}. تم إغلاق الطلب تلقائياً.`
                        : `انتهت المهلة المتاحة لاختيار عرض للطلب رقم (#${order.orderNumber}). تم إغلاق الطلب تلقائياً.`,
                    messageEn: noOffers
                        ? `We apologize, no offers were received for order #${order.orderNumber}. The order has been closed automatically.`
                        : `The deadline to select an offer for order (#${order.orderNumber}) has expired. The order has been closed automatically.`,
                    type: 'system_alert',
                    link: `/dashboard/orders/${order.id}`,
                    metadata: {
                        orderId: order.id,
                        orderNumber: order.orderNumber,
                        waEvent: 'ORDER_STATUS',
                        status: 'CANCELLED',
                    },
                })
                .catch((e) => this.logger.warn(`enforce notify failed: ${e?.message || e}`));
            return { changed: true, order: updated, reason: 'cancelled_selection' };
        }

        // --- Payment cancel ---
        if (status === OrderStatus.AWAITING_PAYMENT || status === OrderStatus.PARTIALLY_PAID) {
            if (!expired) return { changed: false, order, reason: 'not_expired' };
            const updated = await this.transitionStatus(
                orderId,
                OrderStatus.CANCELLED,
                systemActor,
                `System: Payment period expired after ${durationCfg.paymentTimeoutHours} hours`,
                meta,
            );
            await this.violationsService.autoIssue({
                code: 'ACCEPT_OFFER_NO_PAYMENT',
                targetUserId: order.customerId,
                targetType: ViolationTargetType.CUSTOMER,
                orderId: order.id,
                reason: `Customer accepted offer for order #${order.orderNumber} but did not pay within deadline.`,
                metadata: { orderNumber: order.orderNumber },
            }).catch((e) => this.logger.warn(`enforce payment violation failed: ${e?.message || e}`));
            await this.notifications
                .notifyWithDedup(
                    order.customerId,
                    `wa:ORDER_STATUS:${order.id}:CANCELLED:payment_ended`,
                    120,
                    {
                        recipientId: order.customerId,
                        recipientRole: 'CUSTOMER',
                        titleAr: 'انتهت مهلة الدفع',
                        titleEn: 'Payment Period Expired',
                        messageAr: `انتهت مهلة دفع الطلب #${order.orderNumber}. تم إلغاء الطلب تلقائياً.`,
                        messageEn: `Payment deadline for order #${order.orderNumber} expired. The order was cancelled automatically.`,
                        type: 'system_alert',
                        link: `/dashboard/orders/${order.id}`,
                        metadata: {
                            orderId: order.id,
                            orderNumber: order.orderNumber,
                            waEvent: 'ORDER_STATUS',
                            status: 'CANCELLED',
                        },
                    },
                )
                .catch((e) => this.logger.warn(`enforce notify failed: ${e?.message || e}`));
            return { changed: true, order: updated, reason: 'cancelled_payment' };
        }

        // --- Preparation: assembly-cart hard limit, then 48h → delayed ---
        if (status === OrderStatus.PREPARATION) {
            const assemblyDays = await this.orderDurationConfig.getAssemblyCartDays();
            const assemblyMs = assemblyDays * 24 * 60 * 60 * 1000;
            const paidAtMs =
                (order.payments[0]?.paidAt
                    ? new Date(order.payments[0].paidAt).getTime()
                    : null) ??
                (order.payments[0]?.createdAt
                    ? new Date(order.payments[0].createdAt).getTime()
                    : null) ??
                new Date(order.updatedAt).getTime();

            if (Date.now() - paidAtMs >= assemblyMs) {
                if (String(order.requestType || '').toLowerCase() === 'multiple') {
                    const pendingOfferIds = order.offers
                        .filter((o) => o.status === 'accepted' && !o.shippedFromCart)
                        .map((o) => o.id);
                    if (pendingOfferIds.length > 0) {
                        await this.requestShipping(order.customerId, [], pendingOfferIds, true);
                    }
                    const refreshed = await this.prisma.order.findUnique({ where: { id: orderId } });
                    return {
                        changed: true,
                        order: refreshed ?? order,
                        reason: 'assembly_auto_ship',
                    };
                }

                const updated = await this.transitionStatus(
                    orderId,
                    OrderStatus.CANCELLED,
                    systemActor,
                    `System: Auto-cancelled after ${assemblyDays} days without preparation`,
                    meta,
                );
                for (const offer of order.offers.filter((o) => o.status === 'accepted' && o.storeId)) {
                    const store = await this.prisma.store.findUnique({
                        where: { id: offer.storeId! },
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
                        }).catch((e) => this.logger.warn(`assembly cancel violation failed: ${e?.message || e}`));
                    }
                }
                await this.notifications.create({
                    recipientId: order.customerId,
                    recipientRole: 'CUSTOMER',
                    titleAr: 'تم إلغاء طلبك لعدم استجابة التاجر',
                    titleEn: 'Order Cancelled: Merchant Inaction',
                    messageAr: `تم إلغاء الطلب #${order.orderNumber} تلقائياً لعدم تجهيزه خلال مهلة ${assemblyDays} أيام.`,
                    messageEn: `Order #${order.orderNumber} was auto-cancelled as the merchant failed to prepare it within ${assemblyDays} days.`,
                    type: 'system_alert',
                    link: `/dashboard/orders/${order.id}`,
                }).catch(() => undefined);
                return { changed: true, order: updated, reason: 'assembly_auto_cancel' };
            }

            if (!expired) return { changed: false, order, reason: 'not_expired' };
            const graceMs = this.orderDurationConfig.hoursToMs(durationCfg.delayedPreparationGraceHours);
            const delayedDeadline = new Date(Date.now() + graceMs);
            const updated = await this.transitionStatus(
                orderId,
                OrderStatus.DELAYED_PREPARATION,
                systemActor,
                'Merchant exceeded preparation SLA timeframe',
                meta,
            );
            await this.prisma.order.update({
                where: { id: orderId },
                data: { delayedPreparationDeadlineAt: delayedDeadline },
            });
            for (const offer of order.offers.filter((o) => o.status === 'accepted' && o.storeId)) {
                await this.notifications.notifyMerchantByStoreId(offer.storeId!, {
                    titleAr: 'تحذير عاجل: لقد تأخرت في التجهيز',
                    titleEn: 'Urgent: Delayed Preparation SLA',
                    messageAr: `تجاوز الطلب #${order.orderNumber} مهلة التجهيز. أمامك مهلة إضافية قبل الإلغاء التلقائي.`,
                    messageEn: `Order #${order.orderNumber} exceeded prep SLA. Extra grace period started before auto-cancel.`,
                    type: 'system_alert',
                    link: `/merchant/orders/${order.id}`,
                }).catch(() => undefined);
            }
            const refreshed = await this.prisma.order.findUnique({ where: { id: orderId } });
            return { changed: true, order: refreshed ?? updated, reason: 'delayed_preparation' };
        }

        // --- Delayed prep cancel ---
        if (status === OrderStatus.DELAYED_PREPARATION) {
            if (!expired) return { changed: false, order, reason: 'not_expired' };
            const updated = await this.transitionStatus(
                orderId,
                OrderStatus.CANCELLED,
                systemActor,
                'System: Exceeded extra grace period for preparation. Order abandoned by merchant.',
                meta,
            );
            for (const offer of order.offers.filter((o) => o.status === 'accepted' && o.storeId)) {
                const store = await this.prisma.store.findUnique({
                    where: { id: offer.storeId! },
                    select: { id: true, ownerId: true },
                });
                if (store) {
                    await this.violationsService.autoIssue({
                        code: 'LATE_SHIPPING',
                        targetUserId: store.ownerId,
                        targetStoreId: store.id,
                        targetType: ViolationTargetType.MERCHANT,
                        orderId: order.id,
                        reason: `Merchant exceeded preparation SLA on order #${order.orderNumber}.`,
                        metadata: { orderNumber: order.orderNumber },
                        dedupSuffix: store.id,
                    }).catch((e) => this.logger.warn(`enforce late shipping violation failed: ${e?.message || e}`));
                }
            }
            await this.notifications.create({
                recipientId: order.customerId,
                recipientRole: 'CUSTOMER',
                titleAr: 'إلغاء الطلب لعدم استجابة التاجر',
                titleEn: 'Order Cancelled: Merchant Missed Prep Deadline',
                messageAr: `تم إلغاء الطلب #${order.orderNumber} لعدم التزام التاجر بوقت التجهيز.`,
                messageEn: `Order #${order.orderNumber} was cancelled because the merchant missed the preparation deadline.`,
                type: 'ORDER',
                link: `/dashboard/orders/${order.id}`,
                metadata: { orderId: order.id, orderNumber: order.orderNumber, waEvent: 'ORDER_STATUS', status: 'CANCELLED' },
            }).catch(() => undefined);
            return { changed: true, order: updated, reason: 'cancelled_delayed_prep' };
        }

        // --- Non-matching → correction ---
        if (status === OrderStatus.NON_MATCHING) {
            if (!expired) return { changed: false, order, reason: 'not_expired' };
            const updated = await this.transitionStatus(
                orderId,
                OrderStatus.CORRECTION_PERIOD,
                systemActor,
                'System: Non-matching grace elapsed, entering CORRECTION_PERIOD.',
                meta,
            );
            return { changed: true, order: updated, reason: 'correction_period' };
        }

        // --- Correction timeout cancel ---
        if (status === OrderStatus.CORRECTION_PERIOD) {
            if (!expired) return { changed: false, order, reason: 'not_expired' };
            const updated = await this.transitionStatus(
                orderId,
                OrderStatus.CANCELLED,
                systemActor,
                'System: Merchant failed to provide corrected verification within correction limit.',
                meta,
            );
            if (order.storeId) {
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
                        reason: `Merchant did not provide corrected verification within deadline on order #${order.orderNumber}.`,
                        metadata: { orderNumber: order.orderNumber },
                    }).catch((e) => this.logger.warn(`enforce late correction violation failed: ${e?.message || e}`));
                }
            }
            await this.notifications.create({
                recipientId: order.customerId,
                recipientRole: 'CUSTOMER',
                titleAr: 'إلغاء الطلب واسترجاع المبلغ',
                titleEn: 'Order Cancelled & Refunded',
                messageAr: `تم إلغاء طلبك #${order.orderNumber} لعدم تمكن البائع من تقديم القطعة المطابقة.`,
                messageEn: `Order #${order.orderNumber} cancelled as the seller failed to provide a matching part.`,
                type: 'ORDER',
                link: `/dashboard/orders/${order.id}`,
                metadata: { orderId: order.id, orderNumber: order.orderNumber, waEvent: 'ORDER_STATUS', status: 'CANCELLED' },
            }).catch(() => undefined);
            return { changed: true, order: updated, reason: 'cancelled_correction' };
        }

        // --- Delivered return window → COMPLETED (single-item) ---
        if (status === OrderStatus.DELIVERED) {
            if (this.offerFulfillment.isMultiItemOrder(order)) {
                // Multi: complete per-offer windows then re-read
                let any = false;
                for (const offer of order.offers) {
                    if (
                        offer.fulfillmentStatus !== OfferFulfillmentStatus.DELIVERED ||
                        !offer.deliveredAt ||
                        offer.resolutionLocked
                    ) {
                        continue;
                    }
                    const ends = this.offerFulfillment.getOfferReturnWindowEndsAt(offer);
                    if (!ends || ends.getTime() > Date.now()) continue;
                    const result = await this.offerFulfillment.completeOfferAfterWindow(offer.id);
                    if (result) {
                        any = true;
                        const payment = await this.prisma.paymentTransaction.findFirst({
                            where: { offerId: offer.id, status: 'SUCCESS' },
                        });
                        if (payment) {
                            await this.escrowService
                                .releaseFundsForPayment(payment.id, 'AUTO_48H')
                                .catch((e) => this.logger.warn(`Escrow release skipped: ${e?.message}`));
                        }
                    }
                }
                const refreshed = await this.prisma.order.findUnique({ where: { id: orderId } });
                return {
                    changed: any || refreshed?.status !== status,
                    order: refreshed ?? order,
                    reason: any ? 'offer_windows_completed' : 'not_expired',
                };
            }
            if (!expired) return { changed: false, order, reason: 'not_expired' };
            const returnHours = await this.orderDurationConfig.getReturnWindowHours();
            const updated = await this.transitionStatus(
                orderId,
                OrderStatus.COMPLETED,
                systemActor,
                `System: Auto-completed after ${returnHours}-hour return/dispute window expired`,
                meta,
            );
            await this.notifications.create({
                recipientId: order.customerId,
                recipientRole: 'CUSTOMER',
                titleAr: 'انتهاء فترة الاسترجاع للطلب',
                titleEn: 'Return period expired for order',
                messageAr: `تم اكتمال الطلب رقم #${order.orderNumber} بنجاح نظراً لمرور مهلة الإرجاع أو النزاع.`,
                messageEn: `Order #${order.orderNumber} has been completed because the return/dispute window expired.`,
                type: 'system_alert',
                link: `/dashboard/orders/${order.id}`,
                metadata: { orderId: order.id, waEvent: 'ORDER_STATUS', graceWindowExpired: true },
            }).catch(() => undefined);
            return { changed: true, order: updated, reason: 'completed_return_window' };
        }

        // --- Partial delivery: per-offer windows ---
        if (status === OrderStatus.PARTIALLY_DELIVERED) {
            let any = false;
            for (const offer of order.offers) {
                if (
                    offer.fulfillmentStatus !== OfferFulfillmentStatus.DELIVERED ||
                    !offer.deliveredAt ||
                    offer.resolutionLocked
                ) {
                    continue;
                }
                const ends = this.offerFulfillment.getOfferReturnWindowEndsAt(offer);
                if (!ends || ends.getTime() > Date.now()) continue;
                const result = await this.offerFulfillment.completeOfferAfterWindow(offer.id);
                if (result) {
                    any = true;
                    const payment = await this.prisma.paymentTransaction.findFirst({
                        where: { offerId: offer.id, status: 'SUCCESS' },
                    });
                    if (payment) {
                        await this.escrowService
                            .releaseFundsForPayment(payment.id, 'AUTO_48H')
                            .catch((e) => this.logger.warn(`Escrow release skipped: ${e?.message}`));
                    }
                }
            }
            const refreshed = await this.prisma.order.findUnique({ where: { id: orderId } });
            return {
                changed: any || refreshed?.status !== status,
                order: refreshed ?? order,
                reason: any ? 'offer_windows_completed' : 'not_expired',
            };
        }

        // --- Warranty expiry ---
        if (status === OrderStatus.WARRANTY_ACTIVE) {
            const endAt = order.warranty_end_at ? new Date(order.warranty_end_at).getTime() : null;
            if (endAt == null || endAt > Date.now()) {
                return { changed: false, order, reason: 'not_expired' };
            }
            try {
                const updated = await this.transitionStatus(
                    orderId,
                    OrderStatus.WARRANTY_EXPIRED,
                    systemActor,
                    'System: Warranty period ended.',
                    meta,
                );
                await this.notifications.create({
                    recipientId: order.customerId,
                    recipientRole: 'CUSTOMER',
                    titleAr: 'انتهاء فترة الضمان',
                    titleEn: 'Warranty Period Expired',
                    messageAr: `انتهت فترة الضمان الخاصة بطلبك #${order.orderNumber}.`,
                    messageEn: `The warranty period for order #${order.orderNumber} has expired.`,
                    type: 'ORDER_UPDATE',
                    link: `/dashboard/orders/${order.id}`,
                }).catch(() => undefined);
                return { changed: true, order: updated, reason: 'warranty_expired' };
            } catch (e) {
                // Fallback if FSM rejects — match legacy warranty scheduler write
                const updated = await this.prisma.order.update({
                    where: { id: orderId },
                    data: { status: OrderStatus.WARRANTY_EXPIRED, updatedAt: new Date() },
                });
                return { changed: true, order: updated, reason: 'warranty_expired' };
            }
        }

        // SHIPPED / PARTIALLY_SHIPPED countdowns are display SLAs (no auto status change)
        return { changed: false, order, reason: 'not_expired' };
    }

    async acceptOfferForPart(orderId: string, partId: string, offerId: string, customerId: string) {
        const order = await this.prisma.order.findUnique({ where: { id: orderId } });
        if (!order) {
            throw new NotFoundException('Order not found');
        }

        if (order.customerId !== customerId) {
            throw new ForbiddenException('You can only accept offers for your own orders');
        }

        const selectableStatuses: OrderStatus[] = [
            OrderStatus.AWAITING_OFFERS,
            OrderStatus.COLLECTING_OFFERS,
            OrderStatus.AWAITING_SELECTION,
        ];
        if (!selectableStatuses.includes(order.status as OrderStatus)) {
            throw new BadRequestException(
                'Offers can only be accepted while the order is in the selection phase',
            );
        }

        const result = await this.prisma.$transaction(async (tx) => {
            await tx.$executeRaw`SELECT id FROM orders WHERE id = ${orderId}::uuid FOR UPDATE`;

            // Claim ONLY if the offer belongs to this order + part and is still pending (IDOR/race fix).
            const claimed = await tx.offer.updateMany({
                where: { id: offerId, orderId, orderPartId: partId, status: 'pending' },
                data: { status: 'accepted' },
            });
            if (claimed.count === 0) {
                throw new BadRequestException('Offer is not available for acceptance on this part');
            }
            const acceptedOffer = await tx.offer.findUniqueOrThrow({
                where: { id: offerId },
                include: { store: true }
            });

            // Auto-reject sibling offers on the same part
            const losingOffers = await tx.offer.findMany({
                where: {
                    orderPartId: partId,
                    id: { not: offerId },
                    status: 'pending'
                },
                include: { store: true }
            });

            await tx.offer.updateMany({
                where: {
                    orderPartId: partId,
                    id: { not: offerId },
                    status: 'pending'
                },
                data: { status: 'rejected' }
            });

            // --- Selection Logic: only move to payment when every selectable part has an accepted offer ---
            const parts = await tx.orderPart.findMany({
                where: { orderId },
                select: { id: true },
            });
            const activeOffers = await tx.offer.findMany({
                where: {
                    orderId,
                    status: { in: ['pending', 'accepted'] },
                    isWithdrawn: false,
                },
                select: { orderPartId: true, status: true },
            });

            const offersByPart = new Map<string, { hasPending: boolean; hasAccepted: boolean }>();
            for (const part of parts) {
                offersByPart.set(part.id, { hasPending: false, hasAccepted: false });
            }
            for (const offer of activeOffers) {
                if (!offer.orderPartId) continue;
                const bucket = offersByPart.get(offer.orderPartId);
                if (!bucket) continue;
                if (offer.status === 'accepted') bucket.hasAccepted = true;
                if (offer.status === 'pending') bucket.hasPending = true;
            }

            const selectableParts = [...offersByPart.values()].filter(
                (p) => p.hasPending || p.hasAccepted,
            );
            const allSelectablePartsAccepted =
                selectableParts.length > 0 && selectableParts.every((p) => p.hasAccepted);

            let updatedOrder = order;
            const canEnterPayment = [
                OrderStatus.AWAITING_OFFERS,
                OrderStatus.COLLECTING_OFFERS,
                OrderStatus.AWAITING_SELECTION,
            ].includes(order.status as any);

            if (allSelectablePartsAccepted && canEnterPayment) {
                const paymentCfg = await this.orderDurationConfig.getConfig();
                const partPaymentDeadline = new Date(
                    Date.now() + this.orderDurationConfig.hoursToMs(paymentCfg.paymentTimeoutHours),
                );

                updatedOrder = await tx.order.update({
                    where: { id: orderId },
                    data: {
                        status: OrderStatus.AWAITING_PAYMENT,
                        paymentDeadlineAt: partPaymentDeadline,
                    },
                });
            }

            // Log action
            await this.auditLogs.logAction({
                orderId: order.id,
                action: 'ACCEPT_OFFER_PART',
                entity: 'OrderPart',
                actorType: ActorType.CUSTOMER,
                actorId: customerId,
                actorName: 'Customer',
                previousState: order.status,
                newState: updatedOrder.status,
                reason: `Accepted offer ${offerId} for part ${partId}`,
                metadata: { offerId, partId },
            }, tx);

            return { acceptedOffer, losingOffers, updatedOrder };
        }, { timeout: 15000 });

        const { acceptedOffer, losingOffers, updatedOrder } = result;
        const enteredPayment = updatedOrder.status === OrderStatus.AWAITING_PAYMENT;

        // Only close losing merchants' chats once selection is complete (keep all winning stores open).
        if (enteredPayment) {
            try {
                const winners = await this.prisma.offer.findMany({
                    where: { orderId, status: 'accepted' },
                    select: { storeId: true },
                });
                const winningStoreIds = [...new Set(winners.map((w) => w.storeId).filter(Boolean))];
                if (winningStoreIds.length === 1) {
                    await this.chatService.closeOtherChats(orderId, winningStoreIds[0]);
                } else if (winningStoreIds.length > 1) {
                    await this.prisma.orderChat.updateMany({
                        where: {
                            orderId,
                            status: 'OPEN',
                            vendorId: { notIn: winningStoreIds },
                        },
                        data: { status: 'CLOSED' },
                    });
                }
            } catch (e) {
                console.error('Failed to close losing merchant chats', e);
            }
        }

        // Notify winner
        if (acceptedOffer.store?.ownerId) {
            await this.notifications.create({
                recipientId: acceptedOffer.store.ownerId,
                recipientRole: 'MERCHANT',
                titleAr: 'عُرضك تم قبوله!',
                titleEn: 'Your offer was accepted!',
                messageAr: `وافق العميل للتو على عرضك للقطعة في الطلب #${order.orderNumber}.`,
                messageEn: `The customer just accepted your offer for a part in Order #${order.orderNumber}.`,
                type: 'ORDER',
                link: `/merchant/orders/${order.id}`,
                metadata: {
                    orderId: order.id,
                    orderNumber: order.orderNumber,
                    offerId,
                    waEvent: 'OFFER_ACCEPTED',
                },
            }).catch(e => console.error('Failed to notify merchant', e));
        }

        // Notify customer — part accepted (payment only when all selectable parts accepted)
        await this.notifications.create({
            recipientId: customerId,
            recipientRole: 'CUSTOMER',
            titleAr: enteredPayment
                ? 'تم قبول عرض — بانتظار الدفع'
                : 'تم قبول عرض للقطعة — أكمل اختيار باقي القطع',
            titleEn: enteredPayment
                ? 'Offer accepted — awaiting payment'
                : 'Part offer accepted — finish selecting remaining parts',
            messageAr: enteredPayment
                ? `تم قبول عروض جميع القطع في الطلب #${order.orderNumber}. يمكنك المتابعة للدفع.`
                : `تم قبول عرض لقطعة في الطلب #${order.orderNumber}. أكمل اختيار عروض باقي القطع قبل المتابعة للدفع.`,
            messageEn: enteredPayment
                ? `All selectable parts for Order #${order.orderNumber} have accepted offers. You can proceed to payment.`
                : `An offer was accepted for a part in Order #${order.orderNumber}. Finish selecting offers for the remaining parts before checkout.`,
            type: 'ORDER',
            link: `/dashboard/orders/${order.id}`,
            metadata: {
                orderId: order.id,
                orderNumber: order.orderNumber,
                offerId,
                partId,
                waEvent: 'OFFER_ACCEPTED',
            },
        }).catch(e => console.error('Failed to notify customer of part acceptance', e));

        // Notify losers
        for (const losingOffer of losingOffers) {
            if (losingOffer.store?.ownerId) {
                await this.notifications.create({
                    recipientId: losingOffer.store.ownerId,
                    recipientRole: 'MERCHANT',
                    titleAr: 'تم رفض عرضك',
                    titleEn: 'Your offer was rejected',
                    messageAr: `نأسف، لقد قام العميل باختيار عرض آخر للقطعة في الطلب #${order.orderNumber}. حظاً أوفر!`,
                    messageEn: `Sorry, the customer selected another offer for a part in Order #${order.orderNumber}. Better luck!`,
                    type: 'ORDER',
                    link: `/dashboard/orders/${order.id}`,
                    metadata: {
                        orderId: order.id,
                        orderNumber: order.orderNumber,
                        waEvent: 'ORDER_STATUS',
                    },
                }).catch(e => console.error('Failed to notify merchant', e));
            }
        }

        return updatedOrder;
    }

    async markAsPrepared(orderId: string, storeId: string, offerId?: string) {
        const result = await this.offerFulfillment.markAsPreparedForStore(
            orderId,
            storeId,
            offerId,
        );

        const order = await this.prisma.order.findUnique({
            where: { id: orderId },
            select: { orderNumber: true },
        });

        await this.notifications
            .notifyMerchantByStoreId(storeId, {
                titleAr: 'توثيق حالة القطعة إلزامي!',
                titleEn: 'Part Verification Required!',
                messageAr: `تم تجهيز قطعتك في الطلب #${order?.orderNumber || orderId}. يرجى رفع التوثيق للمتابعة.`,
                messageEn: `Your part on order #${order?.orderNumber || orderId} is prepared. Please upload verification.`,
                type: 'ORDER',
                link: `/merchant/orders/${orderId}`,
                metadata: {
                    orderId,
                    verification: true,
                    waEvent: 'VERIFICATION',
                },
            })
            .catch((e) => console.error('Failed to notify merchant upon preparation', e));

        return this.prisma.order.findUnique({ where: { id: orderId } });
    }

    async getOfferFulfillmentSummary(orderId: string) {
        const paidOffers = await this.offerFulfillment.getPaidAcceptedOffers(orderId);
        const enriched = await Promise.all(
            paidOffers.map(async (o) => ({
                ...o,
                hasOpenCase: await this.offerFulfillment.hasOpenCaseForOffer(
                    o.id,
                    o.orderPartId,
                ),
            })),
        );
        return this.offerFulfillment.getFulfillmentSummary(enriched);
    }
    async rejectOffer(orderId: string, offerId: string, customerId: string, reason: string, customReason?: string) {
        // 1. Verify existence and ownership
        const order = await this.prisma.order.findUnique({
            where: { id: orderId }
        });

        if (!order) {
            throw new NotFoundException('Order not found');
        }

        if (order.customerId !== customerId) {
            throw new BadRequestException('You do not have permission to modify offers on this order');
        }

        // 2. Verify offer exists and belongs to this order
        const offer = await this.prisma.offer.findUnique({
            where: { id: offerId, orderId },
            include: { store: true }
        });

        if (!offer) {
            throw new NotFoundException('Offer not found on this order');
        }

        if (offer.status === 'rejected') {
            throw new BadRequestException('Offer is already rejected');
        }

        // 3. Update the offer status to 'rejected' and create the rejection record in a transaction
        const result = await this.prisma.$transaction(async (tx) => {
            const updatedOffer = await tx.offer.update({
                where: { id: offerId },
                data: { status: 'rejected' }
            });
            const rejection = await tx.offerRejection.create({
                data: {
                    offerId,
                    reason,
                    customReason
                }
            });
            return [updatedOffer, rejection];
        }, { timeout: 15000 });

        // 4. Optionally notify the merchant about the specific rejection reason
        if (offer.store?.ownerId) {
            await this.notifications.create({
                recipientId: offer.store.ownerId,
                recipientRole: 'MERCHANT',
                titleAr: 'تم رفض عرضك',
                titleEn: 'Your offer was rejected',
                messageAr: `قام العميل برفض عرضك الخاص بالطلب #${order.orderNumber}. السبب: ${reason}`,
                messageEn: `The customer rejected your offer for Order #${order.orderNumber}. Reason: ${reason}`,
                type: 'ORDER',
                link: `/dashboard/orders/${order.id}`,
                metadata: {
                    orderId: order.id,
                    orderNumber: order.orderNumber,
                    waEvent: 'ORDER_STATUS',
                },
            }).catch(e => console.error('Failed to notify merchant of specific rejection', e));
        }

        return { success: true, message: 'Offer rejected successfully', rejection: result[1] };
    }

    async renewOrder(orderId: string, userId: string) {
        const order = await this.prisma.order.findUnique({
            where: { id: orderId },
            include: {
                parts: true,
                _count: { select: { offers: true } },
            },
        });
        if (!order) throw new NotFoundException('Order not found');
        if (order.customerId !== userId) throw new ForbiddenException('Only owner can renew order');

        const isMultiPart =
            order.requestType === 'multiple' || (order.parts?.length ?? 0) > 1;
        if (isMultiPart) {
            throw new BadRequestException('Only single-part orders can be renewed');
        }

        if (order._count.offers > 0) {
            throw new BadRequestException('Cannot renew an order that already has offers');
        }

        const allowedStatuses: OrderStatus[] = [
            OrderStatus.CANCELLED,
            OrderStatus.AWAITING_SELECTION,
            OrderStatus.COLLECTING_OFFERS,
            OrderStatus.AWAITING_OFFERS,
        ];
        if (!allowedStatuses.includes(order.status)) {
            throw new BadRequestException('Order is not eligible for renewal');
        }

        const renewalCount = await this.prisma.auditLog.count({
            where: { orderId, action: 'ORDER_RENEWED' },
        });
        if (renewalCount >= 2) {
            throw new BadRequestException('Maximum renewals reached for this order');
        }

        const lastRenew = await this.prisma.auditLog.findFirst({
            where: { orderId, action: 'ORDER_RENEWED' },
            orderBy: { timestamp: 'desc' },
        });
        if (lastRenew && Date.now() - lastRenew.timestamp.getTime() < 24 * 60 * 60 * 1000) {
            throw new BadRequestException('Please wait 24 hours before renewing again');
        }

        const durationCfg = await this.orderDurationConfig.getConfig();
        const collectionMs = this.orderDurationConfig.hoursToMs(durationCfg.offerCollectionHours);
        const now = Date.now();
        const newDeadline = new Date(now + collectionMs);
        const offersStopAt = computeOffersStopAt(newDeadline);

        const updated = await this.prisma.order.update({
            where: { id: orderId },
            data: {
                status: OrderStatus.COLLECTING_OFFERS,
                revealOffersAt: newDeadline,
                offersDeadlineAt: newDeadline,
                offersStopAt,
                selectionDeadlineAt: null,
            },
        });

        await this.auditLogs.logAction({
            orderId,
            action: 'ORDER_RENEWED',
            entity: 'Order',
            actorType: ActorType.CUSTOMER,
            actorId: userId,
            actorName: 'Customer',
            reason: 'Order renewed by customer (24h extension)',
            metadata: {
                oldDeadline: order.offersDeadlineAt,
                newDeadline,
                renewalCount: renewalCount + 1,
            },
        });

        try {
            const matchingStores = await this.prisma.store.findMany({
                where: {
                    status: 'ACTIVE',
                    OR: [
                        { selectedMakes: { has: order.vehicleMake } },
                        { customMake: { equals: order.vehicleMake, mode: 'insensitive' } },
                    ],
                },
                select: { ownerId: true },
            });

            for (const store of matchingStores) {
                await this.notifications.create({
                    recipientId: store.ownerId,
                    recipientRole: 'MERCHANT',
                    titleAr: 'طلب مُجدَّد — فرصة جديدة',
                    titleEn: 'Renewed order — new opportunity',
                    messageAr: `تم تجديد الطلب #${order.orderNumber}. قدّم عرضك خلال 24 ساعة.`,
                    messageEn: `Order #${order.orderNumber} was renewed. Submit your offer within 24 hours.`,
                    type: 'ORDER',
                    link: `/merchant/orders/${order.id}`,
                    metadata: { orderId: order.id, orderNumber: order.orderNumber },
                }).catch(() => {});
            }
        } catch (e) {
            console.error('Failed to notify merchants of order renewal', e);
        }

        return updated;
    }

    async deleteOrder(orderId: string, userId: string) {
        const order = await this.prisma.order.findUnique({ 
            where: { id: orderId },
            include: { _count: { select: { offers: true } } }
        });
        if (!order) throw new NotFoundException('Order not found');
        if (order.customerId !== userId) throw new ForbiddenException('Only owner can delete order');
        
        // Safety check: Don't delete if it has offers or is in advanced state
        if (order._count.offers > 0 && !['CANCELLED', 'AWAITING_OFFERS'].includes(order.status)) {
            throw new BadRequestException('Cannot delete order that has active offers or is in progress');
        }

        return this.prisma.order.delete({
            where: { id: orderId }
        });
    }

    async saveCheckoutData(orderId: string, customerId: string, data: any) {
        // 1. Verify ownership
        const order = await this.prisma.order.findUnique({
            where: { id: orderId }
        });

        if (!order) throw new NotFoundException('Order not found');
        if (order.customerId !== customerId) throw new ForbiddenException('Not owner of this order');
        const allowedCheckoutStatuses: OrderStatus[] = [
            OrderStatus.AWAITING_PAYMENT,
            OrderStatus.PARTIALLY_PAID,
            OrderStatus.AWAITING_SELECTION,
        ];
        if (!allowedCheckoutStatuses.includes(order.status)) {
            throw new BadRequestException(
                `Cannot update checkout data while order is ${order.status}`,
            );
        }

        // 2. Prepare the shipping addresses
        // Data format received from frontend:
        // { addresses: [{ fullName, phone, email, country, city, details, orderPartId? }] }
        const addresses = data.addresses || [];

        return this.prisma.$transaction(async (tx) => {
            // Clear existing addresses just in case user is updating/going back and forth
            await tx.orderShippingAddress.deleteMany({
                where: { orderId }
            });

            // Re-insert addresses
            if (addresses.length > 0) {
                await tx.orderShippingAddress.createMany({
                    data: addresses.map(addr => ({
                        orderId,
                        orderPartId: addr.orderPartId || null,
                        fullName: addr.fullName,
                        phone: addr.phone,
                        email: addr.email,
                        country: addr.country,
                        city: addr.city,
                        details: addr.details
                    }))
                });
            }

            // Optional: update the order level shipping tracking metadata here if needed
            return { success: true, count: addresses.length };
        }, { timeout: 15000 });
    }

    private async generateOrderNumber(): Promise<string> {
        const result = await this.prisma.$queryRaw<{ generate_order_number: string }[]>`SELECT generate_order_number()`;
        return result[0].generate_order_number;
    }

    async getAssemblyCart(customerId: string) {
        const cartOrderStatuses: OrderStatus[] = [
            OrderStatus.PREPARATION,
            OrderStatus.PREPARED,
            OrderStatus.VERIFICATION,
            OrderStatus.VERIFICATION_SUCCESS,
            OrderStatus.READY_FOR_SHIPPING,
            OrderStatus.PARTIALLY_SHIPPED,
        ];

        const orders = await this.prisma.order.findMany({
            where: {
                customerId,
                status: { in: cartOrderStatuses },
                requestType: 'multiple',
            },
            include: {
                parts: true,
                store: true, // If single-store order
                acceptedOffer: {
                    include: { 
                        store: true,
                        payments: { where: { status: 'SUCCESS' } }
                    }
                },
                offers: {
                    where: {
                        status: { in: ['accepted', 'ACCEPTED'] },
                        shippedFromCart: false,
                    },
                    include: {
                        store: true,
                        orderPart: true,
                        payments: { where: { status: 'SUCCESS' } },
                    },
                },
                payments: {
                    where: { status: 'SUCCESS' }
                },
                shippingAddresses: true
            },
            orderBy: { createdAt: 'desc' }
        });

        const assemblyCartMs = await this.orderDurationConfig.getAssemblyCartMs();

        // Format for the frontend CartItemType
        const cartItems = [];
        for (const order of orders) {
            // Find the first payment to get the paidAt date for the 7-day timer
            const firstPayment = order.payments.sort((a, b) =>
                (a.paidAt?.getTime() || 0) - (b.paidAt?.getTime() || 0)
            )[0];

            let paidAt = firstPayment?.paidAt || order.updatedAt;
            let expiryDate = new Date(paidAt.getTime() + assemblyCartMs);

            // For each accepted offer (which is paid, since order is PREPARATION)
            const acceptedOffers = order.offers.length > 0 ? order.offers : (order.acceptedOffer ? [order.acceptedOffer] : []);

            for (const offer of acceptedOffers as any[]) {
                if (!offer.payments?.length) continue;

                const part = order.parts.find(p => p.id === offer.orderPartId) || order.parts[0];
                const partName = part?.name || order.partName || 'Multi-Part Order';
                const partImages = (part?.images as string[]) || [];
                const orderImages = (order.partImages as string[]) || [];
                const partImage = (partImages.length > 0) ? partImages[0] : (orderImages.length > 0 ? orderImages[0] : null);

                const offerPayment = offer.payments?.[0];
                const finalPrice = offerPayment?.totalAmount ? Number(offerPayment.totalAmount) : (Number(offer.unitPrice) + Number(offer.shippingCost));

                const fulfillmentStatus = offer.fulfillmentStatus as OfferFulfillmentStatus;
                const canSelectForShipping =
                    fulfillmentStatus === OfferFulfillmentStatus.READY_FOR_SHIPPING;
                const lockReason = this.offerFulfillment.getLockReason(fulfillmentStatus);
                const handoverPending =
                    fulfillmentStatus === OfferFulfillmentStatus.VERIFICATION_SUCCESS;

                cartItems.push({
                    id: order.id,
                    offerId: offer.id,
                    orderNumber: order.orderNumber,
                    name: partName,
                    price: Number(offer.unitPrice),
                    shippingCost: Number(offer.shippingCost),
                    hasWarranty: offer.hasWarranty,
                    warrantyDuration: offer.warrantyDuration,
                    condition: offer.condition,
                    partType: offer.partType,
                    partImage: partImage,
                    expiryDate: expiryDate,
                    paidAt: paidAt,
                    storeName: offer.store?.name || order.store?.name || 'Verified Seller',
                    vehicleMake: order.vehicleMake,
                    vehicleModel: order.vehicleModel,
                    vehicleYear: order.vehicleYear,
                    vin: order.vin,
                    partsCount: 1,
                    requestType: order.requestType || 'N/A',
                    shippingType: order.shippingType || 'N/A',
                    shippingAddress: order.shippingAddresses?.[0] || null,
                    totalPaid: finalPrice,
                    fulfillmentStatus,
                    canSelectForShipping,
                    handoverPending,
                    lockReasonAr: lockReason.ar,
                    lockReasonEn: lockReason.en,
                });
            }
        }

        return cartItems;
    }

    async getMerchantAssemblyCart(userId: string, storeId: string) {
        if (!storeId) return [];

        const cartOrderStatuses: OrderStatus[] = [
            OrderStatus.PREPARATION,
            OrderStatus.PREPARED,
            OrderStatus.VERIFICATION,
            OrderStatus.VERIFICATION_SUCCESS,
            OrderStatus.READY_FOR_SHIPPING,
            OrderStatus.PARTIALLY_SHIPPED,
        ];

        const orders = await this.prisma.order.findMany({
            where: {
                status: { in: cartOrderStatuses },
                requestType: 'multiple',
                offers: {
                    some: {
                        storeId: storeId,
                        status: 'accepted',
                        shippedFromCart: false
                    }
                }
            },
            include: {
                parts: true,
                store: true,
                offers: {
                    where: { 
                        status: 'accepted',
                        shippedFromCart: false
                    },
                    include: { 
                        store: true,
                        payments: { where: { status: 'SUCCESS' } }
                    }
                },
                payments: {
                    where: { status: 'SUCCESS' }
                },
                shippingAddresses: true
            },
            orderBy: { createdAt: 'desc' }
        });

        const assemblyCartMs = await this.orderDurationConfig.getAssemblyCartMs();
        const cartItems = [];
        for (const order of orders) {
            const firstPayment = order.payments.sort((a, b) =>
                (a.paidAt?.getTime() || 0) - (b.paidAt?.getTime() || 0)
            )[0];

            let paidAt = firstPayment?.paidAt || order.updatedAt;
            let expiryDate = new Date(paidAt.getTime() + assemblyCartMs);

            for (const offer of order.offers as any[]) {
                if (!offer.payments?.length) continue;
                const isMyOffer = offer.storeId === storeId;
                const part = order.parts.find(p => p.id === offer.orderPartId) || order.parts[0];
                const partName = part?.name || order.partName || 'Multi-Part Order';
                
                // Privacy Masking: If not my offer, hide price, store name, and images
                const partImages = (part?.images as string[]) || [];
                const orderImages = (order.partImages as string[]) || [];
                const partImage = isMyOffer 
                    ? ((partImages.length > 0) ? partImages[0] : (orderImages.length > 0 ? orderImages[0] : null))
                    : null;

                const offerPayment = offer.payments?.[0];
                const finalPrice = isMyOffer 
                    ? (offerPayment?.totalAmount ? Number(offerPayment.totalAmount) : (Number(offer.unitPrice) + Number(offer.shippingCost)))
                    : 0;

                const fulfillmentStatus = offer.fulfillmentStatus as OfferFulfillmentStatus;
                const canSelectForShipping =
                    isMyOffer &&
                    fulfillmentStatus === OfferFulfillmentStatus.READY_FOR_SHIPPING;
                const lockReason = this.offerFulfillment.getLockReason(fulfillmentStatus);
                const handoverPending =
                    fulfillmentStatus === OfferFulfillmentStatus.VERIFICATION_SUCCESS;

                cartItems.push({
                    id: order.id,
                    offerId: offer.id,
                    orderNumber: order.orderNumber,
                    name: partName,
                    price: isMyOffer ? Number(offer.unitPrice) : 0,
                    shippingCost: isMyOffer ? Number(offer.shippingCost) : 0,
                    hasWarranty: isMyOffer ? offer.hasWarranty : false,
                    warrantyDuration: isMyOffer ? offer.warrantyDuration : null,
                    condition: isMyOffer ? offer.condition : null,
                    partType: isMyOffer ? offer.partType : null,
                    partImage: partImage,
                    expiryDate: expiryDate,
                    paidAt: paidAt,
                    storeName: isMyOffer ? (offer.store?.name || 'Your Store') : 'Other Store',
                    vehicleMake: order.vehicleMake,
                    vehicleModel: order.vehicleModel,
                    vehicleYear: order.vehicleYear,
                    vin: isMyOffer ? order.vin : null,
                    partsCount: 1, // Set to 1 as this card represents a single part
                    requestType: order.requestType || 'N/A',
                    shippingType: order.shippingType || 'N/A',
                    shippingAddress: isMyOffer ? (order.shippingAddresses?.[0] || null) : null,
                    totalPaid: finalPrice,
                    isMyOffer: isMyOffer,
                    fulfillmentStatus,
                    canSelectForShipping,
                    handoverPending,
                    lockReasonAr: lockReason.ar,
                    lockReasonEn: lockReason.en,
                });
            }
        }

        return cartItems;
    }

    /** Enrich offers with cart batch metadata for grouped-order shipping UI */
    private enrichOffersWithCartBatch<T extends { cartShipmentId?: string | null; shippedFromCart?: boolean; fulfillmentStatus?: string }>(
        offers: T[],
    ): (T & { cartBatchSize: number | null; cartBatchType: 'solo' | 'group' | null; handoverPending: boolean })[] {
        const counts = new Map<string, number>();
        for (const o of offers) {
            if (o.cartShipmentId) {
                counts.set(o.cartShipmentId, (counts.get(o.cartShipmentId) || 0) + 1);
            }
        }
        return offers.map((o) => {
            const handoverPending =
                o.fulfillmentStatus === OfferFulfillmentStatus.VERIFICATION_SUCCESS;
            if (!o.shippedFromCart || !o.cartShipmentId) {
                return {
                    ...o,
                    cartBatchSize: null,
                    cartBatchType: null,
                    handoverPending,
                };
            }
            const size = counts.get(o.cartShipmentId) || 1;
            return {
                ...o,
                cartBatchSize: size,
                cartBatchType: size > 1 ? ('group' as const) : ('solo' as const),
                handoverPending,
            };
        });
    }

    async getDeliveredOrders(customerId: string) {
        // Find DELIVERED orders within the last 30 days (changed from 3 days to allow visibility of expired items)
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

        const orders = await this.prisma.order.findMany({
            where: {
                customerId,
                status: {
                    in: [
                        OrderStatus.DELIVERED,
                        OrderStatus.PARTIALLY_DELIVERED,
                        OrderStatus.SHIPPED,
                    ],
                },
                updatedAt: { gte: thirtyDaysAgo }
            },
            include: {
                parts: true,
                store: true,
                acceptedOffer: {
                    include: { store: true }
                },
                offers: {
                    where: { status: 'accepted' },
                    include: { store: true }
                },
                payments: {
                    where: { status: 'SUCCESS' }
                },
                shippingAddresses: true
            },
            orderBy: { updatedAt: 'desc' }
        });

        const windowMs = await this.orderDurationConfig.getReturnDisputeMs();
        const returnHours = await this.orderDurationConfig.getReturnWindowHours();

        const deliveredItems = [];
        for (const order of orders) {
            const isMulti = this.offerFulfillment.isMultiItemOrder(order);
            const orderDeliveredAt = order.deliveredAt ?? order.updatedAt;

            const firstPayment = order.payments?.sort((a, b) => (a.paidAt?.getTime() || 0) - (b.paidAt?.getTime() || 0))[0];

            // Build shipping address object from the first shipping address
            const shippingAddr = order.shippingAddresses?.[0] || null;
            const shippingAddress = shippingAddr ? {
                fullName: shippingAddr.fullName,
                phone: shippingAddr.phone,
                email: shippingAddr.email,
                country: shippingAddr.country,
                city: shippingAddr.city,
                details: shippingAddr.details
            } : null;

            const acceptedOffers = order.offers.length > 0 ? order.offers : (order.acceptedOffer ? [order.acceptedOffer] : []);

            // Fallback for orders without accepted offers (e.g. manual testing, old structures)
            if (acceptedOffers.length === 0) {
                const part = order.parts[0];
                const partName = part?.name || order.partName || 'Multi-Part Order';
                const partImages = (part?.images as string[]) || [];
                const orderImages = (order.partImages as string[]) || [];
                const partImage = (partImages.length > 0) ? partImages[0] : (orderImages.length > 0 ? orderImages[0] : null);
                let returnExpiryDate = new Date(orderDeliveredAt.getTime() + windowMs);
                let isReturnEligible = Date.now() <= returnExpiryDate.getTime();

                deliveredItems.push({
                    id: order.id,
                    offerId: null,
                    orderPartId: part?.id || null,
                    orderNumber: order.orderNumber,
                    name: partName,
                    price: 0,
                    shippingCost: 0,
                    hasWarranty: false,
                    warrantyDuration: 0,
                    condition: 'N/A',
                    partType: 'N/A',
                    partImage: partImage,
                    deliveredAt: orderDeliveredAt,
                    returnExpiryDate: returnExpiryDate,
                    isReturnEligible: isReturnEligible,
                    storeName: order.store?.name || 'Verified Seller',
                    vehicleMake: order.vehicleMake,
                    vehicleModel: order.vehicleModel,
                    vehicleYear: order.vehicleYear,
                    vin: order.vin,
                    requestType: order.requestType || null,
                    shippingType: order.shippingType || null,
                    shippingAddress: shippingAddress,
                    partsCount: order.parts.length || 1,
                    totalPaid: firstPayment?.totalAmount ? Number(firstPayment.totalAmount) : 0,
                    status: order.status
                });
                continue;
            }

            for (const offer of acceptedOffers) {
                const part = order.parts.find(p => p.id === offer.orderPartId) || order.parts[0];
                const offerDeliveredAt =
                    (offer as { deliveredAt?: Date | null }).deliveredAt ??
                    (isMulti ? null : orderDeliveredAt);

                if (
                    isMulti &&
                    offer.fulfillmentStatus !== OfferFulfillmentStatus.DELIVERED &&
                    offer.fulfillmentStatus !== OfferFulfillmentStatus.COMPLETED
                ) {
                    continue;
                }
                if (isMulti && !offerDeliveredAt && offer.fulfillmentStatus !== OfferFulfillmentStatus.COMPLETED) {
                    continue;
                }

                const partName = part?.name || order.partName || 'Multi-Part Order';
                const partImages = (part?.images as string[]) || [];
                const orderImages = (order.partImages as string[]) || [];
                const partImage = (partImages.length > 0) ? partImages[0] : (orderImages.length > 0 ? orderImages[0] : null);

                const itemDeliveredAt = offerDeliveredAt ?? orderDeliveredAt;
                const returnExpiryDate = offerDeliveredAt
                    ? new Date(offerDeliveredAt.getTime() + windowMs)
                    : new Date(orderDeliveredAt.getTime() + windowMs);
                const isOfferCompleted =
                    offer.fulfillmentStatus === OfferFulfillmentStatus.COMPLETED ||
                    !!(offer as { resolutionLocked?: boolean }).resolutionLocked;
                const isReturnEligible =
                    !isOfferCompleted &&
                    offerDeliveredAt != null &&
                    Date.now() <= returnExpiryDate.getTime() &&
                    offer.fulfillmentStatus === OfferFulfillmentStatus.DELIVERED;

                const offerPayment = order.payments?.find((p) => p.offerId === offer.id);

                deliveredItems.push({
                    id: order.id,
                    offerId: offer.id,
                    orderPartId: part?.id || null,
                    orderNumber: order.orderNumber,
                    name: partName,
                    price: Number(offer.unitPrice),
                    shippingCost: Number(offer.shippingCost),
                    hasWarranty: offer.hasWarranty,
                    warrantyDuration: offer.warrantyDuration,
                    condition: offer.condition,
                    partType: offer.partType,
                    partImage: partImage,
                    deliveredAt: itemDeliveredAt,
                    returnExpiryDate: returnExpiryDate,
                    isReturnEligible: isReturnEligible,
                    storeName: offer.store?.name || order.store?.name || 'Verified Seller',
                    vehicleMake: order.vehicleMake,
                    vehicleModel: order.vehicleModel,
                    vehicleYear: order.vehicleYear,
                    vin: order.vin,
                    requestType: order.requestType || null,
                    shippingType: order.shippingType || null,
                    shippingAddress: shippingAddress,
                    partsCount: order.parts.length || 1,
                    totalPaid: offerPayment?.totalAmount
                        ? Number(offerPayment.totalAmount)
                        : Number(offer.unitPrice) + Number(offer.shippingCost),
                    status: order.status,
                    fulfillmentStatus: offer.fulfillmentStatus,
                    resolutionLocked: !!(offer as { resolutionLocked?: boolean }).resolutionLocked,
                });
            }
        }

        return deliveredItems;
    }

    async updateAdminNotes(orderId: string, notes: string, adminUser: any) {
        if (adminUser.role !== 'ADMIN' && adminUser.role !== 'SUPER_ADMIN') {
            throw new ForbiddenException('Only administrators can update internal notes');
        }

        const order = await this.prisma.order.findUnique({
            where: { id: orderId }
        });

        if (!order) {
            throw new NotFoundException('Order not found');
        }

        const updatedOrder = await this.prisma.order.update({
            where: { id: orderId },
            data: { adminNotes: notes }
        });

        await this.auditLogs.logAction({
            orderId,
            action: 'UPDATE_ADMIN_NOTES',
            entity: 'Order',
            actorType: ActorType.ADMIN,
            actorId: adminUser.id,
            actorName: adminUser.name || adminUser.email || 'Admin',
            previousState: order.status,
            newState: order.status,
            metadata: { hasNotes: !!notes }
        });

        return { success: true, message: 'Admin notes updated', adminNotes: updatedOrder.adminNotes };
    }

    async requestShipping(
        customerId: string, 
        orderIds?: string[], 
        offerIds?: string[], 
        isSystemAutoTrigger = false,
        adminActor?: { id: string, type: ActorType, name: string }
    ) {
        if ((!orderIds || orderIds.length === 0) && (!offerIds || offerIds.length === 0)) {
            return { success: true, count: 0 };
        }

        let successCount = 0;
        const results = [];

        // If orderIds are provided, resolve them to offerIds for backward compatibility
        const allOfferIds = [...(offerIds || [])];
        if (orderIds && orderIds.length > 0) {
            const ordersWithOffers = await this.prisma.order.findMany({
                where: { id: { in: orderIds }, customerId },
                include: { offers: { where: { status: 'accepted', shippedFromCart: false } } }
            });
            for (const order of ordersWithOffers) {
                allOfferIds.push(...order.offers.map(o => o.id));
            }
        }

        if (allOfferIds.length === 0) return { success: true, count: 0, results: [], message: 'No pending items found.' };

        // Get details of all requested offers
        const offers = await this.prisma.offer.findMany({
            where: { id: { in: allOfferIds }, status: 'accepted', shippedFromCart: false },
            include: {
                order: true,
                payments: { where: { status: 'SUCCESS' } },
            },
        });

        const validOffers = offers.filter((o) => {
            if (o.order.customerId !== customerId) return false;
            if (!o.payments?.some((p) => p.status === 'SUCCESS')) return false;
            return (
                o.fulfillmentStatus === OfferFulfillmentStatus.READY_FOR_SHIPPING &&
                !o.shippedFromCart
            );
        });

        if (validOffers.length === 0) {
            return {
                success: false,
                reason:
                    'No items are ready for shipping. Each part must be prepared, verified, and handed over to admin by its merchant before you can ship it from the assembly cart.',
            };
        }

        const totalWeightKg = validOffers.reduce(
            (sum, offer) => sum + Number(offer.weightKg || 0),
            0,
        );
        const logisticsCfg = await this.logisticsConfig.getConfig();
        if (
            totalWeightKg > 0 &&
            this.logisticsConfig.isWeightEnforcementEnabled(logisticsCfg)
        ) {
            await this.logisticsConfig.assertWeightAllowed(totalWeightKg);
        }

        // Actor info for logging
        const actor = isSystemAutoTrigger 
            ? { id: 'SYSTEM', type: ActorType.ADMIN, name: 'Logistics Automation' }
            : (adminActor || { id: customerId, type: ActorType.CUSTOMER, name: 'Customer' });

        // Group by orderId to process shipments batch-wise per order
        const offersByOrder = validOffers.reduce((acc, offer) => {
            if (!acc[offer.orderId]) acc[offer.orderId] = [];
            acc[offer.orderId].push(offer);
            return acc;
        }, {} as Record<string, typeof validOffers>);

        for (const orderId in offersByOrder) {
            const batchOffers = offersByOrder[orderId];
            try {
                // 1. Create a shipment record for this partial batch
                const shipment = await this.shipmentsService.create({ orderId }, customerId);

                // 2. Mark specific offers as shipped from cart
                await this.prisma.offer.updateMany({
                    where: { id: { in: batchOffers.map(o => o.id) } },
                    data: {
                        shippedFromCart: true,
                        shippedFromCartAt: new Date(),
                        cartShipmentId: shipment.id,
                        fulfillmentStatus: OfferFulfillmentStatus.SHIPPED,
                    },
                });

                await this.offerFulfillment.recomputeOrderStatus(orderId);

                try {
                    const orderMeta = await this.prisma.order.findUnique({
                        where: { id: orderId },
                        include: { parts: true },
                    });
                    if (
                        orderMeta &&
                        !this.waybillsService.shouldAutoIssueOnVerification(orderMeta)
                    ) {
                        await this.waybillsService.issueWaybillsForOfferBatch(
                            orderId,
                            batchOffers.map((o) => o.id),
                            actor.id === 'SYSTEM' ? null : actor.id,
                            {
                                mode: 'single_batch',
                                shipmentId: shipment.id,
                                trigger: isSystemAutoTrigger ? 'AUTO_7DAY' : 'CART_BATCH',
                                automated: isSystemAutoTrigger,
                                reason: isSystemAutoTrigger
                                    ? 'Waybill for 7-day auto-ship batch'
                                    : 'Waybill for customer cart selection batch',
                            },
                        );
                    }
                } catch (waybillErr) {
                    console.error(
                        `[requestShipping] Waybill batch issue failed for order ${orderId}:`,
                        waybillErr instanceof Error ? waybillErr.message : waybillErr,
                    );
                }

                // 3. Check if ALL accepted offers for this order are now shipped
                const remainingPending = await this.prisma.offer.count({
                    where: { 
                        orderId, 
                        status: 'accepted', 
                        shippedFromCart: false 
                    }
                });

                const refreshedOrder = await this.prisma.order.findUnique({
                    where: { id: orderId },
                    select: { status: true },
                });
                const currentStatus = refreshedOrder?.status as OrderStatus;

                if (remainingPending === 0) {
                    if (currentStatus !== OrderStatus.SHIPPED) {
                        await this.transitionStatus(
                            orderId,
                            OrderStatus.SHIPPED,
                            actor,
                            isSystemAutoTrigger ? 'All items auto-shipped after 7-day period' : 'All items shipped from assembly cart'
                        );
                    } else {
                        await this.auditLogs.logAction({
                            orderId,
                            action: 'SHIPPING_BATCH',
                            entity: 'Order',
                            actorId: actor.id,
                            actorType: actor.type,
                            actorName: actor.name,
                            previousState: OrderStatus.SHIPPED,
                            newState: OrderStatus.SHIPPED,
                            metadata: {
                                batchSize: batchOffers.length,
                                remaining: 0,
                                isAuto: isSystemAutoTrigger,
                                note: 'Final batch; order already SHIPPED after aggregate recompute',
                            },
                        });
                    }
                } else if (
                    currentStatus !== OrderStatus.PARTIALLY_SHIPPED &&
                    currentStatus !== OrderStatus.SHIPPED
                ) {
                    await this.transitionStatus(
                        orderId,
                        OrderStatus.PARTIALLY_SHIPPED,
                        actor,
                        isSystemAutoTrigger 
                            ? `System auto-shipped ${batchOffers.length} aging items. ${remainingPending} items remaining.`
                            : `Partial shipment: ${batchOffers.length} items shipped. ${remainingPending} items remaining.`
                    );
                } else {
                    await this.auditLogs.logAction({
                        orderId,
                        action: 'PARTIAL_SHIPPING',
                        entity: 'Order',
                        actorId: actor.id,
                        actorType: actor.type,
                        actorName: actor.name,
                        previousState: currentStatus,
                        newState: currentStatus,
                        metadata: {
                            batchSize: batchOffers.length,
                            remaining: remainingPending,
                            isAuto: isSystemAutoTrigger,
                        },
                    });
                }

                successCount += batchOffers.length;
                results.push({ orderId, count: batchOffers.length, success: true });
            } catch (error) {
                console.error(`Failed partial shipping for order ${orderId}:`, error);
                results.push({ orderId, success: false, reason: error.message });
            }
        }

        return { success: true, count: successCount, results };
    }

    async requestShippingByMerchant(
        orderId: string,
        storeId: string,
        userId: string,
        offerId?: string,
    ) {
        const order = await this.prisma.order.findUnique({
            where: { id: orderId },
            include: {
                offers: {
                    where: offerId ? { id: offerId } : { storeId },
                    include: { orderPart: true, store: true },
                },
            },
        });
        if (!order) throw new NotFoundException('Order not found');

        await this.offerFulfillment.markOfferReadyForStore(
            orderId,
            storeId,
            offerId,
        );

        const handoverOffer = order.offers[0];
        const partName =
            handoverOffer?.orderPart?.name || order.partName || 'Part';
        const storeName = handoverOffer?.store?.name || 'Merchant';

        await this.notifications.notifyAdmins({
            titleAr: 'تم طلب تسليم شحنة من التاجر',
            titleEn: 'Merchant requested shipment handover',
            messageAr: `التاجر «${storeName}» أرسل طلب تسليم «${partName}» للطلب #${order.orderNumber}.`,
            messageEn: `Merchant «${storeName}» submitted handover for «${partName}» on order #${order.orderNumber}.`,
            type: 'ORDER_UPDATE',
            link: 'orders-control',
            metadata: { orderId, offerId: handoverOffer?.id, tab: 'detail' },
        });

        return this.prisma.order.findUnique({ where: { id: orderId } });
    }


    async submitVerification(
        orderId: string,
        storeId: string,
        data: any,
        offerId?: string,
    ) {
        const order = await this.prisma.order.findUnique({
            where: { id: orderId },
            include: { offers: true },
        });
        if (!order) throw new NotFoundException('Order not found');
        this.offerFulfillment.assertOrderAllowsMerchantFulfillment(order);

        let targetOfferId = offerId;
        if (!targetOfferId) {
            const mine = order.offers.find(
                (o) =>
                    ['accepted', 'ACCEPTED'].includes(o.status) &&
                    o.storeId === storeId,
            );
            if (!mine) throw new ForbiddenException('Not your order');
            targetOfferId = mine.id;
        }

        const availableOfficer = await this.prisma.user.findFirst({
            where: { role: 'VERIFICATION_OFFICER', status: 'ACTIVE' },
            orderBy: { updatedAt: 'asc' },
        });

        await this.verificationTasks.ensureTaskForOffer(
            orderId,
            targetOfferId,
            availableOfficer?.id ?? null,
        );

        await this.prisma.order.update({
            where: { id: orderId },
            data: { verificationSubmittedAt: new Date() },
        });

        if (availableOfficer) {
            const task = await this.prisma.verificationTask.findFirst({
                where: {
                    orderId,
                    offerId: targetOfferId,
                    status: { notIn: ['ADMIN_APPROVED', 'ADMIN_REJECTED', 'CANCELLED'] },
                },
                orderBy: { createdAt: 'desc' },
            });
            if (task) {
                await this.notifications.create({
                    recipientId: availableOfficer.id,
                    recipientRole: 'VERIFICATION_OFFICER',
                    type: 'system_alert',
                    titleAr: 'مهمة مطابقة قطعة جديدة',
                    titleEn: 'New part verification task',
                    messageAr: `تم إسناد مهمة مطابقة لقطعة في الطلب #${order.orderNumber}.`,
                    messageEn: `A part verification task for order #${order.orderNumber} was assigned to you.`,
                    link: `/dashboard/verification-task-details/${task.id}`,
                });
            }
        }

        return this.offerFulfillment.submitOfferVerification(
            orderId,
            targetOfferId,
            storeId,
            data,
        );
    }

    async adminReviewVerification(orderId: string, adminId: string, data: any) {
        const order = await this.prisma.order.findUnique({
            where: { id: orderId },
            include: {
                verificationDocuments: { orderBy: { createdAt: 'desc' } },
            },
        });
        if (!order) throw new NotFoundException('Order not found');

        const pendingDocs = order.verificationDocuments.filter(
            (d) => !d.adminStatus || String(d.adminStatus).toUpperCase() === 'PENDING',
        );

        let targetDoc = data.documentId
            ? order.verificationDocuments.find((d) => d.id === data.documentId)
            : data.offerId
              ? pendingDocs.find((d) => d.offerId === data.offerId) ??
                order.verificationDocuments.find((d) => d.offerId === data.offerId)
              : pendingDocs[0] ?? order.verificationDocuments[0];

        if (!targetDoc) throw new NotFoundException('Verification document not found.');

        const isPerOfferReview = !!targetDoc.offerId;
        const isDocPending =
            !targetDoc.adminStatus ||
            String(targetDoc.adminStatus).toUpperCase() === 'PENDING';

        if (!isDocPending) {
            throw new BadRequestException(
                'This verification document is not pending review.',
            );
        }

        const latestDoc = targetDoc;

        const isApprove = data.action === 'APPROVE' || data.status === 'APPROVED' || data.approved === true;
        const decision = isApprove ? 'APPROVED' : 'REJECTED';
        const durationCfg = await this.orderDurationConfig.getConfig();
        
        let newOrderStatus: OrderStatus = decision === 'APPROVED' ? OrderStatus.VERIFICATION_SUCCESS : OrderStatus.NON_MATCHING;
        // Order-level 48h correction clock starts when entering CORRECTION_PERIOD (scheduler/transitionStatus),
        // not during the short NON_MATCHING grace window.
        let correctionDeadline: Date | null = null;
        let newRejectionCount = order.rejectionCount;

        if (decision === 'REJECTED') {
            newRejectionCount += 1;
            if (newRejectionCount >= 2) {
                newOrderStatus = OrderStatus.CANCELLED;
                correctionDeadline = null;
            }
        }

        const docCorrectionDeadline =
            decision === 'REJECTED' && newOrderStatus === OrderStatus.NON_MATCHING
                ? new Date(Date.now() + this.orderDurationConfig.hoursToMs(durationCfg.correctionPeriodHours))
                : correctionDeadline;

        const txOps: any[] = [
            this.prisma.verificationDocument.update({
                where: { id: latestDoc.id },
                data: {
                    adminStatus: decision,
                    adminReviewedBy: adminId,
                    adminReviewedAt: new Date(),
                    adminRejectionReason: data.rejectionReason,
                    adminRejectionImages: data.rejectionImages || [],
                    adminRejectionVideo: data.rejectionVideo,
                    correctionDeadlineAt: docCorrectionDeadline,
                    adminSignatureName: data.adminSignatureName,
                    adminSignatureType: data.adminSignatureType,
                    adminSignatureText: data.adminSignatureText,
                    adminSignatureImage: data.adminSignatureImage,
                },
            }),
        ];

        if (!isPerOfferReview) {
            txOps.push(
                this.prisma.order.update({
                    where: { id: orderId },
                    data: {
                        status: newOrderStatus,
                        correctionDeadlineAt: null,
                        rejectionCount: newRejectionCount,
                    },
                }),
            );
            if (order.verificationTaskId) {
                txOps.push(
                    this.prisma.verificationTask.update({
                        where: { id: order.verificationTaskId },
                        data: {
                            status: decision === 'APPROVED' ? 'ADMIN_APPROVED' : 'ADMIN_REJECTED',
                        },
                    }),
                );
            }
        }

        await this.prisma.$transaction(txOps);

        try {
            await this.verificationTasks.applyAdminDecisionSideEffects({
                orderId,
                offerId: latestDoc.offerId ?? null,
                taskId: order.verificationTaskId,
                approved: decision === 'APPROVED',
                reason: data.rejectionReason ?? null,
                adminId,
                orderCancelled: newOrderStatus === OrderStatus.CANCELLED,
                source: 'DOCUMENT',
            });
        } catch (sideErr) {
            console.error(
                '[adminReviewVerification] Field-task side effects failed (non-blocking):',
                sideErr instanceof Error ? sideErr.message : sideErr,
            );
        }

        let partName = order.partName || 'Part';
        let resolvedOfferId = latestDoc.offerId ?? null;

        // Correction docs historically omitted offerId — recover from original / task / single paid offer
        if (!resolvedOfferId && decision === 'APPROVED') {
            if (latestDoc.originalDocumentId) {
                const original = await this.prisma.verificationDocument.findUnique({
                    where: { id: latestDoc.originalDocumentId },
                    select: { offerId: true },
                });
                resolvedOfferId = original?.offerId ?? null;
            }
            if (!resolvedOfferId && order.verificationTaskId) {
                const vt = await this.prisma.verificationTask.findUnique({
                    where: { id: order.verificationTaskId },
                    select: { offerId: true },
                });
                resolvedOfferId = vt?.offerId ?? null;
            }
            if (!resolvedOfferId) {
                const paid = await this.offerFulfillment.getPaidAcceptedOffers(orderId);
                const storePaid = paid.filter((o) => o.storeId === latestDoc.storeId);
                if (storePaid.length === 1) resolvedOfferId = storePaid[0].id;
                else if (paid.length === 1) resolvedOfferId = paid[0].id;
            }
        }

        if (resolvedOfferId) {
            const linkedOffer = await this.prisma.offer.findFirst({
                where: { id: resolvedOfferId, orderId },
                include: { orderPart: true },
            });
            if (linkedOffer) {
                partName =
                    linkedOffer.orderPart?.name || order.partName || 'Part';
            }

            await this.offerFulfillment.applyVerificationDecision(
                orderId,
                resolvedOfferId,
                decision === 'APPROVED',
            );

            if (decision === 'APPROVED') {
                await this.prisma.verificationDocument.updateMany({
                    where: {
                        orderId,
                        storeId: latestDoc.storeId,
                        adminStatus: { in: ['REJECTED', 'PENDING'] },
                        OR: [{ offerId: resolvedOfferId }, { offerId: null }],
                    },
                    data: {
                        adminStatus: 'APPROVED',
                        adminReviewedBy: adminId,
                        adminReviewedAt: new Date(),
                        correctionDeadlineAt: null,
                    },
                });
                if (!latestDoc.offerId) {
                    await this.prisma.verificationDocument.update({
                        where: { id: latestDoc.id },
                        data: { offerId: resolvedOfferId },
                    }).catch(() => {});
                }
            }

            // Per-offer path skipped the order update in the txn above — enforce
            // correction SSOT here so aggregate cannot leave the order as PREPARED.
            if (decision === 'REJECTED') {
                await this.prisma.order.update({
                    where: { id: orderId },
                    data: {
                        status: newOrderStatus,
                        correctionDeadlineAt: null,
                        rejectionCount: newRejectionCount,
                    },
                });
            } else {
                const refreshed = await this.prisma.order.findUnique({
                    where: { id: orderId },
                });
                if (refreshed) newOrderStatus = refreshed.status;
            }
        }

        const paidOffers =
            await this.offerFulfillment.getPaidAcceptedOffers(orderId);
        const allOffersVerified =
            paidOffers.length > 0 &&
            paidOffers.every(
                (o) =>
                    o.fulfillmentStatus === 'VERIFICATION_SUCCESS' ||
                    o.fulfillmentStatus === 'READY_FOR_SHIPPING' ||
                    o.fulfillmentStatus === 'SHIPPED' ||
                    o.fulfillmentStatus === 'DELIVERED',
            );

        if (
            allOffersVerified &&
            newOrderStatus === OrderStatus.VERIFICATION_SUCCESS &&
            this.waybillsService.shouldAutoIssueOnVerification(order)
        ) {
            try {
                await this.waybillsService.autoIssueAfterVerificationSuccess(
                    orderId,
                    adminId,
                );
            } catch (waybillErr) {
                console.error(
                    '[adminReviewVerification] Waybill auto-issue failed (non-blocking):',
                    waybillErr instanceof Error ? waybillErr.message : waybillErr,
                );
            }
        }

        await this.auditLogs.logAction({
            orderId, action: `VERIFICATION_${decision}`, entity: 'Order',
            actorType: ActorType.ADMIN, actorId: adminId, actorName: 'Admin',
            previousState: order.status, newState: newOrderStatus,
            metadata: { 
                signedBy: data.adminSignatureName,
                signatureType: data.adminSignatureType,
                reason: data.rejectionReason,
                timestamp: new Date().toISOString()
            }
        });

        // Fetch store to get the ownerId for the notification recipient
        const store = await this.prisma.store.findUnique({
            where: { id: latestDoc.storeId },
            select: { ownerId: true }
        });
        const merchantUserId = store?.ownerId;

        // Notifications are secondary — never let them crash the core verification response
        try {
            if (merchantUserId) {
                console.log('[DEBUG adminReviewVerification] latestDoc.storeId =', latestDoc.storeId, '| merchantUserId =', merchantUserId);
                if (decision === 'APPROVED') {
                    await this.notifications.create({
                        recipientId: merchantUserId, recipientRole: 'MERCHANT', type: 'system_alert',
                        titleAr: 'تم قبول مطابقة القطعة', titleEn: 'Part Verification Approved',
                        messageAr: `تم اعتماد توثيق «${partName}» للطلب #${order.orderNumber}. يمكنك تسليمها للإدارة ومتابعة الشحن.`,
                        messageEn: `Verification for "${partName}" (#${order.orderNumber}) approved. You can hand over to admin.`,
                        link: `/merchant/orders/${order.id}`,
                        metadata: {
                            orderId: order.id,
                            verification: true,
                            ctaAr: 'متابعة التسليم',
                            ctaEn: 'Continue Handover',
                            waEvent: 'VERIFICATION',
                        },
                    });
                } else if (newRejectionCount >= 2) {
                    await this.notifications.create({
                        recipientId: merchantUserId, recipientRole: 'MERCHANT', type: 'system_alert',
                        titleAr: '❌ رفض نهائي وإلغاء الطلب', titleEn: '❌ Final Rejection & Order Cancelled',
                        messageAr: `تم رفض مطابقة الطلب #${order.orderNumber} للمرة الثانية. تم إلغاء الطلب وسحب المبلغ.`,
                        messageEn: `Order #${order.orderNumber} verification rejected twice. Order cancelled.`,
                        link: `/merchant/orders/${order.id}`,
                        metadata: { orderId: order.id, verification: true, waEvent: 'VERIFICATION' },
                    });
                    await this.notifications.create({
                        recipientId: order.customerId, recipientRole: 'CUSTOMER', type: 'system_alert',
                        titleAr: '❌ إلغاء الطلب لعدم المطابقة', titleEn: '❌ Order Cancelled due to Non-Matching',
                        messageAr: `تم إلغاء طلبك #${order.orderNumber} لعدم مطابقة القطعة من المتجر. جاري معالجة الاسترجاع وفق سياسة رسوم بوابة الدفع (2%).`,
                        messageEn: `Your order #${order.orderNumber} was cancelled due to a non-matching part. Refund is being processed per the 2% payment gateway fee policy.`,
                        link: `/customer/orders/${order.id}`,
                        metadata: { orderId: order.id, verification: true, waEvent: 'VERIFICATION' },
                    });
                } else {
                    const reasonSnippet = data.rejectionReason
                        ? `: ${String(data.rejectionReason).slice(0, 120)}`
                        : '';
                    await this.notifications.create({
                        recipientId: merchantUserId, recipientRole: 'MERCHANT', type: 'system_alert',
                        titleAr: 'مطلوب تصحيح التوثيق', titleEn: 'Verification correction required',
                        messageAr: `تم رفض توثيق «${partName}» للطلب #${order.orderNumber}${reasonSnippet}. يرجى تصحيح القطعة وإعادة التوثيق.`,
                        messageEn: `Verification for "${partName}" (#${order.orderNumber}) was rejected${reasonSnippet}. Please correct and resubmit.`,
                        link: `/merchant/orders/${order.id}`,
                        metadata: {
                            orderId: order.id,
                            offerId: latestDoc.offerId || undefined,
                            partName,
                            rejectionReason: data.rejectionReason || null,
                            correctionDeadlineAt: docCorrectionDeadline?.toISOString() || null,
                            orderNumber: order.orderNumber,
                            verification: true,
                            verificationCorrection: true,
                            waEvent: 'VERIFICATION',
                        },
                    });
                }
            }
        } catch (notifErr) {
            console.error('[adminReviewVerification] Notification failed (non-blocking):', notifErr.message);
        }

        if (newOrderStatus === OrderStatus.CANCELLED) {
            void this.escrowService
                .refundPaidOrderOnCancel(
                    orderId,
                    'Cancelled after second verification rejection',
                    { previousStatus: order.status },
                )
                .catch((err) => {
                    this.logger.warn(
                        `Cancel refund after verification reject failed for ${orderId}: ${
                            err instanceof Error ? err.message : String(err)
                        }`,
                    );
                });
        }

        return { success: true, status: newOrderStatus };
    }

    async submitCorrectionVerification(orderId: string, storeId: string, data: any) {
        const order = await this.prisma.order.findUnique({ 
            where: { id: orderId },
            include: { 
                offers: true,
                verificationDocuments: { orderBy: { createdAt: 'desc' }, take: 1 } 
            }
        });
        if (!order) throw new NotFoundException('Order not found');
        
        const hasAcceptedOffer = order.offers.some(o => o.status === 'accepted' && o.storeId === storeId);
        if (!hasAcceptedOffer) {
            throw new ForbiddenException('Not your order');
        }
        if (order.status !== OrderStatus.CORRECTION_PERIOD && order.status !== OrderStatus.NON_MATCHING) {
            throw new BadRequestException('Order not in correction period.');
        }

        const originalDoc = order.verificationDocuments[0];

        // Prefer latest closed/completed field task as previous cycle anchor.
        const previousTask = await this.prisma.verificationTask.findFirst({
            where: {
                orderId,
                OR: [
                    { decision: { not: null } },
                    { completedAt: { not: null } },
                    { status: { in: ['ADMIN_APPROVED', 'ADMIN_REJECTED', 'AWAITING_ADMIN_APPROVAL', 'AWAITING_CORRECTION'] } },
                ],
            },
            orderBy: { cycleNumber: 'desc' },
        });

        const correctionOfferId =
            originalDoc?.offerId ?? previousTask?.offerId ?? null;

        const doc = await this.prisma.verificationDocument.create({
            data: {
                orderId, storeId,
                offerId: correctionOfferId,
                isCorrection: true,
                originalDocumentId: originalDoc?.id,
                images: data.images || [],
                videoUrl: data.videoUrl,
                description: data.description,
                recipientName: data.recipientName,
                recipientSignature: data.recipientSignature,
                signatureType: data.signatureType || 'DRAWN',
                signatureText: data.signatureText || null,
                handoverDate: data.handoverDate ? new Date(data.handoverDate) : null,
                handoverTime: data.handoverTime,
            },
        });

        // Idempotent rematch cycle (coexists with admin-reject auto cycle).
        let newTask;
        if (previousTask) {
            newTask = await this.verificationTasks.startNewCycle({
                orderId,
                offerId: previousTask.offerId ?? correctionOfferId,
                previousTaskId: previousTask.id,
            });
        } else {
            newTask = await this.prisma.verificationTask.create({
                data: {
                    orderId,
                    status: 'PENDING_ASSIGNMENT',
                    cycleNumber: 1,
                },
            });
            await this.prisma.order.update({
                where: { id: orderId },
                data: { verificationTaskId: newTask.id },
            });
        }

        await this.prisma.order.update({
            where: { id: orderId },
            data: { status: OrderStatus.CORRECTION_SUBMITTED, verificationTaskId: newTask.id },
        });

        await this.auditLogs.logAction({
            orderId, action: 'SUBMIT_CORRECTION', entity: 'Order',
            actorType: ActorType.VENDOR, actorId: storeId, actorName: 'Merchant',
            previousState: order.status, newState: OrderStatus.CORRECTION_SUBMITTED
        });

        const admins = await this.prisma.user.findMany({ where: { role: { in: ['ADMIN', 'SUPER_ADMIN'] } } });
        for (const admin of admins) {
            await this.notifications.create({
                recipientId: admin.id, recipientRole: 'ADMIN', type: 'system_alert',
                titleAr: 'إعادة توثيق لطلب غير مطابق', titleEn: 'Corrected Verification Submitted',
                messageAr: `قام المتجر برفع توثيق جديد للطلب #${order.orderNumber}. بانتظار إعادة التقييم.`,
                messageEn: `Store uploaded corrected verification for #${order.orderNumber}. Pending re-evaluation.`,
                link: `/admin/orders/${order.id}`
            });
        }
        return { success: true, doc };
    }

    /**
     * After a shipment batch is marked delivered: update per-offer fulfillment and only
     * move the order to DELIVERED when every shipment record for the order is delivered.
     */
    async syncOrderStatusAfterShipmentDelivery(orderId: string) {
        const shipments = await this.prisma.shipment.findMany({
            where: { orderId },
            select: { id: true, status: true, actualDelivery: true },
        });

        if (shipments.length === 0) {
            return;
        }

        const deliveredStatus = ShipmentStatus.DELIVERED_TO_CUSTOMER;
        const now = new Date();

        for (const s of shipments) {
            if (s.status !== deliveredStatus) continue;
            await this.prisma.offer.updateMany({
                where: {
                    cartShipmentId: s.id,
                    deliveredAt: null,
                },
                data: {
                    fulfillmentStatus: OfferFulfillmentStatus.DELIVERED,
                    deliveredAt: now,
                },
            });
            // Legacy/single-shipment: offers without cartShipmentId on one-shipment orders
            // Do not require SHIPPED/READY — otherwise deliveredAt stays null and grace reminders never fire
            if (shipments.length === 1) {
                await this.prisma.offer.updateMany({
                    where: {
                        orderId,
                        status: { in: ['accepted', 'ACCEPTED'] },
                        cartShipmentId: null,
                        deliveredAt: null,
                    },
                    data: {
                        fulfillmentStatus: OfferFulfillmentStatus.DELIVERED,
                        deliveredAt: now,
                    },
                });
            }
            if (!s.actualDelivery) {
                await this.prisma.shipment.update({
                    where: { id: s.id },
                    data: { actualDelivery: now },
                });
            }
        }

        const deliveredCount = shipments.filter(
            (s) => s.status === deliveredStatus,
        ).length;
        const allDelivered = deliveredCount === shipments.length;
        const someDelivered = deliveredCount > 0 && !allDelivered;

        const order = await this.prisma.order.findUnique({
            where: { id: orderId },
            select: {
                id: true,
                status: true,
                orderNumber: true,
                deliveredAt: true,
                requestType: true,
                customerId: true,
                parts: { select: { id: true, name: true } },
            },
        });
        if (!order) return;

        const terminal: OrderStatus[] = [
            OrderStatus.COMPLETED,
            OrderStatus.WARRANTY_ACTIVE,
            OrderStatus.WARRANTY_EXPIRED,
            OrderStatus.CANCELLED,
        ];

        const isMulti = this.offerFulfillment.isMultiItemOrder(order);

        if (allDelivered) {
            const wasAlreadyDelivered =
                order.status === OrderStatus.DELIVERED ||
                terminal.includes(order.status);
            if (!wasAlreadyDelivered) {
                await this.transitionStatus(
                    orderId,
                    OrderStatus.DELIVERED,
                    {
                        id: 'SYSTEM',
                        type: ActorType.SYSTEM,
                        name: 'Shipment Delivery Sync',
                    },
                    `All ${shipments.length} shipment batch(es) delivered to customer`,
                    { deliveredBatchCount: shipments.length },
                );
            } else if (isMulti) {
                await this.offerFulfillment.recomputeOrderStatus(orderId);
            }

            // Dedicated grace-window alert for multi-item (single-item covered by DELIVERED status message)
            if (isMulti && !wasAlreadyDelivered) {
                const returnHours = await this.orderDurationConfig.getReturnWindowHours();
                const deliveredOffers = await this.prisma.offer.findMany({
                    where: {
                        orderId,
                        deliveredAt: { gte: new Date(now.getTime() - 60000) },
                        fulfillmentStatus: OfferFulfillmentStatus.DELIVERED,
                    },
                    include: { orderPart: true },
                });
                for (const offer of deliveredOffers) {
                    const partName = offer.orderPart?.name || 'Part';
                    await this.notifications
                        .notifyWithDedup(
                            order.customerId,
                            `wa:ORDER_STATUS:${orderId}:delivered_grace_window`,
                            180,
                            {
                                recipientId: order.customerId,
                                recipientRole: 'CUSTOMER',
                                titleAr: `وصلت قطعة: ${partName}`,
                                titleEn: `Part delivered: ${partName}`,
                                messageAr: `وصلت «${partName}» من الطلب #${order.orderNumber}. لديك ${returnHours} ساعة لطلب الإرجاع أو فتح نزاع على هذه القطعة.`,
                                messageEn: `"${partName}" from order #${order.orderNumber} has arrived. You have ${returnHours} hours to return or dispute this item.`,
                                type: 'ORDER',
                                link: `/dashboard/orders/${orderId}`,
                                metadata: {
                                    offerId: offer.id,
                                    orderPartId: offer.orderPartId,
                                    waEvent: 'ORDER_STATUS',
                                    graceWindow: true,
                                },
                            },
                        )
                        .catch(() => {});
                }
            }
            return;
        }

        if (someDelivered) {
            if (order.status === OrderStatus.DELIVERED) {
                await this.prisma.order.update({
                    where: { id: orderId },
                    data: {
                        status: OrderStatus.SHIPPED,
                        deliveredAt: null,
                    },
                });
                await this.auditLogs.logAction({
                    orderId,
                    action: 'PARTIAL_DELIVERY_ROLLBACK',
                    entity: 'Order',
                    actorType: ActorType.SYSTEM,
                    actorId: 'SYSTEM',
                    actorName: 'Shipment Delivery Sync',
                    previousState: OrderStatus.DELIVERED,
                    newState: OrderStatus.SHIPPED,
                    metadata: {
                        deliveredBatches: deliveredCount,
                        totalBatches: shipments.length,
                    },
                });
            }
            const nextStatus = await this.offerFulfillment.recomputeOrderStatus(orderId);

            if (isMulti && nextStatus === OrderStatus.PARTIALLY_DELIVERED) {
                const returnHours = await this.orderDurationConfig.getReturnWindowHours();
                const deliveredOffers = await this.prisma.offer.findMany({
                    where: {
                        orderId,
                        deliveredAt: { not: null },
                        fulfillmentStatus: OfferFulfillmentStatus.DELIVERED,
                    },
                    include: { orderPart: true },
                });
                for (const offer of deliveredOffers) {
                    if (offer.deliveredAt && offer.deliveredAt.getTime() >= now.getTime() - 60000) {
                        const partName = offer.orderPart?.name || 'Part';
                        await this.notifications
                            .notifyWithDedup(
                                order.customerId,
                                `wa:ORDER_STATUS:${orderId}:delivered_grace_window_partial`,
                                180,
                                {
                                    recipientId: order.customerId,
                                    recipientRole: 'CUSTOMER',
                                    titleAr: `وصلت قطعة: ${partName}`,
                                    titleEn: `Part delivered: ${partName}`,
                                    messageAr: `وصلت «${partName}» من الطلب #${order.orderNumber}. لديك ${returnHours} ساعة لطلب الإرجاع أو فتح نزاع على هذه القطعة.`,
                                    messageEn: `"${partName}" from order #${order.orderNumber} has arrived. You have ${returnHours} hours to return or dispute this item.`,
                                    type: 'ORDER',
                                    link: `/dashboard/orders/${orderId}`,
                                    metadata: {
                                        offerId: offer.id,
                                        orderPartId: offer.orderPartId,
                                        waEvent: 'ORDER_STATUS',
                                        graceWindow: true,
                                    },
                                },
                            )
                            .catch(() => {});
                    }
                }
            }
        }
    }

    async confirmDelivery(orderId: string, customerUserId: string, note?: string) {
        const order = await this.prisma.order.findUnique({
            where: { id: orderId },
            include: { 
                customer: { select: { id: true, email: true } }, 
                store: { select: { id: true, ownerId: true } },
                shipments: { select: { id: true, status: true } },
            }
        });

        if (!order) throw new NotFoundException('Order not found');
        if (order.customerId !== customerUserId) throw new ForbiddenException('Not your order');

        if (this.offerFulfillment.isMultiItemOrder(order)) {
            throw new BadRequestException(
                'Multi-part orders use carrier-tracked delivery per item. Each part is marked delivered automatically when its shipment arrives.',
            );
        }

        if (
            order.status !== OrderStatus.SHIPPED &&
            order.status !== OrderStatus.PARTIALLY_DELIVERED
        ) {
            throw new BadRequestException(
                'Order must be in Shipped or Partially Delivered state to confirm receipt.',
            );
        }

        if (order.shipments.length === 0) {
            throw new BadRequestException(
                'Delivery must be confirmed via shipment tracking. No shipment record found for this order.',
            );
        }

        const allDelivered = order.shipments.every(
            (s) => s.status === ShipmentStatus.DELIVERED_TO_CUSTOMER,
        );
        if (!allDelivered) {
            throw new BadRequestException(
                'All shipment batches must be delivered before you can confirm receipt for this order.',
            );
        }

        // Transition to DELIVERED
        const updatedOrder = await this.transitionStatus(
            orderId,
            OrderStatus.DELIVERED,
            { id: customerUserId, type: ActorType.CUSTOMER, name: order.customer.email },
            note || 'Customer confirmed receipt'
        );

        // Notify Merchant
        if (order.storeId && order.store) {
            await this.notifications.create({
                recipientId: order.store.ownerId,
                recipientRole: 'MERCHANT',
                type: 'system_alert',
                titleAr: 'تم استلام الطلب بنجاح ✅',
                titleEn: 'Order Received Successfully ✅',
                messageAr: `أكد العميل استلام الطلب رقم #${order.orderNumber}. الملاحظة: ${note || '-'}`,
                messageEn: `Customer confirmed receipt for order #${order.orderNumber}. Note: ${note || '-'}`,
                link: `/merchant/orders/${order.id}`
            });
        }

        // Notify Admin
        const admins = await this.prisma.user.findMany({ where: { role: { in: ['ADMIN', 'SUPER_ADMIN'] } } });
        for (const admin of admins) {
            await this.notifications.create({
                recipientId: admin.id,
                recipientRole: 'ADMIN',
                type: 'system_alert',
                titleAr: 'تأكيد استلام طلب',
                titleEn: 'Delivery Confirmation',
                messageAr: `قام العميل بتأكيد استلام الطلب رقم #${order.orderNumber}.`,
                messageEn: `Customer confirmed delivery for order #${order.orderNumber}.`,
                link: `/admin/orders/${order.id}`
            });
        }

        return updatedOrder;
    }

    async getAdminShippingCarts(search?: string) {
        const cartOrderStatuses: OrderStatus[] = [
            OrderStatus.PREPARATION,
            OrderStatus.PREPARED,
            OrderStatus.VERIFICATION,
            OrderStatus.VERIFICATION_SUCCESS,
            OrderStatus.READY_FOR_SHIPPING,
            OrderStatus.PARTIALLY_SHIPPED,
        ];

        const baseWhere: Prisma.OrderWhereInput = {
            status: { in: cartOrderStatuses },
            requestType: 'multiple',
        };

        const q = normalizeSearchQuery(search);
        let where = baseWhere;
        if (q) {
            const orderIds = await resolveOrderIds(this.prisma, q);
            where = mergeWhereWithSearch(baseWhere, {
                id: orderIds.length ? { in: orderIds } : { in: [] },
            });
        }

        const orders = await this.prisma.order.findMany({
            where,
            include: {
                customer: { select: { id: true, name: true, email: true, phone: true } },
                parts: true,
                payments: { where: { status: 'SUCCESS' } },
                offers: {
                    where: {
                        status: { in: ['accepted', 'ACCEPTED'] },
                        shippedFromCart: false,
                    },
                    include: {
                        store: true,
                        payments: { where: { status: 'SUCCESS' } },
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
        });

        const ordersWithPaidOffers = orders.filter((order) =>
            order.offers.some((o) => o.payments?.length > 0),
        );

        // Group by customer for better admin oversight
        const cartsByCustomer = ordersWithPaidOffers.reduce((acc, order) => {
            if (!acc[order.customerId]) {
                acc[order.customerId] = {
                    customerId: order.customerId,
                    customerName: order.customer.name || 'Anonymous',
                    customerEmail: order.customer.email,
                    customerPhone: order.customer.phone,
                    totalItems: 0,
                    totalValue: 0,
                    earliestPayment: new Date(),
                    offers: [],
                    orders: []
                };
            }
            
            const firstPayment = order.payments?.sort((a, b) => 
                (a.paidAt?.getTime() || 0) - (b.paidAt?.getTime() || 0)
            )[0];
            const paidAt = firstPayment?.paidAt || order.updatedAt;
            
            if (new Date(paidAt) < new Date(acc[order.customerId].earliestPayment)) {
                acc[order.customerId].earliestPayment = paidAt;
            }

            const enrichedOffers = this.enrichOffersWithCartBatch(order.offers as any[]);
            enrichedOffers.forEach((offer) => {
                acc[order.customerId].totalItems += 1;
                acc[order.customerId].totalValue += (Number(offer.unitPrice) + Number(offer.shippingCost));
                
                // Add specific offer info for the preview
                acc[order.customerId].offers.push({
                    id: offer.id,
                    orderNumber: order.orderNumber,
                    partName: order.parts.find(p => p.id === offer.orderPartId)?.name || order.partName,
                    storeName: offer.store?.name,
                    shippedFromCart: offer.shippedFromCart,
                    fulfillmentStatus: offer.fulfillmentStatus,
                    handoverPending: offer.handoverPending,
                    cartShipmentId: offer.cartShipmentId,
                    cartBatchType: offer.cartBatchType,
                    cartBatchSize: offer.cartBatchSize,
                    price: Number(offer.unitPrice),
                    status: order.status,
                });
            });

            acc[order.customerId].orders.push(order.id);
            return acc;
        }, {} as Record<string, any>);

        return Object.values(cartsByCustomer);
    }
}
