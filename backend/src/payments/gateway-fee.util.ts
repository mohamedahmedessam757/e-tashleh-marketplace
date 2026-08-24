import { roundMoney } from './admin-financial-metrics.util';

/**
 * Stripe-style processing fee from admin financial settings:
 * (orderTotal * percent / 100) + fixedAed
 *
 * Example: 200 * 2.99% + 0.30 = 6.28
 */
export function computeStripeGatewayFee(
  orderTotal: number,
  percent: number,
  fixedAed: number,
): number {
  const total = Number(orderTotal) || 0;
  if (total <= 0) return 0;
  const pct = Math.max(0, Number(percent) || 0);
  const fixed = Math.max(0, Number(fixedAed) || 0);
  return roundMoney(total * (pct / 100) + fixed);
}
