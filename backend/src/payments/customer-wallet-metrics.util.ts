import { PrismaService } from '../prisma/prisma.service';

export const CUSTOMER_NET_DEBIT_TYPES = new Set([
  'SHIPPING_FEE',
  'PENALTY',
  'WITHDRAWAL',
]);

export const EXCLUDED_ORDER_STATUSES_FOR_PURCHASES = ['CANCELLED', 'REFUNDED'] as const;

export const CUSTOMER_PENDING_ORDER_STATUSES = [
  'PREPARATION',
  'PREPARED',
  'VERIFICATION',
  'VERIFICATION_SUCCESS',
  'READY_FOR_SHIPPING',
  'SHIPPED',
  'DELIVERED',
  'CORRECTION_PERIOD',
  'CORRECTION_SUBMITTED',
  'DELAYED_PREPARATION',
  'PARTIALLY_DELIVERED',
] as const;

/** Open return/dispute statuses — pending rewards stay visible until verdict. */
export const CUSTOMER_OPEN_RESOLUTION_STATUSES = [
  'RETURN_REQUESTED',
  'DISPUTED',
  'RETURNED',
  'RETURN_APPROVED',
] as const;

export const CUSTOMER_PENDING_REWARD_ORDER_STATUSES = [
  ...CUSTOMER_PENDING_ORDER_STATUSES,
  ...CUSTOMER_OPEN_RESOLUTION_STATUSES,
] as const;

/** Orders that qualify for realized cashback / completion settlement. */
export const CUSTOMER_TERMINAL_REWARD_STATUSES = [
  'COMPLETED',
  'WARRANTY_ACTIVE',
  'WARRANTY_EXPIRED',
] as const;

export const REFERRAL_WINDOW_DAYS = 180;
export const REFERRAL_RATE = 0.01;

export const CUSTOMER_TIER_CASHBACK: Record<string, number> = {
  BASIC: 0.02,
  SILVER: 0.03,
  GOLD: 0.04,
  VIP: 0.05,
  PARTNER: 0.06,
};

export interface CustomerLedgerTx {
  amount: number | string | { toString(): string };
  type: string;
  transactionType: string | null;
}

export interface RewardSplitAggregates {
  lifetimeLoyalty: number;
  lifetimeReferral: number;
  monthlyLoyalty: number;
  monthlyReferral: number;
}

/** Net rewards: loyalty + referral credits minus wallet debits. */
export function computeLedgerNetRewards(txs: CustomerLedgerTx[]): number {
  let net = 0;
  for (const tx of txs) {
    const amount = Number(tx.amount);
    const txType = String(tx.transactionType || '').toUpperCase();
    if (tx.type === 'CREDIT' && (txType === 'ORDER_PROFIT' || txType === 'REFERRAL_PROFIT')) {
      net += amount;
    } else if (tx.type === 'DEBIT' && (txType === 'ORDER_PROFIT' || txType === 'REFERRAL_PROFIT')) {
      net -= amount;
    } else if (tx.type === 'DEBIT' && CUSTOMER_NET_DEBIT_TYPES.has(txType)) {
      net -= amount;
    }
  }
  return Number(net.toFixed(2));
}

/** Gross purchases = SUM(totalAmount) for SUCCESS payments on non-cancelled/refunded orders. */
export async function computeCustomerTotalPurchases(
  prisma: PrismaService,
  customerId: string,
): Promise<number> {
  const agg = await prisma.paymentTransaction.aggregate({
    where: {
      customerId,
      status: 'SUCCESS',
      order: { status: { notIn: [...EXCLUDED_ORDER_STATUSES_FOR_PURCHASES] } },
    },
    _sum: { totalAmount: true },
  });
  return Number(agg._sum.totalAmount || 0);
}

export async function computeCustomerCompletedOrdersCount(
  prisma: PrismaService,
  customerId: string,
): Promise<number> {
  return prisma.order.count({
    where: { customerId, status: 'COMPLETED' },
  });
}

/** Includes partial refunds on SUCCESS payments plus full REFUNDED rows. */
export async function computeRefundedAmount(
  prisma: PrismaService,
  customerId: string,
): Promise<number> {
  const [partial, full] = await Promise.all([
    prisma.paymentTransaction.aggregate({
      where: {
        customerId,
        status: 'SUCCESS',
        refundedAmount: { gt: 0 },
      },
      _sum: { refundedAmount: true },
    }),
    prisma.paymentTransaction.aggregate({
      where: { customerId, status: 'REFUNDED' },
      _sum: { refundedAmount: true },
    }),
  ]);
  return Number(partial._sum.refundedAmount || 0) + Number(full._sum.refundedAmount || 0);
}

export function splitRewardAggregates(
  txs: Array<{
    amount: unknown;
    type: string;
    transactionType: string | null;
    createdAt: Date;
  }>,
  startOfMonth: Date,
): RewardSplitAggregates {
  const result: RewardSplitAggregates = {
    lifetimeLoyalty: 0,
    lifetimeReferral: 0,
    monthlyLoyalty: 0,
    monthlyReferral: 0,
  };

  for (const tx of txs) {
    const amount = Number(tx.amount);
    const txType = String(tx.transactionType || '').toUpperCase();
    const sign = tx.type === 'CREDIT' ? 1 : tx.type === 'DEBIT' ? -1 : 0;
    if (!sign) continue;

    const isMonthly = tx.createdAt >= startOfMonth;
    if (txType === 'ORDER_PROFIT') {
      result.lifetimeLoyalty += amount * sign;
      if (isMonthly) result.monthlyLoyalty += amount * sign;
    } else if (txType === 'REFERRAL_PROFIT') {
      result.lifetimeReferral += amount * sign;
      if (isMonthly) result.monthlyReferral += amount * sign;
    }
  }

  for (const key of Object.keys(result) as (keyof RewardSplitAggregates)[]) {
    result[key] = Number(result[key].toFixed(2));
  }
  return result;
}

/** Legacy rows: referralStartsAt null falls back to user createdAt. */
export function buildActiveReferralWindowFilter(windowCutoff: Date) {
  return {
    OR: [
      { referralStartsAt: { gte: windowCutoff } },
      { referralStartsAt: null, createdAt: { gte: windowCutoff } },
    ],
  };
}

export function computePendingLoyaltyFromOrders(
  pendingOrders: Array<{ id?: string; payments: Array<{ commission?: unknown }> }>,
  tierCashbackRate: number,
  excludeOrderIds?: Set<string>,
): number {
  return Number(
    pendingOrders
      .filter((order) => !order.id || !excludeOrderIds?.has(order.id))
      .reduce((sum, order) => {
        const commission = order.payments.reduce(
          (cSum, p) => cSum + Number(p.commission || 0),
          0,
        );
        const raw = commission * tierCashbackRate;
        const MIN_ORDER_REWARD = 2.0;
        const MAX_ORDER_REWARD = 150.0;
        const earned = Math.max(MIN_ORDER_REWARD, Math.min(MAX_ORDER_REWARD, raw));
        return sum + (commission > 0 ? earned : 0);
      }, 0)
      .toFixed(2),
  );
}

/** Same grant rule as LoyaltyService: 1 AED platform commission = 1 loyalty point. */
export function computePendingLoyaltyPointsFromOrders(
  pendingOrders: Array<{ id?: string; payments: Array<{ commission?: unknown }> }>,
  excludeOrderIds?: Set<string>,
): number {
  return pendingOrders
    .filter((order) => !order.id || !excludeOrderIds?.has(order.id))
    .reduce((sum, order) => {
      const commission = order.payments.reduce(
        (cSum, p) => cSum + Number(p.commission || 0),
        0,
      );
      return sum + (commission > 0 ? Math.floor(commission) : 0);
    }, 0);
}

export function computePendingReferralFromOrders(
  pendingOrders: Array<{ payments: Array<{ commission?: unknown }> }>,
): number {
  return Number(
    pendingOrders
      .reduce((sum, order) => {
        const totalCommission = order.payments.reduce(
          (s, p) => s + Number(p.commission || 0),
          0,
        );
        return sum + (totalCommission > 0 ? totalCommission * REFERRAL_RATE : 0);
      }, 0)
      .toFixed(2),
  );
}

export function extractOrderProfitOrderIds(
  txs: Array<{ transactionType?: string | null; metadata?: unknown }>,
): Set<string> {
  const ids = new Set<string>();
  for (const tx of txs) {
    if (tx.transactionType !== 'ORDER_PROFIT' && tx.transactionType !== 'REFERRAL_PROFIT') continue;
    const orderId = (tx.metadata as { orderId?: string } | null)?.orderId;
    if (typeof orderId === 'string' && orderId.length > 0) ids.add(orderId);
  }
  return ids;
}

/** Cashback credited before order reached a terminal completion status. Net of reversals. */
export function sumPrematureOrderProfit(
  txs: Array<{
    amount: unknown;
    type?: string | null;
    transactionType?: string | null;
    metadata?: unknown;
  }>,
  nonTerminalOrderIds: Set<string>,
): number {
  const raw = txs
    .filter((tx) => {
      if (tx.transactionType !== 'ORDER_PROFIT') return false;
      const orderId = (tx.metadata as { orderId?: string } | null)?.orderId;
      return !!orderId && nonTerminalOrderIds.has(orderId);
    })
    .reduce((sum, tx) => {
      const amount = Number(tx.amount || 0);
      const sign = String(tx.type || 'CREDIT').toUpperCase() === 'DEBIT' ? -1 : 1;
      return sum + amount * sign;
    }, 0);
  return Number(Math.max(0, raw).toFixed(2));
}

export function sumPrematureReferralProfit(
  txs: Array<{
    amount: unknown;
    type?: string | null;
    transactionType?: string | null;
    metadata?: unknown;
  }>,
  nonTerminalOrderIds: Set<string>,
): number {
  const raw = txs
    .filter((tx) => {
      if (tx.transactionType !== 'REFERRAL_PROFIT') return false;
      const orderId = (tx.metadata as { orderId?: string } | null)?.orderId;
      return !!orderId && nonTerminalOrderIds.has(orderId);
    })
    .reduce((sum, tx) => {
      const amount = Number(tx.amount || 0);
      const sign = String(tx.type || 'CREDIT').toUpperCase() === 'DEBIT' ? -1 : 1;
      return sum + amount * sign;
    }, 0);
  return Number(Math.max(0, raw).toFixed(2));
}

export function sumPrematureLoyaltyPoints(
  txs: Array<{
    type?: string | null;
    transactionType?: string | null;
    metadata?: unknown;
  }>,
  nonTerminalOrderIds: Set<string>,
): number {
  const raw = txs
    .filter((tx) => {
      if (tx.transactionType !== 'ORDER_PROFIT') return false;
      const meta = (tx.metadata || {}) as {
        orderId?: string;
        commission?: unknown;
        pointsReversed?: unknown;
      };
      return !!meta.orderId && nonTerminalOrderIds.has(meta.orderId);
    })
    .reduce((sum, tx) => {
      const meta = (tx.metadata || {}) as {
        commission?: unknown;
        pointsReversed?: unknown;
      };
      const pts =
        String(tx.type || '').toUpperCase() === 'DEBIT'
          ? Number(meta.pointsReversed || 0) || Math.floor(Number(meta.commission || 0))
          : Math.floor(Number(meta.commission || 0));
      const sign = String(tx.type || 'CREDIT').toUpperCase() === 'DEBIT' ? -1 : 1;
      return sum + pts * sign;
    }, 0);
  return Math.max(0, Math.floor(raw));
}

export function computeCustomerAvailableBalance(
  customerBalance: number,
  prematureCashbackHeld: number,
): number {
  return Number(Math.max(0, customerBalance - prematureCashbackHeld).toFixed(2));
}

/** Backfill users.total_spent from payment aggregates when drift detected. */
export async function reconcileUserTotalSpent(
  prisma: PrismaService,
  userId: string,
  purchasesFromPayments: number,
  currentTotalSpent: number,
): Promise<number> {
  if (
    purchasesFromPayments > 0 &&
    Math.abs(currentTotalSpent - purchasesFromPayments) > 0.01
  ) {
    await prisma.user
      .update({
        where: { id: userId },
        data: { totalSpent: purchasesFromPayments },
      })
      .catch(() => undefined);
    return purchasesFromPayments;
  }
  return currentTotalSpent;
}
