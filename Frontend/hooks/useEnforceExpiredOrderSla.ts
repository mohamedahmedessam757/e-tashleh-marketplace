import { useEffect, useRef } from 'react';
import { ordersApi } from '../services/api/orders';
import { useOrderStore } from '../stores/useOrderStore';
import { shouldEnforceExpiredSla } from '../utils/orderExpiryHelpers';
import { useOrderActiveSla } from './useOrderActiveSla';
import { getServerNowMs } from '../utils/serverClock';

type OrderLike = {
  id?: string;
  status?: string;
  selectionDeadlineAt?: string | null;
  paymentDeadlineAt?: string | null;
  revealOffersAt?: string | null;
  delayedPreparationDeadlineAt?: string | null;
  correctionDeadlineAt?: string | null;
  deliveredAt?: string | null;
  warranty_end_at?: string | null;
  createdAt?: string;
  date?: string;
  updatedAt?: string | null;
  activeSla?: { endsAt?: string; urgency?: string } | null;
} | null | undefined;

const TIMER_DRIVEN_STATUSES = new Set([
  'AWAITING_OFFERS',
  'COLLECTING_OFFERS',
  'AWAITING_SELECTION',
  'AWAITING_PAYMENT',
  'PARTIALLY_PAID',
  'PREPARATION',
  'DELAYED_PREPARATION',
  'NON_MATCHING',
  'CORRECTION_PERIOD',
  'DELIVERED',
  'PARTIALLY_DELIVERED',
  'WARRANTY_ACTIVE',
]);

/**
 * When any timer-driven SLA has elapsed (server clock), ask the backend to apply
 * the due transition (idempotent). Cron remains the safety net.
 */
export function useEnforceExpiredOrderSla(order: OrderLike) {
  const sla = useOrderActiveSla(order as any);
  const inFlight = useRef<string | null>(null);

  useEffect(() => {
    if (!order?.id) return;
    const status = String(order.status || '');
    if (!TIMER_DRIVEN_STATUSES.has(status)) return;

    const endsAtMs = sla?.endsAt ? new Date(sla.endsAt).getTime() : null;
    const slaExpired =
      sla?.urgency === 'expired' ||
      (endsAtMs != null && Number.isFinite(endsAtMs) && getServerNowMs() >= endsAtMs);
    const selectionPaymentExpired = shouldEnforceExpiredSla(order);
    if (!slaExpired && !selectionPaymentExpired) return;
    if (inFlight.current === order.id) return;

    let cancelled = false;
    inFlight.current = order.id;

    void (async () => {
      try {
        await ordersApi.enforceExpiredSla(order.id!);
        if (cancelled) return;
        await useOrderStore.getState().fetchOrder(order.id!);
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
    order?.revealOffersAt,
    order?.delayedPreparationDeadlineAt,
    order?.correctionDeadlineAt,
    order?.deliveredAt,
    order?.warranty_end_at,
    order?.updatedAt,
    sla?.endsAt,
    sla?.urgency,
  ]);
}
