import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { CreditCard, ShieldAlert, Loader2, ExternalLink, Clock } from 'lucide-react';
import { Button } from '../../ui/Button';
import { useLanguage } from '../../../contexts/LanguageContext';
import { useVendorStore, merchantCanSubmitOffers } from '../../../stores/useVendorStore';
import { client } from '../../../services/api/client';

interface StripeActivationBannerProps {
  onNavigate?: (path?: string) => void;
  className?: string;
}

type BannerPhase = 'action_required' | 'pending_review' | 'restricted';

function resolveBannerPhase(input: {
  detailsSubmitted: boolean;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  disabledReason: string | null;
  currentlyDue: string[];
}): BannerPhase {
  const due = input.currentlyDue || [];
  const ready =
    input.chargesEnabled &&
    input.payoutsEnabled &&
    !input.disabledReason &&
    due.length === 0;
  if (ready) return 'action_required'; // banner should be hidden by parent when ready
  if (input.disabledReason && due.length > 0) return 'restricted';
  if (input.detailsSubmitted && due.length === 0) return 'pending_review';
  if (input.disabledReason) return 'restricted';
  return 'action_required';
}

export const StripeActivationBanner: React.FC<StripeActivationBannerProps> = ({
  onNavigate,
  className = '',
}) => {
  const { language, t } = useLanguage();
  const isAr = language === 'ar';
  const vendorStatus = useVendorStore((s) => s.vendorStatus);
  const stripeActivationRequired = useVendorStore((s) => s.stripeActivationRequired);
  const stripeChargesEnabled = useVendorStore((s) => s.stripeChargesEnabled);
  const stripePayoutsEnabled = useVendorStore((s) => s.stripePayoutsEnabled);
  const stripeDetailsSubmitted = useVendorStore((s) => s.stripeDetailsSubmitted);
  const stripeDisabledReason = useVendorStore((s) => s.stripeDisabledReason);
  const stripeRequirementsDue = useVendorStore((s) => s.stripeRequirementsDue);
  const stripeRequirementsPending = useVendorStore((s) => s.stripeRequirementsPending);
  const profile = useVendorStore((s) => s.profile);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentlyDue = Array.isArray(stripeRequirementsDue) ? stripeRequirementsDue : [];
  const pendingVerification = Array.isArray(stripeRequirementsPending)
    ? stripeRequirementsPending
    : [];

  const canOffer = merchantCanSubmitOffers({
    status: vendorStatus,
    stripeActivationRequired,
    stripeChargesEnabled,
    stripePayoutsEnabled,
    stripeDisabledReason,
    stripeRequirementsDue: currentlyDue,
    stripeAccountId: profile?.stripeAccountId,
  });

  const showPending = vendorStatus === 'PENDING_STRIPE';
  const showRestricted =
    vendorStatus === 'STRIPE_RESTRICTED' ||
    (vendorStatus === 'ACTIVE' && stripeActivationRequired && !canOffer);
  if (!showPending && !showRestricted) return null;

  const phase: BannerPhase = showRestricted
    ? currentlyDue.length > 0 || Boolean(stripeDisabledReason)
      ? 'restricted'
      : stripeDetailsSubmitted && currentlyDue.length === 0
        ? 'pending_review'
        : 'restricted'
    : resolveBannerPhase({
        detailsSubmitted: stripeDetailsSubmitted,
        chargesEnabled: stripeChargesEnabled,
        payoutsEnabled: stripePayoutsEnabled,
        disabledReason: stripeDisabledReason,
        currentlyDue,
      });

  const alerts = (t as any)?.dashboard?.merchant?.alerts || {};
  const isPendingReview = phase === 'pending_review';
  const isRestrictedUi = phase === 'restricted';

  const title = isRestrictedUi
    ? alerts.stripeRestrictedTitle || (isAr ? 'مطلوب إعادة التحقق المالي' : 'Financial re-verification required')
    : isPendingReview
      ? alerts.stripeSubmittedTitle ||
        (isAr ? 'تم إرسال البيانات — بانتظار مراجعة Stripe' : 'Details submitted — awaiting Stripe review')
      : alerts.stripePendingTitle ||
        (isAr ? 'بانتظار تفعيل الحساب المالي' : 'Awaiting financial account activation');

  const message = isRestrictedUi
    ? alerts.stripeRestrictedDesc ||
      (isAr
        ? 'حساب Stripe غير جاهز حاليًا. تم إيقاف تقديم العروض الجديدة فقط — الطلبات الجارية تستمر.'
        : 'Your Stripe account is not ready. New offers are paused — in-progress orders continue.')
    : isPendingReview
      ? alerts.stripeSubmittedDesc ||
        (isAr
          ? 'استلمنا بياناتك المالية. Stripe يراجع التوثيق الآن. التفعيل يتم تلقائيًا عند اكتمال الجاهزية — لا حاجة لإعادة التأكيد.'
          : 'We received your financial details. Stripe is reviewing verification. Activation is automatic when ready — no need to re-confirm.')
      : alerts.stripePendingDesc ||
        (isAr
          ? 'وافقت الإدارة على متجرك مبدئيًا. أكمل ربط Stripe Connect لتفعيل تقديم العروض.'
          : 'Admin approved your store preliminarily. Complete Stripe Connect to unlock offers.');

  const dueHint =
    (currentlyDue.length > 0
      ? currentlyDue.slice(0, 3).join(', ')
      : pendingVerification.length > 0
        ? `pending_verification: ${pendingVerification.slice(0, 3).join(', ')}`
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

  const openExpressDashboard = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await client.get('/stripe/dashboard-link');
      if (data?.url) {
        window.location.href = data.url;
        return;
      }
      setError(isAr ? 'تعذر فتح لوحة Stripe' : 'Could not open Stripe dashboard');
    } catch (e: any) {
      setError(
        e?.response?.data?.message ||
          (isAr ? 'فشل فتح لوحة Stripe' : 'Failed to open Stripe dashboard'),
      );
    } finally {
      setLoading(false);
    }
  };

  const borderClass = isRestrictedUi
    ? 'border-red-500/70 bg-gradient-to-r from-red-600/30 via-red-500/15 to-transparent shadow-[0_0_40px_rgba(239,68,68,0.35)]'
    : isPendingReview
      ? 'border-sky-500/50 bg-gradient-to-r from-sky-500/20 via-cyan-500/10 to-transparent shadow-[0_0_28px_rgba(14,165,233,0.25)]'
      : 'border-amber-500/50 bg-gradient-to-r from-amber-500/20 via-gold-500/10 to-transparent shadow-[0_0_28px_rgba(245,158,11,0.25)]';

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`relative overflow-hidden rounded-[28px] border-2 p-4 sm:p-5 md:p-6 shadow-2xl min-w-0 ${borderClass} ${className}`}
    >
      <div className="relative z-10 flex flex-col md:flex-row md:items-center gap-4 md:gap-6">
        <div
          className={`w-14 h-14 shrink-0 rounded-2xl flex items-center justify-center border ${
            isRestrictedUi
              ? 'bg-red-500/15 border-red-500/30 text-red-400'
              : isPendingReview
                ? 'bg-sky-500/15 border-sky-500/30 text-sky-400'
                : 'bg-amber-500/15 border-amber-500/30 text-amber-400'
          }`}
        >
          {isRestrictedUi ? <ShieldAlert size={28} /> : isPendingReview ? <Clock size={28} /> : <CreditCard size={28} />}
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
          {isPendingReview ? (
            <Button
              onClick={openExpressDashboard}
              disabled={loading}
              className="min-h-[44px] px-5 bg-sky-500 hover:bg-sky-400 text-black font-bold rounded-xl"
            >
              {loading ? (
                <Loader2 className="animate-spin" size={18} />
              ) : (
                <>
                  <ExternalLink size={16} className="me-2" />
                  {alerts.stripeSubmittedCta ||
                    (isAr ? 'عرض حالة الحساب' : 'View account status')}
                </>
              )}
            </Button>
          ) : (
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
          )}
          {onNavigate && (
            <Button
              variant="ghost"
              onClick={() => onNavigate('wallet')}
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
