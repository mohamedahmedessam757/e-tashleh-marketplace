import React from 'react';
import { motion } from 'framer-motion';
import { Wrench, Truck, CreditCard, Video, FileCheck, ShieldCheck, FileText, ArrowLeft, ArrowRight } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { LandingFooter } from './LandingFooter';
import { LanguageToggle } from './ui/LanguageToggle';

interface HowWeWorkScreenProps {
    onComplete: () => void; // "Order Now" -> Role Selection
    onTutorial: () => void; // "كيف نعمل" -> Tutorial Page
    onBack: () => void;     // "How We Work" -> Landing Page
    onTermsClick: () => void; // "Terms" -> Terms Page
    onOpenSupport: () => void;
    onAdminClick: () => void;
    onNavigateToLegal: (section: 'terms' | 'privacy') => void;
    onNavigateToLandingSection: (section: string) => void;
    onNavigateToLicense?: () => void;
}

export const HowWeWorkScreen: React.FC<HowWeWorkScreenProps> = ({
    onComplete,
    onTutorial,
    onBack,
    onTermsClick,
    onOpenSupport,
    onAdminClick,
    onNavigateToLegal,
    onNavigateToLandingSection,
    onNavigateToLicense,
}) => {
    const { t, language } = useLanguage();

    // Access roleSelection from t.common if available.
    // Fallback to t.roleSelection if spread (though in our case it's in common)
    const roleSelection = t.common?.roleSelection || (t as any).roleSelection;

    // Safety check if translations are missing (prevents empty text)
    const safeTitle = roleSelection?.features?.title || 'معنا... تشاليح الإمارات توصلك وفلوسك بأمان';

    // Feature List Configuration
    const features = [
        { icon: Wrench, text: roleSelection?.features?.originalParts || 'قطع غيار أصلية مستعملة', color: 'text-gray-400' },
        { icon: Truck, text: roleSelection?.features?.shipping || 'توصيل للخليج', color: 'text-orange-400' },
        { icon: CreditCard, text: roleSelection?.features?.payment || 'الدفع آمن', color: 'text-yellow-400' },
        { icon: Video, text: roleSelection?.features?.video || 'فحص بالفيديو', color: 'text-gray-400' },
        { icon: FileCheck, text: roleSelection?.features?.documentation || 'توثيق المعاينة', color: 'text-gray-300' },
        { icon: ShieldCheck, text: roleSelection?.features?.guarantee || 'ضمان الشحن', color: 'text-green-500' },
        { icon: FileText, text: roleSelection?.features?.terms || 'الشروط والأحكام', color: 'text-gray-400', isLink: true, onClick: onTermsClick }
    ];

    const ArrowIcon = language === 'ar' ? ArrowLeft : ArrowRight;

    return (
        <div className="min-h-screen bg-[#1A1814] flex flex-col relative overflow-x-hidden">

            <div className="fixed top-4 z-20 end-4">
                <LanguageToggle compact />
            </div>

            {/* Background Effects - Fixed */}
            <div className="fixed inset-0 z-0 pointer-events-none">
                <div className="absolute inset-0 bg-luxury-gradient opacity-20" />
                <div className="absolute top-0 left-0 w-full h-full "
                    style={{
                        backgroundImage: `
                        linear-gradient(to right, rgba(255, 255, 255, 0.03) 1px, transparent 1px),
                        linear-gradient(to bottom, rgba(255, 255, 255, 0.03) 1px, transparent 1px)
                    `,
                        backgroundSize: '60px 60px',
                    }}
                />
            </div>

            <div className="relative z-10 w-full max-w-4xl mx-auto px-6 py-12 md:py-16">

                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center mb-8"
                >
                    <h1 className="text-2xl md:text-3xl font-bold text-white leading-relaxed">
                        {safeTitle} 🚗
                    </h1>
                </motion.div>

                {/* Features List */}
                <div className="flex flex-col items-center mb-10 w-full">
                    <div className="space-y-5 w-fit max-w-xl">
                        {features.map((feature, index) => (
                            <motion.div
                                key={index}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.1 }}
                                className="flex items-center gap-6 p-3 rounded-xl hover:bg-white/5 transition-colors w-full"
                            >
                                <div className={`shrink-0 ${feature.color}`}>
                                    <feature.icon size={28} strokeWidth={1.5} />
                                </div>
                                <div className="text-white/90 text-base md:text-lg leading-relaxed font-medium">
                                    {feature.isLink ? (
                                        <button
                                            onClick={feature.onClick}
                                            className="cursor-pointer border-b border-white/30 hover:text-gold-400 hover:border-gold-400 transition-colors text-right"
                                        >
                                            {feature.text}
                                        </button>
                                    ) : (
                                        <span className="block text-right">{feature.text}</span>
                                    )}
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>

                {/* Actions */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.8 }}
                    className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full px-4"
                >
                    {/* Learn How We Work -> Tutorial */}
                    <button
                        onClick={onTutorial}
                        className="w-full sm:w-auto px-8 py-4 bg-transparent border border-gold-500/50 hover:border-gold-400 hover:bg-gold-500/10 text-gold-400 rounded-xl font-bold transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                    >
                        <FileText size={20} />
                        {language === 'ar' ? 'كيف نعمل' : 'How we work'}
                    </button>

                    {/* Continue Order -> Login */}
                    <button
                        onClick={onComplete}
                        className="w-full sm:w-auto px-10 py-4 bg-gradient-to-r from-gold-600 to-gold-400 hover:from-gold-500 hover:to-gold-300 text-white rounded-xl font-bold shadow-[0_4px_20px_rgba(168,139,62,0.3)] hover:shadow-[0_6px_25px_rgba(168,139,62,0.4)] transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                    >
                        {language === 'ar' && <ArrowIcon size={20} />}
                        {language === 'ar' ? 'انتقل للطلب الآن' : 'Order Now'}
                        {language !== 'ar' && <ArrowIcon size={20} />}
                    </button>
                </motion.div>
            </div>

            {/* Spacer to push footer to bottom if content is short */}
            <div className="flex-grow"></div>

            {/* Footer Section */}
            <div className="relative z-10 w-full mt-12 bg-[#1A1814]">
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
