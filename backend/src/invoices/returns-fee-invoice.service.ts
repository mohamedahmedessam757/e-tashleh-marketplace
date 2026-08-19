import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
    FeeSettlementPlan,
    FeeSettlementPayer,
    buildFeeSettlementPlan,
    makeReturnsFeeBatchKey,
} from '../returns/fee-settlement-plan.util';
import { computeAdjudicationFinancials } from '../returns/adjudication-financial.util';
import { FEE_INVOICE_ATTACHABLE_PAYMENT_STATUSES } from './invoice-visibility.util';

type Tx = Prisma.TransactionClient;

export interface ReturnsFeeInvoiceContext {
    orderId: string;
    paymentId: string;
    customerId: string;
    merchantOwnerId?: string | null;
    adminId?: string | null;
    currency?: string;
    partName?: string | null;
    parentInvoiceId?: string | null;
    invoiceGroupId?: string | null;
    adjudicationFeePaid: boolean;
    shippingPaid: boolean;
}

@Injectable()
export class ReturnsFeeInvoiceService {
    private readonly logger = new Logger(ReturnsFeeInvoiceService.name);

    constructor(private readonly prisma: PrismaService) {}

    async ensureFromPlan(
        plan: FeeSettlementPlan,
        ctx: ReturnsFeeInvoiceContext,
        tx?: Tx,
    ): Promise<void> {
        if (!ctx.paymentId || !ctx.orderId) return;
        const db = tx || this.prisma;
        await this.ensureCommissionDoc(db, plan, ctx);
        await this.ensureShippingDoc(db, plan, ctx);
    }

    private commissionIssuable(plan: FeeSettlementPlan, ctx: ReturnsFeeInvoiceContext): boolean {
        const commissionLines = plan.lineItems.filter((l) => l.invoiceDocType === 'COMMISSION');
        if (commissionLines.length === 0) return false;
        const wallet = commissionLines.some((l) => l.fundingPath === 'WALLET_DEBIT');
        return !wallet || ctx.adjudicationFeePaid;
    }

    private shippingIssuable(plan: FeeSettlementPlan, ctx: ReturnsFeeInvoiceContext): boolean {
        const shippingLines = plan.lineItems.filter((l) => l.invoiceDocType === 'SHIPPING');
        if (shippingLines.length === 0) return false;
        const wallet = shippingLines.some((l) => l.fundingPath === 'WALLET_DEBIT');
        return !wallet || ctx.shippingPaid;
    }

    private resolveViewerUserId(
        payer: FeeSettlementPayer,
        ctx: ReturnsFeeInvoiceContext,
    ): string | null {
        if (payer === 'CUSTOMER') return ctx.customerId || null;
        if (payer === 'MERCHANT') return ctx.merchantOwnerId || null;
        // Platform absorption / shipping-company liability: admin hub only.
        // Never fall back to merchant or customer (would leak a tax doc).
        if (payer === 'PLATFORM' || payer === 'SHIPPING_COMPANY') {
            return ctx.adminId || null;
        }
        return null;
    }

    private async resolvePlatformActorId(db: Tx | PrismaService): Promise<string | null> {
        const admin = await db.user.findFirst({
            where: {
                role: { in: ['SUPER_ADMIN', 'ADMIN'] },
                status: 'ACTIVE',
            },
            orderBy: { createdAt: 'asc' },
            select: { id: true },
        });
        return admin?.id || null;
    }

    private isUniqueViolation(err: unknown): boolean {
        return (err as { code?: string })?.code === 'P2002';
    }

    private async nextInvoiceNumber(tx: Tx, type: 'COMMISSION' | 'SHIPPING'): Promise<string> {
        try {
            const rows = await tx.$queryRaw<{ generate_typed_invoice_number: string }[]>`
                SELECT generate_typed_invoice_number(${type})
            `;
            const n = rows?.[0]?.generate_typed_invoice_number;
            if (n) return n;
        } catch (err) {
            this.logger.warn(
                `generate_typed_invoice_number unavailable (${(err as Error)?.message}); falling back`,
            );
        }
        const fallback = await tx.$queryRaw<{ generate_invoice_number: string }[]>`
            SELECT generate_invoice_number()
        `;
        const base = fallback[0].generate_invoice_number;
        const prefix = type === 'SHIPPING' ? 'INV-S-' : 'INV-C-';
        return base.replace(/^INV-/, prefix);
    }

    private async ensureCommissionDoc(tx: Tx, plan: FeeSettlementPlan, ctx: ReturnsFeeInvoiceContext) {
        if (!this.commissionIssuable(plan, ctx)) return;
        const lines = plan.lineItems.filter((l) => l.invoiceDocType === 'COMMISSION' && l.amount > 0);
        if (lines.length === 0) return;

        const batchKey = makeReturnsFeeBatchKey(plan.caseId, 'COMMISSION');
        const existing = await tx.invoice.findFirst({
            where: { shippingBatchKey: batchKey },
            select: { id: true },
        });
        if (existing) return;

        const viewerId = this.resolveViewerUserId(lines[0].payer, ctx);
        if (!viewerId) return;

        const total = Number(lines.reduce((s, l) => s + l.amount, 0).toFixed(2));
        const invoiceNumber = await this.nextInvoiceNumber(tx, 'COMMISSION');
        try {
            await tx.invoice.create({
                data: {
                    invoiceNumber,
                    orderId: ctx.orderId,
                    paymentId: ctx.paymentId,
                    customerId: viewerId,
                    subtotal: 0,
                    shipping: 0,
                    commission: total,
                    total,
                    currency: ctx.currency || 'AED',
                    status: 'PAID',
                    invoiceType: 'COMMISSION',
                    invoiceGroupId: ctx.invoiceGroupId || undefined,
                    parentInvoiceId: ctx.parentInvoiceId || undefined,
                    shippingBatchKey: batchKey,
                    partNameSnapshot: ctx.partName || 'Adjudication fees',
                    lineItems: lines.map((l) => ({
                        kind: l.kind,
                        amount: l.amount,
                        payer: l.payer,
                        fundingPath: l.fundingPath,
                        caseId: plan.caseId,
                    })) as unknown as Prisma.InputJsonValue,
                },
            });
        } catch (err) {
            if (this.isUniqueViolation(err)) return;
            throw err;
        }
    }

    private async ensureShippingDoc(tx: Tx, plan: FeeSettlementPlan, ctx: ReturnsFeeInvoiceContext) {
        if (!this.shippingIssuable(plan, ctx)) return;
        const lines = plan.lineItems.filter((l) => l.invoiceDocType === 'SHIPPING' && l.amount > 0);
        if (lines.length === 0) return;

        const batchKey = makeReturnsFeeBatchKey(plan.caseId, 'SHIPPING');
        const existing = await tx.invoice.findFirst({
            where: { shippingBatchKey: batchKey },
            select: { id: true },
        });
        if (existing) return;

        const viewerId = this.resolveViewerUserId(lines[0].payer, ctx);
        if (!viewerId) return;

        const total = Number(lines.reduce((s, l) => s + l.amount, 0).toFixed(2));
        const invoiceNumber = await this.nextInvoiceNumber(tx, 'SHIPPING');
        try {
            await tx.invoice.create({
                data: {
                    invoiceNumber,
                    orderId: ctx.orderId,
                    paymentId: ctx.paymentId,
                    customerId: viewerId,
                    subtotal: 0,
                    shipping: total,
                    commission: 0,
                    total,
                    currency: ctx.currency || 'AED',
                    status: 'PAID',
                    invoiceType: 'SHIPPING',
                    invoiceGroupId: ctx.invoiceGroupId || undefined,
                    parentInvoiceId: ctx.parentInvoiceId || undefined,
                    shippingBatchKey: batchKey,
                    partNameSnapshot: ctx.partName || 'Round-trip shipping',
                    lineItems: lines.map((l) => ({
                        kind: l.kind,
                        amount: l.amount,
                        payer: l.payer,
                        fundingPath: l.fundingPath,
                        partName: 'Round-trip shipping',
                        caseId: plan.caseId,
                    })) as unknown as Prisma.InputJsonValue,
                },
            });
        } catch (err) {
            if (this.isUniqueViolation(err)) return;
            throw err;
        }
    }

    /**
     * Public issuer for wallet + Stripe fee settlement (idempotent via batch keys).
     * Resolves SUCCESS or REFUNDED payments so invoices still attach after a full refund.
     */
    async issueFromCaseRow(
        caseRow: {
            id: string;
            orderId: string;
            customerId?: string | null;
            storeId?: string | null;
            offerId?: string | null;
            faultParty?: string | null;
            finalRefundDecision?: string | null;
            refundExecutionStatus?: string | null;
            gatewayFeePct?: unknown;
            refundFeePct?: unknown;
            shippingRoundtrip?: unknown;
            shippingRefund?: unknown;
            adjudicationFeePaymentStatus?: string | null;
            shippingPaymentStatus?: string | null;
            order?: { customerId?: string | null };
        },
        opts?: {
            adminId?: string | null;
            extra?: { shippingRoundtrip?: number; faultParty?: string };
            tx?: Tx;
            adjudicationFeePaid?: boolean;
            shippingPaid?: boolean;
        },
    ): Promise<void> {
        if (!caseRow?.id || !caseRow.orderId) return;
        if (!caseRow.faultParty && !opts?.extra?.faultParty) return;

        const db = opts?.tx || this.prisma;
        const payment = caseRow.offerId
            ? await db.paymentTransaction.findFirst({
                  where: {
                      offerId: caseRow.offerId,
                      status: { in: [...FEE_INVOICE_ATTACHABLE_PAYMENT_STATUSES] },
                  },
                  orderBy: { paidAt: 'desc' },
                  select: { id: true, totalAmount: true },
              })
            : await db.paymentTransaction.findFirst({
                  where: {
                      orderId: caseRow.orderId,
                      status: { in: [...FEE_INVOICE_ATTACHABLE_PAYMENT_STATUSES] },
                  },
                  orderBy: { paidAt: 'desc' },
                  select: { id: true, totalAmount: true },
              });
        if (!payment?.id) return;

        const master = await db.invoice.findFirst({
            where: { paymentId: payment.id, invoiceType: 'MASTER' },
            select: { id: true, invoiceGroupId: true, currency: true, partNameSnapshot: true },
        });

        let merchantOwnerId: string | null = null;
        if (caseRow.storeId) {
            const store = await db.store.findUnique({
                where: { id: caseRow.storeId },
                select: { ownerId: true },
            });
            merchantOwnerId = store?.ownerId || null;
        }

        const shippingRoundtrip = Number(
            opts?.extra?.shippingRoundtrip ??
                caseRow.shippingRoundtrip ??
                caseRow.shippingRefund ??
                0,
        );
        const fin = computeAdjudicationFinancials({
            orderPaidTotal: Number(payment.totalAmount || 0),
            gatewayFeePct: Number(caseRow.gatewayFeePct ?? 3),
            refundFeePct: Number(caseRow.refundFeePct ?? 1.5),
            shippingRoundtrip,
            faultParty: String(opts?.extra?.faultParty || caseRow.faultParty || 'MERCHANT'),
            finalRefundDecision: (caseRow.finalRefundDecision as any) || undefined,
        });

        const adjPaid =
            opts?.adjudicationFeePaid ??
            String(caseRow.adjudicationFeePaymentStatus || '') === 'PAID';
        const shipPaid =
            opts?.shippingPaid ??
            ['PAID', 'WITHHELD_PENDING', 'STRIPE_WITHHOLD'].includes(
                String(caseRow.shippingPaymentStatus || ''),
            );

        const plan = buildFeeSettlementPlan({
            caseId: caseRow.id,
            shippingRoundtrip,
            refundExecutionStatus: (caseRow.refundExecutionStatus as any) || fin.refundExecutionStatusSeed,
            fin,
            faultPartyHint: opts?.extra?.faultParty || caseRow.faultParty,
        });

        const needsAdminOwner = plan.lineItems.some(
            (l) =>
                (l.payer === 'PLATFORM' || l.payer === 'SHIPPING_COMPANY') &&
                (l.invoiceDocType === 'COMMISSION' || l.invoiceDocType === 'SHIPPING'),
        );
        const adminId =
            opts?.adminId ||
            (needsAdminOwner ? await this.resolvePlatformActorId(db) : null);

        await this.ensureFromPlan(
            plan,
            {
                orderId: caseRow.orderId,
                paymentId: payment.id,
                customerId: caseRow.customerId || caseRow.order?.customerId || '',
                merchantOwnerId,
                adminId,
                currency: master?.currency || 'AED',
                partName: master?.partNameSnapshot || null,
                parentInvoiceId: master?.id || null,
                invoiceGroupId: master?.invoiceGroupId || master?.id || null,
                adjudicationFeePaid: adjPaid,
                shippingPaid: shipPaid,
            },
            opts?.tx,
        );
    }

    async backfillForOrder(orderId: string, adminId?: string | null): Promise<void> {
        if (!orderId) return;
        const [returns, disputes] = await Promise.all([
            this.prisma.returnRequest.findMany({ where: { orderId } }),
            this.prisma.dispute.findMany({ where: { orderId } }),
        ]);
        for (const row of [...returns, ...disputes]) {
            await this.issueFromCaseRow(row, { adminId: adminId || null }).catch((err) =>
                this.logger.warn(
                    `Fee invoice backfill skipped for case ${row.id}: ${(err as Error)?.message}`,
                ),
            );
        }
    }
}
