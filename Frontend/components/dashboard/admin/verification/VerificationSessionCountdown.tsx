import React, { useEffect, useState, useCallback } from 'react';
import { Clock, AlertTriangle } from 'lucide-react';

interface VerificationSessionCountdownProps {
  deadline: Date | string | null | undefined;
  isAr: boolean;
  onExpired?: () => void;
  className?: string;
}

function computeRemaining(deadline: Date) {
  const ms = deadline.getTime() - Date.now();
  if (ms <= 0) return { expired: true, h: 0, m: 0, s: 0, totalMs: 0 };
  return {
    expired: false,
    h: Math.floor(ms / 3_600_000),
    m: Math.floor((ms % 3_600_000) / 60_000),
    s: Math.floor((ms % 60_000) / 1000),
    totalMs: ms,
  };
}

export const VerificationSessionCountdown: React.FC<VerificationSessionCountdownProps> = ({
  deadline,
  isAr,
  onExpired,
  className = '',
}) => {
  const [, setTick] = useState(0);

  const target = deadline ? new Date(deadline) : null;
  const remaining = target ? computeRemaining(target) : null;

  const fireExpired = useCallback(() => {
    onExpired?.();
  }, [onExpired]);

  useEffect(() => {
    if (!target) return undefined;
    const id = setInterval(() => setTick((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, [target?.getTime()]);

  useEffect(() => {
    if (remaining?.expired) fireExpired();
  }, [remaining?.expired, fireExpired]);

  if (!target || !remaining) return null;

  const urgent = !remaining.expired && remaining.totalMs < 5 * 60_000;
  const pad = (n: number) => String(n).padStart(2, '0');

  if (remaining.expired) {
    return (
      <div
        role="alert"
        className={`flex items-center gap-2 px-4 py-2 rounded-xl border border-red-500/40 bg-red-500/10 text-red-300 text-sm font-bold ${className}`}
      >
        <AlertTriangle size={16} className="shrink-0" />
        {isAr ? 'انتهت الجلسة — الرجاء الخروج وطلب رابط جديد من الإدارة' : 'Session expired — exit and request a new link from admin'}
      </div>
    );
  }

  return (
    <div
      className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-mono font-bold ${className} ${
        urgent
          ? 'border-amber-500/50 bg-amber-500/10 text-amber-200 animate-pulse'
          : 'border-gold-500/30 bg-gold-500/10 text-gold-200'
      }`}
    >
      <Clock size={16} className="shrink-0" />
      <span>{isAr ? 'متبقي على انتهاء الجلسة:' : 'Session ends in:'}</span>
      <span dir="ltr">
        {remaining.h > 0 && `${pad(remaining.h)}:`}
        {pad(remaining.m)}:{pad(remaining.s)}
      </span>
    </div>
  );
};
