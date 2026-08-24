export type ExportLang = 'ar' | 'en';

export const REPORT_DETAIL_ROW_LIMIT = 500;

/** Column order per report — mirrors AdminFinancialReports COLUMN_ORDER. */
export const REPORT_COLUMN_ORDER: Record<string, string[]> = {
  'platform-revenue-summary': ['metric', 'label', 'amount'],
  'platform-revenue': ['metric', 'label', 'amount'],
  'sales-summary': ['date', 'total', 'count'],
  'commission-summary': ['createdAt', 'orderId', 'totalAmount', 'commission', 'gatewayFee'],
  'gateway-fees': ['createdAt', 'orderId', 'gatewayFee', 'totalAmount'],
  'shipping-collected': ['date', 'shippingCollected', 'count'],
  'refunds-summary': ['createdAt', 'orderId', 'status', 'refundAmount', 'finalRefundDecision', 'refundExecutionStatus', 'netRefundAmount'],
  'withdrawals-summary': ['createdAt', 'role', 'target', 'amount', 'status', 'payoutMethod'],
  'escrow-holdings': ['status', 'merchantAmount', 'commissionAmount', 'count'],
  'seller-balances': ['name', 'totalEarned', 'ordersCount', 'rating'],
  'customer-balances': ['name', 'totalSpent', 'ordersCount'],
  'penalties-summary': ['createdAt', 'user', 'amount', 'transactionType'],
  'platform-reconciliation': ['stripeBalance', 'escrowHeld', 'transferable', 'transferred', 'reconciliationDelta'],
};

/** Summary KPI keys to export per report (ordered). Empty = meta + detail rows only. */
export const REPORT_EXPORT_PROFILES: Record<string, string[]> = {
  'platform-revenue-summary': [
    'platformCommissions',
    'loyaltyReferralExpenses',
    'commissionRefunds',
    'paymentGatewayFees',
    'netPlatformRevenue',
    'periodStart',
    'periodEnd',
  ],
  'platform-revenue': [
    'platformCommissions',
    'loyaltyReferralExpenses',
    'commissionRefunds',
    'paymentGatewayFees',
    'netPlatformRevenue',
    'periodStart',
    'periodEnd',
  ],
  'sales-summary': ['totalSales', 'grossCommission', 'netCommission'],
  'commission-summary': ['grossCommission', 'netCommission', 'gatewayFees'],
  'gateway-fees': ['gatewayFees'],
  'shipping-collected': ['shippingCollected'],
  'refunds-summary': ['totalRefunds', 'fullRefunds', 'partialRefunds'],
  'withdrawals-summary': [
    'totalAmount',
    'pendingAmount',
    'approvedAmount',
    'transferredAmount',
    'rejectedAmount',
    'totalCount',
  ],
  'escrow-holdings': [
    'heldMerchantAmount',
    'heldCommissionAmount',
    'releasedMerchantAmount',
    'releasedCommissionAmount',
    'heldCount',
    'releasedCount',
  ],
  'penalties-summary': ['totalPenalties', 'count'],
  'platform-reconciliation': [
    'stripeBalance',
    'escrowHeld',
    'transferable',
    'transferred',
    'reconciliationDelta',
    'pendingWithdrawals',
  ],
  'seller-balances': [],
  'customer-balances': [],
};

const REPORT_TITLES: Record<string, { ar: string; en: string }> = {
  'platform-revenue-summary': { ar: 'إيرادات المنصة', en: 'Platform Revenue' },
  'platform-revenue': { ar: 'إيرادات المنصة', en: 'Platform Revenue' },
  'sales-summary': { ar: 'ملخص المبيعات', en: 'Sales Summary' },
  'commission-summary': { ar: 'ملخص العمولات', en: 'Commission Summary' },
  'gateway-fees': { ar: 'رسوم البوابات', en: 'Gateway Fees' },
  'shipping-collected': { ar: 'رسوم الشحن المحصّلة', en: 'Shipping Collected' },
  'refunds-summary': { ar: 'ملخص المرتجعات', en: 'Refunds Summary' },
  'withdrawals-summary': { ar: 'ملخص السحوبات', en: 'Withdrawals Summary' },
  'escrow-holdings': { ar: 'أرصدة الضمان', en: 'Escrow Holdings' },
  'seller-balances': { ar: 'أرصدة المتاجر', en: 'Seller Balances' },
  'customer-balances': { ar: 'أرصدة العملاء', en: 'Customer Balances' },
  'penalties-summary': { ar: 'ملخص الغرامات', en: 'Penalties Summary' },
  'platform-reconciliation': { ar: 'مطابقة المنصة', en: 'Platform Reconciliation' },
};

const COLUMN_LABELS: Record<string, { ar: string; en: string }> = {
  id: { ar: 'المعرف', en: 'ID' },
  orderId: { ar: 'رقم الطلب', en: 'Order #' },
  commission: { ar: 'العمولة', en: 'Commission' },
  gatewayFee: { ar: 'رسوم البوابة', en: 'Gateway Fee' },
  totalAmount: { ar: 'إجمالي المبلغ', en: 'Total Amount' },
  createdAt: { ar: 'تاريخ الإنشاء', en: 'Created At' },
  date: { ar: 'التاريخ', en: 'Date' },
  total: { ar: 'الإجمالي', en: 'Total' },
  count: { ar: 'العدد', en: 'Count' },
  status: { ar: 'الحالة', en: 'Status' },
  role: { ar: 'الدور', en: 'Role' },
  target: { ar: 'الاسم / المتجر', en: 'Name / Store' },
  amount: { ar: 'المبلغ', en: 'Amount' },
  payoutMethod: { ar: 'طريقة الدفع', en: 'Payout Method' },
  refundAmount: { ar: 'مبلغ الاسترداد', en: 'Refund Amount' },
  netRefundAmount: { ar: 'صافي الاسترداد', en: 'Net Refund' },
  finalRefundDecision: { ar: 'قرار الاسترداد', en: 'Refund Decision' },
  refundExecutionStatus: { ar: 'حالة التنفيذ', en: 'Execution Status' },
  merchantAmount: { ar: 'مبلغ التاجر', en: 'Merchant Amount' },
  commissionAmount: { ar: 'مبلغ العمولة', en: 'Commission Amount' },
  user: { ar: 'المستخدم', en: 'User' },
  transactionType: { ar: 'نوع المعاملة', en: 'Transaction Type' },
  name: { ar: 'الاسم', en: 'Name' },
  totalSpent: { ar: 'إجمالي الإنفاق', en: 'Total Spent' },
  ordersCount: { ar: 'عدد الطلبات', en: 'Orders Count' },
  totalEarned: { ar: 'إجمالي الأرباح', en: 'Total Earned' },
  stripeBalance: { ar: 'رصيد Stripe', en: 'Stripe Balance' },
  escrowHeld: { ar: 'الضمان المحجوز', en: 'Escrow Held' },
  transferable: { ar: 'قابل للتحويل', en: 'Transferable' },
  transferred: { ar: 'محوّل', en: 'Transferred' },
  reconciliationDelta: { ar: 'فرق المطابقة', en: 'Reconciliation Delta' },
  grossCommission: { ar: 'إجمالي العمولة', en: 'Gross Commission' },
  netCommission: { ar: 'صافي العمولة', en: 'Net Commission' },
  gatewayFees: { ar: 'رسوم البوابات', en: 'Gateway Fees' },
  totalSales: { ar: 'إجمالي المبيعات', en: 'Total Sales' },
  totalPenalties: { ar: 'إجمالي الغرامات', en: 'Total Penalties' },
  totalRefunds: { ar: 'إجمالي المرتجعات', en: 'Total Refunds' },
  fullRefunds: { ar: 'مرتجعات كاملة', en: 'Full Refunds' },
  partialRefunds: { ar: 'مرتجعات جزئية', en: 'Partial Refunds' },
  shippingCollected: { ar: 'الشحن المحصّل', en: 'Shipping Collected' },
  platformCommissions: { ar: 'عمولات المنصة', en: 'Platform Commissions' },
  loyaltyReferralExpenses: { ar: 'مصروف الولاء والإحالة', en: 'Loyalty & Referral Expenses' },
  commissionRefunds: { ar: 'عمولات مستردة', en: 'Commission Refunds' },
  paymentGatewayFees: { ar: 'رسوم بوابة الدفع', en: 'Payment Gateway Fees' },
  netPlatformRevenue: { ar: 'صافي إيرادات المنصة', en: 'Net Platform Revenue' },
  periodStart: { ar: 'بداية الفترة', en: 'Period Start' },
  periodEnd: { ar: 'نهاية الفترة', en: 'Period End' },
  metric: { ar: 'المؤشر', en: 'Metric' },
  label: { ar: 'البيان', en: 'Label' },
  totalAmount_summary: { ar: 'إجمالي المبالغ', en: 'Total Amount' },
  totalCount: { ar: 'إجمالي الطلبات', en: 'Total Count' },
  pendingAmount: { ar: 'مبالغ معلّقة', en: 'Pending Amount' },
  approvedAmount: { ar: 'مبالغ موافق عليها', en: 'Approved Amount' },
  transferredAmount: { ar: 'مبالغ محوّلة', en: 'Transferred Amount' },
  rejectedAmount: { ar: 'مبالغ مرفوضة', en: 'Rejected Amount' },
  heldMerchantAmount: { ar: 'ضمان التاجر (محجوز)', en: 'Held Merchant Amount' },
  heldCommissionAmount: { ar: 'عمولة محجوزة', en: 'Held Commission' },
  heldCount: { ar: 'معاملات محجوزة', en: 'Held Count' },
  releasedMerchantAmount: { ar: 'ضمان التاجر (مُفرج)', en: 'Released Merchant Amount' },
  releasedCommissionAmount: { ar: 'عمولة مُفرج عنها', en: 'Released Commission' },
  releasedCount: { ar: 'معاملات مُفرج عنها', en: 'Released Count' },
  pendingWithdrawals: { ar: 'سحوبات معلّقة', en: 'Pending Withdrawals' },
  rating: { ar: 'التقييم', en: 'Rating' },
};

const MONEY_KEYS = new Set([
  'total',
  'amount',
  'commission',
  'gatewayFee',
  'totalAmount',
  'refundAmount',
  'netRefundAmount',
  'merchantAmount',
  'commissionAmount',
  'totalSpent',
  'totalEarned',
  'stripeBalance',
  'escrowHeld',
  'transferable',
  'transferred',
  'reconciliationDelta',
  'grossCommission',
  'netCommission',
  'gatewayFees',
  'paymentGatewayFees',
  'totalSales',
  'totalPenalties',
  'totalRefunds',
  'shippingCollected',
  'platformCommissions',
  'loyaltyReferralExpenses',
  'commissionRefunds',
  'netPlatformRevenue',
  'pendingAmount',
  'approvedAmount',
  'transferredAmount',
  'rejectedAmount',
  'heldMerchantAmount',
  'heldCommissionAmount',
  'releasedMerchantAmount',
  'releasedCommissionAmount',
]);

const META_LABELS = {
  ar: {
    platform: 'E-Tashleh.net — ELLIPP FZ LLC',
    generatedAt: 'تاريخ التوليد',
    period: 'الفترة',
    allTime: 'كل الفترات',
    from: 'من',
    to: 'إلى',
    summarySection: 'ملخص المؤشرات',
    detailsSection: 'تفاصيل التقرير',
    rowCount: 'عدد الصفوف',
    truncatedNote: 'يعرض أول {n} صف فقط',
    currency: 'AED',
  },
  en: {
    platform: 'E-Tashleh.net — ELLIPP FZ LLC',
    generatedAt: 'Generated at',
    period: 'Period',
    allTime: 'All time',
    from: 'From',
    to: 'To',
    summarySection: 'Summary KPIs',
    detailsSection: 'Report details',
    rowCount: 'Row count',
    truncatedNote: 'Showing first {n} rows only',
    currency: 'AED',
  },
};

export function normalizeExportLang(raw?: string): ExportLang {
  return raw === 'en' ? 'en' : 'ar';
}

export function sanitizeExportFilename(reportId: string, ext: string): string {
  const safe = String(reportId || 'report').replace(/[^a-zA-Z0-9_-]/g, '_');
  return `${safe}_${new Date().toISOString().slice(0, 10)}.${ext}`;
}

export function resolveReportTitle(reportId: string, lang: ExportLang): string {
  return REPORT_TITLES[reportId]?.[lang] || reportId;
}

export function resolveColumnLabel(key: string, lang: ExportLang): string {
  return COLUMN_LABELS[key]?.[lang] || key;
}

export function getSummaryKeysForReport(reportId: string): string[] {
  return REPORT_EXPORT_PROFILES[reportId] ?? [];
}

export function getDetailColumnOrder(reportId: string, sampleRow: Record<string, unknown>): string[] {
  const keys = Object.keys(sampleRow).filter((k) => k !== 'avatar' && k !== 'logo');
  const preferred = REPORT_COLUMN_ORDER[reportId];
  if (!preferred?.length) return keys;
  return [...preferred.filter((k) => keys.includes(k)), ...keys.filter((k) => !preferred.includes(k))];
}

export function buildExportMeta(
  reportId: string,
  report: {
    generatedAt?: string;
    summary?: Record<string, unknown>;
  },
  filters: { startDate?: string; endDate?: string; period?: string },
  lang: ExportLang,
) {
  const meta = META_LABELS[lang];
  const summary = report.summary || {};
  const periodStart = summary.periodStart || filters.startDate;
  const periodEnd = summary.periodEnd || filters.endDate;
  let periodText = meta.allTime;
  if (periodStart || periodEnd) {
    periodText = `${meta.from} ${formatExportDate(periodStart, lang) || '—'} — ${meta.to} ${formatExportDate(periodEnd, lang) || '—'}`;
  } else if (filters.period) {
    periodText = filters.period;
  }

  return {
    platform: meta.platform,
    title: resolveReportTitle(reportId, lang),
    generatedAtLabel: meta.generatedAt,
    generatedAt: formatExportDateTime(report.generatedAt || new Date().toISOString(), lang),
    periodLabel: meta.period,
    periodText,
    summarySection: meta.summarySection,
    detailsSection: meta.detailsSection,
    rowCountLabel: meta.rowCount,
    truncatedNote: meta.truncatedNote,
    currency: meta.currency,
  };
}

export function buildSummaryRows(
  reportId: string,
  summary: Record<string, unknown>,
  lang: ExportLang,
): Array<{ key: string; label: string; value: string }> {
  const keys = getSummaryKeysForReport(reportId);
  const ordered =
    keys.length > 0
      ? keys
      : Object.keys(summary).filter((k) => isScalarExportValue(summary[k]));
  return ordered
    .filter((k) => summary[k] !== undefined && summary[k] !== null)
    .map((key) => ({
      key,
      label: resolveColumnLabel(key, lang),
      value: formatExportCell(key, summary[key], lang),
    }));
}

function isScalarExportValue(val: unknown): boolean {
  return val == null || ['string', 'number', 'boolean'].includes(typeof val);
}

export function formatExportDate(val: unknown, lang: ExportLang): string {
  if (!val) return '';
  const d = new Date(String(val));
  if (Number.isNaN(d.getTime())) return String(val);
  return d.toLocaleDateString(lang === 'ar' ? 'ar-AE' : 'en-AE', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function formatExportDateTime(val: unknown, lang: ExportLang): string {
  if (!val) return '';
  const d = new Date(String(val));
  if (Number.isNaN(d.getTime())) return String(val);
  return d.toLocaleString(lang === 'ar' ? 'ar-AE' : 'en-AE', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatExportCell(key: string, val: unknown, lang: ExportLang): string {
  if (val == null || val === '') return '—';
  if (typeof val === 'boolean') return val ? (lang === 'ar' ? 'نعم' : 'Yes') : (lang === 'ar' ? 'لا' : 'No');
  if (key === 'label' || key === 'metric') {
    const s = String(val);
    return COLUMN_LABELS[s]?.[lang] || s;
  }
  if (typeof val === 'number') {
    if (MONEY_KEYS.has(key) || key.endsWith('Amount') || key.includes('Balance') || key.includes('Delta')) {
      return `${val.toLocaleString(lang === 'ar' ? 'ar-AE' : 'en-AE', { maximumFractionDigits: 2 })} AED`;
    }
    if (key === 'rating') return val.toFixed(1);
    return val.toLocaleString(lang === 'ar' ? 'ar-AE' : 'en-AE');
  }
  if (key.includes('At') || key === 'date' || key === 'periodStart' || key === 'periodEnd') {
    return formatExportDate(val, lang) || String(val);
  }
  return String(val);
}

export function buildStyledCsvPayload(
  reportId: string,
  report: { generatedAt?: string; summary?: Record<string, unknown>; rows?: Record<string, unknown>[] },
  filters: { startDate?: string; endDate?: string; period?: string },
  lang: ExportLang,
): string {
  const meta = buildExportMeta(reportId, report, filters, lang);
  const summary = (report.summary || {}) as Record<string, unknown>;
  const rows = Array.isArray(report.rows) ? report.rows : [];
  const summaryRows = buildSummaryRows(reportId, summary, lang);
  const sampleRow = rows[0] || {};
  const columns = getDetailColumnOrder(reportId, sampleRow);
  const escape = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);

  const lines: string[] = [
    escape(meta.platform),
    escape(meta.title),
    `${escape(meta.generatedAtLabel)},${escape(meta.generatedAt)}`,
    `${escape(meta.periodLabel)},${escape(meta.periodText)}`,
    '',
    escape(`# ${meta.summarySection}`),
    `${escape(lang === 'ar' ? 'المؤشر' : 'Metric')},${escape(lang === 'ar' ? 'القيمة' : 'Value')}`,
    ...summaryRows.map((r) => `${escape(r.label)},${escape(r.value)}`),
    '',
    escape(`# ${meta.detailsSection}`),
  ];

  if (columns.length > 0) {
    lines.push(columns.map((c) => escape(resolveColumnLabel(c, lang))).join(','));
    for (const row of rows) {
      lines.push(columns.map((c) => escape(formatExportCell(c, row[c], lang))).join(','));
    }
  }

  if (rows.length >= REPORT_DETAIL_ROW_LIMIT) {
    lines.push('', escape(meta.truncatedNote.replace('{n}', String(REPORT_DETAIL_ROW_LIMIT))));
  }

  lines.push('', `${escape(meta.rowCountLabel)},${escape(String(rows.length))}`);
  return '\uFEFF' + lines.join('\n');
}

export const GOLD_FILL = 'FFD4AF37';
export const GOLD_HEADER_FONT = { bold: true, size: 12, color: { argb: 'FFFFFFFF' } };
