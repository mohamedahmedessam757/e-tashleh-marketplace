import { BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { EXCLUDED_ORDER_STATUSES_FOR_PURCHASES } from './customer-wallet-metrics.util';
import {
  AdminDateRange,
  buildAdminDateRange,
  buildGrossSalesPaymentWhere,
  buildPaymentDateFilter,
  refundRecognizedWhere,
  roundMoney,
} from './admin-financial-metrics.util';

export const ADMIN_KPI_METRIC_IDS = [
  'totalSales',
  'totalRefunds',
  'netCommission',
  'grossCommission',
  'paymentGatewayFees',
  'netPlatformPosition',
  'totalOrders',
  'activeCustomers',
  'activeStores',
  'openDisputes',
  'frozenFunds',
  'pendingWithdrawals',
  'pendingLiabilities',
  'totalReleasedToMerchants',
  'completedWithdrawals',
  'loyaltyReferralExpenses',
  'commissionRefunds',
  'netPlatformRevenue',
  'shippingCollected',
  'referralPaidOut',
  'loyaltyCashback',
  'gatewayFees',
  'failedUnsettled',
  'financialDisputes',
  'totalPenalties',
  'dailyTxCount',
  'monthlyTxCount',
  'activityLoad',
] as const;

export type AdminKpiMetricId = (typeof ADMIN_KPI_METRIC_IDS)[number];

const OPEN_CASE_WHERE = {
  verdictIssuedAt: null,
  status: {
    in: ['AWAITING_ADMIN', 'UNDER_REVIEW', 'ESCALATED', 'MERCHANT_REJECTED'],
  },
};

export interface KpiBreakdownLine {
  id: string;
  paymentId?: string;
  orderNumber?: string;
  customerName?: string;
  storeName?: string;
  amount: number;
  status?: string;
  paidAt?: string;
  reasonAr: string;
  reasonEn: string;
  metricId?: string;
}

export interface KpiBreakdownSource {
  metricId: AdminKpiMetricId;
  labelAr: string;
  labelEn: string;
  amount: number;
  sign: 'plus' | 'minus';
}

export interface KpiOutsideFlow {
  labelAr: string;
  labelEn: string;
}

const OUTSIDE_SALES_FORMULA: KpiOutsideFlow[] = [
  {
    labelAr: 'سحب التاجر أو العميل ينقص رصيد المحفظة، والصافي يُحوَّل إلى حسابه البنكي أو Stripe. لا يدخل في المبيعات ولا في العمولة.',
    labelEn: 'A merchant or customer withdrawal reduces the wallet balance, and the net is paid to their bank or Stripe account. It is not part of sales or commission.',
  },
  {
    labelAr: 'رسم الإلغاء المحصّل يزيد رصيد رسوم المنصة وإيرادها، لا عمولة صفقة البيع. رسم الحكم يُخصم من مبلغ التحويل ويُعلَّم مدفوعًا على القضية.',
    labelEn: 'A collected cancellation fee increases the platform fees balance and its revenue, not the sale commission. An adjudication fee is withheld from the payout and marked paid on the case.',
  },
  {
    labelAr: 'شحن الذهاب والعودة يُحمَّل على التاجر أو العميل أو شركة الشحن حسب الحكم. تحصيله لا يُضاف إلى رقم المبيعات.',
    labelEn: 'Round-trip shipping is charged to the merchant, the customer, or the carrier according to the verdict. Collecting it is not added to the sales figure.',
  },
];

export interface KpiBreakdownResult {
  metricId: AdminKpiMetricId;
  total: number;
  formulaAr: string;
  formulaEn: string;
  notStripeCash: boolean;
  unit?: 'money' | 'count';
  outside?: KpiOutsideFlow[];
  stripeNoteAr?: string;
  stripeNoteEn?: string;
  stripeGross?: number;
  storedGatewayFees?: number;
  sources?: KpiBreakdownSource[];
  included: KpiBreakdownLine[];
  excluded: KpiBreakdownLine[];
  includedHasMore: boolean;
  excludedHasMore: boolean;
  nextIncludedCursor?: string;
  nextExcludedCursor?: string;
}

const paymentSelect = {
  id: true,
  status: true,
  totalAmount: true,
  refundedAmount: true,
  commission: true,
  gatewayFee: true,
  shippingCost: true,
  paidAt: true,
  createdAt: true,
  refundedAt: true,
  transactionNumber: true,
  customer: { select: { name: true } },
  order: { select: { orderNumber: true, status: true } },
  offer: { select: { store: { select: { name: true } } } },
} satisfies Prisma.PaymentTransactionSelect;

type PaymentRow = Prisma.PaymentTransactionGetPayload<{ select: typeof paymentSelect }>;

function encodeCursor(sortAt: Date, id: string): string {
  return `${sortAt.toISOString()}|${id}`;
}

function decodeCursor(cursor?: string): { sortAt: Date; id: string } | null {
  if (!cursor) return null;
  const splitAt = cursor.indexOf('|');
  if (splitAt <= 0) return null;
  const sortAt = new Date(cursor.slice(0, splitAt));
  const id = cursor.slice(splitAt + 1);
  if (!id || Number.isNaN(sortAt.getTime())) return null;
  return { sortAt, id };
}

function cursorWhere(cursor?: string): Prisma.PaymentTransactionWhereInput {
  const decoded = decodeCursor(cursor);
  if (!decoded) return {};
  return {
    OR: [
      { createdAt: { lt: decoded.sortAt } },
      { createdAt: decoded.sortAt, id: { lt: decoded.id } },
    ],
  };
}

function paidStamp(row: { paidAt: Date | null; createdAt: Date; refundedAt?: Date | null }): string {
  return (row.refundedAt || row.paidAt || row.createdAt).toISOString();
}

function paymentLine(
  row: PaymentRow,
  amount: number,
  reasonAr: string,
  reasonEn: string,
): KpiBreakdownLine {
  return {
    id: row.id,
    paymentId: row.id,
    orderNumber: row.order?.orderNumber || row.transactionNumber,
    customerName: row.customer?.name || undefined,
    storeName: row.offer?.store?.name || undefined,
    amount: roundMoney(amount),
    status: row.status,
    paidAt: paidStamp(row),
    reasonAr,
    reasonEn,
  };
}

async function pagePayments(
  prisma: PrismaService,
  where: Prisma.PaymentTransactionWhereInput,
  cursor: string | undefined,
  limit: number,
  amountOf: (row: PaymentRow) => number,
  reasonOf: (row: PaymentRow) => { ar: string; en: string },
): Promise<{ lines: KpiBreakdownLine[]; hasMore: boolean; nextCursor?: string }> {
  const rows = await prisma.paymentTransaction.findMany({
    where: { AND: [where, cursorWhere(cursor)] },
    select: paymentSelect,
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    take: limit + 1,
  });
  const hasMore = rows.length > limit;
  const page = hasMore ? rows.slice(0, limit) : rows;
  const last = page[page.length - 1];
  return {
    lines: page.map((row) => {
      const reason = reasonOf(row);
      return paymentLine(row, amountOf(row), reason.ar, reason.en);
    }),
    hasMore,
    nextCursor: hasMore && last ? encodeCursor(last.createdAt, last.id) : undefined,
  };
}

function chargedInRange(range: AdminDateRange): Prisma.PaymentTransactionWhereInput {
  const dateFilter = buildPaymentDateFilter(range);
  const status = { in: ['SUCCESS', 'REFUNDED'] };
  if (!dateFilter) return { status };
  return {
    status,
    OR: [{ paidAt: dateFilter }, { paidAt: null, createdAt: dateFilter }],
  };
}

function salesExcludedWhere(range: AdminDateRange): Prisma.PaymentTransactionWhereInput {
  const dateFilter = buildPaymentDateFilter(range);
  const excluded = {
    OR: [
      { status: 'REFUNDED' },
      { order: { status: { in: [...EXCLUDED_ORDER_STATUSES_FOR_PURCHASES] } } },
    ],
  };
  if (!dateFilter) return excluded;
  return {
    AND: [
      {
        OR: [{ paidAt: dateFilter }, { paidAt: null, createdAt: dateFilter }],
      },
      excluded,
    ],
  };
}

function walletDate(range: AdminDateRange): Prisma.DateTimeFilter | undefined {
  return buildPaymentDateFilter(range);
}

async function sumPayments(
  prisma: PrismaService,
  where: Prisma.PaymentTransactionWhereInput,
  field: 'totalAmount' | 'refundedAmount' | 'commission' | 'gatewayFee',
): Promise<number> {
  const agg = await prisma.paymentTransaction.aggregate({
    where,
    _sum: { [field]: true },
  });
  return roundMoney(Number(agg._sum[field] || 0));
}

function sliceByCursor<T extends { createdAt: Date; id: string }>(
  rows: T[],
  cursor: string | undefined,
  limit: number,
): { page: T[]; hasMore: boolean; nextCursor?: string } {
  const decoded = decodeCursor(cursor);
  const filtered = decoded
    ? rows.filter(
        (row) =>
          row.createdAt < decoded.sortAt ||
          (row.createdAt.getTime() === decoded.sortAt.getTime() && row.id < decoded.id),
      )
    : rows;
  const sorted = [...filtered].sort((a, b) => {
    const time = b.createdAt.getTime() - a.createdAt.getTime();
    if (time !== 0) return time;
    return a.id < b.id ? 1 : -1;
  });
  const hasMore = sorted.length > limit;
  const page = hasMore ? sorted.slice(0, limit) : sorted;
  const last = page[page.length - 1];
  return {
    page,
    hasMore,
    nextCursor: hasMore && last ? encodeCursor(last.createdAt, last.id) : undefined,
  };
}

export async function buildAdminKpiBreakdown(
  prisma: PrismaService,
  filters: {
    metric?: string;
    startDate?: string;
    endDate?: string;
    includedCursor?: string;
    excludedCursor?: string;
    limit?: number;
  },
): Promise<KpiBreakdownResult> {
  const metric = String(filters.metric || '');
  if (!ADMIN_KPI_METRIC_IDS.includes(metric as AdminKpiMetricId)) {
    throw new BadRequestException('Unknown financial metric');
  }
  for (const value of [filters.startDate, filters.endDate]) {
    if (!value) continue;
    if (Number.isNaN(new Date(value).getTime())) {
      throw new BadRequestException('Invalid date');
    }
  }
  const metricId = metric as AdminKpiMetricId;
  const range = buildAdminDateRange({
    startDate: filters.startDate,
    endDate: filters.endDate,
  });
  const limit = Math.min(Math.max(Number(filters.limit) || 50, 1), 50);
  const includedCursor = filters.includedCursor;
  const excludedCursor = filters.excludedCursor;

  if (isFinanceCenterMetric(metricId)) {
    return buildFinanceCenterBreakdown(prisma, metricId, range, limit, includedCursor);
  }

  if (metricId === 'totalSales' || metricId === 'grossCommission' || metricId === 'paymentGatewayFees') {
    const includedWhere = buildGrossSalesPaymentWhere(range);
    const amountOf =
      metricId === 'grossCommission'
        ? (row: PaymentRow) => Number(row.commission)
        : metricId === 'paymentGatewayFees'
          ? (row: PaymentRow) => Number(row.gatewayFee)
          : (row: PaymentRow) => Number(row.totalAmount);
    const field =
      metricId === 'grossCommission'
        ? 'commission'
        : metricId === 'paymentGatewayFees'
          ? 'gatewayFee'
          : 'totalAmount';
    const [total, included, excluded, stripeGross, storedGatewayFees] = await Promise.all([
      sumPayments(prisma, includedWhere, field),
      pagePayments(
        prisma,
        includedWhere,
        includedCursor,
        limit,
        amountOf,
        () =>
          metricId === 'grossCommission'
            ? { ar: 'عمولة على دفعة ناجحة', en: 'Commission on a successful payment' }
            : metricId === 'paymentGatewayFees'
              ? { ar: 'رسم بوابة مخزّن على دفعة ناجحة', en: 'Stored gateway fee on a successful payment' }
              : { ar: 'دفعة ناجحة وطلبها ليس ملغى أو مسترد', en: 'Successful payment on an order that is not cancelled or refunded' },
      ),
      metricId === 'totalSales'
        ? pagePayments(
            prisma,
            salesExcludedWhere(range),
            excludedCursor,
            limit,
            (row) => Number(row.totalAmount),
            (row) =>
              row.status === 'REFUNDED'
                ? { ar: 'مستبعدة لأن الدفعة مستردة', en: 'Excluded because the payment was refunded' }
                : { ar: 'مستبعدة لأن حالة الطلب ملغاة أو مستردة', en: 'Excluded because the order is cancelled or refunded' },
          )
        : Promise.resolve({ lines: [], hasMore: false, nextCursor: undefined }),
      metricId === 'totalSales' || metricId === 'paymentGatewayFees'
        ? sumPayments(prisma, chargedInRange(range), metricId === 'paymentGatewayFees' ? 'gatewayFee' : 'totalAmount')
        : Promise.resolve(undefined),
      metricId === 'paymentGatewayFees'
        ? sumPayments(prisma, chargedInRange(range), 'gatewayFee')
        : Promise.resolve(undefined),
    ]);

    const formulas = {
      totalSales: {
        ar: 'مجموع مبالغ الدفعات الناجحة التي طلبها ليس ملغى أو مسترد.',
        en: 'Sum of successful payments whose order is not cancelled or refunded.',
      },
      grossCommission: {
        ar: 'مجموع عمولة المنصة على الدفعات الناجحة نفسها التي تدخل في المبيعات.',
        en: 'Sum of platform commission on the same successful payments counted as sales.',
      },
      paymentGatewayFees: {
        ar: 'مجموع رسوم البوابة المخزّنة على الدفعات الناجحة. هذا تقدير المنصة وليس رسم Stripe الفعلي.',
        en: 'Sum of stored gateway fees on successful payments. This is the platform estimate, not Stripe’s actual fee.',
      },
    } as const;

    const stripeNote =
      metricId === 'totalSales' && stripeGross != null
        ? {
            stripeGross,
            stripeNoteAr: `كل عمليات الشحن في الدفتر خلال النافذة ${stripeGross.toFixed(2)} درهم. مبيعات المنصة ${total.toFixed(2)}. الفرق ${roundMoney(stripeGross - total).toFixed(2)} هو ما خرج من المبيعات لأنه مسترد أو طلبه مستبعد. Stripe يبقي الشحن الأصلي داخل تقرير النشاط.`,
            stripeNoteEn: `Ledger charges in this window are ${stripeGross.toFixed(2)} AED. Platform sales are ${total.toFixed(2)}. The gap of ${roundMoney(stripeGross - total).toFixed(2)} left sales because it was refunded or the order was excluded. Stripe keeps the original charge on the activity report.`,
          }
        : metricId === 'paymentGatewayFees'
          ? {
              stripeGross,
              storedGatewayFees,
              stripeNoteAr:
                'رسم Stripe في تقرير الرصيد قد يكون أعلى من هذا الرقم. المنصة تخزن تقديرًا محليًا، ولا تخزن رسم balance transaction ولا فرق تحويل SAR.',
              stripeNoteEn:
                'The Stripe balance-report fee can be higher than this figure. The platform stores a local estimate, not the balance-transaction fee or the SAR conversion difference.',
            }
          : {};

    return {
      metricId,
      total,
      formulaAr: formulas[metricId].ar,
      formulaEn: formulas[metricId].en,
      notStripeCash: false,
      outside: OUTSIDE_SALES_FORMULA,
      ...stripeNote,
      included: included.lines,
      excluded: excluded.lines,
      includedHasMore: included.hasMore,
      excludedHasMore: excluded.hasMore,
      nextIncludedCursor: included.nextCursor,
      nextExcludedCursor: excluded.nextCursor,
    };
  }

  if (metricId === 'totalRefunds') {
    const where: Prisma.PaymentTransactionWhereInput = {
      refundedAmount: { gt: 0 },
      ...refundRecognizedWhere(range),
    };
    const [total, included] = await Promise.all([
      sumPayments(prisma, where, 'refundedAmount'),
      pagePayments(
        prisma,
        where,
        includedCursor,
        limit,
        (row) => Number(row.refundedAmount),
        () => ({ ar: 'مبلغ مسترد للعميل', en: 'Amount refunded to the customer' }),
      ),
    ]);
    return {
      metricId,
      total,
      formulaAr: 'مجموع المبالغ المستردة. التاريخ هو وقت الاسترداد، وإن لم يُسجل يُستخدم تاريخ الدفعة.',
      formulaEn: 'Sum of refunded amounts. The date is the refund time, or the payment date when the refund time is missing.',
      notStripeCash: false,
      outside: OUTSIDE_SALES_FORMULA,
      included: included.lines,
      excluded: [],
      includedHasMore: included.hasMore,
      excludedHasMore: false,
      nextIncludedCursor: included.nextCursor,
    };
  }

  if (metricId === 'netCommission' || metricId === 'netPlatformPosition') {
    const salesWhere = buildGrossSalesPaymentWhere(range);
    const loyaltyWhere: Prisma.WalletTransactionWhereInput = {
      role: 'CUSTOMER',
      type: 'CREDIT',
      transactionType: 'ORDER_PROFIT',
      ...(walletDate(range) ? { createdAt: walletDate(range) } : {}),
    };
    const referralWhere: Prisma.WalletTransactionWhereInput = {
      type: 'CREDIT',
      transactionType: 'REFERRAL_PROFIT',
      ...(walletDate(range) ? { createdAt: walletDate(range) } : {}),
    };
    const refundWhere: Prisma.PaymentTransactionWhereInput = {
      refundedAmount: { gt: 0 },
      ...refundRecognizedWhere(range),
    };
    const loyaltyCursor = decodeCursor(includedCursor);
    const [commission, loyaltyAgg, referralAgg, fees, refunds, loyaltyRows] = await Promise.all([
      sumPayments(prisma, salesWhere, 'commission'),
      prisma.walletTransaction.aggregate({ where: loyaltyWhere, _sum: { amount: true } }),
      prisma.walletTransaction.aggregate({ where: referralWhere, _sum: { amount: true } }),
      sumPayments(prisma, salesWhere, 'gatewayFee'),
      sumPayments(prisma, refundWhere, 'refundedAmount'),
      prisma.walletTransaction.findMany({
        where: {
          AND: [
            loyaltyWhere,
            loyaltyCursor
              ? {
                  OR: [
                    { createdAt: { lt: loyaltyCursor.sortAt } },
                    { createdAt: loyaltyCursor.sortAt, id: { lt: loyaltyCursor.id } },
                  ],
                }
              : {},
          ],
        },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        take: limit + 1,
        select: {
          id: true,
          amount: true,
          createdAt: true,
          description: true,
          user: { select: { name: true } },
        },
      }),
    ]);
    const loyalty = roundMoney(Number(loyaltyAgg._sum.amount || 0));
    const referral = roundMoney(Number(referralAgg._sum.amount || 0));
    const net = roundMoney(commission - loyalty - referral - fees);
    const sources: KpiBreakdownSource[] = [
      {
        metricId: 'grossCommission',
        labelAr: 'عمولة الدفعات الناجحة',
        labelEn: 'Commission on successful payments',
        amount: commission,
        sign: 'plus',
      },
      {
        metricId: 'paymentGatewayFees',
        labelAr: 'رسوم البوابة المخزّنة',
        labelEn: 'Stored gateway fees',
        amount: fees,
        sign: 'minus',
      },
    ];
    if (loyalty !== 0) {
      sources.push({
        metricId: 'netCommission',
        labelAr: 'كاش باك الولاء',
        labelEn: 'Loyalty cashback',
        amount: loyalty,
        sign: 'minus',
      });
    }
    if (referral !== 0) {
      sources.push({
        metricId: 'netCommission',
        labelAr: 'أرباح الإحالة',
        labelEn: 'Referral payouts',
        amount: referral,
        sign: 'minus',
      });
    }

    if (metricId === 'netPlatformPosition') {
      return {
        metricId,
        total: roundMoney(net - refunds),
        formulaAr: 'صافي العمولة ناقص إجمالي المرتجعات. هذا ليس رصيد Stripe.',
        formulaEn: 'Net commission minus total refunds. This is not the Stripe balance.',
        notStripeCash: true,
        outside: OUTSIDE_SALES_FORMULA,
        sources: [
          {
            metricId: 'netCommission',
            labelAr: 'صافي العمولة',
            labelEn: 'Net commission',
            amount: net,
            sign: 'plus',
          },
          {
            metricId: 'totalRefunds',
            labelAr: 'إجمالي المرتجعات',
            labelEn: 'Total refunds',
            amount: refunds,
            sign: 'minus',
          },
        ],
        included: [],
        excluded: [],
        includedHasMore: false,
        excludedHasMore: false,
      };
    }

    const loyaltyPage = loyaltyRows.slice(0, limit);
    const loyaltyHasMore = loyaltyRows.length > limit;
    const lastLoyalty = loyaltyPage[loyaltyPage.length - 1];
    return {
      metricId,
      total: net,
      formulaAr: 'عمولة الدفعات الناجحة ناقص كاش باك الولاء وأرباح الإحالة ورسوم البوابة المخزّنة. هذا صافي العمولة وليس رصيد Stripe.',
      formulaEn: 'Commission on successful payments minus loyalty cashback, referral payouts, and stored gateway fees. This is net commission, not the Stripe balance.',
      notStripeCash: true,
      outside: OUTSIDE_SALES_FORMULA,
      sources,
      included: loyaltyPage.map((row) => ({
        id: row.id,
        customerName: row.user?.name || undefined,
        amount: roundMoney(Number(row.amount)),
        paidAt: row.createdAt.toISOString(),
        status: 'ORDER_PROFIT',
        reasonAr: row.description || 'كاش باك ولاء دُفع للعميل',
        reasonEn: row.description || 'Loyalty cashback credited to the customer',
      })),
      excluded: [],
      includedHasMore: loyaltyHasMore,
      excludedHasMore: false,
      nextIncludedCursor:
        loyaltyHasMore && lastLoyalty ? encodeCursor(lastLoyalty.createdAt, lastLoyalty.id) : undefined,
    };
  }

  if (metricId === 'totalOrders') {
    const dateFilter = buildPaymentDateFilter(range);
    const decoded = decodeCursor(includedCursor);
    const rows = await prisma.order.findMany({
      where: {
        ...(dateFilter ? { createdAt: dateFilter } : {}),
        ...(decoded
          ? {
              OR: [
                { createdAt: { lt: decoded.sortAt } },
                { createdAt: decoded.sortAt, id: { lt: decoded.id } },
              ],
            }
          : {}),
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: limit + 1,
      select: {
        id: true,
        orderNumber: true,
        status: true,
        totalAmount: true,
        createdAt: true,
        customer: { select: { name: true } },
      },
    });
    const hasMore = rows.length > limit;
    const page = hasMore ? rows.slice(0, limit) : rows;
    const count = await prisma.order.count({
      where: dateFilter ? { createdAt: dateFilter } : {},
    });
    const last = page[page.length - 1];
    return {
      metricId,
      total: count,
      formulaAr: 'عدد الطلبات التي أُنشئت داخل نافذة التاريخ.',
      formulaEn: 'Count of orders created inside the date window.',
      notStripeCash: false,
      included: page.map((row) => ({
        id: row.id,
        orderNumber: row.orderNumber,
        customerName: row.customer?.name || undefined,
        amount: roundMoney(Number(row.totalAmount || 0)),
        status: row.status,
        paidAt: row.createdAt.toISOString(),
        reasonAr: 'طلب داخل النافذة',
        reasonEn: 'Order inside the window',
      })),
      excluded: [],
      includedHasMore: hasMore,
      excludedHasMore: false,
      nextIncludedCursor: hasMore && last ? encodeCursor(last.createdAt, last.id) : undefined,
    };
  }

  if (metricId === 'activeCustomers' || metricId === 'activeStores') {
    if (metricId === 'activeCustomers') {
      const decoded = decodeCursor(includedCursor);
      const rows = await prisma.user.findMany({
        where: {
          role: 'CUSTOMER',
          ...(decoded
            ? {
                OR: [
                  { createdAt: { lt: decoded.sortAt } },
                  { createdAt: decoded.sortAt, id: { lt: decoded.id } },
                ],
              }
            : {}),
        },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        take: limit + 1,
        select: { id: true, name: true, createdAt: true },
      });
      const total = await prisma.user.count({ where: { role: 'CUSTOMER' } });
      const hasMore = rows.length > limit;
      const page = hasMore ? rows.slice(0, limit) : rows;
      const last = page[page.length - 1];
      return {
        metricId,
        total,
        formulaAr: 'كل العملاء المسجلين. الرقم لا يتقيد بنافذة الثلاثين يومًا، مثل كارت القيادة.',
        formulaEn: 'Every registered customer. The figure is not limited to the 30-day window, matching the command card.',
        notStripeCash: false,
        included: page.map((row) => ({
          id: row.id,
          customerName: row.name,
          amount: 0,
          paidAt: row.createdAt.toISOString(),
          status: 'CUSTOMER',
          reasonAr: 'حساب عميل مسجل',
          reasonEn: 'Registered customer account',
        })),
        excluded: [],
        includedHasMore: hasMore,
        excludedHasMore: false,
        nextIncludedCursor: hasMore && last ? encodeCursor(last.createdAt, last.id) : undefined,
      };
    }

    const decoded = decodeCursor(includedCursor);
    const rows = await prisma.store.findMany({
      where: {
        status: 'ACTIVE',
        ...(decoded
          ? {
              OR: [
                { createdAt: { lt: decoded.sortAt } },
                { createdAt: decoded.sortAt, id: { lt: decoded.id } },
              ],
            }
          : {}),
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: limit + 1,
      select: { id: true, name: true, storeCode: true, createdAt: true },
    });
    const total = await prisma.store.count({ where: { status: 'ACTIVE' } });
    const hasMore = rows.length > limit;
    const page = hasMore ? rows.slice(0, limit) : rows;
    const last = page[page.length - 1];
    return {
      metricId,
      total,
      formulaAr: 'المتاجر التي حالتها نشطة. الرقم لا يتقيد بنافذة التاريخ.',
      formulaEn: 'Stores whose status is active. The figure is not limited to the date window.',
      notStripeCash: false,
      included: page.map((row) => ({
        id: row.id,
        storeName: row.name,
        orderNumber: row.storeCode || undefined,
        amount: 0,
        paidAt: row.createdAt.toISOString(),
        status: 'ACTIVE',
        reasonAr: 'متجر نشط',
        reasonEn: 'Active store',
      })),
      excluded: [],
      includedHasMore: hasMore,
      excludedHasMore: false,
      nextIncludedCursor: hasMore && last ? encodeCursor(last.createdAt, last.id) : undefined,
    };
  }

  const [returns, disputes, returnCount, disputeCount] = await Promise.all([
    prisma.returnRequest.findMany({
      where: OPEN_CASE_WHERE,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: 200,
      select: {
        id: true,
        status: true,
        createdAt: true,
        caseReference: true,
        customer: { select: { name: true } },
        order: { select: { orderNumber: true } },
      },
    }),
    prisma.dispute.findMany({
      where: OPEN_CASE_WHERE,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: 200,
      select: {
        id: true,
        status: true,
        createdAt: true,
        caseReference: true,
        customer: { select: { name: true } },
        order: { select: { orderNumber: true } },
      },
    }),
    prisma.returnRequest.count({ where: OPEN_CASE_WHERE }),
    prisma.dispute.count({ where: OPEN_CASE_WHERE }),
  ]);
  const merged = [
    ...returns.map((row) => ({ ...row, kind: 'return' as const })),
    ...disputes.map((row) => ({ ...row, kind: 'dispute' as const })),
  ];
  const paged = sliceByCursor(merged, includedCursor, limit);
  return {
    metricId,
    total: returnCount + disputeCount,
    formulaAr: 'قضايا الإرجاع والنزاع التي ما زالت بانتظار حكم الإدارة.',
    formulaEn: 'Return and dispute cases that still await an admin verdict.',
    notStripeCash: false,
    included: paged.page.map((row) => ({
      id: row.id,
      orderNumber: row.order?.orderNumber || row.caseReference || undefined,
      customerName: row.customer?.name || undefined,
      amount: 0,
      status: row.status,
      paidAt: row.createdAt.toISOString(),
      reasonAr: row.kind === 'return' ? 'طلب إرجاع بانتظار الحكم' : 'نزاع بانتظار الحكم',
      reasonEn: row.kind === 'dispute' ? 'Dispute awaiting a verdict' : 'Return awaiting a verdict',
    })),
    excluded: [],
    includedHasMore: paged.hasMore,
    excludedHasMore: false,
    nextIncludedCursor: paged.nextCursor,
  };
}

const FINANCE_CENTER_METRICS = new Set<AdminKpiMetricId>([
  'frozenFunds',
  'pendingWithdrawals',
  'pendingLiabilities',
  'totalReleasedToMerchants',
  'completedWithdrawals',
  'loyaltyReferralExpenses',
  'commissionRefunds',
  'netPlatformRevenue',
  'shippingCollected',
  'referralPaidOut',
  'loyaltyCashback',
  'gatewayFees',
  'failedUnsettled',
  'financialDisputes',
  'totalPenalties',
  'dailyTxCount',
  'monthlyTxCount',
  'activityLoad',
]);

function isFinanceCenterMetric(metricId: AdminKpiMetricId): boolean {
  return FINANCE_CENTER_METRICS.has(metricId);
}

function dated(range: AdminDateRange): Prisma.DateTimeFilter | undefined {
  return buildPaymentDateFilter(range);
}

function packLines(
  metricId: AdminKpiMetricId,
  total: number,
  formulaAr: string,
  formulaEn: string,
  lines: KpiBreakdownLine[],
  hasMore: boolean,
  nextCursor: string | undefined,
  extra: Partial<KpiBreakdownResult> = {},
): KpiBreakdownResult {
  return {
    metricId,
    total,
    formulaAr,
    formulaEn,
    notStripeCash: false,
    included: lines,
    excluded: [],
    includedHasMore: hasMore,
    excludedHasMore: false,
    nextIncludedCursor: nextCursor,
    ...extra,
  };
}

async function pageWalletCredits(
  prisma: PrismaService,
  where: Prisma.WalletTransactionWhereInput,
  cursor: string | undefined,
  limit: number,
  reasonAr: string,
  reasonEn: string,
) {
  const decoded = decodeCursor(cursor);
  const rows = await prisma.walletTransaction.findMany({
    where: {
      AND: [
        where,
        decoded
          ? { OR: [{ createdAt: { lt: decoded.sortAt } }, { createdAt: decoded.sortAt, id: { lt: decoded.id } }] }
          : {},
      ],
    },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    take: limit + 1,
    select: {
      id: true,
      amount: true,
      createdAt: true,
      description: true,
      transactionType: true,
      user: { select: { name: true } },
    },
  });
  const hasMore = rows.length > limit;
  const page = hasMore ? rows.slice(0, limit) : rows;
  const last = page[page.length - 1];
  return {
    lines: page.map((row) => ({
      id: row.id,
      customerName: row.user?.name || undefined,
      amount: roundMoney(Number(row.amount)),
      status: row.transactionType,
      paidAt: row.createdAt.toISOString(),
      reasonAr: row.description || reasonAr,
      reasonEn: row.description || reasonEn,
    })),
    hasMore,
    nextCursor: hasMore && last ? encodeCursor(last.createdAt, last.id) : undefined,
  };
}

async function countLedgersSince(prisma: PrismaService, since: Date) {
  const createdAt = { gte: since };
  const [payments, wallet, escrow, withdrawals] = await Promise.all([
    prisma.paymentTransaction.count({ where: { createdAt } }),
    prisma.walletTransaction.count({ where: { createdAt } }),
    prisma.escrowTransaction.count({ where: { createdAt } }),
    prisma.withdrawalRequest.count({ where: { createdAt } }),
  ]);
  return { payments, wallet, escrow, withdrawals, total: payments + wallet + escrow + withdrawals };
}

async function buildFinanceCenterBreakdown(
  prisma: PrismaService,
  metricId: AdminKpiMetricId,
  range: AdminDateRange,
  limit: number,
  cursor: string | undefined,
): Promise<KpiBreakdownResult> {
  const dateFilter = dated(range);
  const walletDate = dateFilter ? { createdAt: dateFilter } : {};

  if (metricId === 'frozenFunds') {
    const decoded = decodeCursor(cursor);
    const where: Prisma.StoreWhereInput = {
      OR: [{ pendingBalance: { gt: 0 } }, { frozenBalance: { gt: 0 } }],
      ...(decoded
        ? { AND: [{ OR: [{ createdAt: { lt: decoded.sortAt } }, { createdAt: decoded.sortAt, id: { lt: decoded.id } }] }] }
        : {}),
    };
    const [rows, sums] = await Promise.all([
      prisma.store.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        take: limit + 1,
        select: { id: true, name: true, pendingBalance: true, frozenBalance: true, createdAt: true },
      }),
      prisma.store.aggregate({ _sum: { pendingBalance: true, frozenBalance: true } }),
    ]);
    const hasMore = rows.length > limit;
    const page = hasMore ? rows.slice(0, limit) : rows;
    const last = page[page.length - 1];
    return packLines(
      metricId,
      roundMoney(Number(sums._sum.pendingBalance || 0) + Number(sums._sum.frozenBalance || 0)),
      'مجموع الرصيد المعلّق والمجمّد في كل المتاجر. هذا ضمان التجار وليس رصيد بوابة الدفع.',
      'Sum of pending and frozen balances across stores. This is merchant escrow, not the payment-gateway balance.',
      page.map((row) => ({
        id: row.id,
        storeName: row.name,
        amount: roundMoney(Number(row.pendingBalance) + Number(row.frozenBalance)),
        status: 'ESCROW',
        paidAt: row.createdAt.toISOString(),
        reasonAr: 'رصيد معلّق أو مجمّد لدى المتجر',
        reasonEn: 'Pending or frozen store balance',
      })),
      hasMore,
      hasMore && last ? encodeCursor(last.createdAt, last.id) : undefined,
    );
  }

  if (metricId === 'pendingWithdrawals' || metricId === 'completedWithdrawals') {
    const decoded = decodeCursor(cursor);
    const where: Prisma.WithdrawalRequestWhereInput = metricId === 'pendingWithdrawals'
      ? { status: 'PENDING' }
      : {
          status: { in: ['TRANSFERRED', 'COMPLETED'] },
          ...(dateFilter ? { updatedAt: dateFilter } : {}),
        };
    const rows = await prisma.withdrawalRequest.findMany({
      where: {
        AND: [
          where,
          decoded
            ? { OR: [{ createdAt: { lt: decoded.sortAt } }, { createdAt: decoded.sortAt, id: { lt: decoded.id } }] }
            : {},
        ],
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: limit + 1,
      select: {
        id: true,
        amount: true,
        status: true,
        createdAt: true,
        user: { select: { name: true } },
        store: { select: { name: true } },
      },
    });
    const agg = await prisma.withdrawalRequest.aggregate({ where, _sum: { amount: true } });
    const hasMore = rows.length > limit;
    const page = hasMore ? rows.slice(0, limit) : rows;
    const last = page[page.length - 1];
    return packLines(
      metricId,
      roundMoney(Number(agg._sum.amount || 0)),
      metricId === 'pendingWithdrawals'
        ? 'طلبات السحب التي ما زالت قيد الانتظار. المبلغ لم يخرج بعد، وينقص من الرصيد المتاح لا من عمولة المنصة.'
        : 'السحوبات المكتملة داخل النافذة. الصافي وصل لحساب صاحبه بعد خصم الالتزامات إن وُجدت.',
      metricId === 'pendingWithdrawals'
        ? 'Withdrawal requests still waiting. The amount has not left yet, and it reduces available balance rather than platform commission.'
        : 'Completed withdrawals inside the window. The net reached the owner’s account after any liabilities were settled.',
      page.map((row) => ({
        id: row.id,
        customerName: row.user?.name || undefined,
        storeName: row.store?.name || undefined,
        amount: roundMoney(Number(row.amount)),
        status: row.status,
        paidAt: row.createdAt.toISOString(),
        reasonAr: metricId === 'pendingWithdrawals' ? 'طلب سحب لم يكتمل' : 'سحب اكتمل وخرج من المحفظة',
        reasonEn: metricId === 'pendingWithdrawals' ? 'Withdrawal still pending' : 'Withdrawal completed and left the wallet',
      })),
      hasMore,
      hasMore && last ? encodeCursor(last.createdAt, last.id) : undefined,
    );
  }

  if (metricId === 'pendingLiabilities' || metricId === 'gatewayFees' || metricId === 'netPlatformRevenue' || metricId === 'loyaltyReferralExpenses') {
    const salesWhere = buildGrossSalesPaymentWhere(range);
    const [customerAgg, storeAgg, gateway, adjudication, loyaltyAgg, referralAgg, commission, refundsAgg, wallet] = await Promise.all([
      prisma.user.aggregate({ _sum: { customerBalance: true } }),
      prisma.store.aggregate({ _sum: { balance: true } }),
      sumPayments(prisma, salesWhere, 'gatewayFee'),
      prisma.walletTransaction.aggregate({
        where: { role: 'ADMIN', type: 'CREDIT', transactionType: 'PLATFORM_FEE_RETENTION', ...walletDate },
        _sum: { amount: true },
      }),
      prisma.walletTransaction.aggregate({
        where: { role: 'CUSTOMER', type: 'CREDIT', transactionType: 'ORDER_PROFIT', ...walletDate },
        _sum: { amount: true },
      }),
      prisma.walletTransaction.aggregate({
        where: { type: 'CREDIT', transactionType: 'REFERRAL_PROFIT', ...walletDate },
        _sum: { amount: true },
      }),
      sumPayments(prisma, salesWhere, 'commission'),
      prisma.paymentTransaction.aggregate({
        where: { refundedAmount: { gt: 0 }, ...refundRecognizedWhere(range) },
        _sum: { commission: true },
      }),
      prisma.platformWallet.findFirst(),
    ]);
    const customers = roundMoney(Number(customerAgg._sum.customerBalance || 0));
    const stores = roundMoney(Number(storeAgg._sum.balance || 0));
    const adjudicationFees = roundMoney(Number(adjudication._sum.amount || 0));
    const loyalty = roundMoney(Number(loyaltyAgg._sum.amount || 0));
    const referral = roundMoney(Number(referralAgg._sum.amount || 0));
    const commissionRefunds = roundMoney(Number(refundsAgg._sum.commission || 0));
    const shippingLiability = roundMoney(Number(wallet?.shippingCompanyLiabilityBalance || 0));

    if (metricId === 'pendingLiabilities') {
      return packLines(metricId, roundMoney(customers + stores + gateway + shippingLiability),
        'أرصدة العملاء + أرصدة المتاجر المتاحة + رسوم البوابة على المبيعات الناجحة + التزام شركة الشحن.',
        'Customer balances + available store balances + gateway fees on successful sales + the carrier liability.',
        [], false, undefined, {
          sources: [
            { metricId: 'pendingLiabilities', labelAr: 'أرصدة العملاء', labelEn: 'Customer balances', amount: customers, sign: 'plus' },
            { metricId: 'pendingLiabilities', labelAr: 'أرصدة المتاجر', labelEn: 'Store balances', amount: stores, sign: 'plus' },
            { metricId: 'paymentGatewayFees', labelAr: 'رسوم البوابة', labelEn: 'Gateway fees', amount: gateway, sign: 'plus' },
            { metricId: 'shippingCollected', labelAr: 'التزام شركة الشحن', labelEn: 'Carrier liability', amount: shippingLiability, sign: 'plus' },
          ],
        });
    }
    if (metricId === 'gatewayFees') {
      return packLines(metricId, roundMoney(gateway + adjudicationFees),
        'رسوم البوابة المخزّنة على الدفعات الناجحة، مضافًا إليها رسوم الحكم المحتجزة. لا تُخصم مرتين من صافي العمولة.',
        'Stored gateway fees on successful payments, plus retained adjudication fees. They are not deducted twice from net commission.',
        [], false, undefined, {
          sources: [
            { metricId: 'paymentGatewayFees', labelAr: 'رسوم بوابة الدفع', labelEn: 'Payment gateway fees', amount: gateway, sign: 'plus' },
            { metricId: 'gatewayFees', labelAr: 'رسوم الحكم المحتجزة', labelEn: 'Retained adjudication fees', amount: adjudicationFees, sign: 'plus' },
          ],
        });
    }
    if (metricId === 'loyaltyReferralExpenses') {
      const page = await pageWalletCredits(
        prisma,
        { type: 'CREDIT', transactionType: { in: ['ORDER_PROFIT', 'REFERRAL_PROFIT'] }, ...walletDate },
        cursor, limit, 'مصروف ولاء أو إحالة', 'Loyalty or referral expense',
      );
      return packLines(metricId, roundMoney(loyalty + referral),
        'كاش باك الولاء المدفوع للعملاء مضافًا إليه أرباح الإحالة.',
        'Loyalty cashback paid to customers plus referral payouts.',
        page.lines, page.hasMore, page.nextCursor, {
          sources: [
            { metricId: 'loyaltyCashback', labelAr: 'كاش باك الولاء', labelEn: 'Loyalty cashback', amount: loyalty, sign: 'plus' },
            { metricId: 'referralPaidOut', labelAr: 'أرباح الإحالة', labelEn: 'Referral payouts', amount: referral, sign: 'plus' },
          ],
        });
    }
    return packLines(metricId, roundMoney(commission - loyalty - referral - commissionRefunds - gateway),
      'عمولة المبيعات الناجحة ناقص الولاء والإحالة والعمولة المستردة ورسوم البوابة.',
      'Commission on successful sales minus loyalty, referrals, refunded commission, and gateway fees.',
      [], false, undefined, {
        notStripeCash: true,
        sources: [
          { metricId: 'grossCommission', labelAr: 'عمولة المبيعات', labelEn: 'Sales commission', amount: commission, sign: 'plus' },
          { metricId: 'loyaltyReferralExpenses', labelAr: 'الولاء والإحالة', labelEn: 'Loyalty and referrals', amount: roundMoney(loyalty + referral), sign: 'minus' },
          { metricId: 'commissionRefunds', labelAr: 'عمولة مستردة', labelEn: 'Refunded commission', amount: commissionRefunds, sign: 'minus' },
          { metricId: 'paymentGatewayFees', labelAr: 'رسوم البوابة', labelEn: 'Gateway fees', amount: gateway, sign: 'minus' },
        ],
      });
  }

  if (metricId === 'commissionRefunds') {
    const where: Prisma.PaymentTransactionWhereInput = { refundedAmount: { gt: 0 }, ...refundRecognizedWhere(range) };
    const [total, page] = await Promise.all([
      sumPayments(prisma, where, 'commission'),
      pagePayments(prisma, where, cursor, limit, (row) => Number(row.commission), () => ({ ar: 'عمولة خرجت مع الاسترداد', en: 'Commission reversed with the refund' })),
    ]);
    return packLines(metricId, total, 'مجموع عمولة الدفعات التي لها مبلغ مسترد، بتاريخ الاسترداد.', 'Sum of commission on payments that have a refunded amount, dated by the refund.', page.lines, page.hasMore, page.nextCursor);
  }

  if (metricId === 'shippingCollected') {
    const where: Prisma.PaymentTransactionWhereInput = {
      status: 'SUCCESS',
      shippingCost: { gt: 0 },
      order: { status: { not: 'CANCELLED' } },
      ...(dateFilter ? { OR: [{ paidAt: dateFilter }, { paidAt: null, createdAt: dateFilter }] } : {}),
    };
    const [outbound, carrier, page] = await Promise.all([
      prisma.paymentTransaction.aggregate({ where, _sum: { shippingCost: true } }),
      (prisma as any).shippingCompanyObligation.aggregate({
        where: dateFilter ? { createdAt: dateFilter } : {},
        _sum: { shippingAmount: true },
      }).catch(() => ({ _sum: { shippingAmount: 0 } })),
      pagePayments(prisma, where, cursor, limit, (row) => Number(row.shippingCost || 0), () => ({ ar: 'شحن طلب ناجح مستحق لشركة الشحن', en: 'Outbound shipping owed to the carrier' })),
    ]);
    const outboundSum = roundMoney(Number(outbound._sum.shippingCost || 0));
    const carrierSum = roundMoney(Number(carrier?._sum?.shippingAmount || 0));
    return packLines(metricId, roundMoney(outboundSum + carrierSum),
      'شحن الطلبات الناجحة مضافًا إليه شحن الذهاب والعودة المسجّل على التزام شركة الشحن. هذا ليس ربح المنصة.',
      'Shipping on successful orders plus round-trip shipping recorded on the carrier liability. This is not platform profit.',
      page.lines, page.hasMore, page.nextCursor, {
        sources: [
          { metricId: 'shippingCollected', labelAr: 'شحن الطلبات', labelEn: 'Order shipping', amount: outboundSum, sign: 'plus' },
          { metricId: 'shippingCollected', labelAr: 'شحن الذهاب والعودة', labelEn: 'Round-trip shipping', amount: carrierSum, sign: 'plus' },
        ],
      });
  }

  if (metricId === 'referralPaidOut' || metricId === 'loyaltyCashback' || metricId === 'totalPenalties') {
    const where: Prisma.WalletTransactionWhereInput = metricId === 'loyaltyCashback'
      ? { role: 'CUSTOMER', type: 'CREDIT', transactionType: 'ORDER_PROFIT', ...walletDate }
      : metricId === 'referralPaidOut'
        ? { type: 'CREDIT', transactionType: 'REFERRAL_PROFIT', ...walletDate }
        : { transactionType: { equals: 'penalty', mode: 'insensitive' }, ...walletDate };
    const [agg, page] = await Promise.all([
      prisma.walletTransaction.aggregate({ where, _sum: { amount: true } }),
      pageWalletCredits(prisma, where, cursor, limit,
        metricId === 'totalPenalties' ? 'غرامة محصّلة' : 'حركة محفظة داخلة في الرقم',
        metricId === 'totalPenalties' ? 'Collected penalty' : 'Wallet movement included in the figure'),
    ]);
    const formulas = {
      referralPaidOut: ['أرباح الإحالة التي دُفعت من المنصة داخل النافذة.', 'Referral payouts the platform paid inside the window.'],
      loyaltyCashback: ['كاش باك الولاء المضاف لمحافظ العملاء داخل النافذة.', 'Loyalty cashback credited to customer wallets inside the window.'],
      totalPenalties: ['الغرامات المسجّلة في دفتر المحفظة داخل النافذة.', 'Penalties recorded on the wallet ledger inside the window.'],
    } as const;
    return packLines(metricId, roundMoney(Number(agg._sum.amount || 0)), formulas[metricId][0], formulas[metricId][1], page.lines, page.hasMore, page.nextCursor);
  }

  if (metricId === 'totalReleasedToMerchants') {
    const [released, clawback, page] = await Promise.all([
      prisma.escrowTransaction.aggregate({
        where: { status: 'RELEASED', ...(dateFilter ? { releasedAt: dateFilter } : {}) },
        _sum: { merchantAmount: true },
      }),
      prisma.walletTransaction.aggregate({
        where: { role: 'VENDOR', type: 'DEBIT', transactionType: { in: ['REFUND', 'refund'] }, metadata: { path: ['clawback'], equals: true }, ...walletDate },
        _sum: { amount: true },
      }),
      prisma.escrowTransaction.findMany({
        where: {
          status: 'RELEASED',
          ...(dateFilter ? { releasedAt: dateFilter } : {}),
        },
        orderBy: [{ releasedAt: 'desc' }],
        take: limit + 1,
        select: { id: true, merchantAmount: true, releasedAt: true, createdAt: true, order: { select: { orderNumber: true } } },
      }),
    ]);
    const releasedSum = roundMoney(Number(released._sum.merchantAmount || 0));
    const clawbackSum = roundMoney(Number(clawback._sum.amount || 0));
    const hasMore = page.length > limit;
    const rows = hasMore ? page.slice(0, limit) : page;
    return packLines(metricId, roundMoney(Math.max(0, releasedSum - clawbackSum)),
      'ما حُرّر من الضمان للمتاجر داخل النافذة، بعد طرح المبالغ المستردة من أرباح مُحرّرة.',
      'Escrow released to stores inside the window, after clawing back released earnings that were refunded.',
      rows.map((row) => ({
        id: row.id,
        orderNumber: row.order?.orderNumber,
        amount: roundMoney(Number(row.merchantAmount)),
        status: 'RELEASED',
        paidAt: (row.releasedAt || row.createdAt).toISOString(),
        reasonAr: 'مبلغ تاجر حُرّر من الضمان',
        reasonEn: 'Merchant amount released from escrow',
      })),
      hasMore,
      undefined,
      { sources: [
        { metricId: 'totalReleasedToMerchants', labelAr: 'المُحرّر من الضمان', labelEn: 'Released from escrow', amount: releasedSum, sign: 'plus' },
        { metricId: 'totalReleasedToMerchants', labelAr: 'مسترد من أرباح مُحرّرة', labelEn: 'Clawed back', amount: clawbackSum, sign: 'minus' },
      ] },
    );
  }

  if (metricId === 'failedUnsettled') {
    const where: Prisma.PaymentTransactionWhereInput = { status: 'FAILED', refundedAmount: { lte: 0 } };
    const [count, amount, page] = await Promise.all([
      prisma.paymentTransaction.count({ where }),
      sumPayments(prisma, where, 'totalAmount'),
      pagePayments(prisma, where, cursor, limit, (row) => Number(row.totalAmount), () => ({ ar: 'دفعة فشلت ولم يُسترد مبلغها', en: 'Payment failed and nothing was refunded' })),
    ]);
    return packLines(metricId, count,
      `عدد الدفعات الفاشلة التي لم يُسترد مبلغها. إجمالي مبالغها ${amount.toFixed(2)} درهم، والرقم على الكارت هو العدد.`,
      `Count of failed payments with nothing refunded. Their amount is ${amount.toFixed(2)} AED. The card shows the count.`,
      page.lines, page.hasMore, page.nextCursor, { unit: 'count' });
  }

  if (metricId === 'financialDisputes') {
    const orderWhere: Prisma.OrderWhereInput = {
      status: { in: ['DISPUTED', 'RETURN_REQUESTED'] },
      ...(dateFilter ? { updatedAt: dateFilter } : {}),
    };
    const [orders, disputes, orderAmount] = await Promise.all([
      prisma.order.findMany({
        where: orderWhere,
        orderBy: [{ updatedAt: 'desc' }],
        take: limit,
        select: { id: true, orderNumber: true, status: true, totalAmount: true, updatedAt: true, customer: { select: { name: true } } },
      }),
      prisma.dispute.count({ where: dateFilter ? { createdAt: dateFilter } : {} }),
      prisma.order.aggregate({ where: orderWhere, _sum: { totalAmount: true }, _count: { id: true } }),
    ]);
    return packLines(metricId, orderAmount._count.id + disputes,
      'طلبات حالتها نزاع أو إرجاع داخل النافذة، مضافًا إليها النزاعات التي فُتحت في النافذة نفسها.',
      'Orders marked disputed or return-requested inside the window, plus disputes opened in that same window.',
      orders.map((row) => ({
        id: row.id,
        orderNumber: row.orderNumber,
        customerName: row.customer?.name || undefined,
        amount: roundMoney(Number(row.totalAmount || 0)),
        status: row.status,
        paidAt: row.updatedAt.toISOString(),
        reasonAr: 'طلب داخل دائرة النزاع أو الإرجاع',
        reasonEn: 'Order in a dispute or return state',
      })),
      false,
      undefined,
      { unit: 'count' },
    );
  }

  if (metricId !== 'dailyTxCount' && metricId !== 'monthlyTxCount' && metricId !== 'activityLoad') {
    throw new BadRequestException('Unknown financial metric');
  }
  const since = metricId === 'monthlyTxCount'
    ? (() => { const d = new Date(); d.setDate(1); d.setHours(0, 0, 0, 0); return d; })()
    : metricId === 'activityLoad'
      ? new Date(Date.now() - 24 * 60 * 60 * 1000)
      : (() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; })();
  const counts = await countLedgersSince(prisma, since);
  const formulas = {
    dailyTxCount: ['عدد حركات الدفع والمحفظة والضمان والسحب منذ بداية اليوم.', 'Payment, wallet, escrow, and withdrawal rows since the start of today.'],
    monthlyTxCount: ['عدد الحركات نفسها منذ بداية الشهر.', 'The same rows since the start of the month.'],
    activityLoad: ['عدد الحركات نفسها خلال آخر 24 ساعة.', 'The same rows during the last 24 hours.'],
  } as const;
  const copy = formulas[metricId];
  return packLines(metricId, counts.total, copy[0], copy[1], [], false, undefined, {
    unit: 'count',
    sources: [
      { metricId, labelAr: 'مدفوعات', labelEn: 'Payments', amount: counts.payments, sign: 'plus' },
      { metricId, labelAr: 'محفظة', labelEn: 'Wallet', amount: counts.wallet, sign: 'plus' },
      { metricId, labelAr: 'ضمان', labelEn: 'Escrow', amount: counts.escrow, sign: 'plus' },
      { metricId, labelAr: 'سحوبات', labelEn: 'Withdrawals', amount: counts.withdrawals, sign: 'plus' },
    ],
  });
}
