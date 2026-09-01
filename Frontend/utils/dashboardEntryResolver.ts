import type { NavigationState } from './useNavigationHistory';
import {
    inferRequiredRoleFromDashboardPath,
    loginSearchWithNext,
    loadPersistedPendingRedirect,
    normalizeDashboardRoute,
    resolvePendingFromLoginLocation,
    splitDashboardPath,
    type PendingRedirect,
} from './widersDeepLink';
import { getCurrentUser, mapBackendRoleToFrontend } from './auth';

export type DashboardEntryResult =
    | {
          kind: 'dashboard';
          path: string;
          id?: string;
          search?: string;
      }
    | {
          kind: 'login';
          pending: PendingRedirect;
          loginView: 'customer-login' | 'merchant-login';
          roleMismatch: boolean;
          nextSearch?: string;
      }
    | {
          kind: 'role-selection';
          pending?: PendingRedirect;
      }
    | {
          kind: 'stripe-return';
          pending: PendingRedirect;
      };

export function buildPendingRedirect(
    dashboardPath: string,
    viewId: unknown,
    search?: string,
    userRole?: string | null,
): PendingRedirect {
    const normalized = normalizeDashboardRoute(
        splitDashboardPath(dashboardPath).path,
        viewId != null ? String(viewId) : null,
        userRole,
    );
    const { embeddedSearch } = splitDashboardPath(dashboardPath);
    const resolvedSearch =
        search || embeddedSearch || (typeof window !== 'undefined' ? window.location.search : undefined);
    return {
        path: normalized.path,
        id: normalized.id,
        search: resolvedSearch || undefined,
        requiredRole: inferRequiredRoleFromDashboardPath(normalized.path),
    };
}

export function resolveDashboardEntry(
    initialState: NavigationState,
    isStripeReturn: boolean,
): DashboardEntryResult | null {
    if (initialState.view !== 'dashboard') return null;

    const user = getCurrentUser();
    const normalizedRole = user ? mapBackendRoleToFrontend(user.role) : null;
    const pending = buildPendingRedirect(
        initialState.dashboardPath || 'home',
        initialState.viewId,
        initialState.search,
        normalizedRole,
    );

    if (user) {
        if (pending.requiredRole && pending.requiredRole !== normalizedRole) {
            const loginView =
                pending.requiredRole === 'merchant' ? 'merchant-login' : 'customer-login';
            return {
                kind: 'login',
                pending,
                loginView,
                roleMismatch: true,
                nextSearch: loginSearchWithNext(pending),
            };
        }
        return {
            kind: 'dashboard',
            path: pending.path,
            id: pending.id,
            search: pending.search,
        };
    }

    if (isStripeReturn) {
        return { kind: 'stripe-return', pending };
    }

    const nextSearch = loginSearchWithNext(pending);
    if (pending.requiredRole === 'merchant') {
        return {
            kind: 'login',
            pending,
            loginView: 'merchant-login',
            roleMismatch: false,
            nextSearch,
        };
    }
    if (pending.requiredRole === 'customer') {
        return {
            kind: 'login',
            pending,
            loginView: 'customer-login',
            roleMismatch: false,
            nextSearch,
        };
    }

    return { kind: 'role-selection', pending };
}

export function restoreLoginPendingFromSearch(search?: string): PendingRedirect | null {
    return resolvePendingFromLoginLocation(search) || loadPersistedPendingRedirect();
}
