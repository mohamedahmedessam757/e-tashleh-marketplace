import type { OrderActiveSla, OrderActiveSlaUrgency, OrderDurationSettings } from '../types/orderSla';
import { DEFAULT_ORDER_DURATIONS } from '../types/orderSla';
import { getOrderDurationSettings } from './orderSla';
import { getServerNowMs } from './serverClock';

type OrderLike = {
  status?: string | null;
  activeSla?: OrderActiveSla | null;
  createdAt?: string | Date | null;
  updatedAt?: string | Date | null;
  revealOffersAt?: string | Date | null;
  selectionDeadlineAt?: string | Date | null;
  paymentDeadlineAt?: string | Date | null;
  delayedPreparationDeadlineAt?: string | Date | null;
  correctionDeadlineAt?: string | Date | null;
  shippedAt?: string | Date | null;
  deliveredAt?: string | Date | null;
  offerAcceptedAt?: string | Date | null;
  payments?: Array<{ createdAt?: string | Date | null; status?: string | null }> | null;
};

const H = (n: number) => n * 60 * 60 * 1000;
const M = (n: number) => n * 60 * 1000;
const D = (n: number) => n * 24 * 60 * 60 * 1000;

const toMs = (v: string | Date | null | undefined): number | null => {
  if (v == null) return null;
  const ms = new Date(v).getTime();
  return Number.isFinite(ms) ? ms : null;
};

const buildSla = (
  phase: string,
  labelKey: string,
  startedAtMs: number | null,
  totalMs: number,
  source: OrderActiveSla['source'] = 'config',
): OrderActiveSla | null => {
  if (startedAtMs == null || !Number.isFinite(startedAtMs) || totalMs <= 0) return null;
  return buildSlaUntil(phase, labelKey, startedAtMs, startedAtMs + totalMs, source);
};

const buildSlaUntil = (
  phase: string,
  labelKey: string,
  startedAtMs: number,
  endsAtMs: number,
  source: OrderActiveSla['source'] = 'deadline',
): OrderActiveSla | null => {
  if (!Number.isFinite(startedAtMs) || !Number.isFinite(endsAtMs) || endsAtMs <= startedAtMs) {
    return null;
  }

  const totalMs = endsAtMs - startedAtMs;
  const now = getServerNowMs();
  const remainingMs = endsAtMs - now;
  const progressPercent = Math.min(
    100,
    Math.max(0, Math.round(((totalMs - Math.max(0, remainingMs)) / totalMs) * 100)),
  );

  let urgency: OrderActiveSlaUrgency = 'normal';
  if (remainingMs <= 0) urgency = 'expired';
  else if (remainingMs / totalMs <= 0.1) urgency = 'critical';
  else if (remainingMs / totalMs <= 0.25) urgency = 'warning';

  return {
    phase,
    endsAt: new Date(endsAtMs).toISOString(),
    labelKey,
    urgency,
    progressPercent,
    source,
    startedAt: new Date(startedAtMs).toISOString(),
    totalMs,
  };
};

const getFirstPaymentMs = (order: OrderLike): number | null => {
  const payments = order.payments ?? [];
  const completed = payments.filter((p) => p.status === 'SUCCESS' || p.status === 'COMPLETED');
  const list = completed.length ? completed : payments;
  const times = list.map((p) => toMs(p.createdAt)).filter((t): t is number => t != null);
  return times.length ? Math.min(...times) : null;
};

export function resolveOrderActiveSla(
  order: OrderLike | null | undefined,
  config: OrderDurationSettings = getOrderDurationSettings(),
): OrderActiveSla | null {
  if (!order?.status) return null;
  if (order.activeSla?.endsAt && order.activeSla.phase === order.status) {
    const stickyEnd = toMs(order.activeSla.endsAt);
    const liveEnd =
      order.status === 'AWAITING_PAYMENT' || order.status === 'PARTIALLY_PAID'
        ? toMs(order.paymentDeadlineAt)
        : order.status === 'CORRECTION_PERIOD'
          ? toMs(order.correctionDeadlineAt)
          : order.status === 'AWAITING_SELECTION'
            ? toMs(order.selectionDeadlineAt)
            : order.status === 'COLLECTING_OFFERS' || order.status === 'AWAITING_OFFERS'
              ? toMs(order.revealOffersAt)
              : null;
    if (liveEnd == null || stickyEnd === liveEnd) {
      return order.activeSla;
    }
  }

  const status = order.status;
  const terminal = new Set([
    'CANCELLED',
    'COMPLETED',
    'CLOSED',
    'REFUNDED',
    'RESOLVED',
    'WARRANTY_EXPIRED',
    'RETURNED',
  ]);
  if (terminal.has(status)) return null;

  switch (status) {
    case 'COLLECTING_OFFERS':
    case 'AWAITING_OFFERS': {
      const revealMs = toMs(order.revealOffersAt);
      const createdMs = toMs(order.createdAt);
      if (revealMs != null && createdMs != null) {
        return buildSlaUntil(status, 'sla.collectingOffers', createdMs, revealMs);
      }
      return buildSla(status, 'sla.collectingOffers', createdMs, H(config.offerCollectionHours));
    }

    case 'AWAITING_SELECTION': {
      const deadlineMs = toMs(order.selectionDeadlineAt);
      const startedMs = toMs(order.revealOffersAt) ?? toMs(order.updatedAt);
      if (deadlineMs != null && startedMs != null) {
        return buildSlaUntil(status, 'sla.selection', startedMs, deadlineMs);
      }
      return buildSla(status, 'sla.selection', startedMs, H(config.offerSelectionHours));
    }

    case 'AWAITING_PAYMENT': {
      const payDeadlineMs = toMs(order.paymentDeadlineAt);
      const payStartedMs =
        toMs(order.offerAcceptedAt) ?? toMs(order.updatedAt) ?? toMs(order.createdAt);
      if (payDeadlineMs != null && payStartedMs != null) {
        return buildSlaUntil(status, 'sla.payment', payStartedMs, payDeadlineMs);
      }
      return buildSla(status, 'sla.payment', payStartedMs, H(config.paymentTimeoutHours));
    }

    case 'PARTIALLY_PAID': {
      const partialPayDeadlineMs = toMs(order.paymentDeadlineAt);
      const partialPayStartedMs =
        toMs(order.offerAcceptedAt) ?? toMs(order.updatedAt) ?? toMs(order.createdAt);
      if (partialPayDeadlineMs != null && partialPayStartedMs != null) {
        return buildSlaUntil(status, 'sla.payment', partialPayStartedMs, partialPayDeadlineMs);
      }
      return buildSla(
        status,
        'sla.payment',
        partialPayStartedMs,
        H(config.paymentTimeoutHours),
      );
    }

    case 'PREPARATION':
      return buildSla(
        status,
        'sla.preparation',
        getFirstPaymentMs(order) ?? toMs(order.updatedAt),
        H(config.preparationHours),
      );

    case 'DELAYED_PREPARATION':
      return buildSla(
        status,
        'sla.delayedPreparation',
        toMs(order.delayedPreparationDeadlineAt)
          ? toMs(order.delayedPreparationDeadlineAt)! - H(config.delayedPreparationGraceHours)
          : toMs(order.updatedAt),
        H(config.delayedPreparationGraceHours),
      );

    case 'NON_MATCHING':
      return buildSla(
        status,
        'sla.nonMatchingGrace',
        toMs(order.updatedAt),
        M(config.nonMatchingGraceMinutes),
      );

    case 'CORRECTION_PERIOD': {
      const endMs = toMs(order.correctionDeadlineAt);
      const startMs =
        endMs != null
          ? endMs - H(config.correctionPeriodHours)
          : toMs(order.updatedAt);
      if (endMs != null && startMs != null) {
        return buildSlaUntil(status, 'sla.correction', startMs, endMs);
      }
      return buildSla(status, 'sla.correction', startMs, H(config.correctionPeriodHours));
    }

    case 'SHIPPED':
    case 'PARTIALLY_SHIPPED':
      return buildSla(
        status,
        'sla.shipping',
        toMs(order.shippedAt) ?? toMs(order.updatedAt),
        H(config.shippingSlaHours),
      );

    case 'DELIVERED':
    case 'PARTIALLY_DELIVERED': {
      const returnHours = Math.max(config.returnWindowHours, config.disputeWindowHours);
      return buildSla(
        status,
        'sla.return',
        toMs(order.deliveredAt) ?? toMs(order.updatedAt),
        H(returnHours),
      );
    }

    default:
      return null;
  }
}

export function mergeOrderDurationSettings(
  partial?: Partial<OrderDurationSettings> | null,
): OrderDurationSettings {
  return { ...DEFAULT_ORDER_DURATIONS, ...partial };
}
