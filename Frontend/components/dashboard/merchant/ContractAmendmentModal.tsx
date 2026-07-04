import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { FileText, Loader2, RotateCcw } from 'lucide-react';
import { useLanguage } from '../../../contexts/LanguageContext';
import type { SecondPartyData } from '../../../utils/contractBaker';

interface ContractAmendmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialData: SecondPartyData;
  onSubmit: (data: SecondPartyData) => Promise<void>;
}

const EMPTY: SecondPartyData = {
  companyName: '',
  managerName: '',
  crNumber: '',
  licenseNumber: '',
  licenseExpiry: '',
  emirate: '',
  country: '',
};

export const ContractAmendmentModal: React.FC<ContractAmendmentModalProps> = ({
  isOpen,
  onClose,
  initialData,
  onSubmit,
}) => {
  const { t, language } = useLanguage();
  const c = t.dashboard.merchant.storeProfile.contract?.amendment;
  const [form, setForm] = useState<SecondPartyData>(EMPTY);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setForm({
        companyName: initialData.companyName || '',
        managerName: initialData.managerName || '',
        crNumber: initialData.crNumber || '',
        licenseNumber: initialData.licenseNumber || '',
        licenseExpiry: initialData.licenseExpiry || '',
        emirate: initialData.emirate || '',
        country: initialData.country || '',
      });
      setError(null);
    }
  }, [isOpen, initialData]);

  if (!isOpen) return null;

  const update = (field: keyof SecondPartyData, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const required: (keyof SecondPartyData)[] = [
      'companyName',
      'managerName',
      'crNumber',
      'licenseNumber',
      'licenseExpiry',
      'emirate',
      'country',
    ];
    if (required.some((key) => !form[key]?.trim())) {
      setError(c?.validation || (language === 'ar' ? 'الرجاء تعبئة جميع الحقول المطلوبة' : 'Please fill all required fields'));
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      await onSubmit(form);
      onClose();
    } catch (err: any) {
      const status = err?.response?.status;
      const data = err?.response?.data;
      let msg =
        data?.messageAr && language === 'ar'
          ? data.messageAr
          : data?.message ||
            (language === 'ar' ? 'فشل إرسال طلب التعديل' : 'Failed to submit amendment request');

      if (status === 429 || status === 400) {
        const rateMsg = c?.rateLimit;
        if (rateMsg && (typeof data?.message === 'string' && data.message.includes('24 hours'))) {
          msg = rateMsg;
        } else if (status === 429) {
          msg = rateMsg || msg;
        }
      }

      setError(Array.isArray(msg) ? msg[0] : msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const fields: { key: keyof SecondPartyData; label: string; type?: string }[] = [
    { key: 'companyName', label: c?.fields?.companyName || (language === 'ar' ? 'إسم الشركة / المؤسسة' : 'Company Name') },
    { key: 'managerName', label: c?.fields?.managerName || (language === 'ar' ? 'إسم المدير المفوض' : 'Manager Name') },
    { key: 'crNumber', label: c?.fields?.crNumber || (language === 'ar' ? 'رقم السجل التجاري' : 'CR Number') },
    { key: 'licenseNumber', label: c?.fields?.licenseNumber || (language === 'ar' ? 'رقم الرخصة التجارية' : 'License Number') },
    { key: 'licenseExpiry', label: c?.fields?.licenseExpiry || (language === 'ar' ? 'تاريخ إنتهاء الرخصة' : 'License Expiry Date'), type: 'date' },
    { key: 'emirate', label: c?.fields?.emirate || (language === 'ar' ? 'الإمارة / المنطقة' : 'Emirate / Region') },
    { key: 'country', label: c?.fields?.country || (language === 'ar' ? 'الدولة' : 'Country') },
  ];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-xl p-4 overflow-y-auto">
      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        className="bg-[#1A1814] border border-gold-500/20 rounded-[2.5rem] w-full max-w-2xl shadow-[0_0_50px_rgba(212,175,55,0.1)] overflow-hidden relative"
      >
        <div className="p-8 border-b border-white/5 flex justify-between items-center bg-gradient-to-r from-gold-500/5 to-transparent">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gold-500 rounded-2xl flex items-center justify-center shadow-lg shadow-gold-500/20">
              <FileText className="text-black" size={24} />
            </div>
            <div>
              <h3 className="text-xl font-black text-white uppercase tracking-tight">
                {c?.title || (language === 'ar' ? 'طلب تعديل بيانات العقد' : 'Contract Amendment Request')}
              </h3>
              <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest mt-0.5">
                {c?.subtitle || (language === 'ar' ? 'يتطلب موافقة الإدارة' : 'Requires admin approval')}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="p-3 bg-white/5 hover:bg-red-500/20 text-white/30 hover:text-red-500 rounded-2xl transition-all disabled:opacity-50"
          >
            <RotateCcw size={20} />
          </button>
        </div>

        <div className="mx-8 mt-6 p-4 rounded-2xl border border-amber-500/20 bg-amber-500/5 text-[11px] text-amber-200/90 leading-relaxed">
          {c?.notice ||
            (language === 'ar'
              ? 'سيتم مراجعة التعديلات من قبل الإدارة. يمكنك تقديم طلب واحد كل 24 ساعة.'
              : 'Changes will be reviewed by admin. You may submit one request every 24 hours.')}
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {fields.map(({ key, label, type }) => (
              <div key={key} className="space-y-1">
                <label className="text-[10px] font-black text-white/30 uppercase tracking-widest ml-1">
                  {label}
                </label>
                <input
                  type={type || 'text'}
                  value={form[key] || ''}
                  onChange={(e) => update(key, e.target.value)}
                  className="w-full bg-black/40 border border-white/10 rounded-2xl py-3 px-4 text-white font-medium outline-none focus:border-gold-500/50 transition-all"
                />
              </div>
            ))}
          </div>

          {error && (
            <p className="text-red-400 text-sm font-medium px-1">{error}</p>
          )}

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1 py-4 rounded-2xl border border-white/10 text-white/60 font-bold uppercase text-xs tracking-widest hover:bg-white/5 transition-all disabled:opacity-50"
            >
              {c?.cancel || (language === 'ar' ? 'إلغاء' : 'Cancel')}
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 py-4 rounded-2xl bg-gold-500 text-black font-black uppercase text-xs tracking-widest hover:bg-gold-400 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isSubmitting && <Loader2 size={16} className="animate-spin" />}
              {c?.submit || (language === 'ar' ? 'إرسال للمراجعة' : 'Submit for Review')}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};
