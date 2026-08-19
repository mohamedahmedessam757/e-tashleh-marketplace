import { computeLedgerNetProfit } from './merchant-wallet-metrics.util';

describe('computeLedgerNetProfit', () => {
  it('nets a sale credit against a matching REFUND debit to zero', () => {
    const net = computeLedgerNetProfit([
      {
        amount: 80,
        type: 'CREDIT',
        transactionType: 'PAYMENT',
        paymentId: 'pay-1',
      },
      {
        amount: 80,
        type: 'DEBIT',
        transactionType: 'REFUND',
        paymentId: 'pay-1',
      },
    ]);
    expect(net).toBe(0);
  });

  it('treats lowercase refund the same as REFUND', () => {
    const net = computeLedgerNetProfit([
      {
        amount: 80,
        type: 'CREDIT',
        transactionType: 'SALE',
        paymentId: 'pay-1',
      },
      {
        amount: 80,
        type: 'DEBIT',
        transactionType: 'refund',
        paymentId: 'pay-1',
      },
    ]);
    expect(net).toBe(0);
  });

  it('ignores sale credits whose payment is already REFUNDED', () => {
    const net = computeLedgerNetProfit([
      {
        amount: 80,
        type: 'CREDIT',
        transactionType: 'PAYMENT',
        paymentId: 'pay-1',
        paymentStatus: 'REFUNDED',
      },
    ]);
    expect(net).toBe(0);
  });

  it('keeps profit when there is no refund debit', () => {
    const net = computeLedgerNetProfit([
      {
        amount: 80,
        type: 'CREDIT',
        transactionType: 'PAYMENT',
        paymentId: 'pay-1',
      },
    ]);
    expect(net).toBe(80);
  });
});
