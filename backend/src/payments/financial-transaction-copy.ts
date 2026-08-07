import { getWalletTypeLabel } from './financial-labels.ar';

type TxCopyInput = {
  transactionType?: string | null;
  description?: string | null;
  metadata?: unknown;
  orderNumber?: string | null;
  order?: { orderNumber?: string | null } | null;
  payment?: { order?: { orderNumber?: string | null } | null } | null;
  escrow?: { order?: { orderNumber?: string | null } | null } | null;
};

export type TransactionCopy = {
  title: string;
  detail: string;
  orderNumber?: string;
};

function asMeta(metadata: unknown): Record<string, unknown> {
  if (metadata && typeof metadata === 'object' && !Array.isArray(metadata)) {
    return metadata as Record<string, unknown>;
  }
  return {};
}

function resolveOrderNumber(tx: TxCopyInput): string | undefined {
  const direct =
    tx.orderNumber ||
    tx.order?.orderNumber ||
    tx.payment?.order?.orderNumber ||
    tx.escrow?.order?.orderNumber;
  if (direct) return String(direct);

  const meta = asMeta(tx.metadata);
  if (meta.orderNumber != null) return String(meta.orderNumber);
  return undefined;
}

function resolvePartHint(meta: Record<string, unknown>, lang: 'ar' | 'en'): string | undefined {
  const partName = meta.partName ?? meta.part_name ?? meta.lineItem;
  if (partName != null && String(partName).trim()) {
    return lang === 'ar' ? `القطعة: ${partName}` : `Part: ${partName}`;
  }
  const reason = meta.reason ?? meta.adminNote ?? meta.note;
  if (reason != null && String(reason).trim()) {
    return String(reason);
  }
  return undefined;
}

/**
 * Build human-readable bilingual transaction copy for wallet / payment ledger rows.
 */
export function buildTransactionCopy(
  tx: TxCopyInput,
  lang: 'ar' | 'en',
): TransactionCopy {
  const typeKey = String(tx.transactionType || 'payment');
  const title = getWalletTypeLabel(typeKey, lang);
  const orderNumber = resolveOrderNumber(tx);
  const meta = asMeta(tx.metadata);
  const partHint = resolvePartHint(meta, lang);
  const rawDescription =
    typeof tx.description === 'string' && tx.description.trim()
      ? tx.description.trim()
      : undefined;

  const pieces: string[] = [title];
  if (orderNumber) {
    pieces.push(lang === 'ar' ? `طلب #${orderNumber}` : `Order #${orderNumber}`);
  }
  if (partHint) pieces.push(partHint);
  if (rawDescription && rawDescription !== title) {
    // Avoid duplicating generic English descriptions when we already have structured copy
    const looksGeneric = /^Payment for Order #/i.test(rawDescription);
    if (!looksGeneric || !orderNumber) {
      pieces.push(rawDescription);
    }
  }

  // Deduplicate consecutive identical segments
  const unique: string[] = [];
  for (const p of pieces) {
    if (!unique.length || unique[unique.length - 1] !== p) unique.push(p);
  }

  return {
    title,
    detail: unique.join(lang === 'ar' ? ' — ' : ' — '),
    orderNumber,
  };
}

export function enrichLedgerRow<T extends TxCopyInput>(row: T): T & {
  displayDescriptionAr: string;
  displayDescriptionEn: string;
  titleAr: string;
  titleEn: string;
  orderNumber?: string;
} {
  const ar = buildTransactionCopy(row, 'ar');
  const en = buildTransactionCopy(row, 'en');
  return {
    ...row,
    displayDescriptionAr: ar.detail,
    displayDescriptionEn: en.detail,
    titleAr: ar.title,
    titleEn: en.title,
    orderNumber: ar.orderNumber || en.orderNumber,
  };
}
