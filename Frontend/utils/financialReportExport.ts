/** Mirrors backend financial-report-export.util profiles for client PDF layout. */
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

export const REPORT_SUMMARY_KEYS: Record<string, string[]> = {
  'platform-revenue-summary': ['platformCommissions', 'loyaltyReferralExpenses', 'commissionRefunds', 'netPlatformRevenue', 'periodStart', 'periodEnd'],
  'platform-revenue': ['platformCommissions', 'loyaltyReferralExpenses', 'commissionRefunds', 'netPlatformRevenue', 'periodStart', 'periodEnd'],
  'sales-summary': ['totalSales', 'grossCommission', 'netCommission'],
  'commission-summary': ['grossCommission', 'netCommission', 'gatewayFees'],
  'gateway-fees': ['gatewayFees'],
  'shipping-collected': ['shippingCollected'],
  'refunds-summary': ['totalRefunds', 'fullRefunds', 'partialRefunds'],
  'withdrawals-summary': ['totalAmount', 'pendingAmount', 'approvedAmount', 'transferredAmount', 'rejectedAmount', 'totalCount'],
  'escrow-holdings': ['heldMerchantAmount', 'heldCommissionAmount', 'releasedMerchantAmount', 'releasedCommissionAmount', 'heldCount', 'releasedCount'],
  'penalties-summary': ['totalPenalties', 'count'],
  'platform-reconciliation': ['stripeBalance', 'escrowHeld', 'transferable', 'transferred', 'reconciliationDelta', 'pendingWithdrawals'],
  'seller-balances': [],
  'customer-balances': [],
};

const MONEY_KEYS = new Set([
  'total', 'amount', 'commission', 'gatewayFee', 'totalAmount', 'refundAmount', 'netRefundAmount',
  'merchantAmount', 'commissionAmount', 'totalSpent', 'totalEarned', 'stripeBalance', 'escrowHeld',
  'transferable', 'transferred', 'reconciliationDelta', 'grossCommission', 'netCommission', 'gatewayFees',
  'totalSales', 'totalPenalties', 'totalRefunds', 'shippingCollected', 'platformCommissions',
  'loyaltyReferralExpenses', 'commissionRefunds', 'netPlatformRevenue', 'pendingAmount', 'approvedAmount',
  'transferredAmount', 'rejectedAmount', 'heldMerchantAmount', 'heldCommissionAmount',
  'releasedMerchantAmount', 'releasedCommissionAmount',
]);

export function getDetailColumns(reportId: string, sample: Record<string, unknown>): string[] {
  const keys = Object.keys(sample).filter((k) => k !== 'avatar' && k !== 'logo');
  const preferred = REPORT_COLUMN_ORDER[reportId];
  if (!preferred?.length) return keys;
  return [...preferred.filter((k) => keys.includes(k)), ...keys.filter((k) => !preferred.includes(k))];
}

const SUMMARY_META_KEYS = new Set(['periodStart', 'periodEnd']);

export function getSummaryEntries(
  reportId: string,
  summary: Record<string, unknown>,
): Array<[string, unknown]> {
  const keys = REPORT_SUMMARY_KEYS[reportId];
  const ordered = keys?.length ? keys : Object.keys(summary);
  return ordered
    .filter((k) => summary[k] !== undefined && summary[k] !== null)
    .filter((k) => !SUMMARY_META_KEYS.has(k))
    .map((k) => [k, summary[k]] as [string, unknown]);
}

export function getReportPeriodText(
  summary: Record<string, unknown>,
  isAr: boolean,
  labels: { from?: string; to?: string; allTime?: string },
  startDate?: string,
  endDate?: string,
  period?: string,
): string {
  const periodStart = summary.periodStart || startDate;
  const periodEnd = summary.periodEnd || endDate;
  if (periodStart || periodEnd) {
    return `${labels.from || (isAr ? 'من' : 'From')} ${
      periodStart
        ? new Date(String(periodStart)).toLocaleDateString(isAr ? 'ar-AE' : 'en-AE')
        : '—'
    } — ${labels.to || (isAr ? 'إلى' : 'To')} ${
      periodEnd ? new Date(String(periodEnd)).toLocaleDateString(isAr ? 'ar-AE' : 'en-AE') : '—'
    }`;
  }
  if (period) return period;
  return labels.allTime || (isAr ? 'كل الفترات' : 'All time');
}

export function formatReportCell(
  key: string,
  val: unknown,
  isAr: boolean,
  columnLabels: Record<string, string>,
): string {
  if (val == null || val === '') return '—';
  if (typeof val === 'boolean') return val ? (isAr ? 'نعم' : 'Yes') : (isAr ? 'لا' : 'No');
  if (key === 'label' || key === 'metric') {
    return columnLabels[String(val)] || String(val);
  }
  if (typeof val === 'number') {
    if (MONEY_KEYS.has(key) || key.endsWith('Amount') || key.includes('Balance') || key.includes('Delta')) {
      return `${val.toLocaleString(isAr ? 'ar-AE' : 'en-AE', { maximumFractionDigits: 2 })} AED`;
    }
    if (key === 'rating') return val.toFixed(1);
    return val.toLocaleString(isAr ? 'ar-AE' : 'en-AE');
  }
  if (key.includes('At') || key === 'date' || key === 'periodStart' || key === 'periodEnd') {
    const d = new Date(String(val));
    if (!Number.isNaN(d.getTime())) {
      return d.toLocaleDateString(isAr ? 'ar-AE' : 'en-AE', { year: 'numeric', month: 'short', day: 'numeric' });
    }
  }
  return String(val);
}
