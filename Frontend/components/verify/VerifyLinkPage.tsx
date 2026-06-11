import React, { useEffect, useState, useCallback } from 'react';
import { ShieldCheck, AlertTriangle, Loader2 } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { verificationTasksApi } from '@/services/api/verificationTasks';
import { getCurrentUser } from '../../utils/auth';
import { AdminLogin } from '../auth/AdminLogin';
import { VerificationSessionCountdown } from '../dashboard/admin/verification/VerificationSessionCountdown';

interface VerifyLinkPageProps {
  token: string;
  onNavigateToTask: (taskId: string) => void;
  onNavigateLogin: () => void;
}

interface LinkMeta {
  taskId: string;
  orderNumber?: string;
  expiresAt?: string;
  sessionDeadline?: string;
}

function PageShell({ children, wide }: { children: React.ReactNode; wide?: boolean }) {
  return (
    <div className="min-h-screen bg-[#0d0c0a] flex items-center justify-center p-4">
      <div
        className={`w-full ${wide ? 'max-w-md' : 'max-w-sm'} bg-[#1A1814]/90 border border-gold-500/20 rounded-2xl p-8 text-center shadow-2xl`}
      >
        {children}
      </div>
    </div>
  );
}

export const VerifyLinkPage: React.FC<VerifyLinkPageProps> = ({
  token,
  onNavigateToTask,
  onNavigateLogin,
}) => {
  const { language } = useLanguage();
  const isAr = language === 'ar';

  const [loading, setLoading] = useState(true);
  const [activating, setActivating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [linkExpired, setLinkExpired] = useState(false);
  const [linkInfo, setLinkInfo] = useState<LinkMeta | null>(null);
  const [needsLogin, setNeedsLogin] = useState(false);

  const deadline = linkInfo?.sessionDeadline ?? linkInfo?.expiresAt;

  const activate = useCallback(async () => {
    if (linkExpired) return;

    const user = getCurrentUser();
    if (!user || user.role !== 'VERIFICATION_OFFICER') {
      setNeedsLogin(true);
      return;
    }
    try {
      setActivating(true);
      setError(null);
      const deviceInfo = {
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        language: navigator.language,
      };
      let lat: number | undefined;
      let lng: number | undefined;
      if (navigator.geolocation) {
        try {
          const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 8000 });
          });
          lat = pos.coords.latitude;
          lng = pos.coords.longitude;
        } catch {
          /* optional at link open */
        }
      }
      const { data } = await verificationTasksApi.activateLink(token, { lat, lng, deviceInfo });
      onNavigateToTask(data.taskId);
    } catch (e: any) {
      setError(e?.response?.data?.message || (isAr ? 'تعذر تفعيل الرابط' : 'Could not activate link'));
    } finally {
      setActivating(false);
    }
  }, [token, isAr, onNavigateToTask, linkExpired]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const { data } = await verificationTasksApi.validatePublicLink(token);
        if (cancelled) return;

        const sessionDeadline = data.sessionDeadline ?? data.expiresAt;
        if (sessionDeadline && new Date(sessionDeadline).getTime() <= Date.now()) {
          setLinkExpired(true);
        }

        setLinkInfo({
          taskId: data.taskId,
          orderNumber: data.orderNumber,
          expiresAt: data.expiresAt,
          sessionDeadline,
        });

        const user = getCurrentUser();
        if (!user || user.role !== 'VERIFICATION_OFFICER') setNeedsLogin(true);
      } catch (e: any) {
        if (!cancelled) {
          setError(e?.response?.data?.message || (isAr ? 'رابط غير صالح أو منتهي' : 'Invalid or expired link'));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token, isAr]);

  useEffect(() => {
    if (!loading && linkInfo && !needsLogin && !linkExpired) activate();
  }, [loading, linkInfo, needsLogin, linkExpired, activate]);

  if (loading) {
    return (
      <PageShell>
        <Loader2 className="w-10 h-10 text-gold-500 animate-spin mx-auto" />
        <p className="text-white/60 text-sm mt-4">{isAr ? 'جاري التحقق...' : 'Validating...'}</p>
      </PageShell>
    );
  }

  if (linkExpired) {
    return (
      <PageShell>
        <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-3" />
        <p className="text-red-300 text-sm">
          {isAr ? 'انتهت صلاحية الرابط. اطلب من الإدارة رابطاً جديداً.' : 'This link has expired. Ask admin for a new link.'}
        </p>
      </PageShell>
    );
  }

  if (needsLogin && linkInfo) {
    return (
      <PageShell wide>
        <ShieldCheck className="w-12 h-12 text-gold-500 mx-auto mb-3" />
        <h1 className="text-xl font-bold text-white mb-2">
          {isAr ? 'وصول مهمة مطابقة' : 'Verification task access'}
        </h1>
        {linkInfo.orderNumber && (
          <p className="text-gold-400/80 text-sm font-mono mb-4">#{linkInfo.orderNumber}</p>
        )}
        {deadline && (
          <VerificationSessionCountdown
            deadline={deadline}
            isAr={isAr}
            onExpired={() => setLinkExpired(true)}
            className="mb-4 justify-center"
          />
        )}
        <p className="text-xs text-white/50 mb-4">
          {isAr ? 'سجّل الدخول ثم أكمل OTP للوصول للمهمة فقط.' : 'Sign in and complete OTP for task access only.'}
        </p>
        <AdminLogin onLoginSuccess={() => setNeedsLogin(false)} />
      </PageShell>
    );
  }

  if (error) {
    return (
      <PageShell>
        <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-3" />
        <p className="text-red-300 text-sm">{error}</p>
        <button
          type="button"
          onClick={onNavigateLogin}
          className="mt-6 px-6 py-2 rounded-xl border border-white/20 text-white text-sm"
        >
          {isAr ? 'تسجيل الدخول' : 'Sign in'}
        </button>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <Loader2 className="w-10 h-10 text-gold-500 animate-spin mx-auto" />
      <p className="text-white/60 text-sm mt-4">
        {activating ? (isAr ? 'تفعيل...' : 'Activating...') : isAr ? 'توجيه...' : 'Redirecting...'}
      </p>
    </PageShell>
  );
};
