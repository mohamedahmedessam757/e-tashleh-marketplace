import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Printer,
  FileText,
  Loader2,
  CheckCircle2,
  XCircle,
  Clock3,
  Building2,
  Mail,
  Wallet,
} from 'lucide-react';
import { client as api } from '../../../services/api/client';
import { printIsolatedHtml } from '../../../utils/print';

interface WithdrawalReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  withdrawalId: string | null;
  language?: 'ar' | 'en';
}

function MetaCell({
  label,
  value,
  mono,
}: {
  label: string;
  value: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <div className="rounded-xl border border-white/8 bg-black/25 px-3.5 py-3 min-w-0 inv-section">
      <p className="text-[10px] uppercase tracking-[0.14em] text-gold-500/80 font-bold mb-1.5 inv-label">
        {label}
      </p>
      <p
        className={`text-sm text-white font-semibold break-words leading-snug inv-value ${
          mono ? 'font-mono text-[12px] tracking-wide' : ''
        }`}
      >
        {value}
      </p>
    </div>
  );
}

export const WithdrawalReceiptModal: React.FC<WithdrawalReceiptModalProps> = ({
  isOpen,
  onClose,
  withdrawalId,
  language = 'en',
}) => {
  const isAr = language === 'ar';
  const dir = isAr ? 'rtl' : 'ltr';
  const printRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<any>(null);

  useEffect(() => {
    if (!isOpen || !withdrawalId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      setReceipt(null);
      try {
        const { data } = await api.get(`/payments/withdrawals/${withdrawalId}/receipt`);
        if (!cancelled) setReceipt(data);
      } catch (err: any) {
        if (!cancelled) {
          setError(
            err?.response?.data?.message ||
              (isAr ? 'تعذر تحميل إيصال السحب' : 'Failed to load withdrawal receipt'),
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isOpen, withdrawalId, isAr]);

  const handlePrint = async () => {
    const el = printRef.current;
    if (!el || isPrinting || !receipt) return;
    setIsPrinting(true);
    try {
      await printIsolatedHtml(el.outerHTML, String(receipt.receiptNumber || 'withdrawal-receipt'), {
        dir,
      });
    } finally {
      setIsPrinting(false);
    }
  };

  if (!isOpen) return null;

  const status = String(receipt?.status || '').toUpperCase();
  const isSuccess = ['COMPLETED', 'TRANSFERRED', 'APPROVED', 'PROCESSING'].includes(status);
  const isFailed = ['REJECTED', 'FAILED', 'CANCELLED'].includes(status);
  const notes = receipt?.rejectionReason || receipt?.adminNotes || null;
  const methodLabel =
    String(receipt?.payoutMethod || '')
      .replace(/_/g, ' ')
      .trim() || '—';

  const fmtDate = (value?: string | null) => {
    if (!value) return '—';
    return new Date(value).toLocaleString(isAr ? 'ar-EG' : 'en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  const statusBadgeClass = isFailed
    ? 'border-rose-400/40 text-rose-300 bg-rose-500/15'
    : isSuccess
      ? 'border-emerald-400/40 text-emerald-300 bg-emerald-500/15'
      : 'border-gold-400/40 text-gold-300 bg-gold-500/15';

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-5">
        <div className="absolute inset-0 bg-black/75 backdrop-blur-md" onClick={onClose} />
        <motion.div
          initial={{ opacity: 0, y: 18, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 12, scale: 0.98 }}
          transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          className="relative w-full max-w-lg overflow-hidden max-h-[94vh] flex flex-col rounded-[1.35rem] border border-gold-500/25 bg-[#12110F] shadow-[0_30px_80px_rgba(0,0,0,0.55)]"
        >
          {/* Top chrome */}
          <div className="relative shrink-0 px-4 sm:px-5 py-3.5 border-b border-white/8 bg-gradient-to-l from-gold-500/10 via-transparent to-transparent">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-gold-500/15 border border-gold-500/25 flex items-center justify-center text-gold-400 shrink-0">
                  <FileText size={16} />
                </div>
                <div className="min-w-0">
                  <h3 className="font-black text-white text-sm tracking-wide truncate">
                    {isAr ? 'إيصال سحب' : 'Withdrawal Receipt'}
                  </h3>
                  <p className="text-[10px] text-white/35 font-medium">
                    {isAr ? 'وثيقة رسمية للتحويل' : 'Official payout document'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  disabled={!receipt || isPrinting || loading}
                  onClick={() => void handlePrint()}
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-xl text-gold-300 bg-gold-500/10 border border-gold-500/25 hover:bg-gold-500 hover:text-black disabled:opacity-40 text-[11px] font-black transition-colors"
                >
                  {isPrinting ? <Loader2 size={13} className="animate-spin" /> : <Printer size={13} />}
                  {isAr ? 'طباعة' : 'Print'}
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="p-2 rounded-xl text-white/45 hover:text-white hover:bg-white/5 transition-colors"
                >
                  <X size={16} />
                </button>
              </div>
            </div>
          </div>

          <div className="overflow-y-auto custom-scrollbar">
            {loading && (
              <div className="flex justify-center py-16">
                <Loader2 className="animate-spin text-gold-500" size={28} />
              </div>
            )}
            {error && (
              <div className="m-5 p-4 rounded-xl border border-rose-500/25 bg-rose-500/10 text-rose-300 text-sm">
                {error}
              </div>
            )}

            {!loading && !error && receipt && (
              <div ref={printRef} dir={dir} className="p-4 sm:p-5 space-y-4">
                {/* Print brand header */}
                <div className="hidden print:flex inv-print-logo-header justify-between items-center">
                  <div className="flex items-center gap-3">
                    <img src="/logo.png" alt="E-Tashleh" className="w-14 h-14 object-contain inv-brand-logo" />
                    <div>
                      <h1 className="text-2xl font-black text-[#b8860b] uppercase tracking-wider m-0">
                        E-Tashleh
                      </h1>
                      <p className="text-xs text-gray-500 inv-label m-0">
                        {isAr ? 'منصة قطع غيار السيارات' : 'Automotive Marketplace'}
                      </p>
                    </div>
                  </div>
                  <div className={isAr ? 'text-left' : 'text-right'}>
                    <p className="text-sm font-black text-gray-800 uppercase tracking-widest inv-value m-0">
                      {isAr ? 'إيصال سحب' : 'WITHDRAWAL RECEIPT'}
                    </p>
                    <p className="text-xs text-gray-500 font-mono inv-label m-0">
                      {receipt.receiptNumber}
                    </p>
                  </div>
                </div>

                {/* Brand + status row */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-12 h-12 rounded-2xl bg-white border border-gold-500/40 flex items-center justify-center p-1.5 shrink-0 shadow-[0_0_24px_rgba(184,134,11,0.12)]">
                      <img
                        src="/logo.png"
                        alt="E-Tashleh"
                        className="w-full h-full object-contain inv-brand-logo"
                      />
                    </div>
                    <div className="min-w-0">
                      <h1 className="text-lg sm:text-xl font-black text-white tracking-tight inv-value truncate">
                        E-Tashleh.net
                      </h1>
                      <p className="text-[11px] text-white/40 inv-label">
                        {isAr ? 'سوق قطع غيار السيارات' : 'Automotive spare parts marketplace'}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border text-[10px] font-black uppercase tracking-wide shrink-0 ${statusBadgeClass}`}
                  >
                    {isFailed ? <XCircle size={12} /> : <CheckCircle2 size={12} />}
                    {receipt.status}
                  </span>
                </div>

                {/* Hero amount card */}
                <div className="relative overflow-hidden rounded-2xl border border-gold-500/35 bg-gradient-to-br from-gold-500/18 via-[#1A1712] to-black p-5 sm:p-6 inv-total-box">
                  <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_top_right,rgba(184,134,11,0.18),transparent_55%)]" />
                  <div className="relative flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.18em] text-gold-400/90 font-black mb-2 inv-label">
                        {isAr ? 'المبلغ المحوّل' : 'Payout Amount'}
                      </p>
                      <p className="text-3xl sm:text-4xl font-black text-gold-400 inv-total-amount leading-none">
                        {Number(receipt.amount).toLocaleString()}{' '}
                        <span className="text-lg align-middle text-gold-500/80">
                          {receipt.currency || 'AED'}
                        </span>
                      </p>
                    </div>
                    <div className="flex flex-col items-start sm:items-end gap-2">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/35 border border-gold-500/25 text-[10px] font-black uppercase tracking-wider text-gold-300">
                        <Wallet size={12} />
                        {methodLabel}
                      </span>
                      <p className="font-mono text-xs text-white/55 inv-value">
                        {receipt.receiptNumber}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Party + timeline grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <MetaCell
                    label={isAr ? 'المستفيد' : 'Beneficiary'}
                    value={
                      <span className="inline-flex items-center gap-2">
                        <Building2 size={14} className="text-gold-500 inv-icon shrink-0" />
                        {receipt.accountName || '—'}
                      </span>
                    }
                  />
                  <MetaCell
                    label={isAr ? 'المرجع' : 'Reference'}
                    value={
                      receipt.accountCode ? (
                        <span className="inline-flex items-center gap-2">
                          <Mail size={14} className="text-gold-500 inv-icon shrink-0" />
                          <span className="break-all">{receipt.accountCode}</span>
                        </span>
                      ) : (
                        '—'
                      )
                    }
                  />
                  <MetaCell
                    label={isAr ? 'تاريخ الطلب' : 'Requested'}
                    value={
                      <span className="inline-flex items-center gap-2">
                        <Clock3 size={14} className="text-gold-500 inv-icon shrink-0" />
                        {fmtDate(receipt.createdAt)}
                      </span>
                    }
                  />
                  <MetaCell
                    label={isAr ? 'تاريخ الإكمال' : 'Completed'}
                    value={
                      <span className="inline-flex items-center gap-2">
                        <CheckCircle2 size={14} className="text-gold-500 inv-icon shrink-0" />
                        {fmtDate(receipt.completedAt)}
                      </span>
                    }
                  />
                </div>

                {/* Transfer strip */}
                {(receipt.ibanSnapshot || receipt.stripeTransferId || receipt.processedBy?.name) && (
                  <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4 space-y-3 inv-section">
                    <div className="flex items-center gap-2 inv-section-header border-0 p-0 m-0">
                      <div className="w-7 h-7 rounded-lg bg-gold-500/10 border border-gold-500/20 flex items-center justify-center">
                        <Building2 size={13} className="text-gold-400 inv-icon" />
                      </div>
                      <h3 className="text-[11px] font-black uppercase tracking-[0.14em] text-gold-400 m-0">
                        {isAr ? 'تفاصيل التحويل' : 'Transfer Details'}
                      </h3>
                    </div>

                    <div className="grid grid-cols-1 gap-2.5">
                      {receipt.ibanSnapshot ? (
                        <div className="rounded-xl bg-black/30 border border-white/8 px-3.5 py-3">
                          <p className="text-[10px] uppercase tracking-wider text-white/35 mb-1 inv-label">
                            IBAN
                          </p>
                          <p className="font-mono text-[12px] sm:text-sm text-emerald-300/95 font-bold tracking-wide break-all inv-value">
                            {receipt.ibanSnapshot}
                          </p>
                        </div>
                      ) : null}
                      {receipt.stripeTransferId ? (
                        <div className="rounded-xl bg-black/30 border border-white/8 px-3.5 py-3">
                          <p className="text-[10px] uppercase tracking-wider text-white/35 mb-1 inv-label">
                            Transfer ID
                          </p>
                          <p className="font-mono text-[12px] text-white font-semibold break-all inv-value">
                            {receipt.stripeTransferId}
                          </p>
                        </div>
                      ) : null}
                      {receipt.processedBy?.name ? (
                        <div className="rounded-xl bg-black/30 border border-white/8 px-3.5 py-3 flex items-center justify-between gap-3">
                          <div>
                            <p className="text-[10px] uppercase tracking-wider text-white/35 mb-1 inv-label">
                              {isAr ? 'المعالج' : 'Processed by'}
                            </p>
                            <p className="text-sm text-white font-semibold inv-value">
                              {receipt.processedBy.name}
                            </p>
                          </div>
                          <span className="text-[10px] px-2 py-1 rounded-lg bg-white/5 border border-white/10 text-white/45 font-bold uppercase">
                            Staff
                          </span>
                        </div>
                      ) : null}
                    </div>
                  </div>
                )}

                {/* Notes */}
                {notes ? (
                  <div className="rounded-2xl border border-amber-500/20 bg-amber-500/[0.06] px-4 py-3.5 inv-section">
                    <p className="text-[10px] uppercase tracking-[0.14em] text-amber-400/90 font-black mb-1.5 inv-label">
                      {isAr ? 'ملاحظات' : 'Notes'}
                    </p>
                    <p className="text-sm text-white/85 leading-relaxed inv-value m-0">{notes}</p>
                  </div>
                ) : null}

                {/* Compact ref footer */}
                <div className="pt-1 border-t border-white/8 space-y-2 inv-footer">
                  <p className="text-[10px] text-white/30 font-mono break-all inv-label m-0">
                    ID: {receipt.id}
                  </p>
                  <p className="text-[10px] text-white/40 text-center leading-relaxed m-0">
                    {isAr
                      ? 'هذا الإيصال صادر من منصة إي تشليح لأغراض الإثبات والسجلات المالية.'
                      : 'Issued by E-Tashleh for proof of payout and financial records.'}
                  </p>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
