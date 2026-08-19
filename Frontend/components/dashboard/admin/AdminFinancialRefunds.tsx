import React, { useEffect, useState, useMemo } from 'react';
import { RotateCcw } from 'lucide-react';
import { GlassCard } from '../../ui/GlassCard';
import { useAdminStore } from '../../../stores/useAdminStore';
import { useLanguage } from '../../../contexts/LanguageContext';
import { AdminSearchInput } from './AdminSearchInput';
import { BlurredSection } from './BlurredSection';
import { useAdminPermissionsStore } from '../../../stores/useAdminPermissionsStore';
import { useFinancialTableRealtime } from '../../../hooks/useFinancialTableRealtime';
import { AdminFinancialDataTable } from './AdminFinancialDataTable';

export const AdminFinancialRefunds: React.FC = () => {
  const { t, language } = useLanguage();
  const isAr = language === 'ar';
  const bt = t.admin.billing.refunds;
  const isSectionBlurred = useAdminPermissionsStore((s) => s.isSectionBlurred);
  const financialRefunds = useAdminStore((s) => s.financialRefunds);
  const isLoadingFinancialRefunds = useAdminStore((s) => s.isLoadingFinancialRefunds);
  const fetchFinancialRefunds = useAdminStore((s) => s.fetchFinancialRefunds);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchFinancialRefunds(search);
    const timer = setTimeout(() => fetchFinancialRefunds(search), 350);
    return () => clearTimeout(timer);
  }, [search, fetchFinancialRefunds]);

  useFinancialTableRealtime(() => fetchFinancialRefunds(search), ['returns', 'disputes']);

  const columns = useMemo(() => [
    { key: 'customer', header: bt.customer, render: (row: any) => <BlurredSection isBlurred={isSectionBlurred('customer_name')}><span className="text-sm text-white">{row.customerName || row.customer?.name || '—'}</span></BlurredSection> },
    { key: 'store', header: bt.store, render: (row: any) => <span className="text-sm text-white/70">{row.storeName || row.store?.name || '—'}</span> },
    { key: 'invoice', header: bt.invoice, render: (row: any) => <span className="font-mono text-xs text-gold-500">{row.invoiceNumber || row.invoiceId?.slice(-8) || '—'}</span> },
    { key: 'reason', header: bt.reason, render: (row: any) => <span className="text-xs text-white/50 max-w-[180px] truncate block">{row.reason || row.refundReason || '—'}</span> },
    { key: 'refundAmount', header: bt.refundAmount, render: (row: any) => <BlurredSection isBlurred={isSectionBlurred('billing_amounts')}><span className="font-mono text-sm font-black text-rose-400">{Number(row.refundAmount || row.amount || 0).toLocaleString()} AED</span></BlurredSection> },
    { key: 'refundDecision', header: bt.refundDecision, render: (row: any) => <span className="text-[10px] font-black uppercase text-white/50">{row.finalRefundDecision || '—'}</span> },
    { key: 'refundExecutionStatus', header: bt.refundExecutionStatus, render: (row: any) => <span className="text-[10px] font-black uppercase text-white/40">{row.refundExecutionStatus || '—'}</span> },
    { key: 'shippingFee', header: bt.shippingFee, render: (row: any) => <span className="font-mono text-xs text-white/50">{Number(row.shippingFee || 0).toLocaleString()}</span> },
    { key: 'gatewayFee', header: bt.gatewayFee, render: (row: any) => <span className="font-mono text-xs text-white/50">{Number(row.gatewayFee || 0).toLocaleString()}</span> },
    { key: 'costBearer', header: bt.costBearer, render: (row: any) => <span className="text-[10px] font-black uppercase text-white/40">{row.costBearer || '—'}</span> },
    { key: 'status', header: bt.status, render: (row: any) => <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase px-2 py-1 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20"><RotateCcw size={10} /> {row.status || '—'}</span> },
    { key: 'date', header: bt.date, render: (row: any) => <span className="font-mono text-xs text-white/40">{row.createdAt ? new Date(row.createdAt).toLocaleDateString(isAr ? 'ar-EG' : 'en-US') : '—'}</span> },
  ], [bt, isAr, isSectionBlurred]);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-6 duration-700">
      <AdminSearchInput value={search} onChange={setSearch} placeholder={t.admin.billing.searchPlaceholder} className="w-full sm:w-96" />
      <GlassCard className="p-0 overflow-hidden bg-black/20 border-white/5 shadow-2xl">
        <AdminFinancialDataTable columns={columns as any} rows={financialRefunds} rowKey={(row: any) => row.id} isLoading={isLoadingFinancialRefunds} emptyMessage={bt.empty} loadingMessage={t.admin.billing.ledger.table.scanning} />
      </GlassCard>
    </div>
  );
};
