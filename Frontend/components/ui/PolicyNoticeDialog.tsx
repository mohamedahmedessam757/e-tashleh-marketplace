import React, { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { TriangleAlert } from 'lucide-react';
import { CloseIconButton } from './CloseIconButton';

interface PolicyNoticeDialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  confirmLabel: string;
  closeLabel: string;
  children: React.ReactNode;
  /** Pass false when a parent modal already locks body scroll. */
  lockBodyScroll?: boolean;
}

export const PolicyNoticeDialog: React.FC<PolicyNoticeDialogProps> = ({
  open,
  onClose,
  title,
  confirmLabel,
  closeLabel,
  children,
  lockBodyScroll = true,
}) => {
  const titleId = useId();
  const confirmRef = useRef<HTMLButtonElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    previousFocusRef.current = document.activeElement as HTMLElement | null;
    confirmRef.current?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCloseRef.current();
    };
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      previousFocusRef.current?.focus?.();
    };
  }, [open]);

  useEffect(() => {
    if (!open || !lockBodyScroll) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open, lockBodyScroll]);

  if (!open || typeof document === 'undefined') return null;

  return createPortal(
    <div className="fixed inset-0 z-[120] flex items-end sm:items-center justify-center p-3 sm:p-6">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative w-full max-w-lg max-h-[88vh] flex flex-col rounded-3xl border border-gold-500/30 bg-[#1A1814] shadow-2xl animate-modal-snap-in"
      >
        <div className="flex items-start justify-between gap-3 p-5 border-b border-white/10">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 shrink-0 rounded-full bg-gold-500/15 border border-gold-500/40 text-gold-400 flex items-center justify-center">
              <TriangleAlert size={20} aria-hidden />
            </div>
            <h2 id={titleId} className="text-base sm:text-lg font-black text-white leading-snug">
              {title}
            </h2>
          </div>
          <CloseIconButton onClick={onClose} aria-label={closeLabel} size="md" />
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto p-5 overscroll-contain">{children}</div>

        <div className="p-5 border-t border-white/10">
          <button
            ref={confirmRef}
            type="button"
            onClick={onClose}
            className="w-full rounded-xl py-3 font-black text-[#1A1814] hover:brightness-110 active:scale-[0.99] transition focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-400/60"
            style={{ background: 'linear-gradient(135deg, #D9BE6F, #A88B3E)' }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
};

export default PolicyNoticeDialog;
