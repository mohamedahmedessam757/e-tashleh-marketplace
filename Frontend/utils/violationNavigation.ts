export const VIOLATION_NAV_KEY = 'violation_nav';
export const STORE_LIST_FILTER_KEY = 'admin_store_list_filter';
export const STORE_PROFILE_NAV_KEY = 'admin_store_profile_nav';

export interface ViolationNavContext {
  tab?: string;
  highlightId?: string;
}

export interface StoreProfileNavContext {
  tab?: string;
  highlightId?: string;
  orderId?: string;
}

export interface NotificationNavResult {
  path: string;
  id?: string;
  context?: ViolationNavContext;
  /** Extra query for deep-links e.g. ?tab=offers&highlight=... */
  search?: string;
  storeProfile?: StoreProfileNavContext;
}

export function setViolationNavContext(ctx: ViolationNavContext): void {
  try {
    sessionStorage.setItem(VIOLATION_NAV_KEY, JSON.stringify(ctx));
  } catch {
    /* ignore */
  }
}

export function consumeViolationNavContext(): ViolationNavContext | null {
  try {
    const raw = sessionStorage.getItem(VIOLATION_NAV_KEY);
    if (!raw) return null;
    sessionStorage.removeItem(VIOLATION_NAV_KEY);
    return JSON.parse(raw) as ViolationNavContext;
  } catch {
    return null;
  }
}

export function setAdminStoreListFilter(filter: 'all' | 'pending' | 'license'): void {
  try {
    sessionStorage.setItem(STORE_LIST_FILTER_KEY, filter);
  } catch {
    /* ignore */
  }
}

export function consumeAdminStoreListFilter(): 'all' | 'pending' | 'license' | null {
  try {
    const raw = sessionStorage.getItem(STORE_LIST_FILTER_KEY);
    if (!raw) return null;
    sessionStorage.removeItem(STORE_LIST_FILTER_KEY);
    if (raw === 'pending' || raw === 'license' || raw === 'all') return raw;
    return null;
  } catch {
    return null;
  }
}

export function setStoreProfileNavContext(ctx: StoreProfileNavContext): void {
  try {
    sessionStorage.setItem(STORE_PROFILE_NAV_KEY, JSON.stringify(ctx));
  } catch {
    /* ignore */
  }
}

export function consumeStoreProfileNavContext(): StoreProfileNavContext | null {
  try {
    const raw = sessionStorage.getItem(STORE_PROFILE_NAV_KEY);
    if (!raw) return null;
    sessionStorage.removeItem(STORE_PROFILE_NAV_KEY);
    return JSON.parse(raw) as StoreProfileNavContext;
  } catch {
    return null;
  }
}

export function normalizeNotificationLink(link: string): string {
  return link
    .replace(/^\/dashboard\//, '')
    .replace(/^\/merchant\//, '')
    .replace(/^\//, '');
}

function uuidFrom(value: unknown): string | undefined {
  if (typeof value !== 'string' || !value.trim()) return undefined;
  return value.trim();
}

/**
 * Map notification link + metadata → dashboard path (+ optional view id).
 */
export function resolveNotificationNavigation(
  notif: { link?: string | null; metadata?: Record<string, unknown> | null; type?: string },
): NotificationNavResult | null {
  const meta = (notif.metadata ?? {}) as Record<string, unknown>;
  const violationId = uuidFrom(meta.violationId);
  const tab = typeof meta.tab === 'string' ? meta.tab : undefined;
  const penaltyId = uuidFrom(meta.penaltyId);
  const appealId = uuidFrom(meta.appealId);
  const orderId = uuidFrom(meta.orderId);
  const caseId = uuidFrom(meta.caseId);
  const storeId = uuidFrom(meta.storeId);
  const shipmentId = uuidFrom(meta.shipmentId);
  const type = String(notif.type || '').toUpperCase();

  if (
    violationId ||
    penaltyId ||
    appealId ||
    type === 'VIOLATION' ||
    type === 'LOYALTY_REVIEW' ||
    type === 'CHAT_VIOLATION'
  ) {
    const resolvedTab =
      (typeof meta.tab === 'string' &&
      ['violations', 'penalties', 'appeals', 'loyalty_reviews'].includes(meta.tab)
        ? meta.tab
        : undefined) ||
      (penaltyId ? 'penalties' : undefined) ||
      (appealId ? 'appeals' : undefined) ||
      (type === 'LOYALTY_REVIEW' ? 'loyalty_reviews' : undefined) ||
      'violations';

    return {
      path: 'violations',
      context: {
        tab: resolvedTab,
        highlightId: violationId || penaltyId || appealId,
      },
    };
  }

  // Offer governance → store profile offers history (before generic orderId)
  const offerKind = typeof meta.kind === 'string' ? meta.kind : '';
  if (
    type === 'GOVERNANCE_ALERT' ||
    ['EDIT', 'CANCEL', 'VOLUNTARY_WITHDRAW', 'VIOLATION_WITHDRAW'].includes(offerKind)
  ) {
    const highlightId =
      uuidFrom(meta.highlightId) || uuidFrom(meta.offerId) || orderId;
    if (storeId) {
      const q = new URLSearchParams();
      q.set('tab', 'offers');
      if (highlightId) q.set('highlight', highlightId);
      return {
        path: 'store-profile',
        id: storeId,
        search: `?${q.toString()}`,
        storeProfile: {
          tab: 'offers',
          highlightId: highlightId || undefined,
          orderId: orderId || undefined,
        },
      };
    }
  }

  // Document / license expiry — merchant profile docs, admin store profile
  if (type === 'DOC_EXPIRY' || type === 'DOCEXPIRY') {
    if (storeId) {
      return { path: 'store-profile', id: storeId };
    }
    return { path: 'profile' };
  }

  if (orderId) {
    if (type === 'SHIPMENT_UPDATE' || type === 'SHIPMENT') {
      return { path: 'order-details', id: orderId, search: '?tab=waybills' };
    }
    // Role-agnostic: callers may remap merchant → explore-offer / orders
    return { path: 'order-details', id: orderId };
  }

  if (caseId) {
    return { path: 'dispute-details', id: caseId };
  }

  if (shipmentId) {
    return { path: 'shipments', id: shipmentId };
  }

  if (storeId && (type === 'ALERT' || type === 'SYSTEM' || type === 'SYSTEM_ALERT')) {
    return { path: 'store-profile', id: storeId };
  }

  if (notif.link) {
    return mapLinkToNavigation(notif.link, meta);
  }

  return null;
}

function mapLinkToNavigation(
  rawLink: string,
  meta: Record<string, unknown>,
): NotificationNavResult | null {
  const link = String(rawLink || '').trim();
  if (!link) return null;

  const storeFromMeta = uuidFrom(meta.storeId);
  const orderFromMeta = uuidFrom(meta.orderId);

  // Absolute-ish admin store profile
  const adminStore = link.match(/\/admin\/stores\/([0-9a-f-]{8,})/i);
  if (adminStore?.[1]) {
    return { path: 'store-profile', id: adminStore[1] };
  }

  const adminOrder = link.match(/\/admin\/orders\/([0-9a-f-]{8,})/i);
  if (adminOrder?.[1]) {
    return { path: 'admin-order-details', id: adminOrder[1] };
  }

  const merchantOrder = link.match(/\/(?:dashboard\/)?(?:merchant\/)?orders\/([0-9a-f-]{8,})/i);
  if (merchantOrder?.[1]) {
    return { path: 'order-details', id: merchantOrder[1] };
  }

  const customerOrder = link.match(/\/(?:dashboard\/)?orders\/([0-9a-f-]{8,})/i);
  if (customerOrder?.[1]) {
    return { path: 'order-details', id: customerOrder[1] };
  }

  const dispute = link.match(/\/(?:resolution|disputes|dispute-details)\/([0-9a-f-]{8,})/i);
  if (dispute?.[1]) {
    return { path: 'dispute-details', id: dispute[1] };
  }

  let path = normalizeNotificationLink(link);

  // Legacy / broken DOC_EXPIRY targets
  if (
    path === 'store' ||
    path === 'merchant/store' ||
    path.endsWith('/store') ||
    path === 'docs' ||
    path === 'merchant/profile' ||
    path.includes('merchant/store')
  ) {
    return { path: 'profile' };
  }

  if (path.startsWith('admin/stores/') || path.startsWith('stores/')) {
    const id = path.split('/').pop();
    if (id && id.length > 8) return { path: 'store-profile', id };
    if (storeFromMeta) return { path: 'store-profile', id: storeFromMeta };
    return { path: 'users' };
  }

  if (path.startsWith('admin/orders/')) {
    const id = path.split('/').pop();
    if (id) return { path: 'admin-order-details', id };
  }

  if (path.startsWith('orders/')) {
    const id = path.split('/').pop();
    if (id) return { path: 'order-details', id: orderFromMeta || id };
  }

  // Strip nested prefixes that DashboardShell doesn't understand
  path = path
    .replace(/^merchant\//, '')
    .replace(/^admin\//, '')
    .replace(/^customer\//, '');

  if (path === 'home' || path === '') return { path: 'home' };

  return { path };
}
