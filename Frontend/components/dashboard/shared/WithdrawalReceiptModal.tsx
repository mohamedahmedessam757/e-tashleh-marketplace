import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Printer, FileText, Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { client as api } from '../../../services/api/client';

interface WithdrawalReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  withdrawalId: string | null;
  language?: 'ar' | 'en';
}

const PrintStyles = () => (
  <style>{`
    @media print {
      body * { visibility: hidden !important; }
      #withdrawal-receipt-print-root,
      #withdrawal-receipt-print-root * { visibility: visible !important; }
      #withdrawal-receipt-print-root {
        position: absolute !important;
        left: 0 !important;
        top: 0 !important;
        width: 100% !important;
        background: white !important;
        color: black !important;
        padding: 16mm !important;
      }
      .no-print { display: none !important; }
      .wr-card {
        border: 1px solid #ccc !important;
        background: white !important;
        color: black !important;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
      .wr-gold { color: #b8860b !important; }
    }
  `}</style>
);

export const WithdrawalReceiptModal: React.FC<WithdrawalReceiptModalProps> = ({
  isOpen,
  onClose,
  withdrawalId,
  language = 'en',
}) => {
  const isAr = language === 'ar';
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<any>(null);

  useEffect(() => {
    if (!isOpen || !withdrawalId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
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

  if (!isOpen) return null;

  const isSuccess = ['COMPLETED', 'TRANSFERRED', 'APPROVED', 'PROCESSING'].includes(
    String(receipt?.status || '').toUpperCase(),
  );
  const isFailed = ['REJECTED', 'FAILED', 'CANCELLED'].includes(
    String(receipt?.status || '').toUpperCase(),
  );

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
        <PrintStyles />
        <div className="absolute inset-0 bg-black/70 backdrop-blur-sm no-print" onClick={onClose} />
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 12 }}
          className="relative w-full max-w-lg bg-[#1A1814] border border-gold-500/20 rounded-2xl shadow-2xl overflow-hidden"
          id="withdrawal-receipt-print-root"
        >
          <div className="flex items-center justify-between p-4 border-b border-white/10 no-print">
            <div className="flex items-center gap-2 text-gold-500">
              <FileText size={18} />
              <h3 className="font-bold text-white">
                {isAr ? 'إيصال سحب' : 'Withdrawal Receipt'}
              </h3>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => window.print()}
                className="p-2 rounded-lg text-white/50 hover:text-white hover:bg-white/5"
                title={isAr ? 'طباعة' : 'Print'}
              >
                <Printer size={16} />
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

          <div className="p-6" id="withdrawal-receipt-print">
            {loading && (
              <div className="flex justify-center py-10">
                <Loader2 className="animate-spin text-gold-500" />
              </div>
            )}
            {error && <p className="text-rose-400 text-sm">{error}</p>}
            {!loading && !error && receipt && (
              <div className="space-y-4 text-sm">
                <div className="flex justify-between items-start gap-3">
                  <div>
                    <p className="wr-gold text-[10px] uppercase tracking-widest text-gold-500/80">
                      {isAr ? 'رقم الإيصال' : 'Receipt No.'}
                    </p>
                    <p className="text-white font-mono font-bold text-lg">{receipt.receiptNumber}</p>
                    <p className="text-white/40 text-[10px] mt-1 font-mono">ID: {receipt.id}</p>
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

                <div className="grid grid-cols-2 gap-3">
                  <div className="wr-card bg-white/5 rounded-xl p-3 border border-white/5">
                    <p className="text-white/40 text-[10px] uppercase">{isAr ? 'المبلغ' : 'Amount'}</p>
                    <p className="text-white font-bold text-xl">
                      {Number(receipt.amount).toLocaleString()} {receipt.currency}
                    </p>
                  </div>
                  <div className="wr-card bg-white/5 rounded-xl p-3 border border-white/5">
                    <p className="text-white/40 text-[10px] uppercase">{isAr ? 'الطريقة' : 'Method'}</p>
                    <p className="text-white font-bold">{receipt.payoutMethod}</p>
                  </div>
                </div>

                <div className="wr-card space-y-2 text-white/70 bg-white/[0.03] rounded-xl p-4 border border-white/5">
                  <p>
                    <span className="text-white/40">{isAr ? 'الحساب: ' : 'Account: '}</span>
                    {receipt.accountName || '—'}
                  </p>
                  {receipt.accountCode && (
                    <p>
                      <span className="text-white/40">{isAr ? 'المعرّف: ' : 'Reference: '}</span>
                      {receipt.accountCode}
                    </p>
                  )}
                  <p>
                    <span className="text-white/40">{isAr ? 'تاريخ الطلب: ' : 'Requested: '}</span>
                    {receipt.createdAt ? new Date(receipt.createdAt).toLocaleString() : '—'}
                  </p>
                  <p>
                    <span className="text-white/40">{isAr ? 'تاريخ الإكمال: ' : 'Completed: '}</span>
                    {receipt.completedAt ? new Date(receipt.completedAt).toLocaleString() : '—'}
                  </p>
                  {receipt.ibanSnapshot && (
                    <p>
                      <span className="text-white/40">IBAN: </span>
                      {receipt.ibanSnapshot}
                    </p>
                  )}
                  {receipt.stripeTransferId && (
                    <p>
                      <span className="text-white/40">Transfer: </span>
                      {receipt.stripeTransferId}
                    </p>
                  )}
                  {receipt.processedBy?.name && (
                    <p>
                      <span className="text-white/40">{isAr ? 'المعالج: ' : 'Processed by: '}</span>
                      {receipt.processedBy.name}
                    </p>
                  )}
                  {(receipt.rejectionReason || receipt.adminNotes) && (
                    <p className="text-rose-300/90 italic pt-2 border-t border-white/5">
                      {receipt.rejectionReason || receipt.adminNotes}
                    </p>
                  )}
                </div>

                <p className="text-[9px] text-white/30 text-center pt-2">
                  {isAr
                    ? 'هذا الإيصال صادر من منصة إي تشليح لأغراض الإثبات والضرائب.'
                    : 'Issued by E-Tshaleh for proof of payout and tax records.'}
                </p>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
