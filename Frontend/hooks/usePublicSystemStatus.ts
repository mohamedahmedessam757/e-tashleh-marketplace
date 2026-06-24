import { useCallback, useEffect, useState } from 'react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export interface PublicSystemStatus {
  maintenanceMode?: boolean;
  endTime?: string | null;
  maintenanceMsgAr?: string;
  maintenanceMsgEn?: string;
}

export function usePublicSystemStatus(pollMs = 30_000) {
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
    void fetchPublicStatus();
    const interval = setInterval(() => void fetchPublicStatus(), pollMs);
    return () => clearInterval(interval);
  }, [fetchPublicStatus, pollMs]);

  return { publicSystemStatus, fetchPublicStatus };
}
