import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, CalendarClock, ShieldAlert, Timer } from 'lucide-react';
import { Button } from '../../ui/Button';
import { useLanguage } from '../../../contexts/LanguageContext';
import { useVendorStore } from '../../../stores/useVendorStore';
import {
  DOC_EXPIRY_GRACE_DAYS,
  formatRemainingCountdown,
  getDocExpiryAlertLevel,
  getRemainingParts,
  resolveEarliestDocumentExpiry,
} from '../../../utils/licenseExpiry';

interface LicenseExpiryBannerProps {
  /** Navigate to profile/docs, or open the renew flow on the current page. */
  onNavigate?: (path?: string) => void;
  className?: string;
  /** Compact mode for embedding inside profile docs section */
  compact?: boolean;
}

const DOC_LABELS: Record<string, { ar: string; en: string }> = {
  cr: { ar: 'السجل التجاري', en: 'Commercial Register' },
  license: { ar: 'الرخصة التجارية', en: 'Commercial License' },
  id: { ar: 'بطاقة الهوية', en: 'ID Card' },
  iban: { ar: 'شهادة الآيبان', en: 'IBAN Certificate' },
  authLetter: { ar: 'خطاب التفويض', en: 'Authorization Letter' },
  license_fallback: { ar: 'الرخصة التجارية', en: 'Commercial License' },
};

export const LicenseExpiryBanner: React.FC<LicenseExpiryBannerProps> = ({
  onNavigate,
  className = '',
  compact = false,
}) => {
  const { language, t } = useLanguage();
  const isAr = language === 'ar';
  const { documents, contractAcceptance, vendorStatus } = useVendorStore();
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(id);
  }, []);

  const info = useMemo(() => {
    const earliest = resolveEarliestDocumentExpiry(documents, contractAcceptance, now);
    if (!earliest) {
      if (vendorStatus === 'LICENSE_EXPIRED') {
        return {
          level: 'frozen' as const,
          docLabel: isAr ? 'المستندات' : 'Documents',
          formattedExpiry: '—',
          freezeParts: getRemainingParts(now, now),
          expiryParts: getRemainingParts(now, now),
          daysLeft: -DOC_EXPIRY_GRACE_DAYS - 1,
        };
      }
      return null;
    }

    const level = getDocExpiryAlertLevel(earliest.daysLeft, vendorStatus);
    if (level === 'none') return null;

    const labels = DOC_LABELS[earliest.key] || DOC_LABELS.license;
    const formattedExpiry = earliest.expiry.toLocaleDateString(isAr ? 'ar-EG' : 'en-GB', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    return {
      level,
      docLabel: isAr ? labels.ar : labels.en,
      formattedExpiry,
      freezeParts: getRemainingParts(earliest.freezeAt, now),
      expiryParts: getRemainingParts(earliest.expiry, now),
      daysLeft: earliest.daysLeft,
    };
  }, [documents, contractAcceptance, vendorStatus, isAr, now]);

  if (!info) return null;

  const urgent = info.level === 'frozen' || info.level === 'grace' || info.daysLeft <= 7;
  const Icon = info.level === 'frozen' || info.level === 'grace' ? ShieldAlert : AlertTriangle;
  const freezeLabel = formatRemainingCountdown(info.freezeParts, isAr);

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
            className={`relative overflow-hidden rounded-[28px] border-2 p-4 sm:p-5 md:p-6 shadow-2xl min-w-0 ${urgent
          ? 'border-red-500/70 bg-gradient-to-r from-red-600/30 via-red-500/15 to-transparent shadow-[0_0_40px_rgba(239,68,68,0.45)] animate-pulse'
          : 'border-amber-500/50 bg-gradient-to-r from-amber-500/20 via-orange-500/10 to-transparent shadow-[0_0_28px_rgba(245,158,11,0.25)]'
      } ${className}`}
    >
      <div
        className={`pointer-events-none absolute -top-16 ${isAr ? '-left-10' : '-right-10'} h-44 w-44 rounded-full blur-3xl ${
          urgent ? 'bg-red-500/40' : 'bg-amber-500/30'
        }`}
      />
      {urgent && (
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(239,68,68,0.18),transparent_55%)]" />
      )}

      <div
        className={`relative z-10 flex flex-col gap-4 ${
          compact ? '' : 'md:flex-row md:items-center md:justify-between'
        }`}
      >
        <div className="flex items-start gap-4 min-w-0">
          <div
            className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl shadow-lg ${
              urgent
                ? 'bg-red-500 text-white shadow-red-500/40'
                : 'bg-amber-500 text-black shadow-amber-500/30'
            }`}
          >
            <Icon size={24} strokeWidth={2.5} />
          </div>
          <div className="min-w-0">
            <p
              className={`mb-1 text-[10px] font-black uppercase tracking-[0.25em] ${
                urgent ? 'text-red-300' : 'text-amber-300'
              }`}
            >
              {info.level === 'frozen'
                ? isAr
                  ? 'عاجل — الحساب مقيّد / مجمّد'
                  : 'URGENT — ACCOUNT RESTRICTED'
                : info.level === 'grace'
                  ? isAr
                    ? 'عاجل — انتهت الصلاحية · فترة السماح'
                    : 'URGENT — EXPIRED · GRACE PERIOD'
                  : isAr
                    ? 'تحذير قوي — اقتراب انتهاء مستند'
                    : 'STRONG WARNING — DOCUMENT EXPIRING'}
            </p>
            <h3 className={`mb-1 font-black text-white ${compact ? 'text-base' : 'text-lg'}`}>
              {info.level === 'frozen'
                ? t.dashboard.merchant.alerts.licenseExpired
                : info.level === 'grace'
                  ? isAr
                    ? `انتهت صلاحية: ${info.docLabel}`
                    : `Expired: ${info.docLabel}`
                  : isAr
                    ? `تنبيه: ${info.docLabel} سينتهي قريباً`
                    : `Alert: ${info.docLabel} expiring soon`}
            </h3>
            <p className="max-w-xl text-sm font-bold leading-relaxed text-white/70">
              {isAr ? (
                info.level === 'frozen' ? (
                  <>
                    تم تقييد الحساب لانتهاء المستندات. حدّث <span className="text-white">{info.docLabel}</span>{' '}
                    فوراً لاستعادة الخدمة.
                  </>
                ) : info.level === 'grace' ? (
                  <>
                    انتهت صلاحية <span className="text-white">{info.docLabel}</span> بتاريخ{' '}
                    <span className="text-white">{info.formattedExpiry}</span>. متبقي حتى التجميد التلقائي:{' '}
                    <span className="text-red-300 font-black">{freezeLabel}</span>.
                    {DOC_EXPIRY_GRACE_DAYS > 0
                      ? ' إن وُجدت طلبات نشطة قد يراجع الأدمن تقييد الحساب.'
                      : ''}
                  </>
                ) : (
                  <>
                    ينتهي <span className="text-amber-200">{info.docLabel}</span> في{' '}
                    <span className="text-white">{info.formattedExpiry}</span>. متبقي حتى تجميد/تقييد الحساب:{' '}
                    <span className="text-red-300 font-black">{freezeLabel}</span>.
                  </>
                )
              ) : info.level === 'frozen' ? (
                <>
                  Account restricted due to expired documents. Update{' '}
                  <span className="text-white">{info.docLabel}</span> immediately to restore service.
                </>
              ) : info.level === 'grace' ? (
                <>
                  <span className="text-white">{info.docLabel}</span> expired on{' '}
                  <span className="text-white">{info.formattedExpiry}</span>. Time left until auto-freeze:{' '}
                  <span className="text-red-300 font-black">{freezeLabel}</span>.
                  Active orders may be reviewed by admin before full restriction.
                </>
              ) : (
                <>
                  <span className="text-amber-200">{info.docLabel}</span> expires on{' '}
                  <span className="text-white">{info.formattedExpiry}</span>. Time until account freeze/restriction:{' '}
                  <span className="text-red-300 font-black">{freezeLabel}</span>.
                </>
              )}
            </p>

            <div
              className={`mt-4 inline-flex flex-wrap items-center gap-3 rounded-2xl border px-4 py-2.5 ${
                urgent
                  ? 'border-red-500/40 bg-red-500/15 text-red-100'
                  : 'border-amber-500/30 bg-amber-500/10 text-amber-100'
              }`}
            >
              <Timer size={16} className={urgent ? 'text-red-300' : 'text-amber-300'} />
              <span className="text-[10px] font-black uppercase tracking-widest opacity-70">
                {isAr ? 'العدّ التنازلي للتجميد' : 'Freeze countdown'}
              </span>
              <span className="font-mono text-lg font-black tabular-nums tracking-wide">
                {info.freezeParts.isPast
                  ? isAr
                    ? '00ي 00س 00د'
                    : '00d 00h 00m'
                  : `${String(info.freezeParts.days).padStart(2, '0')}${isAr ? 'ي' : 'd'} ${String(info.freezeParts.hours).padStart(2, '0')}${isAr ? 'س' : 'h'} ${String(info.freezeParts.minutes).padStart(2, '0')}${isAr ? 'د' : 'm'}`}
              </span>
              <span className="inline-flex items-center gap-1.5 text-[11px] font-bold opacity-60">
                <CalendarClock size={12} />
                {info.formattedExpiry}
              </span>
            </div>
          </div>
        </div>

        {onNavigate && (
          <Button
            onClick={() => onNavigate('profile')}
            type="button"
            className={`h-12 w-full sm:w-auto shrink-0 rounded-2xl px-7 text-[11px] font-black uppercase tracking-widest min-h-[44px] ${
              urgent
                ? 'bg-red-500 text-white hover:bg-red-400 shadow-lg shadow-red-500/30'
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
