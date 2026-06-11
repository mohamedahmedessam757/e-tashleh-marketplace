const STORAGE_PREFIX = 'mp_dismissed_notification_popups';
const MAX_STORED = 200;

export function getDismissedPopupIds(userId: string): Set<string> {
  if (!userId || typeof localStorage === 'undefined') return new Set();
  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}_${userId}`);
    const parsed = raw ? JSON.parse(raw) : [];
    return new Set(Array.isArray(parsed) ? parsed.filter(Boolean) : []);
  } catch {
    return new Set();
  }
}

export function addDismissedPopupId(userId: string, notificationId: string): void {
  if (!userId || !notificationId || typeof localStorage === 'undefined') return;
  const set = getDismissedPopupIds(userId);
  set.add(notificationId);
  const arr = [...set];
  const trimmed = arr.length > MAX_STORED ? arr.slice(-MAX_STORED) : arr;
  localStorage.setItem(`${STORAGE_PREFIX}_${userId}`, JSON.stringify(trimmed));
}

export function isPopupDismissed(userId: string, notificationId: string): boolean {
  if (!userId || !notificationId) return false;
  return getDismissedPopupIds(userId).has(notificationId);
}
