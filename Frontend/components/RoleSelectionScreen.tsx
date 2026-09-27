import React from 'react';
import { LandingFooter } from './LandingFooter';
import { HomeNavbar } from './home/HomeNavbar';
import { HomeHero } from './home/HomeHero';
import { HomeFeatureCards } from './home/HomeFeatureCards';
import { HomePrimaryCta } from './home/HomePrimaryCta';
import { HomeRoleButtons } from './home/HomeRoleButtons';
import { HomeEarnBanner } from './home/HomeEarnBanner';
import { HomeHighlights } from './home/HomeHighlights';
import { HomeFaq } from './home/HomeFaq';

interface RoleSelectionScreenProps {
    onCustomerClick: () => void;
    onMerchantClick: () => void;
    onWholesaleClick: () => void;
    onOpenSupport: () => void;
    onAdminClick: () => void;
    onNavigateToLegal: (section: 'terms' | 'privacy' | 'wallet-loyalty') => void;
    onNavigateToLandingSection: (section: string) => void;
    onEarnIncomeClick: () => void;
    onNavigateToLicense?: () => void;
}

export const RoleSelectionScreen: React.FC<RoleSelectionScreenProps> = ({
    onCustomerClick,
    onMerchantClick,
    onWholesaleClick,
    onOpenSupport,
    onAdminClick,
    onNavigateToLegal,
    onNavigateToLandingSection,
    onEarnIncomeClick,
    onNavigateToLicense,
}) => {
    return (
        <div className="min-h-screen bg-[#1A1814] flex flex-col overflow-x-hidden">
            <HomeNavbar
                onHome={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                onAbout={() => onNavigateToLandingSection('about')}
                onHowWeWork={() => onNavigateToLandingSection('how-it-works')}
                onFaq={() => document.getElementById('faq')?.scrollIntoView({ behavior: 'smooth' })}
                onContact={onOpenSupport}
            />

            <main className="flex-grow">
                <HomeHero />
                <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 -mt-12 md:-mt-16 flex flex-col gap-4 md:gap-5">
                    <HomeFeatureCards />
                    <HomePrimaryCta onClick={onCustomerClick} />
                    <HomeRoleButtons
                        onCustomerClick={onCustomerClick}
                        onMerchantClick={onMerchantClick}
                        onWholesaleClick={onWholesaleClick}
                        onEarnIncomeClick={onEarnIncomeClick}
                    />
                    <HomeEarnBanner onClick={onEarnIncomeClick} />
                    <HomeHighlights />
                    <HomeFaq />
                </div>
            </main>

            <div className="relative z-10">
                <LandingFooter
                    onOpenSupport={onOpenSupport}
                    onAdminClick={onAdminClick}
                    onNavigateToLegal={onNavigateToLegal}
                    onNavigateToLandingSection={onNavigateToLandingSection}
                    onNavigateToLicense={onNavigateToLicense}
                />
            </div>
        </div>
    );
};
