import { useCallback, useEffect, useState } from 'react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export interface PublicSystemStatus {
  maintenanceMode?: boolean;
  endTime?: string | null;
  maintenanceMsgAr?: string;
  maintenanceMsgEn?: string;
}

export function usePublicSystemStatus(pollMs = 30_000, enabled = true) {
  const [publicSystemStatus, setPublicSystemStatus] = useState<PublicSystemStatus | null>(null);

  const fetchPublicStatus = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/system/status`);
      if (res.ok) {
        setPublicSystemStatus(await res.json());
      }
    } catch {
      // fail-open: allow app when status endpoint is unreachable
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;

    let interval: ReturnType<typeof setInterval> | undefined;

    const startPolling = () => {
      void fetchPublicStatus();
      interval = setInterval(() => void fetchPublicStatus(), pollMs);
    };

    if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
      const idleId = window.requestIdleCallback(startPolling, { timeout: 5000 });
      return () => {
        window.cancelIdleCallback(idleId);
        if (interval) clearInterval(interval);
      };
    }

    const timeoutId = setTimeout(startPolling, 3000);
    return () => {
      clearTimeout(timeoutId);
      if (interval) clearInterval(interval);
    };
  }, [fetchPublicStatus, pollMs, enabled]);

  return { publicSystemStatus, fetchPublicStatus };
}
