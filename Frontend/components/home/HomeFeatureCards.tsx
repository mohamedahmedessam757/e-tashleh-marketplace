import React from 'react';
import { ShieldCheck, Truck, Wallet, ScanSearch } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';

export const HomeFeatureCards: React.FC = () => {
    const { t } = useLanguage();
    const f = t.common.home.features;

    const cards = [
        { key: 'warranty', Icon: ShieldCheck, ...f.warranty },
        { key: 'shipping', Icon: Truck, ...f.shipping },
        { key: 'payment', Icon: Wallet, ...f.payment },
        { key: 'matching', Icon: ScanSearch, ...f.matching },
    ];

    return (
        <ul className="grid grid-cols-4 gap-2 sm:gap-3 md:gap-4 lg:gap-6">
            {cards.map(({ key, Icon, title, desc }, i) => (
                <li
                    key={key}
                    className="stagger-item rounded-2xl border border-gold-500/25 bg-[#1A1814]/80 backdrop-blur-sm p-2 sm:p-3 md:p-5 lg:p-7 flex flex-col items-center text-center gap-1.5 md:gap-3 shadow-lg hover:border-gold-400/60 transition-colors"
                    style={{ animationDelay: `${0.2 + i * 0.05}s` }}
                >
                    <span className="w-9 h-9 md:w-14 md:h-14 lg:w-16 lg:h-16 rounded-full border border-gold-500/50 bg-gold-500/10 text-gold-400 flex items-center justify-center shrink-0">
                        <Icon className="w-[18px] h-[18px] md:w-[26px] md:h-[26px] lg:w-[30px] lg:h-[30px]" aria-hidden="true" />
                    </span>
                    <span className="text-[11px] sm:text-xs md:text-base lg:text-lg font-bold text-white leading-tight">{title}</span>
                    <span className="hidden md:block text-xs lg:text-sm text-white/60 leading-relaxed">{desc}</span>
                </li>
            ))}
        </ul>
    );
};
