/**
 * Pure helpers for account write / access decisions — unit-testable without Nest DI.
 */

export type AccessUser = {
  accountAccessBlocked?: boolean;
  adminInactive?: boolean;
  status?: string;
};

export function isAccountAccessBlocked(user?: AccessUser | null): boolean {
  if (!user) return false;
  return (
    user.accountAccessBlocked === true ||
    user.adminInactive === true ||
    user.status === 'SUSPENDED' ||
    user.status === 'BLOCKED'
  );
}

export function isMutatingHttpMethod(method?: string): boolean {
  const m = String(method || 'GET').toUpperCase();
  return m !== 'GET' && m !== 'HEAD' && m !== 'OPTIONS';
}

export function isAccountWriteAllowedPath(pathRaw?: string): boolean {
  const path = String(pathRaw || '').toLowerCase();
  const allowPrefixes = [
    '/auth/logout',
    '/auth/refresh',
    '/auth/me',
    '/auth/profile',
    '/auth/otp',
    '/notifications',
  ];
  return allowPrefixes.some((p) => path.includes(p));
}

export function shouldBlockAccountWrite(
  user: AccessUser | null | undefined,
  method: string,
  path: string,
): boolean {
  if (!isAccountAccessBlocked(user)) return false;
  if (!isMutatingHttpMethod(method)) return false;
  if (isAccountWriteAllowedPath(path)) return false;
  return true;
}

export function resolveAccessBannerKind(input: {
  status?: string | null;
  suspendedUntil?: string | Date | null;
}): 'PERMANENT' | 'TEMPORARY' {
  const status = String(input.status || '').toUpperCase();
  if (status === 'BLOCKED') return 'PERMANENT';
  if (status === 'SUSPENDED') return 'TEMPORARY';
  return 'PERMANENT';
}
