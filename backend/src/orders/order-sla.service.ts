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
      case OrderStatus.AWAITING_OFFERS:
        return this.buildSla(
          status,
          'sla.collectingOffers',
          this.toMs(order.createdAt),
          this.durationConfig.hoursToMs(cfg.offerCollectionHours),
        );

      case OrderStatus.AWAITING_SELECTION:
        return this.buildSla(
          status,
          'sla.selection',
          this.toMs(order.revealOffersAt) ?? this.toMs(order.updatedAt),
          this.durationConfig.hoursToMs(cfg.offerSelectionHours),
        );

      case OrderStatus.AWAITING_PAYMENT:
        return this.buildSla(
          status,
          'sla.payment',
          this.toMs(order.offerAcceptedAt) ??
            this.toMs(order.updatedAt) ??
            this.toMs(order.createdAt),
          this.durationConfig.hoursToMs(cfg.paymentTimeoutHours),
        );

      case OrderStatus.PARTIALLY_PAID:
        return this.buildSla(
          status,
          'sla.payment',
          this.toMs(order.updatedAt) ?? this.toMs(order.createdAt),
          this.durationConfig.hoursToMs(cfg.paymentTimeoutHours),
        );

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
          'sla.correction',
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

    const endsAtMs = startedAtMs + totalMs;
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
