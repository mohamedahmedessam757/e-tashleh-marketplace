export type DashboardRole = 'customer' | 'merchant' | 'admin';

const CUSTOMER_VIEWS = new Set<string>([
  'home', 'orders', 'order-details', 'create-order', 'checkout', 'chats', 'profile', 'wallet',
  'billing', 'shipments', 'shipment-details', 'shipping-cart', 'resolution', 'dispute-details',
  'support', 'preferences', 'loyalty', 'rewards', 'violations', 'info-center',
]);

const MERCHANT_VIEWS = new Set<string>([
  'home', 'marketplace', 'explore-offer', 'orders', 'active-orders', 'my-offers', 'reviews',
  'profile', 'wallet', 'wallet-obligations', 'shipments', 'shipment-details', 'settings',
  'support', 'notifications', 'chats', 'shipping-cart', 'billing', 'resolution',
  'dispute-details', 'violations', 'performance', 'info-center',
]);

const ADMIN_VIEWS = new Set<string>([
  'home', 'users', 'store-profile', 'customers', 'customer-profile', 'reviews', 'orders-control',
  'admin-order-details', 'billing', 'admin-order-financial-audit', 'invoices', 'admin-order-invoice',
  'shipping', 'shipping-carts', 'audit-logs', 'platform-errors', 'whatsapp-logs', 'settings',
  'support', 'resolution', 'admin-dispute-details', 'security-audit', 'violations', 'chats',
  'chat-monitoring', 'access-control', 'verification-tasks', 'verification-task-details', 'profile',
]);

export function normalizeDashboardRole(role: string | null | undefined): DashboardRole {
  const r = String(role || '').toLowerCase();
  if (r === 'merchant' || r === 'vendor') return 'merchant';
  if (r === 'customer') return 'customer';
  return 'admin';
}

export function isKnownDashboardView(role: string | null | undefined, path: string): boolean {
  const r = normalizeDashboardRole(role);
  const views = r === 'customer' ? CUSTOMER_VIEWS : r === 'merchant' ? MERCHANT_VIEWS : ADMIN_VIEWS;
  return views.has(path);
}
