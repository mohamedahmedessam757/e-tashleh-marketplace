import {
  computeLedgerNetProfit,
  MERCHANT_NON_PROFIT_CREDIT_TYPES,
} from './merchant-wallet-metrics.util';

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

  it('does not treat OBLIGATION_SETTLEMENT credit as profit after Stripe pay', () => {
    expect(MERCHANT_NON_PROFIT_CREDIT_TYPES.has('OBLIGATION_SETTLEMENT')).toBe(true);

    const net = computeLedgerNetProfit([
      {
        amount: 100,
        type: 'CREDIT',
        transactionType: 'PAYMENT',
        paymentId: 'pay-obl',
      },
      {
        amount: 25,
        type: 'DEBIT',
        transactionType: 'PENALTY',
        paymentId: 'pay-obl',
      },
      {
        amount: 25,
        type: 'CREDIT',
        transactionType: 'OBLIGATION_SETTLEMENT',
        paymentId: 'pay-obl',
      },
    ]);

    // Sale 100 − penalty 25; Stripe settlement credit must NOT restore profit.
    expect(net).toBe(75);
  });

  it('keeps adjudication/shipping Stripe obligation debits as expenses', () => {
    const net = computeLedgerNetProfit([
      {
        amount: 200,
        type: 'CREDIT',
        transactionType: 'PAYMENT',
        paymentId: 'pay-case',
      },
      {
        amount: 40,
        type: 'DEBIT',
        transactionType: 'ADJUDICATION_FEE',
      },
      {
        amount: 15,
        type: 'DEBIT',
        transactionType: 'SHIPPING_FEE',
      },
    ]);
    expect(net).toBe(145);
  });
});
