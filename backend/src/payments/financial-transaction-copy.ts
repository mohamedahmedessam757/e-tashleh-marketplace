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
  // Do not surface admin-only notes to customer/merchant ledgers
  const reason = meta.reason ?? meta.note;
  if (reason != null && String(reason).trim()) {
    return String(reason);
  }
  return undefined;
}

/**
 * Strip merchant-facing leaks about platform commission/shipping and broken encodings.
 * Historical wallet rows still store the old admin-commission wording in `description`.
 */
export function sanitizePublicLedgerDescription(
  raw: string | null | undefined,
): string | undefined {
  if (typeof raw !== 'string' || !raw.trim()) return undefined;

  let s = raw.trim();

  // Mojibake / encoding corruption for em-dash
  s = s.replace(/â€”/g, '—').replace(/â€“/g, '–');

  // Never expose platform commission / shipping exclusion wording to users
  s = s.replace(/\(\s*Excludes\s+Admin\s+Commission\s*(?:&|and)\s*Shipping\s*\)/gi, '');
  s = s.replace(/Excludes\s+Admin\s+Commission\s*(?:&|and)\s*Shipping/gi, '');
  s = s.replace(/Admin\s+Commission/gi, '');

  // Drop redundant trailing "Order #..." (UI / enrich already show order number)
  s = s.replace(/(?:\s*[—–-]\s*)?Order\s*#\S+/gi, '');

  // Normalize "Net payout for offer #X" → clean offer reference (no internal accounting language)
  const offerMatch = s.match(/(?:Net\s+)?[Pp]ayout\s+for\s+offer\s*(#?[A-Za-z0-9-]+)/i);
  if (offerMatch) {
    const offerRef = offerMatch[1].startsWith('#') ? offerMatch[1] : `#${offerMatch[1]}`;
    return `Offer ${offerRef}`;
  }

  s = s.replace(/\s{2,}/g, ' ').replace(/\s*[—–]\s*$/g, '').trim();
  return s || undefined;
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
  let partHint = resolvePartHint(meta, lang);
  const sanitized = sanitizePublicLedgerDescription(tx.description);

  // Prefer offer ref from sanitized payout text as a short hint (not the full English dump)
  if (!partHint && sanitized) {
    const offerOnly = sanitized.match(/^Offer\s+(#\S+)$/i);
    if (offerOnly) {
      partHint = lang === 'ar' ? `عرض ${offerOnly[1]}` : `Offer ${offerOnly[1]}`;
    }
  }

  const pieces: string[] = [title];
  if (orderNumber) {
    pieces.push(lang === 'ar' ? `طلب #${orderNumber}` : `Order #${orderNumber}`);
  }
  if (partHint) pieces.push(partHint);

  // Only append remaining sanitized text when it adds info beyond title/order/offer hint
  if (sanitized && sanitized !== title) {
    const looksGenericPayment = /^Payment for Order #/i.test(sanitized);
    const isOfferOnly = /^Offer\s+#\S+$/i.test(sanitized);
    const looksEnglish =
      /[A-Za-z]/.test(sanitized) && !/[\u0600-\u06FF]/.test(sanitized);

    if (isOfferOnly) {
      // already represented via partHint
    } else if (looksGenericPayment && orderNumber) {
      // skip
    } else if (lang === 'ar' && looksEnglish && (orderNumber || partHint)) {
      // skip English dump in Arabic UI
    } else {
      pieces.push(sanitized);
    }
  }

  // Deduplicate consecutive identical segments
  const unique: string[] = [];
  for (const p of pieces) {
    if (!unique.length || unique[unique.length - 1] !== p) unique.push(p);
  }

  return {
    title,
    detail: unique.join(' — '),
    orderNumber,
  };
}

export function enrichLedgerRow<T extends TxCopyInput>(row: T): T & {
  displayDescriptionAr: string;
  displayDescriptionEn: string;
  titleAr: string;
  titleEn: string;
  orderNumber?: string;
  /** Sanitized description safe for merchant/customer UI (no admin commission wording). */
  description: string | null | undefined;
} {
  const ar = buildTransactionCopy(row, 'ar');
  const en = buildTransactionCopy(row, 'en');
  const safeDescription = sanitizePublicLedgerDescription(row.description) ?? null;
  return {
    ...row,
    description: safeDescription,
    displayDescriptionAr: ar.detail,
    displayDescriptionEn: en.detail,
    titleAr: ar.title,
    titleEn: en.title,
    orderNumber: ar.orderNumber || en.orderNumber,
  };
}
