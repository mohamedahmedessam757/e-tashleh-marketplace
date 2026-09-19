import { describe, it, expect } from '@jest/globals';
import {
  computeLoyaltyReverseProportion,
  computePartialReverseAmount,
} from './loyalty-reverse.util';

describe('computeLoyaltyReverseProportion', () => {
  it('returns full when order total is zero', () => {
    expect(computeLoyaltyReverseProportion(50, 0)).toBe(1);
  });

  it('clamps to [0,1]', () => {
    expect(computeLoyaltyReverseProportion(50, 200)).toBe(0.25);
    expect(computeLoyaltyReverseProportion(300, 200)).toBe(1);
    expect(computeLoyaltyReverseProportion(-10, 200)).toBe(0);
  });
});

describe('computePartialReverseAmount', () => {
  it('reverses remaining slice toward proportion target', () => {
    // credit 100, already 0, proportion 0.25 → 25
    expect(computePartialReverseAmount(100, 0, 0.25)).toBe(25);
    // already reversed 20 of 25 target → 5 more
    expect(computePartialReverseAmount(100, 20, 0.25)).toBe(5);
    // already at/above target → 0
    expect(computePartialReverseAmount(100, 25, 0.25)).toBe(0);
  });
});
