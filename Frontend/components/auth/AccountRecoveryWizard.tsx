import React, { useEffect, useRef, useState } from 'react';
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

interface AccountRecoveryWizardProps {
  onBackToLogin: () => void;
  role: 'customer' | 'merchant';
}

type Step =
  | 'triage-email'
  | 'triage-phone'
  | 'suggest-login'
  | 'case1-phone'
  | 'case1-otp'
  | 'case1-verified'
  | 'case1-new-phone'
  | 'case1-new-otp'
  | 'case2-email'
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
  { code: '+966', ar: 'Ø§Ù„Ø³Ø¹ÙˆØ¯ÙŠØ©', en: 'Saudi Arabia' },
  { code: '+971', ar: 'Ø§Ù„Ø¥Ù…Ø§Ø±Ø§Øª', en: 'UAE' },
  { code: '+973', ar: 'Ø§Ù„Ø¨Ø­Ø±ÙŠÙ†', en: 'Bahrain' },
  { code: '+974', ar: 'Ù‚Ø·Ø±', en: 'Qatar' },
  { code: '+965', ar: 'Ø§Ù„ÙƒÙˆÙŠØª', en: 'Kuwait' },
  { code: '+968', ar: 'Ø¹Ù…Ø§Ù†', en: 'Oman' },
];

export const AccountRecoveryWizard: React.FC<AccountRecoveryWizardProps> = ({
  onBackToLogin,
  role,
}) => {
  const { language } = useLanguage();
  const isAr = language === 'ar';

  const [step, setStep] = useState<Step>('triage-email');
  const [hasEmailAccess, setHasEmailAccess] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [doneMessage, setDoneMessage] = useState('');

  const [countryCode, setCountryCode] = useState('+966');
  const [oldPhoneLocal, setOldPhoneLocal] = useState('');
  const [newPhoneLocal, setNewPhoneLocal] = useState('');
  const [newCountryCode, setNewCountryCode] = useState('+966');
  const [oldEmail, setOldEmail] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [maskedHint, setMaskedHint] = useState<string | null>(null);
  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']);
  const [phoneOtpDigits, setPhoneOtpDigits] = useState(['', '', '', '', '', '']);
  const [emailOtpDigits, setEmailOtpDigits] = useState(['', '', '', '', '', '']);
  const [secondsLeft, setSecondsLeft] = useState(OTP_EXPIRY_SECONDS);
  const [resumeToken, setResumeToken] = useState('');
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const t = window.setInterval(() => setSecondsLeft((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, [secondsLeft, step]);

  const title =
    role === 'merchant'
      ? isAr
        ? 'Ø§Ø³ØªØ±Ø¬Ø§Ø¹ Ø­Ø³Ø§Ø¨ Ø§Ù„ØªØ§Ø¬Ø±'
        : 'Merchant Account Recovery'
      : isAr
        ? 'Ø§Ø³ØªØ±Ø¬Ø§Ø¹ Ø­Ø³Ø§Ø¨ Ø§Ù„Ø¹Ù…ÙŠÙ„'
        : 'Customer Account Recovery';

  const triggerError = (msg: string) => setError(msg);
  const clearOtp = () => setOtpDigits(['', '', '', '', '', '']);
  const otpString = (digits: string[]) => digits.join('');

  const startTimer = (minutes?: number) => {
    setSecondsLeft(otpSecondsFromMinutes(minutes));
  };

  const handleOtpChange = (
    index: number,
    value: string,
    setter: React.Dispatch<React.SetStateAction<string[]>>,
  ) => {
    const digit = value.replace(/\D/g, '').slice(-1);
    setter((prev) => {
      const next = [...prev];
      next[index] = digit;
      return next;
    });
    if (digit && index < 5) otpRefs.current[index + 1]?.focus();
  };

  const handleOtpKeyDown = (
    index: number,
    e: React.KeyboardEvent,
    digits: string[],
    setter: React.Dispatch<React.SetStateAction<string[]>>,
  ) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (
    e: React.ClipboardEvent,
    setter: React.Dispatch<React.SetStateAction<string[]>>,
  ) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pasted) return;
    const next = Array(6)
      .fill('')
      .map((_, i) => pasted[i] || '');
    setter(next);
  };

  const renderOtpRow = (
    digits: string[],
    setter: React.Dispatch<React.SetStateAction<string[]>>,
    refPrefix = 'main',
  ) => (
    <div
      className="flex w-full max-w-[320px] sm:max-w-sm mx-auto justify-between gap-1.5 sm:gap-2"
      dir="ltr"
      onPaste={(e) => handleOtpPaste(e, setter)}
    >
      {digits.map((d, i) => (
        <input
          key={`${refPrefix}-${i}`}
          ref={(el) => {
            otpRefs.current[i] = el;
          }}
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={1}
          value={d}
          onChange={(e) => handleOtpChange(i, e.target.value, setter)}
          onKeyDown={(e) => handleOtpKeyDown(i, e, digits, setter)}
          className="w-9 h-11 sm:w-11 sm:h-12 md:w-12 md:h-14 shrink-0 text-center text-base sm:text-xl font-bold rounded-xl bg-white/5 border border-white/10 text-white focus:border-gold-500 focus:ring-1 focus:ring-gold-500/40 outline-none"
        />
      ))}
    </div>
  );

  const resendBtn = (onResend: () => void) =>
    secondsLeft > 0 ? (
      <p className="text-center text-xs sm:text-sm text-white/40 font-mono">
        {isAr ? 'ÙŠÙ†ØªÙ‡ÙŠ Ø®Ù„Ø§Ù„' : 'Expires in'} {formatOtpCountdown(secondsLeft)}
      </p>
    ) : (
      <button
        type="button"
        disabled={isLoading}
        onClick={onResend}
        className="w-full text-sm text-gold-400 hover:text-gold-300 py-2 font-medium disabled:opacity-50"
      >
        {isAr ? 'Ø¥Ø¹Ø§Ø¯Ø© Ø¥Ø±Ø³Ø§Ù„ Ø§Ù„Ø±Ù…Ø²' : 'Resend code'}
      </button>
    );

  /** Content only â€” AuthLayout already provides the outer card (avoid nested cards / overflow). */
  const contentShell = (children: React.ReactNode) => (
    <div className="w-full max-w-full overflow-x-hidden">
      <div className="text-center mb-5 sm:mb-6">
        <div className="inline-flex items-center justify-center w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-gold-500/15 border border-gold-500/30 mb-3">
          <Lock className="text-gold-400" size={20} />
        </div>
        <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-white leading-snug px-1">
          {title}
        </h1>
        <p className="text-white/50 text-xs sm:text-sm mt-2 leading-relaxed px-1">
          {isAr
            ? 'Ø­Ù…Ø§ÙŠØ© Ø§Ù„Ø­Ø³Ø§Ø¨Ø§Øª ÙˆØ£Ù…ÙˆØ§Ù„ Ø§Ù„Ø¹Ù…Ù„Ø§Ø¡ Ù‡ÙŠ Ø£ÙˆÙ„ÙˆÙŠØªÙ†Ø§'
            : 'Protecting accounts and customer funds is our priority'}
        </p>
      </div>
      {error && (
        <div className="mb-4 flex items-start gap-2 bg-red-500/10 border border-red-500/40 text-red-300 text-xs sm:text-sm rounded-xl p-3">
          <AlertCircle size={16} className="mt-0.5 shrink-0" />
          <span className="break-words min-w-0">{error}</span>
        </div>
      )}
      <div className="space-y-4 w-full min-w-0">{children}</div>
      <button
        type="button"
        onClick={onBackToLogin}
        className="mt-5 sm:mt-6 w-full text-center text-white/45 hover:text-white/80 text-sm py-2"
      >
        {isAr ? 'Ø¥Ù„ØºØ§Ø¡ ÙˆØ§Ù„Ø¹ÙˆØ¯Ø©' : 'Cancel and return'}
      </button>
    </div>
  );

  const primaryBtn = (label: string, onClick: () => void, disabled?: boolean) => (
    <button
      type="button"
      disabled={disabled || isLoading}
      onClick={onClick}
      className="w-full min-h-[48px] py-3 sm:py-3.5 rounded-xl font-bold text-black text-sm sm:text-base bg-gradient-to-r from-gold-500 to-gold-400 hover:from-gold-400 hover:to-gold-300 disabled:opacity-50 transition-all active:scale-[0.99]"
    >
      {isLoading ? (
        <span className="inline-block w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
      ) : (
        label
      )}
    </button>
  );

  // â”€â”€ Handlers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  const onTriageEmail = (yes: boolean) => {
    setError(null);
    setHasEmailAccess(yes);
    setStep('triage-phone');
  };

  const onTriagePhone = (yes: boolean) => {
    setError(null);
    if (hasEmailAccess === true && yes) {
      setStep('suggest-login');
      return;
    }
    if (hasEmailAccess === true && !yes) {
      setStep('case1-phone');
      return;
    }
    if (hasEmailAccess === false && yes) {
      setStep('case2-email');
      return;
    }
    setStep('case3-ids');
  };

  const runCase1Start = async () => {
    if (oldPhoneLocal.length !== 9 || !oldPhoneLocal.startsWith('5')) {
      triggerError(
        isAr ? 'Ø±Ù‚Ù… Ø§Ù„Ø¬ÙˆØ§Ù„ ÙŠØ¬Ø¨ Ø£Ù† ÙŠØ¨Ø¯Ø£ Ø¨Ù€ 5 ÙˆÙ…ÙƒÙˆÙ† Ù…Ù† 9 Ø£Ø±Ù‚Ø§Ù…' : 'Phone must be 9 digits starting with 5',
      );
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const res = await authApi.recoveryLostPhoneStart({
        role,
        oldPhone: oldPhoneLocal,
        countryCode,
      });
      setMaskedHint(res.maskedEmail);
      clearOtp();
      startTimer(res.expiresInMinutes);
      setStep('case1-otp');
    } catch (err: any) {
      triggerError(err.response?.data?.message || err.message || 'Error');
    } finally {
      setIsLoading(false);
    }
  };

  const runCase1Verify = async () => {
    const code = otpString(otpDigits);
    if (code.length !== 6) {
      triggerError(isAr ? 'Ø§Ù„Ø±Ù…Ø² ØºÙŠØ± Ù…ÙƒØªÙ…Ù„' : 'Incomplete code');
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      await authApi.recoveryLostPhoneVerifyProof({
        role,
        oldPhone: oldPhoneLocal,
        countryCode,
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
        isAr ? 'Ø±Ù‚Ù… Ø§Ù„Ø¬ÙˆØ§Ù„ ÙŠØ¬Ø¨ Ø£Ù† ÙŠØ¨Ø¯Ø£ Ø¨Ù€ 5 ÙˆÙ…ÙƒÙˆÙ† Ù…Ù† 9 Ø£Ø±Ù‚Ø§Ù…' : 'Phone must be 9 digits starting with 5',
      );
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const res = await authApi.recoveryLostPhoneRequestNewOtp({
        role,
        oldPhone: oldPhoneLocal,
        countryCode,
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
      triggerError(isAr ? 'Ø§Ù„Ø±Ù…Ø² ØºÙŠØ± Ù…ÙƒØªÙ…Ù„' : 'Incomplete code');
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const res = await authApi.recoveryLostPhoneConfirm({
        role,
        oldPhone: oldPhoneLocal,
        countryCode,
        newPhone: newPhoneLocal,
        newCountryCode,
        phoneOtp: code,
      });
      setDoneMessage(
        res.message ||
          (isAr
            ? 'ØªÙ… ØªØ­Ø¯ÙŠØ« Ø±Ù‚Ù… Ø§Ù„Ø¬ÙˆØ§Ù„ Ø¨Ù†Ø¬Ø§Ø­ØŒ ÙˆÙŠÙ…ÙƒÙ†Ùƒ Ø§Ù„Ø¢Ù† ØªØ³Ø¬ÙŠÙ„ Ø§Ù„Ø¯Ø®ÙˆÙ„ Ø¨Ø§Ø³ØªØ®Ø¯Ø§Ù… Ø±Ù‚Ù… Ø§Ù„Ø¬ÙˆØ§Ù„ Ø§Ù„Ø¬Ø¯ÙŠØ¯.'
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
    if (!oldEmail.includes('@')) {
      triggerError(isAr ? 'Ø§Ù„Ø¨Ø±ÙŠØ¯ Ø§Ù„Ø¥Ù„ÙƒØªØ±ÙˆÙ†ÙŠ ØºÙŠØ± ØµØ§Ù„Ø­' : 'Invalid email');
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const res = await authApi.recoveryLostEmailStart({ role, oldEmail });
      setMaskedHint(res.maskedPhone);
      clearOtp();
      startTimer(res.expiresInMinutes);
      setStep('case2-otp');
    } catch (err: any) {
      triggerError(err.response?.data?.message || err.message || 'Error');
    } finally {
      setIsLoading(false);
    }
  };

  const runCase2Verify = async () => {
    const code = otpString(otpDigits);
    if (code.length !== 6) {
      triggerError(isAr ? 'Ø§Ù„Ø±Ù…Ø² ØºÙŠØ± Ù…ÙƒØªÙ…Ù„' : 'Incomplete code');
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      await authApi.recoveryLostEmailVerifyProof({ role, oldEmail, otp: code });
      setStep('case2-verified');
    } catch (err: any) {
      triggerError(err.response?.data?.message || err.message || 'Invalid OTP');
    } finally {
      setIsLoading(false);
    }
  };

  const runCase2NewEmailOtp = async () => {
    if (!newEmail.includes('@')) {
      triggerError(isAr ? 'Ø§Ù„Ø¨Ø±ÙŠØ¯ Ø§Ù„Ø¥Ù„ÙƒØªØ±ÙˆÙ†ÙŠ ØºÙŠØ± ØµØ§Ù„Ø­' : 'Invalid email');
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const res = await authApi.recoveryLostEmailRequestNewOtp({
        role,
        oldEmail,
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
      triggerError(isAr ? 'Ø§Ù„Ø±Ù…Ø² ØºÙŠØ± Ù…ÙƒØªÙ…Ù„' : 'Incomplete code');
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const res = await authApi.recoveryLostEmailConfirm({
        role,
        oldEmail,
        newEmail,
        emailOtp: code,
      });
      setDoneMessage(
        res.message ||
          (isAr
            ? 'ØªÙ… ØªØ­Ø¯ÙŠØ« Ø§Ù„Ø¨Ø±ÙŠØ¯ Ø§Ù„Ø¥Ù„ÙƒØªØ±ÙˆÙ†ÙŠ Ø¨Ù†Ø¬Ø§Ø­ØŒ ÙˆÙŠÙ…ÙƒÙ†Ùƒ Ø§Ù„Ø¢Ù† Ø§Ø³ØªØ®Ø¯Ø§Ù… Ø§Ù„Ø¨Ø±ÙŠØ¯ Ø§Ù„Ø¥Ù„ÙƒØªØ±ÙˆÙ†ÙŠ Ø§Ù„Ø¬Ø¯ÙŠØ¯ Ù„Ù„Ø¯Ø®ÙˆÙ„ Ø¥Ù„Ù‰ Ø­Ø³Ø§Ø¨Ùƒ.'
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
    if (oldPhoneLocal.length !== 9 || !oldPhoneLocal.startsWith('5') || !oldEmail.includes('@')) {
      triggerError(isAr ? 'Ø£Ø¯Ø®Ù„ Ø§Ù„Ø¬ÙˆØ§Ù„ ÙˆØ§Ù„Ø¥ÙŠÙ…ÙŠÙ„ Ø§Ù„Ù…Ø³Ø¬Ù‘Ù„ÙŠÙ† Ø¨Ø´ÙƒÙ„ ØµØ­ÙŠØ­' : 'Enter valid registered phone and email');
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      await authApi.recoveryLostBothSubmit({
        role,
        oldPhone: oldPhoneLocal,
        countryCode,
        oldEmail,
      });
      setStep('case3-pending');
    } catch (err: any) {
      triggerError(err.response?.data?.message || err.message || 'Error');
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
      triggerError(isAr ? 'Ø£ÙƒÙ…Ù„ Ø¬Ù…ÙŠØ¹ Ø§Ù„Ø­Ù‚ÙˆÙ„ Ø¨Ø´ÙƒÙ„ ØµØ­ÙŠØ­' : 'Complete all fields correctly');
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
      setPhoneOtpDigits(['', '', '', '', '', '']);
      setEmailOtpDigits(['', '', '', '', '', '']);
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
      triggerError(isAr ? 'Ø£Ø¯Ø®Ù„ Ø±Ù…Ø²ÙŠ Ø§Ù„ØªØ­Ù‚Ù‚ Ø¨Ø§Ù„ÙƒØ§Ù…Ù„' : 'Enter both OTP codes');
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
            ? 'ØªÙ… Ø§Ù„ØªØ­Ù‚Ù‚ Ù…Ù† Ø·Ù„Ø¨Ùƒ ÙˆØªØ­Ø¯ÙŠØ« Ø¨ÙŠØ§Ù†Ø§Øª Ø§Ù„Ø¯Ø®ÙˆÙ„ Ø¨Ù†Ø¬Ø§Ø­. ÙŠÙ…ÙƒÙ†Ùƒ Ø§Ù„Ø¢Ù† Ø§Ù„Ø¯Ø®ÙˆÙ„ Ø¥Ù„Ù‰ Ø­Ø³Ø§Ø¨Ùƒ Ø¨Ø§Ø³ØªØ®Ø¯Ø§Ù… Ø¨ÙŠØ§Ù†Ø§ØªÙƒ Ø§Ù„Ø¬Ø¯ÙŠØ¯Ø©.'
            : 'Your request was verified and login details updated. You can sign in with your new credentials.'),
      );
      setStep('done');
    } catch (err: any) {
      triggerError(err.response?.data?.message || err.message || 'Error');
    } finally {
      setIsLoading(false);
    }
  };

  // â”€â”€ Render steps â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  const yesNo = (onYes: () => void, onNo: () => void, question: string) =>
    contentShell(
      <div className="space-y-4">
        <p className="text-white text-center text-sm sm:text-base font-medium leading-relaxed px-1">
          {question}
        </p>
        <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
          <button
            type="button"
            onClick={onYes}
            className="min-h-[48px] py-3 rounded-xl border border-gold-500/40 bg-gold-500/15 text-gold-200 font-bold hover:bg-gold-500/25 text-sm sm:text-base"
          >
            {isAr ? 'Ù†Ø¹Ù…' : 'Yes'}
          </button>
          <button
            type="button"
            onClick={onNo}
            className="min-h-[48px] py-3 rounded-xl border border-white/15 bg-white/5 text-white/80 font-bold hover:bg-white/10 text-sm sm:text-base"
          >
            {isAr ? 'Ù„Ø§' : 'No'}
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
    <div className="w-full min-w-0 space-y-2">
      <label className="block text-xs sm:text-sm text-white/50 text-start">{label}</label>
      <div className="flex w-full min-w-0 gap-2 items-stretch" dir="ltr">
        <select
          value={cc}
          onChange={(e) => setCc(e.target.value)}
          className="shrink-0 w-[5.5rem] sm:w-[6.25rem] bg-white/5 border border-white/10 rounded-xl px-2 py-3.5 text-white text-sm outline-none focus:border-gold-500 appearance-none"
          style={{ direction: 'ltr' }}
        >
          {COUNTRIES.map((c) => (
            <option key={c.code} value={c.code} className="bg-[#1A1814]">
              {c.code}
            </option>
          ))}
        </select>
        <input
          value={local}
          onChange={(e) => setLocal(e.target.value.replace(/\D/g, '').slice(0, 9))}
          placeholder="5XXXXXXXX"
          inputMode="numeric"
          className="min-w-0 flex-1 w-full bg-white/5 border border-white/10 rounded-xl px-3 py-3.5 text-white text-base outline-none focus:border-gold-500 tracking-wide"
        />
      </div>
    </div>
  );

  let body: React.ReactNode = null;

  if (step === 'triage-email') {
    body = contentShell(
      <div className="space-y-4">
        <p className="text-white text-center text-sm sm:text-base font-medium leading-relaxed px-1">
          {isAr
            ? 'Ù‡Ù„ Ù„Ø¯ÙŠÙƒ ÙˆØµÙˆÙ„ Ø¥Ù„Ù‰ Ø§Ù„Ø¨Ø±ÙŠØ¯ Ø§Ù„Ø¥Ù„ÙƒØªØ±ÙˆÙ†ÙŠ Ø§Ù„Ù…Ø³Ø¬Ù„ ÙÙŠ Ø§Ù„Ø­Ø³Ø§Ø¨ØŸ'
            : 'Do you have access to the email registered on the account?'}
        </p>
        <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
          <button
            type="button"
            onClick={() => onTriageEmail(true)}
            className="min-h-[48px] py-3 rounded-xl border border-gold-500/40 bg-gold-500/15 text-gold-200 font-bold hover:bg-gold-500/25"
          >
            {isAr ? 'Ù†Ø¹Ù…' : 'Yes'}
          </button>
          <button
            type="button"
            onClick={() => onTriageEmail(false)}
            className="min-h-[48px] py-3 rounded-xl border border-white/15 bg-white/5 text-white/80 font-bold hover:bg-white/10"
          >
            {isAr ? 'Ù„Ø§' : 'No'}
          </button>
        </div>
        <button
          type="button"
          className="w-full text-xs sm:text-sm text-gold-400 underline pt-1"
          onClick={() => {
            setError(null);
            setStep('case3-resume');
          }}
        >
          {isAr ? 'Ù„Ø¯ÙŠ Ø±Ù…Ø² Ø§Ø³ØªÙƒÙ…Ø§Ù„ Ø¨Ø¹Ø¯ Ù…ÙˆØ§ÙÙ‚Ø© Ø§Ù„Ø¥Ø¯Ø§Ø±Ø©' : 'I have a resume token after admin approval'}
        </button>
      </div>,
    );
  } else if (step === 'triage-phone') {
    body = yesNo(
      () => onTriagePhone(true),
      () => onTriagePhone(false),
      isAr
        ? 'Ù‡Ù„ Ù„Ø¯ÙŠÙƒ ÙˆØµÙˆÙ„ Ø¥Ù„Ù‰ Ø±Ù‚Ù… Ø§Ù„Ø¬ÙˆØ§Ù„ Ø§Ù„Ù…Ø³Ø¬Ù„ ÙÙŠ Ø§Ù„Ø­Ø³Ø§Ø¨ØŸ'
        : 'Do you have access to the mobile number registered on the account?',
    );
  } else if (step === 'suggest-login') {
    body = contentShell(
      <div className="space-y-4 text-center">
        <p className="text-white/80">
          {isAr
            ? 'ÙŠÙ…ÙƒÙ†Ùƒ ØªØ³Ø¬ÙŠÙ„ Ø§Ù„Ø¯Ø®ÙˆÙ„ Ø¨Ø§Ù„Ø·Ø±ÙŠÙ‚Ø© Ø§Ù„Ø¹Ø§Ø¯ÙŠØ© Ø¨Ø§Ø³ØªØ®Ø¯Ø§Ù… Ø§Ù„Ø¬ÙˆØ§Ù„ Ø£Ùˆ Ø§Ù„Ø¥ÙŠÙ…ÙŠÙ„.'
            : 'You can sign in normally using your phone or email.'}
        </p>
        {primaryBtn(isAr ? 'Ø§Ù„Ø¹ÙˆØ¯Ø© Ù„ØªØ³Ø¬ÙŠÙ„ Ø§Ù„Ø¯Ø®ÙˆÙ„' : 'Back to login', onBackToLogin)}
      </div>,
    );
  } else if (step === 'case1-phone') {
    body = contentShell(
      <div className="space-y-4">
        <p className="text-white/60 text-xs sm:text-sm text-center leading-relaxed px-1">
          {isAr
            ? 'Ø£Ø¯Ø®Ù„ Ø±Ù‚Ù… Ø§Ù„Ø¬ÙˆØ§Ù„ Ø§Ù„Ù‚Ø¯ÙŠÙ… Ù„ØªØ­Ø¯ÙŠØ¯ Ø§Ù„Ø­Ø³Ø§Ø¨. Ø³Ù†Ø±Ø³Ù„ Ø±Ù…Ø² Ø§Ù„ØªØ­Ù‚Ù‚ Ø¥Ù„Ù‰ Ø§Ù„Ø¥ÙŠÙ…ÙŠÙ„ Ø§Ù„Ù…Ø³Ø¬Ù‘Ù„.'
            : 'Enter your old phone to identify the account. We will send a code to the registered email.'}
        </p>
        {phoneField(
          oldPhoneLocal,
          setOldPhoneLocal,
          countryCode,
          setCountryCode,
          isAr ? 'Ø±Ù‚Ù… Ø§Ù„Ø¬ÙˆØ§Ù„ Ø§Ù„Ù‚Ø¯ÙŠÙ…' : 'Old mobile number',
        )}
        {primaryBtn(isAr ? 'Ø¥Ø±Ø³Ø§Ù„ Ø§Ù„Ø±Ù…Ø²' : 'Send code', runCase1Start)}
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
    body = contentShell(
      <div className="space-y-4">
        <p className="text-white/60 text-sm text-center">
          {isAr ? 'Ø£Ø¯Ø®Ù„ Ø§Ù„Ø±Ù…Ø² Ø§Ù„Ù…Ø±Ø³Ù„ Ø¥Ù„Ù‰' : 'Enter the code sent to'}{' '}
          <span className="text-gold-400 font-bold">{maskedHint || 'â€¢â€¢â€¢â€¢'}</span>
        </p>
        {renderOtpRow(otpDigits, setOtpDigits)}
        {resendBtn(onResend)}
        {primaryBtn(
          isProof
            ? isAr
              ? 'ØªØ­Ù‚Ù‚'
              : 'Verify'
            : isAr
              ? 'ØªØ£ÙƒÙŠØ¯ Ø§Ù„ØªØ­Ø¯ÙŠØ«'
              : 'Confirm update',
          onSubmit,
        )}
      </div>,
    );
  } else if (step === 'case1-verified') {
    body = contentShell(
      <div className="space-y-4 text-center">
        <CheckCircle2 className="mx-auto text-emerald-400" size={36} />
        <p className="text-white font-bold">
          {isAr ? 'ØªÙ… Ø§Ù„ØªØ­Ù‚Ù‚ Ù…Ù† Ù‡ÙˆÙŠØªÙƒ Ø¨Ù†Ø¬Ø§Ø­.' : 'Identity verified successfully.'}
        </p>
        {primaryBtn(isAr ? 'Ù…ØªØ§Ø¨Ø¹Ø©' : 'Continue', () => {
          setError(null);
          setStep('case1-new-phone');
        })}
      </div>,
    );
  } else if (step === 'case1-new-phone') {
    body = contentShell(
      <div className="space-y-4">
        <p className="text-white/60 text-sm text-center">
          {isAr
            ? 'Ø£Ø¯Ø®Ù„ Ø±Ù‚Ù… Ø§Ù„Ø¬ÙˆØ§Ù„ Ø§Ù„Ø¬Ø¯ÙŠØ¯ Ø§Ù„Ø°ÙŠ ØªØ±ØºØ¨ ÙÙŠ Ø¥Ø¶Ø§ÙØªÙ‡ Ø¨Ø¯Ù„Ø§Ù‹ Ù…Ù† Ø±Ù‚Ù… Ø§Ù„Ø¬ÙˆØ§Ù„ Ø§Ù„Ù‚Ø¯ÙŠÙ….'
            : 'Enter the new mobile number to replace the old one.'}
        </p>
        {phoneField(
          newPhoneLocal,
          setNewPhoneLocal,
          newCountryCode,
          setNewCountryCode,
          isAr ? 'Ø±Ù‚Ù… Ø§Ù„Ø¬ÙˆØ§Ù„ Ø§Ù„Ø¬Ø¯ÙŠØ¯' : 'New mobile number',
        )}
        {primaryBtn(isAr ? 'Ø¥Ø±Ø³Ø§Ù„ Ø§Ù„Ø±Ù…Ø²' : 'Send code', runCase1NewPhoneOtp)}
      </div>,
    );
  } else if (step === 'case2-email') {
    body = contentShell(
      <div className="space-y-4">
        <p className="text-white/60 text-sm text-center">
          {isAr
            ? 'Ø£Ø¯Ø®Ù„ Ø§Ù„Ø¨Ø±ÙŠØ¯ Ø§Ù„Ø¥Ù„ÙƒØªØ±ÙˆÙ†ÙŠ Ø§Ù„Ù‚Ø¯ÙŠÙ…. Ø³Ù†Ø±Ø³Ù„ Ø±Ù…Ø² Ø§Ù„ØªØ­Ù‚Ù‚ Ø¥Ù„Ù‰ Ø§Ù„Ø¬ÙˆØ§Ù„ Ø§Ù„Ù…Ø³Ø¬Ù‘Ù„.'
            : 'Enter the old email. We will send a code to the registered phone.'}
        </p>
        <label className="text-xs text-white/50">{isAr ? 'Ø§Ù„Ø¨Ø±ÙŠØ¯ Ø§Ù„Ø¥Ù„ÙƒØªØ±ÙˆÙ†ÙŠ Ø§Ù„Ù‚Ø¯ÙŠÙ…' : 'Old email'}</label>
        <input
          type="email"
          value={oldEmail}
          onChange={(e) => setOldEmail(e.target.value)}
          className="w-full min-w-0 bg-white/5 border border-white/10 rounded-xl px-3 py-3.5 text-white text-sm sm:text-base outline-none focus:border-gold-500"
        />
        {primaryBtn(isAr ? 'Ø¥Ø±Ø³Ø§Ù„ Ø§Ù„Ø±Ù…Ø²' : 'Send code', runCase2Start)}
      </div>,
    );
  } else if (step === 'case2-verified') {
    body = contentShell(
      <div className="space-y-4 text-center">
        <CheckCircle2 className="mx-auto text-emerald-400" size={36} />
        <p className="text-white font-bold">
          {isAr ? 'ØªÙ… Ø§Ù„ØªØ­Ù‚Ù‚ Ù…Ù† Ù‡ÙˆÙŠØªÙƒ Ø¨Ù†Ø¬Ø§Ø­.' : 'Identity verified successfully.'}
        </p>
        {primaryBtn(isAr ? 'Ù…ØªØ§Ø¨Ø¹Ø©' : 'Continue', () => setStep('case2-new-email'))}
      </div>,
    );
  } else if (step === 'case2-new-email') {
    body = contentShell(
      <div className="space-y-4">
        <p className="text-white/60 text-sm text-center">
          {isAr
            ? 'Ø£Ø¯Ø®Ù„ Ø§Ù„Ø¨Ø±ÙŠØ¯ Ø§Ù„Ø¥Ù„ÙƒØªØ±ÙˆÙ†ÙŠ Ø§Ù„Ø¬Ø¯ÙŠØ¯ Ø§Ù„Ø°ÙŠ ØªØ±ØºØ¨ ÙÙŠ Ø¥Ø¶Ø§ÙØªÙ‡ Ø¨Ø¯Ù„Ø§Ù‹ Ù…Ù† Ø§Ù„Ø¨Ø±ÙŠØ¯ Ø§Ù„Ø¥Ù„ÙƒØªØ±ÙˆÙ†ÙŠ Ø§Ù„Ù‚Ø¯ÙŠÙ….'
            : 'Enter the new email you want to add instead of the old email.'}
        </p>
        <input
          type="email"
          value={newEmail}
          onChange={(e) => setNewEmail(e.target.value)}
          className="w-full min-w-0 bg-white/5 border border-white/10 rounded-xl px-3 py-3.5 text-white text-sm sm:text-base outline-none focus:border-gold-500"
          placeholder="name@example.com"
        />
        {primaryBtn(isAr ? 'Ø¥Ø±Ø³Ø§Ù„ Ø§Ù„Ø±Ù…Ø²' : 'Send code', runCase2NewEmailOtp)}
      </div>,
    );
  } else if (step === 'case3-ids') {
    body = contentShell(
      <div className="space-y-4">
        <div className="bg-orange-500/10 border border-orange-500/30 text-orange-200 text-sm rounded-xl p-3">
          {isAr
            ? 'Ù‡Ø°Ù‡ Ø¹Ù…Ù„ÙŠØ© Ø¹Ø§Ù„ÙŠØ© Ø§Ù„Ø®Ø·ÙˆØ±Ø©. Ø³ÙŠØªÙ… Ù…Ø±Ø§Ø¬Ø¹Ø© Ø§Ù„Ø·Ù„Ø¨ Ù…Ù† Ø§Ù„Ø¥Ø¯Ø§Ø±Ø© ÙˆØªØ¹Ù„ÙŠÙ‚ Ø§Ù„Ø³Ø­Ø¨ Ù…Ø¤Ù‚ØªØ§Ù‹.'
            : 'This is a high-risk process. Admin will review and withdrawals will be paused.'}
        </div>
        {phoneField(
          oldPhoneLocal,
          setOldPhoneLocal,
          countryCode,
          setCountryCode,
          isAr ? 'Ø±Ù‚Ù… Ø§Ù„Ø¬ÙˆØ§Ù„ Ø§Ù„Ù…Ø³Ø¬Ù‘Ù„ (Ø§Ù„Ù…Ø¯Ù‘Ø¹Ù‰)' : 'Registered phone (claimed)',
        )}
        <input
          type="email"
          value={oldEmail}
          onChange={(e) => setOldEmail(e.target.value)}
          placeholder={isAr ? 'Ø§Ù„Ø¨Ø±ÙŠØ¯ Ø§Ù„Ù…Ø³Ø¬Ù‘Ù„' : 'Registered email'}
          className="w-full min-w-0 bg-white/5 border border-white/10 rounded-xl px-3 py-3.5 text-white text-sm sm:text-base outline-none focus:border-gold-500"
        />
        {primaryBtn(isAr ? 'Ø¥Ø±Ø³Ø§Ù„ Ø·Ù„Ø¨ Ø§Ù„Ù…Ø±Ø§Ø¬Ø¹Ø©' : 'Submit for review', runCase3Submit)}
        <button
          type="button"
          className="w-full text-sm text-gold-400 underline"
          onClick={() => setStep('case3-resume')}
        >
          {isAr ? 'Ù„Ø¯ÙŠ Ø±Ù…Ø² Ø§Ø³ØªÙƒÙ…Ø§Ù„ Ù…Ù† Ø§Ù„Ø¥Ø¯Ø§Ø±Ø©' : 'I have a resume token from admin'}
        </button>
      </div>,
    );
  } else if (step === 'case3-pending') {
    body = contentShell(
      <div className="space-y-4 text-center">
        <ShieldCheck className="mx-auto text-gold-400" size={36} />
        <p className="text-white font-bold">
          {isAr ? 'ØªÙ… Ø¥Ø±Ø³Ø§Ù„ Ø·Ù„Ø¨Ùƒ Ù„Ù„Ù…Ø±Ø§Ø¬Ø¹Ø©' : 'Your request was submitted for review'}
        </p>
        <p className="text-white/50 text-sm">
          {isAr
            ? 'Ø³ÙŠØªÙ… Ø¥Ø´Ø¹Ø§Ø± Ø§Ù„Ø¥Ø¯Ø§Ø±Ø©. Ø¹Ù…Ù„ÙŠØ§Øª Ø§Ù„Ø³Ø­Ø¨ Ù…Ø¹Ù„Ù‘Ù‚Ø© Ø­ØªÙ‰ Ø§Ù†ØªÙ‡Ø§Ø¡ Ø§Ù„Ù…Ø±Ø§Ø¬Ø¹Ø©.'
            : 'Admins were notified. Withdrawals are paused until review completes.'}
        </p>
        {primaryBtn(isAr ? 'Ø§Ù„Ø¹ÙˆØ¯Ø© Ù„ØªØ³Ø¬ÙŠÙ„ Ø§Ù„Ø¯Ø®ÙˆÙ„' : 'Back to login', onBackToLogin)}
        <button
          type="button"
          className="w-full text-sm text-gold-400 underline"
          onClick={() => setStep('case3-resume')}
        >
          {isAr ? 'Ù„Ø¯ÙŠ Ø±Ù…Ø² Ø§Ø³ØªÙƒÙ…Ø§Ù„ Ø¨Ø¹Ø¯ Ø§Ù„Ù…ÙˆØ§ÙÙ‚Ø©' : 'I have a resume token after approval'}
        </button>
      </div>,
    );
  } else if (step === 'case3-resume') {
    body = contentShell(
      <div className="space-y-4">
        <label className="text-xs text-white/50">
          {isAr ? 'Ø±Ù…Ø² Ø§Ù„Ø§Ø³ØªÙƒÙ…Ø§Ù„ Ù…Ù† Ø§Ù„Ø¥Ø¯Ø§Ø±Ø©' : 'Resume token from admin'}
        </label>
        <input
          value={resumeToken}
          onChange={(e) => setResumeToken(e.target.value.trim())}
          className="w-full min-w-0 bg-white/5 border border-white/10 rounded-xl px-3 py-3.5 text-white text-xs sm:text-sm font-mono outline-none focus:border-gold-500 break-all"
        />
        {primaryBtn(isAr ? 'Ù…ØªØ§Ø¨Ø¹Ø©' : 'Continue', () => {
          if (resumeToken.length < 32) {
            triggerError(isAr ? 'Ø±Ù…Ø² ØºÙŠØ± ØµØ§Ù„Ø­' : 'Invalid token');
            return;
          }
          setStep('case3-new-contacts');
        })}
      </div>,
    );
  } else if (step === 'case3-new-contacts') {
    body = contentShell(
      <div className="space-y-4">
        {phoneField(
          newPhoneLocal,
          setNewPhoneLocal,
          newCountryCode,
          setNewCountryCode,
          isAr ? 'Ø±Ù‚Ù… Ø§Ù„Ø¬ÙˆØ§Ù„ Ø§Ù„Ø¬Ø¯ÙŠØ¯' : 'New mobile',
        )}
        <input
          type="email"
          value={newEmail}
          onChange={(e) => setNewEmail(e.target.value)}
          placeholder={isAr ? 'Ø§Ù„Ø¨Ø±ÙŠØ¯ Ø§Ù„Ø¬Ø¯ÙŠØ¯' : 'New email'}
          className="w-full min-w-0 bg-white/5 border border-white/10 rounded-xl px-3 py-3.5 text-white text-sm sm:text-base outline-none focus:border-gold-500"
        />
        {primaryBtn(isAr ? 'Ø¥Ø±Ø³Ø§Ù„ Ø±Ù…ÙˆØ² Ø§Ù„ØªØ­Ù‚Ù‚' : 'Send verification codes', runCase3RequestOtps)}
      </div>,
    );
  } else if (step === 'case3-otps') {
    body = contentShell(
      <div className="space-y-5">
        <div>
          <p className="text-xs text-white/50 mb-2 text-center">
            {isAr ? 'Ø±Ù…Ø² ÙˆØ§ØªØ³Ø§Ø¨ Ù„Ù„Ø¬ÙˆØ§Ù„ Ø§Ù„Ø¬Ø¯ÙŠØ¯' : 'WhatsApp OTP for new phone'}
          </p>
          {renderOtpRow(phoneOtpDigits, setPhoneOtpDigits)}
        </div>
        <div>
          <p className="text-xs text-white/50 mb-2 text-center">
            {isAr ? 'Ø±Ù…Ø² Ø§Ù„Ø¥ÙŠÙ…ÙŠÙ„ Ø§Ù„Ø¬Ø¯ÙŠØ¯' : 'Email OTP for new email'}
          </p>
          {renderOtpRow(emailOtpDigits, setEmailOtpDigits)}
        </div>
        <p className="text-center text-xs text-white/40">
          {secondsLeft > 0
            ? `${isAr ? 'ÙŠÙ†ØªÙ‡ÙŠ Ø®Ù„Ø§Ù„' : 'Expires in'} ${formatOtpCountdown(secondsLeft)}`
            : ''}
        </p>
        {secondsLeft <= 0 && (
          <button
            type="button"
            disabled={isLoading}
            onClick={runCase3RequestOtps}
            className="w-full text-sm text-gold-400 hover:text-gold-300 py-2 font-medium"
          >
            {isAr ? 'Ø¥Ø¹Ø§Ø¯Ø© Ø¥Ø±Ø³Ø§Ù„ Ø§Ù„Ø±Ù…ÙˆØ²' : 'Resend codes'}
          </button>
        )}
        {primaryBtn(isAr ? 'ØªØ£ÙƒÙŠØ¯ Ø§Ù„ØªØ­Ø¯ÙŠØ«' : 'Confirm update', runCase3Complete)}
      </div>,
    );
  } else if (step === 'done') {
    body = contentShell(
      <div className="space-y-4 text-center">
        <CheckCircle2 className="mx-auto text-emerald-400" size={40} />
        <p className="text-white font-bold text-lg">{doneMessage}</p>
        {primaryBtn(isAr ? 'ØªØ³Ø¬ÙŠÙ„ Ø§Ù„Ø¯Ø®ÙˆÙ„' : 'Sign in', onBackToLogin)}
      </div>,
    );
  }

  return (
    <div className="w-full max-w-full overflow-x-hidden">
      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.18 }}
          className="w-full min-w-0"
        >
          {body}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

export default AccountRecoveryWizard;

