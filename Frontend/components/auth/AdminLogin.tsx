import React, { useState } from 'react';
import { ShieldAlert, Lock, Mail } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { OTPVerification } from './OTPVerification';
import { OTPMethodSelection } from './OTPMethodSelection';
import { useAdminStore } from '../../stores/useAdminStore';
import { authApi } from '@/services/api/auth';
import { formatApiErrorMessage } from '../../utils/formatApiErrorMessage';
import { otpSecondsFromMinutes } from '../../utils/otpConfig';

interface AdminLoginProps {
  onLoginSuccess: () => void;
}

export const AdminLogin: React.FC<AdminLoginProps> = ({ onLoginSuccess }) => {
  const { t, language } = useLanguage();
  const { loginAdmin } = useAdminStore();

  const [otpStep, setOtpStep] = useState<'none' | 'method' | 'verify'>('none');
  const [otpMethod, setOtpMethod] = useState<'email' | 'whatsapp'>('whatsapp');

  const [email, setEmail] = useState('');
  const [userName, setUserName] = useState('');
  const [userPhone, setUserPhone] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [credentialsError, setCredentialsError] = useState<string | null>(null);
  const [methodError, setMethodError] = useState<string | null>(null);
  const [fingerprint, setFingerprint] = useState<string | null>(null);
  const [loginData, setLoginData] = useState<any>(null);
  const [otpExpiresInSeconds, setOtpExpiresInSeconds] = useState<number | undefined>();

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

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setCredentialsError(null);

    try {
      const data = await authApi.login(email, password, fingerprint || undefined);

      const role = data.user?.role;
      if (role === 'ADMIN' || role === 'SUPER_ADMIN' || role === 'SUPPORT' || role === 'VERIFICATION_OFFICER') {
        setUserName(data.user.name || 'Admin');
        setUserPhone(data.user.phone || '');
        setLoginData(data);
        setMethodError(null);
        setOtpStep('method');
      } else {
        setCredentialsError(t.auth.errors?.accessDenied || 'Access Denied');
      }
    } catch (err: unknown) {
      console.error('Admin Login Failed', err);
      setCredentialsError(
        formatApiErrorMessage(
          err,
          t.auth.errors?.invalidCredentials || 'Invalid Admin Credentials',
        ),
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleMethodSelect = async (method: 'email' | 'whatsapp') => {
    setOtpMethod(method);
    setMethodError(null);
    setIsSendingOtp(true);
    try {
      const otpResult = await authApi.sendOTP(email, method);
      if (!otpResult?.success) {
        throw new Error(
          language === 'ar' ? 'تعذّر إرسال رمز التحقق' : 'Failed to send verification code',
        );
      }
      setOtpExpiresInSeconds(otpSecondsFromMinutes(otpResult?.expiresInMinutes));
      setOtpStep('verify');
    } catch (err: unknown) {
      setMethodError(
        formatApiErrorMessage(
          err,
          language === 'ar' ? 'تعذّر إرسال رمز التحقق' : 'Failed to send verification code',
        ),
      );
    } finally {
      setIsSendingOtp(false);
    }
  };

  const handleVerifyOTP = async (code: string) => {
    await authApi.verifyOTP(email, code, otpMethod);

    if (!loginData?.user?.id || !loginData.user.role) {
      throw new Error(
        language === 'ar'
          ? 'انتهت جلسة الدخول. أعد إدخال البريد وكلمة المرور.'
          : 'Login session expired. Please sign in again.',
      );
    }

    localStorage.setItem('access_token', loginData.access_token);
    loginAdmin(loginData.user, loginData.permissions);
    onLoginSuccess();
  };

  if (otpStep === 'method') {
    return (
      <OTPMethodSelection
        email={email}
        name={userName}
        isLoading={isSendingOtp}
        error={methodError}
        onSelect={handleMethodSelect}
      />
    );
  }

  if (otpStep === 'verify') {
    return (
      <OTPVerification
        email={email}
        phone={userPhone}
        method={otpMethod}
        expiresInSeconds={otpExpiresInSeconds}
        onVerify={handleVerifyOTP}
        onResend={async () => {
          const result = await authApi.sendOTP(email, otpMethod);
          return { expiresInMinutes: result?.expiresInMinutes };
        }}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <div className="w-16 h-16 mx-auto bg-red-500/10 rounded-full flex items-center justify-center mb-4 border border-red-500/20 shadow-[0_0_30px_rgba(239,68,68,0.2)]">
          <ShieldAlert className="w-8 h-8 text-red-500" />
        </div>
        <h2 className="text-xl font-bold text-white uppercase tracking-widest">{t.auth.admin.title}</h2>
        <p className="text-red-400/60 text-xs font-mono mt-2">{t.auth.admin.secure}</p>
      </div>

      <form onSubmit={handleLoginSubmit} className="space-y-4">
        {credentialsError && (
          <div className="bg-red-500/10 border border-red-500/50 text-red-500 p-3 rounded-lg text-sm font-mono text-center">
            {credentialsError}
          </div>
        )}

        <div>
          <label className="block text-xs font-mono text-white/40 mb-2 uppercase">Admin ID / Email</label>
          <div className="relative">
            <Mail className="absolute top-3.5 right-3.5 w-5 h-5 text-white/20 pointer-events-none" />
            <input
              type="email"
              required
              className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-3 pr-10 text-white focus:border-red-500/50 outline-none transition-all font-mono text-sm"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-mono text-white/40 mb-2 uppercase">Secure Key</label>
          <div className="relative">
            <Lock className="absolute top-3.5 right-3.5 w-5 h-5 text-white/20 pointer-events-none" />
            <input
              type="password"
              required
              className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-3 pr-10 text-white focus:border-red-500/50 outline-none transition-all font-mono text-sm"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full py-4 bg-white/5 hover:bg-red-900/20 text-white rounded-lg font-mono text-sm border border-white/10 hover:border-red-500/30 transition-all uppercase tracking-wider disabled:opacity-50"
        >
          {isLoading ? (t.auth.admin.verifying || 'VERIFYING...') : (t.auth.admin.authBtn || 'ACCESS CONTROL PANEL').toUpperCase()}
        </button>
      </form>
    </div>
  );
};
