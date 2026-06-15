/** Display order number for customer/merchant UI — never expose raw UUID. */
export function formatOrderDisplayId(order: {
  orderNumber?: string | null;
  id?: string;
}): string {
  const num = order.orderNumber?.trim();
  if (num) return num;
  return '—';
}
