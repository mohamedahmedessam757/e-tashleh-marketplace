import React, { useCallback, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import {
  IconWhatsApp,
  IconTelegram,
  IconXTwitter,
  IconFacebook,
  IconEmailBrand,
  IconShareMore,
} from './SocialBrandIcons';

export function buildReferralUrl(referralCode: string): string {
  if (!referralCode) return '';
  return `${window.location.origin}/register?ref=${encodeURIComponent(referralCode)}`;
}

export function buildReferralShareText(isAr: boolean): string {
  return isAr
    ? 'انضم إلى E-TASHLEH وابدأ تجربة تسوق ذكية. سجل من خلال رابطي:'
    : 'Join E-TASHLEH for a smart shopping experience. Sign up using my link:';
}

type ShareDest = {
  id: string;
  label: string;
  href?: string;
  onClick?: () => void;
  gradient: string;
  shadow: string;
  textColor?: string;
  border?: string;
  Icon: React.FC<{ className?: string; size?: number }>;
};

interface ReferralShareDestinationsProps {
  referralCode: string;
  isAr: boolean;
  /** Inline row (hub) vs modal sheet (invite CTA) */
  variant?: 'row' | 'sheet';
  isOpen?: boolean;
  onClose?: () => void;
  title?: string;
  subtitle?: string;
}

export const ReferralShareDestinations: React.FC<ReferralShareDestinationsProps> = ({
  referralCode,
  isAr,
  variant = 'row',
  isOpen = true,
  onClose,
  title,
  subtitle,
}) => {
  const [copied, setCopied] = useState(false);

  const referralUrl = useMemo(() => buildReferralUrl(referralCode), [referralCode]);
  const shareText = useMemo(() => buildReferralShareText(isAr), [isAr]);
  const fullShareMessage = useMemo(
    () => `${shareText} ${referralUrl}`,
    [shareText, referralUrl],
  );

  const handleCopy = useCallback(async () => {
    if (!referralUrl) return;
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(referralUrl);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = referralUrl;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      /* ignore */
    }
  }, [referralUrl]);

  const handleNativeShare = useCallback(async () => {
    if (!referralUrl) return;
    if (navigator.share) {
      try {
        await navigator.share({ title: 'E-TASHLEH', text: shareText, url: referralUrl });
      } catch (e) {
        if ((e as Error).name !== 'AbortError') await handleCopy();
      }
    } else {
      await handleCopy();
    }
  }, [referralUrl, shareText, handleCopy]);

  const destinations = useMemo((): ShareDest[] => {
    if (!referralUrl) return [];
    const enc = encodeURIComponent;
    return [
      {
        id: 'whatsapp',
        label: 'WhatsApp',
        Icon: IconWhatsApp,
        href: `https://wa.me/?text=${enc(fullShareMessage)}`,
        gradient: 'from-[#25D366] to-[#128C7E]',
        shadow: 'shadow-[#25D366]/25',
      },
      {
        id: 'telegram',
        label: 'Telegram',
        Icon: IconTelegram,
        href: `https://t.me/share/url?url=${enc(referralUrl)}&text=${enc(shareText)}`,
        gradient: 'from-[#0088cc] to-[#006699]',
        shadow: 'shadow-[#0088cc]/25',
      },
      {
        id: 'twitter',
        label: 'X',
        Icon: IconXTwitter,
        href: `https://twitter.com/intent/tweet?text=${enc(shareText)}&url=${enc(referralUrl)}`,
        gradient: 'from-[#000000] to-[#333333]',
        shadow: 'shadow-white/10',
        border: 'border-white/15',
      },
      {
        id: 'facebook',
        label: 'Facebook',
        Icon: IconFacebook,
        href: `https://www.facebook.com/sharer/sharer.php?u=${enc(referralUrl)}`,
        gradient: 'from-[#1877F2] to-[#0C59CF]',
        shadow: 'shadow-[#1877F2]/25',
      },
      {
        id: 'email',
        label: isAr ? 'البريد' : 'Email',
        Icon: IconEmailBrand,
        href: `mailto:?subject=${enc('E-TASHLEH')}&body=${enc(fullShareMessage)}`,
        gradient: 'from-[#EA4335] to-[#C5221F]',
        shadow: 'shadow-[#EA4335]/25',
      },
      {
        id: 'more',
        label: copied
          ? isAr
            ? 'تم النسخ'
            : 'Copied'
          : isAr
            ? 'المزيد'
            : 'More',
        Icon: IconShareMore,
        onClick: handleNativeShare,
        gradient: 'from-[#EAB308] to-[#CA8A04]',
        shadow: 'shadow-yellow-500/30',
        textColor: 'text-black',
      },
    ];
  }, [referralUrl, fullShareMessage, shareText, isAr, copied, handleNativeShare]);

  const grid = (
    <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
      {destinations.map((d) => {
        const common =
          `flex flex-col items-center gap-2 group/share focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-500/50 rounded-2xl`;
        const circle = `w-14 h-14 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-br ${d.gradient} ${d.shadow} ${d.border || ''} ${d.textColor || 'text-white'} flex items-center justify-center shadow-lg transition-transform group-hover/share:scale-105 active:scale-95`;
        const labelCls = 'text-[10px] font-bold text-white/60 group-hover/share:text-white transition-colors';

        if (d.href) {
          return (
            <a
              key={d.id}
              href={d.href}
              target="_blank"
              rel="noopener noreferrer"
              className={common}
              onClick={() => onClose?.()}
            >
              <span className={circle}>
                <d.Icon size={22} />
              </span>
              <span className={labelCls}>{d.label}</span>
            </a>
          );
        }
        return (
          <button key={d.id} type="button" className={common} onClick={() => d.onClick?.()}>
            <span className={circle}>
              <d.Icon size={22} />
            </span>
            <span className={labelCls}>{d.label}</span>
          </button>
        );
      })}
    </div>
  );

  if (variant === 'row') {
    return <div className="w-full">{grid}</div>;
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[120] flex items-end sm:items-center justify-center p-0 sm:p-4">
          <motion.button
            type="button"
            aria-label="Close"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/75 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 24 }}
            className="relative z-10 w-full sm:max-w-md bg-[#12100E] border border-white/10 rounded-t-3xl sm:rounded-3xl p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] shadow-2xl"
          >
            <div className="flex items-start justify-between gap-3 mb-5">
              <div>
                <h3 className="text-lg font-black text-white">
                  {title || (isAr ? 'أين تريد مشاركة الرابط؟' : 'Where do you want to share?')}
                </h3>
                <p className="text-xs text-white/45 mt-1">
                  {subtitle ||
                    (isAr
                      ? 'اختر تطبيق التواصل لمشاركة رابط الدعوة'
                      : 'Pick a social app to share your invite link')}
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white/60 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>
            {grid}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
