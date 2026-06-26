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
const inflight = new Map<string, Promise<OrderFinancialTimelineData | null>>();

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
): Promise<OrderFinancialTimelineData | null> {
  const token = localStorage.getItem('access_token');
  const res = await fetch(`${API_URL}/payments/admin/order-financial-timeline/${orderId}`, {
    headers: { Authorization: `Bearer ${token}` },
    signal,
  });
  if (!res.ok) return null;
  return res.json();
}

export function useOrderFinancialTimeline(orderId: string) {
  const cached = memoryCache.get(orderId) ?? null;
  const [data, setData] = useState<OrderFinancialTimelineData | null>(cached);
  const [loading, setLoading] = useState(!cached);
  const [refreshing, setRefreshing] = useState(false);
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

      let promise = inflight.get(orderId);
      if (!promise) {
        promise = fetchTimelineFromApi(orderId, controller.signal).finally(() => {
          inflight.delete(orderId);
        });
        inflight.set(orderId, promise);
      }

      try {
        const next = await promise;
        if (controller.signal.aborted || !next) {
          if (!silent && !existing) setLoading(false);
          setRefreshing(false);
          return;
        }

        const fp = timelineFingerprint(next);
        if (fp !== fingerprintRef.current) {
          fingerprintRef.current = fp;
          memoryCache.set(orderId, next);
          setData(next);
        }
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          console.error('Failed to fetch order financial timeline', err);
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

  return { data, loading, refreshing, silentRefresh };
}
