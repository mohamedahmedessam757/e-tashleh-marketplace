import React, { useEffect, useState, useMemo, useCallback } from 'react';
import {
  Download,
  FileBarChart,
  RefreshCw,
  Calendar,
  TrendingUp,
  BarChart3,
  Wallet,
  Shield,
  Users,
  Store,
  AlertTriangle,
  Scale,
  ArrowUpRight,
  Crown,
  Loader2,
} from 'lucide-react';
import { GlassCard } from '../../ui/GlassCard';
import { useAdminStore, type AdminFinancialReportId } from '../../../stores/useAdminStore';
import { useLanguage } from '../../../contexts/LanguageContext';
import { useAdminPermissionsStore } from '../../../stores/useAdminPermissionsStore';
import { downloadFinancialReportPdf } from '../../../utils/financialReportPdf';
import { getReportPeriodText, getSummaryEntries } from '../../../utils/financialReportExport';

const REPORT_IDS: AdminFinancialReportId[] = [
  'platform-revenue-summary',
  'sales-summary',
  'commission-summary',
  'gateway-fees',
  'shipping-collected',
  'refunds-summary',
  'withdrawals-summary',
  'escrow-holdings',
  'seller-balances',
  'customer-balances',
  'penalties-summary',
  'platform-reconciliation',
];

const REPORT_ICONS: Partial<Record<AdminFinancialReportId, React.ElementType>> = {
  'platform-revenue-summary': Crown,
  'platform-revenue': Crown,
  'sales-summary': TrendingUp,
  'commission-summary': BarChart3,
  'gateway-fees': Wallet,
  'shipping-collected': ArrowUpRight,
  'refunds-summary': RefreshCw,
  'withdrawals-summary': Wallet,
  'escrow-holdings': Shield,
  'seller-balances': Store,
  'customer-balances': Users,
  'penalties-summary': AlertTriangle,
  'platform-reconciliation': Scale,
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
  'totalSales',
  'totalPenalties',
  'totalRefunds',
  'shippingCollected',
  'platformRevenue',
  'platformCommissionBalance',
  'platformFeesBalance',
  'netPlatformPosition',
  'platformCommissions',
  'loyaltyReferralExpenses',
  'commissionRefunds',
  'paymentGatewayFees',
  'netPlatformRevenue',
  'commissionBalance',
  'feesBalance',
  'totalAmount_summary',
  'pendingAmount',
  'approvedAmount',
  'transferredAmount',
  'rejectedAmount',
  'heldMerchantAmount',
  'heldCommissionAmount',
  'releasedMerchantAmount',
  'releasedCommissionAmount',
  'lastSettlementDelta',
  'pendingWithdrawals',
]);

const HIDDEN_COLUMNS = new Set(['avatar', 'logo']);

const COLUMN_ORDER: Partial<Record<AdminFinancialReportId, string[]>> = {
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

const STATUS_COLORS: Record<string, string> = {
  HELD: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  RELEASED: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  PENDING: 'bg-yellow-500/15 text-yellow-300 border-yellow-500/30',
  APPROVED: 'bg-blue-500/15 text-blue-300 border-blue-500/30',
  REJECTED: 'bg-red-500/15 text-red-300 border-red-500/30',
  COMPLETED: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  TRANSFERRED: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  FAILED: 'bg-red-500/15 text-red-300 border-red-500/30',
  CANCELLED: 'bg-white/10 text-white/40 border-white/10',
  PROCESSING: 'bg-purple-500/15 text-purple-300 border-purple-500/30',
  SUCCESS: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
};


export const AdminFinancialReports: React.FC = () => {
  const { t, language } = useLanguage();
  const isAr = language === 'ar';
  const bt = t.admin.billing.reports;
  const columnLabels = (bt as any).columns || {};
  const statusLabels = (bt as any).statusLabels || {};
  const roleLabels = (bt as any).roleLabels || {};
  const payoutLabels = (bt as any).payoutLabels || {};
  const descriptions = (bt as any).descriptions || {};

  const financialReportData = useAdminStore((s) => s.financialReportData);
  const isLoadingFinancialReport = useAdminStore((s) => s.isLoadingFinancialReport);
  const fetchFinancialReport = useAdminStore((s) => s.fetchFinancialReport);
  const exportFinancialReport = useAdminStore((s) => s.exportFinancialReport);
  const currentAdmin = useAdminStore((s) => s.currentAdmin);
  const canPerform = useAdminPermissionsStore((s) => s.canPerform);
  const canExport =
    canPerform('billing', 'EXPORT_FINANCIALS') ||
    canPerform('billing', 'EXPORT_REPORTS') ||
    currentAdmin?.role === 'SUPER_ADMIN';

  const [selectedReport, setSelectedReport] = useState<AdminFinancialReportId>('platform-revenue-summary');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [period, setPeriod] = useState<'' | 'monthly' | 'quarterly' | 'yearly'>('');
  const [error, setError] = useState<string | null>(null);
  const [exportingFormat, setExportingFormat] = useState<'csv' | 'xlsx' | 'pdf' | null>(null);

  const exportParams = useMemo(
    () => ({
      startDate,
      endDate,
      ...(period ? { period } : {}),
      lang: isAr ? 'ar' : 'en',
    }),
    [startDate, endDate, period, isAr],
  );

  const handleExport = useCallback(
    async (format: 'csv' | 'xlsx' | 'pdf') => {
      setError(null);
      setExportingFormat(format);
      try {
        if (format === 'pdf') {
          await fetchFinancialReport(selectedReport, exportParams);
          const data = useAdminStore.getState().financialReportData;
          if (!data) throw new Error(bt.exportFailed || 'Export failed');
          await downloadFinancialReportPdf(
            {
              reportId: selectedReport,
              reportData: data,
              isAr,
              labels: {
                platform: bt.platformLegal,
                generatedAt: bt.generatedAt,
                period: bt.period,
                allTime: bt.allTime,
                from: bt.from,
                to: bt.to,
                summarySection: bt.summarySection,
                detailsSection: bt.detailsSection,
                rowCount: bt.rowCount,
                truncatedNote: bt.truncatedNote,
                reportRef: (bt as any).reportRef,
                verifiedDocument: (bt as any).verifiedDocument,
                types: bt.types as Record<string, string>,
                columns: columnLabels,
                summaryCards: (bt as any).summaryCards as Record<string, string>,
              },
              startDate,
              endDate,
              period: period || undefined,
            },
            `${selectedReport}_${new Date().toISOString().slice(0, 10)}.pdf`,
          );
          return;
        }
        await exportFinancialReport(selectedReport, format, exportParams);
      } catch (err) {
        setError((err as Error).message || bt.exportFailed || 'Export failed');
      } finally {
        setExportingFormat(null);
      }
    },
    [
      bt,
      columnLabels,
      endDate,
      exportFinancialReport,
      exportParams,
      fetchFinancialReport,
      financialReportData,
      isAr,
      period,
      selectedReport,
      startDate,
    ],
  );

  const loadReport = useCallback(() => {
    setError(null);
    fetchFinancialReport(selectedReport, {
      ...(startDate ? { startDate } : {}),
      ...(endDate ? { endDate } : {}),
      ...(period ? { period } : {}),
    }).catch((err: Error) => setError(err.message));
  }, [selectedReport, startDate, endDate, period, fetchFinancialReport]);

  useEffect(() => {
    loadReport();
  }, [loadReport]);

  const rows = useMemo(() => {
    if (!financialReportData) return [];
    if (Array.isArray(financialReportData)) return financialReportData;
    return financialReportData.rows ?? financialReportData.data ?? [];
  }, [financialReportData]);

  const numberLocale = isAr ? 'ar-AE' : 'en-AE';
  const summaryCards = (bt as any).summaryCards as Record<string, string> | undefined;

  const summaryEntries = useMemo(() => {
    const summary = financialReportData?.summary;
    if (!summary || typeof summary !== 'object') return [];
    return getSummaryEntries(selectedReport, summary as Record<string, unknown>);
  }, [financialReportData, selectedReport]);

  const periodBanner = useMemo(() => {
    const summary = (financialReportData?.summary || {}) as Record<string, unknown>;
    return getReportPeriodText(summary, isAr, bt, startDate, endDate, period || undefined);
  }, [financialReportData, isAr, bt, startDate, endDate, period]);

  const formatMoney = (val: number) =>
    `${val.toLocaleString(numberLocale, { maximumFractionDigits: 2 })} AED`;

  const formatCell = useCallback(
    (key: string, val: unknown) => {
      if (val == null || val === '') return '—';
      if (typeof val === 'boolean') return val ? (isAr ? 'نعم' : 'Yes') : (isAr ? 'لا' : 'No');

      if ((key === 'label' || key === 'metric') && typeof val === 'string') {
        return columnLabels[val] || val;
      }

      if (key === 'status' && typeof val === 'string') {
        const label = statusLabels[val] || val;
        const color = STATUS_COLORS[val] || 'bg-white/10 text-white/60 border-white/10';
        return (
          <span className={`inline-flex px-2.5 py-1 rounded-lg text-[10px] font-black uppercase border ${color}`}>
            {label}
          </span>
        );
      }

      if (key === 'role' && typeof val === 'string') {
        return roleLabels[val] || val;
      }

      if (key === 'payoutMethod' && typeof val === 'string') {
        return payoutLabels[val] || val;
      }

      if (key.includes('At') || key === 'date') {
        const d = new Date(String(val));
        if (!Number.isNaN(d.getTime())) {
          return d.toLocaleDateString(numberLocale, {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
          });
        }
      }

      if (typeof val === 'number') {
        if (MONEY_KEYS.has(key) || key.endsWith('Amount') || key.includes('Balance') || key.includes('Delta')) {
          return <span className="font-mono font-bold text-white">{formatMoney(val)}</span>;
        }
        if (key === 'rating') {
          return (
            <span className="inline-flex items-center gap-1 text-gold-400 font-bold">
              <Crown size={12} />
              {val.toFixed(1)}
            </span>
          );
        }
        return val.toLocaleString(numberLocale);
      }

      return String(val);
    },
    [isAr, numberLocale, formatMoney, statusLabels, roleLabels, payoutLabels, columnLabels],
  );

  const columns = useMemo(() => {
    if (!rows.length) return [];
    const keys = Object.keys(rows[0]).filter((k) => !HIDDEN_COLUMNS.has(k));
    const preferred = COLUMN_ORDER[selectedReport];
    const ordered = preferred
      ? [...preferred.filter((k) => keys.includes(k)), ...keys.filter((k) => !preferred.includes(k))]
      : keys;

    return ordered.map((key) => ({
      key,
      header: columnLabels[key] || key,
      className:
        MONEY_KEYS.has(key) || key.endsWith('Amount') ? 'text-right' : undefined,
      render: (row: Record<string, unknown>) => formatCell(key, row[key]),
    }));
  }, [rows, columnLabels, selectedReport, formatCell]);

  const ReportIcon = REPORT_ICONS[selectedReport] || FileBarChart;
  const generatedAt = financialReportData?.generatedAt
    ? new Date(financialReportData.generatedAt).toLocaleString(numberLocale)
    : null;

  const summaryColors = [
    'from-emerald-500/20 to-emerald-500/5 border-emerald-500/20 text-emerald-400',
    'from-gold-500/20 to-gold-500/5 border-gold-500/20 text-gold-400',
    'from-blue-500/20 to-blue-500/5 border-blue-500/20 text-blue-400',
    'from-purple-500/20 to-purple-500/5 border-purple-500/20 text-purple-400',
    'from-amber-500/20 to-amber-500/5 border-amber-500/20 text-amber-400',
    'from-cyan-500/20 to-cyan-500/5 border-cyan-500/20 text-cyan-400',
    'from-rose-500/20 to-rose-500/5 border-rose-500/20 text-rose-400',
    'from-indigo-500/20 to-indigo-500/5 border-indigo-500/20 text-indigo-400',
  ];

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-6 duration-700" dir={isAr ? 'rtl' : 'ltr'}>
      {/* Header */}
      <GlassCard className="p-6 sm:p-8 bg-gradient-to-br from-[#151310] via-[#12100d] to-[#0d0c0a] border-white/5 overflow-hidden relative">
        <div className="absolute top-0 left-0 w-64 h-64 bg-gold-500/5 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2 pointer-events-none" />
        <div className="relative flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gold-500/10 border border-gold-500/20 flex items-center justify-center shrink-0">
              <FileBarChart size={28} className="text-gold-400" />
            </div>
            <div>
              <h2 className="text-xl font-black text-white uppercase tracking-tight">
                {t.admin.billing.panels.reports}
              </h2>
              <p className="text-[11px] text-white/40 mt-1 max-w-lg leading-relaxed">
                {descriptions[selectedReport] || bt.selectReport}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={loadReport}
              disabled={isLoadingFinancialReport}
              className="px-4 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-[10px] font-black uppercase flex items-center gap-2 transition-all disabled:opacity-50"
            >
              <RefreshCw size={14} className={isLoadingFinancialReport ? 'animate-spin' : ''} />
              {bt.refresh}
            </button>
            {canExport &&
              (
                [
                  { format: 'csv' as const, label: bt.exportCsv || `${bt.export} CSV` },
                  { format: 'xlsx' as const, label: bt.exportXlsx || `${bt.export} XLSX` },
                  { format: 'pdf' as const, label: bt.exportPdf || `${bt.export} PDF` },
                ] as const
              ).map(({ format, label }) => (
              <button
                key={format}
                type="button"
                disabled={!!exportingFormat || isLoadingFinancialReport}
                onClick={() => handleExport(format)}
                className="px-4 py-2.5 bg-gold-500/10 hover:bg-gold-500 hover:text-black border border-gold-500/20 text-gold-500 rounded-xl text-[10px] font-black uppercase flex items-center gap-2 transition-all disabled:opacity-50"
              >
                {exportingFormat === format ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Download size={14} />
                )}
                {label}
              </button>
            ))}
          </div>
        </div>
      </GlassCard>

      {/* Report type picker */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
        {REPORT_IDS.map((id) => {
          const Icon = REPORT_ICONS[id] || FileBarChart;
          const active = selectedReport === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => setSelectedReport(id)}
              className={`group p-4 rounded-2xl border text-start transition-all duration-300 ${
                active
                  ? 'bg-gold-500/10 border-gold-500/40 shadow-[0_0_20px_rgba(212,175,55,0.12)]'
                  : 'bg-white/[0.02] border-white/5 hover:border-white/15 hover:bg-white/[0.04]'
              }`}
            >
              <Icon
                size={18}
                className={`mb-3 transition-colors ${active ? 'text-gold-400' : 'text-white/30 group-hover:text-white/50'}`}
              />
              <p className={`text-[10px] font-black uppercase leading-snug ${active ? 'text-gold-300' : 'text-white/50'}`}>
                {bt.types[id] || id}
              </p>
            </button>
          );
        })}
      </div>

      {/* Date filter */}
      <GlassCard className="p-5 bg-[#151310] border-white/5">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex items-center gap-2 text-white/30 shrink-0">
            <Calendar size={16} />
            <span className="text-[10px] font-black uppercase">{isAr ? 'فترة التقرير' : 'Report period'}</span>
          </div>
          <div className="flex flex-wrap items-center gap-3 flex-1">
            {([
              { id: 'monthly', ar: 'شهري', en: 'Monthly' },
              { id: 'quarterly', ar: 'ربع سنوي', en: 'Quarterly' },
              { id: 'yearly', ar: 'سنوي', en: 'Yearly' },
            ] as const).map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => {
                  setPeriod(p.id);
                  setStartDate('');
                  setEndDate('');
                }}
                className={`px-3 py-2 rounded-xl text-[9px] font-black uppercase border ${
                  period === p.id
                    ? 'bg-gold-500 text-black border-gold-500'
                    : 'bg-white/5 text-white/50 border-white/10'
                }`}
              >
                {isAr ? p.ar : p.en}
              </button>
            ))}
            <div className="flex items-center gap-2 bg-black/30 border border-white/10 rounded-xl px-4 py-2.5">
              <span className="text-[9px] font-black text-white/30 uppercase">{bt.dateFrom}</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setPeriod('');
                  setStartDate(e.target.value);
                }}
                className="bg-transparent text-xs text-white font-mono outline-none"
              />
            </div>
            <span className="text-white/20 hidden sm:block">→</span>
            <div className="flex items-center gap-2 bg-black/30 border border-white/10 rounded-xl px-4 py-2.5">
              <span className="text-[9px] font-black text-white/30 uppercase">{bt.dateTo}</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setPeriod('');
                  setEndDate(e.target.value);
                }}
                className="bg-transparent text-xs text-white font-mono outline-none"
              />
            </div>
            {!startDate && !endDate && (
              <span className="text-[10px] text-white/25 font-bold uppercase px-3 py-1.5 bg-white/5 rounded-lg border border-white/5">
                {bt.allTime}
              </span>
            )}
          </div>
        </div>
      </GlassCard>

      {/* Summary KPIs */}
      {summaryEntries.length > 0 && (
        <div className="space-y-3">
          <p className="text-[10px] font-black uppercase tracking-widest text-white/35">{periodBanner}</p>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {summaryEntries.map(([key, val], idx) => {
              const color = summaryColors[idx % summaryColors.length];
              return (
                <GlassCard
                  key={key}
                  className={`p-5 bg-gradient-to-br border ${color.split(' ').slice(2).join(' ')} relative overflow-hidden`}
                >
                  <div
                    className={`absolute inset-0 bg-gradient-to-br ${color.split(' ').slice(0, 2).join(' ')} opacity-50 pointer-events-none`}
                  />
                  <div className="relative">
                    <p className="text-[9px] font-black text-white/40 uppercase mb-2 leading-tight">
                      {summaryCards?.[key] || columnLabels[key] || key}
                    </p>
                    <div className="text-lg sm:text-xl font-black text-white font-mono">
                      {formatCell(key, val)}
                    </div>
                  </div>
                </GlassCard>
              );
            })}
          </div>
        </div>
      )}

      {/* Data table */}
      <GlassCard className="p-0 overflow-hidden bg-[#0F0E0C] border-white/5 shadow-2xl">
        <div className="px-6 py-4 border-b border-white/5 flex flex-wrap items-center justify-between gap-3 bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gold-500/10 flex items-center justify-center">
              <ReportIcon size={18} className="text-gold-400" />
            </div>
            <div>
              <p className="text-sm font-black text-white">{bt.types[selectedReport] || selectedReport}</p>
              {generatedAt && (
                <p className="text-[9px] text-white/30 font-mono mt-0.5">
                  {bt.generatedAt}: {generatedAt}
                </p>
              )}
            </div>
          </div>
          {!isLoadingFinancialReport && rows.length > 0 && (
            <span className="text-[10px] font-black text-white/30 uppercase bg-white/5 px-3 py-1.5 rounded-lg border border-white/5">
              {bt.rowCount}: {rows.length}
            </span>
          )}
        </div>

        {isLoadingFinancialReport ? (
          <div className="py-24 text-center">
            <RefreshCw size={24} className="mx-auto mb-4 text-gold-500/50 animate-spin" />
            <p className="text-white/30 text-xs uppercase font-black">{t.admin.billing.ledger.table.scanning}</p>
          </div>
        ) : error ? (
          <div className="py-24 text-center">
            <AlertTriangle size={24} className="mx-auto mb-4 text-red-400/60" />
            <p className="text-red-400/80 text-sm">{error}</p>
          </div>
        ) : rows.length === 0 ? (
          <div className="py-24 text-center">
            <FileBarChart size={32} className="mx-auto mb-4 text-white/10" />
            <p className="text-white/20 text-xs uppercase font-black">{bt.empty}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left min-w-[720px]">
              <thead>
                <tr className="bg-white/[0.03] border-b border-white/5">
                  {columns.map((col) => (
                    <th
                      key={col.key}
                      className={`px-6 py-4 text-[10px] font-black text-white/40 uppercase tracking-wider ${col.className || ''}`}
                    >
                      {col.header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {rows.map((row, idx) => (
                  <tr
                    key={idx}
                    className="hover:bg-white/[0.02] transition-colors group even:bg-white/[0.01]"
                  >
                    {columns.map((col) => (
                      <td
                        key={col.key}
                        className={`px-6 py-4 text-xs text-white/75 group-hover:text-white/90 transition-colors ${col.className || ''}`}
                      >
                        {col.render ? col.render(row) : String(row[col.key] ?? '—')}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </GlassCard>
    </div>
  );
};
