/**
 * Lightweight platform health probe for connectivity capsules.
 * Uses existing GET /health — no new backend endpoints.
 */

export type HealthProbeErrorKind =
  | null
  | 'timeout'
  | 'network'
  | 'http'
  | 'parse';

export interface HealthProbeResult {
  ok: boolean;
  /** True when API responded but DB is unreachable / status degraded */
  degraded: boolean;
  database: 'connected' | 'unreachable' | 'unknown';
  rttMs: number;
  errorKind: HealthProbeErrorKind;
  statusCode?: number;
}

const DEFAULT_TIMEOUT_MS = 4000;
/** Cap admin-authored maintenance copy to avoid oversized UI payloads */
const MAX_STATUS_MSG_LEN = 280;

function sanitizeStatusMessage(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const cleaned = value
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (!cleaned) return null;
  return cleaned.length > MAX_STATUS_MSG_LEN
    ? `${cleaned.slice(0, MAX_STATUS_MSG_LEN)}…`
    : cleaned;
}

export async function probeHealth(
  apiBase: string,
  timeoutMs: number = DEFAULT_TIMEOUT_MS,
): Promise<HealthProbeResult> {
  const base = apiBase.replace(/\/$/, '');
  const url = `${base}/health`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const started = performance.now();

  try {
    const res = await fetch(url, {
      method: 'GET',
      cache: 'no-store',
      signal: controller.signal,
      credentials: 'omit',
      // Health is public; avoid sending cookies/auth headers
      mode: 'cors',
    });
    const rttMs = Math.round(performance.now() - started);

    if (!res.ok) {
      return {
        ok: false,
        degraded: false,
        database: 'unknown',
        rttMs,
        errorKind: 'http',
        statusCode: res.status,
      };
    }

    let body: { status?: string; database?: string } = {};
    try {
      body = await res.json();
    } catch {
      return {
        ok: false,
        degraded: false,
        database: 'unknown',
        rttMs,
        errorKind: 'parse',
        statusCode: res.status,
      };
    }

    const database =
      body.database === 'connected' || body.database === 'unreachable'
        ? body.database
        : 'unknown';
    const degraded =
      body.status === 'degraded' || database === 'unreachable';

    return {
      ok: !degraded,
      degraded,
      database,
      rttMs,
      errorKind: null,
      statusCode: res.status,
    };
  } catch (err: unknown) {
    const rttMs = Math.round(performance.now() - started);
    const isAbort =
      (err instanceof DOMException && err.name === 'AbortError') ||
      (err instanceof Error && err.name === 'AbortError');

    return {
      ok: false,
      degraded: false,
      database: 'unknown',
      rttMs,
      errorKind: isAbort ? 'timeout' : 'network',
    };
  } finally {
    clearTimeout(timer);
  }
}

export interface SystemStatusProbeResult {
  ok: boolean;
  maintenanceMode: boolean;
  maintenanceMsgAr?: string | null;
  maintenanceMsgEn?: string | null;
  errorKind: HealthProbeErrorKind;
}

export async function probeSystemStatus(
  apiBase: string,
  timeoutMs: number = DEFAULT_TIMEOUT_MS,
): Promise<SystemStatusProbeResult> {
  const base = apiBase.replace(/\/$/, '');
  const url = `${base}/system/status`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      method: 'GET',
      cache: 'no-store',
      signal: controller.signal,
      credentials: 'omit',
      mode: 'cors',
    });

    if (!res.ok) {
      return {
        ok: false,
        maintenanceMode: false,
        errorKind: 'http',
      };
    }

    let body: Record<string, unknown> = {};
    try {
      body = await res.json();
    } catch {
      return {
        ok: false,
        maintenanceMode: false,
        errorKind: 'parse',
      };
    }

    return {
      ok: true,
      maintenanceMode: body?.maintenanceMode === true,
      maintenanceMsgAr: sanitizeStatusMessage(body?.maintenanceMsgAr),
      maintenanceMsgEn: sanitizeStatusMessage(body?.maintenanceMsgEn),
      errorKind: null,
    };
  } catch (err: unknown) {
    const isAbort =
      (err instanceof DOMException && err.name === 'AbortError') ||
      (err instanceof Error && err.name === 'AbortError');
    return {
      ok: false,
      maintenanceMode: false,
      errorKind: isAbort ? 'timeout' : 'network',
    };
  } finally {
    clearTimeout(timer);
  }
}
