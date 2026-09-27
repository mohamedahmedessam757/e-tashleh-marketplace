import React, { useEffect } from 'react';
import { HomeNavbar } from './HomeNavbar';
import { HomeFaq } from './HomeFaq';
import { LandingFooter } from '../LandingFooter';

interface FaqPageProps {
    onHome: () => void;
    onAbout: () => void;
    onHowWeWork: () => void;
    onOpenSupport: () => void;
    onAdminClick: () => void;
    onNavigateToLegal: (section: 'terms' | 'privacy' | 'wallet-loyalty') => void;
    onNavigateToLandingSection: (section: string) => void;
    onNavigateToLicense?: () => void;
}

export const FaqPage: React.FC<FaqPageProps> = ({
    onHome,
    onAbout,
    onHowWeWork,
    onOpenSupport,
    onAdminClick,
    onNavigateToLegal,
    onNavigateToLandingSection,
    onNavigateToLicense,
}) => {
    useEffect(() => {
        window.scrollTo({ top: 0 });
    }, []);

    return (
        <div className="min-h-screen bg-[#1A1814] flex flex-col overflow-x-hidden">
            <HomeNavbar
                active="faq"
                onHome={onHome}
                onAbout={onAbout}
                onHowWeWork={onHowWeWork}
                onFaq={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                onContact={onOpenSupport}
            />

            <main className="flex-grow relative">
                <div className="absolute inset-x-0 top-0 h-72 pointer-events-none bg-gradient-to-b from-gold-500/10 to-transparent" />
                <div className="relative max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-10 pt-6 md:pt-10 pb-12">
                    <HomeFaq />
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
