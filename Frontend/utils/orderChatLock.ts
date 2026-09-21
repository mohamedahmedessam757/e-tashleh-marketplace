/** Order statuses where vendor–customer order chat must be locked (UI + API).
 * Keep in parity with backend CHAT_CLOSE_ORDER_STATUSES (chat-offer-expiry.util.ts).
 */
export const ORDER_CHAT_CLOSED_STATUSES = [
  'CANCELLED',
  'COMPLETED',
  'WARRANTY_ACTIVE',
  'WARRANTY_EXPIRED',
] as const;

export type OrderChatClosedStatus = (typeof ORDER_CHAT_CLOSED_STATUSES)[number];

export function isOrderChatClosedStatus(
  status: string | null | undefined,
): boolean {
  if (!status) return false;
  return (ORDER_CHAT_CLOSED_STATUSES as readonly string[]).includes(status);
}

/** Per-offer fulfillment cancel must also lock chat (multi-item partial cancel). */
export function isOfferChatLocked(opts: {
  orderStatus?: string | null;
  fulfillmentStatus?: string | null;
  offerStatus?: string | null;
}): boolean {
  if (isOrderChatClosedStatus(opts.orderStatus)) return true;
  if (String(opts.fulfillmentStatus || '').toUpperCase() === 'CANCELLED') return true;
  const offerStatus = String(opts.offerStatus || '').toLowerCase();
  if (offerStatus === 'rejected' || offerStatus === 'withdrawn' || offerStatus === 'cancelled') {
    return true;
  }
  return false;
}
