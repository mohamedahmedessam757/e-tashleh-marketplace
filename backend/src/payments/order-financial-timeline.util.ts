import { NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  getEscrowStatusLabel,
  getPaymentStatusLabel,
  getWalletTypeLabel,
} from './financial-labels.ar';

export interface OrderTimelineEvent {
  id: string;
  eventType: string;
  eventTypeEn: string;
  eventTypeAr: string;
  timestamp: Date | string;
  status?: string;
  direction?: string;
  amount?: number;
  role?: string;
  actor?: { type: string; name: string | null };
  descriptionEn: string;
  descriptionAr: string;
}

export interface OrderFinancialTimelineDto {
  order: {
    id: string;
    orderNumber: string;
    status: string;
    createdAt: Date;
  };
  customer: { id: string; name: string; avatar: string | null };
  merchants: Array<{ id: string; name: string; logo: string | null; storeCode: string | null }>;
  timeline: OrderTimelineEvent[];
  summary: {
    totalPaid: number;
    totalCommission: number;
    shippingCosts: number;
    merchantEarnings: number;
    totalRefunded: number;
    escrowStatus: string;
    hasDispute: boolean;
    hasReturn: boolean;
  };
}

export async function buildOrderFinancialTimeline(
  prisma: PrismaService,
  orderId: string,
): Promise<OrderFinancialTimelineDto> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      orderNumber: true,
      status: true,
      createdAt: true,
      customer: { select: { id: true, name: true, avatar: true } },
      offers: {
        where: { status: 'accepted' },
        select: {
          store: { select: { id: true, name: true, logo: true, storeCode: true } },
        },
      },
    },
  });

  if (!order) throw new NotFoundException('Order not found');

  const [payments, escrowRows, auditLogs, returns, disputes] = await Promise.all([
    prisma.paymentTransaction.findMany({
      where: { orderId },
      select: {
        id: true,
        createdAt: true,
        status: true,
        totalAmount: true,
        commission: true,
        shippingCost: true,
        refundedAmount: true,
        transactionNumber: true,
        cardBrand: true,
      },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.escrowTransaction.findMany({
      where: { orderId },
      select: {
        id: true,
        createdAt: true,
        updatedAt: true,
        status: true,
        merchantAmount: true,
        releasedAt: true,
        frozenReason: true,
      },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.auditLog.findMany({
      where: { orderId, entity: 'FINANCIAL' },
      select: {
        id: true,
        timestamp: true,
        action: true,
        actorType: true,
        actorName: true,
      },
      orderBy: { timestamp: 'asc' },
    }),
    prisma.returnRequest.findMany({
      where: { orderId },
      select: { id: true, createdAt: true, status: true, refundAmount: true, reason: true },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.dispute.findMany({
      where: { orderId },
      select: { id: true, createdAt: true, status: true, refundAmount: true, reason: true },
      orderBy: { createdAt: 'asc' },
    }),
  ]);

  const paymentIds = payments.map((p) => p.id);
  const escrowIds = escrowRows.map((e) => e.id);

  const walletTxs =
    paymentIds.length || escrowIds.length
      ? await prisma.walletTransaction.findMany({
          where: {
            OR: [
              ...(paymentIds.length ? [{ paymentId: { in: paymentIds } }] : []),
              ...(escrowIds.length ? [{ escrowId: { in: escrowIds } }] : []),
            ],
          },
          select: {
            id: true,
            paymentId: true,
            escrowId: true,
            createdAt: true,
            type: true,
            transactionType: true,
            amount: true,
            role: true,
            description: true,
          },
          orderBy: { createdAt: 'asc' },
        })
      : [];

  const walletsByPayment = new Map<string, typeof walletTxs>();
  const walletsByEscrow = new Map<string, typeof walletTxs>();
  for (const wt of walletTxs) {
    if (wt.paymentId) {
      const list = walletsByPayment.get(wt.paymentId) ?? [];
      list.push(wt);
      walletsByPayment.set(wt.paymentId, list);
    }
    if (wt.escrowId) {
      const list = walletsByEscrow.get(wt.escrowId) ?? [];
      list.push(wt);
      walletsByEscrow.set(wt.escrowId, list);
    }
  }

  const timeline: OrderTimelineEvent[] = [];
  const seenWalletIds = new Set<string>();

  for (const pt of payments) {
    const paymentLabel = getPaymentStatusLabel(pt.status, 'en');
    const paymentLabelAr = getPaymentStatusLabel(pt.status, 'ar');
    timeline.push({
      id: `payment-${pt.id}`,
      eventType: `PAYMENT_${pt.status}`,
      eventTypeEn: paymentLabel,
      eventTypeAr: paymentLabelAr,
      timestamp: pt.createdAt,
      status: pt.status,
      direction: 'DEBIT',
      amount: Number(pt.totalAmount),
      descriptionEn: `Customer paid ${pt.totalAmount} AED for order`,
      descriptionAr: `قام العميل بدفع ${pt.totalAmount} درهم للطلب`,
    });

    for (const wt of walletsByPayment.get(pt.id) ?? []) {
      seenWalletIds.add(wt.id);
      const labelEn = getWalletTypeLabel(wt.transactionType, 'en');
      const labelAr = getWalletTypeLabel(wt.transactionType, 'ar');
      timeline.push({
        id: `wallet-${wt.id}`,
        eventType: `WALLET_${wt.transactionType.toUpperCase()}`,
        eventTypeEn: labelEn,
        eventTypeAr: labelAr,
        timestamp: wt.createdAt,
        direction: wt.type,
        amount: Number(wt.amount),
        role: wt.role,
        descriptionEn: wt.description || labelEn,
        descriptionAr: wt.description || labelAr,
      });
    }
  }

  for (const escrow of escrowRows) {
    const escrowLabel = getEscrowStatusLabel(escrow.status, 'en');
    const escrowLabelAr = getEscrowStatusLabel(escrow.status, 'ar');
    timeline.push({
      id: `escrow-${escrow.id}`,
      eventType: `ESCROW_${escrow.status}`,
      eventTypeEn: escrowLabel,
      eventTypeAr: escrowLabelAr,
      timestamp: escrow.createdAt,
      status: escrow.status,
      direction: 'HOLD',
      amount: Number(escrow.merchantAmount),
      descriptionEn: `Funds held in escrow: ${escrow.merchantAmount} AED`,
      descriptionAr: `تم حجز مبلغ ${escrow.merchantAmount} درهم في الضمان`,
    });

    if (escrow.status === 'RELEASED' && escrow.releasedAt) {
      timeline.push({
        id: `escrow-release-${escrow.id}`,
        eventType: 'ESCROW_RELEASE',
        eventTypeEn: 'Escrow Funds Released',
        eventTypeAr: 'تحرير أموال الضمان',
        timestamp: escrow.releasedAt,
        status: 'COMPLETED',
        direction: 'RELEASE',
        amount: Number(escrow.merchantAmount),
        descriptionEn: `Funds released to merchant: ${escrow.merchantAmount} AED`,
        descriptionAr: `تم تحرير الأموال للمتجر: ${escrow.merchantAmount} درهم`,
      });
    }

    if (escrow.status === 'FROZEN') {
      timeline.push({
        id: `escrow-freeze-${escrow.id}`,
        eventType: 'ESCROW_FREEZE',
        eventTypeEn: 'Escrow Funds Frozen',
        eventTypeAr: 'تجميد أموال الضمان',
        timestamp: escrow.updatedAt,
        status: 'FROZEN',
        direction: 'HOLD',
        amount: Number(escrow.merchantAmount),
        descriptionEn: `Funds frozen due to dispute: ${escrow.frozenReason || 'Dispute'}`,
        descriptionAr: `تم تجميد الأموال بسبب نزاع: ${escrow.frozenReason || 'نزاع'}`,
      });
    }

    for (const wt of walletsByEscrow.get(escrow.id) ?? []) {
      if (seenWalletIds.has(wt.id)) continue;
      seenWalletIds.add(wt.id);
      const labelEn = getWalletTypeLabel(wt.transactionType, 'en');
      const labelAr = getWalletTypeLabel(wt.transactionType, 'ar');
      timeline.push({
        id: `wallet-${wt.id}`,
        eventType: `WALLET_${wt.transactionType.toUpperCase()}`,
        eventTypeEn: labelEn,
        eventTypeAr: labelAr,
        timestamp: wt.createdAt,
        direction: wt.type,
        amount: Number(wt.amount),
        role: wt.role,
        descriptionEn: wt.description || labelEn,
        descriptionAr: wt.description || labelAr,
      });
    }
  }

  for (const log of auditLogs) {
    timeline.push({
      id: `audit-${log.id}`,
      eventType: 'AUDIT',
      eventTypeEn: `Audit: ${log.action}`,
      eventTypeAr: `تدقيق: ${log.action}`,
      timestamp: log.timestamp,
      actor: { type: log.actorType, name: log.actorName },
      descriptionEn: `Action: ${log.action} by ${log.actorName || 'System'}`,
      descriptionAr: `إجراء: ${log.action} بواسطة ${log.actorName || 'النظام'}`,
    });
  }

  for (const r of returns) {
    timeline.push({
      id: `return-${r.id}`,
      eventType: 'RETURN',
      eventTypeEn: 'Return Request',
      eventTypeAr: 'طلب إرجاع',
      timestamp: r.createdAt,
      status: r.status,
      amount: r.refundAmount != null ? Number(r.refundAmount) : undefined,
      descriptionEn: `Return requested: ${r.reason}`,
      descriptionAr: `طلب إرجاع: ${r.reason}`,
    });
  }

  for (const d of disputes) {
    timeline.push({
      id: `dispute-${d.id}`,
      eventType: 'DISPUTE',
      eventTypeEn: 'Dispute Opened',
      eventTypeAr: 'فتح نزاع',
      timestamp: d.createdAt,
      status: d.status,
      amount: d.refundAmount != null ? Number(d.refundAmount) : undefined,
      descriptionEn: `Dispute opened: ${d.reason}`,
      descriptionAr: `تم فتح نزاع: ${d.reason}`,
    });
  }

  timeline.sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
  );

  const merchantById = new Map<string, (typeof order.offers)[number]['store']>();
  for (const offer of order.offers) {
    if (offer.store) merchantById.set(offer.store.id, offer.store);
  }

  const totalPaid = payments.reduce((sum, pt) => sum + Number(pt.totalAmount), 0);
  const totalCommission = payments.reduce((sum, pt) => sum + Number(pt.commission), 0);
  const shippingCosts = payments.reduce((sum, pt) => sum + Number(pt.shippingCost), 0);
  const totalRefunded = payments.reduce((sum, pt) => sum + Number(pt.refundedAmount || 0), 0);

  return {
    order: {
      id: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      createdAt: order.createdAt,
    },
    customer: order.customer,
    merchants: Array.from(merchantById.values()).filter(Boolean) as OrderFinancialTimelineDto['merchants'],
    timeline,
    summary: {
      totalPaid,
      totalCommission,
      shippingCosts,
      merchantEarnings: totalPaid - totalCommission - shippingCosts,
      totalRefunded,
      escrowStatus: escrowRows.at(-1)?.status ?? 'N/A',
      hasDispute: disputes.length > 0,
      hasReturn: returns.length > 0,
    },
  };
}
