import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Printer,
  FileText,
  Loader2,
  CheckCircle2,
  XCircle,
  Hash,
  Calendar,
  CreditCard,
  User,
  Landmark,
} from 'lucide-react';
import { client as api } from '../../../services/api/client';
import { printIsolatedHtml } from '../../../utils/print';

interface WithdrawalReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  withdrawalId: string | null;
  language?: 'ar' | 'en';
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

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 12 }}
          className="relative w-full max-w-xl bg-[#1A1814] border border-gold-500/20 rounded-2xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col"
        >
          <div className="flex items-center justify-between p-4 border-b border-white/10 shrink-0">
            <div className="flex items-center gap-2 text-gold-500">
              <FileText size={18} />
              <h3 className="font-bold text-white">
                {isAr ? 'إيصال سحب' : 'Withdrawal Receipt'}
              </h3>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={!receipt || isPrinting || loading}
                onClick={() => void handlePrint()}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-gold-400 bg-gold-500/10 border border-gold-500/20 hover:bg-gold-500 hover:text-black disabled:opacity-40 text-xs font-bold"
                title={isAr ? 'طباعة' : 'Print'}
              >
                {isPrinting ? <Loader2 size={14} className="animate-spin" /> : <Printer size={14} />}
                {isAr ? 'طباعة' : 'Print'}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="p-2 rounded-lg text-white/50 hover:text-white hover:bg-white/5"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          <div className="p-4 sm:p-6 overflow-y-auto">
            {loading && (
              <div className="flex justify-center py-10">
                <Loader2 className="animate-spin text-gold-500" />
              </div>
            )}
            {error && <p className="text-rose-400 text-sm">{error}</p>}

            {!loading && !error && receipt && (
              <div ref={printRef} dir={dir} className="space-y-3">
                {/* Print-only brand header (invoice style) */}
                <div className="hidden print:flex inv-print-logo-header justify-between items-center">
                  <div className="flex items-center gap-3">
                    <img
                      src="/logo.png"
                      alt="E-Tashleh"
                      className="w-14 h-14 object-contain inv-brand-logo"
                    />
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

                {/* Screen header */}
                <div className="flex justify-between items-start gap-3 print:hidden">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <img
                        src="/logo.png"
                        alt="E-Tashleh"
                        className="w-9 h-9 object-contain inv-brand-logo"
                      />
                      <h1 className="text-xl font-bold text-white inv-value">E-Tashleh.net</h1>
                    </div>
                    <p className="text-[10px] uppercase tracking-widest text-gold-500/80 wr-gold">
                      {isAr ? 'رقم الإيصال' : 'Receipt No.'}
                    </p>
                    <p className="text-white font-mono font-bold text-lg inv-value">
                      {receipt.receiptNumber}
                    </p>
                  </div>
                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[10px] font-black uppercase ${
                      isFailed
                        ? 'border-rose-500/30 text-rose-400 bg-rose-500/10'
                        : isSuccess
                          ? 'border-emerald-500/30 text-emerald-400 bg-emerald-500/10'
                          : 'border-white/10 text-gold-400 bg-gold-500/10'
                    }`}
                  >
                    {isFailed ? <XCircle size={12} /> : <CheckCircle2 size={12} />}
                    {receipt.status}
                  </span>
                </div>

                {/* Amount + method */}
                <div className="inv-total-box wr-card">
                  <p className="inv-label text-[10px] uppercase m-0 mb-1">
                    {isAr ? 'المبلغ المحوّل' : 'Payout Amount'}
                  </p>
                  <p className="inv-total-amount m-0">
                    {Number(receipt.amount).toLocaleString()} {receipt.currency || 'AED'}
                  </p>
                  <p className="inv-label text-xs m-0 mt-1">{receipt.payoutMethod}</p>
                </div>

                <div className="inv-section wr-card space-y-2">
                  <div className="inv-section-header">
                    <Hash className="inv-icon" size={13} />
                    <h3>{isAr ? 'بيانات الإيصال' : 'Receipt Details'}</h3>
                  </div>
                  <div className="flex items-start gap-2 text-sm">
                    <Hash className="w-4 h-4 text-gold-500 inv-icon mt-0.5 shrink-0" />
                    <span className="text-gray-400 inv-label shrink-0">
                      {isAr ? 'المعرّف:' : 'ID:'}
                    </span>
                    <span className="text-white font-semibold break-all inv-value font-mono text-xs">
                      {receipt.id}
                    </span>
                  </div>
                  <div className="flex items-start gap-2 text-sm">
                    <CreditCard className="w-4 h-4 text-gold-500 inv-icon mt-0.5 shrink-0" />
                    <span className="text-gray-400 inv-label shrink-0">
                      {isAr ? 'الحالة:' : 'Status:'}
                    </span>
                    <span className="text-white font-semibold inv-value">{receipt.status}</span>
                  </div>
                  <div className="flex items-start gap-2 text-sm">
                    <User className="w-4 h-4 text-gold-500 inv-icon mt-0.5 shrink-0" />
                    <span className="text-gray-400 inv-label shrink-0">
                      {isAr ? 'الحساب:' : 'Account:'}
                    </span>
                    <span className="text-white font-semibold break-all inv-value">
                      {receipt.accountName || '—'}
                    </span>
                  </div>
                  {receipt.accountCode ? (
                    <div className="flex items-start gap-2 text-sm">
                      <Hash className="w-4 h-4 text-gold-500 inv-icon mt-0.5 shrink-0" />
                      <span className="text-gray-400 inv-label shrink-0">
                        {isAr ? 'المرجع:' : 'Reference:'}
                      </span>
                      <span className="text-white font-semibold break-all inv-value">
                        {receipt.accountCode}
                      </span>
                    </div>
                  ) : null}
                </div>

                <div className="inv-section wr-card space-y-2">
                  <div className="inv-section-header">
                    <Calendar className="inv-icon" size={13} />
                    <h3>{isAr ? 'التواريخ' : 'Timeline'}</h3>
                  </div>
                  <div className="flex items-start gap-2 text-sm">
                    <Calendar className="w-4 h-4 text-gold-500 inv-icon mt-0.5 shrink-0" />
                    <span className="text-gray-400 inv-label shrink-0">
                      {isAr ? 'تاريخ الطلب:' : 'Requested:'}
                    </span>
                    <span className="text-white font-semibold inv-value">
                      {fmtDate(receipt.createdAt)}
                    </span>
                  </div>
                  <div className="flex items-start gap-2 text-sm">
                    <Calendar className="w-4 h-4 text-gold-500 inv-icon mt-0.5 shrink-0" />
                    <span className="text-gray-400 inv-label shrink-0">
                      {isAr ? 'تاريخ الإكمال:' : 'Completed:'}
                    </span>
                    <span className="text-white font-semibold inv-value">
                      {fmtDate(receipt.completedAt)}
                    </span>
                  </div>
                </div>

                {(receipt.ibanSnapshot || receipt.stripeTransferId || receipt.processedBy?.name) && (
                  <div className="inv-section wr-card space-y-2">
                    <div className="inv-section-header">
                      <Landmark className="inv-icon" size={13} />
                      <h3>{isAr ? 'تفاصيل التحويل' : 'Transfer Details'}</h3>
                    </div>
                    {receipt.ibanSnapshot ? (
                      <div className="flex items-start gap-2 text-sm">
                        <Landmark className="w-4 h-4 text-gold-500 inv-icon mt-0.5 shrink-0" />
                        <span className="text-gray-400 inv-label shrink-0">IBAN:</span>
                        <span className="text-white font-semibold break-all inv-value font-mono text-xs">
                          {receipt.ibanSnapshot}
                        </span>
                      </div>
                    ) : null}
                    {receipt.stripeTransferId ? (
                      <div className="flex items-start gap-2 text-sm">
                        <CreditCard className="w-4 h-4 text-gold-500 inv-icon mt-0.5 shrink-0" />
                        <span className="text-gray-400 inv-label shrink-0">Transfer:</span>
                        <span className="text-white font-semibold break-all inv-value font-mono text-xs">
                          {receipt.stripeTransferId}
                        </span>
                      </div>
                    ) : null}
                    {receipt.processedBy?.name ? (
                      <div className="flex items-start gap-2 text-sm">
                        <User className="w-4 h-4 text-gold-500 inv-icon mt-0.5 shrink-0" />
                        <span className="text-gray-400 inv-label shrink-0">
                          {isAr ? 'المعالج:' : 'Processed by:'}
                        </span>
                        <span className="text-white font-semibold inv-value">
                          {receipt.processedBy.name}
                        </span>
                      </div>
                    ) : null}
                  </div>
                )}

                {(receipt.rejectionReason || receipt.adminNotes) && (
                  <div className="inv-section wr-card">
                    <div className="inv-section-header">
                      <FileText className="inv-icon" size={13} />
                      <h3>{isAr ? 'ملاحظات' : 'Notes'}</h3>
                    </div>
                    <p className="text-sm text-white/80 inv-value m-0">
                      {receipt.rejectionReason || receipt.adminNotes}
                    </p>
                  </div>
                )}

                <div className="inv-footer">
                  {isAr
                    ? 'هذا الإيصال صادر من منصة إي تشليح لأغراض الإثبات والسجلات المالية.'
                    : 'Issued by E-Tashleh for proof of payout and financial records.'}
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
