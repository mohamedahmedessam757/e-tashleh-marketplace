import { OrderStatus } from '@prisma/client';
import { OrderSlaService } from './order-sla.service';
import {
  DEFAULT_ORDER_DURATION_CONFIG,
  OrderDurationConfigService,
} from '../common/order-duration-config.service';

describe('OrderSlaService preparationDeadlineAt', () => {
  const durationConfig = {
    getCachedOrDefaults: () => ({ ...DEFAULT_ORDER_DURATION_CONFIG }),
    hoursToMs: (h: number) => h * 3600_000,
    minutesToMs: (m: number) => m * 60_000,
  } as unknown as OrderDurationConfigService;

  const sla = new OrderSlaService(durationConfig);
  const config = { ...DEFAULT_ORDER_DURATION_CONFIG };

  it('prefers sticky preparationDeadlineAt over first payment + hours', () => {
    const sticky = new Date('2026-09-20T12:00:00.000Z');
    const active = sla.resolveActiveSla(
      {
        status: OrderStatus.PREPARATION,
        updatedAt: new Date('2026-09-14T10:00:00.000Z'),
        preparationDeadlineAt: sticky,
        payments: [{ status: 'SUCCESS', createdAt: new Date('2026-09-14T10:00:00.000Z') }],
      },
      config,
    );
    expect(active?.endsAt).toBe(sticky.toISOString());
  });

  it('CORRECTION_PERIOD ends at correctionDeadlineAt (no delayed correction)', () => {
    const end = new Date('2026-09-16T10:00:00.000Z');
    const active = sla.resolveActiveSla(
      {
        status: OrderStatus.CORRECTION_PERIOD,
        updatedAt: new Date('2026-09-14T10:00:00.000Z'),
        correctionDeadlineAt: end,
      },
      config,
    );
    expect(active?.endsAt).toBe(end.toISOString());
    expect(active?.labelKey).toBe('sla.correction');
  });
});
