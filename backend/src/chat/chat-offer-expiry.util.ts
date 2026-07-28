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
 * Post-lifecycle / terminal statuses where merchant chat must stay OPEN
 * (customer may still need to message about cancel/complete).
 */
export const CHAT_KEEP_OPEN_ORDER_STATUSES: readonly OrderStatus[] = [
  OrderStatus.CANCELLED,
  OrderStatus.COMPLETED,
  OrderStatus.WARRANTY_ACTIVE,
] as const;

export function isOfferPhaseOrderStatus(status: string | null | undefined): boolean {
  return (OFFER_PHASE_ORDER_STATUSES as readonly string[]).includes(String(status || ''));
}

export function shouldKeepOrderChatOpen(status: string | null | undefined): boolean {
  return (CHAT_KEEP_OPEN_ORDER_STATUSES as readonly string[]).includes(String(status || ''));
}
