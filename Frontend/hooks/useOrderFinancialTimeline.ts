import { useCallback, useEffect, useRef, useState } from 'react';
import { API_URL } from '../services/api/config';

export interface OrderTimelineEvent {
  id: string;
  eventType: string;
  eventTypeEn?: string;
  eventTypeAr?: string;
  timestamp: string;
  status?: string;
  direction?: string;
  amount?: number;
  actor?: { type: string; name: string | null };
  descriptionEn: string;
  descriptionAr: string;
}

export interface OrderFinancialTimelineData {
  order: { id: string; orderNumber: string; status: string; createdAt: string };
  customer: { id: string; name: string; avatar: string | null };
  merchants: Array<{ id: string; name: string; logo: string | null; storeCode: string | null }>;
  timeline: OrderTimelineEvent[];
  summary: {
    totalPaid: number;
    totalCommission: number;
    shippingCosts: number;
    merchantEarnings: number;
    totalRefunded: number;
    escrowStatus: string;
    hasDispute: boolean;
    hasReturn: boolean;
  };
}

const memoryCache = new Map<string, OrderFinancialTimelineData>();

export class OrderFinancialTimelineHttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = 'OrderFinancialTimelineHttpError';
    this.status = status;
  }
}

function timelineFingerprint(data: OrderFinancialTimelineData): string {
  const last = data.timeline[data.timeline.length - 1];
  return [
    data.timeline.length,
    last?.id ?? '',
    last?.timestamp ?? '',
    data.summary.totalPaid,
    data.summary.totalRefunded,
    data.summary.escrowStatus,
  ].join('|');
}

async function fetchTimelineFromApi(
  orderId: string,
  signal?: AbortSignal,
): Promise<OrderFinancialTimelineData> {
  const token = localStorage.getItem('access_token');
  const res = await fetch(
    `${API_URL}/payments/admin/order-financial-timeline/${encodeURIComponent(orderId)}`,
    {
      headers: { Authorization: `Bearer ${token}` },
      signal,
    },
  );
  if (!res.ok) {
    throw new OrderFinancialTimelineHttpError(res.status, `Timeline request failed (${res.status})`);
  }
  return res.json();
}

export function useOrderFinancialTimeline(orderId: string) {
  const cached = memoryCache.get(orderId) ?? null;
  const [data, setData] = useState<OrderFinancialTimelineData | null>(cached);
  const [loading, setLoading] = useState(!cached);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const fingerprintRef = useRef(cached ? timelineFingerprint(cached) : '');

  const load = useCallback(
    async (silent = false) => {
      const existing = memoryCache.get(orderId);
      if (!silent) {
        if (existing) {
          setData(existing);
          setLoading(false);
        } else {
          setLoading(true);
        }
      } else if (existing) {
        setRefreshing(true);
      }

      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const next = await fetchTimelineFromApi(orderId, controller.signal);
        if (controller.signal.aborted) return;

        setError(null);
        const fp = timelineFingerprint(next);
        if (fp !== fingerprintRef.current) {
          fingerprintRef.current = fp;
          memoryCache.set(orderId, next);
          setData(next);
        } else if (!existing) {
          memoryCache.set(orderId, next);
          setData(next);
        }
      } catch (err) {
        if ((err as Error).name === 'AbortError') return;
        console.error('Failed to fetch order financial timeline', err);
        if (!existing) {
          setError((err as Error).message || 'load_failed');
          setData(null);
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [orderId],
  );

  useEffect(() => {
    load(false);
    return () => {
      abortRef.current?.abort();
    };
  }, [load]);

  const silentRefresh = useCallback(() => {
    if (document.hidden) return;
    load(true);
  }, [load]);

  return { data, loading, refreshing, error, silentRefresh };
}
