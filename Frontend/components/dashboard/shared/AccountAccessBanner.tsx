import React, { useEffect, useMemo, useState } from 'react';
import { Lock, Clock, ShieldAlert, MessageCircle, Mail } from 'lucide-react';
import { motion } from 'framer-motion';
import { GlassCard } from '../../ui/GlassCard';
import { useLanguage } from '../../../contexts/LanguageContext';
import { siteContacts } from '../../../config/site';

export type AccountAccessKind = 'PERMANENT' | 'TEMPORARY';
export type AccountAccessAudience = 'customer' | 'merchant' | 'admin';

export interface AccountAccessBannerProps {
  kind: AccountAccessKind;
  reason?: string | null;
  suspendedUntil?: string | Date | null;
  audience?: AccountAccessAudience;
  /** When true, blurs children behind a full-screen overlay */
  lockInteraction?: boolean;
  children?: React.ReactNode;
}

function formatCountdown(until: Date, isAr: boolean): string {
  const ms = until.getTime() - Date.now();
  if (ms <= 0) return isAr ? 'انتهت المدة' : 'Expired';
  const days = Math.floor(ms / (24 * 60 * 60 * 1000));
  const hours = Math.floor((ms % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
  const mins = Math.floor((ms % (60 * 60 * 1000)) / (60 * 1000));
  if (days > 0) {
    return isAr ? `${days}ي ${hours}س` : `${days}d ${hours}h`;
  }
  return isAr ? `${hours}س ${mins}د` : `${hours}h ${mins}m`;
}

export const AccountAccessBanner: React.FC<AccountAccessBannerProps> = ({
  kind,
  reason,
  suspendedUntil,
  audience = 'customer',
  lockInteraction = true,
  children,
}) => {
  const { t, language } = useLanguage();
  const isAr = language === 'ar';
  const copy = t.common?.accountAccess;

  const untilDate = useMemo(() => {
    if (!suspendedUntil) return null;
    const d = new Date(suspendedUntil);
    return Number.isNaN(d.getTime()) ? null : d;
  }, [suspendedUntil]);

  const [countdown, setCountdown] = useState(() =>
    untilDate ? formatCountdown(untilDate, isAr) : '',
  );

  useEffect(() => {
    if (!untilDate || kind !== 'TEMPORARY') return;
    const tick = () => setCountdown(formatCountdown(untilDate, isAr));
    tick();
    const id = window.setInterval(tick, 30_000);
    return () => window.clearInterval(id);
  }, [untilDate, kind, isAr]);

  const supportPhone = siteContacts.whatsapp || '971544404839';
  const supportEmail =
    audience === 'merchant'
      ? siteContacts.merchant
      : audience === 'admin'
        ? siteContacts.contact
        : siteContacts.customer;

  const waHref = `https://wa.me/${supportPhone.replace(/\D/g, '')}`;
  const mailHref = `mailto:${supportEmail}`;

  const isPermanent = kind === 'PERMANENT';
  const title = isPermanent
    ? copy?.permanentTitle || (isAr ? 'تم حظر حسابك' : 'Your account is blocked')
    : copy?.temporaryTitle || (isAr ? 'تم إيقاف حسابك مؤقتاً' : 'Your account is temporarily suspended');
  const subtitle = isPermanent
    ? copy?.permanentSubtitle
    : copy?.temporarySubtitle;
  const badge = isPermanent
    ? copy?.permanentBadge
    : copy?.temporaryBadge;
  const reasonText =
    (reason || '').trim() ||
    copy?.noReason ||
    (isAr ? 'قرار إداري' : 'Administrative decision');

  const panel = (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full max-w-lg mx-auto px-4 sm:px-0"
    >
      <GlassCard
        className={
          isPermanent
            ? 'w-full text-center p-6 sm:p-10 border-red-500/25 bg-red-900/5 shadow-[0_0_40px_rgba(0,0,0,0.35)]'
            : 'w-full text-center p-6 sm:p-10 border-orange-500/25 bg-orange-900/5 shadow-[0_0_40px_rgba(0,0,0,0.35)]'
        }
      >
        <div
          className={
            isPermanent
              ? 'w-16 h-16 sm:w-20 sm:h-20 bg-red-500/10 rounded-2xl flex items-center justify-center mx-auto mb-5 sm:mb-6 text-red-500 border border-red-500/20'
              : 'w-16 h-16 sm:w-20 sm:h-20 bg-orange-500/10 rounded-2xl flex items-center justify-center mx-auto mb-5 sm:mb-6 text-orange-500 border border-orange-500/20'
          }
        >
          {isPermanent ? <Lock size={36} /> : <ShieldAlert size={36} className="animate-pulse" />}
        </div>

        <div className="flex flex-wrap items-center justify-center gap-2 mb-3">
          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">{title}</h2>
          <span
            className={
              isPermanent
                ? 'text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full bg-red-500/20 text-red-400 border border-red-500/30'
                : 'text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full bg-orange-500/20 text-orange-400 border border-orange-500/30'
            }
          >
            {badge}
          </span>
        </div>

        <p className="text-sm sm:text-base text-white/60 leading-relaxed mb-5">{subtitle}</p>

        {kind === 'TEMPORARY' && untilDate && (
          <div className="flex flex-col sm:flex-row flex-wrap items-center justify-center gap-3 mb-5">
            <div className="inline-flex items-center gap-2 bg-orange-500/10 border border-orange-500/20 rounded-xl px-4 py-2">
              <Clock size={14} className="text-orange-400" />
              <span className="text-[10px] font-black text-orange-400/80 uppercase tracking-widest">
                {copy?.durationLabel}
              </span>
              <span className="text-lg font-mono font-black text-orange-300 tabular-nums" dir="ltr">
                {countdown || '—'}
              </span>
            </div>
            <span className="text-[10px] text-white/40 font-medium">
              {copy?.endsAtLabel}:{' '}
              <span dir="ltr">
                {untilDate.toLocaleString(isAr ? 'ar-EG' : 'en-GB', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </span>
          </div>
        )}

        <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-start mb-6">
          <p className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-1.5">
            {copy?.reasonLabel}
          </p>
          <p className="text-sm text-white/90 font-medium leading-relaxed">{reasonText}</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <a
            href={waHref}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 inline-flex items-center justify-center gap-2 min-h-[44px] px-4 py-3 rounded-xl bg-gold-500/15 border border-gold-500/30 text-gold-300 hover:bg-gold-500/25 font-bold text-sm transition-all"
          >
            <MessageCircle size={18} />
            {copy?.supportWhatsapp}
          </a>
          <a
            href={mailHref}
            className="flex-1 inline-flex items-center justify-center gap-2 min-h-[44px] px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white/80 hover:bg-white/10 font-bold text-sm transition-all"
          >
            <Mail size={18} />
            {copy?.supportEmail}
          </a>
        </div>
      </GlassCard>
    </motion.div>
  );

  if (!lockInteraction) {
    return panel;
  }

  return (
    <div className="relative min-h-[60vh] w-full">
      {children && (
        <div className="filter blur-[18px] pointer-events-none opacity-25 select-none" aria-hidden>
          {children}
        </div>
      )}
      <div className="fixed inset-0 z-[90] flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-y-auto py-8 sm:py-12 bg-[#0F0E0C]/70 backdrop-blur-sm">
        {panel}
      </div>
    </div>
  );
};
