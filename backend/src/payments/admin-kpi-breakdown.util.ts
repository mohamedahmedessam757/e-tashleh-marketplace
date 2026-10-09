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
  orderId?: string;
  orderNumber?: string;
  customerId?: string;
  customerName?: string;
  storeId?: string;
  storeName?: string;
  partNames?: string[];
  requestType?: 'single' | 'multiple';
  amount: number;
  status?: string;
  paidAt?: string;
  reasonAr: string;
  reasonEn: string;
  metricId?: string;
  sign?: 'plus' | 'minus';
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

const orderShape = {
  id: true,
  orderNumber: true,
  partName: true,
  requestType: true,
  customerId: true,
  parts: { select: { name: true }, orderBy: { createdAt: 'asc' as const }, take: 20 },
} satisfies Prisma.OrderSelect;

type OrderShape = Prisma.OrderGetPayload<{ select: typeof orderShape }>;

function orderFacts(order: OrderShape | null | undefined): Pick<
  KpiBreakdownLine,
  'orderId' | 'orderNumber' | 'partNames' | 'requestType' | 'customerId'
> {
  if (!order) return {};
  const fromParts = order.parts.map((part) => part.name.trim()).filter(Boolean);
  const partNames = fromParts.length ? fromParts : order.partName?.trim() ? [order.partName.trim()] : [];
  const requestType: 'single' | 'multiple' =
    String(order.requestType || '').toLowerCase() === 'multiple' || partNames.length > 1
      ? 'multiple'
      : 'single';
  return {
    orderId: order.id,
    orderNumber: order.orderNumber,
    partNames,
    requestType,
    customerId: order.customerId,
  };
}

function paidPartFacts(
  order: OrderShape | null | undefined,
  paidPartName?: string | null,
): ReturnType<typeof orderFacts> {
  const facts = orderFacts(order);
  const paid = paidPartName?.trim();
  if (paid) return { ...facts, partNames: [paid] };
  if (facts.requestType === 'multiple') return { ...facts, partNames: [] };
  return facts;
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
  customer: { select: { id: true, name: true } },
  order: { select: orderShape },
  offer: { select: { orderPart: { select: { name: true } }, store: { select: { id: true, name: true } } } },
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

function ledgerCursor(cursor?: string): { kind: 'payment' | 'loyalty' | 'referral'; raw?: string } {
  if (!cursor) return { kind: 'payment' };
  if (cursor.startsWith('loyalty:')) return { kind: 'loyalty', raw: cursor.slice('loyalty:'.length) || undefined };
  if (cursor.startsWith('referral:')) return { kind: 'referral', raw: cursor.slice('referral:'.length) || undefined };
  if (cursor.startsWith('payment:')) return { kind: 'payment', raw: cursor.slice('payment:'.length) || undefined };
  return { kind: 'payment', raw: cursor };
}

function commissionAndFeeLines(row: PaymentRow): KpiBreakdownLine[] {
  const lines: KpiBreakdownLine[] = [];
  const commission = roundMoney(Number(row.commission));
  const fee = roundMoney(Number(row.gatewayFee));
  if (commission !== 0) {
    lines.push({
      ...paymentLine(
        row,
        commission,
        'عمولة القطعة المدفوعة في هذه الدفعة',
        'Commission of the part paid in this payment',
      ),
      id: `${row.id}:commission`,
      sign: 'plus',
      status: 'COMMISSION',
    });
  }
  if (fee !== 0) {
    lines.push({
      ...paymentLine(
        row,
        fee,
        'رسم البوابة المخزّن على نفس الدفعة، ويُطرح من العمولة',
        'Stored gateway fee on the same payment, subtracted from the commission',
      ),
      id: `${row.id}:fee`,
      sign: 'minus',
      status: 'GATEWAY_FEE',
    });
  }
  return lines;
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
    ...paidPartFacts(row.order, row.offer?.orderPart?.name),
    orderNumber: row.order?.orderNumber || row.transactionNumber,
    customerId: row.customer?.id || row.order?.customerId,
    customerName: row.customer?.name || undefined,
    storeId: row.offer?.store?.id,
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
  field: 'totalAmount' | 'refundedAmount' | 'commission' | 'gatewayFee' | 'unitPrice' | 'shippingCost',
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

async function buildNetPlatformPositionBreakdown(
  prisma: PrismaService,
  range: AdminDateRange,
  limit: number,
  netCommission: number,
  customerRefunds: number,
  customerPaid: number,
  merchantShare: number,
): Promise<KpiBreakdownResult> {
  const salesWhere = buildGrossSalesPaymentWhere(range);
  const datedWallet = walletDate(range);
  const walletWindow = datedWallet ? { createdAt: datedWallet } : {};
  const walletSelect = {
    id: true,
    amount: true,
    createdAt: true,
    description: true,
    transactionType: true,
    role: true,
    paymentId: true,
    metadata: true,
    user: { select: { id: true, name: true, role: true, store: { select: { id: true, name: true } } } },
  } satisfies Prisma.WalletTransactionSelect;
  const [payments, loyaltyCredits, loyaltyDebits, referralCredits, merchantFees, carrierRows, shippingAgg, merchantFeeAgg, carrierAgg, loyaltyBackAgg, platformWallet] =
    await Promise.all([
      prisma.paymentTransaction.findMany({
        where: salesWhere,
        select: paymentSelect,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        take: limit + 1,
      }),
      prisma.walletTransaction.findMany({
        where: { role: 'CUSTOMER', type: 'CREDIT', transactionType: 'ORDER_PROFIT', ...walletWindow },
        select: walletSelect,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        take: limit + 1,
      }),
      prisma.walletTransaction.findMany({
        where: { role: 'CUSTOMER', type: 'DEBIT', transactionType: 'ORDER_PROFIT', ...walletWindow },
        select: walletSelect,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        take: limit + 1,
      }),
      prisma.walletTransaction.findMany({
        where: { type: 'CREDIT', transactionType: 'REFERRAL_PROFIT', ...walletWindow },
        select: walletSelect,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        take: limit + 1,
      }),
      prisma.walletTransaction.findMany({
        where: {
          role: 'VENDOR',
          type: 'DEBIT',
          transactionType: { in: ['ADJUDICATION_FEE', 'SHIPPING_FEE', 'PENALTY'] },
          ...walletWindow,
        },
        select: walletSelect,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        take: limit + 1,
      }),
      prisma.walletTransaction.findMany({
        where: { role: 'SHIPPING_COMPANY', type: 'DEBIT', transactionType: 'SHIPPING_COMPANY_SETTLEMENT', ...walletWindow },
        select: walletSelect,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        take: limit + 1,
      }),
      prisma.paymentTransaction.aggregate({ where: salesWhere, _sum: { shippingCost: true } }),
      prisma.walletTransaction.aggregate({
        where: {
          role: 'VENDOR',
          type: 'DEBIT',
          transactionType: { in: ['ADJUDICATION_FEE', 'SHIPPING_FEE', 'PENALTY'] },
          ...walletWindow,
        },
        _sum: { amount: true },
      }),
      prisma.walletTransaction.aggregate({
        where: { role: 'SHIPPING_COMPANY', type: 'DEBIT', transactionType: 'SHIPPING_COMPANY_SETTLEMENT', ...walletWindow },
        _sum: { amount: true },
      }),
      prisma.walletTransaction.aggregate({
        where: { role: 'CUSTOMER', type: 'DEBIT', transactionType: 'ORDER_PROFIT', ...walletWindow },
        _sum: { amount: true },
      }),
      prisma.platformWallet.findFirst(),
    ]);
  const shippingRetained = roundMoney(Number(shippingAgg._sum.shippingCost || 0));
  const merchantFeeIncome = roundMoney(Number(merchantFeeAgg._sum.amount || 0));
  const carrierCollected = roundMoney(Number(carrierAgg._sum.amount || 0));
  const loyaltyReversed = roundMoney(Number(loyaltyBackAgg._sum.amount || 0));
  const total = roundMoney(netCommission + shippingRetained + merchantFeeIncome + carrierCollected + loyaltyReversed);
  const paymentHasMore = payments.length > limit;
  const paymentPage = paymentHasMore ? payments.slice(0, limit) : payments;
  const linkedIds = [...loyaltyCredits, ...loyaltyDebits, ...referralCredits, ...merchantFees, ...carrierRows]
    .map((row) => row.paymentId)
    .filter((id): id is string => !!id);
  const linked = linkedIds.length
    ? await prisma.paymentTransaction.findMany({ where: { id: { in: linkedIds } }, select: paymentSelect })
    : [];
  const paymentById = new Map(linked.map((row) => [row.id, row]));
  const walletLine = (
    row: (typeof merchantFees)[number],
    sign: 'plus' | 'minus',
    reasonAr: string,
    reasonEn: string,
  ): KpiBreakdownLine => {
    const payment = row.paymentId ? paymentById.get(row.paymentId) : undefined;
    return {
      id: row.id,
      paymentId: payment?.id,
      ...(payment ? paidPartFacts(payment.order, payment.offer?.orderPart?.name) : {}),
      orderNumber: payment?.order?.orderNumber || payment?.transactionNumber,
      customerId: row.role === 'CUSTOMER' ? row.user?.id : payment?.customer?.id,
      customerName: row.role === 'CUSTOMER' ? row.user?.name || undefined : payment?.customer?.name || undefined,
      storeId: payment?.offer?.store?.id || row.user?.store?.id,
      storeName: payment?.offer?.store?.name || row.user?.store?.name,
      amount: roundMoney(Number(row.amount)),
      paidAt: row.createdAt.toISOString(),
      status: row.transactionType,
      sign,
      reasonAr: row.description || reasonAr,
      reasonEn: row.description || reasonEn,
    };
  };
  const included: KpiBreakdownLine[] = [
    ...paymentPage.flatMap((row) => {
      const lines = commissionAndFeeLines(row);
      const shipping = roundMoney(Number(row.shippingCost));
      if (shipping > 0) {
        lines.push({
          ...paymentLine(row, shipping, 'شحن هذه القطعة دخل حساب الشحن في المنصة، منفصلًا عن العمولة', 'This part’s shipping entered the platform shipping account, separate from commission'),
          id: `${row.id}:shipping`,
          sign: 'plus',
          status: 'SHIPPING',
        });
      }
      return lines;
    }),
    ...loyaltyCredits.slice(0, limit).map((row) => walletLine(row, 'minus', 'كاش باك ولاء دُفع للعميل', 'Loyalty cashback credited to the customer')),
    ...referralCredits.slice(0, limit).map((row) => walletLine(row, 'minus', 'ربح إحالة دُفع من عمولة المنصة', 'Referral payout paid from platform commission')),
    ...loyaltyDebits.slice(0, limit).map((row) => walletLine(row, 'plus', 'كاش باك رجع إلى المنصة', 'Loyalty cashback returned to the platform')),
    ...merchantFees.slice(0, limit).map((row) => walletLine(row, 'plus', 'رسم محصّل من التاجر لحساب المنصة', 'Fee collected from the merchant into the platform account')),
    ...carrierRows.slice(0, limit).map((row) => walletLine(row, 'plus', 'مبلغ سددته شركة الشحن للمنصة', 'Amount the carrier paid to the platform')),
  ];
  const openCarrier = roundMoney(Number(platformWallet?.shippingCompanyLiabilityBalance || 0));
  return {
    metricId: 'netPlatformPosition',
    total,
    formulaAr: 'صافي العمولة على الدفعات الباقية، زائد شحن تلك الدفعات في حساب مستقل، زائد الرسوم المحصّلة من التاجر وما سددته شركة الشحن، زائد كاش باك الولاء الذي رجع. مبلغ الاسترداد الكامل للعميل لا يُطرح مرة ثانية.',
    formulaEn: 'Net commission on the payments that remain, plus their shipping in a separate account, plus fees collected from the merchant and cash the carrier has paid, plus loyalty cashback that came back. The customer’s full refund is not subtracted again.',
    notStripeCash: true,
    outside: [
      ...OUTSIDE_SALES_FORMULA,
      {
        labelAr: `المرتجعات ${customerRefunds} رجعت للعملاء. عمولتها وشحنها خارج صافي العمولة أصلًا، وسعر القطعة ${merchantShare} من أصل ${customerPaid} للتاجر. طرح مبلغ الاسترداد كاملًا كان يسحب مال التاجر من ربح المنصة.`,
        labelEn: `Refunds of ${customerRefunds} went back to customers. Their commission and shipping are already outside net commission, and the part price ${merchantShare} of ${customerPaid} belongs to the merchant. Subtracting the full refund was taking the merchant’s money out of platform profit.`,
      },
      {
        labelAr: `ما زال على شركة الشحن ${openCarrier} لم يُحصَّل بعد، لذلك ليس داخل هذا الرقم. سحب التاجر يخرج من محفظته ولا يُنقص ربح المنصة.`,
        labelEn: `The carrier still owes ${openCarrier}, so that amount is not inside this figure. A merchant withdrawal leaves their wallet and does not reduce platform profit.`,
      },
    ],
    sources: ([
      { metricId: 'netCommission', labelAr: 'صافي العمولة', labelEn: 'Net commission', amount: netCommission, sign: 'plus' },
      { metricId: 'netPlatformPosition', labelAr: 'شحن الدفعات الباقية', labelEn: 'Shipping on remaining payments', amount: shippingRetained, sign: 'plus' },
      { metricId: 'netPlatformPosition', labelAr: 'رسوم محصّلة من التاجر', labelEn: 'Fees collected from the merchant', amount: merchantFeeIncome, sign: 'plus' },
      { metricId: 'netPlatformPosition', labelAr: 'ما سددته شركة الشحن', labelEn: 'Collected from the carrier', amount: carrierCollected, sign: 'plus' },
      { metricId: 'netPlatformPosition', labelAr: 'ولاء رجع للمنصة', labelEn: 'Loyalty returned to the platform', amount: loyaltyReversed, sign: 'plus' },
    ] as KpiBreakdownSource[]).filter((source) => source.amount !== 0 || source.metricId === 'netCommission'),
    included,
    excluded: [],
    includedHasMore: paymentHasMore || [loyaltyCredits, loyaltyDebits, referralCredits, merchantFees, carrierRows].some((rows) => rows.length > limit),
    excludedHasMore: false,
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
    const ledger = ledgerCursor(includedCursor);
    const walletCursor = (raw?: string): Prisma.WalletTransactionWhereInput => {
      const decoded = decodeCursor(raw);
      if (!decoded) return {};
      return {
        OR: [
          { createdAt: { lt: decoded.sortAt } },
          { createdAt: decoded.sortAt, id: { lt: decoded.id } },
        ],
      };
    };
    const profitWalletSelect = {
      id: true,
      amount: true,
      createdAt: true,
      description: true,
      metadata: true,
      user: { select: { id: true, name: true, role: true, store: { select: { id: true, name: true } } } },
      payment: {
        select: {
          order: { select: orderShape },
          offer: { select: { orderPart: { select: { name: true } }, store: { select: { id: true, name: true } } } },
        },
      },
    } satisfies Prisma.WalletTransactionSelect;
    const includeDeductions = ledger.kind === 'payment' && !ledger.raw;
    const [commission, loyaltyAgg, referralAgg, fees, refunds, customerPaid, merchantShare, shippingHeld, paymentRows, loyaltyRows, referralRows] =
      await Promise.all([
        sumPayments(prisma, salesWhere, 'commission'),
        prisma.walletTransaction.aggregate({ where: loyaltyWhere, _sum: { amount: true } }),
        prisma.walletTransaction.aggregate({ where: referralWhere, _sum: { amount: true } }),
        sumPayments(prisma, salesWhere, 'gatewayFee'),
        sumPayments(prisma, refundWhere, 'refundedAmount'),
        sumPayments(prisma, salesWhere, 'totalAmount'),
        sumPayments(prisma, salesWhere, 'unitPrice'),
        sumPayments(prisma, salesWhere, 'shippingCost'),
        ledger.kind === 'payment'
          ? prisma.paymentTransaction.findMany({
              where: { AND: [salesWhere, cursorWhere(ledger.raw)] },
              select: paymentSelect,
              orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
              take: limit + 1,
            })
          : Promise.resolve([]),
        ledger.kind === 'loyalty' || includeDeductions
          ? prisma.walletTransaction.findMany({
              where: { AND: [loyaltyWhere, walletCursor(ledger.kind === 'loyalty' ? ledger.raw : undefined)] },
              select: profitWalletSelect,
              orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
              take: limit + 1,
            })
          : Promise.resolve([]),
        ledger.kind === 'referral' || includeDeductions
          ? prisma.walletTransaction.findMany({
              where: { AND: [referralWhere, walletCursor(ledger.kind === 'referral' ? ledger.raw : undefined)] },
              select: profitWalletSelect,
              orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
              take: limit + 1,
            })
          : Promise.resolve([]),
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
        metricId: 'loyaltyCashback',
        labelAr: 'كاش باك الولاء',
        labelEn: 'Loyalty cashback',
        amount: loyalty,
        sign: 'minus',
      });
    }
    if (referral !== 0) {
      sources.push({
        metricId: 'referralPaidOut',
        labelAr: 'أرباح الإحالة',
        labelEn: 'Referral payouts',
        amount: referral,
        sign: 'minus',
      });
    }

    if (metricId === 'netPlatformPosition') {
      return buildNetPlatformPositionBreakdown(prisma, range, limit, net, refunds, customerPaid, merchantShare);
    }

    const metaId = (metadata: Prisma.JsonValue | null, key: string): string | undefined => {
      if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) return undefined;
      const value = (metadata as Record<string, unknown>)[key];
      return typeof value === 'string' && /^[0-9a-f-]{36}$/i.test(value) ? value : undefined;
    };
    const walletRows = [...loyaltyRows, ...referralRows];
    const paymentIds = [...new Set(walletRows.map((row) => metaId(row.metadata, 'paymentId')).filter((id): id is string => !!id))];
    const offerIds = [...new Set(walletRows.map((row) => metaId(row.metadata, 'offerId')).filter((id): id is string => !!id))];
    const orderIds = [...new Set(walletRows.map((row) => metaId(row.metadata, 'orderId')).filter((id): id is string => !!id))];
    const [linkedPayments, linkedOffers, linkedOrders] = await Promise.all([
      paymentIds.length
        ? prisma.paymentTransaction.findMany({ where: { id: { in: paymentIds } }, select: paymentSelect })
        : Promise.resolve([]),
      offerIds.length
        ? prisma.offer.findMany({
            where: { id: { in: offerIds } },
            select: {
              id: true,
              orderPart: { select: { name: true } },
              store: { select: { id: true, name: true } },
              order: { select: orderShape },
            },
          })
        : Promise.resolve([]),
      orderIds.length
        ? prisma.order.findMany({ where: { id: { in: orderIds } }, select: orderShape })
        : Promise.resolve([]),
    ]);
    const paymentById = new Map(linkedPayments.map((row) => [row.id, row]));
    const offerById = new Map(linkedOffers.map((row) => [row.id, row]));
    const orderById = new Map(linkedOrders.map((row) => [row.id, row]));
    const paymentPage = paymentRows.slice(0, limit);
    const paymentHasMore = paymentRows.length > limit;
    const loyaltyPage = loyaltyRows.slice(0, limit);
    const loyaltyHasMore = loyaltyRows.length > limit;
    const referralPage = referralRows.slice(0, limit);
    const referralHasMore = referralRows.length > limit;
    const deductionLine = (
      row: (typeof loyaltyRows)[number],
      status: string,
      reasonAr: string,
      reasonEn: string,
    ): KpiBreakdownLine => {
      const linkedPayment = paymentById.get(metaId(row.metadata, 'paymentId') || '');
      const linkedOffer = offerById.get(metaId(row.metadata, 'offerId') || '');
      const linkedOrder = orderById.get(metaId(row.metadata, 'orderId') || '');
      const facts = linkedPayment
        ? paidPartFacts(linkedPayment.order, linkedPayment.offer?.orderPart?.name)
        : linkedOffer
          ? paidPartFacts(linkedOffer.order, linkedOffer.orderPart?.name)
          : linkedOrder
            ? paidPartFacts(linkedOrder, null)
            : paidPartFacts(row.payment?.order, row.payment?.offer?.orderPart?.name);
      return {
        id: row.id,
        paymentId: linkedPayment?.id,
        ...facts,
        orderNumber: facts.orderNumber || linkedPayment?.order?.orderNumber || linkedPayment?.transactionNumber,
        customerId: row.user?.role === 'CUSTOMER' ? row.user.id : facts.customerId || row.payment?.order?.customerId,
        customerName: row.user?.name || linkedPayment?.customer?.name || undefined,
        storeId: linkedPayment?.offer?.store?.id || linkedOffer?.store?.id || row.payment?.offer?.store?.id || row.user?.store?.id,
        storeName: linkedPayment?.offer?.store?.name || linkedOffer?.store?.name || row.payment?.offer?.store?.name || row.user?.store?.name,
        amount: roundMoney(Number(row.amount)),
        paidAt: row.createdAt.toISOString(),
        status,
        sign: 'minus',
        reasonAr: row.description || reasonAr,
        reasonEn: row.description || reasonEn,
      };
    };
    const included: KpiBreakdownLine[] = [];
    if (ledger.kind === 'payment') {
      included.push(...paymentPage.flatMap(commissionAndFeeLines));
      if (!paymentHasMore && includeDeductions) {
        included.push(
          ...loyaltyPage.map((row) =>
            deductionLine(row, 'ORDER_PROFIT', 'كاش باك ولاء دُفع للعميل', 'Loyalty cashback credited to the customer'),
          ),
        );
        if (!loyaltyHasMore) {
          included.push(
            ...referralPage.map((row) =>
              deductionLine(row, 'REFERRAL_PROFIT', 'ربح إحالة دُفع من عمولة المنصة', 'Referral payout paid from platform commission'),
            ),
          );
        }
      }
    } else if (ledger.kind === 'loyalty') {
      included.push(
        ...loyaltyPage.map((row) =>
          deductionLine(row, 'ORDER_PROFIT', 'كاش باك ولاء دُفع للعميل', 'Loyalty cashback credited to the customer'),
        ),
      );
    } else {
      included.push(
        ...referralPage.map((row) =>
          deductionLine(row, 'REFERRAL_PROFIT', 'ربح إحالة دُفع من عمولة المنصة', 'Referral payout paid from platform commission'),
        ),
      );
    }
    const lastPayment = paymentPage[paymentPage.length - 1];
    const lastLoyalty = loyaltyPage[loyaltyPage.length - 1];
    const lastReferral = referralPage[referralPage.length - 1];
    let includedHasMore = false;
    let nextIncludedCursor: string | undefined;
    if (ledger.kind === 'payment' && paymentHasMore && lastPayment) {
      includedHasMore = true;
      nextIncludedCursor = `payment:${encodeCursor(lastPayment.createdAt, lastPayment.id)}`;
    } else if (ledger.kind === 'payment' && paymentHasMore === false && ledger.raw && (loyalty !== 0 || referral !== 0)) {
      includedHasMore = true;
      nextIncludedCursor = loyalty !== 0 ? 'loyalty:' : 'referral:';
    } else if ((includeDeductions || ledger.kind === 'loyalty') && loyaltyHasMore && lastLoyalty) {
      includedHasMore = true;
      nextIncludedCursor = `loyalty:${encodeCursor(lastLoyalty.createdAt, lastLoyalty.id)}`;
    } else if (ledger.kind === 'loyalty' && !loyaltyHasMore && referral !== 0) {
      includedHasMore = true;
      nextIncludedCursor = 'referral:';
    } else if ((includeDeductions || ledger.kind === 'referral') && referralHasMore && lastReferral) {
      includedHasMore = true;
      nextIncludedCursor = `referral:${encodeCursor(lastReferral.createdAt, lastReferral.id)}`;
    }
    const stripeNoteAr = [
      `صافي الربح ${net} هو مجموع الصفوف الموقعة: عمولة القطع ${commission} ناقص رسم البوابة المخزّن ${fees} ناقص كاش باك الولاء ${loyalty}${referral ? ` ناقص الإحالة ${referral}` : ''}.`,
      `العميل دفع ${customerPaid} على نفس الدفعات. منها ${merchantShare} سعر القطعة ويُحوَّل للتاجر، و${shippingHeld} شحن يدخل حساب الشحن في المنصة منفصلًا عن العمولة. هذا الرقم لا يضم الشحن ولا الرسوم المحصّلة من التاجر أو شركة الشحن.`,
      `المرتجعات ${refunds} رجعت للعملاء وخرجت من رصيد Stripe، ولا تُخصم من هذا الرقم. خصمها يظهر في صافي موقف المنصة.`,
      'رسم Stripe الفعلي ورسوم تحويل العملة قد يزيدان عن الرسم المخزّن، والفرق يخرج من رصيد Stripe ولا يُحسب عمولة. الرصيد المتاح أو الوارد في Stripe كاش بعد الاسترداد والتحويل والرسوم، وليس صافي عمولة المنصة.',
    ].join(' ');
    const stripeNoteEn = [
      `Net profit ${net} is the signed rows below: part commission ${commission} minus the stored gateway fee ${fees} minus loyalty cashback ${loyalty}${referral ? ` minus referral payouts ${referral}` : ''}.`,
      `Customers paid ${customerPaid} on those same payments. ${merchantShare} is the part price and is transferred to the merchant, and ${shippingHeld} enters the platform shipping account, separate from commission. This figure does not include that shipping or fees collected from the merchant or the carrier.`,
      `Refunds of ${refunds} went back to customers and left the Stripe balance. They are not subtracted from this figure. That subtraction is the net platform position.`,
      'Stripe’s actual fee and currency-conversion charges can exceed the stored fee. That gap leaves the Stripe balance and is not booked as commission. Stripe available or incoming cash is what remains after refunds, transfers, and fees, not platform net commission.',
    ].join(' ');
    return {
      metricId,
      total: net,
      formulaAr:
        'كل صف موقع يدخل في الرقم: عمولة القطعة تُضاف، ورسم بوابتها وكاش باك الولاء والإحالة تُطرح. المجموع صافي العمولة وليس رصيد Stripe.',
      formulaEn:
        'Every signed row is part of the figure: the part commission is added, and its gateway fee, loyalty cashback, and referral payout are subtracted. The sum is net commission, not the Stripe balance.',
      notStripeCash: true,
      outside: OUTSIDE_SALES_FORMULA,
      stripeNoteAr,
      stripeNoteEn,
      sources,
      included,
      excluded: [],
      includedHasMore,
      excludedHasMore: false,
      nextIncludedCursor,
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
        partName: true,
        requestType: true,
        customerId: true,
        parts: { select: { name: true }, orderBy: { createdAt: 'asc' as const }, take: 20 },
        customer: { select: { id: true, name: true } },
        store: { select: { id: true, name: true } },
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
        ...orderFacts(row),
        customerId: row.customer?.id,
        customerName: row.customer?.name || undefined,
        storeId: row.store?.id || undefined,
        storeName: row.store?.name || undefined,
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
          customerId: row.id,
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
        storeId: row.id,
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
        customer: { select: { id: true, name: true } },
        store: { select: { id: true, name: true } },
        order: { select: orderShape },
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
        customer: { select: { id: true, name: true } },
        store: { select: { id: true, name: true } },
        order: { select: orderShape },
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
      ...orderFacts(row.order),
      orderNumber: row.order?.orderNumber || row.caseReference || undefined,
      customerId: row.customer?.id,
      customerName: row.customer?.name || undefined,
      storeId: row.store?.id || undefined,
      storeName: row.store?.name || undefined,
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
      user: { select: { id: true, name: true, role: true, store: { select: { id: true, name: true } } } },
      payment: { select: { order: { select: orderShape }, offer: { select: { orderPart: { select: { name: true } }, store: { select: { id: true, name: true } } } } } },
    },
  });
  const hasMore = rows.length > limit;
  const page = hasMore ? rows.slice(0, limit) : rows;
  const last = page[page.length - 1];
  return {
    lines: page.map((row) => ({
      id: row.id,
      ...paidPartFacts(row.payment?.order, row.payment?.offer?.orderPart?.name),
      customerId: row.user?.role === 'CUSTOMER' ? row.user.id : row.payment?.order?.customerId,
      customerName: row.user?.role === 'CUSTOMER' ? row.user.name || undefined : undefined,
      storeId: row.payment?.offer?.store?.id || row.user?.store?.id,
      storeName: row.payment?.offer?.store?.name || row.user?.store?.name || (row.user?.role !== 'CUSTOMER' ? row.user?.name || undefined : undefined),
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
        storeId: row.id,
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
        role: true,
        user: { select: { id: true, name: true } },
        store: { select: { id: true, name: true } },
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
        customerId: row.role === 'CUSTOMER' ? row.user?.id || undefined : undefined,
        customerName: row.role === 'CUSTOMER' ? row.user?.name || undefined : undefined,
        storeId: row.store?.id || undefined,
        storeName: row.store?.name || (row.role !== 'CUSTOMER' ? row.user?.name || undefined : undefined),
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
        where: { ...buildGrossSalesPaymentWhere(range), refundedAmount: { gt: 0 } },
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
        select: {
          id: true,
          merchantAmount: true,
          releasedAt: true,
          createdAt: true,
          order: { select: { ...orderShape, customer: { select: { id: true, name: true } }, store: { select: { id: true, name: true } } } },
        },
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
        ...orderFacts(row.order),
        customerId: row.order?.customer?.id,
        customerName: row.order?.customer?.name || undefined,
        storeId: row.order?.store?.id || undefined,
        storeName: row.order?.store?.name || undefined,
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
        select: {
          id: true,
          orderNumber: true,
          status: true,
          totalAmount: true,
          updatedAt: true,
          partName: true,
          requestType: true,
          customerId: true,
          parts: { select: { name: true }, orderBy: { createdAt: 'asc' as const }, take: 20 },
          customer: { select: { id: true, name: true } },
          store: { select: { id: true, name: true } },
        },
      }),
      prisma.dispute.count({ where: dateFilter ? { createdAt: dateFilter } : {} }),
      prisma.order.aggregate({ where: orderWhere, _sum: { totalAmount: true }, _count: { id: true } }),
    ]);
    return packLines(metricId, orderAmount._count.id + disputes,
      'طلبات حالتها نزاع أو إرجاع داخل النافذة، مضافًا إليها النزاعات التي فُتحت في النافذة نفسها.',
      'Orders marked disputed or return-requested inside the window, plus disputes opened in that same window.',
      orders.map((row) => ({
        id: row.id,
        ...orderFacts(row),
        customerId: row.customer?.id,
        customerName: row.customer?.name || undefined,
        storeId: row.store?.id || undefined,
        storeName: row.store?.name || undefined,
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
