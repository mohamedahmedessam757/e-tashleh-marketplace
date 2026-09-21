import { useEffect, useRef } from 'react';
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
 */
export function useEnforceExpiredOrderSla(order: OrderLike) {
  const sla = useOrderActiveSla(order as any);
  const inFlight = useRef<string | null>(null);

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
