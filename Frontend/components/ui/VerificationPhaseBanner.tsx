import React from 'react';
import { ShieldCheck, AlertTriangle, Clock } from 'lucide-react';
import { GlassCard } from './GlassCard';
import { useLanguage } from '../../contexts/LanguageContext';

interface VerificationPhaseBannerProps {
  className?: string;
  /** Pass order status for correction-specific copy */
  status?: string;
}

const VERIFICATION_STATUSES = new Set([
  'VERIFICATION',
  'NON_MATCHING',
  'CORRECTION_PERIOD',
  'CORRECTION_SUBMITTED',
]);

export const VerificationPhaseBanner: React.FC<VerificationPhaseBannerProps> = ({
  className = '',
  status,
}) => {
  const { language } = useLanguage();
  const isAr = language === 'ar';
  const s = String(status || '').toUpperCase();
  const isRematch =
    s === 'NON_MATCHING' || s === 'CORRECTION_PERIOD' || s === 'CORRECTION_SUBMITTED';

  if (isRematch) {
    const submitted = s === 'CORRECTION_SUBMITTED';
    return (
      <GlassCard
        className={`flex items-start gap-3 p-4 bg-orange-500/10 border-orange-500/25 ${className}`}
      >
        {submitted ? (
          <Clock className="text-orange-400 shrink-0 mt-0.5" size={20} />
        ) : (
          <AlertTriangle className="text-orange-400 shrink-0 mt-0.5" size={20} />
        )}
        <p className="text-sm text-orange-100/90 leading-relaxed">
          {submitted
            ? (isAr
                ? 'تم إرسال التصحيح وهو قيد مراجعة الإدارة قبل الشحن.'
                : 'Correction was submitted and is awaiting admin review before shipping.')
            : (isAr
                ? 'القطعة غير مطابقة — التاجر في فترة إعادة المطابقة والتصحيح قبل الشحن.'
                : 'Part did not match — the merchant is in the re-matching / correction window before shipping.')}
        </p>
      </GlassCard>
    );
  }

  return (
    <GlassCard
      className={`flex items-start gap-3 p-4 bg-amber-500/10 border-amber-500/20 ${className}`}
    >
      <ShieldCheck className="text-amber-400 shrink-0 mt-0.5" size={20} />
      <p className="text-sm text-amber-100/90 leading-relaxed">
        {isAr
          ? 'في هذه المرحلة يتم فحص القطعة ومطابقتها مع طلبك قبل الشحن.'
          : 'At this stage, the part is inspected and matched to your order before shipping.'}
      </p>
    </GlassCard>
  );
};

export function shouldShowVerificationBanner(status?: string): boolean {
  return VERIFICATION_STATUSES.has(String(status || '').toUpperCase());
}
