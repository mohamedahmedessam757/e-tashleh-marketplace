export const VIOLATION_NAV_KEY = 'violation_nav';

export interface ViolationNavContext {
  tab?: string;
  highlightId?: string;
}

export function setViolationNavContext(ctx: ViolationNavContext): void {
  try {
    sessionStorage.setItem(VIOLATION_NAV_KEY, JSON.stringify(ctx));
  } catch {
    /* ignore */
  }
}

export function consumeViolationNavContext(): ViolationNavContext | null {
  try {
    const raw = sessionStorage.getItem(VIOLATION_NAV_KEY);
    if (!raw) return null;
    sessionStorage.removeItem(VIOLATION_NAV_KEY);
    return JSON.parse(raw) as ViolationNavContext;
  } catch {
    return null;
  }
}

export function normalizeNotificationLink(link: string): string {
  return link
    .replace(/^\/dashboard\//, '')
    .replace(/^\/merchant\//, '')
    .replace(/^\//, '');
}

export function resolveNotificationNavigation(
  notif: { link?: string | null; metadata?: Record<string, unknown> | null; type?: string },
): { path: string; context?: ViolationNavContext } | null {
  const meta = notif.metadata ?? {};
  const violationId = meta.violationId as string | undefined;
  const tab = meta.tab as string | undefined;
  const penaltyId = meta.penaltyId as string | undefined;
  const appealId = meta.appealId as string | undefined;

  if (
    violationId ||
    penaltyId ||
    appealId ||
    tab ||
    notif.type === 'VIOLATION' ||
    notif.type === 'LOYALTY_REVIEW' ||
    notif.type === 'CHAT_VIOLATION'
  ) {
    const resolvedTab =
      tab ||
      (penaltyId ? 'penalties' : undefined) ||
      (appealId ? 'appeals' : undefined) ||
      (notif.type === 'LOYALTY_REVIEW' ? 'loyalty_reviews' : undefined) ||
      'violations';

    return {
      path: 'violations',
      context: {
        tab: resolvedTab,
        highlightId: violationId || penaltyId || appealId,
      },
    };
  }

  if (notif.link) {
    return { path: normalizeNotificationLink(notif.link) };
  }

  return null;
}
