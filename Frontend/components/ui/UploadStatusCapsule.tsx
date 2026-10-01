import React, { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, Loader2, X } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useUploadFeedbackStore } from '../../stores/useUploadFeedbackStore';
import { getUploadMessage } from '../../services/upload/uploadMessages';

/**
 * Global upload feedback (progress / success / error).
 * Mount once in App.tsx — fed by services/upload/uploadService and notify().
 */
export const UploadStatusCapsule: React.FC = () => {
  const { language } = useLanguage();
  const isAr = language === 'ar';
  const items = useUploadFeedbackStore((s) => s.items);
  const dismiss = useUploadFeedbackStore((s) => s.dismiss);
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => setReduceMotion(mq.matches);
    sync();
    mq.addEventListener?.('change', sync);
    return () => mq.removeEventListener?.('change', sync);
  }, []);

  if (items.length === 0) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      dir={isAr ? 'rtl' : 'ltr'}
      className="fixed inset-x-0 top-[calc(env(safe-area-inset-top)+0.75rem)] z-[56] flex flex-col items-center gap-2 px-3 pointer-events-none"
    >
      {items.map((item) => {
        const text = getUploadMessage(item.status, item.kind, item.count, item.errorCode, isAr, item.progress);
        if (!text) return null;

        const tone =
          item.status === 'uploading'
            ? 'bg-[#1A1814]/90 border-gold-500/40 text-white'
            : item.status === 'success'
              ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-100'
              : 'bg-rose-500/15 border-rose-500/40 text-rose-100';

        return (
          <div
            key={item.id}
            className={`pointer-events-auto relative overflow-hidden w-full max-w-md sm:w-auto rounded-full border backdrop-blur-xl px-4 py-2.5 shadow-lg text-sm sm:text-base font-bold flex items-center gap-2 ${reduceMotion ? '' : 'animate-modal-snap-in'} ${tone}`}
          >
            {item.status === 'uploading' && (
              <Loader2 size={18} className={`shrink-0 text-gold-500 ${reduceMotion ? '' : 'animate-spin'}`} />
            )}
            {item.status === 'success' && <CheckCircle2 size={18} className="shrink-0 text-emerald-400" />}
            {item.status === 'error' && <AlertTriangle size={18} className="shrink-0 text-rose-400" />}

            <span className="min-w-0 flex-1 truncate">{text}</span>

            {item.status === 'error' && (
              <button
                type="button"
                onClick={() => dismiss(item.id)}
                aria-label={isAr ? 'إغلاق' : 'Dismiss'}
                className="shrink-0 rounded-full p-1 text-rose-200 hover:bg-white/10 transition-colors"
              >
                <X size={14} />
              </button>
            )}

            {item.status === 'uploading' && (
              <span className="absolute inset-x-0 bottom-0 h-1 bg-white/10">
                <span
                  className="block h-full bg-gold-500 transition-[width] duration-300"
                  style={{ width: `${item.progress}%` }}
                />
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
};

UploadStatusCapsule.displayName = 'UploadStatusCapsule';
