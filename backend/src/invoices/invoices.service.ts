import { Injectable, NotFoundException } from '@nestjs/common';
import { ActorType, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import {
  resolveUserIds,
  resolveStoreIds,
  resolveOrderIds,
  normalizeSearchQuery,
  mergeWhereWithSearch,
} from '../common/search/admin-entity-search.util';
import { filterOrderInvoicesForViewer } from './invoice-visibility.util';

const invoiceInclude = {
  payment: {
    select: {
      id: true,
      offerId: true,
      status: true,
      gatewayFee: true,
      offer: { select: { storeId: true, store: { select: { id: true, name: true, storeCode: true, owner: { select: { email: true, phone: true } } } } } },
    },
  },
  order: {
    select: {
      id: true,
      orderNumber: true,
      store: { select: { id: true, name: true, storeCode: true, owner: { select: { email: true, phone: true } } } },
    },
  },
  customer: {
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
    },
  },
} satisfies Prisma.InvoiceInclude;

@Injectable()
export class InvoicesService {
    constructor(
        private prisma: PrismaService,
        private readonly auditLogs: AuditLogsService,
    ) { }

    private mapAdminInvoiceRow(invoice: Prisma.InvoiceGetPayload<{ include: typeof invoiceInclude }>) {
        const store =
            invoice.payment?.offer?.store ||
            invoice.order?.store ||
            null;
        const customerName =
            invoice.customer?.name || invoice.customer?.email || 'Unknown';
        const storeName = store?.name || 'Unknown';
        const storeOwner = (store as { owner?: { email?: string; phone?: string } })?.owner;
        return {
            id: invoice.id,
            invoiceNumber: invoice.invoiceNumber,
            orderId: invoice.orderId,
            orderNumber: invoice.order?.orderNumber || null,
            customerId: invoice.customerId,
            customerName,
            customerEmail: invoice.customer?.email || null,
            customerPhone: invoice.customer?.phone || null,
            /** @deprecated use customerName */
            customer: customerName,
            storeId: store?.id || invoice.payment?.offer?.storeId || null,
            storeName,
            storeCode: store?.storeCode || null,
            storeEmail: storeOwner?.email || null,
            storePhone: storeOwner?.phone || null,
            /** @deprecated use storeName */
            store: storeName,
            subtotal: Number(invoice.subtotal),
            shipping: Number(invoice.shipping),
            commission: Number(invoice.commission),
            gatewayFee: Number(invoice.payment?.gatewayFee || 0),
            total: Number(invoice.total),
            paymentStatus: invoice.payment?.status || null,
            invoiceStatus: invoice.status,
            status: invoice.status,
            currency: invoice.currency,
            issuedAt: invoice.issuedAt,
            invoiceType: (invoice as any).invoiceType || 'MASTER',
            invoiceGroupId: (invoice as any).invoiceGroupId || null,
            isDerived: false,
        };
    }

    async getUserInvoices(userId: string) {
        return this.prisma.invoice.findMany({
            where: {
                customerId: userId,
                OR: [
                    { invoiceType: 'MASTER' },
                    { shippingBatchKey: { startsWith: 'RETURNS_FEE:' } },
                ],
            },
            include: {
                payment: {
                    select: { offerId: true },
                },
                order: {
                    include: {
                        customer: {
                            select: {
                                id: true,
                                name: true,
                                email: true,
                                phone: true,
                                countryCode: true,
                                country: true,
                            }
                        },
                        store: true,
                        parts: true,
                        shippingAddresses: true,
                        offers: {
                            where: { status: 'accepted' },
                            include: {
                                store: true,
                                orderPart: true
                            }
                        }
                    }
                }
            },
            orderBy: { issuedAt: 'desc' }
        });
    }

    async getInvoiceById(userId: string, id: string) {
        const invoice = await this.prisma.invoice.findFirst({
            where: {
                id,
                customerId: userId,
                OR: [
                    { invoiceType: 'MASTER' },
                    { shippingBatchKey: { startsWith: 'RETURNS_FEE:' } },
                ],
            },
            include: {
                payment: {
                    select: { offerId: true },
                },
                order: {
                    include: {
                        customer: {
                            select: {
                                id: true,
                                name: true,
                                email: true,
                                phone: true,
                                countryCode: true,
                                country: true,
                            }
                        },
                        store: true,
                        parts: true,
                        shippingAddresses: true,
                        offers: {
                            where: { status: 'accepted' },
                            include: {
                                store: true,
                                orderPart: true
                            }
                        }
                    }
                }
            }
        });

        if (!invoice) {
            throw new NotFoundException('Invoice not found');
        }

        return invoice;
    }

    async getAdminInvoiceById(id: string) {
        const invoice = await this.prisma.invoice.findUnique({
            where: { id },
            include: {
                payment: {
                    select: { offerId: true, status: true, gatewayFee: true },
                },
                order: {
                    include: {
                        customer: {
                            select: {
                                id: true,
                                name: true,
                                email: true,
                                phone: true,
                                countryCode: true,
                                country: true,
                            }
                        },
                        store: true,
                        parts: true,
                        shippingAddresses: true,
                        offers: {
                            where: { status: 'accepted' },
                            include: {
                                store: true,
                                orderPart: true
                            }
                        }
                    }
                }
            }
        });

        if (!invoice) {
            throw new NotFoundException('Invoice not found');
        }

        return invoice;
    }

    async getAdminCustomerInvoices(filters?: {
        search?: string;
        status?: string;
        entityType?: 'customer' | 'store';
        invoiceType?: string;
        page?: number;
        limit?: number;
    }) {
        const page = Math.max(1, Number(filters?.page) || 1);
        const limit = Math.min(100, Math.max(1, Number(filters?.limit) || 25));
        const skip = (page - 1) * limit;

        let baseWhere: Prisma.InvoiceWhereInput = {};
        if (filters?.status && filters.status !== 'ALL') {
            baseWhere.status = filters.status;
        }
        if (filters?.invoiceType && filters.invoiceType !== 'ALL') {
            baseWhere.invoiceType = filters.invoiceType;
        }

        const search = normalizeSearchQuery(filters?.search);
        if (search) {
            const entityType = filters?.entityType || 'customer';
            const or: Prisma.InvoiceWhereInput[] = [
                { invoiceNumber: { contains: search, mode: 'insensitive' } },
            ];
            if (entityType === 'customer') {
                const [userIds, orderIds] = await Promise.all([
                    resolveUserIds(this.prisma, search),
                    resolveOrderIds(this.prisma, search),
                ]);
                if (userIds.length) or.push({ customerId: { in: userIds } });
                if (orderIds.length) or.push({ orderId: { in: orderIds } });
            } else {
                const storeIds = await resolveStoreIds(this.prisma, search);
                if (storeIds.length) {
                    or.push({
                        OR: [
                            { payment: { offer: { storeId: { in: storeIds } } } },
                            {
                                order: {
                                    offers: { some: { storeId: { in: storeIds }, status: 'accepted' } },
                                },
                            },
                        ],
                    });
                }
            }
            baseWhere = mergeWhereWithSearch(baseWhere, or.length > 1 ? { OR: or } : or.length === 1 ? or[0] : { id: 'none' });
        }

        const [rows, total] = await Promise.all([
            this.prisma.invoice.findMany({
                where: baseWhere,
                include: invoiceInclude,
                orderBy: { issuedAt: 'desc' },
                skip,
                take: limit,
            }),
            this.prisma.invoice.count({ where: baseWhere }),
        ]);

        return {
            data: rows.map((row) => this.mapAdminInvoiceRow(row)),
            meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
        };
    }

    async getAdminStoreInvoices(filters?: {
        search?: string;
        entityType?: 'customer' | 'store';
        status?: string;
        invoiceType?: string;
        page?: number;
        limit?: number;
    }) {
        const page = Math.max(1, Number(filters?.page) || 1);
        const limit = Math.min(100, Math.max(1, Number(filters?.limit) || 25));
        const skip = (page - 1) * limit;

        let baseWhere: Prisma.InvoiceWhereInput = {};

        if (filters?.status && filters.status !== 'ALL') {
            baseWhere.status = filters.status;
        }
        if (filters?.invoiceType && filters.invoiceType !== 'ALL') {
            baseWhere.invoiceType = filters.invoiceType;
        }

        const search = normalizeSearchQuery(filters?.search);
        if (search) {
            const or: Prisma.InvoiceWhereInput[] = [
                { invoiceNumber: { contains: search, mode: 'insensitive' } },
            ];
            const [storeIds, userIds, orderIds] = await Promise.all([
                resolveStoreIds(this.prisma, search),
                resolveUserIds(this.prisma, search),
                resolveOrderIds(this.prisma, search),
            ]);
            if (storeIds.length) {
                or.push({
                    OR: [
                        { payment: { offer: { storeId: { in: storeIds } } } },
                        {
                            order: {
                                offers: { some: { storeId: { in: storeIds }, status: 'accepted' } },
                            },
                        },
                        { order: { storeId: { in: storeIds } } },
                    ],
                });
            }
            if (userIds.length) or.push({ customerId: { in: userIds } });
            if (orderIds.length) or.push({ orderId: { in: orderIds } });
            baseWhere = mergeWhereWithSearch(
                baseWhere,
                or.length > 1 ? { OR: or } : or.length === 1 ? or[0] : { id: 'none' },
            );
        }

        const [rows, total] = await Promise.all([
            this.prisma.invoice.findMany({
                where: baseWhere,
                include: {
                    ...invoiceInclude,
                    payment: {
                        select: {
                            id: true,
                            offerId: true,
                            status: true,
                            gatewayFee: true,
                            offer: { select: { storeId: true, store: { select: { id: true, name: true, storeCode: true, owner: { select: { email: true, phone: true } } } } } },
                            escrow: { select: { status: true, releasedAt: true } },
                        },
                    },
                },
                orderBy: { issuedAt: 'desc' },
                skip,
                take: limit,
            }),
            this.prisma.invoice.count({ where: baseWhere }),
        ]);

        return {
            data: rows.map((invoice) => {
                const base = this.mapAdminInvoiceRow(invoice);
                const paymentFees = base.gatewayFee;
                const netToStore = Number((base.subtotal - base.commission - paymentFees).toFixed(2));
                return {
                    ...base,
                    salesValue: base.subtotal,
                    paymentFees,
                    netToStore,
                    transferStatus: invoice.payment?.escrow?.status || null,
                    transferDate: invoice.payment?.escrow?.releasedAt || null,
                };
            }),
            meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
        };
    }

    async resendAdminInvoice(adminId: string, id: string) {
        const invoice = await this.getAdminInvoiceById(id);

        await this.auditLogs.logAction({
            entity: 'FINANCIAL',
            action: 'INVOICE_RESEND',
            actorType: ActorType.ADMIN,
            actorId: adminId,
            orderId: invoice.orderId,
            metadata: {
                invoiceId: invoice.id,
                invoiceNumber: invoice.invoiceNumber,
                customerId: invoice.customerId,
                stubEmail: true,
            },
        });

        return {
            success: true,
            message: 'Invoice resend queued (email stub)',
            invoiceId: invoice.id,
            invoiceNumber: invoice.invoiceNumber,
        };
    }

    async getMerchantInvoices(userId: string) {
        const store = await this.prisma.store.findUnique({
            where: { ownerId: userId }
        });

        if (!store) return [];

        const payments = await this.prisma.paymentTransaction.findMany({
            where: { 
                offer: { storeId: store.id },
                status: 'SUCCESS'
            },
            select: { id: true }
        });

        const paymentIds = payments.map(p => p.id);

        if (paymentIds.length === 0) return [];

        return this.prisma.invoice.findMany({
            where: {
                OR: [
                    {
                        paymentId: { in: paymentIds },
                        invoiceType: 'MASTER',
                    },
                    {
                        customerId: userId,
                        shippingBatchKey: { startsWith: 'RETURNS_FEE:' },
                    },
                ],
            },
            include: {
                payment: {
                    select: { offerId: true },
                },
                order: {
                    include: {
                        customer: {
                            select: {
                                id: true,
                                name: true,
                                email: true,
                                phone: true,
                                countryCode: true,
                                country: true,
                            }
                        },
                        store: true,
                        shippingAddresses: true,
                        parts: true,
                        offers: {
                            where: { storeId: store.id, status: 'accepted' },
                            include: {
                                store: true,
                                orderPart: true
                            }
                        }
                    }
                }
            },
            orderBy: { issuedAt: 'desc' }
        });
    }

    async getInvoicesByOrder(orderId: string, role?: string, viewerUserId?: string) {
        const r = String(role || '').toUpperCase();
        const isAdmin =
            r === 'ADMIN' ||
            r === 'SUPER_ADMIN' ||
            r === 'SUPPORT' ||
            r === 'ACCOUNTANT' ||
            r === 'VERIFICATION_OFFICER';

        const invoices = await this.prisma.invoice.findMany({
            where: { orderId },
            include: {
                payment: {
                    select: { offerId: true, status: true },
                },
                order: {
                    include: {
                        customer: {
                            select: {
                                id: true,
                                name: true,
                                email: true,
                                phone: true,
                                countryCode: true,
                                country: true,
                            }
                        },
                        store: true,
                        parts: true,
                        shippingAddresses: true,
                        shipments: {
                            select: {
                                id: true,
                                carrierName: true,
                                carrierType: true,
                                trackingNumber: true,
                                createdAt: true,
                            },
                            orderBy: { createdAt: 'desc' },
                            take: 5,
                        },
                        offers: {
                            where: { status: 'accepted' },
                            include: {
                                store: true,
                                orderPart: true
                            }
                        }
                    }
                }
            },
            orderBy: { issuedAt: 'asc' }
        });

        // Enrich with live company branding (read once)
        let companyLive: { legalNameEn: string; legalNameAr: string } | null = null;
        try {
            const row = await this.prisma.platformSettings.findUnique({
                where: { settingKey: 'system_config' },
            });
            const company = ((row?.settingValue as Record<string, unknown>)?.company ||
                {}) as Record<string, unknown>;
            companyLive = {
                legalNameEn: String(company.legalNameEn || 'ELLIPP FZ LLC'),
                legalNameAr: String(company.legalNameAr || 'إليب ش.م.ح. - ذ.م.م'),
            };
        } catch {
            companyLive = {
                legalNameEn: 'ELLIPP FZ LLC',
                legalNameAr: 'إليب ش.م.ح. - ذ.م.م',
            };
        }

        const enrich = (inv: (typeof invoices)[number]) => {
            const carrierLive =
                inv.carrierNameSnapshot ||
                (inv.order as any)?.shipments?.[0]?.carrierName ||
                null;
            const offerForPayment = (inv.order as any)?.offers?.find(
                (o: any) => o.id === inv.payment?.offerId,
            );
            const partLive =
                inv.partNameSnapshot ||
                offerForPayment?.orderPart?.name ||
                (inv.order as any)?.partName ||
                null;
            return {
                ...inv,
                invoiceType: inv.invoiceType || 'MASTER',
                invoiceGroupId: inv.invoiceGroupId || inv.id,
                isDerived: false,
                livePartName: partLive,
                liveCarrierName: carrierLive,
                livePlatformLegalNameEn:
                    inv.platformLegalNameEn || companyLive?.legalNameEn,
                livePlatformLegalNameAr:
                    inv.platformLegalNameAr || companyLive?.legalNameAr,
            };
        };

        if (!isAdmin) {
            return filterOrderInvoicesForViewer(invoices, {
                isAdmin: false,
                viewerUserId,
            }).map(enrich);
        }

        const enriched = invoices.map(enrich);

        // Derived docs for legacy MASTER rows missing typed siblings
        const byPayment = new Map<string, typeof enriched>();
        for (const inv of enriched) {
            const list = byPayment.get(inv.paymentId) || [];
            list.push(inv);
            byPayment.set(inv.paymentId, list);
        }

        const derived: any[] = [];
        for (const [, group] of byPayment) {
            const master = group.find((i) => i.invoiceType === 'MASTER');
            if (!master) continue;
            const types = new Set(group.map((i) => i.invoiceType));
            const baseMeta = {
                order: master.order,
                payment: master.payment,
                customerId: master.customerId,
                orderId: master.orderId,
                paymentId: master.paymentId,
                currency: master.currency,
                status: master.status,
                issuedAt: master.issuedAt,
                invoiceGroupId: master.invoiceGroupId,
                parentInvoiceId: master.id,
                isDerived: true,
                livePartName: master.livePartName,
                liveCarrierName: master.liveCarrierName,
                livePlatformLegalNameEn: master.livePlatformLegalNameEn,
                livePlatformLegalNameAr: master.livePlatformLegalNameAr,
                partNameSnapshot: master.partNameSnapshot || master.livePartName,
                carrierNameSnapshot: master.carrierNameSnapshot || master.liveCarrierName,
                platformLegalNameEn: master.livePlatformLegalNameEn,
                platformLegalNameAr: master.livePlatformLegalNameAr,
            };

            if (!types.has('PART')) {
                derived.push({
                    ...baseMeta,
                    id: `derived-part-${master.id}`,
                    invoiceNumber: `${master.invoiceNumber}-P`,
                    invoiceType: 'PART',
                    subtotal: master.subtotal,
                    shipping: 0,
                    commission: 0,
                    total: master.subtotal,
                });
            }
            if (!types.has('COMMISSION')) {
                derived.push({
                    ...baseMeta,
                    id: `derived-commission-${master.id}`,
                    invoiceNumber: `${master.invoiceNumber}-C`,
                    invoiceType: 'COMMISSION',
                    subtotal: 0,
                    shipping: 0,
                    commission: master.commission,
                    total: master.commission,
                });
            }
            if (!types.has('SHIPPING') && Number(master.shipping) > 0) {
                derived.push({
                    ...baseMeta,
                    id: `derived-shipping-${master.id}`,
                    invoiceNumber: `${master.invoiceNumber}-S`,
                    invoiceType: 'SHIPPING',
                    subtotal: 0,
                    shipping: master.shipping,
                    commission: 0,
                    total: master.shipping,
                    shippingBatchKey: master.paymentId,
                    lineItems: [
                        {
                            paymentId: master.paymentId,
                            partName: master.livePartName || 'Part',
                            amount: Number(master.shipping),
                        },
                    ],
                });
            }
        }

        return [...enriched, ...derived].sort(
            (a, b) =>
                new Date(a.issuedAt).getTime() - new Date(b.issuedAt).getTime(),
        );
    }
}
