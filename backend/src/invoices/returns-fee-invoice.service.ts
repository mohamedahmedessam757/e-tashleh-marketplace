import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
    FeeSettlementPlan,
    FeeSettlementPayer,
    makeReturnsFeeBatchKey,
} from '../returns/fee-settlement-plan.util';

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
        if (payer === 'CUSTOMER') return ctx.customerId;
        if (payer === 'MERCHANT') return ctx.merchantOwnerId || null;
        return ctx.adminId || ctx.merchantOwnerId || ctx.customerId;
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
    }
}
