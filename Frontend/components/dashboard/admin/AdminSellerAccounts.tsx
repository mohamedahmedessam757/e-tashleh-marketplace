import React, { useEffect, useState, useMemo } from 'react';
import { Crown, ExternalLink, HelpCircle } from 'lucide-react';
import { GlassCard } from '../../ui/GlassCard';
import { useAdminStore } from '../../../stores/useAdminStore';
import { useLanguage } from '../../../contexts/LanguageContext';
import { AdminSearchInput } from './AdminSearchInput';
import { BlurredSection } from './BlurredSection';
import { useAdminPermissionsStore } from '../../../stores/useAdminPermissionsStore';
import { useFinancialTableRealtime } from '../../../hooks/useFinancialTableRealtime';
import { AdminFinancialDataTable } from './AdminFinancialDataTable';

interface AdminSellerAccountsProps {
  onNavigate?: (path: string, id: string) => void;
}

export const AdminSellerAccounts: React.FC<AdminSellerAccountsProps> = ({ onNavigate }) => {
  const { t } = useLanguage();
  const bt = t.admin.billing.sellerAccounts;
  const isSectionBlurred = useAdminPermissionsStore((s) => s.isSectionBlurred);
  const sellerAccounts = useAdminStore((s) => s.sellerAccounts);
  const isLoadingSellerAccounts = useAdminStore((s) => s.isLoadingSellerAccounts);
  const fetchSellerAccounts = useAdminStore((s) => s.fetchSellerAccounts);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchSellerAccounts(search);
    const timer = setTimeout(() => fetchSellerAccounts(search), 350);
    return () => clearTimeout(timer);
  }, [search, fetchSellerAccounts]);

  useFinancialTableRealtime(() => fetchSellerAccounts(search), ['stores', 'wallet_transactions']);

  const columns = useMemo(() => [
    {
      key: 'storeName',
      header: bt.storeName,
      sticky: true,
      render: (row: any) => (
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gold-500/10 border border-gold-500/20 flex items-center justify-center shrink-0">
            <Crown size={16} className="text-gold-500" />
          </div>
          <BlurredSection isBlurred={isSectionBlurred('customer_name')}>
            <button type="button" className="text-sm font-black text-white hover:text-gold-400" onClick={() => onNavigate?.('store-profile', row.storeId || row.id)}>
              {row.storeName || row.name}
            </button>
          </BlurredSection>
        </div>
      ),
    },
    { key: 'storeId', header: bt.storeId, render: (row: any) => <span className="font-mono text-[10px] text-white/40">#{String(row.storeId || row.id).slice(-8).toUpperCase()}</span> },
    { key: 'pending', header: bt.pending, render: (row: any) => <span className="font-mono text-xs text-amber-400">{Number(row.pending || row.pendingBalance || 0).toLocaleString()}</span> },
    { key: 'available', header: bt.available, render: (row: any) => <BlurredSection isBlurred={isSectionBlurred('billing_amounts')}><span className="font-mono text-xs text-emerald-400">{Number(row.available || row.balance || 0).toLocaleString()}</span></BlurredSection> },
    { key: 'frozen', header: bt.frozen, render: (row: any) => <span className="font-mono text-xs text-rose-400">{Number(row.frozen || row.frozenBalance || 0).toLocaleString()}</span> },
    { key: 'totalSales', header: bt.totalSales, render: (row: any) => <span className="font-mono text-xs text-white/70">{Number(row.totalSales || 0).toLocaleString()}</span> },
    { key: 'totalRefunds', header: bt.totalRefunds, render: (row: any) => <span className="font-mono text-xs text-white/50">{Number(row.totalRefunds || 0).toLocaleString()}</span> },
    { key: 'disputes', header: bt.disputes, render: (row: any) => <span className="text-xs text-white/50">{row.disputes ?? row.disputesCount ?? 0}</span> },
    { key: 'penalties', header: bt.penalties, render: (row: any) => <span className="font-mono text-xs text-orange-400">{Number(row.penalties || 0).toLocaleString()}</span> },
    { key: 'withdrawals', header: bt.withdrawals, render: (row: any) => <span className="font-mono text-xs text-white/50">{Number(row.withdrawals || row.withdrawalsTotal || 0).toLocaleString()}</span> },
    {
      key: 'actions',
      header: bt.actions,
      className: 'text-right',
      render: (row: any) => (
        <button type="button" onClick={() => onNavigate?.('store-profile', row.storeId || row.id)} className="p-2 rounded-xl bg-white/5 hover:bg-gold-500 hover:text-black border border-white/10 transition-all" title={bt.viewProfile}>
          <ExternalLink size={16} />
        </button>
      ),
    },
  ], [bt, isSectionBlurred, onNavigate]);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-6 duration-700">
      <AdminSearchInput value={search} onChange={setSearch} placeholder={t.admin.billing.searchPlaceholder} className="w-full sm:w-96" />
      <p className="text-[10px] text-white/30 flex items-center gap-1.5 -mt-2">
        <HelpCircle size={12} className="text-gold-500/70" />
        {bt.frozenTooltip}
      </p>
      <GlassCard className="p-0 overflow-hidden bg-black/20 border-white/5 shadow-2xl">
        <AdminFinancialDataTable
          columns={columns as any}
          rows={sellerAccounts}
          rowKey={(row: any) => row.storeId || row.id}
          isLoading={isLoadingSellerAccounts}
          emptyMessage={bt.empty}
          loadingMessage={t.admin.billing.ledger.table.scanning}
        />
      </GlassCard>
    </div>
  );
};
