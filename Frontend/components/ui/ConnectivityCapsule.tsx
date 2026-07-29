import React, { useEffect, useState } from 'react';
import {
  WifiOff,
  SignalLow,
  Database,
  ServerCrash,
  ShieldAlert,
  CheckCircle2,
  RefreshCw,
  X,
} from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useConnectivityStatus } from '../../hooks/useConnectivityStatus';

/**
 * Global fixed capsule for offline / weak net / platform DB / maintenance.
 * Mount once in App.tsx — covers all roles and guest surfaces.
 */
export const ConnectivityCapsule: React.FC = () => {
  const { t, language } = useLanguage();
  const isAr = language === 'ar';
  const { level, detail, dismissWeak, retryNow } = useConnectivityStatus();
  const copy = (t.common as { connectivity?: Record<string, string> } | undefined)?.connectivity;
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => setReduceMotion(mq.matches);
    sync();
    mq.addEventListener?.('change', sync);
    return () => mq.removeEventListener?.('change', sync);
  }, []);

  if (level === 'ok' || !copy) return null;

  const maintenanceBody =
    (isAr ? detail.maintenanceMsgAr : detail.maintenanceMsgEn) || copy.maintenanceBody;

  let title = '';
  let body = '';
  let Icon = WifiOff;
  let tone: 'amber' | 'red' | 'green' = 'amber';
  let showDismiss = false;
  let showRetry = false;
  let live: 'polite' | 'assertive' = 'polite';

  switch (level) {
    case 'offline':
      title = copy.offlineTitle;
      body = copy.offlineBody;
      Icon = WifiOff;
      tone = 'amber';
      showRetry = true;
      live = 'assertive';
      break;
    case 'weak':
      title = copy.weakTitle;
      body = copy.weakBody;
      Icon = SignalLow;
      tone = 'amber';
      showDismiss = true;
      break;
    case 'platform_down':
      title = copy.platformTitle;
      body = copy.platformBody;
      Icon = detail.platformCause === 'database' ? Database : ServerCrash;
      tone = 'red';
      showRetry = true;
      live = 'assertive';
      break;
    case 'maintenance':
      title = copy.maintenanceTitle;
      body = maintenanceBody;
      Icon = ShieldAlert;
      tone = 'red';
      live = 'assertive';
      break;
    case 'recovered':
      title = copy.recoveredTitle;
      body = copy.recoveredBody;
      Icon = CheckCircle2;
      tone = 'green';
      break;
    default:
      return null;
  }

  const toneClasses =
    tone === 'red'
      ? 'border-red-500/40 bg-[#1A1814] text-red-200'
      : tone === 'green'
        ? 'border-green-500/40 bg-[#1A1814] text-green-200'
        : 'border-amber-500/40 bg-[#1A1814] text-amber-200';

  const iconWrap =
    tone === 'red'
      ? 'bg-red-500/15 text-red-400 border-red-500/25'
      : tone === 'green'
        ? 'bg-green-500/15 text-green-400 border-green-500/25'
        : 'bg-amber-500/15 text-amber-400 border-amber-500/25';

  const pulseDot =
    tone === 'red'
      ? 'bg-red-500'
      : tone === 'green'
        ? 'bg-green-500'
        : 'bg-amber-500';

  const shouldPulse =
    !reduceMotion && (level === 'offline' || level === 'platform_down');

  return (
    <div
      role="status"
      aria-live={live}
      aria-atomic="true"
      dir={isAr ? 'rtl' : 'ltr'}
      className="fixed top-3 left-1/2 -translate-x-1/2 z-[55] w-[calc(100%-1.5rem)] max-w-xl pointer-events-none"
    >
      <div
        className={`pointer-events-auto ${reduceMotion ? '' : 'animate-modal-snap-in'} rounded-2xl border shadow-lg px-3.5 py-3 flex items-start gap-3 ${toneClasses}`}
      >
        <div
          className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 ${iconWrap}`}
        >
          <Icon size={18} className={shouldPulse ? 'animate-pulse' : ''} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${pulseDot}`} />
            <h4 className="text-xs font-black uppercase tracking-wide truncate text-white">
              {title}
            </h4>
          </div>
          <p className="text-[11px] leading-relaxed text-white/55 font-medium">
            {body}
          </p>
        </div>

        <div className="flex items-center gap-1.5 shrink-0 self-center">
          {showRetry && (
            <button
              type="button"
              onClick={retryNow}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-wider bg-white/5 border border-white/10 text-white/80 hover:bg-white/10 transition-colors"
            >
              <RefreshCw size={11} />
              {copy.retry}
            </button>
          )}
          {showDismiss && (
            <button
              type="button"
              onClick={dismissWeak}
              aria-label={copy.weakDismiss}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-wider bg-white/5 border border-white/10 text-white/70 hover:bg-white/10 transition-colors"
            >
              <X size={12} />
              <span className="hidden sm:inline">{copy.weakDismiss}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

ConnectivityCapsule.displayName = 'ConnectivityCapsule';
