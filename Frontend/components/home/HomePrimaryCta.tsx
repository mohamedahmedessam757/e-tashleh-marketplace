import React from 'react';
import { Car, ArrowLeft, ArrowRight } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';

interface HomePrimaryCtaProps {
    onClick: () => void;
}

export const HomePrimaryCta: React.FC<HomePrimaryCtaProps> = ({ onClick }) => {
    const { t, language } = useLanguage();
    const Arrow = language === 'ar' ? ArrowLeft : ArrowRight;
    const cta = t.common.home.cta;

    return (
        <button
            type="button"
            onClick={onClick}
            className="stagger-item w-full rounded-2xl p-4 md:p-5 flex items-center justify-between gap-4 transition-transform duration-300 hover:scale-[1.01] active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#1A1814]"
            style={{
                animationDelay: '0.3s',
                background: 'linear-gradient(135deg, #D9BE6F, #A88B3E)',
                boxShadow: '0 8px 30px rgba(196, 169, 92, 0.25)',
            }}
        >
            <span className="flex items-center gap-4 min-w-0">
                <span className="w-12 h-12 rounded-full bg-[#1A1814]/85 text-gold-400 flex items-center justify-center shrink-0">
                    <Car size={24} aria-hidden="true" />
                </span>
                <span className="flex flex-col items-start text-start min-w-0">
                    <span className="text-lg md:text-2xl font-black text-[#1A1814] leading-tight">{cta.title}</span>
                    <span className="text-xs md:text-sm text-[#1A1814]/75 font-semibold mt-0.5">{cta.desc}</span>
                </span>
            </span>
            <Arrow className="text-[#1A1814] shrink-0" size={22} aria-hidden="true" />
        </button>
    );
};
