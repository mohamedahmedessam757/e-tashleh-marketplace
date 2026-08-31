import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, X } from 'lucide-react';

type Props = {
  message: string | null;
  onDismiss?: () => void;
};

/** Full-message red glow alert for create-order rule violations (visible vs toast truncation). */
export const OrderCreateRuleAlert: React.FC<Props> = ({ message, onDismiss }) => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!message) return;
    ref.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [message]);

  return (
    <AnimatePresence>
      {message ? (
        <motion.div
          ref={ref}
          role="alert"
          aria-live="assertive"
          initial={{ opacity: 0, y: -8, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -6, scale: 0.98 }}
          transition={{ duration: 0.25 }}
          className="relative overflow-hidden rounded-xl border-2 border-red-500/80 bg-red-950/90 px-4 py-4 sm:px-5 sm:py-5 text-start shadow-[0_0_28px_rgba(239,68,68,0.55),0_0_8px_rgba(239,68,68,0.9)] ring-2 ring-red-500/40"
        >
          <div
            className="pointer-events-none absolute inset-0 animate-pulse bg-gradient-to-r from-red-500/10 via-red-400/5 to-red-500/10"
            aria-hidden
          />
          <div className="relative flex items-start gap-3">
            <div className="shrink-0 mt-0.5 rounded-lg bg-red-500/25 p-2 text-red-300 shadow-[0_0_12px_rgba(239,68,68,0.7)]">
              <AlertTriangle size={22} className="text-red-400" />
            </div>
            <p className="flex-1 min-w-0 text-sm sm:text-base font-semibold text-red-50 leading-relaxed whitespace-pre-line">
              {message}
            </p>
            {onDismiss ? (
              <button
                type="button"
                onClick={onDismiss}
                className="shrink-0 rounded-lg p-1.5 text-red-200/80 hover:bg-red-500/30 hover:text-white transition-colors"
                aria-label="Dismiss"
              >
                <X size={18} />
              </button>
            ) : null}
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
};

export default OrderCreateRuleAlert;
