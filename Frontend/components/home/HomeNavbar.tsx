import React, { useEffect, useState } from 'react';
import { Menu, X } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { LanguageToggle } from '../ui/LanguageToggle';

interface HomeNavbarProps {
    onHome: () => void;
    onAbout: () => void;
    onHowWeWork: () => void;
    onFaq: () => void;
    onContact: () => void;
    active?: 'home' | 'faq' | 'about';
}

const FOCUS_RING = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-400 rounded-md';

export const HomeNavbar: React.FC<HomeNavbarProps> = ({ onHome, onAbout, onHowWeWork, onFaq, onContact, active = 'home' }) => {
    const { t } = useLanguage();
    const nav = t.common.home.nav;
    const [open, setOpen] = useState(false);

    useEffect(() => {
        if (!open) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setOpen(false);
        };
        const onResize = () => {
            if (window.innerWidth >= 1024) setOpen(false);
        };
        window.addEventListener('keydown', onKey);
        window.addEventListener('resize', onResize);
        return () => {
            window.removeEventListener('keydown', onKey);
            window.removeEventListener('resize', onResize);
        };
    }, [open]);

    const items = [
        { key: 'home', label: nav.home, onClick: onHome, active: active === 'home' },
        { key: 'about', label: nav.about, onClick: onAbout, active: active === 'about' },
        { key: 'how', label: nav.howWeWork, onClick: onHowWeWork, active: false },
        { key: 'faq', label: nav.faq, onClick: onFaq, active: active === 'faq' },
        { key: 'contact', label: nav.contact, onClick: onContact, active: false },
    ];

    const handleItem = (fn: () => void) => {
        setOpen(false);
        fn();
    };

    const logo = (
        <button type="button" onClick={() => handleItem(onHome)} className={`shrink-0 ${FOCUS_RING}`} aria-label="E-TASHLEH">
            <img
                src="/logo.webp"
                alt="E-TASHLEH"
                width={80}
                height={80}
                fetchPriority="high"
                decoding="async"
                className="h-14 w-14 lg:h-[72px] lg:w-[72px] object-contain"
            />
        </button>
    );

    return (
        <header className="sticky top-0 z-40 bg-[#1A1814]/85 backdrop-blur-md border-b border-white/10">
            <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-10 h-16 lg:h-20 flex items-center justify-between gap-4">
                {/* Mobile: hamburger at start */}
                <button
                    type="button"
                    onClick={() => setOpen((v) => !v)}
                    aria-label={open ? nav.closeMenu : nav.openMenu}
                    aria-expanded={open}
                    aria-controls="home-mobile-menu"
                    className={`lg:hidden w-10 h-10 flex items-center justify-center text-gold-400 ${FOCUS_RING}`}
                >
                    {open ? <X size={24} /> : <Menu size={24} />}
                </button>

                <div className="hidden lg:block">{logo}</div>
                <div className="lg:hidden absolute left-1/2 -translate-x-1/2">{logo}</div>

                <nav className="hidden lg:flex items-center gap-8 xl:gap-12">
                    {items.map((item) => (
                        <button
                            key={item.key}
                            type="button"
                            onClick={() => handleItem(item.onClick)}
                            aria-current={item.active ? 'page' : undefined}
                            className={`py-1 text-[15px] font-bold transition-colors ${FOCUS_RING} ${item.active
                                ? 'text-gold-400 border-b-2 border-gold-400 rounded-none'
                                : 'text-white/80 hover:text-gold-400'
                                }`}
                        >
                            {item.label}
                        </button>
                    ))}
                </nav>

                <LanguageToggle compact />
            </div>

            {open && (
                <nav
                    id="home-mobile-menu"
                    className="lg:hidden absolute inset-x-0 top-full bg-[#1A1814]/98 backdrop-blur-xl border-b border-white/10 shadow-2xl"
                >
                    <ul className="px-4 sm:px-6 py-2 flex flex-col">
                        {items.map((item) => (
                            <li key={item.key}>
                                <button
                                    type="button"
                                    onClick={() => handleItem(item.onClick)}
                                    aria-current={item.active ? 'page' : undefined}
                                    className={`w-full min-h-[44px] py-3 text-start text-base font-bold border-b border-white/5 last:border-b-0 transition-colors ${FOCUS_RING} ${item.active ? 'text-gold-400' : 'text-white/85 hover:text-gold-400'
                                        }`}
                                >
                                    {item.label}
                                </button>
                            </li>
                        ))}
                    </ul>
                </nav>
            )}
        </header>
    );
};
