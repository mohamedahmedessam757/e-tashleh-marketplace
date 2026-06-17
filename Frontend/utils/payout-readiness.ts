import type { PayoutBankDetails } from '../types/payout-account';

export type PayoutMethod = 'BANK_TRANSFER' | 'STRIPE';

export interface PayoutReadiness {
  hasBank: boolean;
  hasStripe: boolean;
  hasAny: boolean;
}

export function getPayoutReadiness(
  bankDetails: PayoutBankDetails | null | undefined,
  stripeOnboarded?: boolean,
): PayoutReadiness {
  const hasBank = Boolean(bankDetails?.isLinked ?? bankDetails?.iban);
  const hasStripe = Boolean(bankDetails?.stripeOnboarded ?? stripeOnboarded);
  return { hasBank, hasStripe, hasAny: hasBank || hasStripe };
}

export function isPayoutMethodReady(
  method: PayoutMethod,
  readiness: PayoutReadiness,
): boolean {
  if (!readiness.hasAny) return false;
  if (method === 'STRIPE') return readiness.hasStripe;
  return readiness.hasBank;
}

export function getNoPayoutLinkedMessage(isAr: boolean): string {
  return isAr
    ? 'لا يمكن تنفيذ السحب. يجب ربط طريقة استلام الأموال أولاً — ننصح بـ Stripe Connect لسرعة التحويل، أو أضف بيانات حسابك البنكي.'
    : 'Withdrawal blocked. Link a payout method first — Stripe Connect is recommended for faster payouts, or add your bank account details.';
}

export function getSelectedPayoutMethodNotReadyMessage(
  isAr: boolean,
  method: PayoutMethod,
): string {
  if (method === 'STRIPE') {
    return isAr
      ? 'يجب إكمال ربط Stripe Connect أولاً، أو اختر التحويل البنكي إذا كان حسابك البنكي مربوطاً.'
      : 'Complete Stripe Connect onboarding first, or switch to bank transfer if your bank account is linked.';
  }
  return isAr
    ? 'يجب إضافة بيانات الحساب البنكي أولاً، أو اختر Stripe Connect (موصى به لسرعة التحويل).'
    : 'Add your bank account details first, or switch to Stripe Connect (recommended for faster payouts).';
}
