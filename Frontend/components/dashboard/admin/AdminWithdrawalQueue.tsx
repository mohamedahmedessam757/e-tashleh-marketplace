import React, { useState } from 'react';
import {
  AlertOctagon,
  CheckCircle2,
  CreditCard,
  Download,
  ExternalLink,
  FileText,
  Landmark,
  RefreshCw,
  RotateCcw,
} from 'lucide-react';
import { GlassCard } from '../../ui/GlassCard';
import { AdminSearchInput } from './AdminSearchInput';
import { BlurredSection } from './BlurredSection';
import { RejectWithdrawalModal } from './RejectWithdrawalModal';
import { CompleteWithdrawalModal } from './CompleteWithdrawalModal';
import { ReleaseFundsModal } from './ReleaseFundsModal';
import { WithdrawalReceiptModal } from '../shared/WithdrawalReceiptModal';
import { useLanguage } from '../../../contexts/LanguageContext';
import { useAdminStore } from '../../../stores/useAdminStore';
import { useAdminPermissionsStore } from '../../../stores/useAdminPermissionsStore';
import { paymentsApi } from '../../../services/api/payments';

const STATUS_FILTERS = ['PENDING', 'PROCESSING', 'COMPLETED', 'REJECTED', 'CANCELLED', 'ALL'] as const;

type StatusFilter = (typeof STATUS_FILTERS)[number];

interface AdminWithdrawalQueueProps {
  role: 'CUSTOMER' | 'VENDOR';
  onNavigate?: (page: string, id?: string) => void;
}

function statusBadgeClass(status: string): string {
  if (status === 'COMPLETED' || status === 'TRANSFERRED') return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
  if (status === 'PROCESSING' || status === 'APPROVED') return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
  if (status === 'PENDING' || status === 'UNDER_REVIEW') return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
  if (status === 'CANCELLED') return 'bg-white/5 text-white/50 border-white/10';
  return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
}

export const AdminWithdrawalQueue: React.FC<AdminWithdrawalQueueProps> = ({ role, onNavigate }) => {
  const { t, isAr } = useLanguage();
  const pendingWithdrawals = useAdminStore((s) => s.pendingWithdrawals);
  const isLoadingWithdrawals = useAdminStore((s) => s.isLoadingWithdrawals);
  const financialFilters = useAdminStore((s) => s.financialFilters);
  const setFinancialFilters = useAdminStore((s) => s.setFinancialFilters);
  const approveWithdrawal = useAdminStore((s) => s.approveWithdrawal);
  const verifyBankDetails = useAdminStore((s) => s.verifyBankDetails);
  const currentAdmin = useAdminStore((s) => s.currentAdmin);
  const canPerform = useAdminPermissionsStore((s) => s.canPerform);
  const isSectionBlurred = useAdminPermissionsStore((s) => s.isSectionBlurred);

  const canApprove = canPerform('billing', 'APPROVE_WITHDRAWAL') || currentAdmin?.role === 'SUPER_ADMIN';
  const canExport =
    canPerform('billing', 'EXPORT_FINANCIALS') ||
    canPerform('billing', 'EXPORT_REPORTS') ||
    currentAdmin?.role === 'SUPER_ADMIN';
  const [receiptId, setReceiptId] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const canReject = canPerform('billing', 'REJECT_WITHDRAWAL') || currentAdmin?.role === 'SUPER_ADMIN';

  const [selectedReq, setSelectedReq] = useState<any>(null);
  const [showBankModal, setShowBankModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [showReleaseModal, setShowReleaseModal] = useState(false);
  const [approvingId, setApprovingId] = useState<string | null>(null);

  const statusFilter = (financialFilters.withdrawalStatus || 'PENDING') as StatusFilter;

  const statusLabel = (status: string) => {
    const key = status as keyof typeof t.admin.billing.withdrawals.statusLabels;
    return t.admin.billing.withdrawals.statusLabels[key] || status;
  };

  const filterLabelKey = (status: StatusFilter) => {
    const map: Record<StatusFilter, keyof typeof t.admin.billing.withdrawals.filters> = {
      PENDING: 'pending',
      PROCESSING: 'processing',
      COMPLETED: 'completed',
      REJECTED: 'rejected',
      CANCELLED: 'cancelled',
      ALL: 'all',
    };
    return map[status];
  };

  const handleApprove = async (req: any) => {
    if (!canApprove) return;
    setApprovingId(req.id);
    const res = await approveWithdrawal(req.id, undefined, currentAdmin?.name, currentAdmin?.email);
    setApprovingId(null);
    if (!res.success) alert(res.message);
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-6 duration-700">
      <AdminSearchInput
        value={financialFilters.search || ''}
        onChange={(value) => setFinancialFilters({ search: value })}
        placeholder={t.admin.billing.searchPlaceholder}
        className="w-full sm:w-80"
      />

      <div className="flex flex-wrap gap-2 items-center justify-between">
        <div className="flex flex-wrap gap-2">
          {STATUS_FILTERS.map((status) => {
            const active = statusFilter === status;
            return (
              <button
                key={status}
                type="button"
                onClick={() => setFinancialFilters({ withdrawalStatus: status })}
                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase border transition-all ${
                  active ? 'bg-gold-500 text-black border-gold-500' : 'bg-white/5 text-white/50 border-white/10 hover:border-white/20'
                }`}
              >
                {t.admin.billing.withdrawals.filters[filterLabelKey(status)]}
              </button>
            );
          })}
        </div>
        {canExport && (
          <button
            type="button"
            disabled={exporting}
            onClick={async () => {
              setExporting(true);
              try {
                await paymentsApi.downloadWithdrawalsExport({
                  admin: true,
                  format: 'xlsx',
                  status: statusFilter,
                  role,
                });
              } catch (err: any) {
                alert(err?.response?.data?.message || (isAr ? 'فشل التصدير' : 'Export failed'));
              } finally {
                setExporting(false);
              }
            }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase border border-gold-500/30 bg-gold-500/10 text-gold-400 hover:bg-gold-500/20 disabled:opacity-50"
          >
            <Download size={14} />
            {exporting ? (isAr ? 'جاري التصدير...' : 'Exporting...') : (isAr ? 'تصدير Excel' : 'Export Excel')}
          </button>
        )}
      </div>

      <GlassCard className="p-0 overflow-hidden bg-black/20 border-white/5 shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left whitespace-nowrap min-w-[900px]">
            <thead className="bg-white/[0.03] text-[10px] text-white/30 uppercase font-black">
              <tr>
                <th className="px-6 py-6">{t.admin.billing.withdrawals.table.target}</th>
                <th className="px-6 py-6">{t.admin.billing.withdrawals.table.amount}</th>
                <th className="px-6 py-6">{t.admin.billing.withdrawals.table.method}</th>
                <th className="px-6 py-6">{t.admin.billing.withdrawals.table.timestamp}</th>
                <th className="px-6 py-6">{t.admin.billing.withdrawals.table.status}</th>
                <th className="px-6 py-6">{t.admin.billing.withdrawals.table.requestId}</th>
                <th className="px-6 py-6 text-right">{t.admin.billing.withdrawals.table.actions}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {isLoadingWithdrawals ? (
                <tr>
                  <td colSpan={7} className="px-8 py-20 text-center text-white/20 font-black text-xs uppercase animate-pulse">
                    {t.admin.billing.ledger.table.scanning}
                  </td>
                </tr>
              ) : pendingWithdrawals.filter((r) => r.role === role).length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-8 py-20 text-center text-white/10 font-bold text-xs uppercase">
                    {statusFilter === 'PENDING'
                      ? t.admin.billing.withdrawals.actions.emptyPending
                      : t.admin.billing.withdrawals.actions.emptyAll}
                  </td>
                </tr>
              ) : (
                pendingWithdrawals
                  .filter((r) => r.role === role)
                  .map((req: any) => (
                    <tr key={req.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="px-6 py-5">
                        <BlurredSection isBlurred={isSectionBlurred('customer_name')}>
                          <div className="font-black text-white text-sm">{req.store?.name || req.user?.name}</div>
                        </BlurredSection>
                      </td>
                      <td className="px-6 py-5 font-mono font-black text-gold-500">
                        {Number(req.amount).toLocaleString()} <span className="text-[10px] text-white/20">AED</span>
                      </td>
                      <td className="px-6 py-5">
                        <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-[9px] font-black uppercase border bg-gold-500/10 text-gold-500 border-gold-500/20">
                          {req.payoutMethod === 'STRIPE' ? <RefreshCw size={12} /> : <CreditCard size={12} />}
                          {req.payoutMethod}
                        </span>
                      </td>
                      <td className="px-6 py-5 font-mono text-xs text-white/40">
                        {new Date(req.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-5">
                        <span className={`text-[9px] px-3 py-1.5 rounded-lg font-black uppercase border ${statusBadgeClass(req.status)}`}>
                          {statusLabel(req.status)}
                        </span>
                      </td>
                      <td className="px-6 py-5 font-mono text-[9px] text-white/30">#{req.id.slice(-8).toUpperCase()}</td>
                      <td className="px-6 py-5">
                        <div className="flex gap-2 justify-end flex-wrap">
                          <button
                            type="button"
                            onClick={() => setReceiptId(req.id)}
                            className="w-10 h-10 bg-gold-500/10 hover:bg-gold-500 text-gold-500 hover:text-black rounded-xl border border-gold-500/20 flex items-center justify-center"
                            title={isAr ? 'إيصال' : 'Receipt'}
                          >
                            <FileText size={18} />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedReq(req);
                              setShowBankModal(true);
                            }}
                            className="w-10 h-10 bg-blue-500/10 hover:bg-blue-500 text-blue-500 hover:text-white rounded-xl border border-blue-500/20 flex items-center justify-center"
                            title={t.admin.billing.withdrawals.table.viewBank}
                          >
                            <Landmark size={18} />
                          </button>

                          {req.status === 'PENDING' && canApprove && (
                            <button
                              type="button"
                              disabled={approvingId === req.id}
                              onClick={() => handleApprove(req)}
                              className="w-10 h-10 bg-emerald-500/10 hover:bg-emerald-500 text-emerald-500 hover:text-black rounded-xl border border-emerald-500/20 flex items-center justify-center disabled:opacity-50"
                              title={t.admin.billing.withdrawals.actions.approve}
                            >
                              <CheckCircle2 size={18} />
                            </button>
                          )}

                          {req.status === 'PENDING' && canReject && (
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedReq(req);
                                setShowRejectModal(true);
                              }}
                              className="w-10 h-10 bg-rose-500/10 hover:bg-rose-500 text-rose-500 hover:text-white rounded-xl border border-rose-500/20 flex items-center justify-center"
                              title={t.admin.billing.withdrawals.actions.invalidate}
                            >
                              <AlertOctagon size={18} />
                            </button>
                          )}

                          {req.status === 'PROCESSING' && canApprove && (
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedReq(req);
                                setShowCompleteModal(true);
                              }}
                              className="w-10 h-10 bg-emerald-500/10 hover:bg-emerald-500 text-emerald-500 hover:text-black rounded-xl border border-emerald-500/20 flex items-center justify-center"
                              title={t.admin.billing.withdrawals.actions.complete}
                            >
                              <CheckCircle2 size={18} />
                            </button>
                          )}

                          {req.status === 'PROCESSING' && canReject && (
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedReq(req);
                                setShowReleaseModal(true);
                              }}
                              className="w-10 h-10 bg-amber-500/10 hover:bg-amber-500 text-amber-500 hover:text-black rounded-xl border border-amber-500/20 flex items-center justify-center"
                              title={t.admin.billing.withdrawals.actions.release}
                            >
                              <RotateCcw size={18} />
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() =>
                              onNavigate?.(req.role === 'VENDOR' ? 'store-profile' : 'customer-profile', req.userId || req.storeId)
                            }
                            className="w-10 h-10 bg-white/5 hover:bg-white/10 text-white/40 hover:text-white rounded-xl border border-white/10 flex items-center justify-center"
                          >
                            <ExternalLink size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
              )}
            </tbody>
          </table>
        </div>
      </GlassCard>

      <WithdrawalReceiptModal
        isOpen={!!receiptId}
        withdrawalId={receiptId}
        onClose={() => setReceiptId(null)}
        language={isAr ? 'ar' : 'en'}
      />

      <RejectWithdrawalModal
        isOpen={showRejectModal}
        onClose={() => {
          setShowRejectModal(false);
          setSelectedReq(null);
        }}
        request={selectedReq}
      />
      <CompleteWithdrawalModal
        isOpen={showCompleteModal}
        onClose={() => {
          setShowCompleteModal(false);
          setSelectedReq(null);
        }}
        request={selectedReq}
      />
      <ReleaseFundsModal
        isOpen={showReleaseModal}
        onClose={() => {
          setShowReleaseModal(false);
          setSelectedReq(null);
        }}
        request={selectedReq}
      />

      {showBankModal && selectedReq && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowBankModal(false)} />
          <div className="relative w-full max-w-md bg-[#0F1014] rounded-2xl border border-blue-500/20 p-6 space-y-4">
            <h3 className="text-lg font-black text-blue-500">{t.admin.billing.bankModal.title}</h3>
            {(() => {
              const entity = selectedReq.role === 'CUSTOMER' ? selectedReq.user : selectedReq.store;
              if (!entity?.bankIban && !entity?.bankName) {
                return <p className="text-rose-400 text-sm">{t.admin.billing.bankModal.noDetails}</p>;
              }
              return (
                <div className="space-y-3 text-sm">
                  <p><span className="text-white/40">{t.admin.billing.bankModal.accountHolder}: </span>{entity.bankAccountHolder || '—'}</p>
                  <p><span className="text-white/40">IBAN: </span>{entity.bankIban || '—'}</p>
                  {!entity.bankDetailsVerified && canApprove && (
                    <button
                      type="button"
                      onClick={async () => {
                        await verifyBankDetails(entity.id, selectedReq.role);
                      }}
                      className="w-full py-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-bold"
                    >
                      {t.admin.billing.bankModal.verifyAction}
                    </button>
                  )}
                </div>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
};
