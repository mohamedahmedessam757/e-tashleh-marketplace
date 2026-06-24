import React from 'react';
import { Container } from './ui/Container';
import { NomoBadge } from './ui/NomoBadge';
import {
  IconShield,
  IconFileText,
  IconWallet,
  IconMail,
  IconInfo,
  IconCog,
  IconPhone,
  IconHelpCircle,
  IconMapPin,
  IconBuilding,
} from './ui/FooterIcons';
import { useLanguage } from '../contexts/LanguageContext';
import { LANDING_WHATSAPP_NUMBER } from '../config/site';

interface LandingFooterProps {
    onOpenSupport: () => void;
    onAdminClick: () => void;
    onNavigateToLegal: (section: 'terms' | 'privacy' | 'wallet-loyalty') => void;
    onNavigateToLandingSection: (section: string) => void;
    onNavigateToLicense?: () => void;
}

export const LandingFooter: React.FC<LandingFooterProps> = ({ onOpenSupport, onAdminClick, onNavigateToLegal, onNavigateToLandingSection, onNavigateToLicense }) => {
    const { t } = useLanguage();

    const links = [
        {
            label: t.common.footer.privacy,
            href: '#',
            icon: <IconShield size={16} />,
            onClick: (e: React.MouseEvent) => { e.preventDefault(); onNavigateToLegal('privacy'); }
        },
        {
            label: t.common.footer.terms,
            href: '#',
            icon: <IconFileText size={16} />,
            onClick: (e: React.MouseEvent) => { e.preventDefault(); onNavigateToLegal('terms'); }
        },
        {
            label: t.common.footer.walletLoyaltyTerms,
            href: '#',
            icon: <IconWallet size={16} />,
            onClick: (e: React.MouseEvent) => { e.preventDefault(); onNavigateToLegal('wallet-loyalty'); }
        },
        {
            label: t.common.footer.contact,
            href: '#',
            icon: <IconMail size={16} />,
            onClick: (e: React.MouseEvent) => { e.preventDefault(); onOpenSupport(); }
        },
        {
            label: t.common.footer.about,
            href: '#',
            icon: <IconInfo size={16} />,
            onClick: (e: React.MouseEvent) => { e.preventDefault(); onNavigateToLandingSection('about'); }
        },
        {
            label: t.common.footer.howWeWork,
            href: '#',
            icon: <IconCog size={16} />,
            onClick: (e: React.MouseEvent) => { e.preventDefault(); onNavigateToLandingSection('how-it-works'); }
        },
    ];

    return (
        <footer className="w-full bg-[#1A1814] text-white py-12 border-t border-white/10 relative overflow-hidden mt-auto">
            <div className="absolute inset-0 opacity-[0.03] pointer-events-none"
                style={{
                    backgroundImage: `radial-gradient(circle at 50% 50%, #D4AF37 1px, transparent 1px)`,
                    backgroundSize: '40px 40px'
                }}
            />

            <Container className="relative z-10 text-center">
                <div className="flex flex-col items-center gap-10">

                    <div className="flex flex-wrap justify-center items-center gap-x-8 gap-y-4">
                        {links.map((link, idx) => (
                            <a
                                key={idx}
                                href={link.href}
                                onClick={link.onClick}
                                className="flex items-center gap-2 text-white/80 hover:text-gold-400 transition-colors group font-medium text-sm"
                            >
                                <span className="text-gold-500 group-hover:scale-110 transition-transform duration-300">
                                    {link.icon}
                                </span>
                                <span>{link.label}</span>
                            </a>
                        ))}
                    </div>

                    <div className="flex flex-wrap items-center justify-center gap-12 mt-2">

                        <div className="flex flex-col items-center gap-2 group cursor-pointer">
                            <a
                                href={`https://wa.me/${LANDING_WHATSAPP_NUMBER}`}
                                target="_blank"
                                rel="noreferrer"
                                className="w-12 h-12 rounded-full bg-[#25D366] text-white flex items-center justify-center shadow-lg hover:bg-[#1DA851] transition-all transform hover:scale-105 hover:shadow-[#25D366]/40"
                                title={t.common.footer.whatsappBusiness}
                            >
                                <IconPhone size={20} />
                            </a>
                            <span className="text-sm font-bold text-white/90">{t.common.footer.whatsappBusiness}</span>
                        </div>

                        <div className="flex items-center gap-3">
                            <div className="transform hover:scale-105 transition-transform duration-300">
                                <NomoBadge onClick={onNavigateToLicense} />
                            </div>
                        </div>

                        <div className="flex flex-col items-center gap-2 group cursor-pointer" onClick={onOpenSupport}>
                            <button
                                type="button"
                                className="w-12 h-12 rounded-full bg-[#F59E0B] text-white flex items-center justify-center shadow-lg hover:bg-[#D97706] transition-all transform hover:scale-105 hover:shadow-[#F59E0B]/40"
                            >
                                <IconHelpCircle size={20} />
                            </button>
                            <span className="text-sm font-bold text-white/90">{t.common.footer.contact}</span>
                        </div>
                    </div>

                    <div className="flex flex-col items-center gap-2 mt-4 text-white/70 text-xs sm:text-sm font-medium">
                        <div className="flex flex-wrap justify-center gap-x-8 gap-y-2">
                            <span className="flex items-center gap-2">
                                <IconMapPin size={16} className="text-gold-500" />
                                {t.common.footer.location}
                            </span>
                            <span className="flex items-center gap-2">
                                <IconFileText size={16} className="text-gold-500" />
                                {t.common.footer.cr}
                            </span>
                            <span className="flex items-center gap-2">
                                <IconBuilding size={16} className="text-gold-500" />
                                {t.common.footer.businessCenter}
                            </span>
                        </div>

                        <p className="text-white/60 mt-1">
                            {t.common.footer.capital}
                        </p>
                    </div>

                    <div className="w-full border-t border-white/5 pt-6 relative flex items-center justify-center">
                        <p className="text-white/40 text-xs dir-ltr">
                            {t.common.footer.copyright}
                        </p>

                        <button
                            type="button"
                            onClick={onAdminClick}
                            className="absolute right-0 bottom-0 opacity-0 hover:opacity-10 p-2 transition-opacity"
                        >
                            <IconShield size={12} className="text-white" />
                        </button>
                    </div>

                </div>
            </Container>
        </footer>
    );
};
