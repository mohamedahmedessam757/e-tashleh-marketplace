import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, CalendarClock, FileWarning, ShieldAlert } from 'lucide-react';
import { Button } from '../../ui/Button';
import { useLanguage } from '../../../contexts/LanguageContext';
import { useVendorStore } from '../../../stores/useVendorStore';
import {
  daysUntilLicenseExpiry,
  parseLicenseDate,
  resolveMerchantLicenseExpiry,
} from '../../../utils/licenseExpiry';

const WARN_DAYS = 30;

interface LicenseExpiryBannerProps {
  /** Navigate to profile/docs, or open the renew flow on the current page. */
  onNavigate?: (path?: string) => void;
  className?: string;
}

export const LicenseExpiryBanner: React.FC<LicenseExpiryBannerProps> = ({
  onNavigate,
  className = '',
}) => {
  const { language, t } = useLanguage();
  const isAr = language === 'ar';
  const { documents, contractAcceptance, vendorStatus } = useVendorStore();

  const info = useMemo(() => {
    const raw = resolveMerchantLicenseExpiry(documents, contractAcceptance);
    const expiry = parseLicenseDate(raw);
    if (!expiry) return null;

    const diffDays = daysUntilLicenseExpiry(expiry);
    const expired = diffDays <= 0 || vendorStatus === 'LICENSE_EXPIRED';
    if (!expired && diffDays > WARN_DAYS) return null;

    const formatted = expiry.toLocaleDateString(isAr ? 'ar-EG' : 'en-GB', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    return { expired, diffDays, formatted };
  }, [documents, contractAcceptance, vendorStatus, isAr]);

  if (!info) return null;

  const { expired, diffDays, formatted } = info;
  const Icon = expired ? ShieldAlert : AlertTriangle;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`relative overflow-hidden rounded-[28px] border-2 p-5 md:p-6 shadow-2xl ${
        expired
          ? 'border-red-500/40 bg-gradient-to-r from-red-500/20 via-red-500/10 to-transparent shadow-red-500/10'
          : 'border-amber-500/40 bg-gradient-to-r from-amber-500/15 via-gold-500/10 to-transparent shadow-amber-500/10'
      } ${className}`}
    >
      <div
        className={`pointer-events-none absolute -top-16 ${isAr ? '-left-10' : '-right-10'} h-40 w-40 rounded-full blur-3xl ${
          expired ? 'bg-red-500/20' : 'bg-amber-500/20'
        }`}
      />

      <div className="relative z-10 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-start gap-4">
          <div
            className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl ${
              expired ? 'bg-red-500 text-white' : 'bg-gold-500 text-black'
            }`}
          >
            <Icon size={24} strokeWidth={2.5} />
          </div>
          <div>
            <p
              className={`mb-1 text-[10px] font-black uppercase tracking-[0.25em] ${
                expired ? 'text-red-400' : 'text-gold-400'
              }`}
            >
              {expired
                ? isAr
                  ? 'عاجل — الرخصة منتهية'
                  : 'URGENT — LICENSE EXPIRED'
                : isAr
                  ? 'تنبيه — اقتراب انتهاء الرخصة'
                  : 'NOTICE — LICENSE EXPIRING SOON'}
            </p>
            <h3 className="mb-1 text-lg font-black text-white">
              {expired
                ? t.dashboard.merchant.alerts.licenseExpired
                : t.dashboard.merchant.alerts.licenseExpiring}
            </h3>
            <p className="max-w-xl text-sm font-bold leading-relaxed text-white/60">
              {isAr ? (
                expired ? (
                  <>
                    تاريخ انتهاء الرخصة: <span className="text-white">{formatted}</span>.
                    يرجى تجديد الرخصة ورفع المستند المحدّث لاستعادة استقبال الطلبات.
                  </>
                ) : (
                  <>
                    تنتهي رخصتك التجارية في <span className="text-gold-300">{formatted}</span>
                    {' '}(متبقي {diffDays} {t.common.days}). جدّد الرخصة مبكراً لتجنب إيقاف الحساب.
                  </>
                )
              ) : expired ? (
                <>
                  License expiry date: <span className="text-white">{formatted}</span>.
                  Please renew and upload the updated document to restore new orders.
                </>
              ) : (
                <>
                  Your commercial license expires on{' '}
                  <span className="text-gold-300">{formatted}</span> ({diffDays} {t.common.days} left).
                  Renew early to avoid account restriction.
                </>
              )}
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-3 text-[11px] font-bold text-white/40">
              <span className="inline-flex items-center gap-1.5">
                <CalendarClock size={13} />
                {formatted}
              </span>
              {!expired && (
                <span className="inline-flex items-center gap-1.5 text-amber-400/80">
                  <FileWarning size={13} />
                  {isAr ? `${diffDays} يوم متبقي` : `${diffDays} days remaining`}
                </span>
              )}
            </div>
          </div>
        </div>

        {onNavigate && (
          <Button
            onClick={() => onNavigate('profile')}
            type="button"
            className={`h-12 shrink-0 rounded-2xl px-7 text-[11px] font-black uppercase tracking-widest ${
              expired
                ? 'bg-red-500 text-white hover:bg-red-400'
                : 'bg-gold-500 text-black hover:bg-gold-400'
            }`}
          >
            {t.dashboard.merchant.alerts.updateLicense}
          </Button>
        )}
      </div>
    </motion.div>
  );
};
