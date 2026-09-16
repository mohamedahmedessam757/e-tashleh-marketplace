const JWT_EXPIRY_SKEW_SEC = 60;
const ACCESS_TOKEN_KEY = 'access_token';

export interface DecodedAccessToken {
    sub: string;
    email?: string;
    role: string;
    exp?: number;
    iat?: number;
}

function decodeJwtPayload(token: string): DecodedAccessToken | null {
    try {
        const parts = token.split('.');
        if (parts.length !== 3) return null;
        const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
        if (!payload || typeof payload !== 'object') return null;
        return payload as DecodedAccessToken;
    } catch {
        return null;
    }
}

export function isVerificationOfficerRole(role?: string | null): boolean {
    return String(role || '').toUpperCase() === 'VERIFICATION_OFFICER';
}

/**
 * Verification officers must not persist auth across browser sessions.
 * Token lives in sessionStorage only; other roles keep localStorage.
 */
export function getAccessToken(): string | null {
    if (typeof window === 'undefined') return null;

    const sessionTok = sessionStorage.getItem(ACCESS_TOKEN_KEY);
    if (sessionTok) return sessionTok;

    const localTok = localStorage.getItem(ACCESS_TOKEN_KEY);
    if (!localTok) return null;

    // Legacy: VO tokens were stored in localStorage — drop them so officers must re-login.
    const payload = decodeJwtPayload(localTok);
    if (payload && isVerificationOfficerRole(payload.role)) {
        localStorage.removeItem(ACCESS_TOKEN_KEY);
        try {
            localStorage.removeItem('admin_role');
        } catch {
            /* ignore */
        }
        return null;
    }

    return localTok;
}

export function setAccessToken(token: string, role?: string | null): void {
    if (typeof window === 'undefined') return;
    // Never leave a token in the wrong bucket (cross-role / shared device).
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    sessionStorage.removeItem(ACCESS_TOKEN_KEY);

    // Prefer explicit role; fall back to JWT claim so VO never lands in localStorage.
    const effectiveRole = role || decodeJwtPayload(token)?.role || null;

    if (isVerificationOfficerRole(effectiveRole)) {
        sessionStorage.setItem(ACCESS_TOKEN_KEY, token);
        try {
            localStorage.removeItem('admin_role');
        } catch {
            /* ignore */
        }
        return;
    }

    localStorage.setItem(ACCESS_TOKEN_KEY, token);
}

export function clearAccessToken(): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    sessionStorage.removeItem(ACCESS_TOKEN_KEY);
}

/** Wipe officer auth for verify-link / admin-login entry (always require email+password again). */
export function clearVerificationOfficerSession(): void {
    if (typeof window === 'undefined') return;

    // Always drop session bucket first (VO non-persistent home).
    const sessionTok = sessionStorage.getItem(ACCESS_TOKEN_KEY);
    sessionStorage.removeItem(ACCESS_TOKEN_KEY);

    const localTok = localStorage.getItem(ACCESS_TOKEN_KEY);
    const sessionPayload = sessionTok ? decodeJwtPayload(sessionTok) : null;
    const localPayload = localTok ? decodeJwtPayload(localTok) : null;

    const sessionIsVo = !!(sessionPayload && isVerificationOfficerRole(sessionPayload.role));
    const localIsVo = !!(localPayload && isVerificationOfficerRole(localPayload.role));

    if (localIsVo) {
        localStorage.removeItem(ACCESS_TOKEN_KEY);
    }

    if (sessionIsVo || localIsVo) {
        try {
            sessionStorage.removeItem('admin');
            sessionStorage.removeItem('etashleh-admin-storage');
            localStorage.removeItem('admin_role');
        } catch {
            /* ignore */
        }
    }
}

/** Decode JWT payload without validating expiry. */
export function decodeAccessToken(token?: string | null): DecodedAccessToken | null {
    const resolved = token ?? getAccessToken();
    if (!resolved) return null;
    return decodeJwtPayload(resolved);
}

/** Returns false if token is missing, malformed, or past exp (with 60s skew). */
export function isAccessTokenValid(token?: string | null): boolean {
    const resolved = token ?? getAccessToken();
    if (!resolved) return false;

    const payload = decodeJwtPayload(resolved);
    if (!payload?.sub || !payload.role) return false;

    if (typeof payload.exp === 'number') {
        const nowSec = Math.floor(Date.now() / 1000);
        if (payload.exp <= nowSec + JWT_EXPIRY_SKEW_SEC) return false;
    }

    return true;
}

/** Milliseconds until JWT expires; 0 if missing/expired. */
export function getAccessTokenRemainingMs(): number {
    const payload = decodeAccessToken();
    if (!payload?.exp) return 0;
    return Math.max(0, payload.exp * 1000 - Date.now());
}

function clearExpiredToken(): void {
    clearAccessToken();
    if (typeof localStorage !== 'undefined') {
        localStorage.removeItem('user');
    }
}

/**
 * Get the currently authenticated user's ID from the NestJS JWT token.
 * This is the correct ID that matches customer_id in the orders table.
 */
export function getCurrentUserId(): string | null {
    if (!isAccessTokenValid()) {
        clearExpiredToken();
        return null;
    }
    return decodeAccessToken()?.sub ?? null;
}

/**
 * Get full user info from JWT token (null if missing, invalid, or expired).
 */
export function getCurrentUser(): { id: string; email: string; role: string } | null {
    if (!isAccessTokenValid()) {
        clearExpiredToken();
        return null;
    }

    const payload = decodeAccessToken();
    if (!payload?.sub || !payload.role) {
        clearExpiredToken();
        return null;
    }

    return {
        id: payload.sub,
        email: payload.email ?? '',
        role: payload.role,
    };
}

/**
 * Normalize backend roles (VENDOR, SUPER_ADMIN, etc.) to frontend roles (merchant, admin, customer)
 */
export function mapBackendRoleToFrontend(role: string | undefined): string {
    if (!role) return 'customer';
    const r = role.toUpperCase();
    if (r === 'VENDOR') return 'merchant';
    if (r === 'ADMIN' || r === 'SUPER_ADMIN' || r === 'SUPPORT' || r === 'VERIFICATION_OFFICER') return 'admin';
    if (r === 'CUSTOMER') return 'customer';
    return role.toLowerCase();
}
