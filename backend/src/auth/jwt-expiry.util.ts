const STAFF_ROLES = new Set([
    'ADMIN',
    'SUPER_ADMIN',
    'SUPPORT',
    'ACCOUNTANT',
]);

/**
 * Customer/vendor sessions: 7d default (WhatsApp deep links).
 * Staff: shorter admin session (1d default).
 * Verification officers: short-lived JWT (non-persistent client session + shorter server exp).
 */
export function resolveJwtExpiresIn(role: string): string {
    if (role === 'VERIFICATION_OFFICER') {
        return process.env.JWT_EXPIRES_IN_VERIFICATION_OFFICER?.trim() || '4h';
    }
    if (STAFF_ROLES.has(role)) {
        // Staff must never inherit JWT_EXPIRES_IN (often 7d for customers/vendors).
        return process.env.JWT_EXPIRES_IN_ADMIN?.trim() || '1d';
    }
    if (role === 'CUSTOMER' || role === 'VENDOR') {
        return (
            process.env.JWT_EXPIRES_IN_CUSTOMER?.trim() ||
            process.env.JWT_EXPIRES_IN?.trim() ||
            '7d'
        );
    }
    return process.env.JWT_EXPIRES_IN?.trim() || '1d';
}
