import React from 'react';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';

interface HomeEarnBannerProps {
    onClick: () => void;
}

export const HomeEarnBanner: React.FC<HomeEarnBannerProps> = ({ onClick }) => {
    const { t, language } = useLanguage();
    const Arrow = language === 'ar' ? ArrowLeft : ArrowRight;
    const earn = t.common.home.earn;

    return (
        <button
            type="button"
            onClick={onClick}
            className="w-full rounded-2xl border border-gold-500/40 bg-gradient-to-r from-[#2a2419] to-[#1A1814] p-3 md:p-4 flex items-center gap-3 md:gap-5 hover:border-gold-400 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-400"
        >
            <img
                src="/landing/crestal-160.webp"
                srcSet="/landing/crestal-160.webp 1x, /landing/crestal-320.webp 2x"
                alt={earn.imageAlt}
                width={64}
                height={64}
                loading="lazy"
                decoding="async"
                className="w-12 h-12 md:w-16 md:h-16 object-contain shrink-0"
            />
            <span className="flex-1 flex flex-col items-start text-start min-w-0">
                <span className="text-base md:text-xl font-black text-gold-400 leading-tight">{earn.title}</span>
                <span className="text-[11px] md:text-sm text-white/70 mt-0.5">{earn.desc}</span>
            </span>
            <span className="rounded-full bg-gold-400 text-[#1A1814] text-xs md:text-sm font-bold px-3 md:px-5 py-1.5 md:py-2 inline-flex items-center gap-1 shrink-0">
                {earn.button}
                <Arrow size={14} aria-hidden="true" />
            </span>
        </button>
    );
};
