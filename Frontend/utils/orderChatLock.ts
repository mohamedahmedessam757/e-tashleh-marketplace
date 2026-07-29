/** Order statuses where vendor–customer order chat must be locked (UI + API). */
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
