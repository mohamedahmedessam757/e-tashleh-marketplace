/** Parse contract/document license dates (ISO or MM/DD/YYYY). */
export function parseLicenseDate(raw?: string | null): Date | null {
  if (!raw || !String(raw).trim()) return null;
  const s = String(raw).trim();

  const iso = new Date(s);
  if (!Number.isNaN(iso.getTime()) && (s.includes('-') || s.includes('T'))) return iso;

  const m = s.match(/^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{4})$/);
  if (m) {
    const a = Number(m[1]);
    const b = Number(m[2]);
    const y = Number(m[3]);
    // Contract inputs use MM/DD/YYYY (e.g. 07/29/2026)
    const month = a > 12 ? b : a;
    const day = a > 12 ? a : b;
    const d = new Date(y, month - 1, day);
    if (!Number.isNaN(d.getTime())) return d;
  }

  const fallback = new Date(s);
  return Number.isNaN(fallback.getTime()) ? null : fallback;
}

export const DOC_EXPIRY_WARN_DAYS = 30;
export const DOC_EXPIRY_GRACE_DAYS = 15;

export type MerchantDocBucketKey = 'cr' | 'license' | 'id' | 'iban' | 'authLetter';

export const MERCHANT_DOC_KEYS: MerchantDocBucketKey[] = [
  'cr',
  'license',
  'id',
  'iban',
  'authLetter',
];

export function resolveMerchantLicenseExpiry(
  documents: { license?: { expiryDate?: string } } | null | undefined,
  contractAcceptance: { secondPartyData?: { licenseExpiry?: string } } | null | undefined,
): string | null {
  return documents?.license?.expiryDate || contractAcceptance?.secondPartyData?.licenseExpiry || null;
}

/** End of calendar day for an expiry date (local). */
export function endOfExpiryDay(expiry: Date): Date {
  const end = new Date(expiry);
  end.setHours(23, 59, 59, 999);
  return end;
}

/** Freeze / auto-suspend deadline = expiry end-of-day + grace days. */
export function getDocumentFreezeDeadline(expiry: Date, graceDays = DOC_EXPIRY_GRACE_DAYS): Date {
  const freeze = endOfExpiryDay(expiry);
  freeze.setDate(freeze.getDate() + graceDays);
  return freeze;
}

export function daysUntilLicenseExpiry(expiry: Date, now = new Date()): number {
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const end = new Date(expiry);
  end.setHours(0, 0, 0, 0);
  return Math.ceil((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

export interface RemainingParts {
  totalMs: number;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  isPast: boolean;
}

export function getRemainingParts(until: Date, now = new Date()): RemainingParts {
  const totalMs = until.getTime() - now.getTime();
  if (totalMs <= 0) {
    return { totalMs: 0, days: 0, hours: 0, minutes: 0, seconds: 0, isPast: true };
  }
  const days = Math.floor(totalMs / (1000 * 60 * 60 * 24));
  const hours = Math.floor((totalMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((totalMs % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((totalMs % (1000 * 60)) / 1000);
  return { totalMs, days, hours, minutes, seconds, isPast: false };
}

export function formatRemainingCountdown(parts: RemainingParts, isAr: boolean): string {
  if (parts.isPast) {
    return isAr ? 'انتهى الوقت' : 'Time expired';
  }
  const d = isAr ? 'ي' : 'd';
  const h = isAr ? 'س' : 'h';
  const m = isAr ? 'د' : 'm';
  if (parts.days > 0) {
    return `${parts.days}${d} ${parts.hours}${h} ${parts.minutes}${m}`;
  }
  if (parts.hours > 0) {
    return `${parts.hours}${h} ${parts.minutes}${m}`;
  }
  return `${Math.max(1, parts.minutes)}${m}`;
}

export interface DocExpiryCandidate {
  key: MerchantDocBucketKey | 'license_fallback';
  expiry: Date;
  raw: string;
  daysLeft: number;
  freezeAt: Date;
}

type DocsMap = Partial<
  Record<MerchantDocBucketKey, { expiryDate?: string | null; status?: string | null } | null>
>;

/**
 * Earliest relevant document expiry across mandatory docs (+ contract license fallback).
 * Prefer approved/expired docs with a date; ignore empty docs without dates.
 */
export function resolveEarliestDocumentExpiry(
  documents: DocsMap | null | undefined,
  contractAcceptance?: { secondPartyData?: { licenseExpiry?: string } } | null,
  now = new Date(),
): DocExpiryCandidate | null {
  const candidates: DocExpiryCandidate[] = [];

  for (const key of MERCHANT_DOC_KEYS) {
    const raw = documents?.[key]?.expiryDate;
    const expiry = parseLicenseDate(raw);
    if (!expiry) continue;
    candidates.push({
      key,
      expiry,
      raw: String(raw),
      daysLeft: daysUntilLicenseExpiry(expiry, now),
      freezeAt: getDocumentFreezeDeadline(expiry),
    });
  }

  if (candidates.length === 0) {
    const fallbackRaw = contractAcceptance?.secondPartyData?.licenseExpiry;
    const expiry = parseLicenseDate(fallbackRaw);
    if (expiry) {
      candidates.push({
        key: 'license_fallback',
        expiry,
        raw: String(fallbackRaw),
        daysLeft: daysUntilLicenseExpiry(expiry, now),
        freezeAt: getDocumentFreezeDeadline(expiry),
      });
    }
  }

  if (candidates.length === 0) return null;

  candidates.sort((a, b) => a.expiry.getTime() - b.expiry.getTime());
  return candidates[0];
}

export type DocExpiryAlertLevel = 'none' | 'warn' | 'grace' | 'frozen';

export function getDocExpiryAlertLevel(
  daysLeft: number,
  vendorStatus?: string | null,
  warnDays = DOC_EXPIRY_WARN_DAYS,
  graceDays = DOC_EXPIRY_GRACE_DAYS,
): DocExpiryAlertLevel {
  if (vendorStatus === 'LICENSE_EXPIRED' || daysLeft < -graceDays) return 'frozen';
  if (daysLeft <= 0) return 'grace';
  if (daysLeft <= warnDays) return 'warn';
  return 'none';
}

export function isDocRowUrgent(daysLeft: number, status?: string | null): boolean {
  const s = String(status || '').toLowerCase();
  if (s === 'expired' || s === 'rejected' || s === 'reupload_requested') return true;
  return daysLeft <= DOC_EXPIRY_WARN_DAYS;
}
