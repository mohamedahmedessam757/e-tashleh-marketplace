import React from 'react';
import { IconArrowLeft, IconArrowRight } from '../ui/RoleIcons';
import { useLanguage } from '../../contexts/LanguageContext';
import { LanguageToggle } from '../ui/LanguageToggle';

interface AuthLayoutProps {
  children: React.ReactNode;
  onBack: () => void;
  title: string;
  wide?: boolean;
  /** Narrower card — login screens only */
  narrow?: boolean;
}

export const AuthLayout: React.FC<AuthLayoutProps> = ({
  children,
  onBack,
  title,
  wide = false,
  narrow = false,
}) => {
  const { language } = useLanguage();
  const BackIcon = language === 'ar' ? IconArrowRight : IconArrowLeft;

  const widthClass = wide
    ? 'max-w-4xl'
    : narrow
      ? 'max-w-[360px] sm:max-w-md'
      : 'max-w-md sm:max-w-lg';

  return (
    <div className="min-h-screen min-h-[100dvh] pt-16 sm:pt-20 md:pt-24 pb-8 sm:pb-12 px-3 sm:px-6 md:px-8 flex flex-col items-center justify-start sm:justify-center relative overflow-x-hidden">
      <div className="fixed top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[min(500px,80vw)] h-[min(500px,80vw)] bg-gold-500/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[min(500px,80vw)] h-[min(500px,80vw)] bg-white/5 rounded-full blur-[120px]" />
      </div>

      <div className={`auth-enter w-full min-w-0 ${widthClass} transition-all duration-500`}>
        <div className="flex items-center justify-between gap-2 mb-5 sm:mb-8 min-w-0">
          <button
            type="button"
            onClick={onBack}
            className="flex items-center gap-1.5 sm:gap-2 text-white/60 hover:text-white transition-colors group px-2 sm:px-4 py-2 rounded-full hover:bg-white/5 shrink-0"
          >
            <BackIcon size={20} className="group-hover:-translate-x-1 transition-transform" />
            <span className="text-sm font-medium">{language === 'ar' ? 'عودة' : 'Back'}</span>
          </button>

          <div className="w-10 h-10 sm:w-12 sm:h-12 bg-white/10 rounded-2xl flex items-center justify-center border border-white/10 backdrop-blur-md shadow-lg shrink-0">
            <img
              src="/logo.webp"
              alt="Logo"
              width={32}
              height={32}
              decoding="async"
              className="w-7 h-7 sm:w-8 sm:h-8 object-contain brightness-0 invert"
            />
          </div>

          <div className="shrink-0">
            <LanguageToggle compact />
          </div>
        </div>

        <div className="bg-[#1A1814]/80 backdrop-blur-xl border border-white/10 shadow-2xl rounded-2xl sm:rounded-3xl p-4 sm:p-6 md:p-8 relative overflow-hidden w-full min-w-0 box-border">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-gold-500/50 to-transparent opacity-50" />

          <div className="w-full min-w-0 overflow-x-hidden">{children}</div>
        </div>

        <div className="text-center mt-6 sm:mt-8 flex flex-col items-center gap-2 px-2">
          <div className="flex items-center gap-2 text-[10px] text-white/30 uppercase tracking-widest font-mono">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            Secure 256-bit SSL Connection
          </div>
        </div>
      </div>
    </div>
  );
};
