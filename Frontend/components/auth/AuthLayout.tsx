import React from 'react';
import { IconArrowLeft, IconArrowRight } from '../ui/RoleIcons';
import { useLanguage } from '../../contexts/LanguageContext';
import { LanguageToggle } from '../ui/LanguageToggle';

interface AuthLayoutProps {
  children: React.ReactNode;
  onBack: () => void;
  title: string;
  wide?: boolean;
}

export const AuthLayout: React.FC<AuthLayoutProps> = ({ children, onBack, title, wide = false }) => {
  const { language } = useLanguage();
  const BackIcon = language === 'ar' ? IconArrowRight : IconArrowLeft;

  return (
    <div className="min-h-screen pt-24 pb-12 px-4 flex flex-col items-center justify-center relative">
      <div className="fixed top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-gold-500/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-white/5 rounded-full blur-[120px]" />
      </div>

      <div className={`auth-enter w-full ${wide ? 'max-w-4xl' : 'max-w-md'} transition-all duration-500`}>
        <div className="flex items-center justify-between mb-8">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-white/60 hover:text-white transition-colors group px-4 py-2 rounded-full hover:bg-white/5"
          >
            <BackIcon size={20} className="group-hover:-translate-x-1 transition-transform" />
            <span className="text-sm font-medium">{language === 'ar' ? 'عودة' : 'Back'}</span>
          </button>

          <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center border border-white/10 backdrop-blur-md shadow-lg">
            <img
              src="/logo.webp"
              alt="Logo"
              width={32}
              height={32}
              decoding="async"
              className="w-8 h-8 object-contain brightness-0 invert"
            />
          </div>

          <LanguageToggle compact />
        </div>

        <div className="bg-[#1A1814]/80 backdrop-blur-xl border border-white/10 shadow-2xl rounded-3xl p-6 md:p-10 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-gold-500/50 to-transparent opacity-50" />

          {children}
        </div>

        <div className="text-center mt-8 flex flex-col items-center gap-2">
          <div className="flex items-center gap-2 text-[10px] text-white/30 uppercase tracking-widest font-mono">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            Secure 256-bit SSL Connection
          </div>
        </div>
      </div>
    </div>
  );
};
