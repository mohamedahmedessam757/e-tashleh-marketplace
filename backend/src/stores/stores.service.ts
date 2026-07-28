import { BadRequestException, ForbiddenException, Injectable, NotFoundException, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UploadStoreDocumentDto } from './dto/upload-store-document.dto';
import { Prisma, StoreStatus, OrderStatus, StoreSubscriptionTier, ActorType } from '@prisma/client';
import { normalizeSearchQuery, resolveStoreIds } from '../common/search/admin-entity-search.util';
import { NotificationsService } from '../notifications/notifications.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { MerchantPerformanceService } from '../merchant-performance/merchant-performance.service';
import { enrichSessionLocations } from '../common/ip/ip-geolocation.util';

@Injectable()
export class StoresService {
    constructor(
        private prisma: PrismaService,
        private notificationsService: NotificationsService,
        private auditLogs: AuditLogsService,
        @Inject(forwardRef(() => MerchantPerformanceService))
        private readonly merchantPerformance: MerchantPerformanceService,
    ) { }

    async findMyStore(userId: string) {
        let store = await this.prisma.store.findFirst({
            where: { ownerId: userId },
            include: {
                owner: { 
                    select: { 
                        id: true,
                        name: true, 
                        email: true, 
                        phone: true,
                        withdrawalsFrozen: true,
                        withdrawalFreezeNote: true,
                        withdrawalFreezeSignature: true,
                        restrictionAlertMessage: true,
                        violationScore: true
                    } 
                },
                documents: true,
                contractAcceptances: {
                    orderBy: { acceptedAt: 'desc' },
                    take: 20
                }
            },
        });

        if (!store) {
            // Auto-create simplified store record if not exists for this Vendor
            let generatedStoreCode = '';
            let isUnique = false;
            while (!isUnique) {
                generatedStoreCode = 'D-' + String(Math.floor(1000 + Math.random() * 9000));
                const existing = await this.prisma.store.findUnique({ where: { storeCode: generatedStoreCode } });
                if (!existing) isUnique = true;
            }

            store = await this.prisma.store.create({
                data: {
                    ownerId: userId,
                    name: 'My New Store',
                    storeCode: generatedStoreCode,
                    status: StoreStatus.PENDING_DOCUMENTS
                },
                include: {
                    owner: { 
                        select: { 
                            id: true,
                            name: true, 
                            email: true, 
                            phone: true,
                            withdrawalsFrozen: true,
                            withdrawalFreezeNote: true,
                            withdrawalFreezeSignature: true,
                            restrictionAlertMessage: true,
                            violationScore: true
                        } 
                    },
                    documents: true,
                    contractAcceptances: {
                        orderBy: { acceptedAt: 'desc' },
                        take: 20
                    }
                },
            });
        }
        return store;
    }

    async updateMyStore(userId: string, dto: Partial<{
        name: string; description: string; logo: string; address: string;
        lat: number; lng: number; category: string;
        selectedMakes: string[]; selectedModels: string[];
        customMake: string; customModel: string;
    }>) {
        const store = await this.findMyStore(userId);
        const allowed = [
            'name', 'description', 'logo', 'address', 'lat', 'lng',
            'category', 'selectedMakes', 'selectedModels', 'customMake', 'customModel',
        ] as const;
        const data: Record<string, unknown> = { updatedAt: new Date() };
        for (const key of allowed) {
            if (dto[key] !== undefined) data[key] = dto[key];
        }
        const result = await this.prisma.store.update({
            where: { id: store.id },
            data: data as any,
            include: {
                owner: { 
                    select: { 
                        id: true,
                        name: true, 
                        email: true, 
                        phone: true,
                        withdrawalsFrozen: true,
                        withdrawalFreezeNote: true,
                        withdrawalFreezeSignature: true,
                        restrictionAlertMessage: true,
                        violationScore: true
                    } 
                },
                documents: true
            }
        });

        // Audit Log (2026 Vendor Self-Service)
        await this.auditLogs.logAction({
            entity: 'STORE',
            action: 'STORE_UPDATE',
            actorType: 'VENDOR',
            actorId: userId,
            metadata: { storeId: store.id, updatedFields: Object.keys(dto) }
        });

        return result;
    }

    async uploadDocument(userId: string, dto: UploadStoreDocumentDto) {
        const store = await this.findMyStore(userId);

        // 1. Check for active orders/returns/disputes (2026 Governance)
        const activeBusinessCount = await this.prisma.order.count({
            where: {
                storeId: store.id,
                OR: [
                    { status: { in: [OrderStatus.PREPARATION, OrderStatus.SHIPPED, OrderStatus.VERIFICATION, OrderStatus.PREPARED] } },
                    { returns: { some: { status: { notIn: ['COMPLETED', 'REJECTED', 'CANCELLED'] } } } },
                    { disputes: { some: { status: { notIn: ['RESOLVED', 'CLOSED'] } } } }
                ]
            }
        });

        const hasActiveBusiness = activeBusinessCount > 0;

        let parsedExpiry: Date | null = null;
        if (dto.expiresAt) {
            const d = new Date(dto.expiresAt);
            if (Number.isNaN(d.getTime())) {
                throw new BadRequestException('Invalid document expiry date');
            }
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            if (d < today) {
                throw new BadRequestException('Document expiry date must be today or in the future');
            }
            parsedExpiry = d;
        }

        const existingDoc = await this.prisma.storeDocument.findUnique({
            where: { storeId_docType: { storeId: store.id, docType: dto.docType } },
            select: { id: true, fileUrl: true },
        });
        const isReupload =
            Boolean(existingDoc?.fileUrl) ||
            store.status === StoreStatus.ACTIVE ||
            store.status === StoreStatus.PENDING_REVIEW ||
            store.status === StoreStatus.LICENSE_EXPIRED;
        if (isReupload && !parsedExpiry) {
            throw new BadRequestException(
                'Document expiry date is required when uploading or replacing a store document',
            );
        }

        // 2. Upsert document
        const doc = await this.prisma.storeDocument.upsert({
            where: { storeId_docType: { storeId: store.id, docType: dto.docType } },
            update: {
                fileUrl: dto.fileUrl,
                status: 'pending',
                reuploadRequested: false,
                reuploadMessage: null,
                adminName: null,
                adminSignature: null,
                ...(parsedExpiry ? { expiresAt: parsedExpiry } : {}),
                updatedAt: new Date(),
            },
            create: {
                storeId: store.id,
                docType: dto.docType,
                fileUrl: dto.fileUrl,
                status: 'pending',
                ...(parsedExpiry ? { expiresAt: parsedExpiry } : {}),
            },
        });

        if (dto.docType === 'LICENSE' && parsedExpiry) {
            await this.prisma.store.update({
                where: { id: store.id },
                data: { licenseExpiry: parsedExpiry },
            });
        }

        // Audit Log (2026 Vendor Compliance)
        await this.auditLogs.logAction({
            entity: 'STORE_DOCUMENT',
            action: 'DOC_UPLOAD',
            actorType: 'VENDOR',
            actorId: userId,
            metadata: {
                storeId: store.id,
                docType: dto.docType,
                expiresAt: parsedExpiry?.toISOString() || null,
            }
        });

        // 3. Conditional Review Transition (Graceful Governance)
        if (dto.docType === 'CR' || dto.docType === 'LICENSE') {
            if (!hasActiveBusiness) {
                // No active orders: Lock account for review immediately
                await this.prisma.store.update({
                    where: { id: store.id },
                    data: { status: StoreStatus.PENDING_REVIEW }
                });
                
                this.notificationsService.create({
                    recipientId: userId,
                    recipientRole: 'MERCHANT',
                    titleAr: 'تم تعليق الحساب مؤقتاً للمراجعة',
                    titleEn: 'Account temporarily suspended for review',
                    messageAr: 'لقد قمت بتحديث مستندات قانونية هامة. تم تعليق حسابك مؤقتاً حتى يقوم المسؤول بمراجعة التحديثات وتفعيل المتجر.',
                    messageEn: 'You have updated important legal documents. Your account is temporarily suspended until an admin reviews the updates.',
                    type: 'SYSTEM',
                    link: '/dashboard/merchant/profile'
                }).catch(() => {});
            } else {
                // Active orders exist: Queue review for later to prevent business interruption
                this.notificationsService.create({
                    recipientId: userId,
                    recipientRole: 'MERCHANT',
                    titleAr: 'تم استلام المستندات - المراجعة مجدولة',
                    titleEn: 'Documents Received - Review Queued',
                    messageAr: 'تم استلام المستندات بنجاح. نظراً لوجود طلبات نشطة، سيتم بدء المراجعة الرسمية وتعليق الحساب للمراجعة فور اكتمال طلباتك الحالية لضمان استمرارية عملك.',
                    messageEn: 'Documents received successfully. Due to active orders, formal review and suspension will begin once your current orders are fulfilled to ensure business continuity.',
                    type: 'ALERT',
                    link: '/dashboard/merchant/profile'
                }).catch(() => {});
            }

            // Notify Admin about the Update
            this.notificationsService.notifyAdmins({
                titleAr: hasActiveBusiness ? 'تحديث مستندات قانونية - المراجعة مجدولة' : 'تحديث مستندات قانونية - متجر معلق',
                titleEn: hasActiveBusiness ? 'Legal Docs Updated - Review Queued' : 'Legal Docs Updated - Store Suspended',
                messageAr: hasActiveBusiness 
                    ? `قام المتجر (${store.name}) بتحديث مستندات (${dto.docType})${parsedExpiry ? ` — ينتهي: ${parsedExpiry.toISOString().slice(0, 10)}` : ''}. المتجر لديه طلبات نشطة، لذا المراجعة مجدولة.`
                    : `قام المتجر (${store.name}) بتحديث مستندات (${dto.docType})${parsedExpiry ? ` — ينتهي: ${parsedExpiry.toISOString().slice(0, 10)}` : ''}. تم تعليق المتجر للمراجعة.`,
                messageEn: hasActiveBusiness
                    ? `Store (${store.name}) updated documents (${dto.docType})${parsedExpiry ? ` — expires: ${parsedExpiry.toISOString().slice(0, 10)}` : ''}. Store has active orders, review is queued.`
                    : `Store (${store.name}) updated documents (${dto.docType})${parsedExpiry ? ` — expires: ${parsedExpiry.toISOString().slice(0, 10)}` : ''}. Store suspended for review.`,
                type: 'ALERT',
                link: `/admin/stores/${store.id}`,
                metadata: {
                    storeId: store.id,
                    docType: dto.docType,
                    hasActiveBusiness,
                    expiresAt: parsedExpiry?.toISOString() || null,
                    priority: 'urgent',
                }
            }).catch(() => {});
        } else {
            // Notify Admin about standard document upload
            this.notificationsService.notifyAdmins({
                titleAr: 'مستند جديد قيد المراجعة',
                titleEn: 'New Document Pending Review',
                messageAr: `رفع المتجر (${store.name}) مستنداً جديداً: ${dto.docType}${parsedExpiry ? ` — ينتهي: ${parsedExpiry.toISOString().slice(0, 10)}` : ''}`,
                messageEn: `Store (${store.name}) uploaded a new document: ${dto.docType}${parsedExpiry ? ` — expires: ${parsedExpiry.toISOString().slice(0, 10)}` : ''}`,
                type: 'ALERT',
                link: `/admin/stores/${store.id}`,
                metadata: {
                    storeId: store.id,
                    docType: dto.docType,
                    expiresAt: parsedExpiry?.toISOString() || null,
                    priority: 'urgent',
                }
            }).catch(() => {});
        }

        return doc;
    }
    // --- ADMIN METHODS ---

    async findAll(search?: string) {
        const q = normalizeSearchQuery(search);
        const where: Prisma.StoreWhereInput = {};

        if (q) {
            const storeIds = await resolveStoreIds(this.prisma, q);
            where.id = storeIds.length ? { in: storeIds } : { in: [] };
        }

        return this.prisma.store.findMany({
            where,
            include: {
                owner: { select: { email: true, name: true } },
                documents: true,
                _count: { select: { orders: true } }
            },
            orderBy: { createdAt: 'desc' }
        });
    }

    async findOne(id: string) {
        const store = await this.prisma.store.findUnique({
            where: { id },
            include: {
                withdrawalRequests: {
                    orderBy: { createdAt: 'desc' },
                    take: 50
                },
                owner: { 
                    select: { 
                        id: true, 
                        email: true, 
                        name: true, 
                        phone: true, 
                        avatar: true,
                        withdrawalsFrozen: true,
                        withdrawalFreezeNote: true,
                        withdrawalFreezeSignature: true,
                        restrictionAlertMessage: true,
                        walletTransactions: {
                            orderBy: { createdAt: 'desc' },
                            take: 50,
                            include: {
                                payment: {
                                    include: {
                                        order: {
                                            select: {
                                                id: true,
                                                orderNumber: true,
                                                status: true
                                            }
                                        }
                                    }
                                },
                                escrow: {
                                    include: {
                                        order: {
                                            select: {
                                                id: true,
                                                orderNumber: true,
                                                status: true
                                            }
                                        }
                                    }
                                }
                            }
                        },
                        Session: {
                            orderBy: { lastActive: 'desc' },
                            take: 10
                        },
                        securityLogs: {
                            orderBy: { createdAt: 'desc' },
                            take: 10
                        }
                    } 
                },
                offers: {
                    orderBy: { updatedAt: 'desc' },
                    take: 80,
                    include: {
                        order: {
                            select: {
                                id: true,
                                orderNumber: true,
                                status: true,
                                createdAt: true,
                            },
                        },
                        orderPart: { select: { id: true, name: true } },
                    },
                },
                documents: true,
                contractAcceptances: {
                    orderBy: { acceptedAt: 'desc' },
                    take: 5
                },
                reviews: {
                    orderBy: { createdAt: 'desc' },
                    take: 20,
                    include: {
                        customer: { select: { name: true, avatar: true } }
                    }
                },
                _count: { 
                    select: { 
                        orders: true,
                        reviews: true,
                        offers: true
                    } 
                }
            }
        });

        if (!store) throw new NotFoundException('Store not found');

        // 2. Resolve Inclusive Orders (Directly Assigned + Accepted Offers)
        // This fixes the issue where orders were missing from the simple Prisma relation
        const inclusiveOrders = await this.prisma.order.findMany({
            where: {
                OR: [
                    { storeId: id }, // Directly assigned
                    { offers: { some: { storeId: id } } } // ANY offer by this store
                ]
            },
            take: 50, // Increased visibility for Admin
            orderBy: { createdAt: 'desc' },
            include: {
                customer: { select: { name: true } },
                parts: { select: { id: true, name: true, quantity: true } },
                acceptedOffer: {
                    select: { id: true, unitPrice: true, shippingCost: true, status: true, storeId: true }
                },
                offers: {
                    where: { storeId: id }, // this store's offers (active + withdrawn)
                    orderBy: { updatedAt: 'desc' },
                    select: {
                        id: true,
                        offerNumber: true,
                        unitPrice: true,
                        shippingCost: true,
                        status: true,
                        isWithdrawn: true,
                        withdrawalType: true,
                        createdAt: true,
                        updatedAt: true,
                        condition: true,
                        hasWarranty: true,
                        warrantyDuration: true,
                        deliveryDays: true,
                        offerImage: true,
                        weightKg: true,
                        partType: true,
                        notes: true,
                        cylinders: true,
                        orderPartId: true,
                        payments: {
                            where: { status: 'SUCCESS' },
                            select: { totalAmount: true },
                        },
                    },
                },
                disputes: { select: { id: true, status: true, reason: true, createdAt: true } },
                returns: { select: { id: true, status: true, reason: true, createdAt: true } }
            }
        });

        // 3. Performance score from inclusive orders
        const totalCount = inclusiveOrders.length;
        const successCount = inclusiveOrders.filter(o =>
            ['DELIVERED', 'COMPLETED', 'VERIFICATION_SUCCESS'].includes(o.status),
        ).length;
        const calculatedScore = totalCount > 0 ? (successCount / totalCount) * 100 : 0;

        // 4. Inject Dynamic Data — preserve authoritative balances from DB
        // (store.balance, store.pendingBalance, store.frozenBalance, store.lifetimeEarnings
        //  are kept in sync by escrow.service / payments.service / returns.service)
        const s = store as any;
        const OFFER_MODIFICATION_ACTIONS = [
            'UPDATE_OFFER',
            'CANCEL_OFFER_VENDOR',
            'VOLUNTARY_WITHDRAW_OFFER',
            'WITHDRAW_OFFER',
        ] as const;

        const modificationLogs = store.ownerId
            ? await this.prisma.auditLog.findMany({
                  where: {
                      action: { in: [...OFFER_MODIFICATION_ACTIONS] },
                      actorId: store.ownerId,
                  },
                  orderBy: { timestamp: 'desc' },
                  take: 200,
                  include: {
                      order: { select: { id: true, orderNumber: true } },
                  },
              })
            : [];

        const mapModificationKind = (action: string): string => {
            switch (action) {
                case 'UPDATE_OFFER':
                    return 'EDIT';
                case 'CANCEL_OFFER_VENDOR':
                    return 'CANCEL';
                case 'VOLUNTARY_WITHDRAW_OFFER':
                    return 'VOLUNTARY_WITHDRAW';
                case 'WITHDRAW_OFFER':
                    return 'VIOLATION_WITHDRAW';
                default:
                    return action;
            }
        };

        const modTotal = store.totalOffersSent || 0;
        const modActions = (store.editCount || 0) + (store.withdrawalCount || 0);
        const modificationRatePercent =
            modTotal > 0 ? Math.round((modActions / modTotal) * 1000) / 10 : 0;

        const ownerSessions = s.owner?.Session
            ? await enrichSessionLocations(s.owner.Session, {
                  locale: 'en',
                  onPersist: async (id, location) => {
                      await this.prisma.session.update({
                          where: { id },
                          data: { location },
                      });
                  },
              })
            : [];

        const operationalKpis = await this.computeOperationalKpis(id, store.rating);

        const enrichedStore = {
            ...store,
            owner: s.owner ? {
                ...s.owner,
                sessions: ownerSessions,
            } : null,
            orders: inclusiveOrders,
            walletTransactions: s.owner ? s.owner.walletTransactions || [] : [],
            withdrawalRequests: s.withdrawalRequests || [],
            balance: Number(store.balance),
            pendingBalance: Number(store.pendingBalance),
            frozenBalance: Number(store.frozenBalance),
            lifetimeEarnings: Number(store.lifetimeEarnings),
            performanceScore: calculatedScore,
            operationalKpis,
            rating: Number(store.rating) || 0,
            offerGovernance: {
                totalOffersSent: modTotal,
                editCount: store.editCount || 0,
                withdrawalCount: store.withdrawalCount || 0,
                monthlyOfferDeletionCount: store.monthlyOfferDeletionCount || 0,
                monthlyOfferDeletionMonth: store.monthlyOfferDeletionMonth || null,
                offerBiddingRestrictedUntil: store.offerBiddingRestrictedUntil || null,
                offerBiddingRestrictionReason: store.offerBiddingRestrictionReason || null,
                monthlyDeletionLimit: 50,
                monthlyDeletionWarnAt: 35,
                modificationRatePercent,
                exceedsThreshold: (store.monthlyOfferDeletionCount || 0) >= 35,
                events: modificationLogs.map((log) => {
                    const meta = (log.metadata || {}) as Record<string, unknown>;
                    let previousUnitPrice: number | null = null;
                    let previousShipping: number | null = null;
                    let newUnitPrice: number | null = null;
                    let newShipping: number | null = null;
                    try {
                        if (log.previousState && String(log.previousState).startsWith('{')) {
                            const prev = JSON.parse(String(log.previousState));
                            previousUnitPrice = prev?.unitPrice != null ? Number(prev.unitPrice) : null;
                            previousShipping = prev?.shippingCost != null ? Number(prev.shippingCost) : null;
                        }
                    } catch { /* ignore */ }
                    try {
                        if (log.newState && String(log.newState).startsWith('{')) {
                            const next = JSON.parse(String(log.newState));
                            newUnitPrice = next?.unitPrice != null ? Number(next.unitPrice) : null;
                            newShipping = next?.shippingCost != null ? Number(next.shippingCost) : null;
                        }
                    } catch { /* ignore */ }
                    if (meta.previousUnitPrice != null) previousUnitPrice = Number(meta.previousUnitPrice);
                    if (meta.previousShipping != null) previousShipping = Number(meta.previousShipping);
                    if (meta.newUnitPrice != null) newUnitPrice = Number(meta.newUnitPrice);
                    if (meta.newShipping != null) newShipping = Number(meta.newShipping);

                    return {
                        id: log.id,
                        action: log.action,
                        kind: mapModificationKind(log.action),
                        orderId: log.orderId,
                        orderNumber:
                            log.order?.orderNumber ??
                            (meta.orderNumber as string) ??
                            null,
                        offerNumber: (meta.offerNumber as string) ?? null,
                        offerId: (meta.offerId as string) ?? null,
                        timestamp: log.timestamp,
                        actorName: log.actorName,
                        previousUnitPrice,
                        previousShipping,
                        newUnitPrice,
                        newShipping,
                    };
                }),
            },
            _count: {
                ...(s._count || {}),
                orders: totalCount
            }
        };

        return enrichedStore;
    }
    async updateStatus(adminId: string, id: string, status: StoreStatus, reason?: string, suspendedUntil?: Date) {
        const shouldPersistReason =
            status === StoreStatus.REJECTED ||
            status === StoreStatus.BLOCKED ||
            status === StoreStatus.SUSPENDED;

        // 1) Persist status first — this is the source of truth for the HTTP response.
        const result = await this.prisma.store.update({
            where: { id },
            data: {
                status,
                rejectionReason: shouldPersistReason ? (reason ?? null) : null,
                suspendedUntil: status === StoreStatus.SUSPENDED ? suspendedUntil : null,
                updatedAt: new Date(),
            },
            select: {
                id: true,
                name: true,
                status: true,
                ownerId: true,
                suspendedUntil: true,
                rejectionReason: true,
            },
        });

        // 2) Side-effects must never turn a successful activation into a client "Failed to update status".
        //    WhatsApp / sockets / audit failures are logged and continue.
        try {
            if (status === StoreStatus.ACTIVE) {
                const pendingDocs = await this.prisma.storeDocument.findMany({
                    where: { storeId: id, status: 'pending' },
                    select: { id: true, docType: true, expiresAt: true },
                });
                const contract = await this.prisma.contractAcceptance.findFirst({
                    where: { storeId: id, status: 'ACTIVE' },
                    orderBy: { acceptedAt: 'desc' },
                    select: { secondPartyData: true },
                });
                const storeRow = await this.prisma.store.findUnique({
                    where: { id },
                    select: { licenseExpiry: true },
                });
                const contractLicense =
                    (contract?.secondPartyData as any)?.licenseExpiry ||
                    storeRow?.licenseExpiry ||
                    null;

                for (const doc of pendingDocs) {
                    let expiresAt = doc.expiresAt;
                    if (!expiresAt && doc.docType === 'LICENSE' && contractLicense) {
                        const d = new Date(contractLicense);
                        if (!Number.isNaN(d.getTime())) expiresAt = d;
                    }
                    await this.prisma.storeDocument.update({
                        where: { id: doc.id },
                        data: {
                            status: 'approved',
                            ...(expiresAt ? { expiresAt } : {}),
                            updatedAt: new Date(),
                        },
                    });
                }

                // Fire-and-forget: do not await WhatsApp on the admin HTTP path
                if (result.ownerId) {
                    void this.notificationsService
                        .create({
                            recipientId: result.ownerId,
                            recipientRole: 'MERCHANT',
                            titleAr: 'تم تفعيل متجرك المشترك!',
                            titleEn: 'Your store has been activated!',
                            messageAr: `مبروك! لقد تم مراجعة بيانات الاعتماد واعتمادها بنجاح. يمكنك الآن البدء في تقديم عروض على الطلبات وتلقي الأرباح.`,
                            messageEn: `Congratulations! Your credentials have been successfully reviewed and approved. You can now start placing offers and receiving profits.`,
                            type: 'SUCCESS',
                            link: '/dashboard/merchant/profile',
                            metadata: { docType: 'store_activation', storeId: id, waEvent: 'STORE_ACTIVATION' },
                        })
                        .catch((e) => console.error('Failed to send store activation notification', e));
                }
            }

            if (status === StoreStatus.REJECTED && result.ownerId) {
                void this.notificationsService
                    .create({
                        recipientId: result.ownerId,
                        recipientRole: 'MERCHANT',
                        titleAr: 'تم رفض طلب إنشاء المتجر',
                        titleEn: 'Store registration request rejected',
                        messageAr: `نأسف لإبلاغك بأنه تم رفض طلبك. السبب: ${reason || 'يرجى مراجعة المستندات والمحاولة مرة أخرى بحساب جديد'}.`,
                        messageEn: `We regret to inform you that your request was rejected. Reason: ${reason || 'Please review documents and try again with a new account'}.`,
                        type: 'SUCCESS',
                        link: '/auth/register',
                        metadata: { docType: 'store_rejection', storeId: id, waEvent: 'DOCUMENT' },
                    })
                    .catch((e) => console.error('Failed to send store rejection notification', e));
            }

            if (status === StoreStatus.SUSPENDED && result.ownerId) {
                const untilLabel = suspendedUntil
                    ? new Date(suspendedUntil).toLocaleString('ar-EG', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                      })
                    : '';
                void this.notificationsService
                    .create({
                        recipientId: result.ownerId,
                        recipientRole: 'MERCHANT',
                        titleAr: '⏸️ تم إيقاف متجرك مؤقتاً',
                        titleEn: '⏸️ Your Store Has Been Temporarily Suspended',
                        messageAr: `تم إيقاف متجر (${result.name}) مؤقتاً.${untilLabel ? ` ينتهي الإيقاف في: ${untilLabel}.` : ''} السبب: ${reason || 'قرار إداري'}.`,
                        messageEn: `Store (${result.name}) has been temporarily suspended.${untilLabel ? ` Suspension ends: ${untilLabel}.` : ''} Reason: ${reason || 'Administrative decision'}.`,
                        type: 'SECURITY',
                        link: '/dashboard/merchant/profile',
                    })
                    .catch((e) => console.error('Failed to send store suspension notification', e));
            }

            if (status === StoreStatus.BLOCKED && result.ownerId) {
                void this.notificationsService
                    .create({
                        recipientId: result.ownerId,
                        recipientRole: 'MERCHANT',
                        titleAr: '⛔ تم حظر متجرك بشكل دائم',
                        titleEn: '⛔ Your Store Has Been Permanently Blocked',
                        messageAr: `تم حظر متجر (${result.name}) بشكل دائم. السبب: ${reason || 'قرار إداري'}. يرجى التواصل مع الدعم الفني.`,
                        messageEn: `Store (${result.name}) has been permanently blocked. Reason: ${reason || 'Administrative decision'}. Please contact support.`,
                        type: 'SECURITY',
                        link: '/dashboard/merchant/profile',
                    })
                    .catch((e) => console.error('Failed to send store block notification', e));
            }

            await this.auditLogs.logAction({
                action: 'STORE_STATUS_CHANGE',
                entity: 'STORE',
                actorType: ActorType.ADMIN,
                actorId: adminId,
                reason: reason || 'Manual Admin Update',
                metadata: {
                    storeId: id,
                    storeName: result.name,
                    newStatus: status,
                    suspendedUntil: suspendedUntil,
                },
            });

            await this.notificationsService.notifyAdmins({
                titleAr: `تحديث حالة متجر: ${status} 🏪`,
                titleEn: `Store Status Updated: ${status} 🏪`,
                messageAr: `تم تغيير حالة متجر (${result.name}) إلى ${status}. السبب: ${reason || 'تحديث إداري'}`,
                messageEn: `Store (${result.name}) status changed to ${status}. Reason: ${reason || 'Admin update'}`,
                type: 'SYSTEM',
                metadata: { storeId: id, status },
            });
        } catch (sideEffectError) {
            console.error(
                `Store status updated to ${status} but post-update side effects failed (storeId=${id}):`,
                sideEffectError,
            );
        }

        // Lean serializable payload (avoid Prisma Decimal / nested owner serialization issues)
        return {
            id: result.id,
            name: result.name,
            status: result.status,
            suspendedUntil: result.suspendedUntil,
            rejectionReason: result.rejectionReason,
            message: 'Status updated successfully',
        };
    }

    async updateAdminNotes(adminId: string, id: string, notes: string) {
        const result = await this.prisma.store.update({
            where: { id },
            data: { adminNotes: notes, updatedAt: new Date() }
        });

        // --- Task 12.1: Log Notes Update with Store Metadata ---
        await this.auditLogs.logAction({
            action: 'STORE_NOTES_UPDATE',
            entity: 'STORE',
            actorType: 'ADMIN',
            actorId: adminId,
            reason: 'Internal Admin Note Added/Modified',
            metadata: { 
                storeId: id,
                storeName: result.name // Added for global transparency
            }
        });

        return result;
    }

    async updateDocumentStatus(
        adminId: string, 
        storeId: string, 
        docType: string, 
        status: string, 
        reason?: string,
        adminName?: string,
        adminSignature?: string
    ) {
        // Find specific doc by type for this store
        const dataToUpdate: any = {
            status,
            rejectedReason: reason,
            reuploadRequested: status === 'reupload_requested',
            reuploadMessage: status === 'reupload_requested' ? reason : null,
            adminName: status === 'reupload_requested' ? adminName : null,
            adminSignature: status === 'reupload_requested' ? adminSignature : null,
            updatedAt: new Date()
        };

        if (status === 'approved' || status === 'ACTIVE') {
            // Preserve existing expiresAt; for LICENSE fallback to store/contract license expiry
            const existingDoc = await this.prisma.storeDocument.findFirst({
                where: { storeId, docType: docType as any },
                select: { expiresAt: true },
            });
            if (!existingDoc?.expiresAt && (docType === 'LICENSE' || docType === 'license')) {
                const storeMeta = await this.prisma.store.findUnique({
                    where: { id: storeId },
                    select: {
                        licenseExpiry: true,
                        contractAcceptances: {
                            where: { isActive: true },
                            orderBy: { acceptedAt: 'desc' },
                            take: 1,
                            select: { secondPartyData: true },
                        },
                    },
                });
                const fromContract =
                    (storeMeta?.contractAcceptances?.[0]?.secondPartyData as any)?.licenseExpiry;
                const raw = storeMeta?.licenseExpiry || fromContract;
                if (raw) {
                    const d = new Date(raw);
                    if (!Number.isNaN(d.getTime())) dataToUpdate.expiresAt = d;
                }
            }
            dataToUpdate.reuploadRequested = false;
        }

        const updated = await this.prisma.storeDocument.updateMany({
            where: {
                storeId,
                docType: docType as any // Cast to DocType enum
            },
            data: dataToUpdate
        });

        // --- Task 12.1: Fetch Store Name for Global Audit Transparency ---
        const store = await this.prisma.store.findUnique({ 
            where: { id: storeId },
            select: { name: true, ownerId: true }
        });

        // --- Task 11.3: Log Individual Document Activity ---
        await this.auditLogs.logAction({
            action: status === 'reupload_requested' ? 'DOC_REUPLOAD_REQUEST' : `DOC_${status.toUpperCase()}`,
            entity: 'STORE_DOCUMENT',
            actorType: 'ADMIN',
            actorId: adminId,
            reason: reason || 'Document Review Protocol',
            metadata: { 
                storeId, 
                storeName: store?.name || 'Unknown Store',
                docType, 
                status,
                adminName
            }
        });

        // Notify Merchant about status update
        if (store && store.ownerId) {
            const isApproved = status === 'approved' || status === 'ACTIVE';
            const isReupload = status === 'reupload_requested';
            const isRejected = status === 'rejected' || status === 'REJECTED';

            if (isApproved) {
                await this.notificationsService.create({
                    recipientId: store.ownerId,
                    recipientRole: 'MERCHANT',
                    titleAr: '🎉 تم اعتماد المستند بنجاح',
                    titleEn: '🎉 Document Approved Successfully',
                    messageAr: `تمت مراجعة واعتماد مستندك (${docType}) من قبل الإدارة بنجاح.`,
                    messageEn: `Your document (${docType}) has been successfully reviewed and approved by administration.`,
                    type: 'SUCCESS',
                    link: '/dashboard/merchant/profile',
                    metadata: { docType, waEvent: 'DOCUMENT' },
                }).catch(() => {});
            } else if (isReupload || isRejected) {
                await this.notificationsService.create({
                    recipientId: store.ownerId,
                    recipientRole: 'MERCHANT',
                    titleAr: isReupload ? 'مستند يحتاج إلى إعادة رفع' : 'تم رفض المستند',
                    titleEn: isReupload ? 'Document needs re-upload' : 'Document Rejected',
                    messageAr: isReupload 
                        ? `قام المسؤول (${adminName || 'الإدارة'}) بطلب إعادة رفع المستند (${docType}). السبب: ${reason || 'يرجى المراجعة'}.`
                        : `تم رفض المستند الخاص بك (${docType}) من قبل الإدارة. السبب: ${reason || 'يرجى مراجعة البيانات وإعادة الرفع'}.`,
                    messageEn: isReupload
                        ? `Admin (${adminName || 'System'}) requested re-upload for (${docType}). Reason: ${reason || 'Please review'}.`
                        : `Your document (${docType}) was rejected by the administration. Reason: ${reason || 'Please review and re-upload'}.`,
                    type: isReupload ? 'ALERT' : 'SYSTEM',
                    link: '/dashboard/merchant/profile',
                    metadata: { docType, waEvent: 'DOCUMENT' },
                }).catch(e => console.error('Failed to notify merchant of document status update', e));
            }
        }

        return updated;
    }

    /**
     * Real operational KPIs for a store (merchant + admin profiles).
     * - responseSpeed: avg hours from order created → offer submitted
     * - prepSpeed: avg hours from successful payment → offer preparedAt
     * - acceptanceRate: accepted offers / total offers
     */
    private async computeOperationalKpis(storeId: string, storeRating?: number | Prisma.Decimal | null) {
        const round1 = (n: number) => Math.round(n * 10) / 10;
        const avgHours = (samples: number[]): number | null => {
            if (!samples.length) return null;
            return round1(samples.reduce((a, b) => a + b, 0) / samples.length);
        };

        const [totalOffers, acceptedOffers, recentOffers] = await Promise.all([
            this.prisma.offer.count({ where: { storeId } }),
            this.prisma.offer.count({ where: { storeId, status: 'accepted' } }),
            this.prisma.offer.findMany({
                where: { storeId, isWithdrawn: false },
                orderBy: { createdAt: 'desc' },
                take: 200,
                select: {
                    createdAt: true,
                    preparedAt: true,
                    order: { select: { createdAt: true } },
                    payments: {
                        where: { status: 'SUCCESS' },
                        orderBy: { paidAt: 'asc' },
                        take: 1,
                        select: { paidAt: true, createdAt: true },
                    },
                },
            }),
        ]);

        const responseSamples: number[] = [];
        const prepSamples: number[] = [];
        const MS_PER_HOUR = 3_600_000;

        for (const offer of recentOffers) {
            const orderCreated = offer.order?.createdAt?.getTime();
            const offerCreated = offer.createdAt.getTime();
            if (orderCreated && offerCreated >= orderCreated) {
                responseSamples.push((offerCreated - orderCreated) / MS_PER_HOUR);
            }

            if (offer.preparedAt) {
                const paid = offer.payments[0];
                const paidAt = (paid?.paidAt || paid?.createdAt)?.getTime();
                const preparedAt = offer.preparedAt.getTime();
                if (paidAt && preparedAt >= paidAt) {
                    prepSamples.push((preparedAt - paidAt) / MS_PER_HOUR);
                }
            }
        }

        const responseSpeed = avgHours(responseSamples);
        const prepSpeed = avgHours(prepSamples);
        const acceptanceRate =
            totalOffers > 0 ? Math.round((acceptedOffers / totalOffers) * 100) : 0;
        const rating = Number(storeRating ?? 0) || 0;

        return {
            responseSpeed: responseSpeed ?? 0,
            prepSpeed: prepSpeed ?? 0,
            hasResponseSpeed: responseSpeed != null,
            hasPrepSpeed: prepSpeed != null,
            responseSpeedSamples: responseSamples.length,
            prepSpeedSamples: prepSamples.length,
            acceptanceRate,
            rating: Math.round(rating * 10) / 10,
            totalOffers,
            acceptedOffers,
        };
    }

    async getDashboardStats(userId: string) {
        const store = await this.findMyStore(userId);

        // 1. Weekly Earnings (Last 7 days)
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
        sevenDaysAgo.setHours(0, 0, 0, 0);

        const recentOrders = await this.prisma.order.findMany({
            where: {
                acceptedOffer: { storeId: store.id },
                status: { in: ['PREPARATION', 'SHIPPED', 'DELIVERED', 'COMPLETED'] },
                updatedAt: { gte: sevenDaysAgo }
            },
            select: {
                updatedAt: true,
                acceptedOffer: { select: { unitPrice: true, shippingCost: true } }
            }
        });

        // Initialize array for exactly 7 days [Day-6, Day-5, ... Today]
        const weeklyEarnings = [0, 0, 0, 0, 0, 0, 0];
        const today = new Date().setHours(0, 0, 0, 0);

        recentOrders.forEach(order => {
            if (order.acceptedOffer) {
                const orderDate = new Date(order.updatedAt).setHours(0, 0, 0, 0);
                const diffTime = today - orderDate;
                const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

                if (diffDays >= 0 && diffDays <= 6) {
                    const idx = 6 - diffDays; // 6 is today, 0 is 6 days ago
                    const net = Number(order.acceptedOffer.unitPrice) + Number(order.acceptedOffer.shippingCost);
                    weeklyEarnings[idx] += net;
                }
            }
        });

        // 2. KPIs (real operational averages — no mocks)
        const operationalKpis = await this.computeOperationalKpis(store.id, store.rating);
        const acceptanceRate = operationalKpis.acceptanceRate;

        // Active Orders
        const activeOrdersCount = await this.prisma.order.count({
            where: {
                acceptedOffer: { storeId: store.id },
                OR: [
                    { status: { in: [OrderStatus.PREPARATION, OrderStatus.SHIPPED] } },
                    { returns: { some: { status: { notIn: ['COMPLETED', 'REJECTED', 'CANCELLED'] } } } },
                    { disputes: { some: { status: { notIn: ['RESOLVED', 'CLOSED'] } } } }
                ]
            }
        });

        // Smart alerts for document expiries
        const currentDate = new Date();
        let shouldAutoSuspend = false;

        store.documents.forEach((doc) => {
            if (doc.expiresAt && doc.status === 'approved') {
                const expireDate = new Date(doc.expiresAt);
                const diffTime = expireDate.getTime() - currentDate.getTime();
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                // If passed the 15-day grace period
                if (diffDays < -15) {
                    shouldAutoSuspend = true;
                }
            }
        });

        if (shouldAutoSuspend && ['ACTIVE', 'PENDING_REVIEW'].includes(store.status)) {
            await this.prisma.store.update({
                where: { id: store.id },
                data: { status: StoreStatus.LICENSE_EXPIRED }
            });
            await this.notificationsService.create({
                recipientId: store.ownerId,
                recipientRole: 'MERCHANT',
                titleAr: 'إيقاف الحساب بسبب انتهاء المستندات',
                titleEn: 'Account Suspended due to Expired Documents',
                messageAr: `تم إيقاف حسابك لعدم تجديد المستندات الأساسية بعد فترة السماح (15 يوماً). يرجى رفع المستندات المجددة.`,
                messageEn: `Your account has been suspended for not renewing mandatory documents after the 15-day grace period. Please upload renewed documents.`,
                type: 'DOC_EXPIRY',
                link: '/dashboard/merchant/profile',
                metadata: { waEvent: 'DOCUMENT', docType: 'license_expiry', storeId: store.id },
            }).catch(() => {});

            // Notify Admin about Expiry Suspension
            this.notificationsService.notifyAdmins({
                titleAr: `عاجل: إيقاف متجر (${store.name})`,
                titleEn: `Urgent: Store suspended (${store.name})`,
                messageAr: `تم إيقاف المتجر (${store.name}) تلقائياً بسبب انتهاء صلاحية المستندات وفترة السماح.`,
                messageEn: `Store (${store.name}) was automatically suspended due to expired documents and grace period.`,
                type: 'DOC_EXPIRY',
                link: `/admin/stores/${store.id}`,
                metadata: { storeId: store.id, storeName: store.name }
            }).catch(() => {});
        } else {
            // Check for upcoming expiries (30 days or in grace period)
            const warningDocs = store.documents.filter(doc => {
                if (!doc.expiresAt || doc.status !== 'approved') return false;
                const expireDate = new Date(doc.expiresAt);
                const diffDays = Math.ceil((expireDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24));
                return diffDays <= 30 && diffDays >= -15;
            });
            
            if (warningDocs.length > 0) {
                const soonest = warningDocs
                    .map(d => ({ d, days: Math.ceil((new Date(d.expiresAt!).getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24)) }))
                    .sort((a, b) => a.days - b.days)[0];
                const daysLeft = soonest?.days ?? 0;
                const inGrace = daysLeft <= 0;

                // Throttle notifications to once a week
                const recentAlert = await this.prisma.notification.findFirst({
                    where: {
                        recipientId: store.ownerId,
                        type: 'DOC_EXPIRY',
                        createdAt: { gte: new Date(currentDate.getTime() - 7 * 24 * 60 * 60 * 1000) }
                    }
                });

                if (!recentAlert) {
                    await this.notificationsService.create({
                        recipientId: store.ownerId,
                        recipientRole: 'MERCHANT',
                        titleAr: inGrace ? 'عاجل: مستند منتهٍ — فترة السماح' : 'تنبيه عاجل: مستندات ستنتهي قريباً',
                        titleEn: inGrace ? 'Urgent: Document expired — grace period' : 'Urgent: Documents expiring soon',
                        messageAr: inGrace
                            ? `انتهت صلاحية مستنداتك. متبقي ${15 + daysLeft} يوم قبل تجميد الحساب تلقائياً. حدّث المستندات فوراً.`
                            : `مستنداتك تنتهي خلال ${daysLeft} يوم. حدّثها الآن لتجنب تقييد/تجميد الحساب.`,
                        messageEn: inGrace
                            ? `Your documents expired. ${15 + daysLeft} day(s) left before auto-freeze. Update documents now.`
                            : `Your documents expire in ${daysLeft} day(s). Update them now to avoid account restriction.`,
                        type: 'DOC_EXPIRY',
                        link: '/dashboard/merchant/profile',
                        metadata: { waEvent: 'DOCUMENT', docType: 'expiry_warning', storeId: store.id },
                    }).catch(() => {});

                    this.notificationsService.notifyAdmins({
                        titleAr: inGrace
                            ? `عاجل: فترة سماح — ${store.name}`
                            : `تحذير مستندات — ${store.name}`,
                        titleEn: inGrace
                            ? `Urgent: Grace period — ${store.name}`
                            : `Document warning — ${store.name}`,
                        messageAr: inGrace
                            ? `المتجر (${store.name}) انتهت مستنداته وهو في فترة السماح (${15 + daysLeft} يوم قبل التجميد).`
                            : `المتجر (${store.name}) تنتهي مستنداته خلال ${daysLeft} يوم.`,
                        messageEn: inGrace
                            ? `Store (${store.name}) documents expired; grace period (${15 + daysLeft}d until freeze).`
                            : `Store (${store.name}) documents expire in ${daysLeft} day(s).`,
                        type: 'DOC_EXPIRY',
                        link: `/admin/stores/${store.id}`,
                        metadata: { storeId: store.id, storeName: store.name, daysLeft },
                    }).catch(() => {});
                }
            }
        }

        return {
            performance: {
                responseSpeed: operationalKpis.responseSpeed,
                prepSpeed: operationalKpis.prepSpeed,
                hasResponseSpeed: operationalKpis.hasResponseSpeed,
                hasPrepSpeed: operationalKpis.hasPrepSpeed,
                responseSpeedSamples: operationalKpis.responseSpeedSamples,
                prepSpeedSamples: operationalKpis.prepSpeedSamples,
                acceptanceRate,
                rating: operationalKpis.rating,
                loyaltyTier: store.loyaltyTier,
                performanceScore: Number(store.performanceScore),
                completedOrdersCount: store.completedOrdersCount,
                lifetimeEarnings: Number(store.lifetimeEarnings),
                // 2026 Governance Metrics
                totalOffersSent: store.totalOffersSent,
                editCount: store.editCount,
                withdrawalCount: store.withdrawalCount,
                monthlyOfferDeletionCount: store.monthlyOfferDeletionCount ?? 0,
                monthlyOfferDeletionMonth: store.monthlyOfferDeletionMonth ?? null,
                offerBiddingRestrictedUntil: store.offerBiddingRestrictedUntil ?? null,
                offerBiddingRestrictionReason: store.offerBiddingRestrictionReason ?? null,
                monthlyDeletionLimit: 50,
                monthlyDeletionWarnAt: 35,
                violationScore: store.owner?.violationScore || 0
            },
            weeklyEarnings,
            activeOrdersCount
        };
    }

    async adminUpdateRestrictions(id: string, adminId: string, data: {
        offerLimit?: number;
        withdrawalsFrozen?: boolean;
        withdrawalFreezeNote?: string;
        adminSignatureImage?: string; // Maps to signature field in DB
        adminSignatureName?: string;
        adminSignatureType?: 'DRAWN' | 'TYPED';
        adminSignatureText?: string;
        visibilityRestricted?: boolean;
        visibilityNote?: string;
        visibilitySignature?: string;
        visibilityRate?: number;
        offerBiddingRestrictionDays?: number | null;
        offerBiddingRestrictionReason?: string | null;
        clearOfferBiddingRestriction?: boolean;
    }) {
        const store = await this.prisma.store.findUnique({ 
            where: { id },
            include: { owner: true }
        });
        if (!store) throw new NotFoundException('Store not found');

        const isBiddingMutation =
            data.clearOfferBiddingRestriction === true ||
            (data.offerBiddingRestrictionDays !== undefined &&
                data.offerBiddingRestrictionDays !== null);

        if (isBiddingMutation && !String(data.adminSignatureName || '').trim()) {
            throw new BadRequestException(
                'Admin signature name is required for offer bidding restriction changes',
            );
        }

        let offerBiddingRestrictedUntil = store.offerBiddingRestrictedUntil;
        let offerBiddingRestrictionReason = store.offerBiddingRestrictionReason;

        if (data.clearOfferBiddingRestriction) {
            offerBiddingRestrictedUntil = null;
            offerBiddingRestrictionReason = null;
        } else if (
            data.offerBiddingRestrictionDays !== undefined &&
            data.offerBiddingRestrictionDays !== null
        ) {
            const days = Math.max(0, Math.floor(Number(data.offerBiddingRestrictionDays)));
            if (days === 0) {
                offerBiddingRestrictedUntil = null;
                offerBiddingRestrictionReason = null;
            } else {
                offerBiddingRestrictedUntil = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
                offerBiddingRestrictionReason =
                    data.offerBiddingRestrictionReason ??
                    store.offerBiddingRestrictionReason ??
                    `Admin restriction (${days} days)`;
            }
        } else if (data.offerBiddingRestrictionReason !== undefined) {
            offerBiddingRestrictionReason = data.offerBiddingRestrictionReason;
        }

        const wasBiddingRestricted =
            !!store.offerBiddingRestrictedUntil &&
            new Date(store.offerBiddingRestrictedUntil) > new Date();
        const willBeBiddingRestricted =
            !!offerBiddingRestrictedUntil &&
            new Date(offerBiddingRestrictedUntil) > new Date();

        const updated = await this.prisma.store.update({
            where: { id },
            data: {
                offerLimit: data.offerLimit ?? store.offerLimit,
                visibilityRestricted: data.visibilityRestricted ?? store.visibilityRestricted,
                visibilityNote: data.visibilityNote ?? store.visibilityNote,
                visibilitySignature: data.visibilitySignature ?? store.visibilitySignature,
                visibilityRate: data.visibilityRate ?? store.visibilityRate,
                offerBiddingRestrictedUntil,
                offerBiddingRestrictionReason,
                owner: {
                    update: {
                        withdrawalsFrozen: data.withdrawalsFrozen ?? undefined,
                        withdrawalFreezeNote: data.withdrawalFreezeNote ?? undefined,
                        withdrawalFreezeSignature: data.adminSignatureImage ?? undefined
                    }
                },
                updatedAt: new Date()
            },
            include: { owner: true }
        });

        const signatureMeta = {
            adminSignatureName: data.adminSignatureName || null,
            adminSignatureType: data.adminSignatureType || null,
            hasSignatureImage: Boolean(data.adminSignatureImage),
        };

        // --- Task 12.1: Log Action ---
        await this.auditLogs.logAction({
            action: 'STORE_RESTRICTIONS_UPDATE',
            entity: 'STORE',
            actorType: 'ADMIN',
            actorId: adminId,
            reason: 'Administrative store restriction update',
            metadata: {
                storeId: id,
                offerLimit: data.offerLimit,
                withdrawalsFrozen: data.withdrawalsFrozen,
                visibilityRestricted: data.visibilityRestricted,
                visibilityRate: data.visibilityRate,
                offerBiddingRestrictionDays: data.offerBiddingRestrictionDays,
                clearOfferBiddingRestriction: data.clearOfferBiddingRestriction,
                ...signatureMeta,
            }
        });

        if (willBeBiddingRestricted && !wasBiddingRestricted) {
            const days =
                data.offerBiddingRestrictionDays != null
                    ? Math.max(1, Math.floor(Number(data.offerBiddingRestrictionDays)))
                    : 5;
            const untilIso = updated.offerBiddingRestrictedUntil?.toISOString();
            const untilLabel = updated.offerBiddingRestrictedUntil
                ? updated.offerBiddingRestrictedUntil.toLocaleString('ar-EG')
                : untilIso;
            const statusDetailAr = `تقييد إداري لتقديم العروض لمدة ${days} أيام حتى ${untilLabel}.`;
            const statusDetailEn = `Admin offer-bidding restriction for ${days} days until ${untilIso}.`;

            await this.auditLogs.logAction({
                action: 'OFFER_BIDDING_RESTRICTED',
                entity: 'STORE',
                actorType: 'ADMIN',
                actorId: adminId,
                reason: offerBiddingRestrictionReason || `Admin restriction (${days} days)`,
                metadata: {
                    storeId: id,
                    store_name: updated.name,
                    days,
                    until: untilIso,
                    source: 'ADMIN',
                    ...signatureMeta,
                },
            });

            if (updated.ownerId) {
                await this.notificationsService
                    .create({
                        recipientId: updated.ownerId,
                        recipientRole: 'VENDOR',
                        titleAr: 'تقييد تقديم العروض (إدارة)',
                        titleEn: 'Offer Bidding Restricted (Admin)',
                        messageAr: `قامت الإدارة بتقييد تقديم العروض على متجرك "${updated.name}" لمدة ${days} أيام (حتى ${untilLabel}).`,
                        messageEn: `Admin restricted offer bidding on "${updated.name}" for ${days} days (until ${untilIso}).`,
                        type: 'GOVERNANCE_ALERT',
                        link: '/dashboard/merchant/home',
                        metadata: {
                            waEvent: 'OFFER_BIDDING_RESTRICTED',
                            storeId: id,
                            store_name: updated.name,
                            days,
                            until: untilIso,
                            status_detail: statusDetailAr,
                            status_detail_en: statusDetailEn,
                            source: 'ADMIN',
                        },
                    })
                    .catch(() => {});
            }
        } else if (wasBiddingRestricted && !willBeBiddingRestricted) {
            await this.auditLogs.logAction({
                action: 'OFFER_BIDDING_RESTRICTION_LIFTED',
                entity: 'STORE',
                actorType: 'ADMIN',
                actorId: adminId,
                reason: 'Admin lifted offer bidding restriction',
                metadata: {
                    storeId: id,
                    store_name: updated.name,
                    source: 'ADMIN',
                    ...signatureMeta,
                },
            });

            if (updated.ownerId) {
                await this.notificationsService
                    .create({
                        recipientId: updated.ownerId,
                        recipientRole: 'VENDOR',
                        titleAr: 'تم رفع تقييد تقديم العروض',
                        titleEn: 'Offer Bidding Restriction Lifted',
                        messageAr: `قامت الإدارة برفع تقييد تقديم العروض عن متجرك "${updated.name}".`,
                        messageEn: `Admin lifted your offer bidding restriction on "${updated.name}".`,
                        type: 'GOVERNANCE_ALERT',
                        link: '/dashboard/merchant/marketplace',
                        metadata: {
                            // No dedicated lift template — in-app only (avoid wrong txn_order_*)
                            storeId: id,
                            store_name: updated.name,
                            status: 'RESTRICTION_LIFTED',
                            source: 'ADMIN',
                        },
                    })
                    .catch(() => {});
            }
        }

        // --- Restriction Notifications ---
        if (data.withdrawalsFrozen) {
            this.notificationsService.create({
                recipientId: store.ownerId,
                recipientRole: 'MERCHANT',
                titleAr: '🔒 تنبيه أمني: تجميد المدفوعات',
                titleEn: '🔒 Security Alert: Payouts Frozen',
                messageAr: `تم تعليق عمليات سحب الأرباح مؤقتاً لضمان سلامة العمليات المالية. السبب: ${data.withdrawalFreezeNote || 'مراجعة أمنية'}. يرجى مراجعة الإدارة.`,
                messageEn: `Payout features have been temporarily suspended to ensure financial security. Reason: ${data.withdrawalFreezeNote || 'Security Review'}. Please contact support.`,
                type: 'SYSTEM',
                link: '/dashboard/merchant/wallet'
            }).catch(() => {});
        } else if (data.visibilityRestricted) {
             this.notificationsService.create({
                recipientId: store.ownerId,
                recipientRole: 'MERCHANT',
                titleAr: '🚫 قيد إداري: تقييد الظهور',
                titleEn: '🚫 Admin Alert: Visibility Restricted',
                messageAr: `تم تقييد ظهور متجرك وعروضك للمشترين مؤقتاً لمراجعة الامتثال والمعايير.`,
                messageEn: `Your store visibility has been restricted to review compliance and standards.`,
                type: 'SYSTEM',
                link: '/dashboard/merchant/home'
            }).catch(() => {});
        }

        // --- Restored Notifications ---
        const s = store as any;
        if (data.withdrawalsFrozen === false && s.owner?.withdrawalsFrozen === true) {
            this.notificationsService.create({
                recipientId: store.ownerId,
                recipientRole: 'MERCHANT',
                titleAr: '✅ تم استعادة صلاحيات السحب',
                titleEn: '✅ Payouts Restored',
                messageAr: 'تم تفعيل عمليات السحب لحسابك مرة أخرى بنجاح. يمكنك الآن تحويل أرباحك إلى حسابك البنكي.',
                messageEn: 'Withdrawal capabilities have been successfully restored. You can now transfer your profits to your bank account.',
                type: 'SYSTEM',
                link: '/dashboard/merchant/wallet'
            }).catch(() => {});
        } else if (data.visibilityRestricted === false && store.visibilityRestricted === true) {
            this.notificationsService.create({
                recipientId: store.ownerId,
                recipientRole: 'MERCHANT',
                titleAr: '✨ تم استعادة ظهور المتجر',
                titleEn: '✨ Store Visibility Restored',
                messageAr: 'تهانينا! تم رفع قيود الظهور عن متجرك. عروضك الآن تظهر للمشترين بكامل طاقتها.',
                messageEn: 'Congratulations! Visibility restrictions have been removed. Your offers are now fully visible to buyers.',
                type: 'SYSTEM',
                link: '/dashboard/merchant/home'
            }).catch(() => {});
        }

        return updated;
    }

    async adminResetOperationalRestrictions(id: string, adminId: string, signatureData?: any) {
        const store = await this.prisma.store.findUnique({ where: { id } });
        if (!store) throw new NotFoundException('Store not found');

        const updated = await this.prisma.store.update({
            where: { id },
            data: {
                offerLimit: -1,
                visibilityRestricted: false,
                visibilityRate: 100,
                visibilityNote: '',
                visibilitySignature: signatureData?.adminSignatureImage || null,
                offerBiddingRestrictedUntil: null,
                offerBiddingRestrictionReason: null,
            },
            include: {
                owner: {
                    select: {
                        id: true,
                        email: true,
                        phone: true,
                        withdrawalsFrozen: true,
                        withdrawalFreezeNote: true
                    }
                }
            }
        });

        // Audit Log for 2026 Compliance
        await this.prisma.auditLog.create({
            data: {
                action: 'CLEAR_OPERATIONAL_RESTRICTIONS',
                entity: 'STORE',
                actorType: 'ADMIN',
                actorId: adminId,
                metadata: {
                    storeId: id,
                    previousOfferLimit: store.offerLimit,
                    previousVisibility: store.visibilityRestricted,
                    signatureImage: signatureData?.adminSignatureImage,
                    signatureType: signatureData?.adminSignatureType
                }
            }
        });

        // Real-time Notification to Merchant
        this.notificationsService.create({
            recipientId: store.ownerId,
            recipientRole: 'MERCHANT',
            titleAr: 'تم فك القيود التشغيلية',
            titleEn: 'Operational Restrictions Cleared',
            messageAr: 'تمت إزالة كافة القيود التشغيلية عن متجرك من قبل الإدارة. يمكنك الآن العمل بكامل الصلاحيات.',
            messageEn: 'All operational restrictions have been cleared by administration. You can now operate with full permissions.',
            type: 'SECURITY',
            link: '/dashboard/merchant/profile'
        }).catch(() => {});

        return updated;
    }

    async adminUpdateSubscription(
        adminId: string,
        storeId: string,
        body: {
            subscriptionTier?: StoreSubscriptionTier;
            subscriptionActive?: boolean;
            subscriptionExpiresAt?: string | Date | null;
        },
    ) {
        const store = await this.prisma.store.findUnique({ where: { id: storeId } });
        if (!store) throw new NotFoundException('Store not found');

        const expires =
            body.subscriptionExpiresAt === undefined
                ? undefined
                : body.subscriptionExpiresAt === null
                  ? null
                  : new Date(body.subscriptionExpiresAt);

        const updated = await this.prisma.store.update({
            where: { id: storeId },
            data: {
                ...(body.subscriptionTier !== undefined && { subscriptionTier: body.subscriptionTier }),
                ...(body.subscriptionActive !== undefined && { subscriptionActive: body.subscriptionActive }),
                ...(expires !== undefined && { subscriptionExpiresAt: expires }),
            },
        });

        await this.auditLogs.logAction({
            action: 'STORE_SUBSCRIPTION_UPDATE',
            entity: 'STORE',
            actorType: 'ADMIN',
            actorId: adminId,
            reason: 'Administrative update of store subscription fields',
            metadata: { storeId, ...body },
        });

        await this.merchantPerformance.recalculateAndPersist(storeId);
        return updated;
    }

    /**
     * Cron / batch: enforce document expiry across all active stores
     * (auto LICENSE_EXPIRED after 15-day grace + weekly warning notifications).
     */
    async scanDocumentExpiries(): Promise<{ scanned: number; suspended: number; warned: number }> {
        const stores = await this.prisma.store.findMany({
            where: {
                status: {
                    in: [StoreStatus.ACTIVE, StoreStatus.PENDING_REVIEW, StoreStatus.LICENSE_EXPIRED],
                },
            },
            select: {
                id: true,
                name: true,
                ownerId: true,
                status: true,
                documents: {
                    select: { expiresAt: true, status: true, docType: true },
                },
            },
        });

        let suspended = 0;
        let warned = 0;
        const currentDate = new Date();

        for (const store of stores) {
            let shouldAutoSuspend = false;
            for (const doc of store.documents) {
                if (!doc.expiresAt || doc.status !== 'approved') continue;
                const diffDays = Math.ceil(
                    (new Date(doc.expiresAt).getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24),
                );
                if (diffDays < -15) shouldAutoSuspend = true;
            }

            if (shouldAutoSuspend && ['ACTIVE', 'PENDING_REVIEW'].includes(store.status)) {
                await this.prisma.store.update({
                    where: { id: store.id },
                    data: { status: StoreStatus.LICENSE_EXPIRED },
                });
                await this.notificationsService.create({
                    recipientId: store.ownerId,
                    recipientRole: 'MERCHANT',
                    titleAr: 'إيقاف الحساب بسبب انتهاء المستندات',
                    titleEn: 'Account Suspended due to Expired Documents',
                    messageAr:
                        'تم إيقاف حسابك لعدم تجديد المستندات الأساسية بعد فترة السماح (15 يوماً). يرجى رفع المستندات المجددة.',
                    messageEn:
                        'Your account has been suspended for not renewing mandatory documents after the 15-day grace period. Please upload renewed documents.',
                    type: 'DOC_EXPIRY',
                    link: '/dashboard/merchant/profile',
                    metadata: { waEvent: 'DOCUMENT', docType: 'license_expiry', storeId: store.id },
                }).catch(() => {});
                this.notificationsService.notifyAdmins({
                    titleAr: `عاجل: إيقاف متجر (${store.name})`,
                    titleEn: `Urgent: Store suspended (${store.name})`,
                    messageAr: `تم إيقاف المتجر (${store.name}) تلقائياً بسبب انتهاء صلاحية المستندات وفترة السماح.`,
                    messageEn: `Store (${store.name}) was automatically suspended due to expired documents and grace period.`,
                    type: 'DOC_EXPIRY',
                    link: `/admin/stores/${store.id}`,
                    metadata: { storeId: store.id, storeName: store.name },
                }).catch(() => {});
                suspended += 1;
                continue;
            }

            const warningDocs = store.documents.filter((doc) => {
                if (!doc.expiresAt || doc.status !== 'approved') return false;
                const diffDays = Math.ceil(
                    (new Date(doc.expiresAt).getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24),
                );
                return diffDays <= 30 && diffDays >= -15;
            });
            if (warningDocs.length === 0) continue;

            const soonestDays = Math.min(
                ...warningDocs.map((d) =>
                    Math.ceil((new Date(d.expiresAt!).getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24)),
                ),
            );
            const inGrace = soonestDays <= 0;

            const recentAlert = await this.prisma.notification.findFirst({
                where: {
                    recipientId: store.ownerId,
                    type: 'DOC_EXPIRY',
                    createdAt: { gte: new Date(currentDate.getTime() - 7 * 24 * 60 * 60 * 1000) },
                },
            });
            if (recentAlert) continue;

            await this.notificationsService.create({
                recipientId: store.ownerId,
                recipientRole: 'MERCHANT',
                titleAr: inGrace ? 'عاجل: مستند منتهٍ — فترة السماح' : 'تنبيه عاجل: مستندات ستنتهي قريباً',
                titleEn: inGrace ? 'Urgent: Document expired — grace period' : 'Urgent: Documents expiring soon',
                messageAr: inGrace
                    ? `انتهت صلاحية مستنداتك. متبقي ${15 + soonestDays} يوم قبل تجميد الحساب تلقائياً.`
                    : `مستنداتك تنتهي خلال ${soonestDays} يوم. حدّثها لتجنب تقييد الحساب.`,
                messageEn: inGrace
                    ? `Documents expired. ${15 + soonestDays} day(s) left before auto-freeze.`
                    : `Documents expire in ${soonestDays} day(s). Update to avoid restriction.`,
                type: 'DOC_EXPIRY',
                link: '/dashboard/merchant/profile',
                metadata: { waEvent: 'DOCUMENT', docType: 'expiry_warning', storeId: store.id },
            }).catch(() => {});

            this.notificationsService.notifyAdmins({
                titleAr: inGrace ? `عاجل: فترة سماح — ${store.name}` : `تحذير مستندات — ${store.name}`,
                titleEn: inGrace ? `Urgent: Grace period — ${store.name}` : `Document warning — ${store.name}`,
                messageAr: inGrace
                    ? `المتجر (${store.name}) في فترة السماح (${15 + soonestDays} يوم قبل التجميد).`
                    : `المتجر (${store.name}) تنتهي مستنداته خلال ${soonestDays} يوم.`,
                messageEn: inGrace
                    ? `Store (${store.name}) in grace (${15 + soonestDays}d until freeze).`
                    : `Store (${store.name}) documents expire in ${soonestDays} day(s).`,
                type: 'DOC_EXPIRY',
                link: `/admin/stores/${store.id}`,
                metadata: { storeId: store.id, storeName: store.name, daysLeft: soonestDays },
            }).catch(() => {});
            warned += 1;
        }

        return { scanned: stores.length, suspended, warned };
    }
}
