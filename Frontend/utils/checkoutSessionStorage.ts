import type { Address, OfferDetails } from '../stores/useCheckoutStore';

export type PersistedCheckoutSession = {
  step: number;
  address: Address;
  partAddresses: Record<string, Address>;
  termsAccepted: boolean;
  returnPolicyAccepted: boolean;
  isEditingShipping: boolean;
  paidOfferIds: string[];
  selectedOffer: OfferDetails | null;
};

const sessionKey = (orderId: string) => `checkout_session_v1_${orderId}`;

export function saveCheckoutSession(
  orderId: string,
  data: PersistedCheckoutSession,
): void {
  if (!orderId || typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(sessionKey(orderId), JSON.stringify(data));
  } catch {
    /* quota / private mode */
  }
}

export function loadCheckoutSession(
  orderId: string,
): PersistedCheckoutSession | null {
  if (!orderId || typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(sessionKey(orderId));
    if (!raw) return null;
    return JSON.parse(raw) as PersistedCheckoutSession;
  } catch {
    return null;
  }
}

export function clearCheckoutSession(orderId: string): void {
  if (!orderId || typeof window === 'undefined') return;
  try {
    sessionStorage.removeItem(sessionKey(orderId));
  } catch {
    /* ignore */
  }
}

export function hasMeaningfulAddress(address: Address): boolean {
  return Boolean(
    address.fullName?.trim() &&
      address.phone?.trim() &&
      address.email?.trim() &&
      address.city?.trim() &&
      address.details?.trim(),
  );
}
