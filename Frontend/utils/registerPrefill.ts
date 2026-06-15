export const REGISTER_PREFILL_KEY = 'register_prefill';

export interface RegisterPrefill {
  role: 'customer' | 'merchant';
  method: 'whatsapp' | 'email';
  email?: string;
  phone?: string;
  countryCode?: string;
}

export function saveRegisterPrefill(data: RegisterPrefill): void {
  sessionStorage.setItem(REGISTER_PREFILL_KEY, JSON.stringify(data));
}

export function consumeRegisterPrefill(): RegisterPrefill | null {
  const raw = sessionStorage.getItem(REGISTER_PREFILL_KEY);
  if (!raw) return null;
  sessionStorage.removeItem(REGISTER_PREFILL_KEY);
  try {
    return JSON.parse(raw) as RegisterPrefill;
  } catch {
    return null;
  }
}

export function peekRegisterPrefill(): RegisterPrefill | null {
  const raw = sessionStorage.getItem(REGISTER_PREFILL_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as RegisterPrefill;
  } catch {
    return null;
  }
}
