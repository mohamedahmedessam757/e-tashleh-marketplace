/**
 * Permissions Utility Helpers (2026 Platform Standards)
 */

/**
 * Filter support tickets based on the admin's allowed categories
 */
export const filterTicketsByPermission = (tickets: any[], allowedCategories: string[]) => {
  if (!allowedCategories || allowedCategories.length === 0) return tickets;
  
  // If user has 'ALL' category (implied by an empty check or specific flag if we add it)
  // But usually, we check against the list.
  return tickets.filter(ticket => {
    const category = ticket.category?.toUpperCase() || 'OTHER';
    return allowedCategories.includes(category);
  });
};

/**
 * Checks if a specific section should be blurred
 */
export const shouldBlurSection = (blurredSections: string[], sectionName: string): boolean => {
  return blurredSections?.includes(sectionName) || false;
};

/**
 * Constants for Permission Keys
 */
export const PERMISSION_PAGES = {
  DASHBOARD: 'home',
  USERS: 'users',
  STORE_PROFILE: 'STORE_PROFILE',
  CUSTOMERS: 'customers',
  CUSTOMER_PROFILE: 'CUSTOMER_PROFILE',
  ORDERS: 'orders-control',
  SHIPPING_CARTS: 'shipping-carts',
  BILLING: 'billing',
  AUDIT: 'audit-logs',
  SECURITY: 'security-audit',
  SETTINGS: 'settings',
  SUPPORT: 'support',
  RESOLUTION: 'resolution',
  VIOLATIONS: 'violations',
  SHIPPING: 'shipping',
  REVIEWS: 'reviews',
  CHATS: 'chats',
  MONITORING: 'chat-monitoring',
  ACCESS_CONTROL: 'access-control',
  VERIFICATION_TASKS: 'verification-tasks',
  VERIFICATION_TASK_DETAILS: 'verification-task-details',
};

/**
 * Advanced Granular Schema (2026 Standards)
 * Defines fields, actions, and tabs per resource for deep RBAC.
 */
export const GRANULAR_PERMISSIONS: Record<string, { fields: string[], actions: string[], tabs?: string[] }> = {
  'home': {
    fields: ['REVENUE_STATS', 'USER_GROWTH', 'SYSTEM_HEALTH'],
    actions: ['EXPORT_REPORT', 'REFRESH_STATS']
  },
  'users': {
    fields: ['VENDOR_IBAN', 'VENDOR_NOTES', 'VENDOR_LICENSE', 'VENDOR_CR_NUMBER', 'BANK_SWIFT_CODE'],
    actions: ['DELETE_VENDOR', 'SUSPEND_VENDOR', 'UPDATE_LICENSE', 'APPROVE_DOCUMENTS', 'EDIT_COMMISSION']
  },
  'STORE_PROFILE': {
    fields: ['VENDOR_NOTES', 'VENDOR_LICENSE', 'VENDOR_IBAN'],
    actions: ['APPROVE_DOCUMENTS', 'EDIT_COMMISSION', 'SUSPEND_VENDOR'],
    tabs: ['OVERVIEW', 'ORDERS', 'DISPUTES', 'REVIEWS', 'FINANCIAL', 'SESSIONS', 'CONTRACT', 'RESTRICTIONS']
  },
  'customers': {
    fields: ['CUSTOMER_PHONE', 'CUSTOMER_WALLET', 'CUSTOMER_ADDRESS', 'TRANSACTION_HISTORY'],
    actions: ['DELETE_CUSTOMER', 'SUSPEND_CUSTOMER', 'ADJUST_BALANCE', 'RESET_PASSWORD']
  },
  'CUSTOMER_PROFILE': {
    fields: ['CUSTOMER_PHONE', 'CUSTOMER_WALLET'],
    actions: ['ADJUST_BALANCE', 'SUSPEND_CUSTOMER', 'RESET_PASSWORD'],
    tabs: ['OVERVIEW', 'ORDERS', 'DISPUTES', 'FINANCIAL', 'SESSIONS', 'RESTRICTIONS']
  },
  'orders-control': {
    fields: ['ORDER_COST', 'VENDOR_REVENUE', 'PROFIT_MARGIN', 'PLATFORM_FEES'],
    actions: ['CANCEL_ORDER', 'MARK_AS_PAID', 'UPDATE_SHIPMENT', 'FORCE_REFUND']
  },
  'shipping-carts': {
    fields: ['SENSITIVE_DATA'],
    actions: ['FORCE_SHIP_ALL', 'REQUEST_PARTIAL_SHIPMENT']
  },
  'billing': {
    fields: ['BANK_DETAILS', 'TAX_RECORDS', 'PROFIT_STATS', 'PAYOUT_QUEUE'],
    actions: ['APPROVE_WITHDRAWAL', 'REJECT_WITHDRAWAL', 'GENERATE_INVOICE', 'EXPORT_FINANCIALS'],
    tabs: ['OVERVIEW', 'TRANSACTIONS', 'WITHDRAWALS', 'REVENUE', 'COMMISSION', 'ESCROW']
  },
  'shipping': {
    fields: ['WAYBILL_COST', 'CARRIER_FEES', 'SENSITIVE_DATA', 'COURIER_DETAILS'],
    actions: ['CANCEL_WAYBILL', 'PRINT_WAYBILL', 'REASSIGN_CARRIER', 'FORCE_UPDATE_STATUS']
  },
  'chats': {
    fields: ['MESSAGE_CONTENT', 'USER_IDENTITY'],
    actions: ['DELETE_CHAT', 'EXPORT_CHAT_LOG']
  },
  'support': {
    fields: ['INTERNAL_NOTES', 'USER_PRIVATE_DATA'],
    actions: ['CLOSE_TICKET', 'REASSIGN_TICKET', 'DELETE_RESPONSE'],
    tabs: ['CUSTOMERS', 'MERCHANTS']
  },
  'violations': {
    fields: ['INTERNAL_NOTES'],
    actions: ['EXPORT_REPORTS'],
    tabs: ['ACTIVE', 'APPEALS', 'PENALTIES', 'RISK_ALERTS', 'TYPES']
  },
  'reviews': {
    fields: ['MESSAGE_CONTENT'],
    actions: ['EXPORT_REPORTS'],
    tabs: ['PENDING', 'PUBLISHED', 'REJECTED', 'IMPACT']
  },
  'resolution': {
    fields: ['INTERNAL_NOTES'],
    actions: ['EXPORT_REPORTS'],
    tabs: ['OVERSIGHT', 'WARRANTY', 'CLOSED']
  },
  'settings': {
    fields: ['SYSTEM_HEALTH'],
    actions: ['EXPORT_REPORTS'],
    tabs: ['GENERAL', 'FINANCIAL', 'LOGISTICS', 'CONTENT', 'CATALOG', 'MAINTENANCE']
  },
  'verification-tasks': {
    fields: [],
    actions: ['start', 'complete', 'upload_photos'],
  },
  'verification-task-details': {
    fields: [],
    actions: ['start', 'complete', 'upload_photos'],
  },
};
