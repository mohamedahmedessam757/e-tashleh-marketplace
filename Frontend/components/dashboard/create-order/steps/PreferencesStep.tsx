import React from 'react';
import { motion } from 'framer-motion';
import { Tag, ShieldCheck } from 'lucide-react';
import { useCreateOrderStore } from '../../../../stores/useCreateOrderStore';
import { useLanguage } from '../../../../contexts/LanguageContext';
import { GlassCard } from '../../../ui/GlassCard';

export const PreferencesStep: React.FC = () => {
    const { preferences, updatePreferences } = useCreateOrderStore();
    const { t, language } = useLanguage();
    const isRTL = language === 'ar';

    const PreferenceOption = ({
        id,
        icon: Icon,
        label,
        subLabel
    }: {
        id: 'new' | 'used',
        icon: any,
        label: string,
        subLabel: string
    }) => {
        const isSelected = preferences.condition === id;

        return (
            <GlassCard
                className={`
                    relative p-6 cursor-pointer group transition-all duration-300
                    ${isSelected
                        ? 'border-gold-500/50 bg-gold-500/10 shadow-[0_0_30px_rgba(234,179,8,0.1)]'
                        : 'border-white/5 hover:border-gold-500/30 hover:bg-white/5'}
                `}
                onClick={() => updatePreferences('condition', id)}
            >
                {/* Selection Ring */}
                <div className={`
                    absolute top-4 ${isRTL ? 'left-4' : 'right-4'} 
                    w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all duration-300
                    ${isSelected ? 'border-gold-500 bg-gold-500' : 'border-white/20 group-hover:border-gold-500/50'}
                `}>
                    {isSelected && <div className="w-2.5 h-2.5 rounded-full bg-black" />}
                </div>

                <div className="flex flex-col items-center text-center gap-4 mt-2">
                    <div className={`
                        p-4 rounded-2xl transition-all duration-300
                        ${isSelected ? 'bg-gold-500 text-black' : 'bg-white/5 text-gold-500 group-hover:scale-110'}
                    `}>
                        <Icon size={32} strokeWidth={1.5} />
                    </div>

                    <div>
                        <h3 className={`font-bold text-lg mb-1 transition-colors ${isSelected ? 'text-gold-400' : 'text-white'}`}>
                            {label}
                        </h3>
                        <p className="text-xs text-white/40 font-medium">
                            {subLabel}
                        </p>
                    </div>
                </div>

                {/* Glow Effect */}
                {isSelected && (
                    <motion.div
                        layoutId="outline"
                        className="absolute inset-0 border-2 border-gold-500 rounded-2xl"
                        initial={false}
                        transition={{ type: "spring", stiffness: 500, damping: 30 }}
                    />
                )}
            </GlassCard>
        );
    };

    return (
        <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-8"
        >
            <div className="text-center space-y-2">
                <h2 className="text-3xl font-bold text-white">
                    {t.dashboard.createOrder.steps.preferences}
                </h2>
                <p className="text-white/60 max-w-lg mx-auto leading-relaxed">
                    {t.dashboard.createOrder.preferencesSubtitle || (isRTL ? "حدد مواصفات القطعة المطلوبة لضمان الحصول على أفضل العروض المناسبة لك" : "Select the part specifications to ensure you get the best offers suited for you")}
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
                <PreferenceOption
                    id="used"
                    icon={Tag}
                    label={isRTL ? "مستعمل (تشليح)" : "Used Part"}
                    subLabel={isRTL ? "قطع أصلية مستعملة بحالة جيدة" : "Genuine used parts in good condition"}
                />

                <PreferenceOption
                    id="new"
                    icon={Package}
                    label={isRTL ? "جديد (وكالة)" : "Brand New"}
                    subLabel={isRTL ? "قطع جديدة بالتغليف الأصلي" : "New parts in original packaging"}
                />
            </div>

            {/* Note about quality/guarantee can go here if needed, but keeping it clean for now */}
        </motion.div>
    );
};

/* Helper Icon */
function Package({ size, className }: { size?: number, className?: string }) {
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={className}
        >
            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
            <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
            <line x1="12" y1="22.08" x2="12" y2="12"></line>
        </svg>
    )
}
