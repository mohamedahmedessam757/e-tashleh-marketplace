import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { UploadCloud, X, FileText, Calendar, AlertCircle, Eye, ExternalLink } from 'lucide-react';
import { useLanguage } from '../../../contexts/LanguageContext';

export type MerchantDocKey = 'cr' | 'license' | 'id' | 'iban' | 'authLetter';

interface MerchantDocumentUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  docKey: MerchantDocKey;
  docTitle: string;
  initialExpiry?: string | null;
  currentFileUrl?: string | null;
  requiresLegalConfirm?: boolean;
  onSubmit: (payload: { file: File; expiresAt: string }) => Promise<void>;
}

function toYmd(raw?: string | null): string {
  if (!raw) return '';
  const s = String(raw).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return '';
  return d.toISOString().slice(0, 10);
}

function formatDisplayDate(ymd: string, isAr: boolean): string {
  if (!ymd) return '';
  const [y, m, d] = ymd.split('-');
  if (!y || !m || !d) return ymd;
  return isAr ? `${d}/${m}/${y}` : `${m}/${d}/${y}`;
}

export const MerchantDocumentUploadModal: React.FC<MerchantDocumentUploadModalProps> = ({
  isOpen,
  onClose,
  docKey,
  docTitle,
  initialExpiry,
  currentFileUrl,
  requiresLegalConfirm,
  onSubmit,
}) => {
  const { language } = useLanguage();
  const isAr = language === 'ar';
  const [file, setFile] = useState<File | null>(null);
  const [year, setYear] = useState('');
  const [month, setMonth] = useState('');
  const [day, setDay] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const currentExpiryYmd = useMemo(() => toYmd(initialExpiry), [initialExpiry]);
  const expiresAt = year && month && day ? `${year}-${month}-${day}` : '';

  const yearOptions = useMemo(() => {
    const start = new Date().getFullYear();
    return Array.from({ length: 16 }, (_, i) => String(start + i));
  }, []);
  const monthOptions = useMemo(
    () => Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0')),
    [],
  );
  const dayOptions = useMemo(() => {
    const y = Number(year) || new Date().getFullYear();
    const m = Number(month) || 1;
    const daysInMonth = new Date(y, m, 0).getDate();
    return Array.from({ length: daysInMonth }, (_, i) => String(i + 1).padStart(2, '0'));
  }, [year, month]);

  useEffect(() => {
    if (!isOpen) return;
    setFile(null);
    setError('');
    setSubmitting(false);
    const seed = currentExpiryYmd;
    if (seed) {
      const [y, m, d] = seed.split('-');
      setYear(y || '');
      setMonth(m || '');
      setDay(d || '');
    } else {
      setYear('');
      setMonth('');
      setDay('');
    }
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, currentExpiryYmd, docKey]);

  useEffect(() => {
    if (day && !dayOptions.includes(day)) {
      setDay(dayOptions[dayOptions.length - 1] || '');
    }
  }, [dayOptions, day]);

  if (!isOpen) return null;

  const today = new Date().toISOString().slice(0, 10);
  const selectClass =
    'bg-black/40 border border-white/10 rounded-xl py-3 px-3 text-white outline-none focus:border-gold-500 appearance-none cursor-pointer';

  const handleConfirm = async () => {
    if (!file) {
      setError(isAr ? 'يرجى اختيار ملف المستند الجديد' : 'Please select the new document file');
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
      <div className="w-full max-w-md bg-[#1A1814] border border-white/10 rounded-3xl shadow-2xl overflow-hidden max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-white/5 sticky top-0 bg-[#1A1814] z-10">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-gold-500/10 text-gold-500 flex items-center justify-center shrink-0">
              <UploadCloud size={20} />
            </div>
            <div className="min-w-0">
              <h3 className="text-white font-bold text-sm">
                {isAr ? 'رفع / تحديث المستند' : 'Upload / Update Document'}
              </h3>
              <p className="text-[12px] text-gold-400/90 font-bold truncate">{docTitle}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-white/5 text-white/40 hover:text-white hover:bg-white/10 shrink-0"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {(currentFileUrl || currentExpiryYmd) && (
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 space-y-3">
              <p className="text-[10px] font-black uppercase tracking-widest text-white/40">
                {isAr ? 'البيانات الحالية' : 'Current record'}
              </p>
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs text-white/50 flex items-center gap-2">
                  <Calendar size={12} />
                  {isAr ? 'تاريخ الانتهاء الحالي' : 'Current expiry'}
                </span>
                <span className="text-xs font-bold text-white">
                  {currentExpiryYmd
                    ? formatDisplayDate(currentExpiryYmd, isAr)
                    : (isAr ? 'غير محدد' : 'Not set')}
                </span>
              </div>
              {currentFileUrl ? (
                <a
                  href={currentFileUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 text-xs font-bold text-gold-400 hover:text-gold-300"
                >
                  <Eye size={14} />
                  {isAr ? 'عرض الملف الحالي' : 'View current file'}
                  <ExternalLink size={12} />
                </a>
              ) : (
                <p className="text-xs text-white/35">
                  {isAr ? 'لا يوجد ملف محفوظ حالياً' : 'No file on file yet'}
                </p>
              )}
            </div>
          )}

          <label className="block">
            <span className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-2 flex items-center gap-2">
              <FileText size={12} />
              {isAr ? 'ارفع الملف الجديد' : 'Upload new file'}
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

          <div>
            <span className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-2 flex items-center gap-2">
              <Calendar size={12} />
              {isAr ? 'تاريخ انتهاء المستند / الترخيص' : 'Document / license expiry'}
            </span>
            <div className="grid grid-cols-3 gap-2">
              <select
                value={day}
                onChange={(e) => setDay(e.target.value)}
                className={selectClass}
                aria-label={isAr ? 'اليوم' : 'Day'}
              >
                <option value="">{isAr ? 'يوم' : 'Day'}</option>
                {dayOptions.map((d) => (
                  <option key={d} value={d} className="bg-[#1A1814]">
                    {d}
                  </option>
                ))}
              </select>
              <select
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                className={selectClass}
                aria-label={isAr ? 'الشهر' : 'Month'}
              >
                <option value="">{isAr ? 'شهر' : 'Month'}</option>
                {monthOptions.map((m) => (
                  <option key={m} value={m} className="bg-[#1A1814]">
                    {m}
                  </option>
                ))}
              </select>
              <select
                value={year}
                onChange={(e) => setYear(e.target.value)}
                className={selectClass}
                aria-label={isAr ? 'السنة' : 'Year'}
              >
                <option value="">{isAr ? 'سنة' : 'Year'}</option>
                {yearOptions.map((y) => (
                  <option key={y} value={y} className="bg-[#1A1814]">
                    {y}
                  </option>
                ))}
              </select>
            </div>
          </div>

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
