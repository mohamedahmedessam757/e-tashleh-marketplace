import React from 'react';
import { Globe } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';

interface LanguageToggleProps {
  className?: string;
  compact?: boolean;
}

export const LanguageToggle: React.FC<LanguageToggleProps> = ({
  className = '',
  compact = false,
}) => {
  const { language, toggleLanguage } = useLanguage();
  const isAr = language === 'ar';

  return (
    <button
      type="button"
      onClick={toggleLanguage}
      className={`inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 hover:border-gold-500/30 hover:bg-gold-500/10 transition-all font-bold text-white/80 hover:text-white ${compact ? 'px-3 py-2 text-xs' : 'px-4 py-2 text-sm'} ${className}`}
      aria-label={isAr ? 'Switch to English' : 'التبديل إلى العربية'}
    >
      <Globe size={compact ? 14 : 16} className="text-gold-500 shrink-0" />
      <span>{isAr ? 'English' : 'العربية'}</span>
    </button>
  );
};
