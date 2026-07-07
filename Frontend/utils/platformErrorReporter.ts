import { API_URL } from '../services/api/config';
import { getCorrelationId } from './correlationId';
import { getCurrentUser } from './auth';

type ReportPayload = {
  errorName: string;
  message: string;
  componentStack?: string;
  httpStatus?: number;
  requestPath?: string;
  metadata?: Record<string, unknown>;
};

const recent = new Map<string, number>();
const DEBOUNCE_MS = 10_000;

function inferDeviceClass(): 'mobile' | 'tablet' | 'desktop' | 'unknown' {
  const ua = navigator.userAgent.toLowerCase();
  if (/mobile|android|iphone|ipod/.test(ua)) return 'mobile';
  if (/ipad|tablet/.test(ua)) return 'tablet';
  if (ua) return 'desktop';
  return 'unknown';
}

function mapUserRole(role?: string): 'GUEST' | 'CUSTOMER' | 'MERCHANT' | 'ADMIN' {
  if (role === 'ADMIN' || role === 'SUPER_ADMIN' || role === 'VERIFICATION_OFFICER') return 'ADMIN';
  if (role === 'VENDOR') return 'MERCHANT';
  if (role === 'CUSTOMER') return 'CUSTOMER';
  return 'GUEST';
}

function shouldSend(key: string): boolean {
  const now = Date.now();
  const last = recent.get(key) || 0;
  if (now - last < DEBOUNCE_MS) return false;
  recent.set(key, now);
  return true;
}

export async function reportPlatformError(payload: ReportPayload): Promise<void> {
  const fingerprint = `${payload.errorName}:${payload.message.slice(0, 120)}:${payload.requestPath || window.location.pathname}`;
  if (!shouldSend(fingerprint)) return;

  const user = getCurrentUser();
  const token = localStorage.getItem('access_token');

  try {
    await fetch(`${API_URL}/system/client-errors`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Correlation-Id': getCorrelationId(),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        correlationId: getCorrelationId(),
        errorName: payload.errorName,
        message: payload.message,
        pagePath: window.location.pathname,
        pageLabel: document.title,
        userRole: mapUserRole(user?.role),
        locale: document.documentElement.lang || 'ar',
        deviceClass: inferDeviceClass(),
        componentStack: payload.componentStack,
        httpStatus: payload.httpStatus,
        requestPath: payload.requestPath,
        metadata: {
          ...payload.metadata,
          href: window.location.href,
        },
      }),
    });
  } catch {
    // swallow — error reporter must not throw
  }
}

let initialized = false;

export function initPlatformErrorReporter(): void {
  if (initialized || typeof window === 'undefined') return;
  initialized = true;

  window.addEventListener('error', (event) => {
    void reportPlatformError({
      errorName: event.error?.name || 'Error',
      message: event.message || 'Unknown error',
      componentStack: event.error?.stack,
    });
  });

  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason;
    void reportPlatformError({
      errorName: reason?.name || 'UnhandledPromiseRejection',
      message: typeof reason === 'string' ? reason : reason?.message || 'Unhandled rejection',
      componentStack: reason?.stack,
    });
  });
}
