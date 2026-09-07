import {
  aggregateStorePendingLiabilities,
  allocateLiabilitySettlement,
} from './store-settlement-liabilities.util';

describe('store-settlement-liabilities', () => {
  it('sums pending merchant adjudication and shipping lines', () => {
    const result = aggregateStorePendingLiabilities({
      returns: [
        {
          id: 'r1',
          createdAt: new Date('2026-01-01'),
          adjudicationFeeAmount: 40,
          adjudicationFeePaymentStatus: 'PENDING',
          adjudicationFeePayee: 'MERCHANT',
          shippingRoundtrip: 60,
          shippingCompanyLiability: 0,
          shippingPaymentStatus: 'PENDING',
          shippingPayee: 'MERCHANT',
        },
      ],
      disputes: [],
    });
    expect(result.total).toBe(100);
    expect(result.lines).toHaveLength(2);
  });

  it('allocates full lines FIFO and leaves remainder for transfer', () => {
    const lines = aggregateStorePendingLiabilities({
      returns: [
        {
          id: 'r1',
          createdAt: new Date('2026-01-01'),
          adjudicationFeeAmount: 100,
          adjudicationFeePaymentStatus: 'PENDING',
          adjudicationFeePayee: 'MERCHANT',
          shippingRoundtrip: 0,
          shippingCompanyLiability: 0,
          shippingPaymentStatus: 'NONE',
          shippingPayee: null,
        },
      ],
      disputes: [],
    }).lines;

    const alloc = allocateLiabilitySettlement(lines, 700);
    expect(alloc.settlementAmount).toBe(100);
    expect(alloc.transferAmount).toBe(600);
    expect(alloc.settled).toHaveLength(1);
    expect(alloc.remainingLiability).toBe(0);
  });

  it('does not partially mark a liability line as paid', () => {
    const lines = aggregateStorePendingLiabilities({
      returns: [
        {
          id: 'r1',
          createdAt: new Date('2026-01-01'),
          adjudicationFeeAmount: 100,
          adjudicationFeePaymentStatus: 'PENDING',
          adjudicationFeePayee: 'MERCHANT',
          shippingRoundtrip: 0,
          shippingCompanyLiability: 0,
          shippingPaymentStatus: 'NONE',
          shippingPayee: null,
        },
      ],
      disputes: [],
    }).lines;

    const alloc = allocateLiabilitySettlement(lines, 50);
    expect(alloc.settlementAmount).toBe(0);
    expect(alloc.transferAmount).toBe(50);
    expect(alloc.settled).toHaveLength(0);
    expect(alloc.remainingLiability).toBe(100);
  });
});
