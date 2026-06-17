import React from 'react';
import { motion } from 'framer-motion';
import { CreditCard, RotateCcw, Settings, ShieldCheck } from 'lucide-react';

export interface BankDetailsForm {
  bankName: string;
  accountHolder: string;
  iban: string;
  swift: string;
}

interface BankDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  form: BankDetailsForm;
  onChange: (data: BankDetailsForm) => void;
  onSave: () => void;
  isLoading: boolean;
  isAr: boolean;
  isUpdate?: boolean;
  maskedExistingIban?: string | null;
}

export const BankDetailsModal: React.FC<BankDetailsModalProps> = ({
  isOpen,
  onClose,
  form,
  onChange,
  onSave,
  isLoading,
  isAr,
  isUpdate = false,
  maskedExistingIban,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-xl p-4 overflow-y-auto">
      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 20 }}
        className="bg-[#1A1814] border border-gold-500/20 rounded-[2.5rem] w-full max-w-lg shadow-[0_0_50px_rgba(212,175,55,0.1)] overflow-hidden relative"
      >
        <div className="p-8 border-b border-white/5 flex justify-between items-center bg-gradient-to-r from-gold-500/5 to-transparent">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gold-500 rounded-2xl flex items-center justify-center shadow-lg shadow-gold-500/20">
              <Settings className="text-black" size={24} />
            </div>
            <div>
              <h3 className="text-xl font-black text-white uppercase tracking-tight">
                {isUpdate
                  ? isAr
                    ? 'تحديث الحساب البنكي'
                    : 'Update Bank Account'
                  : isAr
                    ? 'إضافة حساب بنكي'
                    : 'Add Bank Account'}
              </h3>
              <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest mt-0.5">
                {isAr ? 'حساب سحب واحد لكل مستخدم' : 'One payout account per user'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-3 bg-white/5 hover:bg-red-500/20 text-white/30 hover:text-red-500 rounded-2xl transition-all"
          >
            <RotateCcw size={20} />
          </button>
        </div>

        {isUpdate && (
          <div className="mx-8 mt-6 p-4 rounded-2xl border border-amber-500/20 bg-amber-500/5 text-[11px] text-amber-200/90 leading-relaxed">
            {isAr
              ? `لديك حساب مرتبط بالفعل${maskedExistingIban ? ` (${maskedExistingIban})` : ''}. الحفظ سيستبدل البيانات الحالية — لا يمكن إضافة حساب ثانٍ.`
              : `You already have a linked account${maskedExistingIban ? ` (${maskedExistingIban})` : ''}. Saving will replace the current details — you cannot add a second account.`}
          </div>
        )}

        <div className="p-8 space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-white/30 uppercase tracking-widest ml-1">
              {isAr ? 'اسم البنك' : 'Bank Name'}
            </label>
            <input
              type="text"
              value={form.bankName}
              onChange={(e) => onChange({ ...form, bankName: e.target.value })}
              className="w-full bg-black/40 border border-white/10 rounded-2xl py-4 px-4 text-white font-bold outline-none focus:border-gold-500/50 transition-all"
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-white/30 uppercase tracking-widest ml-1">
              {isAr ? 'اسم صاحب الحساب' : 'Account Holder'}
            </label>
            <input
              type="text"
              value={form.accountHolder}
              onChange={(e) => onChange({ ...form, accountHolder: e.target.value })}
              className="w-full bg-black/40 border border-white/10 rounded-2xl py-4 px-4 text-white font-bold outline-none focus:border-gold-500/50 transition-all"
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-white/30 uppercase tracking-widest ml-1">
              IBAN
            </label>
            <input
              type="text"
              value={form.iban}
              onChange={(e) => onChange({ ...form, iban: e.target.value })}
              className="w-full bg-black/40 border border-white/10 rounded-2xl py-4 px-4 text-white font-mono font-bold outline-none focus:border-gold-500/50 transition-all uppercase"
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-white/30 uppercase tracking-widest ml-1">
              SWIFT / BIC ({isAr ? 'اختياري' : 'Optional'})
            </label>
            <input
              type="text"
              value={form.swift}
              onChange={(e) => onChange({ ...form, swift: e.target.value })}
              className="w-full bg-black/40 border border-white/10 rounded-2xl py-4 px-4 text-white font-mono font-bold outline-none focus:border-gold-500/50 transition-all uppercase"
            />
          </div>
        </div>

        <div className="p-8 border-t border-white/5 bg-black/20 flex gap-4">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-4 px-6 rounded-2xl border border-white/10 text-white/60 font-black uppercase tracking-widest hover:bg-white/5 transition-all text-xs"
          >
            {isAr ? 'إلغاء' : 'Cancel'}
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={isLoading || !form.bankName || !form.iban || !form.accountHolder}
            className="flex-1 py-4 px-6 rounded-2xl bg-gold-500 hover:bg-gold-400 disabled:opacity-50 text-black font-black uppercase tracking-[2px] transition-all shadow-xl shadow-gold-500/10 flex items-center justify-center gap-2 text-xs"
          >
            {isLoading ? <RotateCcw size={18} className="animate-spin" /> : <ShieldCheck size={18} />}
            {isUpdate ? (isAr ? 'حفظ التحديث' : 'Save Update') : isAr ? 'ربط الحساب' : 'Link Account'}
          </button>
        </div>
      </motion.div>
    </div>
  );
};
