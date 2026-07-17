export type InvoiceDocTab = 'MASTER' | 'PART' | 'SHIPPING' | 'COMMISSION';

export const INVOICE_DOC_TABS: InvoiceDocTab[] = [
  'MASTER',
  'PART',
  'SHIPPING',
  'COMMISSION',
];

export function filterInvoicesByTab(invoices: any[], tab: InvoiceDocTab): any[] {
  return (invoices || []).filter((inv) => {
    const type = String(inv?.invoiceType || 'MASTER').toUpperCase();
    return type === tab;
  });
}

export function invoiceTypeBadgeClass(type: string): string {
  switch (String(type || 'MASTER').toUpperCase()) {
    case 'PART':
      return 'bg-blue-500/15 text-blue-300 border-blue-500/30';
    case 'SHIPPING':
      return 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30';
    case 'COMMISSION':
      return 'bg-purple-500/15 text-purple-300 border-purple-500/30';
    default:
      return 'bg-gold-500/15 text-gold-400 border-gold-500/30';
  }
}
