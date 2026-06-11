import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Crown, TrendingUp, ChevronRight, Star } from 'lucide-react';
import { GlassCard } from '../../ui/GlassCard';
import { useLanguage } from '../../../contexts/LanguageContext';

interface TierProgressCardProps {
    totalSpent: number;
    loyaltyTier: string;
}

/**
 * Visual replica of the loyalty progression card from /dashboard/wallet.
 * Same colors, same math (relative-segment progression), same animations.
 * Pure-presentation: receives state via props for testability + caching.
 */
export const TierProgressCard: React.FC<TierProgressCardProps> = ({
    totalSpent,
    loyaltyTier,
}) => {
    const { t, language } = useLanguage();
    const isAr = language === 'ar';

    const { progress, nextTier, endLimit, remaining } = useMemo(() => {
        const tiers = [
            { id: 'BASIC',   label: t.dashboard.profile.loyalty.tiers.basic,   limit: 1000,   rate: '2%' },
            { id: 'SILVER',  label: t.dashboard.profile.loyalty.tiers.silver,  limit: 3000,   rate: '3%' },
            { id: 'GOLD',    label: t.dashboard.profile.loyalty.tiers.gold,    limit: 10000,  rate: '4%' },
            { id: 'VIP',     label: t.dashboard.profile.loyalty.tiers.vip,     limit: 20000,  rate: '5%' },
            { id: 'PARTNER', label: t.dashboard.profile.loyalty.tiers.partner, limit: 20000, rate: '6%' },
        ];
        const currentIdx = Math.max(0, tiers.findIndex(x => x.id === (loyaltyTier || 'BASIC')));
        const next = currentIdx < tiers.length - 1 ? tiers[currentIdx + 1] : null;
        const startLimit = currentIdx === 0 ? 0 : tiers[currentIdx - 1].limit;
        const endLimit = next ? next.limit : tiers[currentIdx].limit;
        const range = Math.max(1, endLimit - startLimit);
        const relativeSpent = totalSpent - startLimit;
        const progress = next ? Math.max(0, Math.min((relativeSpent / range) * 100, 100)) : 100;
        const remaining = next ? Math.max(0, endLimit - totalSpent) : 0;
        return { progress, nextTier: next, endLimit, remaining };
    }, [totalSpent, loyaltyTier, t]);

    return (
        <GlassCard className="p-6 sm:p-8 relative overflow-hidden border-white/5 group bg-gradient-to-br from-gold-500/5 to-transparent">
            <div className="absolute top-0 right-0 p-32 bg-gold-500/5 rounded-full -mr-16 -mt-16 blur-3xl pointer-events-none group-hover:bg-gold-500/10 transition-colors" />
            <div className="flex flex-col md:flex-row items-center gap-6 sm:gap-8 relative z-10">
                <div className="relative shrink-0">
                    <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-gradient-to-tr from-black to-white/5 border border-gold-500/30 flex items-center justify-center shadow-[0_10px_40px_rgba(212,175,55,0.1)] group-hover:shadow-[0_10px_40px_rgba(212,175,55,0.2)] transition-shadow">
                        <Crown className="text-gold-500 w-10 h-10 sm:w-12 sm:h-12" />
                    </div>
                    <div className="absolute -bottom-1 -right-1 bg-gold-500 text-black text-[9px] font-black px-2 py-0.5 rounded-full border-2 border-[#1A1814] uppercase tracking-tighter">
                        {loyaltyTier || 'BASIC'}
                    </div>
                </div>

                <div className="flex-1 w-full text-center md:text-start">
                    <div className="flex justify-between items-end mb-2">
                        <h3 className="text-sm sm:text-lg font-bold text-white uppercase tracking-tighter">
                            {t.dashboard.profile.loyalty.progression.title}
                        </h3>
                        {nextTier && (
                            <span className="text-[10px] font-black text-gold-500 uppercase tracking-widest bg-gold-500/10 px-2 py-1 rounded">
                                NEXT: {nextTier.label}
                            </span>
                        )}
                    </div>

                    <div className="space-y-4">
                        <div className="flex flex-wrap justify-between gap-2 text-[10px] uppercase font-black tracking-widest text-white/40">
                            <span className="flex items-center gap-2">
                                <TrendingUp size={12} className="text-gold-500/50" />
                                {isAr ? 'إجمالي الإنفاق المعتمد: ' : 'Total Approved Spent: '}
                                <span className="text-white font-black">{totalSpent.toLocaleString()}</span>
                                <span className="text-[8px] font-medium opacity-60">AED</span>
                            </span>
                            {nextTier && (
                                <span className="text-gold-500 flex items-center gap-1">
                                    {t.dashboard.profile.loyalty.progression.goal}: {endLimit.toLocaleString()} <ChevronRight size={12} />
                                </span>
                            )}
                        </div>

                        <div className="h-5 bg-black/60 rounded-full border border-white/10 p-1 relative overflow-hidden">
                            <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${progress}%` }}
                                transition={{ duration: 1.5, ease: 'easeOut' }}
                                className="h-full bg-gradient-to-r from-gold-700 via-gold-500 to-gold-400 rounded-full shadow-[0_0_20px_rgba(212,175,55,0.4)] relative"
                            >
                                <div className="absolute right-0 top-0 bottom-0 w-4 bg-white/20 blur-md animate-pulse" />
                            </motion.div>
                        </div>

                        <div className="flex flex-col sm:flex-row justify-between items-center gap-3">
                            <p className="text-[9px] text-white/40 uppercase font-black tracking-tighter flex items-center gap-2">
                                {nextTier
                                    ? t.dashboard.profile.loyalty.progression.almostThere.replace('{amount}', remaining.toLocaleString())
                                    : (isAr ? 'لقد وصلت إلى أعلى مستوى كشريك! 👑' : 'YOU HAVE REACHED THE MAXIMUM PARTNER TIER! 👑')}
                            </p>
                            {nextTier && (
                                <div className="flex items-center gap-2 bg-white/5 border border-white/10 px-3 py-1.5 rounded-lg">
                                    <Star size={12} className="text-gold-500" />
                                    <span className="text-[9px] font-black text-white/60">
                                        {t.dashboard.profile.loyalty.progression.nextLvlPerks}: {nextTier.rate} Profit Share
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </GlassCard>
    );
};
