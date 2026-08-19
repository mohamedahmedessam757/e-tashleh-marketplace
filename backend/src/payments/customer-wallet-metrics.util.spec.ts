import {
  computeCustomerAvailableBalance,
  computePendingLoyaltyFromOrders,
  computePendingLoyaltyPointsFromOrders,
  reconcileUserTotalSpent,
  sumPrematureLoyaltyPoints,
  sumPrematureOrderProfit,
} from './customer-wallet-metrics.util';

describe('customer wallet metrics — pending vs reversal', () => {
  it('holds premature ORDER_PROFIT on non-terminal orders', () => {
    const held = sumPrematureOrderProfit(
      [
        {
          amount: 12,
          type: 'CREDIT',
          transactionType: 'ORDER_PROFIT',
          metadata: { orderId: 'o1' },
        },
      ],
      new Set(['o1']),
    );
    expect(held).toBe(12);
    expect(computeCustomerAvailableBalance(12, held)).toBe(0);
  });

  it('nets debit reversals so pending/held drops to zero', () => {
    const held = sumPrematureOrderProfit(
      [
        {
          amount: 12,
          type: 'CREDIT',
          transactionType: 'ORDER_PROFIT',
          metadata: { orderId: 'o1' },
        },
        {
          amount: 12,
          type: 'DEBIT',
          transactionType: 'ORDER_PROFIT',
          metadata: { orderId: 'o1' },
        },
      ],
      new Set(['o1']),
    );
    expect(held).toBe(0);
    expect(computeCustomerAvailableBalance(0, held)).toBe(0);
  });

  it('keeps predicted pending for disputed/return statuses when not yet credited', () => {
    const pending = computePendingLoyaltyFromOrders(
      [{ id: 'o-disputed', payments: [{ commission: 100 }] }],
      0.02,
    );
    expect(pending).toBeGreaterThan(0);
  });

  it('predicts pending loyalty points from commission the same way as grant', () => {
    const pendingPts = computePendingLoyaltyPointsFromOrders([
      { id: 'o-disputed', payments: [{ commission: 100 }] },
    ]);
    expect(pendingPts).toBe(100);
  });

  it('nets premature loyalty points after reversal', () => {
    const held = sumPrematureLoyaltyPoints(
      [
        {
          type: 'CREDIT',
          transactionType: 'ORDER_PROFIT',
          metadata: { orderId: 'o1', commission: 40 },
        },
        {
          type: 'DEBIT',
          transactionType: 'ORDER_PROFIT',
          metadata: { orderId: 'o1', commission: 40, pointsReversed: 40 },
        },
      ],
      new Set(['o1']),
    );
    expect(held).toBe(0);
  });
});

describe('reconcileUserTotalSpent', () => {
  it('persists zero purchases when stored spend is stale after a refund', async () => {
    const update = jest.fn().mockResolvedValue({});
    const prisma = { user: { update } } as any;
    const result = await reconcileUserTotalSpent(prisma, 'u1', 0, 200);
    expect(result).toBe(0);
    expect(update).toHaveBeenCalledWith({
      where: { id: 'u1' },
      data: { totalSpent: 0 },
    });
  });

  it('does not write when stored spend already matches purchases', async () => {
    const update = jest.fn();
    const prisma = { user: { update } } as any;
    const result = await reconcileUserTotalSpent(prisma, 'u1', 150, 150);
    expect(result).toBe(150);
    expect(update).not.toHaveBeenCalled();
  });
});
