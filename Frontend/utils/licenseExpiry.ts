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

export function resolveMerchantLicenseExpiry(
  documents: { license?: { expiryDate?: string } } | null | undefined,
  contractAcceptance: { secondPartyData?: { licenseExpiry?: string } } | null | undefined,
): string | null {
  return documents?.license?.expiryDate || contractAcceptance?.secondPartyData?.licenseExpiry || null;
}

export function daysUntilLicenseExpiry(expiry: Date): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const end = new Date(expiry);
  end.setHours(0, 0, 0, 0);
  return Math.ceil((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}
