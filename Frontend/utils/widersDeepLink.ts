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
    if (v.requiredRole && v.requiredRole !== 'customer' && v.requiredRole !== 'merchant') {
        return false;
    }
    if (v.search != null && typeof v.search !== 'string') return false;
    if (v.id != null && typeof v.id !== 'string' && typeof v.id !== 'number') return false;
    return true;
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
