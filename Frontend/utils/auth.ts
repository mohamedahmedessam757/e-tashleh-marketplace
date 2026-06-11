
/**
 * Get the currently authenticated user's ID from the NestJS JWT token stored in localStorage.
 * This is the correct ID that matches customer_id in the orders table.
 */
export function getCurrentUserId(): string | null {
    try {
        const token = localStorage.getItem('access_token');
        if (!token) return null;

        // JWT structure: header.payload.signature
        const parts = token.split('.');
        if (parts.length !== 3) return null;

        // Decode payload (Base64 URL encoded)
        const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));

        // The NestJS auth.service.ts sets payload as: { email, sub: user.id, role }
        return payload.sub || null;
    } catch (e) {
        console.error('Failed to decode JWT:', e);
        return null;
    }
}

/**
 * Get full user info from JWT token
 */
export function getCurrentUser(): { id: string; email: string; role: string } | null {
    try {
        const token = localStorage.getItem('access_token');
        if (!token) return null;

        const parts = token.split('.');
        if (parts.length !== 3) return null;

        const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));

        // Defensive check: If payload is empty or missing sub/role, it's an invalid session
        if (!payload || !payload.sub || !payload.role) {
            console.warn('[auth.ts] Invalid JWT payload detected:', payload);
            return null;
        }

        return {
            id: payload.sub,
            email: payload.email,
            role: payload.role
        };
    } catch (e) {
        console.error('Failed to decode JWT:', e);
        return null;
    }
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
