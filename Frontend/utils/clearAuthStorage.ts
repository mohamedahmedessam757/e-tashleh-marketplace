/** Clears all client-side auth/session keys on logout */
export function clearAuthStorage(): void {
  const keys = [
    'access_token',
    'token',
    'user',
    'admin_role',
    'merchant_store_id',
    'userRole',
  ];
  keys.forEach((k) => localStorage.removeItem(k));
  sessionStorage.removeItem('admin');
  sessionStorage.removeItem('etashleh-admin-storage');
  try {
    sessionStorage.removeItem('profile-storage');
  } catch {
    /* ignore */
  }
}
