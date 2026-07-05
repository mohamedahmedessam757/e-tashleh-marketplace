import React, { useEffect, useState, useMemo } from 'react';
import { User, ExternalLink } from 'lucide-react';
import { GlassCard } from '../../ui/GlassCard';
import { useAdminStore } from '../../../stores/useAdminStore';
import { useLanguage } from '../../../contexts/LanguageContext';
import { AdminSearchInput } from './AdminSearchInput';
import { BlurredSection } from './BlurredSection';
import { useAdminPermissionsStore } from '../../../stores/useAdminPermissionsStore';
import { useFinancialTableRealtime } from '../../../hooks/useFinancialTableRealtime';
import { AdminFinancialDataTable } from './AdminFinancialDataTable';

interface AdminCustomerAccountsProps {
  onNavigate?: (path: string, id: string) => void;
}

export const AdminCustomerAccounts: React.FC<AdminCustomerAccountsProps> = ({ onNavigate }) => {
  const { t } = useLanguage();
  const bt = t.admin.billing.customerAccounts;
  const isSectionBlurred = useAdminPermissionsStore((s) => s.isSectionBlurred);
  const customerAccounts = useAdminStore((s) => s.customerAccounts);
  const isLoadingCustomerAccounts = useAdminStore((s) => s.isLoadingCustomerAccounts);
  const fetchCustomerAccounts = useAdminStore((s) => s.fetchCustomerAccounts);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchCustomerAccounts(search);
    const timer = setTimeout(() => fetchCustomerAccounts(search), 350);
    return () => clearTimeout(timer);
  }, [search, fetchCustomerAccounts]);

  useFinancialTableRealtime(() => fetchCustomerAccounts(search), ['users', 'wallet_transactions']);

  const columns = useMemo(() => [
    {
      key: 'customerName',
      header: bt.customerName,
      sticky: true,
      render: (row: any) => (
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shrink-0">
            <User size={16} className="text-blue-400" />
          </div>
          <BlurredSection isBlurred={isSectionBlurred('customer_name')}>
            <button
              type="button"
              className="text-sm font-black text-white hover:text-gold-400"
              onClick={() => onNavigate?.('customer-profile', row.customerId || row.id)}
            >
              {row.customerName || row.name}
            </button>
          </BlurredSection>
        </div>
      ),
    },
    { key: 'customerId', header: bt.customerId, render: (row: any) => <span className="font-mono text-[10px] text-white/40">#{String(row.customerId || row.id).slice(-8).toUpperCase()}</span> },
    { key: 'walletBalance', header: bt.walletBalance, render: (row: any) => <BlurredSection isBlurred={isSectionBlurred('billing_amounts')}><span className="font-mono text-sm font-black text-emerald-400">{Number(row.walletBalance || row.customerBalance || 0).toLocaleString()}</span></BlurredSection> },
    { key: 'pending', header: bt.pending, render: (row: any) => <span className="font-mono text-xs text-amber-400">{Number(row.pending || 0).toLocaleString()}</span> },
    { key: 'frozen', header: bt.frozen, render: (row: any) => <span className="font-mono text-xs text-rose-400">{Number(row.frozen || 0).toLocaleString()}</span> },
    { key: 'totalOrders', header: bt.totalOrders, render: (row: any) => <span className="text-xs text-white/60">{row.totalOrders ?? row.ordersCount ?? 0}</span> },
    { key: 'totalRefunds', header: bt.totalRefunds, render: (row: any) => <span className="font-mono text-xs text-white/50">{Number(row.totalRefunds || 0).toLocaleString()}</span> },
    { key: 'disputes', header: bt.disputes, render: (row: any) => <span className="text-xs text-white/50">{row.disputes ?? row.disputesCount ?? 0}</span> },
    { key: 'withdrawals', header: bt.withdrawals, render: (row: any) => <span className="font-mono text-xs text-white/50">{Number(row.withdrawals || row.withdrawalsTotal || 0).toLocaleString()}</span> },
    {
      key: 'actions',
      header: bt.actions,
      className: 'text-right',
      render: (row: any) => (
        <button type="button" onClick={() => onNavigate?.('customer-profile', row.customerId || row.id)} className="p-2 rounded-xl bg-white/5 hover:bg-gold-500 hover:text-black border border-white/10 transition-all" title={bt.viewProfile}>
          <ExternalLink size={16} />
        </button>
      ),
    },
  ], [bt, isSectionBlurred, onNavigate]);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-6 duration-700">
      <AdminSearchInput value={search} onChange={setSearch} placeholder={t.admin.billing.searchPlaceholder} className="w-full sm:w-96" />
      <GlassCard className="p-0 overflow-hidden bg-black/20 border-white/5 shadow-2xl">
        <AdminFinancialDataTable
          columns={columns as any}
          rows={customerAccounts}
          rowKey={(row: any) => row.customerId || row.id}
          isLoading={isLoadingCustomerAccounts}
          emptyMessage={bt.empty}
          loadingMessage={t.admin.billing.ledger.table.scanning}
        />
      </GlassCard>
    </div>
  );
};
