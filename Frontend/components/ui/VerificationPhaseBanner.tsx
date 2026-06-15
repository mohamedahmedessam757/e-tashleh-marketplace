import React from 'react';
import { ShieldCheck } from 'lucide-react';
import { GlassCard } from './GlassCard';
import { useLanguage } from '../../contexts/LanguageContext';

interface VerificationPhaseBannerProps {
  className?: string;
}

const VERIFICATION_STATUSES = new Set([
  'VERIFICATION',
  'NON_MATCHING',
  'CORRECTION_PERIOD',
  'CORRECTION_SUBMITTED',
]);

export const VerificationPhaseBanner: React.FC<VerificationPhaseBannerProps> = ({
  className = '',
}) => {
  const { language } = useLanguage();
  const isAr = language === 'ar';

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
