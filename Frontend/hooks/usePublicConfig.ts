import { useEffect, useState } from 'react';

const API_URL = import.meta.env.VITE_API_URL || 'https://api.e-tashleh.net';

export interface PublicConfig {
  general?: Record<string, unknown>;
  orderDurations?: {
    assemblyCartDays?: number;
    returnWindowHours?: number;
    disputeWindowHours?: number;
    paymentTimeoutHours?: number;
  };
  logistics?: {
    globalMinWeightKg?: number;
    globalMaxWeightKg?: number;
  };
  company?: Record<string, unknown>;
}

let cachedConfig: PublicConfig | null = null;
let cacheExpiry = 0;

export async function fetchPublicConfig(force = false): Promise<PublicConfig> {
  if (!force && cachedConfig && Date.now() < cacheExpiry) return cachedConfig;
  const res = await fetch(`${API_URL}/system/public-config`);
  if (!res.ok) throw new Error('Failed to load public config');
  cachedConfig = await res.json();
  cacheExpiry = Date.now() + 60_000;
  return cachedConfig!;
}

export function usePublicConfig() {
  const [config, setConfig] = useState<PublicConfig | null>(cachedConfig);
  const [loading, setLoading] = useState(!cachedConfig);

  useEffect(() => {
    let cancelled = false;
    fetchPublicConfig()
      .then((c) => { if (!cancelled) setConfig(c); })
      .catch(() => undefined)
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  return { config, loading };
}
