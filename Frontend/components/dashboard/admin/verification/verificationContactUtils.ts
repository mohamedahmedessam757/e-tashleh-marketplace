/** Digits-only WhatsApp deep link; prepend countryCode when local number starts with 0. */
export function toWhatsAppHref(
  phone?: string | null,
  countryCode?: string | null,
): string | null {
  if (!phone) return null;
  let digits = String(phone).replace(/\D/g, '');
  if (!digits) return null;
  const cc = String(countryCode || '').replace(/\D/g, '');
  if (digits.startsWith('0') && cc) {
    digits = `${cc}${digits.replace(/^0+/, '')}`;
  } else if (cc && !digits.startsWith(cc) && digits.length <= 10) {
    digits = `${cc}${digits}`;
  }
  return digits.length >= 8 ? `https://wa.me/${digits}` : null;
}

export function isMasterInvoice(inv: { invoiceType?: string | null } | null | undefined): boolean {
  return String(inv?.invoiceType || 'MASTER').toUpperCase() === 'MASTER';
}

export function filterMasterInvoices<T extends { invoiceType?: string | null }>(
  invoices: T[] | null | undefined,
): T[] {
  if (!Array.isArray(invoices)) return [];
  return invoices.filter(isMasterInvoice);
}

type OwnerContact = {
  phone?: string | null;
  email?: string | null;
  countryCode?: string | null;
} | null | undefined;

/** Prefer order.store.owner; never lose owner when doc.store is merged in. */
export function resolveStoreOwnerContact(
  orderStore?: { owner?: OwnerContact } | null,
  docStore?: { owner?: OwnerContact } | null,
): {
  phone: string | null;
  email: string | null;
  countryCode: string | null;
} {
  const owner = orderStore?.owner ?? docStore?.owner ?? null;
  return {
    phone: owner?.phone ? String(owner.phone) : null,
    email: owner?.email ? String(owner.email) : null,
    countryCode: owner?.countryCode ? String(owner.countryCode) : null,
  };
}

/**
 * Matching-page invoice mode: always customer|merchant party views.
 * Typed admin doc tabs belong on Order Details, not field-matching.
 */
export function shouldUsePartyInvoicesOnVerificationPage(
  _viewerRole?: string | null,
): boolean {
  return true;
}

export function normalizeViewerRole(viewerRole: string | null | undefined): string {
  return String(viewerRole || '').toUpperCase();
}
