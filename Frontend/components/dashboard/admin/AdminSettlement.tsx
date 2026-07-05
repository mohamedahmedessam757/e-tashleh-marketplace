import React, { useEffect, useState, useCallback } from 'react';
import { Scale, RefreshCw, Info, AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';
import { GlassCard } from '../../ui/GlassCard';
import { useAdminStore } from '../../../stores/useAdminStore';
import { useLanguage } from '../../../contexts/LanguageContext';
import { BlurredSection } from './BlurredSection';
import { useAdminPermissionsStore } from '../../../stores/useAdminPermissionsStore';
import { FinancialAuditModal } from './FinancialAuditModal';
import { useFinancialTableRealtime } from '../../../hooks/useFinancialTableRealtime';

export const AdminSettlement: React.FC = () => {
  const { t } = useLanguage();
  const bt = t.admin.billing.settlement;
  const isSectionBlurred = useAdminPermissionsStore((s) => s.isSectionBlurred);
  const settlementSummary = useAdminStore((s) => s.settlementSummary);
  const settlementHistory = useAdminStore((s) => s.settlementHistory);
  const isLoadingSettlement = useAdminStore((s) => s.isLoadingSettlement);
  const fetchSettlementSummary = useAdminStore((s) => s.fetchSettlementSummary);
  const fetchSettlementHistory = useAdminStore((s) => s.fetchSettlementHistory);
  const runFinancialSettlement = useAdminStore((s) => s.runFinancialSettlement);
  const [isRunning, setIsRunning] = useState(false);
  const [showAuditModal, setShowAuditModal] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const refetch = useCallback(() => {
    fetchSettlementSummary();
    fetchSettlementHistory();
  }, [fetchSettlementSummary, fetchSettlementHistory]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  useFinancialTableRealtime(refetch, ['financial_settlements']);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 5000);
    return () => clearTimeout(timer);
  }, [toast]);

  const summary = settlementSummary || {};
  const delta = Math.abs(Number(summary.reconciliationDelta ?? summary.delta ?? 0));
  const panels = [
    { label: bt.stripeBalance, value: summary.stripeBalance ?? summary.stripeAvailable ?? 0, color: '#3b82f6' },
    { label: bt.escrowHeld, value: summary.escrowHeld ?? summary.totalEscrowHeld ?? 0, color: '#8b5cf6' },
    { label: bt.transferable, value: summary.transferable ?? summary.totalTransferable ?? 0, color: '#10b981' },
    { label: bt.transferred, value: summary.transferred ?? summary.totalTransferred ?? 0, color: '#d4af37' },
    { label: bt.delta, value: summary.reconciliationDelta ?? summary.delta ?? 0, color: '#ef4444' },
  ];

  const handleConfirmRun = async (payload: { reason: string; adminName: string; adminSignature: string }) => {
    setIsRunning(true);
    const result = await runFinancialSettlement({
      reason: payload.reason,
      adminName: payload.adminName,
      adminSignature: payload.adminSignature,
    });
    setIsRunning(false);
    setShowAuditModal(false);
    if (result.success) {
      setToast({ type: 'success', message: result.message || bt.runSuccess });
      refetch();
    } else {
      setToast({ type: 'error', message: result.message || bt.runFailed });
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-6 duration-700">
      {toast && (
        <div className={`flex items-center gap-3 p-4 rounded-2xl border text-xs font-bold ${
          toast.type === 'success'
            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-200'
            : 'bg-rose-500/10 border-rose-500/20 text-rose-200'
        }`}>
          {toast.type === 'success' ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
          {toast.message}
        </div>
      )}

      {delta > 100 && (
        <div className="flex items-center gap-3 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-200 text-xs">
          <AlertTriangle size={16} />
          {bt.deltaWarning || `Reconciliation delta is ${delta.toLocaleString()} AED — review before running.`}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {panels.map((panel) => (
          <GlassCard key={panel.label} className="p-6 bg-[#151310] border-white/5">
            <p className="text-[10px] font-black text-white/30 uppercase mb-2">{panel.label}</p>
            <BlurredSection isBlurred={isSectionBlurred('billing_amounts')}>
              <h3 className="text-2xl font-black text-white font-mono" style={{ color: panel.color }}>
                {Number(panel.value || 0).toLocaleString()} <span className="text-xs opacity-60">AED</span>
              </h3>
            </BlurredSection>
          </GlassCard>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <GlassCard className="p-8 bg-[#151310] border-white/5 lg:col-span-2">
          <div className="flex items-start gap-4 mb-6">
            <div className="p-3 bg-gold-500/10 rounded-2xl border border-gold-500/20">
              <Info size={22} className="text-gold-500" />
            </div>
            <div>
              <h3 className="text-lg font-black text-white uppercase tracking-tight">{bt.explainTitle}</h3>
              <p className="text-sm text-white/50 mt-2 leading-relaxed">{bt.explainBody}</p>
            </div>
          </div>
          <ul className="space-y-3 text-xs text-white/40">
            {bt.explainSteps.map((step: string, i: number) => (
              <li key={i} className="flex items-start gap-2">
                <span className="text-gold-500 font-black">{i + 1}.</span>
                <span>{step}</span>
              </li>
            ))}
          </ul>

          {settlementHistory.length > 0 && (
            <div className="mt-8 pt-6 border-t border-white/5">
              <h4 className="text-[10px] font-black text-white/30 uppercase mb-4">{bt.recentRuns || 'Recent runs'}</h4>
              <div className="space-y-2">
                {settlementHistory.slice(0, 5).map((row: any) => (
                  <div key={row.id} className="flex justify-between text-xs text-white/50 font-mono">
                    <span>{new Date(row.createdAt).toLocaleString()}</span>
                    <span>Δ {Number(row.reconciliationDelta || 0).toLocaleString()} AED</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </GlassCard>

        <GlassCard className="p-8 bg-gradient-to-br from-gold-500/10 to-transparent border-gold-500/20 flex flex-col justify-between">
          <div>
            <Scale size={32} className="text-gold-500 mb-4" />
            <h3 className="text-xl font-black text-white mb-2">{bt.runTitle}</h3>
            <p className="text-xs text-white/40 leading-relaxed">{bt.runSubtitle}</p>
          </div>
          <button
            type="button"
            disabled={isRunning || isLoadingSettlement}
            onClick={() => setShowAuditModal(true)}
            className="mt-8 w-full py-4 bg-gold-500 hover:bg-gold-400 disabled:opacity-50 text-black font-black text-xs uppercase tracking-widest rounded-2xl flex items-center justify-center gap-2 transition-all"
          >
            {isRunning ? <RefreshCw size={16} className="animate-spin" /> : <AlertTriangle size={16} />}
            {isRunning ? bt.running : bt.runButton}
          </button>
        </GlassCard>
      </div>

      <FinancialAuditModal
        isOpen={showAuditModal}
        onClose={() => setShowAuditModal(false)}
        onConfirm={handleConfirmRun}
        title={bt.runTitle}
        subtitle={bt.runSubtitle}
      />
    </div>
  );
};
