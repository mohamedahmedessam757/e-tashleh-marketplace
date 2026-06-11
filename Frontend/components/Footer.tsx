
import React from 'react';
import { Container } from './ui/Container';
import { NomoBadge } from './ui/NomoBadge';
import { Headset, MapPin, Mail, Phone } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { SITE_CONTACT_EMAIL } from '../config/site';

interface FooterProps {
    onOpenSupport: () => void;
    onAdminClick: () => void;
    onNavigateToLicense?: () => void;
}

export const Footer: React.FC<FooterProps> = ({ onOpenSupport, onAdminClick, onNavigateToLicense }) => {
    const { t, language } = useLanguage();

    return (
        <footer className="border-t border-white/10 bg-[#1A1814]/80 backdrop-blur-lg pt-12 pb-6">
            <Container>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
                    {/* Brand Column */}
                    <div className={`flex flex-col items-center lg:items-start ${language === 'ar' ? 'lg:text-right' : 'lg:text-left'} text-center lg:text-start`}>
                        <div className="flex items-center gap-2 mb-4">
                            <img
                                src="/logo.png"
                                alt="E-Tashleh Logo"
                                className="w-12 h-12 object-contain brightness-0 invert"
                            />
                            <span className="text-xl font-bold text-white tracking-wide">E-Tashleh</span>
                        </div>
                        <p className="text-white/40 text-xs leading-relaxed mb-4 max-w-xs">
                            {t.about.description}
                        </p>
                        <NomoBadge onClick={onNavigateToLicense} />
                    </div>

                    {/* Contact Column */}
                    <div className="text-center lg:text-start">
                        <h3 className="text-gold-400 font-bold mb-4">{t.support.title}</h3>
                        <ul className="space-y-3">
                            <li className="flex items-center gap-3 justify-center lg:justify-start text-white/70 text-sm">
                                <Mail size={16} className="text-gold-500 shrink-0" />
                                <a href={`mailto:${SITE_CONTACT_EMAIL}`} className="hover:text-white transition-colors">{SITE_CONTACT_EMAIL}</a>
                            </li>
                            <li className="flex items-center gap-3 justify-center lg:justify-start text-white/70 text-sm">
                                <Phone size={16} className="text-gold-500 shrink-0" />
                                <a href="tel:0525700525" className="hover:text-white transition-colors">0525700525</a>
                            </li>
                            <li className="flex items-start gap-3 justify-center lg:justify-start text-white/70 text-sm">
                                <MapPin size={16} className="text-gold-500 shrink-0 mt-1" />
                                <span>{t.stats.hq.sub} - {t.stats.hq.value}</span>
                            </li>
                        </ul>
                    </div>

                    {/* Company Info Column */}
                    <div className="text-center lg:text-start">
                        <h3 className="text-gold-400 font-bold mb-4">{t.footer.company}</h3>
                        <ul className="space-y-2 text-sm text-white/60">
                            <li>{(t.footer as any).companyInfo?.name}</li>
                            <li>{(t.footer as any).companyInfo?.license}</li>
                            <li>{(t.footer as any).companyInfo?.cr}</li>
                            <li className="text-xs mt-2 text-white/30">{(t.footer as any).companyInfo?.address}</li>
                        </ul>
                    </div>

                    {/* Quick Actions */}
                    <div className="flex flex-col items-center lg:items-end gap-4">
                        <button
                            onClick={onOpenSupport}
                            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-gold-600 to-gold-500 text-white shadow-lg hover:shadow-gold-500/20 transition-all group w-full sm:w-auto justify-center"
                        >
                            <Headset size={18} />
                            <span>{t.footer.support}</span>
                        </button>
                    </div>
                </div>

                <div className="text-center border-t border-white/10 pt-6 text-white/30 text-xs">
                    <p>{t.footer.rights}</p>
                    <button
                        onClick={onAdminClick}
                        className="mt-1 opacity-50 hover:opacity-100 hover:text-gold-400 transition-all cursor-pointer"
                    >
                        {t.footer.secureBadge}
                    </button>
                </div>
            </Container>
        </footer>
    );
};
