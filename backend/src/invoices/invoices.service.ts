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
        };
    }

    async getUserInvoices(userId: string) {
        return this.prisma.invoice.findMany({
            where: { customerId: userId },
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
            where: { id, customerId: userId },
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
        page?: number;
        limit?: number;
    }) {
        const page = Math.max(1, Number(filters?.page) || 1);
        const limit = Math.min(100, Math.max(1, Number(filters?.limit) || 25));
        const skip = (page - 1) * limit;

        let baseWhere: Prisma.InvoiceWhereInput = {
            payment: { status: 'SUCCESS' },
        };

        if (filters?.status && filters.status !== 'ALL') {
            baseWhere.status = filters.status;
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
                paymentId: { in: paymentIds }
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

    async getInvoicesByOrder(orderId: string) {
        const invoices = await this.prisma.invoice.findMany({
            where: { orderId },
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
            orderBy: { issuedAt: 'asc' }
        });

        const byPayment = new Map<string, (typeof invoices)[number]>();
        for (const inv of invoices) {
            const key = inv.paymentId;
            const existing = byPayment.get(key);
            if (!existing || inv.issuedAt > existing.issuedAt) {
                byPayment.set(key, inv);
            }
        }
        return Array.from(byPayment.values()).sort(
            (a, b) => a.issuedAt.getTime() - b.issuedAt.getTime(),
        );
    }
}
