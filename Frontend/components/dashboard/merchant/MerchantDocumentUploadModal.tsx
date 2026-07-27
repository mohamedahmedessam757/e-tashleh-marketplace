import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { UploadCloud, X, FileText, Calendar, AlertCircle } from 'lucide-react';
import { useLanguage } from '../../../contexts/LanguageContext';

export type MerchantDocKey = 'cr' | 'license' | 'id' | 'iban' | 'authLetter';

interface MerchantDocumentUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  docKey: MerchantDocKey;
  docTitle: string;
  initialExpiry?: string | null;
  requiresLegalConfirm?: boolean;
  onSubmit: (payload: { file: File; expiresAt: string }) => Promise<void>;
}

export const MerchantDocumentUploadModal: React.FC<MerchantDocumentUploadModalProps> = ({
  isOpen,
  onClose,
  docKey,
  docTitle,
  initialExpiry,
  requiresLegalConfirm,
  onSubmit,
}) => {
  const { language } = useLanguage();
  const isAr = language === 'ar';
  const [file, setFile] = useState<File | null>(null);
  const [expiresAt, setExpiresAt] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setFile(null);
    setError('');
    setSubmitting(false);
    const seed = initialExpiry ? String(initialExpiry).slice(0, 10) : '';
    setExpiresAt(seed);
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, initialExpiry, docKey]);

  if (!isOpen) return null;

  const today = new Date().toISOString().slice(0, 10);

  const handleConfirm = async () => {
    if (!file) {
      setError(isAr ? 'يرجى اختيار ملف المستند' : 'Please select a document file');
      return;
    }
    if (!expiresAt) {
      setError(isAr ? 'تاريخ الانتهاء مطلوب' : 'Expiry date is required');
      return;
    }
    if (expiresAt < today) {
      setError(isAr ? 'تاريخ الانتهاء يجب أن يكون اليوم أو لاحقاً' : 'Expiry must be today or later');
      return;
    }
    if (requiresLegalConfirm) {
      const ok = window.confirm(
        isAr
          ? 'تحديث هذا المستند القانوني سيؤدي إلى إيقاف الحساب مؤقتاً للمراجعة. هل أنت متأكد؟'
          : 'Updating this legal document will temporarily suspend the account for review. Are you sure?',
      );
      if (!ok) return;
    }

    setSubmitting(true);
    setError('');
    try {
      await onSubmit({ file, expiresAt });
      onClose();
    } catch (e: any) {
      setError(e?.message || (isAr ? 'فشل رفع المستند' : 'Upload failed'));
    } finally {
      setSubmitting(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/85" dir={isAr ? 'rtl' : 'ltr'}>
      <div className="w-full max-w-md bg-[#1A1814] border border-white/10 rounded-3xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between p-5 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gold-500/10 text-gold-500 flex items-center justify-center">
              <UploadCloud size={20} />
            </div>
            <div>
              <h3 className="text-white font-bold text-sm">
                {isAr ? 'رفع / تحديث المستند' : 'Upload / Update Document'}
              </h3>
              <p className="text-[11px] text-white/40">{docTitle}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-white/5 text-white/40 hover:text-white hover:bg-white/10"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <label className="block">
            <span className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-2 flex items-center gap-2">
              <FileText size={12} />
              {isAr ? 'ملف المستند' : 'Document file'}
            </span>
            <input
              type="file"
              accept=".pdf,.jpg,.png,.jpeg"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="w-full text-sm text-white/70 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:bg-gold-500/20 file:text-gold-400 file:font-bold file:cursor-pointer"
            />
            {file && (
              <p className="mt-2 text-[11px] text-green-400 truncate">{file.name}</p>
            )}
          </label>

          <label className="block">
            <span className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-2 flex items-center gap-2">
              <Calendar size={12} />
              {isAr ? 'تاريخ انتهاء المستند / الترخيص' : 'Document / license expiry'}
            </span>
            <input
              type="date"
              min={today}
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
              className="w-full bg-black/40 border border-white/10 rounded-xl py-3 px-4 text-white outline-none focus:border-gold-500"
            />
          </label>

          {error && (
            <div className="flex items-start gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-xs">
              <AlertCircle size={14} className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="flex-1 py-3 rounded-xl bg-white/5 text-white/70 font-bold text-sm hover:bg-white/10 disabled:opacity-50"
            >
              {isAr ? 'إلغاء' : 'Cancel'}
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={submitting}
              className="flex-1 py-3 rounded-xl bg-gold-500 text-black font-black text-sm hover:bg-gold-400 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <UploadCloud size={16} />
              {submitting
                ? (isAr ? 'جاري الرفع...' : 'Uploading...')
                : (isAr ? 'إرسال للمراجعة' : 'Submit for review')}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
};
