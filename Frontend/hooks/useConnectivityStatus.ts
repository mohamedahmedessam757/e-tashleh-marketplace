import { useCallback, useEffect, useRef, useState } from 'react';
import { probeHealth, probeSystemStatus } from '../utils/connectivityProbe';

export type ConnectivityLevel =
  | 'ok'
  | 'offline'
  | 'weak'
  | 'platform_down'
  | 'maintenance'
  | 'recovered';

export type PlatformDownCause = 'database' | 'api';

export interface ConnectivityDetail {
  maintenanceMsgAr?: string | null;
  maintenanceMsgEn?: string | null;
  rttMs?: number;
  platformCause?: PlatformDownCause;
}

export interface ConnectivityStatus {
  level: ConnectivityLevel;
  detail: ConnectivityDetail;
  dismissWeak: () => void;
  retryNow: () => void;
}

const API_URL = import.meta.env.VITE_API_URL || 'https://api.e-tashleh.net';
const WEAK_DISMISS_KEY = 'etashleh_weak_net_dismissed';
const WEAK_RTT_MS = 2500;
const WEAK_DEBOUNCE_MS = 8000;
const RECOVERED_MS = 2500;
const POLL_OK_MS = 20_000;
const POLL_BAD_MS = 5_000;
const PROBE_TIMEOUT_MS = 4000;
const CONFIRM_GAP_MS = 400;

type NavConnection = {
  effectiveType?: string;
  saveData?: boolean;
  addEventListener?: (type: string, listener: () => void) => void;
  removeEventListener?: (type: string, listener: () => void) => void;
};

function readBrowserWeakSignal(): boolean {
  if (typeof navigator === 'undefined') return false;
  const conn = (navigator as Navigator & { connection?: NavConnection }).connection;
  if (!conn) return false;
  const t = String(conn.effectiveType || '').toLowerCase();
  if (t === 'slow-2g' || t === '2g') return true;
  if (conn.saveData === true) return true;
  return false;
}

function isWeakDismissed(): boolean {
  try {
    return sessionStorage.getItem(WEAK_DISMISS_KEY) === '1';
  } catch {
    return false;
  }
}

function isHealthProblem(health: {
  degraded: boolean;
  errorKind: string | null;
}): boolean {
  return (
    health.degraded ||
    health.errorKind === 'network' ||
    health.errorKind === 'timeout' ||
    health.errorKind === 'http' ||
    health.errorKind === 'parse'
  );
}

function platformCauseFrom(health: {
  degraded: boolean;
  database: string;
}): PlatformDownCause {
  return health.degraded || health.database === 'unreachable' ? 'database' : 'api';
}

/**
 * Global connectivity / platform health for ConnectivityCapsule.
 * Priority: offline > maintenance > platform_down > weak > recovered > ok
 */
export function useConnectivityStatus(): ConnectivityStatus {
  const [level, setLevel] = useState<ConnectivityLevel>(() =>
    typeof navigator !== 'undefined' && !navigator.onLine ? 'offline' : 'ok',
  );
  const [detail, setDetail] = useState<ConnectivityDetail>({});

  const failStreakRef = useRef(0);
  const weakSinceRef = useRef<number | null>(null);
  const prevProblemRef = useRef(false);
  const recoveredUntilRef = useRef(0);
  const recoveredTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const probingRef = useRef(false);
  const mountedRef = useRef(true);
  const levelRef = useRef(level);
  levelRef.current = level;

  const clearPoll = useCallback(() => {
    if (pollTimerRef.current) {
      clearTimeout(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  }, []);

  const showRecoveredBriefly = useCallback(() => {
    if (recoveredTimerRef.current) clearTimeout(recoveredTimerRef.current);
    recoveredUntilRef.current = Date.now() + RECOVERED_MS;
    setLevel('recovered');
    recoveredTimerRef.current = setTimeout(() => {
      if (!mountedRef.current) return;
      recoveredUntilRef.current = 0;
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        setLevel('offline');
      } else {
        setLevel('ok');
      }
    }, RECOVERED_MS);
  }, []);

  const applyResolved = useCallback(
    (next: ConnectivityLevel, nextDetail: ConnectivityDetail = {}) => {
      if (!mountedRef.current) return;

      // Keep brief recovered toast visible; still allow new problems to interrupt
      if (next === 'ok' && Date.now() < recoveredUntilRef.current) {
        return;
      }

      const wasProblem = prevProblemRef.current;
      const isProblem =
        next === 'offline' ||
        next === 'maintenance' ||
        next === 'platform_down' ||
        next === 'weak';

      if (wasProblem && next === 'ok') {
        prevProblemRef.current = false;
        setDetail(nextDetail);
        showRecoveredBriefly();
        return;
      }

      if (isProblem) {
        recoveredUntilRef.current = 0;
        if (recoveredTimerRef.current) {
          clearTimeout(recoveredTimerRef.current);
          recoveredTimerRef.current = null;
        }
      }

      prevProblemRef.current = isProblem;
      setDetail(nextDetail);
      setLevel(next);
    },
    [showRecoveredBriefly],
  );

  const evaluateHealthyPath = useCallback(
    (rttMs: number) => {
      const browserWeak = readBrowserWeakSignal();
      const latencyWeak = rttMs > WEAK_RTT_MS;
      const weakSignal = browserWeak || latencyWeak;

      if (weakSignal && !isWeakDismissed()) {
        if (weakSinceRef.current == null) {
          weakSinceRef.current = Date.now();
        }
        const elapsed = Date.now() - weakSinceRef.current;
        if (elapsed >= WEAK_DEBOUNCE_MS) {
          applyResolved('weak', { rttMs });
          return;
        }
      } else {
        weakSinceRef.current = null;
      }

      applyResolved('ok', { rttMs });
    },
    [applyResolved],
  );

  const runProbe = useCallback(async () => {
    if (probingRef.current) return;
    if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
      return;
    }

    probingRef.current = true;
    try {
      const online = typeof navigator === 'undefined' ? true : navigator.onLine;

      if (!online) {
        failStreakRef.current = 0;
        weakSinceRef.current = null;
        applyResolved('offline');
        return;
      }

      const [health, status] = await Promise.all([
        probeHealth(API_URL, PROBE_TIMEOUT_MS),
        probeSystemStatus(API_URL, PROBE_TIMEOUT_MS),
      ]);

      if (!mountedRef.current) return;

      // Maintenance (intentional) — only when status probe succeeded
      if (status.ok && status.maintenanceMode) {
        failStreakRef.current = 0;
        weakSinceRef.current = null;
        applyResolved('maintenance', {
          maintenanceMsgAr: status.maintenanceMsgAr,
          maintenanceMsgEn: status.maintenanceMsgEn,
        });
        return;
      }

      if (isHealthProblem(health)) {
        failStreakRef.current += 1;
        const confirmed =
          health.degraded ||
          failStreakRef.current >= 2 ||
          levelRef.current === 'platform_down';

        if (confirmed) {
          weakSinceRef.current = null;
          applyResolved('platform_down', {
            rttMs: health.rttMs,
            platformCause: platformCauseFrom(health),
          });
          return;
        }

        // First unconfirmed failure — quick confirm probe (anti-flicker)
        await new Promise((r) => setTimeout(r, CONFIRM_GAP_MS));
        if (!mountedRef.current) return;
        if (typeof navigator !== 'undefined' && !navigator.onLine) {
          applyResolved('offline');
          return;
        }

        const confirmHealth = await probeHealth(API_URL, PROBE_TIMEOUT_MS);
        if (isHealthProblem(confirmHealth)) {
          failStreakRef.current += 1;
          weakSinceRef.current = null;
          applyResolved('platform_down', {
            rttMs: confirmHealth.rttMs,
            platformCause: platformCauseFrom(confirmHealth),
          });
          return;
        }

        // Transient blip recovered — continue as healthy
        failStreakRef.current = 0;
        evaluateHealthyPath(confirmHealth.rttMs);
        return;
      }

      failStreakRef.current = 0;
      evaluateHealthyPath(health.rttMs);
    } finally {
      probingRef.current = false;
    }
  }, [applyResolved, evaluateHealthyPath]);

  const scheduleNext = useCallback(() => {
    if (!mountedRef.current) return;
    clearPoll();
    if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
      return;
    }
    const bad =
      levelRef.current === 'offline' ||
      levelRef.current === 'platform_down' ||
      levelRef.current === 'maintenance' ||
      levelRef.current === 'weak';
    const delay = bad ? POLL_BAD_MS : POLL_OK_MS;
    pollTimerRef.current = setTimeout(() => {
      void runProbe().finally(() => scheduleNext());
    }, delay);
  }, [clearPoll, runProbe]);

  const retryNow = useCallback(() => {
    failStreakRef.current = 0;
    clearPoll();
    void runProbe().finally(() => scheduleNext());
  }, [clearPoll, runProbe, scheduleNext]);

  const dismissWeak = useCallback(() => {
    try {
      sessionStorage.setItem(WEAK_DISMISS_KEY, '1');
    } catch {
      /* private mode / blocked storage */
    }
    weakSinceRef.current = null;
    if (levelRef.current === 'weak') {
      // User dismissed warning — do not show "recovered" celebration
      prevProblemRef.current = false;
      setLevel('ok');
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;

    const onOffline = () => {
      failStreakRef.current = 0;
      weakSinceRef.current = null;
      applyResolved('offline');
      scheduleNext();
    };

    const onOnline = () => {
      // Don't trust navigator.onLine alone — probe immediately
      failStreakRef.current = 0;
      void runProbe().finally(() => scheduleNext());
    };

    const onVisibility = () => {
      if (document.visibilityState === 'hidden') {
        clearPoll();
        return;
      }
      void runProbe().finally(() => scheduleNext());
    };

    window.addEventListener('offline', onOffline);
    window.addEventListener('online', onOnline);
    document.addEventListener('visibilitychange', onVisibility);

    const conn = (navigator as Navigator & { connection?: NavConnection }).connection;
    const onConnectionChange = () => {
      void runProbe().finally(() => scheduleNext());
    };
    conn?.addEventListener?.('change', onConnectionChange);

    void runProbe().finally(() => scheduleNext());

    return () => {
      mountedRef.current = false;
      clearPoll();
      if (recoveredTimerRef.current) clearTimeout(recoveredTimerRef.current);
      window.removeEventListener('offline', onOffline);
      window.removeEventListener('online', onOnline);
      document.removeEventListener('visibilitychange', onVisibility);
      conn?.removeEventListener?.('change', onConnectionChange);
    };
  }, [applyResolved, clearPoll, runProbe, scheduleNext]);

  return { level, detail, dismissWeak, retryNow };
}
