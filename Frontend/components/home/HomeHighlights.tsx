import React from 'react';
import { Headphones, Truck, Cog, Handshake } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';

export const HomeHighlights: React.FC = () => {
    const { t } = useLanguage();
    const h = t.common.home.highlights;

    const items = [
        { key: 'support', Icon: Headphones, ...h.support },
        { key: 'fastShipping', Icon: Truck, ...h.fastShipping },
        { key: 'original', Icon: Cog, ...h.original },
        { key: 'trust', Icon: Handshake, ...h.trust },
    ];

    return (
        <ul className="grid grid-cols-4 rounded-2xl border border-white/10 bg-white/[0.03]">
            {items.map(({ key, Icon, title, desc }) => (
                <li key={key} className="not-first:border-s border-white/10 flex flex-col md:flex-row items-center justify-center gap-1 md:gap-3 py-3 md:py-4 lg:py-5 px-1 text-center md:text-start">
                    <span className="md:w-10 md:h-10 lg:w-12 lg:h-12 md:rounded-full md:border md:border-gold-500/40 md:bg-gold-500/10 flex items-center justify-center shrink-0">
                        <Icon size={20} className="text-gold-400" aria-hidden="true" />
                    </span>
                    <span className="flex flex-col">
                        <span className="text-[10px] sm:text-xs md:text-sm lg:text-base font-bold text-white leading-tight">{title}</span>
                        <span className="hidden md:block text-xs lg:text-sm text-white/55">{desc}</span>
                    </span>
                </li>
            ))}
        </ul>
    );
};
