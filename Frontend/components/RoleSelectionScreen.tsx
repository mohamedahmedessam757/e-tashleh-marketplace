import React, { useState } from 'react';
import { LandingFooter } from './LandingFooter';
import { CustomerShippingNotice } from './home/CustomerShippingNotice';
import { HomeNavbar } from './home/HomeNavbar';
import { HomeHero } from './home/HomeHero';
import { HomeFeatureCards } from './home/HomeFeatureCards';
import { HomePrimaryCta } from './home/HomePrimaryCta';
import { HomeRoleButtons } from './home/HomeRoleButtons';
import { HomeEarnBanner } from './home/HomeEarnBanner';
import { HomeHighlights } from './home/HomeHighlights';

interface RoleSelectionScreenProps {
    onCustomerClick: () => void;
    onMerchantClick: () => void;
    onWholesaleClick: () => void;
    onHowWeWorkClick: () => void;
    onFaqClick: () => void;
    onAboutClick: () => void;
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
    onHowWeWorkClick,
    onFaqClick,
    onAboutClick,
    onOpenSupport,
    onAdminClick,
    onNavigateToLegal,
    onNavigateToLandingSection,
    onEarnIncomeClick,
    onNavigateToLicense,
}) => {
    const [customerNoticeOpen, setCustomerNoticeOpen] = useState(false);
    const openCustomerNotice = () => setCustomerNoticeOpen(true);
    const closeCustomerNotice = () => {
        setCustomerNoticeOpen(false);
        onCustomerClick();
    };

    return (
        <div className="min-h-screen bg-[#1A1814] flex flex-col overflow-x-hidden">
            <HomeNavbar
                active="home"
                onHome={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                onAbout={onAboutClick}
                onHowWeWork={onHowWeWorkClick}
                onFaq={onFaqClick}
                onContact={onOpenSupport}
            />

            <main className="flex-grow">
                <HomeHero />
                <div className="relative z-10 max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-10 -mt-12 md:-mt-20 pb-12 md:pb-16 flex flex-col gap-4 md:gap-5 lg:gap-6">
                    <HomeFeatureCards />
                    <HomePrimaryCta onClick={openCustomerNotice} />
                    <HomeRoleButtons
                        onCustomerClick={openCustomerNotice}
                        onMerchantClick={onMerchantClick}
                        onWholesaleClick={onWholesaleClick}
                        onEarnIncomeClick={onEarnIncomeClick}
                    />
                    <HomeEarnBanner onClick={onEarnIncomeClick} />
                    <HomeHighlights />
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

            <CustomerShippingNotice open={customerNoticeOpen} onClose={closeCustomerNotice} />
        </div>
    );
};
