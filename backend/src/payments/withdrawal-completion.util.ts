/** Pure money rules for completing one withdrawal. No I/O. */

export function roundMoney(value: number): number {
  return Math.round(Number(value) * 100) / 100;
}

/**
 * How much available balance must move into the hold before a payout.
 * 0 means the hold already covers the amount. -1 means it cannot be funded.
 */
export function holdTopUp(frozen: number, available: number, amount: number): number {
  const held = roundMoney(frozen);
  const free = roundMoney(available);
  const due = roundMoney(amount);
  if (due <= 0) return 0;
  if (held + 0.001 >= due) return 0;
  const need = roundMoney(due - held);
  if (free + 0.001 < need) return -1;
  return need;
}

/** Balances after a successful completion. Frozen is burned, never returned to available. */
export function balancesAfterCompletion(available: number, frozen: number, amount: number): {
  canFund: boolean;
  availableAfter: number;
  frozenAfter: number;
} {
  const free = roundMoney(available);
  const held = roundMoney(frozen);
  const due = roundMoney(amount);
  const canFund = held + free + 0.001 >= due && due > 0;
  if (!canFund) {
    return { canFund: false, availableAfter: free, frozenAfter: held };
  }
  const shortfall = Math.max(0, roundMoney(due - held));
  return {
    canFund: true,
    availableAfter: roundMoney(free - shortfall),
    frozenAfter: roundMoney(held + shortfall - due),
  };
}

/** Amount that may be returned to available. Never credits more than what is actually frozen. */
export function releasableHold(frozen: number, amount: number): number {
  const held = roundMoney(frozen);
  const due = roundMoney(amount);
  if (held <= 0 || due <= 0) return 0;
  return roundMoney(Math.min(held, due));
}

export function withdrawalHasStripeMovement(stripeTransferId: string | null | undefined): boolean {
  const id = String(stripeTransferId || '');
  return id.startsWith('tr_') || id.startsWith('pending_');
}
