const STORAGE_KEY = 'etashleh_correlation_id';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function generateUuid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function getCorrelationId(): string {
  if (typeof sessionStorage === 'undefined') return generateUuid();
  const existing = sessionStorage.getItem(STORAGE_KEY);
  if (existing && UUID_RE.test(existing)) return existing;
  const id = generateUuid();
  sessionStorage.setItem(STORAGE_KEY, id);
  return id;
}

export function setCorrelationIdFromResponse(headerValue?: string | null): void {
  if (!headerValue || typeof sessionStorage === 'undefined') return;
  const trimmed = headerValue.trim();
  if (UUID_RE.test(trimmed)) {
    sessionStorage.setItem(STORAGE_KEY, trimmed);
  }
}
