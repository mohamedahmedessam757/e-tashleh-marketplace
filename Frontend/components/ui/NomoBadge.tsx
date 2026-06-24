import React from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { BUSINESS_LICENSE_NUMBER } from '../../data/businessLicense';

interface NomoBadgeProps {
  onClick?: () => void;
}

export const NomoBadge: React.FC<NomoBadgeProps> = ({ onClick }) => {
  const { t } = useLanguage();

  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col sm:inline-flex items-center group cursor-pointer bg-transparent border-0 p-0"
      aria-label={t.footer.nomoTitle}
    >
      <div className="bg-white flex items-center justify-center rounded-full sm:rounded-xl shadow-lg group-hover:shadow-xl transition-shadow w-[56px] h-[56px] sm:w-auto sm:h-auto sm:px-4 sm:py-2 sm:gap-3 shrink-0">
        <div className="w-10 h-10 sm:w-11 sm:h-11 flex items-center justify-center shrink-0">
          <img
            src="/logo_nomo.webp"
            alt={t.footer.nomoTitle}
            className="w-full h-full object-contain"
          />
        </div>
        <div className="hidden sm:flex flex-col items-start pr-1 text-left">
          <span className="text-[10px] text-gray-500 font-bold mb-0.5 leading-tight">
            {t.footer.nomoTitle}
          </span>
          <span className="text-sm font-bold text-[#1B6D5E] tracking-widest font-mono leading-none mt-0.5">
            {BUSINESS_LICENSE_NUMBER}
          </span>
        </div>
      </div>
      <span className="sm:hidden text-[13px] font-bold text-white/90 font-mono tracking-widest mt-2 group-hover:text-white transition-colors">
        {BUSINESS_LICENSE_NUMBER}
      </span>
    </button>
  );
};
