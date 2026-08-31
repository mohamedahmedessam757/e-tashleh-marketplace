import { Injectable } from '@nestjs/common';
import { OrderStatus } from '@prisma/client';
import {
  OrderDurationConfig,
  OrderDurationConfigService,
} from '../common/order-duration-config.service';
import {
  OrderActiveSla,
  OrderActiveSlaSource,
  OrderActiveSlaUrgency,
} from './dto/order-active-sla.dto';

type OrderLike = {
  status?: string | null;
  createdAt?: Date | string | null;
  updatedAt?: Date | string | null;
  revealOffersAt?: Date | string | null;
  selectionDeadlineAt?: Date | string | null;
  paymentDeadlineAt?: Date | string | null;
  delayedPreparationDeadlineAt?: Date | string | null;
  correctionDeadlineAt?: Date | string | null;
  shippedAt?: Date | string | null;
  deliveredAt?: Date | string | null;
  offerAcceptedAt?: Date | string | null;
  warranty_end_at?: Date | string | null;
  payments?: Array<{ createdAt?: Date | string | null; status?: string | null }> | null;
};

@Injectable()
export class OrderSlaService {
  constructor(private readonly durationConfig: OrderDurationConfigService) {}

  resolveActiveSla(
    order: OrderLike,
    config?: OrderDurationConfig,
  ): OrderActiveSla | null {
    const cfg = config ?? this.durationConfig.getCachedOrDefaults();
    const status = order.status as OrderStatus | undefined;
    if (!status) return null;

    const terminal = new Set<OrderStatus>([
      OrderStatus.CANCELLED,
      OrderStatus.COMPLETED,
      OrderStatus.CLOSED,
      OrderStatus.REFUNDED,
      OrderStatus.RESOLVED,
      OrderStatus.WARRANTY_EXPIRED,
      OrderStatus.RETURNED,
    ]);
    if (terminal.has(status)) return null;

    switch (status) {
      case OrderStatus.COLLECTING_OFFERS:
      case OrderStatus.AWAITING_OFFERS: {
        const revealMs = this.toMs(order.revealOffersAt);
        const createdMs = this.toMs(order.createdAt);
        if (revealMs != null && createdMs != null) {
          return this.buildSlaUntil(
            status,
            'sla.collectingOffers',
            createdMs,
            revealMs,
          );
        }
        return this.buildSla(
          status,
          'sla.collectingOffers',
          createdMs,
          this.durationConfig.hoursToMs(cfg.offerCollectionHours),
        );
      }

      case OrderStatus.AWAITING_SELECTION: {
        const deadlineMs = this.toMs(order.selectionDeadlineAt);
        const startedMs =
          this.toMs(order.revealOffersAt) ?? this.toMs(order.updatedAt);
        if (deadlineMs != null && startedMs != null) {
          return this.buildSlaUntil(
            status,
            'sla.selection',
            startedMs,
            deadlineMs,
          );
        }
        return this.buildSla(
          status,
          'sla.selection',
          startedMs,
          this.durationConfig.hoursToMs(cfg.offerSelectionHours),
        );
      }

      case OrderStatus.AWAITING_PAYMENT: {
        const payDeadlineMs = this.toMs(order.paymentDeadlineAt);
        const payStartedMs =
          this.toMs(order.offerAcceptedAt) ??
          this.toMs(order.updatedAt) ??
          this.toMs(order.createdAt);
        if (payDeadlineMs != null && payStartedMs != null) {
          return this.buildSlaUntil(
            status,
            'sla.payment',
            payStartedMs,
            payDeadlineMs,
          );
        }
        return this.buildSla(
          status,
          'sla.payment',
          payStartedMs,
          this.durationConfig.hoursToMs(cfg.paymentTimeoutHours),
        );
      }

      case OrderStatus.PARTIALLY_PAID: {
        const partialPayDeadlineMs = this.toMs(order.paymentDeadlineAt);
        const partialPayStartedMs =
          this.toMs(order.offerAcceptedAt) ??
          this.toMs(order.updatedAt) ??
          this.toMs(order.createdAt);
        if (partialPayDeadlineMs != null && partialPayStartedMs != null) {
          return this.buildSlaUntil(
            status,
            'sla.payment',
            partialPayStartedMs,
            partialPayDeadlineMs,
          );
        }
        return this.buildSla(
          status,
          'sla.payment',
          partialPayStartedMs,
          this.durationConfig.hoursToMs(cfg.paymentTimeoutHours),
        );
      }

      case OrderStatus.PREPARATION:
        return this.buildSla(
          status,
          'sla.preparation',
          this.getFirstPaymentMs(order) ?? this.toMs(order.updatedAt),
          this.durationConfig.hoursToMs(cfg.preparationHours),
        );

      case OrderStatus.DELAYED_PREPARATION:
        return this.buildSla(
          status,
          'sla.delayedPreparation',
          this.toMs(order.delayedPreparationDeadlineAt)
            ? this.toMs(order.delayedPreparationDeadlineAt)! -
                this.durationConfig.hoursToMs(cfg.delayedPreparationGraceHours)
            : this.toMs(order.updatedAt),
          this.durationConfig.hoursToMs(cfg.delayedPreparationGraceHours),
        );

      case OrderStatus.NON_MATCHING:
        return this.buildSla(
          status,
          'sla.nonMatchingGrace',
          this.toMs(order.updatedAt),
          this.durationConfig.minutesToMs(cfg.nonMatchingGraceMinutes),
        );

      case OrderStatus.CORRECTION_PERIOD:
        return this.buildSla(
          status,
          'sla.correction',
          this.toMs(order.correctionDeadlineAt)
            ? this.toMs(order.correctionDeadlineAt)! -
                this.durationConfig.hoursToMs(cfg.correctionPeriodHours)
            : this.toMs(order.updatedAt),
          this.durationConfig.hoursToMs(cfg.correctionPeriodHours),
        );

      case OrderStatus.SHIPPED:
      case OrderStatus.PARTIALLY_SHIPPED:
        return this.buildSla(
          status,
          'sla.shipping',
          this.toMs(order.shippedAt) ?? this.toMs(order.updatedAt),
          this.durationConfig.hoursToMs(cfg.shippingSlaHours),
        );

      case OrderStatus.DELIVERED:
      case OrderStatus.PARTIALLY_DELIVERED: {
        const returnHours = Math.max(cfg.returnWindowHours, cfg.disputeWindowHours);
        return this.buildSla(
          status,
          'sla.return',
          this.toMs(order.deliveredAt) ?? this.toMs(order.updatedAt),
          this.durationConfig.hoursToMs(returnHours),
        );
      }

      case OrderStatus.WARRANTY_ACTIVE: {
        const endMs = this.toMs(order.warranty_end_at);
        const startMs = this.toMs(order.updatedAt) ?? this.toMs(order.deliveredAt);
        if (endMs != null && startMs != null && endMs > startMs) {
          return this.buildSlaUntil(status, 'sla.return', startMs, endMs);
        }
        if (endMs != null) {
          // Degenerate range: still expose endsAt for countdown/enforce
          return this.buildSlaUntil(status, 'sla.return', endMs - 1000, endMs);
        }
        return null;
      }

      default:
        return null;
    }
  }

  isSlaExpired(order: OrderLike, config?: OrderDurationConfig): boolean {
    const sla = this.resolveActiveSla(order, config);
    if (!sla) return false;
    return new Date(sla.endsAt).getTime() <= Date.now();
  }

  attachActiveSla<T extends OrderLike>(
    order: T,
    config?: OrderDurationConfig,
  ): T & { activeSla: OrderActiveSla | null } {
    return {
      ...order,
      activeSla: this.resolveActiveSla(order, config),
    };
  }

  attachActiveSlaBatch<T extends OrderLike>(
    orders: T[],
    config?: OrderDurationConfig,
  ): Array<T & { activeSla: OrderActiveSla | null }> {
    const cfg = config ?? this.durationConfig.getCachedOrDefaults();
    return orders.map((o) => this.attachActiveSla(o, cfg));
  }

  private buildSla(
    phase: string,
    labelKey: string,
    startedAtMs: number | null,
    totalMs: number,
    source: OrderActiveSlaSource = 'config',
  ): OrderActiveSla | null {
    if (startedAtMs == null || !Number.isFinite(startedAtMs) || totalMs <= 0) {
      return null;
    }

    return this.buildSlaUntil(
      phase,
      labelKey,
      startedAtMs,
      startedAtMs + totalMs,
      source,
    );
  }

  /** Build SLA from explicit start/end timestamps (DB deadline fields). */
  private buildSlaUntil(
    phase: string,
    labelKey: string,
    startedAtMs: number,
    endsAtMs: number,
    source: OrderActiveSlaSource = 'deadline',
  ): OrderActiveSla | null {
    if (
      !Number.isFinite(startedAtMs) ||
      !Number.isFinite(endsAtMs) ||
      endsAtMs <= startedAtMs
    ) {
      return null;
    }

    const totalMs = endsAtMs - startedAtMs;
    const now = Date.now();
    const remainingMs = endsAtMs - now;
    const progressPercent = Math.min(
      100,
      Math.max(0, Math.round(((totalMs - Math.max(0, remainingMs)) / totalMs) * 100)),
    );

    let urgency: OrderActiveSlaUrgency = 'normal';
    if (remainingMs <= 0) {
      urgency = 'expired';
    } else if (remainingMs / totalMs <= 0.1) {
      urgency = 'critical';
    } else if (remainingMs / totalMs <= 0.25) {
      urgency = 'warning';
    }

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
  }

  private toMs(value: Date | string | null | undefined): number | null {
    if (value == null) return null;
    const ms = new Date(value).getTime();
    return Number.isFinite(ms) ? ms : null;
  }

  private getFirstPaymentMs(order: OrderLike): number | null {
    const payments = order.payments ?? [];
    const completed = payments.filter(
      (p) => p.status === 'SUCCESS' || p.status === 'COMPLETED',
    );
    const list = completed.length ? completed : payments;
    if (!list.length) return null;
    const times = list
      .map((p) => this.toMs(p.createdAt))
      .filter((t): t is number => t != null);
    if (!times.length) return null;
    return Math.min(...times);
  }
}
