import { computeTotalReleasedToMerchants } from './admin-financial-metrics.util';

describe('computeTotalReleasedToMerchants', () => {
  it('is zero when escrow was never released (HELD then refunded)', () => {
    expect(computeTotalReleasedToMerchants(0, 0)).toBe(0);
  });

  it('is zero after a released-fund clawback', () => {
    expect(computeTotalReleasedToMerchants(80, 80)).toBe(0);
  });

  it('keeps released merchant amount when no clawback', () => {
    expect(computeTotalReleasedToMerchants(80, 0)).toBe(80);
  });

  it('does not go negative when clawback exceeds released', () => {
    expect(computeTotalReleasedToMerchants(0, 80)).toBe(0);
  });
});
