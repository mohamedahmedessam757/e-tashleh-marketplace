export type DashboardDeepTab = 'overview' | 'invoices' | 'waybills';

export type PendingRedirect = {
    path: string;
    id?: string;
    search?: string;
    requiredRole?: 'customer' | 'merchant';
};

export interface DashboardDeepLink {
    tab?: DashboardDeepTab;
    offerId?: string;
}

const VALID_TABS: DashboardDeepTab[] = ['overview', 'invoices', 'waybills'];

/** Survives login-page refresh so WhatsApp deep-links still restore after auth */
const PENDING_REDIRECT_KEY = 'etashleh_pending_redirect_v1';

/** First path segment after /dashboard/ — keep tight to prevent open redirects */
const ALLOWED_DASHBOARD_SEGMENTS = new Set([
    'home',
    'order-details',
    'explore-offer',
    'orders',
    'chats',
    'marketplace',
    'offers',
    'wallet',
    'profile',
    'settings',
    'shipments',
    'invoices',
    'store-profile',
    'notifications',
    'violations',
    'performance',
    'verification-tasks',
]);

export function readDashboardDeepLink(search?: string): DashboardDeepLink {
    const raw = search ?? (typeof window !== 'undefined' ? window.location.search : '');
    const params = new URLSearchParams(raw.startsWith('?') ? raw.slice(1) : raw);
    const tab = params.get('tab') as DashboardDeepTab | null;
    const offerId = params.get('offerId') || undefined;
    return {
        tab: tab && VALID_TABS.includes(tab) ? tab : undefined,
        offerId,
    };
}

export function inferRequiredRoleFromDashboardPath(
    path: string,
): 'customer' | 'merchant' | undefined {
    const clean = path.split('?')[0];
    if (clean === 'order-details') return 'customer';
    if (clean === 'explore-offer') return 'merchant';
    return undefined;
}

export function splitDashboardPath(path: string): { path: string; embeddedSearch?: string } {
    if (!path.includes('?')) return { path };
    const [base, query] = path.split('?');
    return { path: base, embeddedSearch: query ? `?${query}` : undefined };
}

function isSafePendingRedirect(value: unknown): value is PendingRedirect {
    if (!value || typeof value !== 'object') return false;
    const v = value as PendingRedirect;
    if (typeof v.path !== 'string' || !v.path.trim()) return false;
    // Reject absolute / external paths — only dashboard route keys
    if (v.path.includes('://') || v.path.startsWith('/') || v.path.includes('..')) {
        return false;
    }
    if (!ALLOWED_DASHBOARD_SEGMENTS.has(v.path.split('?')[0])) {
        return false;
    }
    if (v.requiredRole && v.requiredRole !== 'customer' && v.requiredRole !== 'merchant') {
        return false;
    }
    if (v.search != null && typeof v.search !== 'string') return false;
    if (v.id != null && typeof v.id !== 'string' && typeof v.id !== 'number') return false;
    return true;
}

/** Build relative `/dashboard/...` path for the `next` query param */
export function encodePendingRedirectAsNext(pending: PendingRedirect): string | null {
    if (!isSafePendingRedirect(pending)) return null;
    let path = `/dashboard/${pending.path}`;
    if (pending.id != null && String(pending.id).trim()) {
        path += `/${String(pending.id).trim()}`;
    }
    if (pending.search) {
        path += pending.search.startsWith('?') ? pending.search : `?${pending.search}`;
    }
    return path;
}

/**
 * Parse `?next=/dashboard/...` from login URL. Rejects open redirects.
 */
export function parseNextQueryParam(raw: string | null | undefined): PendingRedirect | null {
    if (!raw || typeof raw !== 'string') return null;
    let decoded: string;
    try {
        decoded = decodeURIComponent(raw.trim());
    } catch {
        return null;
    }
    if (decoded.length > 512) return null;
    if (!decoded.startsWith('/dashboard/')) return null;
    if (decoded.includes('://') || decoded.includes('..') || decoded.includes('\\')) {
        return null;
    }

    const qIndex = decoded.indexOf('?');
    const pathname = qIndex >= 0 ? decoded.slice(0, qIndex) : decoded;
    const search = qIndex >= 0 ? decoded.slice(qIndex) : undefined;
    const segments = pathname.split('/').filter(Boolean);
    if (segments[0] !== 'dashboard' || !segments[1]) return null;
    if (!ALLOWED_DASHBOARD_SEGMENTS.has(segments[1])) return null;
    if (segments[2] && !/^[a-zA-Z0-9_-]+$/.test(segments[2])) return null;
    if (segments.length > 3) return null;

    const pending: PendingRedirect = {
        path: segments[1],
        id: segments[2] || undefined,
        search,
        requiredRole: inferRequiredRoleFromDashboardPath(segments[1]),
    };
    return isSafePendingRedirect(pending) ? pending : null;
}

export function loginSearchWithNext(pending: PendingRedirect): string | undefined {
    const next = encodePendingRedirectAsNext(pending);
    if (!next) return undefined;
    return `?next=${encodeURIComponent(next)}`;
}

export function resolvePendingFromLoginLocation(
    search?: string,
): PendingRedirect | null {
    const raw = search ?? (typeof window !== 'undefined' ? window.location.search : '');
    const params = new URLSearchParams(raw.startsWith('?') ? raw.slice(1) : raw);
    return parseNextQueryParam(params.get('next'));
}

export function persistPendingRedirect(pending: PendingRedirect | null): void {
    if (typeof window === 'undefined') return;
    try {
        if (!pending) {
            sessionStorage.removeItem(PENDING_REDIRECT_KEY);
            return;
        }
        if (!isSafePendingRedirect(pending)) return;
        sessionStorage.setItem(PENDING_REDIRECT_KEY, JSON.stringify(pending));
    } catch {
        /* ignore quota / private mode */
    }
}

export function loadPersistedPendingRedirect(): PendingRedirect | null {
    if (typeof window === 'undefined') return null;
    try {
        const raw = sessionStorage.getItem(PENDING_REDIRECT_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw) as unknown;
        return isSafePendingRedirect(parsed) ? parsed : null;
    } catch {
        return null;
    }
}

export function clearPersistedPendingRedirect(): void {
    persistPendingRedirect(null);
}

/** Detect WhatsApp in-app browser for UX hint only */
export function isLikelyWhatsAppInAppBrowser(): boolean {
    if (typeof navigator === 'undefined') return false;
    const ua = navigator.userAgent || '';
    return /WhatsApp/i.test(ua) || /WABusiness/i.test(ua);
}
