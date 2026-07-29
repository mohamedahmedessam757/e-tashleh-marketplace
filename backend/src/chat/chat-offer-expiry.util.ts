import { OrderStatus } from '@prisma/client';

/**
 * Order statuses still inside the merchant-offer / customer-selection window.
 * Only these may auto-mark vendor–customer chats as EXPIRED (24h / selection SLA).
 */
export const OFFER_PHASE_ORDER_STATUSES: readonly OrderStatus[] = [
  OrderStatus.AWAITING_OFFERS,
  OrderStatus.COLLECTING_OFFERS,
  OrderStatus.AWAITING_SELECTION,
] as const;

/**
 * Terminal / post-lifecycle statuses where vendor–customer order chat must CLOSE.
 * Support chats are unaffected (caller must filter type === 'order').
 */
export const CHAT_CLOSE_ORDER_STATUSES: readonly OrderStatus[] = [
  OrderStatus.CANCELLED,
  OrderStatus.COMPLETED,
  OrderStatus.WARRANTY_ACTIVE,
  OrderStatus.WARRANTY_EXPIRED,
] as const;

/** @deprecated Empty — chats no longer stay open for cancel/complete/warranty. */
export const CHAT_KEEP_OPEN_ORDER_STATUSES: readonly OrderStatus[] = [] as const;

export function isOfferPhaseOrderStatus(status: string | null | undefined): boolean {
  return (OFFER_PHASE_ORDER_STATUSES as readonly string[]).includes(String(status || ''));
}

/** Always false under 2026 lock rule; kept for call-site compatibility. */
export function shouldKeepOrderChatOpen(_status: string | null | undefined): boolean {
  return false;
}

export function shouldCloseOrderChat(status: string | null | undefined): boolean {
  return (CHAT_CLOSE_ORDER_STATUSES as readonly string[]).includes(String(status || ''));
}
