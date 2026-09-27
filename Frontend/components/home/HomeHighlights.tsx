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
        <ul className="grid grid-cols-4 rounded-2xl border border-white/10 bg-white/[0.03] divide-x divide-white/10 rtl:divide-x-reverse">
            {items.map(({ key, Icon, title, desc }) => (
                <li key={key} className="flex flex-col md:flex-row items-center justify-center gap-1 md:gap-3 py-3 md:py-4 px-1 text-center md:text-start">
                    <Icon size={20} className="text-gold-400 shrink-0" aria-hidden="true" />
                    <span className="flex flex-col">
                        <span className="text-[10px] sm:text-xs md:text-sm font-bold text-white leading-tight">{title}</span>
                        <span className="hidden md:block text-xs text-white/55">{desc}</span>
                    </span>
                </li>
            ))}
        </ul>
    );
};
