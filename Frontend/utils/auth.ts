
const JWT_EXPIRY_SKEW_SEC = 60;

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

/** Decode JWT payload without validating expiry (internal use). */
export function decodeAccessToken(token?: string | null): DecodedAccessToken | null {
    if (!token) {
        token = typeof localStorage !== 'undefined' ? localStorage.getItem('access_token') : null;
    }
    if (!token) return null;
    return decodeJwtPayload(token);
}

/** Returns false if token is missing, malformed, or past exp (with 60s skew). */
export function isAccessTokenValid(token?: string | null): boolean {
    const resolved =
        token ?? (typeof localStorage !== 'undefined' ? localStorage.getItem('access_token') : null);
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
    if (typeof localStorage === 'undefined') return;
    localStorage.removeItem('access_token');
    localStorage.removeItem('user');
}

/**
 * Get the currently authenticated user's ID from the NestJS JWT token stored in localStorage.
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
