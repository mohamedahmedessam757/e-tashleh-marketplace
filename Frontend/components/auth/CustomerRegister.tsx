import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Mail, Phone, Loader2, AlertCircle, CheckSquare, Square, ArrowRight } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { authApi } from '@/services/api/auth';
import { OTPMethodSelection } from './OTPMethodSelection';
import { OTPVerification } from './OTPVerification';
import { otpSecondsFromMinutes } from '../../utils/otpConfig';

interface CustomerRegisterProps {
  onLoginClick: () => void;
  onRegisterSuccess: () => void;
  onTermsClick: () => void;
}

// Generate a random secure password since it's passwordless for the user, but required by backend DB constraint
const generateSecurePassword = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+';
  return Array.from({ length: 32 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
};

// UX Enhancement: Red Glow for Validation
interface InputFieldProps {
  icon: any;
  type: string;
  placeholder: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  error?: boolean;
  name?: string;
  dir?: string;
}

const InputField = ({ icon: Icon, type, placeholder, value, onChange, error, dir }: InputFieldProps) => (
  <div className="relative group">
    <Icon className={`absolute top-1/2 -translate-y-1/2 right-4 w-5 h-5 transition-colors pointer-events-none z-10 ${error ? 'text-red-500' : 'text-white/40 group-focus-within:text-gold-500'}`} />
    <input
      type={type}
      required
      dir={dir}
      className={`w-full bg-white/5 border rounded-xl px-4 py-4 pr-12 text-white outline-none transition-all placeholder-white/40
        ${error
          ? 'border-red-500 ring-2 ring-red-500/50 shadow-[0_0_10px_rgba(239,68,68,0.5)] focus:border-red-500 bg-red-500/5'
          : 'border-white/10 focus:border-gold-500'
        }
      `}
      placeholder={placeholder}
      value={value}
      onChange={onChange}
    />
  </div>
);

export const CustomerRegister: React.FC<CustomerRegisterProps> = ({ onLoginClick, onRegisterSuccess, onTermsClick }) => {
  const { t, language } = useLanguage();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
  });

  // Phone State Setup similar to LoginPage
  const [countryCode, setCountryCode] = useState('+966');
  const [phone, setPhone] = useState('');

  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [shake, setShake] = useState(false); // Used for invalid submit animation
  const [errorField, setErrorField] = useState<'email' | 'phone' | 'all' | 'terms' | null>(null);

  const [otpStep, setOtpStep] = useState<'none' | 'method' | 'verify'>('none');
  const [otpMethod, setOtpMethod] = useState<'email' | 'whatsapp'>('whatsapp');
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [otpMethodError, setOtpMethodError] = useState<string | null>(null);
  const [otpExpiresInSeconds, setOtpExpiresInSeconds] = useState<number | undefined>();

  const countries = [
    { code: '+966', name: language === 'ar' ? 'السعودية' : 'Saudi Arabia', flag: '🇸🇦' },
    { code: '+971', name: language === 'ar' ? 'الإمارات' : 'UAE', flag: '🇦🇪' },
    { code: '+973', name: language === 'ar' ? 'البحرين' : 'Bahrain', flag: '🇧🇭' },
    { code: '+974', name: language === 'ar' ? 'قطر' : 'Qatar', flag: '🇶🇦' },
    { code: '+965', name: language === 'ar' ? 'الكويت' : 'Kuwait', flag: '🇰🇼' },
    { code: '+968', name: language === 'ar' ? 'عمان' : 'Oman', flag: '🇴🇲' },
  ];

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.replace(/\D/g, '');
    if (val.length > 9) val = val.slice(0, 9);
    setPhone(val);

    // Immediate Validation Feedback
    if (val.length > 0 && !val.startsWith('5')) {
      setError(t.auth.errors?.invalidPhoneStart || 'Mobile number must start with 5');
      setErrorField('phone');
    } else if (val.length > 0 && val.length < 9) {
      setError(null);
      setErrorField(null);
    } else {
      setError(null);
      setErrorField(null);
    }
  };

  const getFormattedPhone = () => {
    if (!phone) return '';
    let formatted = '';
    if (phone.length > 0) formatted += phone[0];
    if (phone.length > 1) formatted += ' ' + phone.slice(1, 3);
    if (phone.length > 3) formatted += ' ' + phone.slice(3, 5);
    if (phone.length > 5) formatted += ' ' + phone.slice(5, 7);
    if (phone.length > 7) formatted += ' ' + phone.slice(7, 9);
    return formatted;
  };

  const validatePhone = () => {
    if (!phone) return t.auth.errors?.invalidPhone || (language === 'ar' ? 'رقم الجوال مطلوب' : 'Mobile number is required');
    if (!phone.startsWith('5')) return t.auth.errors?.invalidPhoneStart || (language === 'ar' ? 'يجب أن يبدأ رقم الجوال بـ 5' : 'Mobile number must start with 5');
    if (phone.length !== 9) return t.auth.errors?.invalidPhoneLength || (language === 'ar' ? 'يجب أن يتكون رقم الجوال من 9 أرقام' : 'Mobile number must be 9 digits');
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setErrorField(null);

    // Trigger Shake Animation for Visual Feedback
    const triggerError = (msg: string, field: 'email' | 'phone' | 'all' | 'terms') => {
      setError(msg);
      setErrorField(field);
      setShake(true);
      setTimeout(() => setShake(false), 500);
    };

    // Form Local Validation
    if (!formData.name || !formData.email || !phone) {
      triggerError(t.auth.errors?.fillAll || (language === 'ar' ? 'الرجاء تعبئة جميع الحقول المطلوبة' : 'Please fill in all mandatory fields'), 'all');
      return;
    }

    if (!formData.email.includes('@')) {
      triggerError(t.auth.errors?.invalidEmail || (language === 'ar' ? 'صيغة البريد الإلكتروني غير صحيحة' : 'Invalid Email Format'), 'email');
      return;
    }

    const phoneError = validatePhone();
    if (phoneError) {
      triggerError(phoneError, 'phone');
      return;
    }

    if (!agreedToTerms) {
      triggerError(t.auth.register.termsError || (language === 'ar' ? 'يجب الموافقة على الشروط والأحكام' : 'You must agree to the Terms & Conditions'), 'terms');
      return;
    }

    setOtpMethodError(null);
    setOtpStep('method');
  };

  const handleChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, [field]: e.target.value }));
    if (errorField === field || errorField === 'all') {
      setError(null);
      setErrorField(null);
    }
  };

  const handleOtpVerify = async (code: string) => {
    const fullPhone = `${countryCode}${phone}`;

    await authApi.registerVerifyOtp({
      email: formData.email,
      phone: fullPhone,
      channel: otpMethod,
      code,
    });

    try {
      const generatedPassword = generateSecurePassword();
      const selectedCountry = countries.find(c => c.code === countryCode);
      const countryName = selectedCountry ? selectedCountry.name : 'Unknown';
      const pendingReferralCode = sessionStorage.getItem('pending_referral_code') || undefined;

      await authApi.registerCustomer({
        email: formData.email,
        password: generatedPassword,
        name: formData.name,
        phone: fullPhone,
        countryCode: countryCode,
        country: countryName,
        otpChannel: otpMethod,
        ...(pendingReferralCode && { referralCode: pendingReferralCode }),
      });

      sessionStorage.removeItem('pending_referral_code');

      const loginResponse = await authApi.login(formData.email, generatedPassword);
      localStorage.setItem('access_token', loginResponse.access_token);
      if (loginResponse.user) {
        localStorage.setItem('user', JSON.stringify(loginResponse.user));
      }

      onRegisterSuccess();
    } catch (error: unknown) {
      console.error('Registration failed after OTP', error);
      alert(language === 'ar' ? 'حدث خطأ أثناء التسجيل' : 'An error occurred during registration.');
      setOtpStep('none');
      throw error;
    }
  };

  if (otpStep === 'method') {
    return (
      <div className="-mx-2 sm:-mx-4">
        <OTPMethodSelection
          email={formData.email}
          name={formData.name}
          isLoading={isSendingOtp}
          error={otpMethodError}
          onSelect={async (method) => {
            setOtpMethod(method);
            setOtpMethodError(null);
            setIsSendingOtp(true);
            try {
              const fullPhone = `${countryCode}${phone}`;
              const initResult = await authApi.registerInit({
                email: formData.email,
                phone: fullPhone,
                channel: method,
                name: formData.name,
                role: 'customer',
              });
              setOtpExpiresInSeconds(
                otpSecondsFromMinutes(initResult?.expiresInMinutes),
              );
              setOtpStep('verify');
            } catch (err: unknown) {
              const errorMsg =
                (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
                (err instanceof Error ? err.message : '');
              setOtpMethodError(
                errorMsg ||
                  (language === 'ar' ? 'فشل إرسال رمز التحقق' : 'Failed to send verification code'),
              );
            } finally {
              setIsSendingOtp(false);
            }
          }}
        />
      </div>
    );
  }

  if (otpStep === 'verify') {
    return (
      <div className="-mx-2 sm:-mx-4">
        <OTPVerification
          email={formData.email}
          phone={`${countryCode}${phone}`}
          method={otpMethod}
          expiresInSeconds={otpExpiresInSeconds}
          onVerify={handleOtpVerify}
          onResend={async () => {
            const result = await authApi.registerResendOtp({
              email: formData.email,
              phone: `${countryCode}${phone}`,
              channel: otpMethod,
              name: formData.name,
              role: 'customer',
            });
            return { expiresInMinutes: result?.expiresInMinutes };
          }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-white mb-2">{t.auth.register.title}</h2>
        <p className="text-white/60 text-sm">{t.auth.register.subtitle}</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">

        {/* Informational Message For 2FA */}
        <div className="bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 flex items-center justify-center gap-2">
          <p className="text-xs text-white/70 font-medium text-center">
            {language === 'ar'
              ? 'التحقق بخطوتين — اختر إرسال رمز التفعيل إلى بريدك الإلكتروني أو واتساب'
              : '2-Step Verification — choose to receive your code via email or WhatsApp'}
          </p>
          <AlertCircle size={16} className="text-gold-500 flex-shrink-0" />
        </div>

        <InputField
          icon={User}
          type="text"
          placeholder={t.auth.register.name}
          value={formData.name}
          onChange={handleChange('name')}
          error={errorField === 'all'}
        />

        <InputField
          icon={Mail}
          type="email"
          placeholder={t.auth.login.email || (language === 'ar' ? 'البريد الإلكتروني' : 'Email Address')}
          value={formData.email}
          onChange={handleChange('email')}
          error={errorField === 'all' || errorField === 'email'}
          dir="ltr"
        />

        {/* Setup Phone Component Like Login Page */}
        <div>
          <div className="flex gap-2" dir="ltr">
            {/* Country Code Dropdown */}
            <div className="relative w-1/3 min-w-[120px]">
              <select
                value={countryCode}
                onChange={(e) => setCountryCode(e.target.value)}
                className="w-full h-full bg-white/5 border border-white/10 rounded-xl px-3 py-4 text-white appearance-none outline-none focus:border-gold-500 transition-all text-sm cursor-pointer font-sans"
                style={{ direction: 'ltr' }}
              >
                {countries.map((c) => (
                  <option key={c.code} value={c.code} className="bg-[#1A1814] text-white">
                    {c.flag} {c.code}
                  </option>
                ))}
              </select>
              <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-white/50">
                <ArrowRight className="w-4 h-4 rotate-90" />
              </div>
            </div>

            {/* Phone Number Input with Masking */}
            <div className="relative flex-1 group">
              <div className="absolute top-1/2 -translate-y-1/2 left-4 pointer-events-none z-10 transition-colors duration-200">
                <Phone className={`w-5 h-5 transition-colors ${(errorField === 'phone' || errorField === 'all') ? 'text-red-500' : 'text-white/40 group-focus-within:text-gold-500'}`} />
              </div>

              {/* Mask Visualization Overlay - "Typing Animation" */}
              <div
                className="absolute inset-0 pl-12 pr-4 py-4 flex items-center text-lg tracking-wider pointer-events-none select-none font-sans"
                aria-hidden="true"
              >
                <span className="text-transparent">{getFormattedPhone()}</span>
                <span className="text-white/20">
                  {getFormattedPhone().length === 0 ? '5 XX XX XX XX' : '5 XX XX XX XX'.slice(getFormattedPhone().length)}
                </span>
              </div>

              <input
                type="tel"
                required
                className={`w-full bg-white/5 border rounded-xl pl-12 pr-4 py-4 text-white outline-none transition-all placeholder-transparent text-lg tracking-wider text-left z-0 font-sans ${(errorField === 'phone' || errorField === 'all') ? 'border-red-500/50 bg-red-500/5 focus:border-red-500 ring-2 ring-red-500/50 shadow-[0_0_10px_rgba(239,68,68,0.5)]' : 'border-white/10 focus:border-gold-500'} group-focus-within:bg-black/20`}
                placeholder="5 XX XX XX XX"
                value={getFormattedPhone()}
                onChange={handlePhoneChange}
                maxLength={14}
              />
            </div>
          </div>

          {/* Phone Validation Specific Error Like Login Page */}
          {error && errorField === 'phone' && (
            <div className="mt-2 text-xs flex items-center justify-end gap-1 text-red-400 font-bold animate-pulse">
              <AlertCircle size={12} />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* Terms and Conditions Checkbox */}
        <div className={`flex items-start gap-3 px-1 py-3 mt-4 rounded-xl transition-all ${errorField === 'terms' ? 'bg-red-500/10 border border-red-500/50 p-3' : ''}`}>
          <button
            type="button"
            onClick={() => {
              setAgreedToTerms(!agreedToTerms);
              if (errorField === 'terms') {
                setError(null);
                setErrorField(null);
              }
            }}
            className="pt-1 text-gold-500 hover:text-gold-400 transition-colors"
          >
            {agreedToTerms ? <CheckSquare size={20} /> : <Square size={20} className={errorField === 'terms' ? 'text-red-500' : 'text-white/30'} />}
          </button>
          <div className="text-sm text-white/70 leading-relaxed">
            {language === 'ar' ? 'أوافق على ' : 'I agree to the '}
            <button
              type="button"
              onClick={onTermsClick}
              className="text-gold-400 hover:text-gold-300 underline underline-offset-4 decoration-gold-500/30 hover:decoration-gold-500 transition-all font-medium"
            >
              {t.auth.register.termsLink || (language === 'ar' ? 'شروط الخدمة والخصوصية' : 'Terms & Conditions')}
            </button>
            {language === 'ar' ? ' الخاصة بالمنصة.' : '.'}
          </div>
        </div>

        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-2 text-red-400 text-sm justify-center overflow-hidden"
            >
              <AlertCircle size={16} className="flex-shrink-0" />
              <span>{error}</span>
            </motion.div>
          )}
        </AnimatePresence>

        <button
          type="submit"
          disabled={isLoading || (phone.length > 0 && (!phone.startsWith('5') || phone.length !== 9))}
          className={`w-full py-4 mt-2 bg-gradient-to-r from-gold-600 to-gold-400 hover:from-gold-500 hover:to-gold-300 disabled:from-white/10 disabled:to-white/5 disabled:text-white/30 disabled:cursor-not-allowed text-white rounded-xl font-bold text-lg shadow-[0_4px_20px_rgba(168,139,62,0.3)] hover:shadow-[0_6px_25px_rgba(168,139,62,0.4)] transition-all active:scale-[0.98] flex items-center justify-center gap-2 ${shake ? 'animate-[shake_0.5s_ease-in-out]' : ''}`}
        >
          {isLoading ? <Loader2 className="animate-spin" /> : t.auth.register.submit}
        </button>
      </form>

      <div className="text-center pt-6 border-t border-white/5">
        <span className="text-white/50 text-sm">{t.auth.register.hasAccount} </span>
        <button onClick={onLoginClick} className="text-gold-400 font-bold hover:underline ml-1">
          {t.auth.register.login}
        </button>
      </div>
    </div>
  );
};