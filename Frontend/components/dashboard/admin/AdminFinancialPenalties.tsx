import React, { useEffect, useState, useMemo } from 'react';
import { AlertTriangle } from 'lucide-react';
import { GlassCard } from '../../ui/GlassCard';
import { useAdminStore } from '../../../stores/useAdminStore';
import { useLanguage } from '../../../contexts/LanguageContext';
import { AdminSearchInput } from './AdminSearchInput';
import { BlurredSection } from './BlurredSection';
import { useAdminPermissionsStore } from '../../../stores/useAdminPermissionsStore';
import { useFinancialTableRealtime } from '../../../hooks/useFinancialTableRealtime';
import { AdminFinancialDataTable } from './AdminFinancialDataTable';

export const AdminFinancialPenalties: React.FC = () => {
  const { t, language } = useLanguage();
  const isAr = language === 'ar';
  const bt = t.admin.billing.penaltiesTab;
  const isSectionBlurred = useAdminPermissionsStore((s) => s.isSectionBlurred);
  const financialPenalties = useAdminStore((s) => s.financialPenalties);
  const isLoadingFinancialPenalties = useAdminStore((s) => s.isLoadingFinancialPenalties);
  const fetchFinancialPenalties = useAdminStore((s) => s.fetchFinancialPenalties);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchFinancialPenalties(search);
    const timer = setTimeout(() => fetchFinancialPenalties(search), 350);
    return () => clearTimeout(timer);
  }, [search, fetchFinancialPenalties]);

  useFinancialTableRealtime(() => fetchFinancialPenalties(search), ['wallet_transactions']);

  const columns = useMemo(() => [
    { key: 'target', header: bt.target, sticky: true, render: (row: any) => <BlurredSection isBlurred={isSectionBlurred('customer_name')}><span className="text-sm text-white">{row.targetName || row.storeName || row.customerName || row.user?.name || '—'}</span></BlurredSection> },
    { key: 'role', header: bt.role, render: (row: any) => <span className="text-[10px] font-black uppercase text-white/40">{row.role || row.userRole || '—'}</span> },
    { key: 'amount', header: bt.amount, render: (row: any) => <BlurredSection isBlurred={isSectionBlurred('billing_amounts')}><span className="font-mono text-sm font-black text-orange-400">{Number(row.amount || 0).toLocaleString()} AED</span></BlurredSection> },
    { key: 'reason', header: bt.reason, render: (row: any) => <span className="text-xs text-white/50 max-w-[200px] truncate block">{row.reason || row.description || '—'}</span> },
    { key: 'orderRef', header: bt.orderRef, render: (row: any) => <span className="font-mono text-xs text-white/40">{row.orderNumber || row.orderId?.slice(-8) || '—'}</span> },
    { key: 'status', header: bt.status, render: (row: any) => <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase px-2 py-1 rounded-lg bg-orange-500/10 text-orange-400 border border-orange-500/20"><AlertTriangle size={10} /> {row.status || 'APPLIED'}</span> },
    { key: 'date', header: bt.date, render: (row: any) => <span className="font-mono text-xs text-white/40">{row.createdAt ? new Date(row.createdAt).toLocaleDateString(isAr ? 'ar-EG' : 'en-US') : '—'}</span> },
  ], [bt, isAr, isSectionBlurred]);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-6 duration-700">
      <AdminSearchInput value={search} onChange={setSearch} placeholder={t.admin.billing.searchPlaceholder} className="w-full sm:w-96" />
      <GlassCard className="p-0 overflow-hidden bg-black/20 border-white/5 shadow-2xl">
        <AdminFinancialDataTable columns={columns as any} rows={financialPenalties} rowKey={(row: any) => row.id} isLoading={isLoadingFinancialPenalties} emptyMessage={bt.empty} loadingMessage={t.admin.billing.ledger.table.scanning} />
      </GlassCard>
    </div>
  );
};
