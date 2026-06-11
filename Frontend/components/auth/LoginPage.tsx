import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { User, Store, Phone, ArrowRight, AlertCircle } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { OTPVerification } from './OTPVerification';
import { OTPMethodSelection } from './OTPMethodSelection';
import { authApi } from '@/services/api/auth';
import { otpSecondsFromMinutes } from '../../utils/otpConfig';
import type { PendingRedirect } from '../../utils/widersDeepLink';

interface LoginPageProps {
  onRegisterClick: () => void;
  onCustomerRegisterClick: () => void;
  onLoginSuccess: (role: 'customer' | 'merchant') => void;
  onForgotPasswordClick?: () => void;
  onRecoveryClick?: (role: 'customer' | 'merchant') => void;
  initialTab?: 'customer' | 'merchant';
  forcedRole?: 'customer' | 'merchant';
  pendingRedirect?: PendingRedirect | null;
  roleMismatch?: boolean;
}

export const LoginPage: React.FC<LoginPageProps> = ({
  onRegisterClick,
  onCustomerRegisterClick,
  onLoginSuccess,
  onForgotPasswordClick,
  onRecoveryClick,
  initialTab = 'customer',
  forcedRole,
  pendingRedirect,
  roleMismatch,
}) => {
  const { t, language } = useLanguage();
  // If forcedRole is provided, use it. Otherwise use initialTab.
  const [activeTab, setActiveTab] = useState<'customer' | 'merchant'>(forcedRole || initialTab);
  const [otpStep, setOtpStep] = useState<'none' | 'method' | 'verify'>('none');
  const [activationMethod, setActivationMethod] = useState<'whatsapp' | 'email'>('whatsapp');
  const [countryCode, setCountryCode] = useState('+966');

  const [phone, setPhone] = useState('');
  const [loginEmail, setLoginEmail] = useState(''); // New state for input
  const [userEmail, setUserEmail] = useState(''); // Used for storage after init
  const [userName, setUserName] = useState('');
  const [maskedPhone, setMaskedPhone] = useState<string | null>(null);
  const [maskedEmail, setMaskedEmail] = useState<string | null>(null);
  const [otpExpiresInSeconds, setOtpExpiresInSeconds] = useState<number | undefined>();

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fingerprint, setFingerprint] = useState<string | null>(null);

  // Load unique device identifier for session deduplication (2026 Best Practice)
  React.useEffect(() => {
    const loadFingerprint = async () => {
      try {
        const { default: FingerprintJS } = await import('@fingerprintjs/fingerprintjs');
        const fp = await FingerprintJS.load();
        const result = await fp.get();
        setFingerprint(result.visitorId);
      } catch (err) {
        console.warn('Failed to load fingerprint:', err);
      }
    };
    loadFingerprint();
  }, []);

  const countries = [
    { code: '+966', name: language === 'ar' ? 'السعودية' : 'Saudi Arabia', flag: '🇸🇦' },
    { code: '+971', name: language === 'ar' ? 'الإمارات' : 'UAE', flag: '🇦🇪' },
    { code: '+973', name: language === 'ar' ? 'البحرين' : 'Bahrain', flag: '🇧🇭' },
    { code: '+974', name: language === 'ar' ? 'قطر' : 'Qatar', flag: '🇶🇦' },
    { code: '+965', name: language === 'ar' ? 'الكويت' : 'Kuwait', flag: '🇰🇼' },
    { code: '+968', name: language === 'ar' ? 'عمان' : 'Oman', flag: '🇴🇲' },
  ];

  // Real-time Phone Validation
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.replace(/\D/g, ''); // Remove non-digits

    // Strict Input Rule: Must start with 5 (if length > 0)
    // If user tries to type something else as first char, we can block it OR show error. 
    // User requested "Show Error", so we allow it but show error? 
    // Actually standard UX is to block if strict, but user asked for "Say it must start with 5".
    // So we allow typing but show error immediately.

    if (val.length > 9) val = val.slice(0, 9); // Limit to 9 digits
    setPhone(val);

    // Immediate Validation Feedback
    if (val.length > 0 && !val.startsWith('5')) {
      setError(t.auth.errors?.invalidPhoneStart || (language === 'ar' ? 'يجب أن يبدأ رقم الجوال بـ 5' : 'Mobile number must start with 5'));
    } else if (val.length > 0 && val.length < 9) {
      // Don't show length error while typing, only if invalid start or on partial
      setError(null);
    } else {
      setError(null);
    }
  };

  const getFormattedPhone = () => {
    if (!phone) return '';
    // Format as 5 XX XX XX XX
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

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    let validationError = null;
    if (activationMethod === 'whatsapp') {
      validationError = validatePhone();
    } else {
      if (!loginEmail) {
        validationError = language === 'ar' ? 'البريد الإلكتروني مطلوب' : 'Email is required';
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(loginEmail)) {
        validationError = language === 'ar' ? 'البريد الإلكتروني غير صحيح' : 'Invalid email address';
      }
    }

    if (validationError) {
      setError(validationError);
      return;
    }

    setIsLoading(true);

    try {
      let data;
      if (activationMethod === 'whatsapp') {
        const fullPhone = `${countryCode}${phone}`;
        data = await authApi.initiateMobileLogin(fullPhone);
      } else {
        data = await authApi.initiateEmailLogin(loginEmail);
        setUserEmail(loginEmail);
        setMaskedEmail(data?.maskedEmail ?? loginEmail);
      }

      setOtpExpiresInSeconds(otpSecondsFromMinutes(data?.expiresInMinutes));

      // Access user data from response with extreme caution
      const user = data?.user;
      
      if (!user) {
        throw new Error(t.auth.errors?.accountNotFound || (language === 'ar' ? 'الحساب غير موجود' : 'Account not found'));
      }

      const backendRole = user.role;

      // 2. Role Verification
      if (activeTab === 'customer' && backendRole !== 'CUSTOMER') {
        throw new Error(t.auth.errors?.wrongAccountType || (language === 'ar' ? 'نوع الحساب غير صحيح' : 'Incorrect account type'));
      }

      if (activeTab === 'merchant' && backendRole !== 'VENDOR') {
        throw new Error(t.auth.errors?.wrongAccountType || (language === 'ar' ? 'نوع الحساب غير صحيح' : 'Incorrect account type'));
      }

      // Store details
      setUserName(user.name || '');
      if (activationMethod === 'whatsapp') {
        setUserEmail(user.email || ''); // Secondary storage if needed
      }
      setOtpStep('verify');

    } catch (err: any) {
      console.error('Login Init Failed', err);
      
      // Handle technical TypeErrors (like undefined role) as readable errors
      if (err instanceof TypeError) {
        setError(t.auth.errors?.loginFailed || (language === 'ar' ? 'فشل الاتصال بالخادم. يرجى المحاولة لاحقاً.' : 'Connection error. Please try again later.'));
      } else if (err.response?.status === 401 || err.response?.status === 404) {
        setError(t.auth.errors?.accountNotFound || (language === 'ar' ? 'الحساب غير موجود' : 'Account not found'));
      } else if (err.message) {
        setError(err.message);
      } else {
        setError(t.auth.errors?.loginFailed || (language === 'ar' ? 'فشل تسجيل الدخول' : 'Login failed'));
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (otpStep === 'verify') {
    return (
      <div className="p-4">
        <OTPVerification
          email={userEmail}
          phone={`${countryCode}${phone}`}
          method={activationMethod}
          expiresInSeconds={otpExpiresInSeconds}
          deliveryHint={
            activationMethod === 'email'
              ? maskedEmail ?? loginEmail ?? userEmail
              : undefined
          }
          onResend={async () => {
            if (activationMethod === 'whatsapp') {
              const result = await authApi.resendMobileLoginOtp(`${countryCode}${phone}`);
              return { expiresInMinutes: result?.expiresInMinutes };
            }
            const result = await authApi.resendEmailLoginOtp(loginEmail || userEmail);
            return { expiresInMinutes: result?.expiresInMinutes };
          }}
          onVerify={async (code) => {
            let response;

            if (activationMethod === 'whatsapp') {
              const fullPhone = `${countryCode}${phone}`;
              response = await authApi.verifyMobileLogin(fullPhone, code, fingerprint || undefined);
            } else {
              response = await authApi.verifyEmailLogin(userEmail, code, fingerprint || undefined);
            }

            localStorage.setItem('access_token', response.access_token);
            if (response.user) {
              localStorage.setItem('user', JSON.stringify(response.user));
            }

            onLoginSuccess(activeTab);
          }}
        />
      </div>
    );
  }

  const redirectLabel = pendingRedirect
    ? (() => {
        const isOrder =
          pendingRedirect.path === 'order-details' || pendingRedirect.path === 'explore-offer';
        const shortId = pendingRedirect.id ? String(pendingRedirect.id).slice(0, 8) : '';
        if (isOrder && shortId) {
          return language === 'ar'
            ? `سجّل الدخول لمتابعة طلبك (${shortId}…)`
            : `Sign in to continue to your order (${shortId}…)`;
        }
        return language === 'ar'
          ? 'سجّل الدخول للوصول إلى الصفحة المطلوبة'
          : 'Sign in to access the requested page';
      })()
    : null;

  return (
    <div className="space-y-6">
      {redirectLabel && (
        <div className="bg-gold-500/10 border border-gold-500/30 text-gold-300 p-4 rounded-xl text-sm text-center">
          {redirectLabel}
        </div>
      )}
      {roleMismatch && (
        <div className="bg-amber-500/10 border border-amber-500/30 text-amber-200 p-4 rounded-xl text-sm text-center flex items-center justify-center gap-2">
          <AlertCircle size={18} />
          {language === 'ar'
            ? 'هذا الرابط مخصّص لنوع حساب آخر. سجّل الدخول بالحساب الصحيح.'
            : 'This link is for a different account type. Please sign in with the correct account.'}
        </div>
      )}
      {/* Tabs - Only show if NO forced role */}
      {!forcedRole && (
        <div className="flex p-1 bg-black/20 rounded-xl">
          <button
            onClick={() => setActiveTab('customer')}
            className={`flex-1 py-2.5 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all ${activeTab === 'customer' ? 'bg-gold-500 text-white shadow-lg' : 'text-white/50 hover:text-white'}`}
          >
            <User size={16} />
            {t.auth.tabs.customer}
          </button>
          <button
            onClick={() => setActiveTab('merchant')}
            className={`flex-1 py-2.5 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all ${activeTab === 'merchant' ? 'bg-gold-500 text-white shadow-lg' : 'text-white/50 hover:text-white'}`}
          >
            <Store size={16} />
            {t.auth.tabs.merchant}
          </button>
        </div>
      )}

      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-white mb-2">
          {forcedRole === 'merchant' ? t.auth.tabs.merchant :
            forcedRole === 'customer' ? t.auth.tabs.customer :
              t.auth.login.title}
        </h2>
        <p className="text-white/60 text-sm">
          {activeTab === 'customer' ? t.auth.login.subtitle : t.auth.login.subtitle}
        </p>
      </div>

      <form onSubmit={handleLoginSubmit} className="space-y-6">
        {error && (
          <div className="bg-red-500/10 border border-red-500/50 text-red-500 p-4 rounded-xl text-sm text-center flex items-center justify-center gap-2">
            <AlertCircle size={18} />
            {error}
          </div>
        )}

        {/* Verification Method Selection */}
        <div className="bg-white/5 rounded-xl p-4 border border-white/10">
          <label className="block text-sm text-gold-200 mb-3 font-medium">
            {t.auth.login.activationMethod}
          </label>
          <div className="space-y-3">
            <label className="flex items-center gap-3 cursor-pointer group">
              <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-all ${activationMethod === 'whatsapp' ? 'border-gold-500 bg-gold-500' : 'border-white/30 group-hover:border-white/50'}`}>
                {activationMethod === 'whatsapp' && <div className="w-2 h-2 bg-black rounded-full" />}
              </div>
              <input
                type="radio"
                name="method"
                value="whatsapp"
                checked={activationMethod === 'whatsapp'}
                onChange={() => setActivationMethod('whatsapp')}
                className="hidden"
              />
              <span className={`text-sm ${activationMethod === 'whatsapp' ? 'text-white' : 'text-white/60 duration-200'}`}>
                {t.auth.login.methods?.whatsapp}
              </span>
            </label>

            <label className="flex items-center gap-3 cursor-pointer group">
              <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-all ${activationMethod === 'email' ? 'border-gold-500 bg-gold-500' : 'border-white/30 group-hover:border-white/50'}`}>
                {activationMethod === 'email' && <div className="w-2 h-2 bg-black rounded-full" />}
              </div>
              <input
                type="radio"
                name="method"
                value="email"
                checked={activationMethod === 'email'}
                onChange={() => setActivationMethod('email')}
                className="hidden"
              />
              <span className={`text-sm ${activationMethod === 'email' ? 'text-white' : 'text-white/60 duration-200'}`}>
                {t.auth.login.methods?.email}
              </span>
            </label>
          </div>
        </div>

        {/* Primary Input - Toggles based on method */}
        {activationMethod === 'whatsapp' ? (
          <div>
            {/* Requirement 4: Full Number Display Above Input */}
            <div className="mb-3 text-center" dir="ltr">
              <label className="text-sm text-gold-200/50 mb-1 block">{t.auth.login.phoneInfo}</label>
              <div className={`text-xl font-mono font-bold tracking-widest ${phone ? 'text-gold-400' : 'text-white/20'}`}>
                {countryCode} {getFormattedPhone() || '5 XX XX XX XX'}
              </div>
            </div>

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
              <div className="relative flex-1">
                <div className="absolute top-1/2 -translate-y-1/2 left-4 pointer-events-none z-10">
                  <Phone className={`w-5 h-5 transition-colors ${error ? 'text-red-500' : 'text-gold-500'}`} />
                </div>

                {/* Mask Visualization Overlay - "Typing Animation" */}
                <div
                  className="absolute inset-0 pl-12 pr-4 py-4 flex items-center text-lg tracking-wider pointer-events-none select-none font-sans"
                  aria-hidden="true"
                >
                  <span className="text-transparent">{getFormattedPhone()}</span>
                  <span className="text-white/10">
                    {'5 XX XX XX XX'.slice(getFormattedPhone().length)}
                  </span>
                </div>

                <input
                  type="tel"
                  required
                  className={`w-full bg-white/5 border rounded-xl pl-12 pr-4 py-4 text-white outline-none transition-all placeholder-transparent text-lg tracking-wider text-center z-0 font-sans ${error ? 'border-red-500/50 focus:border-red-500' : 'border-white/10 focus:border-gold-500'}`}
                  placeholder="5 XX XX XX XX"
                  value={getFormattedPhone()}
                  onChange={handlePhoneChange}
                  maxLength={14}
                />
              </div>
            </div>

            {error && activationMethod === 'whatsapp' && (validationError => {
              if (validationError) return (
                <div className="mt-2 text-xs flex items-center justify-end gap-1 text-red-400 font-bold animate-pulse">
                  <AlertCircle size={12} />
                  <span>{error}</span>
                </div>
              );
            })(validatePhone())}
          </div>
        ) : (
          <div className="animate-in fade-in slide-in-from-top-2 duration-300">
             <div className="mb-3 text-center">
              <label className="text-sm text-gold-200/50 mb-1 block">
                {language === 'ar' ? 'البريد الإلكتروني المسجل' : 'Registered Email Address'}
              </label>
            </div>
            <div className="relative">
              <div className="absolute top-1/2 -translate-y-1/2 left-4 pointer-events-none z-10">
                <AlertCircle className={`w-5 h-5 transition-colors ${error ? 'text-red-500' : 'text-gold-500'}`} />
              </div>
              <input
                type="email"
                required
                className={`w-full bg-white/5 border rounded-xl pl-12 pr-4 py-4 text-white outline-none transition-all text-lg z-0 font-sans text-center ${error ? 'border-red-500/50 focus:border-red-500' : 'border-white/10 focus:border-gold-500'}`}
                placeholder="example@mail.com"
                value={loginEmail}
                onChange={(e) => {
                   setLoginEmail(e.target.value);
                   setError(null);
                }}
              />
            </div>
            {error && activationMethod === 'email' && (
              <div className="mt-2 text-xs flex items-center justify-center gap-1 text-red-400 font-bold animate-pulse">
                <AlertCircle size={12} />
                <span>{error}</span>
              </div>
            )}
          </div>
        )}

        <button
          type="submit"
          disabled={isLoading || (activationMethod === 'whatsapp' ? (phone.length !== 9 || !phone.startsWith('5')) : (!loginEmail || !loginEmail.includes('@')))}
          className="w-full py-4 bg-gradient-to-r from-gold-600 to-gold-400 hover:from-gold-500 hover:to-gold-300 text-white rounded-xl font-bold text-lg shadow-[0_4px_20px_rgba(168,139,62,0.3)] hover:shadow-[0_6px_25px_rgba(168,139,62,0.4)] transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <>
              {t.auth.login.submit}
            </>
          )}
        </button>

        {/* ACCOUNT RECOVERY BUTTON */}
        <div className="flex justify-center mt-4">
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              if (onRecoveryClick) {
                onRecoveryClick(activeTab);
              }
            }}
            className="text-white/40 hover:text-white transition-colors text-sm flex items-center gap-2 py-2 px-4 rounded-full border border-transparent hover:border-white/10 hover:bg-white/5"
          >
            🔒 {language === 'ar' ? 'لا أستطيع الوصول إلى رقم الجوال' : 'I cannot access my phone number'}
          </button>
        </div>
      </form>

      {/* Register Link */}
      <div className="text-center pt-6 border-t border-white/5">
        <span className="text-white/50 text-sm block mb-2">{t.auth.login.noAccount}</span>
        <button
          onClick={activeTab === 'customer' ? onCustomerRegisterClick : onRegisterClick}
          className="text-gold-400 font-bold hover:text-gold-300 transition-colors uppercase tracking-wider text-sm border border-gold-500/30 px-6 py-2 rounded-full hover:bg-gold-500/10"
        >
          {t.auth.login.registerNow}
        </button>
      </div>
    </div>
  );
};
