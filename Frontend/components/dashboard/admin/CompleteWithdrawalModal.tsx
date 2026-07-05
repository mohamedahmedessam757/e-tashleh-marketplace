import React, { useState } from 'react';
import { X, ShieldCheck, FileSignature } from 'lucide-react';
import { useLanguage } from '../../../contexts/LanguageContext';
import { useAdminStore } from '../../../stores/useAdminStore';

interface CompleteWithdrawalModalProps {
  isOpen: boolean;
  onClose: () => void;
  request: any;
}

export const CompleteWithdrawalModal: React.FC<CompleteWithdrawalModalProps> = ({ isOpen, onClose, request }) => {
  const { t, isAr } = useLanguage();
  const completeWithdrawal = useAdminStore((s) => s.completeWithdrawal);
  const currentAdmin = useAdminStore((s) => s.currentAdmin);

  const [reason, setReason] = useState('');
  const [signature, setSignature] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !request) return null;

  const targetName = request.role === 'CUSTOMER' ? request.user?.name || request.user?.email : request.store?.name;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (reason.trim().length < 10) {
      setError(t.admin.billing.withdrawals.modals.reasonMin);
      return;
    }
    if (!signature.trim()) {
      setError(t.admin.billing.withdrawals.modals.signatureRequired);
      return;
    }
    setIsProcessing(true);
    try {
      const res = await completeWithdrawal(request.id, reason, signature, currentAdmin?.name, currentAdmin?.email);
      if (res.success) onClose();
      else setError(res.message);
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-[#0F1014] rounded-2xl border border-emerald-500/20 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-emerald-500/10 bg-emerald-500/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
              <ShieldCheck size={20} className="text-emerald-500" />
            </div>
            <div>
              <h2 className="text-lg font-black text-emerald-500 uppercase tracking-wider">
                {t.admin.billing.withdrawals.modals.completeTitle}
              </h2>
              <p className="text-xs text-white/40">{t.admin.billing.withdrawals.modals.completeSubtitle}</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="p-2 hover:bg-white/5 rounded-xl transition-colors">
            <X size={20} className="text-white/40 hover:text-white" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
          {error && (
            <div className="mb-6 p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-500 text-sm">{error}</div>
          )}
          <div className="mb-6 p-4 bg-[#14151A] rounded-xl border border-white/5 flex flex-col gap-2">
            <div className="flex justify-between text-sm">
              <span className="text-white/40">{t.admin.billing.withdrawals.modals.beneficiary}:</span>
              <span className="font-bold text-white">{targetName}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-white/40">{t.admin.billing.withdrawals.modals.amount}:</span>
              <span className="font-mono font-bold text-gold-500">{Number(request.amount).toLocaleString()} AED</span>
            </div>
          </div>
          <form id="complete-withdrawal-form" onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-xs font-bold text-white/40 uppercase tracking-wider">
                {t.admin.billing.withdrawals.modals.completeReason} <span className="text-emerald-500">*</span>
              </label>
              <textarea
                required
                minLength={10}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full h-24 bg-[#1A1B23] border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-emerald-500/50 resize-none"
              />
            </div>
            <div className="p-5 bg-emerald-500/5 border border-emerald-500/20 rounded-xl space-y-4">
              <div className="flex items-center gap-2 text-emerald-500">
                <FileSignature size={18} />
                <span className="font-bold text-sm uppercase">{t.admin.billing.withdrawals.modals.signature}</span>
              </div>
              <input
                type="text"
                required
                value={signature}
                onChange={(e) => setSignature(e.target.value)}
                className="w-full bg-[#14151A] border border-emerald-500/20 rounded-lg px-4 py-2.5 text-emerald-400 font-mono text-sm outline-none"
              />
            </div>
          </form>
        </div>
        <div className="p-6 border-t border-white/5 bg-[#14151A] flex gap-3">
          <button type="button" onClick={onClose} disabled={isProcessing} className="flex-1 py-3 rounded-xl border border-white/10 text-white/60 text-sm font-bold">
            {t.common.cancel}
          </button>
          <button
            type="submit"
            form="complete-withdrawal-form"
            disabled={isProcessing}
            className="flex-[2] py-3 rounded-xl bg-emerald-500/10 hover:bg-emerald-500 border border-emerald-500/20 text-emerald-500 hover:text-black text-sm font-black uppercase disabled:opacity-50"
          >
            {t.admin.billing.withdrawals.modals.confirmComplete}
          </button>
        </div>
      </div>
    </div>
  );
};
