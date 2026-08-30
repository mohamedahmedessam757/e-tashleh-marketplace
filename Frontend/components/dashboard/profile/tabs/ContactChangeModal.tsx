import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Loader2, Lock, X } from 'lucide-react';
import { authApi } from '../../../../services/api/auth';

type ContactField = 'email' | 'phone';

interface ContactChangeModalProps {
  field: ContactField;
  language: 'ar' | 'en';
  onClose: () => void;
  onSuccess: (field: ContactField, value: string) => void;
}

export const ContactChangeModal: React.FC<ContactChangeModalProps> = ({
  field,
  language,
  onClose,
  onSuccess,
}) => {
  const [step, setStep] = useState<'input' | 'otp'>('input');
  const [newValue, setNewValue] = useState('');
  const [otp, setOtp] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const title =
    field === 'email'
      ? language === 'ar'
        ? 'تغيير البريد الإلكتروني'
        : 'Change email'
      : language === 'ar'
        ? 'تغيير رقم الجوال'
        : 'Change phone number';

  const handleInit = async () => {
    if (!newValue.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await authApi.initContactChange(field, newValue.trim());
      setStep('otp');
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        (language === 'ar' ? 'فشل إرسال رمز التحقق' : 'Failed to send verification code');
      setError(Array.isArray(msg) ? msg.join(', ') : String(msg));
    } finally {
      setBusy(false);
    }
  };

  const handleVerify = async () => {
    if (!otp.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const res = await authApi.verifyContactChange(field, newValue.trim(), otp.trim());
      onSuccess(field, res?.value || newValue.trim());
      onClose();
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        (language === 'ar' ? 'رمز التحقق غير صحيح' : 'Invalid verification code');
      setError(Array.isArray(msg) ? msg.join(', ') : String(msg));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-[#1A1814] w-full max-w-md rounded-2xl border border-gold-500/20 overflow-hidden shadow-2xl"
      >
        <div className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="w-12 h-12 bg-gold-500/10 rounded-full flex items-center justify-center text-gold-500">
              <Lock size={22} />
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-lg text-white/40 hover:text-white hover:bg-white/5"
            >
              <X size={18} />
            </button>
          </div>

          <h3 className="text-xl font-bold text-white mb-2">{title}</h3>
          <p className="text-white/60 text-sm mb-6 leading-relaxed">
            {step === 'input'
              ? language === 'ar'
                ? 'أدخل القيمة الجديدة. سنرسل رمز تحقق إلى الوسيلة الجديدة قبل تطبيق التغيير.'
                : 'Enter the new value. We will send a verification code to the new contact before applying the change.'
              : language === 'ar'
                ? 'أدخل رمز التحقق المرسل إلى الوسيلة الجديدة.'
                : 'Enter the verification code sent to your new contact.'}
          </p>

          {step === 'input' ? (
            <input
              type={field === 'email' ? 'email' : 'tel'}
              value={newValue}
              onChange={(e) => setNewValue(e.target.value)}
              placeholder={
                field === 'email'
                  ? language === 'ar'
                    ? 'البريد الجديد'
                    : 'New email'
                  : language === 'ar'
                    ? 'رقم الجوال الجديد'
                    : 'New phone number'
              }
              className="w-full bg-[#151310] border border-white/10 rounded-xl px-4 py-3 text-white focus:border-gold-500 outline-none mb-4"
              disabled={busy}
            />
          ) : (
            <input
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder={language === 'ar' ? 'رمز التحقق' : 'OTP code'}
              maxLength={6}
              className="w-full bg-[#151310] border border-white/10 rounded-xl px-4 py-3 text-white focus:border-gold-500 outline-none mb-4 tracking-widest text-center text-lg"
              disabled={busy}
            />
          )}

          {error && (
            <p className="text-sm text-red-400 mb-4 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 px-4 rounded-xl border border-white/10 text-white hover:bg-white/5 transition-colors font-bold"
              disabled={busy}
            >
              {language === 'ar' ? 'إلغاء' : 'Cancel'}
            </button>
            <button
              type="button"
              onClick={step === 'input' ? handleInit : handleVerify}
              disabled={busy || (step === 'input' ? !newValue.trim() : !otp.trim())}
              className="flex-1 py-3 px-4 rounded-xl bg-gold-500 text-black hover:bg-gold-600 transition-colors font-bold disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {busy && <Loader2 size={16} className="animate-spin" />}
              {step === 'input'
                ? language === 'ar'
                  ? 'إرسال الرمز'
                  : 'Send code'
                : language === 'ar'
                  ? 'تأكيد'
                  : 'Confirm'}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
