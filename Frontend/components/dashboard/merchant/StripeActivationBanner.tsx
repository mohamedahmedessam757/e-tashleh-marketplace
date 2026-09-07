import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { CreditCard, ShieldAlert, Loader2, ExternalLink } from 'lucide-react';
import { Button } from '../../ui/Button';
import { useLanguage } from '../../../contexts/LanguageContext';
import { useVendorStore } from '../../../stores/useVendorStore';
import { client } from '../../../services/api/client';

interface StripeActivationBannerProps {
  onNavigate?: (path?: string) => void;
  className?: string;
}

export const StripeActivationBanner: React.FC<StripeActivationBannerProps> = ({
  onNavigate,
  className = '',
}) => {
  const { language, t } = useLanguage();
  const isAr = language === 'ar';
  const vendorStatus = useVendorStore((s) => s.vendorStatus);
  const stripeDisabledReason = useVendorStore((s) => s.stripeDisabledReason);
  const stripeRequirementsDue = useVendorStore((s) => s.stripeRequirementsDue);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const showPending = vendorStatus === 'PENDING_STRIPE';
  const showRestricted = vendorStatus === 'STRIPE_RESTRICTED';
  if (!showPending && !showRestricted) return null;

  const alerts = (t as any)?.dashboard?.merchant?.alerts || {};
  const title = showRestricted
    ? (alerts.stripeRestrictedTitle || (isAr ? 'مطلوب إعادة التحقق المالي' : 'Financial re-verification required'))
    : (alerts.stripePendingTitle || (isAr ? 'بانتظار تفعيل الحساب المالي' : 'Awaiting financial account activation'));
  const message = showRestricted
    ? (alerts.stripeRestrictedDesc ||
        (isAr
          ? 'حساب Stripe غير جاهز حاليًا. تم إيقاف تقديم العروض الجديدة فقط — الطلبات الجارية تستمر.'
          : 'Your Stripe account is not ready. New offers are paused — in-progress orders continue.'))
    : (alerts.stripePendingDesc ||
        (isAr
          ? 'وافقت الإدارة على متجرك مبدئيًا. أكمل ربط Stripe Connect لتفعيل تقديم العروض.'
          : 'Admin approved your store preliminarily. Complete Stripe Connect to unlock offers.'));

  const dueHint =
    (stripeRequirementsDue && stripeRequirementsDue.length > 0
      ? stripeRequirementsDue.slice(0, 3).join(', ')
      : stripeDisabledReason) || null;

  const startOnboarding = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await client.post('/stripe/onboarding-link');
      if (data?.url) {
        window.location.href = data.url;
        return;
      }
      setError(isAr ? 'تعذر فتح رابط التحقق المالي' : 'Could not open financial verification link');
    } catch (e: any) {
      setError(
        e?.response?.data?.message ||
          (isAr ? 'فشل إنشاء رابط Stripe' : 'Failed to create Stripe link'),
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`relative overflow-hidden rounded-[28px] border-2 p-4 sm:p-5 md:p-6 shadow-2xl min-w-0 ${
        showRestricted
          ? 'border-red-500/70 bg-gradient-to-r from-red-600/30 via-red-500/15 to-transparent shadow-[0_0_40px_rgba(239,68,68,0.35)]'
          : 'border-amber-500/50 bg-gradient-to-r from-amber-500/20 via-gold-500/10 to-transparent shadow-[0_0_28px_rgba(245,158,11,0.25)]'
      } ${className}`}
    >
      <div className="relative z-10 flex flex-col md:flex-row md:items-center gap-4 md:gap-6">
        <div
          className={`w-14 h-14 shrink-0 rounded-2xl flex items-center justify-center border ${
            showRestricted
              ? 'bg-red-500/15 border-red-500/30 text-red-400'
              : 'bg-amber-500/15 border-amber-500/30 text-amber-400'
          }`}
        >
          {showRestricted ? <ShieldAlert size={28} /> : <CreditCard size={28} />}
        </div>

        <div className="flex-1 min-w-0 space-y-2">
          <h3 className="text-lg sm:text-xl font-black text-white tracking-tight">{title}</h3>
          <p className="text-sm text-white/70 leading-relaxed">{message}</p>
          {dueHint && (
            <p className="text-xs text-white/45 font-mono break-all">
              {isAr ? 'المتطلبات: ' : 'Requirements: '}
              {dueHint}
            </p>
          )}
          {error && <p className="text-xs text-red-400">{error}</p>}
        </div>

        <div className="flex flex-col sm:flex-row gap-2 shrink-0">
          <Button
            onClick={startOnboarding}
            disabled={loading}
            className="min-h-[44px] px-5 bg-gold-500 hover:bg-gold-400 text-black font-bold rounded-xl"
          >
            {loading ? (
              <Loader2 className="animate-spin" size={18} />
            ) : (
              <>
                <ExternalLink size={16} className="me-2" />
                {alerts.stripeCompleteCta ||
                  (isAr ? 'أكمل التحقق المالي' : 'Complete financial verification')}
              </>
            )}
          </Button>
          {onNavigate && (
            <Button
              variant="ghost"
              onClick={() => onNavigate('/dashboard/wallet')}
              className="min-h-[44px] px-4 text-white/70 hover:text-white border border-white/10 rounded-xl"
            >
              {alerts.stripeWalletCta || (isAr ? 'المحفظة' : 'Wallet')}
            </Button>
          )}
        </div>
      </div>
    </motion.div>
  );
};
