import {
  CANCEL_BEFORE_SHIPPING_FEE_PCT,
  computeCancelBeforeShippingRefund,
} from './cancel-refund.util';

describe('computeCancelBeforeShippingRefund', () => {
  it('deducts 2% gateway fee for customer-fault cancel', () => {
    const calc = computeCancelBeforeShippingRefund(100, CANCEL_BEFORE_SHIPPING_FEE_PCT, 0);
    expect(calc.feePct).toBe(2);
    expect(calc.feeAmount).toBe(2);
    expect(calc.refundAmount).toBe(98);
  });

  it('refunds full amount when feePct is 0 (merchant-fault path)', () => {
    const calc = computeCancelBeforeShippingRefund(100, 0, 0);
    expect(calc.feeAmount).toBe(0);
    expect(calc.refundAmount).toBe(100);
    expect(calc.targetNetRefund).toBe(100);
  });
});
