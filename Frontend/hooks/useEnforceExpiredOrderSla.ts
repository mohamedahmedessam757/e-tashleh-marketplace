import { useEffect, useRef } from 'react';
import { ordersApi } from '../services/api/orders';
import { useOrderStore } from '../stores/useOrderStore';
import { shouldEnforceExpiredSla } from '../utils/orderExpiryHelpers';

type OrderLike = {
  id?: string;
  status?: string;
  selectionDeadlineAt?: string | null;
  paymentDeadlineAt?: string | null;
  createdAt?: string;
  date?: string;
  updatedAt?: string | null;
} | null | undefined;

/**
 * When selection/payment SLA has elapsed client-side but status is still open,
 * immediately ask the backend to cancel (idempotent). Cron remains the safety net.
 */
export function useEnforceExpiredOrderSla(order: OrderLike) {
  const inFlight = useRef<string | null>(null);

  useEffect(() => {
    if (!order?.id || !shouldEnforceExpiredSla(order)) return;
    if (inFlight.current === order.id) return;

    let cancelled = false;
    inFlight.current = order.id;

    void (async () => {
      try {
        const result = await ordersApi.enforceExpiredSla(order.id!);
        if (cancelled) return;
        if (result?.changed) {
          await useOrderStore.getState().fetchOrder(order.id!);
        } else {
          // Status may already be cancelled via cron/realtime — refresh once.
          await useOrderStore.getState().fetchOrder(order.id!);
        }
      } catch (err) {
        console.warn('[useEnforceExpiredOrderSla] failed', err);
        inFlight.current = null;
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    order?.id,
    order?.status,
    order?.selectionDeadlineAt,
    order?.paymentDeadlineAt,
    order?.updatedAt,
  ]);
}
