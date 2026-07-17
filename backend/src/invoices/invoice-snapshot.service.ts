import { Injectable, Logger } from '@nestjs/common';
import { ActorType, Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import {
  InvoiceDocType,
  ShippingLineItem,
  mergeShippingLineItems,
  resolveShippingBatch,
  sumShippingLineItems,
} from './invoice-snapshot.util';

export interface InvoiceBundleContext {
  orderId: string;
  paymentId: string;
  customerId: string;
  unitPrice: number;
  shippingCost: number;
  commission: number;
  totalAmount: number;
  currency?: string;
  partName?: string | null;
  carrierName?: string | null;
  shippingType?: string | null;
  cartShipmentId?: string | null;
  offerId?: string | null;
  platformLegalNameEn?: string | null;
  platformLegalNameAr?: string | null;
  actorId?: string | null;
}

export interface InvoiceBundleResult {
  masterInvoiceNumber: string;
  invoiceGroupId: string;
  createdTypes: InvoiceDocType[];
  alreadyExisted: boolean;
}

type Tx = Prisma.TransactionClient;

@Injectable()
export class InvoiceSnapshotService {
  private readonly logger = new Logger(InvoiceSnapshotService.name);

  constructor(private readonly auditLogs: AuditLogsService) {}

  private async nextInvoiceNumber(
    tx: Tx,
    type: InvoiceDocType,
  ): Promise<string> {
    try {
      const rows = await tx.$queryRaw<{ generate_typed_invoice_number: string }[]>`
        SELECT generate_typed_invoice_number(${type})
      `;
      const n = rows?.[0]?.generate_typed_invoice_number;
      if (n) return n;
    } catch (err) {
      this.logger.warn(
        `generate_typed_invoice_number unavailable (${(err as Error)?.message}); falling back to generate_invoice_number`,
      );
    }
    const fallback = await tx.$queryRaw<{ generate_invoice_number: string }[]>`
      SELECT generate_invoice_number()
    `;
    const base = fallback[0].generate_invoice_number;
    if (type === 'MASTER') return base;
    const prefix =
      type === 'PART' ? 'INV-P-' : type === 'SHIPPING' ? 'INV-S-' : 'INV-C-';
    return base.replace(/^INV-/, prefix);
  }

  /**
   * Idempotent: creates MASTER + PART + COMMISSION (+ SHIPPING when shipping > 0).
   * Combined cart shipments upsert one SHIPPING row keyed by cartShipmentId.
   */
  async ensurePaymentInvoiceBundle(
    tx: Tx,
    ctx: InvoiceBundleContext,
  ): Promise<InvoiceBundleResult> {
    const currency = ctx.currency || 'AED';
    const partName = (ctx.partName || '').trim() || 'Spare Part';
    const createdTypes: InvoiceDocType[] = [];

    const existingMaster = await tx.invoice.findFirst({
      where: { paymentId: ctx.paymentId, invoiceType: 'MASTER' },
    });

    let master = existingMaster;
    let invoiceGroupId = existingMaster?.invoiceGroupId || randomUUID();
    let alreadyExisted = !!existingMaster;

    if (!master) {
      const invoiceNumber = await this.nextInvoiceNumber(tx, 'MASTER');
      master = await tx.invoice.create({
        data: {
          invoiceNumber,
          orderId: ctx.orderId,
          paymentId: ctx.paymentId,
          customerId: ctx.customerId,
          subtotal: ctx.unitPrice,
          shipping: ctx.shippingCost,
          commission: ctx.commission,
          total: ctx.totalAmount,
          currency,
          status: 'PAID',
          invoiceType: 'MASTER',
          invoiceGroupId,
          partNameSnapshot: partName,
          carrierNameSnapshot: ctx.carrierName || null,
          platformLegalNameEn: ctx.platformLegalNameEn || null,
          platformLegalNameAr: ctx.platformLegalNameAr || null,
        },
      });
      createdTypes.push('MASTER');
      alreadyExisted = false;
    } else {
      invoiceGroupId = master.invoiceGroupId || master.id;
      if (!master.invoiceGroupId) {
        await tx.invoice.update({
          where: { id: master.id },
          data: { invoiceGroupId },
        });
      }
    }

    const parentInvoiceId = master.id;

    // PART
    const existingPart = await tx.invoice.findFirst({
      where: { paymentId: ctx.paymentId, invoiceType: 'PART' },
      select: { id: true },
    });
    if (!existingPart) {
      const invoiceNumber = await this.nextInvoiceNumber(tx, 'PART');
      await tx.invoice.create({
        data: {
          invoiceNumber,
          orderId: ctx.orderId,
          paymentId: ctx.paymentId,
          customerId: ctx.customerId,
          subtotal: ctx.unitPrice,
          shipping: 0,
          commission: 0,
          total: ctx.unitPrice,
          currency,
          status: 'PAID',
          invoiceType: 'PART',
          invoiceGroupId,
          parentInvoiceId,
          partNameSnapshot: partName,
          platformLegalNameEn: ctx.platformLegalNameEn || null,
          platformLegalNameAr: ctx.platformLegalNameAr || null,
        },
      });
      createdTypes.push('PART');
    }

    // COMMISSION
    const existingCommission = await tx.invoice.findFirst({
      where: { paymentId: ctx.paymentId, invoiceType: 'COMMISSION' },
      select: { id: true },
    });
    if (!existingCommission) {
      const invoiceNumber = await this.nextInvoiceNumber(tx, 'COMMISSION');
      await tx.invoice.create({
        data: {
          invoiceNumber,
          orderId: ctx.orderId,
          paymentId: ctx.paymentId,
          customerId: ctx.customerId,
          subtotal: 0,
          shipping: 0,
          commission: ctx.commission,
          total: ctx.commission,
          currency,
          status: 'PAID',
          invoiceType: 'COMMISSION',
          invoiceGroupId,
          parentInvoiceId,
          partNameSnapshot: partName,
          platformLegalNameEn: ctx.platformLegalNameEn || null,
          platformLegalNameAr: ctx.platformLegalNameAr || null,
        },
      });
      createdTypes.push('COMMISSION');
    }

    // SHIPPING
    const shipPlan = resolveShippingBatch({
      paymentId: ctx.paymentId,
      shippingCost: ctx.shippingCost,
      shippingType: ctx.shippingType,
      cartShipmentId: ctx.cartShipmentId,
    });

    if (shipPlan.shouldCreate) {
      const line: ShippingLineItem = {
        paymentId: ctx.paymentId,
        offerId: ctx.offerId || null,
        partName,
        amount: Number(ctx.shippingCost) || 0,
      };

      const existingShip = await tx.invoice.findFirst({
        where: {
          invoiceType: 'SHIPPING',
          shippingBatchKey: shipPlan.shippingBatchKey,
        },
      });

      if (!existingShip) {
        const invoiceNumber = await this.nextInvoiceNumber(tx, 'SHIPPING');
        const lineItems = [line];
        const totalShip = sumShippingLineItems(lineItems);
        await tx.invoice.create({
          data: {
            invoiceNumber,
            orderId: ctx.orderId,
            paymentId: ctx.paymentId,
            customerId: ctx.customerId,
            subtotal: 0,
            shipping: totalShip,
            commission: 0,
            total: totalShip,
            currency,
            status: 'PAID',
            invoiceType: 'SHIPPING',
            invoiceGroupId,
            parentInvoiceId,
            shippingBatchKey: shipPlan.shippingBatchKey,
            lineItems: lineItems as unknown as Prisma.InputJsonValue,
            partNameSnapshot: partName,
            carrierNameSnapshot: ctx.carrierName || null,
            platformLegalNameEn: ctx.platformLegalNameEn || null,
            platformLegalNameAr: ctx.platformLegalNameAr || null,
          },
        });
        createdTypes.push('SHIPPING');
      } else if (shipPlan.isCombined) {
        const prev =
          (existingShip.lineItems as unknown as ShippingLineItem[] | null) || [];
        const merged = mergeShippingLineItems(prev, line);
        const totalShip = sumShippingLineItems(merged);
        await tx.invoice.update({
          where: { id: existingShip.id },
          data: {
            lineItems: merged as unknown as Prisma.InputJsonValue,
            shipping: totalShip,
            total: totalShip,
            carrierNameSnapshot:
              ctx.carrierName || existingShip.carrierNameSnapshot,
          },
        });
      }
    }

    if (createdTypes.length > 0) {
      try {
        await this.auditLogs.logAction(
          {
            orderId: ctx.orderId,
            action: 'INVOICE_BUNDLE_CREATED',
            entity: 'Invoice',
            actorType: ActorType.SYSTEM,
            actorId: ctx.actorId || undefined,
            metadata: {
              paymentId: ctx.paymentId,
              invoiceGroupId,
              createdTypes,
              masterInvoiceNumber: master.invoiceNumber,
            },
            newState: 'PAID',
          },
          tx,
        );
      } catch (err) {
        this.logger.warn(
          `INVOICE_BUNDLE_CREATED audit failed: ${(err as Error)?.message}`,
        );
      }
    }

    return {
      masterInvoiceNumber: master.invoiceNumber,
      invoiceGroupId,
      createdTypes,
      alreadyExisted,
    };
  }

  /** Mark typed invoices for a fully refunded payment without killing combined SHIPPING of other payments. */
  async markPaymentInvoicesRefunded(
    tx: Tx,
    paymentId: string,
  ): Promise<number> {
    let updated = 0;

    const core = await tx.invoice.updateMany({
      where: {
        paymentId,
        invoiceType: { in: ['MASTER', 'PART', 'COMMISSION'] },
      },
      data: { status: 'REFUNDED' },
    });
    updated += core.count;

    const payment = await tx.paymentTransaction.findUnique({
      where: { id: paymentId },
      select: { orderId: true },
    });
    if (!payment) return updated;

    const shippingRows = await tx.invoice.findMany({
      where: {
        orderId: payment.orderId,
        invoiceType: 'SHIPPING',
        status: { not: 'REFUNDED' },
      },
    });

    for (const ship of shippingRows) {
      const lines =
        (ship.lineItems as unknown as ShippingLineItem[] | null) || [];
      const isSeparateOwner =
        ship.shippingBatchKey === paymentId ||
        (ship.paymentId === paymentId &&
          (lines.length === 0 ||
            (lines.length === 1 && lines[0]?.paymentId === paymentId)));

      const hasLine = lines.some((l) => l.paymentId === paymentId);

      if (isSeparateOwner && (hasLine || lines.length === 0 || ship.paymentId === paymentId)) {
        if (ship.shippingBatchKey === paymentId || lines.length <= 1) {
          await tx.invoice.update({
            where: { id: ship.id },
            data: { status: 'REFUNDED' },
          });
          updated += 1;
          continue;
        }
      }

      if (!hasLine) continue;

      const remaining = lines.filter((l) => l.paymentId !== paymentId);
      if (remaining.length === 0) {
        await tx.invoice.update({
          where: { id: ship.id },
          data: {
            status: 'REFUNDED',
            lineItems: [] as unknown as Prisma.InputJsonValue,
            shipping: 0,
            total: 0,
          },
        });
        updated += 1;
      } else {
        const totalShip = sumShippingLineItems(remaining);
        await tx.invoice.update({
          where: { id: ship.id },
          data: {
            lineItems: remaining as unknown as Prisma.InputJsonValue,
            shipping: totalShip,
            total: totalShip,
          },
        });
        updated += 1;
      }
    }

    return updated;
  }

  /** @deprecated Prefer markPaymentInvoicesRefunded — kept for callers that only know paymentId. */
  async markSiblingsRefunded(
    tx: Tx,
    opts: { paymentId: string; invoiceGroupId?: string | null },
  ): Promise<number> {
    return this.markPaymentInvoicesRefunded(tx, opts.paymentId);
  }
}
