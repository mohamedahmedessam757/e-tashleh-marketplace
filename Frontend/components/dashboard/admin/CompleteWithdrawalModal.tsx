import React, { useEffect, useState } from 'react';
import { X, ShieldCheck, FileSignature, Loader2, Landmark } from 'lucide-react';
import { useLanguage } from '../../../contexts/LanguageContext';
import { useAdminStore } from '../../../stores/useAdminStore';
import { getAccessToken } from '../../../utils/auth';

interface CompleteWithdrawalModalProps {
  isOpen: boolean;
  onClose: () => void;
  request: any;
}

interface WithdrawalPreview {
  payoutMethod: 'STRIPE' | 'BANK_TRANSFER';
  amount: number;
  transferAmount: number;
  settlementAmount: number;
  currency: string;
  beneficiaryName: string;
  availableBefore: number;
  availableAfter: number;
  frozenBefore: number;
  frozenAfter: number;
  canComplete: boolean;
  blockedReason: string | null;
  bank: {
    bankName: string | null;
    accountHolder: string | null;
    iban: string | null;
    swift: string | null;
  } | null;
  stripeAccountHint: string | null;
}

const apiUrl = import.meta.env.VITE_API_URL || 'https://api.e-tashleh.net';

const money = (value: number, currency: string) =>
  `${Number(value || 0).toFixed(2)} ${currency || 'AED'}`;

export const CompleteWithdrawalModal: React.FC<CompleteWithdrawalModalProps> = ({ isOpen, onClose, request }) => {
  const { t, isAr } = useLanguage();
  const completeWithdrawal = useAdminStore((s) => s.completeWithdrawal);
  const currentAdmin = useAdminStore((s) => s.currentAdmin);
  const copy = t.admin.billing.withdrawals.modals;

  const [reason, setReason] = useState('');
  const [signature, setSignature] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<WithdrawalPreview | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  useEffect(() => {
    if (!isOpen || !request?.id) return;
    let cancelled = false;
    setPreview(null);
    setError(null);
    setPreviewLoading(true);
    (async () => {
      try {
        const token = getAccessToken();
        const res = await fetch(`${apiUrl}/payments/admin/withdrawals/${request.id}/preview`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json().catch(() => ({}));
        if (cancelled) return;
        if (!res.ok) {
          const raw = data?.message;
          setError(Array.isArray(raw) ? raw.join(', ') : raw || copy.previewFailed);
          return;
        }
        setPreview(data);
      } catch (err: any) {
        if (!cancelled) setError(err?.name === 'AbortError' ? copy.abortedRequest : copy.previewFailed);
      } finally {
        if (!cancelled) setPreviewLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isOpen, request?.id]);

  if (!isOpen || !request) return null;

  const targetName = preview?.beneficiaryName || (request.role === 'CUSTOMER' ? request.user?.name || request.user?.email : request.store?.name);
  const currency = preview?.currency || 'AED';
  const isStripe = (preview?.payoutMethod || request.payoutMethod) === 'STRIPE';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isProcessing || previewLoading || preview?.canComplete === false) return;
    setError(null);
    if (reason.trim().length < 10) {
      setError(copy.reasonMin);
      return;
    }
    if (!signature.trim()) {
      setError(copy.signatureRequired);
      return;
    }
    setIsProcessing(true);
    try {
      const res = await completeWithdrawal(request.id, reason, signature, currentAdmin?.name, currentAdmin?.email);
      if (res.success) onClose();
      else setError(res.message === 'ABORT_ERROR' ? copy.abortedRequest : res.message);
    } catch (err: any) {
      setError(err?.name === 'AbortError' ? copy.abortedRequest : err.message || 'An error occurred');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={isProcessing ? undefined : onClose} />
      <div className="relative w-full max-w-lg bg-[#0F1014] rounded-2xl border border-emerald-500/20 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-emerald-500/10 bg-emerald-500/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
              <ShieldCheck size={20} className="text-emerald-500" />
            </div>
            <div>
              <h2 className="text-lg font-black text-emerald-500 uppercase tracking-wider">
                {copy.completeTitle}
              </h2>
              <p className="text-xs text-white/40">{copy.completeSubtitle}</p>
            </div>
          </div>
          <button type="button" onClick={onClose} disabled={isProcessing} className="p-2 hover:bg-white/5 rounded-xl transition-colors disabled:opacity-40">
            <X size={20} className="text-white/40 hover:text-white" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
          {error && (
            <div className="mb-6 p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-500 text-sm">{error}</div>
          )}
          <div className="mb-6 p-4 bg-[#14151A] rounded-xl border border-white/5 flex flex-col gap-2">
            <div className="flex justify-between text-sm gap-3">
              <span className="text-white/40">{copy.beneficiary}:</span>
              <span className="font-bold text-white text-end">{targetName}</span>
            </div>
            <div className="flex justify-between text-sm gap-3">
              <span className="text-white/40">{isAr ? 'طريقة السحب' : 'Payout method'}:</span>
              <span className="font-bold text-emerald-400">{isStripe ? copy.methodStripe : copy.methodBank}</span>
            </div>
            <div className="flex justify-between text-sm gap-3">
              <span className="text-white/40">{copy.amount}:</span>
              <span className="font-mono font-bold text-gold-500">{money(Number(preview?.amount ?? request.amount), currency)}</span>
            </div>
            {preview && (
              <>
                <div className="flex justify-between text-sm gap-3">
                  <span className="text-white/40">{copy.transferNet}:</span>
                  <span className="font-mono text-white">{money(preview.transferAmount, currency)}</span>
                </div>
                <div className="flex justify-between text-sm gap-3">
                  <span className="text-white/40">{copy.liabilities}:</span>
                  <span className="font-mono text-white">{money(preview.settlementAmount, currency)}</span>
                </div>
                <div className="grid grid-cols-2 gap-2 pt-2 text-xs">
                  <BalanceCell label={copy.availableBefore} value={money(preview.availableBefore, currency)} />
                  <BalanceCell label={copy.availableAfter} value={money(preview.availableAfter, currency)} />
                  <BalanceCell label={copy.frozenBefore} value={money(preview.frozenBefore, currency)} />
                  <BalanceCell label={copy.frozenAfter} value={money(preview.frozenAfter, currency)} />
                </div>
              </>
            )}
            {previewLoading && <p className="text-xs text-white/40">{copy.previewLoading}</p>}
            {preview && !preview.canComplete && (
              <p className="text-xs text-rose-400">{copy.cannotComplete}{preview.blockedReason ? `: ${preview.blockedReason}` : ''}</p>
            )}
          </div>

          {preview?.payoutMethod === 'BANK_TRANSFER' && preview.bank && (
            <div className="mb-6 p-4 bg-[#14151A] rounded-xl border border-white/10 space-y-2">
              <div className="flex items-center gap-2 text-gold-500 text-sm font-bold">
                <Landmark size={16} />
                <span>{copy.methodBank}</span>
              </div>
              <Detail label={copy.bankName} value={preview.bank.bankName} />
              <Detail label={copy.accountHolder} value={preview.bank.accountHolder} />
              <Detail label={copy.iban} value={preview.bank.iban} mono />
              <Detail label={copy.swift} value={preview.bank.swift} mono />
            </div>
          )}

          {isStripe && preview?.stripeAccountHint && (
            <div className="mb-6 flex justify-between text-sm gap-3 px-1">
              <span className="text-white/40">{copy.stripeAccount}:</span>
              <span className="font-mono text-white">{preview.stripeAccountHint}</span>
            </div>
          )}

          <form id="complete-withdrawal-form" onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-xs font-bold text-white/40 uppercase tracking-wider">
                {copy.completeReason} <span className="text-emerald-500">*</span>
              </label>
              <textarea
                required
                minLength={10}
                disabled={isProcessing}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full h-24 bg-[#1A1B23] border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-emerald-500/50 resize-none disabled:opacity-50"
              />
            </div>
            <div className="p-5 bg-emerald-500/5 border border-emerald-500/20 rounded-xl space-y-4">
              <div className="flex items-center gap-2 text-emerald-500">
                <FileSignature size={18} />
                <span className="font-bold text-sm uppercase">{copy.signature}</span>
              </div>
              <input
                type="text"
                required
                disabled={isProcessing}
                value={signature}
                onChange={(e) => setSignature(e.target.value)}
                className="w-full bg-[#14151A] border border-emerald-500/20 rounded-lg px-4 py-2.5 text-emerald-400 font-mono text-sm outline-none disabled:opacity-50"
              />
            </div>
          </form>
        </div>
        <div className="p-6 border-t border-white/5 bg-[#14151A] flex gap-3">
          <button type="button" onClick={onClose} disabled={isProcessing} className="flex-1 py-3 rounded-xl border border-white/10 text-white/60 text-sm font-bold disabled:opacity-50">
            {t.common.cancel}
          </button>
          <button
            type="submit"
            form="complete-withdrawal-form"
            disabled={isProcessing || previewLoading || preview?.canComplete === false}
            className="flex-[2] py-3 rounded-xl bg-emerald-500/10 hover:bg-emerald-500 border border-emerald-500/20 text-emerald-500 hover:text-black text-sm font-black uppercase disabled:opacity-50 inline-flex items-center justify-center gap-2"
          >
            {isProcessing ? <Loader2 size={18} className="animate-spin" /> : <ShieldCheck size={18} />}
            {isProcessing
              ? (isAr ? 'جاري التنفيذ...' : 'Processing...')
              : copy.confirmComplete}
          </button>
        </div>
      </div>
    </div>
  );
};

function BalanceCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-black/30 border border-white/5 px-3 py-2">
      <p className="text-white/35">{label}</p>
      <p className="font-mono text-white mt-1">{value}</p>
    </div>
  );
}

function Detail({ label, value, mono }: { label: string; value: string | null; mono?: boolean }) {
  return (
    <div className="flex justify-between gap-3 text-sm">
      <span className="text-white/40 shrink-0">{label}</span>
      <span className={`text-white text-end break-all ${mono ? 'font-mono' : ''}`}>{value || '—'}</span>
    </div>
  );
}
