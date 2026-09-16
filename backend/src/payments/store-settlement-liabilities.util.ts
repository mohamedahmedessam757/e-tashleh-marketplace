/**
 * Pending store liabilities settled from withdrawal proceeds before Stripe Transfer (SCT).
 * Reuses adjudication PENDING fee / shipping statuses + cancel gateway fee wallet rows.
 */

import { BadRequestException } from '@nestjs/common';

export type StoreLiabilityLineKind =
  | 'ADJUDICATION_FEE'
  | 'SHIPPING_FEE'
  | 'GATEWAY_CANCEL_FEE';

export interface StoreLiabilityLine {
  source: 'return' | 'dispute' | 'wallet';
  sourceId: string;
  kind: StoreLiabilityLineKind;
  amount: number;
  createdAt: Date;
  /** Already decremented from store.balance — do not subtract again from withdrawable. */
  postedToBalance?: boolean;
  offerId?: string | null;
  orderId?: string | null;
  settlementStatus?: 'OPEN' | 'SETTLED';
  descriptionAr?: string;
  descriptionEn?: string;
}

export interface StorePendingLiabilities {
  total: number;
  lines: StoreLiabilityLine[];
}

function money2(n: unknown): number {
  const v = Number(n);
  if (!Number.isFinite(v) || v <= 0) return 0;
  return Math.round((v + Number.EPSILON) * 100) / 100;
}

type FeeCaseRow = {
  id: string;
  createdAt: Date;
  adjudicationFeeAmount: unknown;
  adjudicationFeePaymentStatus: string | null;
  adjudicationFeePayee: string | null;
  shippingRoundtrip: unknown;
  shippingCompanyLiability: unknown;
  shippingPaymentStatus: string | null;
  shippingPayee: string | null;
  orderId?: string | null;
};

function collectLinesFromCase(
  source: 'return' | 'dispute',
  row: FeeCaseRow,
): StoreLiabilityLine[] {
  const lines: StoreLiabilityLine[] = [];
  const feeStatus = String(row.adjudicationFeePaymentStatus || '').toUpperCase();
  const feePayee = String(row.adjudicationFeePayee || '').toUpperCase();
  if (feeStatus === 'PENDING' && ['MERCHANT', 'STORE', 'VENDOR'].includes(feePayee)) {
    const amount = money2(row.adjudicationFeeAmount);
    if (amount > 0) {
      lines.push({
        source,
        sourceId: row.id,
        kind: 'ADJUDICATION_FEE',
        amount,
        createdAt: row.createdAt,
        orderId: row.orderId || null,
        settlementStatus: 'OPEN',
        descriptionAr: 'رسوم حكم مستحقة',
        descriptionEn: 'Pending adjudication fee',
      });
    }
  }

  const shipStatus = String(row.shippingPaymentStatus || '').toUpperCase();
  const shipPayee = String(row.shippingPayee || '').toUpperCase();
  if (
    ['PENDING', 'INSUFFICIENT_FUNDS', 'WITHHELD_PENDING'].includes(shipStatus) &&
    ['MERCHANT', 'STORE', 'VENDOR'].includes(shipPayee)
  ) {
    const amount = money2(row.shippingRoundtrip) || money2(row.shippingCompanyLiability);
    if (amount > 0) {
      lines.push({
        source,
        sourceId: row.id,
        kind: 'SHIPPING_FEE',
        amount,
        createdAt: row.createdAt,
        orderId: row.orderId || null,
        settlementStatus: 'OPEN',
        descriptionAr: 'رسوم شحن مستحقة',
        descriptionEn: 'Pending shipping fee',
      });
    }
  }

  return lines;
}

/** Pure aggregator for unit tests / callers that already loaded cases. */
export function aggregateStorePendingLiabilities(input: {
  returns: FeeCaseRow[];
  disputes: FeeCaseRow[];
  gatewayFees?: StoreLiabilityLine[];
}): StorePendingLiabilities {
  const lines = [
    ...input.returns.flatMap((r) => collectLinesFromCase('return', r)),
    ...input.disputes.flatMap((d) => collectLinesFromCase('dispute', d)),
    ...(input.gatewayFees || []),
  ].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

  // Withdrawal settlement total: only amounts NOT already taken from store.balance
  const total = money2(
    lines
      .filter((l) => !l.postedToBalance && l.settlementStatus !== 'SETTLED')
      .reduce((s, l) => s + l.amount, 0),
  );
  return { total, lines };
}

export type LiabilitySettleDb = {
  returnRequest: {
    findMany: (args: any) => Promise<FeeCaseRow[]>;
    update: (args: any) => Promise<unknown>;
  };
  dispute: {
    findMany: (args: any) => Promise<FeeCaseRow[]>;
    update: (args: any) => Promise<unknown>;
  };
  walletTransaction?: {
    findMany: (args: any) => Promise<any[]>;
    update?: (args: any) => Promise<unknown>;
  };
  store?: {
    findUnique: (args: any) => Promise<{ id: string; ownerId: string | null } | null>;
  };
};

function metaOf(tx: any): Record<string, unknown> {
  const m = tx?.metadata;
  if (m && typeof m === 'object' && !Array.isArray(m)) return m as Record<string, unknown>;
  return {};
}

function mapGatewayFeeWalletRows(rows: any[]): StoreLiabilityLine[] {
  const out: StoreLiabilityLine[] = [];
  for (const tx of rows) {
    const meta = metaOf(tx);
    if (String(meta.kind || '') !== 'CANCEL_MERCHANT_GATEWAY_FEE') continue;
    const settlementStatus: 'OPEN' | 'SETTLED' =
      String(meta.settlementStatus || '').toUpperCase() === 'SETTLED' ? 'SETTLED' : 'OPEN';
    const amount = money2(tx.amount);
    if (amount <= 0) continue;
    out.push({
      source: 'wallet',
      sourceId: String(tx.id),
      kind: 'GATEWAY_CANCEL_FEE',
      amount,
      createdAt: new Date(tx.createdAt),
      postedToBalance: meta.postedToBalance !== false,
      offerId: (meta.offerId as string) || null,
      orderId: (meta.orderId as string) || null,
      settlementStatus,
      descriptionAr: 'رسوم بوابة دفع — إلغاء بخطأ التاجر',
      descriptionEn: 'Gateway fee — merchant-fault cancellation',
    });
  }
  return out;
}

export async function loadStorePendingLiabilities(
  db: LiabilitySettleDb | any,
  storeId: string,
): Promise<StorePendingLiabilities> {
  const select = {
    id: true,
    createdAt: true,
    adjudicationFeeAmount: true,
    adjudicationFeePaymentStatus: true,
    adjudicationFeePayee: true,
    shippingRoundtrip: true,
    shippingCompanyLiability: true,
    shippingPaymentStatus: true,
    shippingPayee: true,
    orderId: true,
  };

  const returnDelegate = db.returnRequest ?? db.return;
  if (!returnDelegate?.findMany || !db.dispute?.findMany) {
    return { total: 0, lines: [] };
  }

  const [returns, disputes] = await Promise.all([
    returnDelegate.findMany({
      where: {
        storeId,
        OR: [
          { adjudicationFeePaymentStatus: 'PENDING' },
          { shippingPaymentStatus: { in: ['PENDING', 'INSUFFICIENT_FUNDS', 'WITHHELD_PENDING'] } },
        ],
      },
      select,
      orderBy: { createdAt: 'asc' },
    }),
    db.dispute.findMany({
      where: {
        storeId,
        OR: [
          { adjudicationFeePaymentStatus: 'PENDING' },
          { shippingPaymentStatus: { in: ['PENDING', 'INSUFFICIENT_FUNDS', 'WITHHELD_PENDING'] } },
        ],
      },
      select,
      orderBy: { createdAt: 'asc' },
    }),
  ]);

  // Gateway cancel fees already posted to balance must NOT inflate withdrawal withholding.
  // Still load OPEN unposted rows if any exist (defensive).
  let gatewayFees: StoreLiabilityLine[] = [];
  if (db.store?.findUnique && db.walletTransaction?.findMany) {
    const store = await db.store.findUnique({
      where: { id: storeId },
      select: { id: true, ownerId: true },
    });
    if (store?.ownerId) {
      const feeRows = await db.walletTransaction.findMany({
        where: {
          userId: store.ownerId,
          role: 'VENDOR',
          type: 'DEBIT',
          transactionType: { in: ['PENALTY', 'penalty'] },
        },
        select: {
          id: true,
          amount: true,
          createdAt: true,
          metadata: true,
        },
        orderBy: { createdAt: 'asc' },
        take: 500,
      });
      gatewayFees = mapGatewayFeeWalletRows(feeRows).filter(
        (l) => l.settlementStatus === 'OPEN' && !l.postedToBalance,
      );
    }
  }

  return aggregateStorePendingLiabilities({ returns, disputes, gatewayFees });
}

export interface MerchantObligationLine {
  id: string;
  kind: StoreLiabilityLineKind;
  amount: number;
  signedAmount: number;
  status: 'OPEN' | 'SETTLED';
  createdAt: string;
  orderId?: string | null;
  offerId?: string | null;
  source: 'return' | 'dispute' | 'wallet';
  /** Underlying walletTransaction / return / dispute id (from StoreLiabilityLine.sourceId). */
  sourceId: string;
  descriptionAr: string;
  descriptionEn: string;
  postedToBalance?: boolean;
}

/**
 * Full obligations ledger for merchant wallet UI (includes posted gateway fees).
 */
export async function loadMerchantObligationsLedger(
  db: LiabilitySettleDb | any,
  storeId: string,
): Promise<{ totalDue: number; lines: MerchantObligationLine[] }> {
  const pending = await loadStorePendingLiabilities(db, storeId);

  let gatewayAll: StoreLiabilityLine[] = [];
  if (db.store?.findUnique && db.walletTransaction?.findMany) {
    const store = await db.store.findUnique({
      where: { id: storeId },
      select: { id: true, ownerId: true },
    });
    if (store?.ownerId) {
      const feeRows = await db.walletTransaction.findMany({
        where: {
          userId: store.ownerId,
          role: 'VENDOR',
          type: 'DEBIT',
          transactionType: { in: ['PENALTY', 'penalty'] },
        },
        select: {
          id: true,
          amount: true,
          createdAt: true,
          metadata: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 500,
      });
      gatewayAll = mapGatewayFeeWalletRows(feeRows);
    }
  }

  const caseOpen = pending.lines.filter((l) => l.source !== 'wallet');
  const merged = [...caseOpen, ...gatewayAll].sort(
    (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
  );

  const lines: MerchantObligationLine[] = merged.map((l) => {
    const status = l.settlementStatus === 'SETTLED' ? 'SETTLED' : 'OPEN';
    const signedAmount = status === 'SETTLED' ? money2(l.amount) : -money2(l.amount);
    return {
      id: `${l.source}:${l.sourceId}:${l.kind}`,
      kind: l.kind,
      amount: money2(l.amount),
      signedAmount,
      status,
      createdAt: l.createdAt.toISOString(),
      orderId: l.orderId || null,
      offerId: l.offerId || null,
      source: l.source,
      sourceId: String(l.sourceId),
      descriptionAr: l.descriptionAr || l.kind,
      descriptionEn: l.descriptionEn || l.kind,
      postedToBalance: l.postedToBalance,
    };
  });

  const totalDue = money2(
    lines.filter((l) => l.status === 'OPEN').reduce((s, l) => s + l.amount, 0),
  );

  return { totalDue, lines };
}

/**
 * Allocate withdrawal proceeds to pending lines (FIFO). Returns how much to keep on
 * the platform vs transfer to Connect, plus which case fields to mark PAID.
 */
export function allocateLiabilitySettlement(
  lines: StoreLiabilityLine[],
  withdrawalAmount: number,
): {
  settlementAmount: number;
  transferAmount: number;
  settled: StoreLiabilityLine[];
  remainingLiability: number;
} {
  const budget = money2(withdrawalAmount);
  let remaining = budget;
  const settled: StoreLiabilityLine[] = [];
  const settleable = lines.filter(
    (l) => !l.postedToBalance && l.settlementStatus !== 'SETTLED',
  );

  for (const line of settleable) {
    if (remaining <= 0) break;
    if (line.amount <= remaining) {
      settled.push(line);
      remaining = money2(remaining - line.amount);
    } else {
      // Partial line: do not mark PAID; leave full debt for a later withdrawal.
      break;
    }
  }

  const settlementAmount = money2(settled.reduce((s, l) => s + l.amount, 0));
  const transferAmount = money2(budget - settlementAmount);
  const totalDebt = money2(settleable.reduce((s, l) => s + l.amount, 0));
  const remainingLiability = money2(totalDebt - settlementAmount);

  return { settlementAmount, transferAmount, settled, remainingLiability };
}

export async function markSettledLiabilityLinesPaid(
  db: LiabilitySettleDb | any,
  settled: StoreLiabilityLine[],
): Promise<void> {
  for (const line of settled) {
    if (line.source === 'wallet') {
      if (db.walletTransaction?.update) {
        const existing = await db.walletTransaction.findMany?.({
          where: { id: line.sourceId },
          select: { id: true, metadata: true },
          take: 1,
        });
        const row = existing?.[0];
        if (row) {
          const meta = metaOf(row);
          await db.walletTransaction.update({
            where: { id: line.sourceId },
            data: {
              metadata: {
                ...meta,
                settlementStatus: 'SETTLED',
                settledAt: new Date().toISOString(),
              },
            },
          });
        }
      }
      continue;
    }

    const model =
      line.source === 'return'
        ? (db.returnRequest ?? db.return)
        : db.dispute;
    if (!model?.update) continue;
    if (line.kind === 'ADJUDICATION_FEE') {
      await model.update({
        where: { id: line.sourceId },
        data: {
          adjudicationFeePaymentStatus: 'PAID',
          adjudicationFeePaymentMethod: 'WALLET',
        },
      });
    } else {
      await model.update({
        where: { id: line.sourceId },
        data: {
          shippingPaymentStatus: 'PAID',
          shippingPaymentMethod: 'WALLET',
        },
      });
    }
  }
}

export function formatLiabilitiesBlockMessage(pendingTotal: number, lang: 'ar' | 'en' = 'en'): string {
  const amt = money2(pendingTotal).toFixed(2);
  if (lang === 'ar') {
    return `يوجد التزامات معلقة بقيمة ${amt} درهم يجب تسويتها قبل السحب (رسوم حكم / شحن). الرصيد القابل للسحب = المتاح − الالتزامات.`;
  }
  return `You have AED ${amt} in pending store liabilities (adjudication/shipping). Withdrawable amount = available − liabilities.`;
}

/**
 * Block sending money to Connect while older debts remain untouched.
 * Allows FIFO settlement of full lines, then net transfer of the remainder.
 */
export function assertWithdrawalSettlesLiabilitiesOrThrow(
  liabilitiesTotal: number,
  allocation: {
    settlementAmount: number;
    transferAmount: number;
    remainingLiability: number;
  },
  oldestLineAmount?: number,
): void {
  const total = money2(liabilitiesTotal);
  if (total <= 0) return;

  // Withdrawal too small to cover the oldest full liability line — would pay out while debt stays open.
  if (allocation.settlementAmount === 0 && allocation.transferAmount > 0) {
    const need = money2(oldestLineAmount || total);
    throw new BadRequestException(
      `Cannot transfer while store liabilities remain unpaid. Withdraw at least AED ${need.toFixed(2)} so the oldest liability can be settled first, or pay the pending fees/shipping from the wallet.`,
    );
  }
}
