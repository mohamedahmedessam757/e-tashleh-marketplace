import React, { useState, useCallback } from 'react';
import { Copy, Check } from 'lucide-react';

interface CopyableIdBadgeProps {
  labelAr: string;
  labelEn: string;
  value?: string | null;
  language?: string;
  variant?: 'gold' | 'muted';
}

async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* fallback below */
  }
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

export const CopyableIdBadge: React.FC<CopyableIdBadgeProps> = ({
  labelAr,
  labelEn,
  value,
  language = 'ar',
  variant = 'gold',
}) => {
  const [copied, setCopied] = useState(false);
  const isAr = language === 'ar';
  const label = isAr ? labelAr : labelEn;

  const handleCopy = useCallback(async () => {
    if (!value) return;
    const ok = await copyText(value);
    if (ok) {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    }
  }, [value]);

  if (!value) return null;

  const shell =
    variant === 'gold'
      ? 'bg-gold-500/5 border-gold-500/20 text-gold-400'
      : 'bg-white/5 border-white/10 text-white/50';

  return (
    <div
      className={`inline-flex flex-wrap items-center gap-2 px-3 py-1.5 rounded-xl border text-xs max-w-full ${shell}`}
    >
      <span className="font-bold uppercase tracking-wider opacity-70 shrink-0">{label}</span>
      <span className="font-mono truncate max-w-[180px] sm:max-w-[280px] dir-ltr" title={value}>
        {value}
      </span>
      <button
        type="button"
        onClick={handleCopy}
        className="p-1 rounded-lg hover:bg-white/10 transition-colors shrink-0"
        aria-label={isAr ? 'نسخ' : 'Copy'}
      >
        {copied ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
      </button>
    </div>
  );
};
