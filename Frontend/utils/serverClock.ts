import { client } from '../services/api/client';

/** Offset such that getServerNowMs() ≈ server wall clock. */
let clockOffsetMs = 0;
let lastSyncAtMs = 0;
let syncInflight: Promise<void> | null = null;

const SYNC_MIN_INTERVAL_MS = 60_000;

/**
 * Fetch server time and update local offset.
 * On failure keeps previous offset (0 if never synced) — never throws.
 */
export async function syncServerClock(force = false): Promise<void> {
  const now = Date.now();
  if (!force && lastSyncAtMs > 0 && now - lastSyncAtMs < SYNC_MIN_INTERVAL_MS) {
    return;
  }
  if (syncInflight) return syncInflight;

  syncInflight = (async () => {
    try {
      const t0 = Date.now();
      const { data } = await client.get<{ serverNow: string }>('/meta/server-time');
      const t1 = Date.now();
      const serverMs = new Date(data.serverNow).getTime();
      if (!Number.isFinite(serverMs)) return;
      // Midpoint of RTT approximates when the server stamped serverNow
      const localMid = (t0 + t1) / 2;
      clockOffsetMs = serverMs - localMid;
      lastSyncAtMs = Date.now();
    } catch {
      // Keep existing offset; callers fall back to Date.now() when offset is 0
    } finally {
      syncInflight = null;
    }
  })();

  return syncInflight;
}

/** Approximate server wall-clock milliseconds. */
export function getServerNowMs(): number {
  return Date.now() + clockOffsetMs;
}

export function getClockOffsetMs(): number {
  return clockOffsetMs;
}
