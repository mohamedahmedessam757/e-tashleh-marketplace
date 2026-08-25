import { computeStripeGatewayFee } from './gateway-fee.util';

describe('computeStripeGatewayFee', () => {
  it('computes 2.99% + 0.30 on 200 AED → 6.28', () => {
    expect(computeStripeGatewayFee(200, 2.99, 0.3)).toBe(6.28);
  });

  it('returns 0 for zero or negative totals', () => {
    expect(computeStripeGatewayFee(0, 2.99, 0.3)).toBe(0);
    expect(computeStripeGatewayFee(-10, 2.99, 0.3)).toBe(0);
  });

  it('handles decimal percent and fixed fee', () => {
    expect(computeStripeGatewayFee(100, 2.99, 0.3)).toBe(3.29);
  });

  it('applies admin-updated rates to new totals (e.g. 3% + 0.50)', () => {
    expect(computeStripeGatewayFee(200, 3, 0.5)).toBe(6.5);
  });

  it('treats negative percent/fixed as zero', () => {
    expect(computeStripeGatewayFee(100, -1, -0.5)).toBe(0);
  });
});