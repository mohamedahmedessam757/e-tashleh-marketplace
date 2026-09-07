/**
 * Pending store liabilities settled from withdrawal proceeds before Stripe Transfer (SCT).
 * Reuses adjudication PENDING fee / shipping statuses — no new ledger table.
 */

import { BadRequestException } from '@nestjs/common';

export type StoreLiabilityLineKind = 'ADJUDICATION_FEE' | 'SHIPPING_FEE';

export interface StoreLiabilityLine {
  source: 'return' | 'dispute';
  sourceId: string;
  kind: StoreLiabilityLineKind;
  amount: number;
  createdAt: Date;
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
      });
    }
  }

  return lines;
}

/** Pure aggregator for unit tests / callers that already loaded cases. */
export function aggregateStorePendingLiabilities(input: {
  returns: FeeCaseRow[];
  disputes: FeeCaseRow[];
}): StorePendingLiabilities {
  const lines = [
    ...input.returns.flatMap((r) => collectLinesFromCase('return', r)),
    ...input.disputes.flatMap((d) => collectLinesFromCase('dispute', d)),
  ].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

  const total = money2(lines.reduce((s, l) => s + l.amount, 0));
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
};

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

  return aggregateStorePendingLiabilities({ returns, disputes });
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

  for (const line of lines) {
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
  const totalDebt = money2(lines.reduce((s, l) => s + l.amount, 0));
  const remainingLiability = money2(totalDebt - settlementAmount);

  return { settlementAmount, transferAmount, settled, remainingLiability };
}

export async function markSettledLiabilityLinesPaid(
  db: LiabilitySettleDb | any,
  settled: StoreLiabilityLine[],
): Promise<void> {
  for (const line of settled) {
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
