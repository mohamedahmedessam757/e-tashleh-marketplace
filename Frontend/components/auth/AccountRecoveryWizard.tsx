import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShieldCheck,
  AlertCircle,
  Lock,
  CheckCircle2,
} from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { authApi } from '../../services/api/auth';
import {
  OTP_EXPIRY_SECONDS,
  formatOtpCountdown,
  otpSecondsFromMinutes,
} from '../../utils/otpConfig';
import { emptyOtpDigits, otpDigitsToCode } from '../../utils/otpDigits';
import { OtpDigitInputs } from './OtpDigitInputs';

interface AccountRecoveryWizardProps {
  onBackToLogin: () => void;
  role: 'customer' | 'merchant';
}

type Step =
  | 'triage-email'
  | 'triage-phone'
  | 'case1-email'
  | 'case1-otp'
  | 'case1-verified'
  | 'case1-new-phone'
  | 'case1-new-otp'
  | 'case2-phone'
  | 'case2-otp'
  | 'case2-verified'
  | 'case2-new-email'
  | 'case2-new-otp'
  | 'case3-ids'
  | 'case3-pending'
  | 'case3-resume'
  | 'case3-new-contacts'
  | 'case3-otps'
  | 'done';

const COUNTRIES = [
  { code: '+966', ar: 'السعودية', en: 'Saudi Arabia' },
  { code: '+971', ar: 'الإمارات', en: 'UAE' },
  { code: '+973', ar: 'البحرين', en: 'Bahrain' },
  { code: '+974', ar: 'قطر', en: 'Qatar' },
  { code: '+965', ar: 'الكويت', en: 'Kuwait' },
  { code: '+968', ar: 'عمان', en: 'Oman' },
];

export const AccountRecoveryWizard: React.FC<AccountRecoveryWizardProps> = ({
  onBackToLogin,
  role,
}) => {
  const { language } = useLanguage();
  const isAr = language === 'ar';

  const [step, setStep] = useState<Step>('triage-email');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [doneMessage, setDoneMessage] = useState('');

  const [proofEmail, setProofEmail] = useState('');
  const [proofPhoneLocal, setProofPhoneLocal] = useState('');
  const [proofCountryCode, setProofCountryCode] = useState('+966');
  const [newPhoneLocal, setNewPhoneLocal] = useState('');
  const [newCountryCode, setNewCountryCode] = useState('+966');
  const [claimedOldEmail, setClaimedOldEmail] = useState('');
  const [claimedOldPhoneLocal, setClaimedOldPhoneLocal] = useState('');
  const [claimedCountryCode, setClaimedCountryCode] = useState('+966');
  const [newEmail, setNewEmail] = useState('');
  const [maskedHint, setMaskedHint] = useState<string | null>(null);
  const [otpDigits, setOtpDigits] = useState(() => emptyOtpDigits());
  const [phoneOtpDigits, setPhoneOtpDigits] = useState(() => emptyOtpDigits());
  const [emailOtpDigits, setEmailOtpDigits] = useState(() => emptyOtpDigits());
  const [secondsLeft, setSecondsLeft] = useState(OTP_EXPIRY_SECONDS);
  const [resumeToken, setResumeToken] = useState('');
  const [maskedOldPhone, setMaskedOldPhone] = useState<string | null>(null);
  const [maskedOldEmail, setMaskedOldEmail] = useState<string | null>(null);

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const t = window.setInterval(() => setSecondsLeft((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, [secondsLeft, step]);

  const title =
    role === 'merchant'
      ? isAr
        ? 'استرجاع حساب التاجر'
        : 'Merchant Account Recovery'
      : isAr
        ? 'استرجاع حساب العميل'
        : 'Customer Account Recovery';

  const triggerError = (msg: string) => setError(msg);
  const clearOtp = () => setOtpDigits(emptyOtpDigits());
  const otpString = (digits: string[]) => otpDigitsToCode(digits);

  const startTimer = (minutes?: number) => {
    setSecondsLeft(otpSecondsFromMinutes(minutes));
  };

  const renderOtpRow = (
    digits: string[],
    setter: React.Dispatch<React.SetStateAction<string[]>>,
    idPrefix = 'main',
  ) => (
    <OtpDigitInputs
      value={digits}
      onChange={setter}
      idPrefix={idPrefix}
      disabled={isLoading}
      className="flex w-full max-w-[280px] sm:max-w-sm mx-auto justify-between gap-1 sm:gap-2"
      inputClassName="w-9 h-11 sm:w-11 sm:h-12 md:w-12 md:h-14 flex-1 min-w-0 max-w-[48px] text-center text-base sm:text-xl font-bold rounded-lg sm:rounded-xl bg-black/40 border border-white/15 text-white focus:border-gold-500 focus:ring-1 focus:ring-gold-500/40 outline-none disabled:opacity-50"
    />
  );

  const resendBtn = (onResend: () => void) =>
    secondsLeft > 0 ? (
      <p className="text-center text-xs sm:text-sm text-white/40">
        {isAr ? 'ينتهي خلال' : 'Expires in'} {formatOtpCountdown(secondsLeft)}
      </p>
    ) : (
      <button
        type="button"
        disabled={isLoading}
        onClick={onResend}
        className="w-full text-sm text-gold-400 hover:text-gold-300 py-2 font-medium disabled:opacity-50"
      >
        {isAr ? 'إعادة إرسال الرمز' : 'Resend code'}
      </button>
    );

  /** Content only — AuthLayout already provides the outer card */
  const cardShell = (children: React.ReactNode) => (
    <div className="w-full min-w-0 max-w-full">
      <div className="text-center mb-5 sm:mb-6 px-0.5">
        <div className="inline-flex items-center justify-center w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-gold-500/15 border border-gold-500/30 mb-3">
          <Lock className="text-gold-400" size={20} />
        </div>
        <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-white leading-snug break-words">
          {title}
        </h1>
        <p className="text-white/50 text-xs sm:text-sm mt-2 leading-relaxed px-1">
          {isAr
            ? 'حماية الحسابات وأموال العملاء هي أولويتنا'
            : 'Protecting accounts and customer funds is our priority'}
        </p>
      </div>
      {error && (
        <div className="mb-4 flex items-start gap-2 bg-red-500/10 border border-red-500/40 text-red-300 text-xs sm:text-sm rounded-xl p-3 min-w-0">
          <AlertCircle size={16} className="mt-0.5 shrink-0" />
          <span className="min-w-0 break-words">{error}</span>
        </div>
      )}
      <div className="w-full min-w-0 space-y-4">{children}</div>
      <button
        type="button"
        onClick={onBackToLogin}
        className="mt-5 sm:mt-6 w-full text-center text-white/45 hover:text-white/80 text-sm py-2"
      >
        {isAr ? 'إلغاء والعودة' : 'Cancel and return'}
      </button>
    </div>
  );

  const primaryBtn = (label: string, onClick: () => void, disabled?: boolean) => (
    <button
      type="button"
      disabled={disabled || isLoading}
      onClick={onClick}
      className="w-full min-h-[48px] py-3 sm:py-3.5 rounded-xl font-bold text-sm sm:text-base text-black bg-gradient-to-r from-gold-500 to-gold-400 hover:from-gold-400 hover:to-gold-300 disabled:opacity-50 transition-all"
    >
      {isLoading ? (
        <span className="inline-block w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
      ) : (
        label
      )}
    </button>
  );

  // ── Handlers ──────────────────────────────────────────────────────

  const onTriageEmail = (yes: boolean) => {
    setError(null);
    if (yes) {
      setStep('case1-email');
      return;
    }
    setStep('triage-phone');
  };

  const onTriagePhone = (yes: boolean) => {
    setError(null);
    if (yes) {
      setStep('case2-phone');
      return;
    }
    setStep('case3-ids');
  };

  const runCase1Start = async () => {
    if (!proofEmail.includes('@')) {
      triggerError(isAr ? 'البريد الإلكتروني غير صالح' : 'Invalid email');
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const res = await authApi.recoveryLostPhoneStart({
        role,
        email: proofEmail.trim(),
      });
      if (!res?.otpSent && res?.accountRegistered === false) {
        triggerError(
          isAr
            ? 'لا يوجد حساب مسجّل بهذا البريد. استخدم البريد المسجّل في النظام.'
            : 'No registered account with this email.',
        );
        return;
      }
      setMaskedHint(res.maskedEmail);
      clearOtp();
      startTimer(res.expiresInMinutes);
      setStep('case1-otp');
    } catch (err: any) {
      const msg = err.response?.data?.message;
      triggerError(
        (Array.isArray(msg) ? msg[0] : msg) ||
          err.message ||
          (isAr
            ? 'لا يوجد حساب مسجّل بهذا البريد الإلكتروني'
            : 'No registered account with this email'),
      );
    } finally {
      setIsLoading(false);
    }
  };

  const runCase1Verify = async () => {
    const code = otpString(otpDigits);
    if (code.length !== 6) {
      triggerError(isAr ? 'الرمز غير مكتمل' : 'Incomplete code');
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      await authApi.recoveryLostPhoneVerifyProof({
        role,
        email: proofEmail.trim(),
        otp: code,
      });
      setStep('case1-verified');
    } catch (err: any) {
      triggerError(err.response?.data?.message || err.message || 'Invalid OTP');
    } finally {
      setIsLoading(false);
    }
  };

  const runCase1NewPhoneOtp = async () => {
    if (newPhoneLocal.length !== 9 || !newPhoneLocal.startsWith('5')) {
      triggerError(
        isAr ? 'رقم الجوال يجب أن يبدأ بـ 5 ومكون من 9 أرقام' : 'Phone must be 9 digits starting with 5',
      );
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const res = await authApi.recoveryLostPhoneRequestNewOtp({
        role,
        email: proofEmail.trim(),
        newPhone: newPhoneLocal,
        newCountryCode,
      });
      clearOtp();
      startTimer(res.expiresInMinutes);
      setMaskedHint(
        `${newCountryCode} ${newPhoneLocal.slice(0, 2)}****${newPhoneLocal.slice(-2)}`,
      );
      setStep('case1-new-otp');
    } catch (err: any) {
      triggerError(err.response?.data?.message || err.message || 'Error');
    } finally {
      setIsLoading(false);
    }
  };

  const runCase1Confirm = async () => {
    const code = otpString(otpDigits);
    if (code.length !== 6) {
      triggerError(isAr ? 'الرمز غير مكتمل' : 'Incomplete code');
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const res = await authApi.recoveryLostPhoneConfirm({
        role,
        email: proofEmail.trim(),
        newPhone: newPhoneLocal,
        newCountryCode,
        phoneOtp: code,
      });
      setDoneMessage(
        res.message ||
          (isAr
            ? 'تم تحديث رقم الجوال بنجاح، ويمكنك الآن تسجيل الدخول باستخدام رقم الجوال الجديد.'
            : 'Phone updated. You can sign in with your new number.'),
      );
      setStep('done');
    } catch (err: any) {
      triggerError(err.response?.data?.message || err.message || 'Error');
    } finally {
      setIsLoading(false);
    }
  };

  const runCase2Start = async () => {
    if (proofPhoneLocal.length !== 9 || !proofPhoneLocal.startsWith('5')) {
      triggerError(
        isAr ? 'رقم الجوال يجب أن يبدأ بـ 5 ومكون من 9 أرقام' : 'Phone must be 9 digits starting with 5',
      );
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const res = await authApi.recoveryLostEmailStart({
        role,
        phone: proofPhoneLocal,
        countryCode: proofCountryCode,
      });
      if (!res?.otpSent && res?.accountRegistered === false) {
        triggerError(
          isAr
            ? 'لا يوجد حساب مسجّل بهذا الرقم. استخدم الرقم المسجّل في النظام.'
            : 'No registered account with this phone.',
        );
        return;
      }
      setMaskedHint(res.maskedPhone);
      clearOtp();
      startTimer(res.expiresInMinutes);
      setStep('case2-otp');
    } catch (err: any) {
      const msg = err.response?.data?.message;
      triggerError(
        (Array.isArray(msg) ? msg[0] : msg) ||
          err.message ||
          (isAr
            ? 'لا يوجد حساب مسجّل برقم الجوال هذا'
            : 'No registered account with this phone'),
      );
    } finally {
      setIsLoading(false);
    }
  };

  const runCase2Verify = async () => {
    const code = otpString(otpDigits);
    if (code.length !== 6) {
      triggerError(isAr ? 'الرمز غير مكتمل' : 'Incomplete code');
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      await authApi.recoveryLostEmailVerifyProof({
        role,
        phone: proofPhoneLocal,
        countryCode: proofCountryCode,
        otp: code,
      });
      setStep('case2-verified');
    } catch (err: any) {
      triggerError(err.response?.data?.message || err.message || 'Invalid OTP');
    } finally {
      setIsLoading(false);
    }
  };

  const runCase2NewEmailOtp = async () => {
    if (!newEmail.includes('@')) {
      triggerError(isAr ? 'البريد الإلكتروني غير صالح' : 'Invalid email');
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const res = await authApi.recoveryLostEmailRequestNewOtp({
        role,
        phone: proofPhoneLocal,
        countryCode: proofCountryCode,
        newEmail,
      });
      clearOtp();
      startTimer(res.expiresInMinutes);
      setMaskedHint(newEmail.replace(/(.{2}).+(@.+)/, '$1***$2'));
      setStep('case2-new-otp');
    } catch (err: any) {
      triggerError(err.response?.data?.message || err.message || 'Error');
    } finally {
      setIsLoading(false);
    }
  };

  const runCase2Confirm = async () => {
    const code = otpString(otpDigits);
    if (code.length !== 6) {
      triggerError(isAr ? 'الرمز غير مكتمل' : 'Incomplete code');
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const res = await authApi.recoveryLostEmailConfirm({
        role,
        phone: proofPhoneLocal,
        countryCode: proofCountryCode,
        newEmail,
        emailOtp: code,
      });
      setDoneMessage(
        res.message ||
          (isAr
            ? 'تم تحديث البريد الإلكتروني بنجاح، ويمكنك الآن استخدام البريد الإلكتروني الجديد للدخول إلى حسابك.'
            : 'Email updated successfully. You can now use the new email to sign in.'),
      );
      setStep('done');
    } catch (err: any) {
      triggerError(err.response?.data?.message || err.message || 'Error');
    } finally {
      setIsLoading(false);
    }
  };

  const runCase3Submit = async () => {
    if (
      claimedOldPhoneLocal.length !== 9 ||
      !claimedOldPhoneLocal.startsWith('5') ||
      !claimedOldEmail.includes('@')
    ) {
      triggerError(isAr ? 'أدخل الجوال والإيميل المسجّلين بشكل صحيح' : 'Enter valid registered phone and email');
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      await authApi.recoveryLostBothSubmit({
        role,
        oldPhone: claimedOldPhoneLocal,
        countryCode: claimedCountryCode,
        oldEmail: claimedOldEmail,
      });
      setStep('case3-pending');
    } catch (err: any) {
      triggerError(err.response?.data?.message || err.message || 'Error');
    } finally {
      setIsLoading(false);
    }
  };

  const runCase3ValidateResume = async () => {
    if (resumeToken.length < 32) {
      triggerError(isAr ? 'رمز غير صالح' : 'Invalid token');
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const res = await authApi.recoveryLostBothValidateResume({ resumeToken });
      setMaskedOldPhone(res.maskedOldPhone);
      setMaskedOldEmail(res.maskedOldEmail);
      setStep('case3-new-contacts');
    } catch (err: any) {
      const msg = err.response?.data?.message;
      triggerError(
        (Array.isArray(msg) ? msg[0] : msg) ||
          err.message ||
          (isAr ? 'رمز الاستكمال غير صالح أو منتهي' : 'Invalid or expired resume token'),
      );
    } finally {
      setIsLoading(false);
    }
  };

  const runCase3RequestOtps = async () => {
    if (
      resumeToken.length < 32 ||
      newPhoneLocal.length !== 9 ||
      !newPhoneLocal.startsWith('5') ||
      !newEmail.includes('@')
    ) {
      triggerError(isAr ? 'أكمل جميع الحقول بشكل صحيح' : 'Complete all fields correctly');
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const res = await authApi.recoveryLostBothRequestOtps({
        resumeToken,
        newPhone: newPhoneLocal,
        newCountryCode,
        newEmail,
      });
      setPhoneOtpDigits(emptyOtpDigits());
      setEmailOtpDigits(emptyOtpDigits());
      startTimer(res.expiresInMinutes);
      setStep('case3-otps');
    } catch (err: any) {
      triggerError(err.response?.data?.message || err.message || 'Error');
    } finally {
      setIsLoading(false);
    }
  };

  const runCase3Complete = async () => {
    const p = otpString(phoneOtpDigits);
    const e = otpString(emailOtpDigits);
    if (p.length !== 6 || e.length !== 6) {
      triggerError(isAr ? 'أدخل رمزي التحقق بالكامل' : 'Enter both OTP codes');
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const res = await authApi.recoveryLostBothComplete({
        resumeToken,
        newPhone: newPhoneLocal,
        newCountryCode,
        newEmail,
        phoneOtp: p,
        emailOtp: e,
      });
      setDoneMessage(
        res.message ||
          (isAr
            ? 'تم التحقق من طلبك وتحديث بيانات الدخول بنجاح. يمكنك الآن الدخول إلى حسابك باستخدام بياناتك الجديدة.'
            : 'Your request was verified and login details updated. You can sign in with your new credentials.'),
      );
      setStep('done');
    } catch (err: any) {
      triggerError(err.response?.data?.message || err.message || 'Error');
    } finally {
      setIsLoading(false);
    }
  };

  // ── Render steps ──────────────────────────────────────────────────

  const yesNo = (onYes: () => void, onNo: () => void, question: string) =>
    cardShell(
      <div className="space-y-4 w-full min-w-0">
        <p className="text-white text-center text-sm sm:text-base font-medium leading-relaxed px-1">
          {question}
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            type="button"
            onClick={onYes}
            className="min-h-[48px] py-3 rounded-xl border border-gold-500/40 bg-gold-500/15 text-gold-200 font-bold hover:bg-gold-500/25"
          >
            {isAr ? 'نعم' : 'Yes'}
          </button>
          <button
            type="button"
            onClick={onNo}
            className="min-h-[48px] py-3 rounded-xl border border-white/15 bg-white/5 text-white/80 font-bold hover:bg-white/10"
          >
            {isAr ? 'لا' : 'No'}
          </button>
        </div>
      </div>,
    );

  const phoneField = (
    local: string,
    setLocal: (v: string) => void,
    cc: string,
    setCc: (v: string) => void,
    label: string,
  ) => (
    <div className="space-y-2 w-full min-w-0">
      <label className="text-xs sm:text-sm text-white/50 block text-start">{label}</label>
      <div className="flex w-full min-w-0 gap-2 items-stretch" dir="ltr">
        <div className="relative w-[30%] min-w-[96px] max-w-[120px] shrink-0">
          <select
            value={cc}
            onChange={(e) => setCc(e.target.value)}
            className="w-full h-full min-h-[48px] bg-black/40 border border-white/15 rounded-xl px-2 sm:px-3 text-white text-sm appearance-none outline-none focus:border-gold-500 cursor-pointer"
            style={{ direction: 'ltr' }}
            aria-label={isAr ? 'رمز الدولة' : 'Country code'}
          >
            {COUNTRIES.map((c) => (
              <option key={c.code} value={c.code} className="bg-[#1A1814]">
                {c.code}
              </option>
            ))}
          </select>
        </div>
        <div className="relative flex-1 min-w-0">
          <input
            type="tel"
            inputMode="numeric"
            value={local}
            onChange={(e) => setLocal(e.target.value.replace(/\D/g, '').slice(0, 9))}
            placeholder="5XXXXXXXX"
            className="w-full min-w-0 min-h-[48px] bg-black/40 border border-white/15 rounded-xl px-3 sm:px-4 py-3 text-white text-base outline-none focus:border-gold-500 tracking-wider"
            dir="ltr"
            autoComplete="tel-national"
          />
        </div>
      </div>
    </div>
  );

  const emailField = (
    value: string,
    setValue: (v: string) => void,
    label: string,
    placeholder?: string,
  ) => (
    <div className="space-y-2 w-full min-w-0">
      <label className="text-xs sm:text-sm text-white/50 block text-start">{label}</label>
      <input
        type="email"
        inputMode="email"
        autoComplete="email"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder || 'name@example.com'}
        className="w-full min-w-0 min-h-[48px] bg-black/40 border border-white/15 rounded-xl px-3 sm:px-4 py-3 text-white text-sm sm:text-base outline-none focus:border-gold-500"
        dir="ltr"
      />
    </div>
  );

  let body: React.ReactNode = null;

  if (step === 'triage-email') {
    body = cardShell(
      <div className="space-y-4 w-full min-w-0">
        <p className="text-white text-center text-sm sm:text-base font-medium leading-relaxed px-1">
          {isAr
            ? 'هل لديك وصول إلى البريد الإلكتروني المسجل في الحساب؟'
            : 'Do you have access to the email registered on the account?'}
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => onTriageEmail(true)}
            className="min-h-[48px] py-3 rounded-xl border border-gold-500/40 bg-gold-500/15 text-gold-200 font-bold hover:bg-gold-500/25"
          >
            {isAr ? 'نعم' : 'Yes'}
          </button>
          <button
            type="button"
            onClick={() => onTriageEmail(false)}
            className="min-h-[48px] py-3 rounded-xl border border-white/15 bg-white/5 text-white/80 font-bold hover:bg-white/10"
          >
            {isAr ? 'لا' : 'No'}
          </button>
        </div>
        <button
          type="button"
          className="w-full text-xs sm:text-sm text-gold-400 hover:text-gold-300 underline underline-offset-2 py-1 break-words"
          onClick={() => {
            setError(null);
            setStep('case3-resume');
          }}
        >
          {isAr ? 'لدي رمز استكمال بعد موافقة الإدارة' : 'I have a resume token after admin approval'}
        </button>
      </div>,
    );
  } else if (step === 'triage-phone') {
    body = yesNo(
      () => onTriagePhone(true),
      () => onTriagePhone(false),
      isAr
        ? 'هل لديك وصول إلى رقم الجوال المسجل في الحساب؟'
        : 'Do you have access to the mobile number registered on the account?',
    );
  } else if (step === 'case1-email') {
    body = cardShell(
      <div className="space-y-4 w-full min-w-0">
        <p className="text-white/60 text-xs sm:text-sm text-center leading-relaxed px-1">
          {isAr
            ? 'أدخل البريد الإلكتروني المسجّل لتحديد الحساب. سنرسل رمز التحقق إلى هذا البريد.'
            : 'Enter the registered email to identify the account. We will send a code to this email.'}
        </p>
        {emailField(
          proofEmail,
          setProofEmail,
          isAr ? 'البريد الإلكتروني المسجّل' : 'Registered email',
        )}
        {primaryBtn(isAr ? 'إرسال الرمز' : 'Send code', runCase1Start)}
      </div>,
    );
  } else if (step === 'case1-otp' || step === 'case1-new-otp' || step === 'case2-otp' || step === 'case2-new-otp') {
    const isProof = step === 'case1-otp' || step === 'case2-otp';
    const onSubmit =
      step === 'case1-otp'
        ? runCase1Verify
        : step === 'case1-new-otp'
          ? runCase1Confirm
          : step === 'case2-otp'
            ? runCase2Verify
            : runCase2Confirm;
    const onResend =
      step === 'case1-otp'
        ? runCase1Start
        : step === 'case1-new-otp'
          ? runCase1NewPhoneOtp
          : step === 'case2-otp'
            ? runCase2Start
            : runCase2NewEmailOtp;
    body = cardShell(
      <div className="space-y-4 w-full min-w-0">
        <p className="text-white/60 text-xs sm:text-sm text-center leading-relaxed break-words px-1">
          {isAr ? 'أدخل الرمز المرسل إلى' : 'Enter the code sent to'}{' '}
          <span className="text-gold-400 font-bold" dir="ltr">
            {maskedHint || '••••'}
          </span>
        </p>
        {renderOtpRow(otpDigits, setOtpDigits)}
        {resendBtn(onResend)}
        {primaryBtn(
          isProof
            ? isAr
              ? 'تحقق'
              : 'Verify'
            : isAr
              ? 'تأكيد التحديث'
              : 'Confirm update',
          onSubmit,
        )}
      </div>,
    );
  } else if (step === 'case1-verified') {
    body = cardShell(
      <div className="space-y-4 text-center">
        <CheckCircle2 className="mx-auto text-emerald-400" size={36} />
        <p className="text-white font-bold">
          {isAr ? 'تم التحقق من هويتك بنجاح.' : 'Identity verified successfully.'}
        </p>
        {primaryBtn(isAr ? 'متابعة' : 'Continue', () => {
          setError(null);
          setStep('case1-new-phone');
        })}
      </div>,
    );
  } else if (step === 'case1-new-phone') {
    body = cardShell(
      <div className="space-y-4 w-full min-w-0">
        <p className="text-white/60 text-xs sm:text-sm text-center leading-relaxed px-1">
          {isAr
            ? 'أدخل رقم الجوال الجديد الذي ترغب في إضافته بدلاً من رقم الجوال القديم.'
            : 'Enter the new mobile number to replace the old one.'}
        </p>
        {phoneField(
          newPhoneLocal,
          setNewPhoneLocal,
          newCountryCode,
          setNewCountryCode,
          isAr ? 'رقم الجوال الجديد' : 'New mobile number',
        )}
        {primaryBtn(isAr ? 'إرسال الرمز' : 'Send code', runCase1NewPhoneOtp)}
      </div>,
    );
  } else if (step === 'case2-phone') {
    body = cardShell(
      <div className="space-y-4 w-full min-w-0">
        <p className="text-white/60 text-xs sm:text-sm text-center leading-relaxed px-1">
          {isAr
            ? 'أدخل رقم الجوال المسجّل لتحديد الحساب. سنرسل رمز التحقق عبر واتساب.'
            : 'Enter the registered phone to identify the account. We will send a WhatsApp code.'}
        </p>
        {phoneField(
          proofPhoneLocal,
          setProofPhoneLocal,
          proofCountryCode,
          setProofCountryCode,
          isAr ? 'رقم الجوال المسجّل' : 'Registered mobile number',
        )}
        {primaryBtn(isAr ? 'إرسال الرمز' : 'Send code', runCase2Start)}
      </div>,
    );
  } else if (step === 'case2-verified') {
    body = cardShell(
      <div className="space-y-4 text-center">
        <CheckCircle2 className="mx-auto text-emerald-400" size={36} />
        <p className="text-white font-bold">
          {isAr ? 'تم التحقق من هويتك بنجاح.' : 'Identity verified successfully.'}
        </p>
        {primaryBtn(isAr ? 'متابعة' : 'Continue', () => setStep('case2-new-email'))}
      </div>,
    );
  } else if (step === 'case2-new-email') {
    body = cardShell(
      <div className="space-y-4 w-full min-w-0">
        <p className="text-white/60 text-xs sm:text-sm text-center leading-relaxed px-1">
          {isAr
            ? 'أدخل البريد الإلكتروني الجديد الذي ترغب في إضافته بدلاً من البريد الإلكتروني القديم.'
            : 'Enter the new email you want to add instead of the old email.'}
        </p>
        {emailField(
          newEmail,
          setNewEmail,
          isAr ? 'البريد الإلكتروني الجديد' : 'New email',
        )}
        {primaryBtn(isAr ? 'إرسال الرمز' : 'Send code', runCase2NewEmailOtp)}
      </div>,
    );
  } else if (step === 'case3-ids') {
    body = cardShell(
      <div className="space-y-4 w-full min-w-0">
        <div className="bg-orange-500/10 border border-orange-500/30 text-orange-200 text-xs sm:text-sm rounded-xl p-3 leading-relaxed">
          {isAr
            ? 'هذه عملية عالية الخطورة. أدخل الجوال والبريد المسجّلين مسبقاً في النظام فقط (وليس بيانات جديدة). ستراجع الإدارة الطلب ويُعلَّق السحب مؤقتاً.'
            : 'High-risk process. Enter only the phone and email already registered on the account (not new contacts). Admin will review and withdrawals will be paused.'}
        </div>
        {phoneField(
          claimedOldPhoneLocal,
          setClaimedOldPhoneLocal,
          claimedCountryCode,
          setClaimedCountryCode,
          isAr ? 'رقم الجوال المسجّل (المدّعى)' : 'Registered phone (claimed)',
        )}
        {emailField(
          claimedOldEmail,
          setClaimedOldEmail,
          isAr ? 'البريد المسجّل' : 'Registered email',
        )}
        {primaryBtn(isAr ? 'إرسال طلب المراجعة' : 'Submit for review', runCase3Submit)}
        <button
          type="button"
          className="w-full text-xs sm:text-sm text-gold-400 underline underline-offset-2 break-words"
          onClick={() => setStep('case3-resume')}
        >
          {isAr ? 'لدي رمز استكمال من الإدارة' : 'I have a resume token from admin'}
        </button>
      </div>,
    );
  } else if (step === 'case3-pending') {
    body = cardShell(
      <div className="space-y-4 text-center">
        <ShieldCheck className="mx-auto text-gold-400" size={36} />
        <p className="text-white font-bold text-base sm:text-lg">
          {isAr
            ? 'طلب استعادة عالي الخطورة قيد المراجعة'
            : 'High-risk recovery request under review'}
        </p>
        <p className="text-white/55 text-xs sm:text-sm leading-relaxed px-1">
          {isAr
            ? 'إذا تطابقت البيانات مع حساب مسجّل، تم إشعار الإدارة وتعليق السحب حتى انتهاء المراجعة. لا يتم تغيير وسائل الدخول تلقائياً.'
            : 'If the details match a registered account, admins were notified and withdrawals are paused until review completes. Login methods are not changed automatically.'}
        </p>
        {primaryBtn(isAr ? 'العودة لتسجيل الدخول' : 'Back to login', onBackToLogin)}
        <button
          type="button"
          className="w-full text-sm text-gold-400 underline"
          onClick={() => setStep('case3-resume')}
        >
          {isAr ? 'لدي رمز استكمال بعد الموافقة' : 'I have a resume token after approval'}
        </button>
      </div>,
    );
  } else if (step === 'case3-resume') {
    body = cardShell(
      <div className="space-y-4 w-full min-w-0">
        <p className="text-white/60 text-xs sm:text-sm text-center leading-relaxed px-1">
          {isAr
            ? 'أدخل رمز الاستكمال الذي وصل إلى بريدك المسجّل بعد موافقة الإدارة.'
            : 'Enter the resume code emailed to your registered address after admin approval.'}
        </p>
        <label className="text-xs sm:text-sm text-white/50 block text-start">
          {isAr ? 'رمز الاستكمال من الإدارة' : 'Resume token from admin'}
        </label>
        <input
          value={resumeToken}
          onChange={(e) => setResumeToken(e.target.value.trim())}
          className="w-full min-w-0 min-h-[48px] bg-black/40 border border-white/15 rounded-xl px-3 py-3 text-white text-xs sm:text-sm font-mono outline-none focus:border-gold-500 break-all"
          dir="ltr"
          autoComplete="off"
        />
        {primaryBtn(isAr ? 'متابعة' : 'Continue', runCase3ValidateResume)}
      </div>,
    );
  } else if (step === 'case3-new-contacts') {
    body = cardShell(
      <div className="space-y-4 w-full min-w-0">
        <div className="bg-white/5 border border-white/10 rounded-xl p-3 space-y-2 text-start">
          <p className="text-xs text-white/40 font-medium">
            {isAr ? 'البيانات المسجّلة حالياً (مموّهة)' : 'Current registered contacts (masked)'}
          </p>
          <p className="text-sm text-white/80 font-mono dir-ltr" dir="ltr">
            {isAr ? 'الجوال: ' : 'Phone: '}
            {maskedOldPhone || '—'}
          </p>
          <p className="text-sm text-white/80 font-mono dir-ltr" dir="ltr">
            {isAr ? 'البريد: ' : 'Email: '}
            {maskedOldEmail || '—'}
          </p>
        </div>
        <p className="text-white/60 text-xs sm:text-sm text-center leading-relaxed px-1">
          {isAr
            ? 'أدخل رقم جوال وبريد إلكتروني جديدين غير مستخدمين في النظام.'
            : 'Enter a new phone and email that are not already used in the system.'}
        </p>
        {phoneField(
          newPhoneLocal,
          setNewPhoneLocal,
          newCountryCode,
          setNewCountryCode,
          isAr ? 'رقم الجوال الجديد' : 'New mobile',
        )}
        {emailField(newEmail, setNewEmail, isAr ? 'البريد الجديد' : 'New email')}
        {primaryBtn(isAr ? 'إرسال رموز التحقق' : 'Send verification codes', runCase3RequestOtps)}
      </div>,
    );
  } else if (step === 'case3-otps') {
    body = cardShell(
      <div className="space-y-5 w-full min-w-0">
        <div className="w-full min-w-0">
          <p className="text-xs text-white/50 mb-2 text-center">
            {isAr ? 'رمز واتساب للجوال الجديد' : 'WhatsApp OTP for new phone'}
          </p>
          {renderOtpRow(phoneOtpDigits, setPhoneOtpDigits, 'phone')}
        </div>
        <div className="w-full min-w-0">
          <p className="text-xs text-white/50 mb-2 text-center">
            {isAr ? 'رمز الإيميل الجديد' : 'Email OTP for new email'}
          </p>
          {renderOtpRow(emailOtpDigits, setEmailOtpDigits, 'email')}
        </div>
        <p className="text-center text-xs text-white/40">
          {secondsLeft > 0
            ? `${isAr ? 'ينتهي خلال' : 'Expires in'} ${formatOtpCountdown(secondsLeft)}`
            : ''}
        </p>
        {secondsLeft <= 0 && (
          <button
            type="button"
            disabled={isLoading}
            onClick={runCase3RequestOtps}
            className="w-full text-sm text-gold-400 hover:text-gold-300 py-2 font-medium"
          >
            {isAr ? 'إعادة إرسال الرموز' : 'Resend codes'}
          </button>
        )}
        {primaryBtn(isAr ? 'تأكيد التحديث' : 'Confirm update', runCase3Complete)}
      </div>,
    );
  } else if (step === 'done') {
    body = cardShell(
      <div className="space-y-4 text-center w-full min-w-0">
        <CheckCircle2 className="mx-auto text-emerald-400" size={40} />
        <p className="text-white font-bold text-base sm:text-lg leading-relaxed break-words px-1">
          {doneMessage}
        </p>
        {primaryBtn(isAr ? 'تسجيل الدخول' : 'Sign in', onBackToLogin)}
      </div>,
    );
  }

  return (
    <div className="w-full min-w-0 max-w-full">
      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2 }}
          className="w-full min-w-0"
        >
          {body}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

export default AccountRecoveryWizard;
