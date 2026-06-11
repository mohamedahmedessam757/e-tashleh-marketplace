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
