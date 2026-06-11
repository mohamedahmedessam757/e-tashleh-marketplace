import React from 'react';
import { motion } from 'framer-motion';
import { User, Store, ShoppingCart, HelpCircle, ArrowLeft, ArrowRight, TrendingUp } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { LandingFooter } from './LandingFooter';

interface RoleSelectionScreenProps {
    onCustomerClick: () => void;
    onMerchantClick: () => void;
    onWholesaleClick: () => void;
    onHowWeWorkClick: () => void;
    onOpenSupport: () => void;
    onAdminClick: () => void;
    onNavigateToLegal: (section: 'terms' | 'privacy') => void;
    onNavigateToLandingSection: (section: string) => void;
    onEarnIncomeClick: () => void;
    onNavigateToLicense?: () => void;
}

export const RoleSelectionScreen: React.FC<RoleSelectionScreenProps> = ({
    onCustomerClick,
    onMerchantClick,
    onWholesaleClick,
    onHowWeWorkClick,
    onOpenSupport,
    onAdminClick,
    onNavigateToLegal,
    onNavigateToLandingSection,
    onEarnIncomeClick,
    onNavigateToLicense,
}) => {
    const { t, language } = useLanguage();
    const isAr = language === 'ar';
    const ArrowIcon = isAr ? ArrowLeft : ArrowRight;

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.15,
                delayChildren: 0.3,
            },
        },
    };

    const itemVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: {
            opacity: 1,
            y: 0,
            transition: { type: "spring", stiffness: 300, damping: 24 }
        },
    };

    return (
        <div className="min-h-screen bg-[#1A1814] flex flex-col relative overflow-x-hidden">

            {/* Background Elements - Fixed */}
            <div className="fixed top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
                <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] bg-gold-500/5 rounded-full blur-[100px]" />
                <div className="absolute bottom-[-10%] left-[-5%] w-[500px] h-[500px] bg-white/5 rounded-full blur-[100px]" />
                <div
                    className="absolute inset-0 opacity-[0.03]"
                    style={{
                        backgroundImage: `linear-gradient(to right, #ffffff 1px, transparent 1px), linear-gradient(to bottom, #ffffff 1px, transparent 1px)`,
                        backgroundSize: '40px 40px'
                    }}
                />
            </div>

            {/* Main Content Area - Grow to fill space, center vertically if possible */}
            <div className="flex-grow flex items-center justify-center p-4 z-10 py-12 md:py-20">
                <motion.div
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                    className="w-full max-w-md flex flex-col items-center gap-8"
                >
                    {/* Logo Section */}
                    <motion.div variants={itemVariants} className="flex flex-col items-center mb-4">
                        <div className="relative mb-6 group">
                            <div className="absolute inset-0 bg-gold-500 blur-2xl opacity-20 group-hover:opacity-30 transition-opacity duration-500" />
                            <div className="w-24 h-24 md:w-28 md:h-28 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 flex items-center justify-center shadow-2xl relative z-10">
                                <img
                                    src="/logo.png"
                                    alt="E-Tashleh Logo"
                                    className="w-full h-full object-contain p-4 brightness-0 invert drop-shadow-md"
                                />
                            </div>
                        </div>
                        <h1 className="text-3xl md:text-4xl font-bold text-white text-center tracking-tight">
                            {language === 'ar' ? 'إي تشليح' : 'E-TASHLEH'}
                        </h1>
                        <p className="text-gold-400 text-sm tracking-[0.2em] uppercase mt-2 opacity-80">
                            Used Auto Parts
                        </p>
                    </motion.div>

                    {/* Buttons Section */}
                    <div className="w-full space-y-4">

                        {/* Customer Button */}
                        <motion.button
                            variants={itemVariants}
                            onClick={onCustomerClick}
                            whileHover={{ scale: 1.02, x: isAr ? -5 : 5 }}
                            whileTap={{ scale: 0.98 }}
                            className="w-full group relative overflow-hidden rounded-xl p-4 flex items-center justify-between transition-all duration-300"
                            style={{
                                background: 'linear-gradient(135deg, rgba(156, 138, 90, 0.9), rgba(138, 120, 75, 0.8))',
                                border: '1px solid rgba(156, 138, 90, 0.5)',
                                boxShadow: '0 4px 20px rgba(156, 138, 90, 0.2)'
                            }}
                        >
                            <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-full bg-black/20 flex items-center justify-center text-white">
                                    <User size={20} />
                                </div>
                                <span className="text-lg font-bold text-white">
                                    {t.common.roleSelection?.customerOrders || 'طلبات القطع للعملاء'}
                                </span>
                            </div>
                            <ArrowIcon className="text-white/80 group-hover:text-white transition-colors" />
                        </motion.button>

                        {/* Merchant Button */}
                        <motion.button
                            variants={itemVariants}
                            onClick={onMerchantClick}
                            whileHover={{ scale: 1.02, x: isAr ? -5 : 5 }}
                            whileTap={{ scale: 0.98 }}
                            className="w-full group relative overflow-hidden rounded-xl p-4 flex items-center justify-between transition-all duration-300"
                            style={{
                                background: 'linear-gradient(135deg, rgba(232, 122, 45, 0.9), rgba(200, 100, 35, 0.8))',
                                border: '1px solid rgba(232, 122, 45, 0.5)',
                                boxShadow: '0 4px 20px rgba(232, 122, 45, 0.2)'
                            }}
                        >
                            <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-full bg-black/20 flex items-center justify-center text-white">
                                    <Store size={20} />
                                </div>
                                <span className="text-lg font-bold text-white">
                                    {t.common.roleSelection?.storeLogin || 'دخول المتاجر'}
                                </span>
                            </div>
                            <ArrowIcon className="text-white/80 group-hover:text-white transition-colors" />
                        </motion.button>

                        {/* Wholesale Button */}
                        <motion.button
                            variants={itemVariants}
                            onClick={onWholesaleClick}
                            whileHover={{ scale: 1.02, x: isAr ? -5 : 5 }}
                            whileTap={{ scale: 0.98 }}
                            className="w-full group relative overflow-hidden rounded-xl p-4 flex items-center justify-between transition-all duration-300"
                            style={{
                                background: 'linear-gradient(135deg, rgba(46, 150, 94, 0.9), rgba(35, 120, 75, 0.8))',
                                border: '1px solid rgba(46, 150, 94, 0.5)',
                                boxShadow: '0 4px 20px rgba(46, 150, 94, 0.2)'
                            }}
                        >
                            <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-full bg-black/20 flex items-center justify-center text-white">
                                    <ShoppingCart size={20} />
                                </div>
                                <span className="text-lg font-bold text-white">
                                    {t.common.roleSelection?.wholesaleOrders || 'دخول طلبات الجملة للشركات'}
                                </span>
                            </div>
                            <ArrowIcon className="text-white/80 group-hover:text-white transition-colors" />
                        </motion.button>

                        {/* Earn Income Button (New 2026 Feature) - Attention Grabbing Red Style */}
                        <motion.button
                            variants={itemVariants}
                            onClick={onEarnIncomeClick}
                            whileHover={{ scale: 1.05, y: -2 }}
                            whileTap={{ scale: 0.98 }}
                            className="w-full group relative overflow-hidden rounded-xl p-5 flex items-center justify-between transition-all duration-300"
                            style={{
                                background: 'linear-gradient(135deg, #ef4444, #b91c1c)',
                                border: '1px solid rgba(255, 255, 255, 0.2)',
                                boxShadow: '0 8px 32px rgba(239, 68, 68, 0.3)'
                            }}
                        >
                            {/* Animated Shine Effect */}
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-shine transition-transform" />
                            
                            <div className="flex items-center gap-4 relative z-10">
                                <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center text-white border border-white/30 group-hover:scale-110 transition-transform shadow-inner">
                                    <TrendingUp size={24} />
                                </div>
                                <div className="flex flex-col items-start">
                                    <span className="text-xl font-black text-white leading-tight tracking-tight uppercase italic font-outfit">
                                        {t.common.roleSelection?.earnIncome || 'اكسب دخل شهري معنا'}
                                    </span>
                                    <span className="text-[11px] text-white/80 font-bold uppercase tracking-wider mt-0.5">
                                        {t.common.roleSelection?.earnIncomeDesc || 'كل طلب = ربح كاش يُضاف إلى محفظتك'}
                                    </span>
                                </div>
                            </div>
                            <div className="bg-black/20 p-2 rounded-full backdrop-blur-md border border-white/10 group-hover:bg-black/40 group-hover:border-white/20 transition-all">
                                <ArrowIcon size={20} className="text-white group-hover:translate-x-0.5 transition-transform" />
                            </div>
                        </motion.button>

                    </div>

                    {/* Divider */}
                    <motion.div variants={itemVariants} className="w-full h-px bg-gradient-to-r from-transparent via-white/10 to-transparent my-2" />

                    {/* New Feature Button */}
                    <motion.button
                        variants={itemVariants}
                        onClick={onHowWeWorkClick}
                        whileHover={{ scale: 1.03 }}
                        className="flex items-center gap-2 group px-6 py-3 rounded-full bg-white/5 border border-white/5 hover:border-gold-500/30 hover:bg-white/10 transition-all"
                    >
                        <HelpCircle size={16} className="text-gold-400 group-hover:text-gold-300" />
                        <span className="text-sm text-white/70 group-hover:text-white transition-colors">
                            {t.common.roleSelection?.howWeWork || 'تعرّف على طريقة عملنا قبل أن تبدأ معنا'}
                        </span>
                    </motion.button>

                </motion.div>
            </div>

            {/* Footer Section */}
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

