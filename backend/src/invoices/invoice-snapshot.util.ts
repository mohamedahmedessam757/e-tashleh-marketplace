export type InvoiceDocType =
  | 'MASTER'
  | 'PART'
  | 'SHIPPING'
  | 'COMMISSION'
  | 'GATEWAY_FEE'
  | 'REFUND';

export const REFUND_INVOICE_BATCH_PREFIX = 'REFUND:';

export function refundInvoiceBatchKey(stripeRefundId: string): string {
  return `${REFUND_INVOICE_BATCH_PREFIX}${String(stripeRefundId || '').trim()}`;
}

export interface ShippingLineItem {
  paymentId: string;
  offerId?: string | null;
  partName: string;
  amount: number;
}

export interface ResolveShippingBatchInput {
  paymentId: string;
  shippingCost: number;
  shippingType?: string | null;
  cartShipmentId?: string | null;
}

export interface ResolveShippingBatchResult {
  /** When false, skip creating a SHIPPING invoice (zero cost). */
  shouldCreate: boolean;
  isCombined: boolean;
  shippingBatchKey: string;
}

/**
 * Pure shipping-batch key rules (no DB).
 * - shippingCost <= 0 → skip SHIPPING doc
 * - combined + cartShipmentId → one SHIPPING upserted by cartShipmentId
 * - otherwise → one SHIPPING per payment (batch key = paymentId)
 */
export function resolveShippingBatch(
  input: ResolveShippingBatchInput,
): ResolveShippingBatchResult {
  const shippingCost = Number(input.shippingCost) || 0;
  if (shippingCost <= 0) {
    return {
      shouldCreate: false,
      isCombined: false,
      shippingBatchKey: input.paymentId,
    };
  }

  const isCombined =
    String(input.shippingType || '').toLowerCase() === 'combined' &&
    !!input.cartShipmentId;

  return {
    shouldCreate: true,
    isCombined,
    shippingBatchKey: isCombined
      ? String(input.cartShipmentId)
      : input.paymentId,
  };
}

export function mergeShippingLineItems(
  existing: ShippingLineItem[] | null | undefined,
  next: ShippingLineItem,
): ShippingLineItem[] {
  const list = Array.isArray(existing) ? [...existing] : [];
  const idx = list.findIndex((l) => l.paymentId === next.paymentId);
  if (idx >= 0) {
    list[idx] = { ...list[idx], ...next };
  } else {
    list.push(next);
  }
  return list;
}

export function sumShippingLineItems(items: ShippingLineItem[]): number {
  return items.reduce((sum, l) => sum + (Number(l.amount) || 0), 0);
}

export function invoiceTypePrefix(type: InvoiceDocType): string {
  switch (type) {
    case 'PART':
      return 'INV-P';
    case 'SHIPPING':
      return 'INV-S';
    case 'COMMISSION':
      return 'INV-C';
    case 'GATEWAY_FEE':
      return 'INV-G';
    case 'REFUND':
      return 'INV-R';
    default:
      return 'INV';
  }
}
