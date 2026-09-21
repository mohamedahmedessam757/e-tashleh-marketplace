import { useEffect, useRef, useState } from 'react';
import { ordersApi } from '../services/api/orders';
import { useOrderStore } from '../stores/useOrderStore';
import { shouldEnforceExpiredSla } from '../utils/orderExpiryHelpers';
import { useOrderActiveSla } from './useOrderActiveSla';
import { getServerNowMs } from '../utils/serverClock';

type VerificationDocLike = {
  offerId?: string | null;
  adminStatus?: string | null;
  correctionDeadlineAt?: string | Date | null;
};

type OrderLike = {
  id?: string;
  status?: string;
  requestType?: string | null;
  parts?: unknown[] | null;
  selectionDeadlineAt?: string | null;
  paymentDeadlineAt?: string | null;
  revealOffersAt?: string | null;
  delayedPreparationDeadlineAt?: string | null;
  preparationDeadlineAt?: string | null;
  correctionDeadlineAt?: string | null;
  deliveredAt?: string | null;
  warranty_end_at?: string | null;
  createdAt?: string;
  date?: string;
  updatedAt?: string | null;
  activeSla?: { endsAt?: string; urgency?: string } | null;
  verificationDocuments?: VerificationDocLike[];
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
  // Multi-item stays in VERIFICATION while a single offer's correction doc expires.
  'VERIFICATION',
  'PREPARED',
  'VERIFICATION_SUCCESS',
]);

const POST_SUCCESS_COOLDOWN_MS = 2_000;

function hasExpiredOfferCorrectionDoc(order: OrderLike, nowMs: number): boolean {
  const docs = order?.verificationDocuments;
  if (!docs?.length) return false;
  const isMulti =
    String(order?.requestType || '').toLowerCase() === 'multiple' ||
    (Array.isArray(order?.parts) && order!.parts!.length > 1);
  if (!isMulti) return false;

  return docs.some((d) => {
    if (String(d?.adminStatus || '').toUpperCase() !== 'REJECTED') return false;
    if (!d?.offerId || !d?.correctionDeadlineAt) return false;
    const ends = new Date(d.correctionDeadlineAt).getTime();
    return Number.isFinite(ends) && nowMs >= ends;
  });
}

/**
 * When any timer-driven SLA has elapsed (server clock), ask the backend to apply
 * the due transition (idempotent). Cron remains the safety net.
 *
 * Ticks every 1s while the open order is timer-driven so per-offer correction
 * deadlines fire immediately at 00:00:00 (not only when React deps change).
 */
export function useEnforceExpiredOrderSla(order: OrderLike) {
  const sla = useOrderActiveSla(order as any);
  const inFlight = useRef(false);
  const cooldownUntilMs = useRef(0);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!order?.id) return;
    const status = String(order.status || '');
    if (!TIMER_DRIVEN_STATUSES.has(status)) return;

    const id = window.setInterval(() => setTick((n) => n + 1), 1000);
    return () => window.clearInterval(id);
  }, [order?.id, order?.status]);

  useEffect(() => {
    if (!order?.id) return;
    const status = String(order.status || '');
    if (!TIMER_DRIVEN_STATUSES.has(status)) return;

    const nowMs = getServerNowMs();
    const endsAtMs = sla?.endsAt ? new Date(sla.endsAt).getTime() : null;
    const slaExpired =
      sla?.urgency === 'expired' ||
      (endsAtMs != null && Number.isFinite(endsAtMs) && nowMs >= endsAtMs);
    const selectionPaymentExpired = shouldEnforceExpiredSla(order);
    const offerCorrectionExpired = hasExpiredOfferCorrectionDoc(order, nowMs);
    if (!slaExpired && !selectionPaymentExpired && !offerCorrectionExpired) return;
    if (inFlight.current) return;
    if (Date.now() < cooldownUntilMs.current) return;

    let cancelled = false;
    inFlight.current = true;

    void (async () => {
      try {
        await ordersApi.enforceExpiredSla(order.id!);
        if (cancelled) return;
        await useOrderStore.getState().fetchOrder(order.id!);
        cooldownUntilMs.current = Date.now() + POST_SUCCESS_COOLDOWN_MS;
      } catch (err) {
        console.warn('[useEnforceExpiredOrderSla] failed', err);
        // Brief backoff so a transient error does not hammer the API every tick.
        cooldownUntilMs.current = Date.now() + POST_SUCCESS_COOLDOWN_MS;
      } finally {
        inFlight.current = false;
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    tick,
    order?.id,
    order?.status,
    order?.requestType,
    order?.parts,
    order?.selectionDeadlineAt,
    order?.paymentDeadlineAt,
    order?.revealOffersAt,
    order?.delayedPreparationDeadlineAt,
    order?.preparationDeadlineAt,
    order?.correctionDeadlineAt,
    order?.deliveredAt,
    order?.warranty_end_at,
    order?.updatedAt,
    order?.verificationDocuments,
    sla?.endsAt,
    sla?.urgency,
  ]);
}
