import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Clock } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import type { OrderActiveSla } from '../../types/orderSla';
import { useOrderActiveSla } from '../../hooks/useOrderActiveSla';

type OrderLike = Parameters<typeof useOrderActiveSla>[0];

interface Props {
  activeSla?: OrderActiveSla | null;
  order?: OrderLike;
  variant?: 'compact' | 'card' | 'hero';
  className?: string;
}

const SLA_KEY_MAP: Record<string, string> = {
  'sla.collectingOffers': 'collectingOffers',
  'sla.selection': 'selection',
  'sla.payment': 'payment',
  'sla.preparation': 'preparation',
  'sla.delayedPreparation': 'delayedPreparation',
  'sla.shipping': 'shipping',
  'sla.return': 'return',
  'sla.correction': 'correction',
  'sla.nonMatchingGrace': 'nonMatchingGrace',
};

const TERMINAL_STATUSES = new Set([
  'CANCELLED',
  'COMPLETED',
  'CLOSED',
  'REFUNDED',
  'RESOLVED',
  'WARRANTY_EXPIRED',
  'RETURNED',
]);

const URGENCY_STYLES = {
  normal: {
    ring: 'stroke-cyan-400/80',
    bg: 'bg-cyan-500/10 border-cyan-500/20 text-cyan-300',
    glow: 'shadow-cyan-500/10',
    digits: 'text-gold-400',
  },
  warning: {
    ring: 'stroke-amber-400/90',
    bg: 'bg-amber-500/10 border-amber-500/20 text-amber-300',
    glow: 'shadow-amber-500/10',
    digits: 'text-amber-300',
  },
  critical: {
    ring: 'stroke-red-400/90',
    bg: 'bg-red-500/10 border-red-500/20 text-red-300',
    glow: 'shadow-red-500/20',
    digits: 'text-red-300',
  },
  expired: {
    ring: 'stroke-red-500/40',
    bg: 'bg-red-500/10 border-red-500/20 text-red-400',
    glow: 'shadow-red-500/10',
    digits: 'text-red-400',
  },
};

function formatRemaining(ms: number) {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return { h, m, s };
}

export const OrderStatusCountdown: React.FC<Props> = ({
  activeSla: activeSlaProp,
  order,
  variant = 'compact',
  className = '',
}) => {
  const { t, language } = useLanguage();
  const isAr = language === 'ar';
  const resolved = useOrderActiveSla(order);
  const sla = activeSlaProp ?? resolved;
  const isTerminal = !!(order?.status && TERMINAL_STATUSES.has(String(order.status)));

  const endsAtMs = useMemo(
    () => (sla?.endsAt ? new Date(sla.endsAt).getTime() : null),
    [sla?.endsAt],
  );

  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!endsAtMs || isTerminal) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [endsAtMs, isTerminal]);

  if (isTerminal || !sla || !endsAtMs) return null;

  const remainingMs = endsAtMs - now;
  const isExpired = remainingMs <= 0 || sla.urgency === 'expired';
  // Hide countdown once the window has elapsed (parent should refetch to CANCELLED)
  if (isExpired) return null;

  const urgency = sla.urgency;
  const styles = URGENCY_STYLES[urgency] ?? URGENCY_STYLES.normal;

  const slaBucket =
    (t as any).sla ??
    (t as any).dashboard?.sla ??
    (t as any).merchant?.sla;
  const labelKey = SLA_KEY_MAP[sla.labelKey] ?? 'remaining';
  const label =
    slaBucket?.[labelKey] ??
    (isAr ? 'الوقت المتبقي' : 'Time remaining');

  const { h, m, s } = formatRemaining(remainingMs);

  const progress = sla.progressPercent ?? 0;
  const ringRadius = variant === 'hero' ? 36 : 14;
  const circumference = 2 * Math.PI * ringRadius;
  const dashOffset = circumference * (1 - progress / 100);

  const digits = (
    <div className={`font-mono font-black tabular-nums ${styles.digits} ${variant === 'hero' ? 'text-2xl sm:text-3xl' : 'text-xs sm:text-sm'}`}>
      {String(h).padStart(2, '0')}:{String(m).padStart(2, '0')}:{String(s).padStart(2, '0')}
    </div>
  );

  if (variant === 'compact') {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        className={`inline-flex items-center gap-2 px-2.5 py-1.5 rounded-xl border backdrop-blur-sm ${styles.bg} ${styles.glow} shadow-lg ${className}`}
      >
        <div className="relative w-7 h-7 shrink-0">
          <svg className="w-7 h-7 -rotate-90" viewBox="0 0 32 32">
            <circle cx="16" cy="16" r={ringRadius} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="3" />
            <motion.circle
              cx="16"
              cy="16"
              r={ringRadius}
              fill="none"
              className={styles.ring}
              strokeWidth="3"
              strokeLinecap="round"
              strokeDasharray={circumference}
              animate={{ strokeDashoffset: dashOffset }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
            />
          </svg>
          <Clock size={11} className="absolute inset-0 m-auto opacity-70 animate-pulse" />
        </div>
        {digits}
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-2xl border backdrop-blur-md p-4 sm:p-5 ${styles.bg} ${styles.glow} shadow-xl ${variant === 'hero' ? 'w-full' : ''} ${className}`}
    >
      <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
        <div className="relative w-16 h-16 sm:w-20 sm:h-20 shrink-0">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 80 80">
            <circle cx="40" cy="40" r="36" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="4" />
            <motion.circle
              cx="40"
              cy="40"
              r="36"
              fill="none"
              className={styles.ring}
              strokeWidth="4"
              strokeLinecap="round"
              strokeDasharray={2 * Math.PI * 36}
              animate={{ strokeDashoffset: 2 * Math.PI * 36 * (1 - progress / 100) }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
            />
          </svg>
          <Clock size={22} className="absolute inset-0 m-auto opacity-80 animate-pulse" />
        </div>
        <div className="flex-1 text-center sm:text-start min-w-0">
          <p className="text-[10px] sm:text-xs font-black uppercase tracking-[0.15em] text-white/50 mb-1 truncate">
            {label}
          </p>
          {digits}
        </div>
      </div>
    </motion.div>
  );
};

export default OrderStatusCountdown;
