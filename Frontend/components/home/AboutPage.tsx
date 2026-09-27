import React, { useEffect } from 'react';
import {
    BadgeCheck,
    Building2,
    Gift,
    Handshake,
    Quote,
    RotateCcw,
    ScanSearch,
    ShieldCheck,
    Target,
    Truck,
    Users,
    Wallet,
} from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { HomeNavbar } from './HomeNavbar';
import { LandingFooter } from '../LandingFooter';
import { NomoBadge } from '../ui/NomoBadge';

interface AboutPageProps {
    onHome: () => void;
    onHowWeWork: () => void;
    onFaq: () => void;
    onOpenSupport: () => void;
    onAdminClick: () => void;
    onNavigateToLegal: (section: 'terms' | 'privacy' | 'wallet-loyalty') => void;
    onNavigateToLandingSection: (section: string) => void;
    onNavigateToLicense?: () => void;
}

const HIGHLIGHT_ICONS = [ShieldCheck, ScanSearch, Truck, Wallet, RotateCcw, Gift];

const SECTION_HEADING = 'mt-14 text-2xl md:text-3xl font-black text-white flex items-center gap-3';

export const AboutPage: React.FC<AboutPageProps> = ({
    onHome,
    onHowWeWork,
    onFaq,
    onOpenSupport,
    onAdminClick,
    onNavigateToLegal,
    onNavigateToLandingSection,
    onNavigateToLicense,
}) => {
    const { t } = useLanguage();
    const a = t.common.home.about;

    useEffect(() => {
        window.scrollTo({ top: 0 });
    }, []);

    return (
        <div className="min-h-screen bg-[#1A1814] flex flex-col overflow-x-hidden">
            <HomeNavbar
                active="about"
                onHome={onHome}
                onAbout={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                onHowWeWork={onHowWeWork}
                onFaq={onFaq}
                onContact={onOpenSupport}
            />

            <main className="flex-grow relative">
                <div className="absolute inset-x-0 top-0 h-80 bg-gradient-to-b from-gold-500/10 to-transparent pointer-events-none" />
                <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-10">
                    <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-white text-center pt-10 md:pt-14">
                        {a.title}
                    </h1>
                    <p className="mt-5 max-w-4xl mx-auto text-center text-base md:text-lg text-white/75 leading-loose">
                        {a.intro}
                    </p>

                    <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {a.highlights.map((text, i) => {
                            const Icon = HIGHLIGHT_ICONS[i] ?? ShieldCheck;
                            return (
                                <div
                                    key={text}
                                    className="rounded-2xl border border-gold-500/25 bg-white/[0.03] p-5 flex items-start gap-3 hover:border-gold-400/60 transition-colors"
                                >
                                    <div className="w-11 h-11 shrink-0 rounded-full bg-gold-500/10 border border-gold-500/40 text-gold-400 flex items-center justify-center">
                                        <Icon size={20} aria-hidden />
                                    </div>
                                    <p className="text-white/85 font-bold leading-relaxed pt-2">{text}</p>
                                </div>
                            );
                        })}
                    </div>

                    <div className="mt-10 rounded-3xl border border-white/10 bg-gradient-to-br from-[#2a2419] to-[#1A1814] p-6 md:p-8 flex flex-col md:flex-row items-center gap-6">
                        <div className="w-14 h-14 shrink-0 rounded-2xl bg-gold-500/10 border border-gold-500/40 text-gold-400 flex items-center justify-center">
                            <Building2 size={26} aria-hidden />
                        </div>
                        <p className="flex-1 text-white/80 leading-loose text-start">{a.company}</p>
                        <div className="shrink-0">
                            <NomoBadge onClick={onNavigateToLicense} />
                        </div>
                    </div>

                    <div className="mt-10 relative rounded-3xl border border-gold-500/40 bg-gold-500/5 p-8 text-center">
                        <Quote size={36} className="mx-auto text-gold-400/60" aria-hidden />
                        <h2 className="mt-3 text-gold-400 font-black text-lg">{a.sloganTitle}</h2>
                        <p className="mt-3 text-xl md:text-2xl font-black text-white leading-relaxed">{a.slogan}</p>
                    </div>

                    <h2 className={SECTION_HEADING}>
                        <Target size={28} className="text-gold-400 shrink-0" aria-hidden />
                        {a.missionTitle}
                    </h2>
                    {a.mission.map((text) => (
                        <p key={text} className="mt-4 text-white/75 leading-loose">
                            {text}
                        </p>
                    ))}

                    <h2 className={SECTION_HEADING}>
                        <ShieldCheck size={28} className="text-gold-400 shrink-0" aria-hidden />
                        {a.guaranteesTitle}
                    </h2>
                    <ol className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                        {a.guarantees.map((text, i) => (
                            <li
                                key={text}
                                className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 flex items-start gap-4 hover:border-gold-500/40 transition-colors"
                            >
                                <span className="w-8 h-8 shrink-0 rounded-full bg-gold-400 text-[#1A1814] font-black flex items-center justify-center">
                                    {i + 1}
                                </span>
                                <p className="text-white/80 leading-loose">{text}</p>
                            </li>
                        ))}
                    </ol>

                    <h2 className="mt-14 text-xl md:text-2xl font-black text-white flex items-center gap-3">
                        <Handshake size={26} className="text-gold-400 shrink-0" aria-hidden />
                        {a.philosophyTitle}
                    </h2>
                    <ul className="mt-6 space-y-3">
                        {a.philosophy.map((text) => (
                            <li key={text} className="flex items-start gap-3 text-white/80 leading-loose">
                                <BadgeCheck size={20} className="text-gold-400 shrink-0 mt-1.5" aria-hidden />
                                <span>{text}</span>
                            </li>
                        ))}
                    </ul>

                    <div className="mt-10 mb-16 rounded-3xl border border-white/10 bg-white/[0.03] p-6 md:p-8 space-y-4">
                        <Users size={30} className="text-gold-400" aria-hidden />
                        {a.closing.map((text) => (
                            <p key={text} className="text-white/80 leading-loose">
                                {text}
                            </p>
                        ))}
                    </div>
                </div>
            </main>

            <LandingFooter
                onOpenSupport={onOpenSupport}
                onAdminClick={onAdminClick}
                onNavigateToLegal={onNavigateToLegal}
                onNavigateToLandingSection={onNavigateToLandingSection}
                onNavigateToLicense={onNavigateToLicense}
            />
        </div>
    );
};

export default AboutPage;
