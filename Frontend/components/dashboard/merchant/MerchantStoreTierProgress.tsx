import React from 'react';
import { motion } from 'framer-motion';
import { Crown, ShieldCheck, TrendingUp, ChevronRight, Zap } from 'lucide-react';
import { GlassCard } from '../../ui/GlassCard';

export interface PerformanceSnap {
    progressToNext?: {
        nextTier: string | null;
        percent: number;
        summaryAr: string;
        summaryEn: string;
    };
    completedOrdersCount?: number;
    rankingBreakdown?: { rating: number };
}

interface WalletTierStats {
    loyaltyTier?: string;
    performanceScore?: number;
    totalSales?: number;
    completedOrders?: number;
    rating?: number;
    tierBenefits?: { ar: string; en: string }[];
    nextTierBenefits?: { ar: string; en: string }[];
}

interface MerchantStoreTierProgressProps {
    stats: WalletTierStats;
    performanceSnap: PerformanceSnap | null;
    isAr: boolean;
    labels: {
        tierProgressionTitle: string;
        storeTierHint: string;
        progressToNext: string;
        viewTierDetails: string;
        completedOrders: string;
        totalSales: string;
        maxStoreTier: string;
        eliteInviteOnly: string;
    };
    onNavigate?: (page: string) => void;
}

const STORE_TIER_ORDER = ['BASIC', 'SILVER', 'GOLD', 'VIP', 'ELITE'] as const;

export const MerchantStoreTierProgress: React.FC<MerchantStoreTierProgressProps> = ({
    stats,
    performanceSnap,
    isAr,
    labels,
    onNavigate,
}) => {
    const storeTiers = STORE_TIER_ORDER.map((id) => ({
        id,
        label:
            id === 'BASIC'
                ? isAr
                    ? 'أساسي'
                    : 'Basic'
                : id === 'SILVER'
                  ? isAr
                      ? 'فضي'
                      : 'Silver'
                  : id === 'GOLD'
                    ? isAr
                        ? 'ذهبي'
                        : 'Gold'
                    : id === 'ELITE'
                      ? isAr
                          ? 'نخبة'
                          : 'Elite'
                      : id,
    }));

    const currentTier = stats.loyaltyTier || 'BASIC';
    const currentTierIdx = storeTiers.findIndex((tier) => tier.id === currentTier);
    const nextTierId = performanceSnap?.progressToNext?.nextTier;
    const nextTier =
        nextTierId != null
            ? (storeTiers.find((tier) => tier.id === nextTierId) ??
              (currentTierIdx >= 0 && currentTierIdx < storeTiers.length - 1
                  ? storeTiers[currentTierIdx + 1]
                  : null))
            : currentTierIdx >= 0 && currentTierIdx < storeTiers.length - 1
              ? storeTiers[currentTierIdx + 1]
              : null;

    const ratingVal = performanceSnap?.rankingBreakdown?.rating ?? stats.rating ?? 0;
    const ordersVal = performanceSnap?.completedOrdersCount ?? stats.completedOrders ?? 0;
    const salesVal = Number(stats.totalSales || 0);
    const hasNoActivity = ratingVal <= 0 && ordersVal <= 0 && salesVal <= 0;

    const segmentProgress = nextTier
        ? hasNoActivity
            ? 0
            : Math.max(0, Math.min(performanceSnap?.progressToNext?.percent ?? 0, 100))
        : 100;

    const totalProgress =
        currentTierIdx >= 0
            ? ((currentTierIdx + (nextTier ? segmentProgress / 100 : 0)) / (storeTiers.length - 1)) * 100
            : 0;

    const progressSummary = performanceSnap?.progressToNext
        ? isAr
            ? performanceSnap.progressToNext.summaryAr
            : performanceSnap.progressToNext.summaryEn
        : '';

    return (
        <GlassCard className="p-6 sm:p-8 relative overflow-hidden group bg-gradient-to-br from-gold-500/5 to-transparent border-white/5">
            <motion.div className="absolute top-0 right-0 p-32 bg-gold-500/5 rounded-full -mr-16 -mt-16 blur-4xl pointer-events-none group-hover:bg-gold-500/10 transition-colors" />
            <div className="flex flex-col md:flex-row items-center gap-6 sm:gap-10 relative z-10">
                <div className="relative shrink-0">
                    <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-gradient-to-tr from-black to-white/5 border border-gold-500/30 flex items-center justify-center shadow-2xl group-hover:shadow-gold-500/10 transition-all">
                        <Crown size={40} className="text-gold-500" />
                    </div>
                    <div className="absolute -bottom-1 -right-1 bg-gold-500 text-black text-[9px] font-black px-2 py-0.5 rounded-full border-2 border-[#1A1814] uppercase">
                        {currentTier}
                    </div>
                </div>

                <motion.div className="flex-1 w-full text-center md:text-start">
                    <div className="flex flex-col sm:flex-row justify-between items-center sm:items-end gap-2 mb-2">
                        <h3 className="text-sm sm:text-lg font-bold text-white uppercase tracking-tighter">
                            {labels.tierProgressionTitle}
                        </h3>
                        <div className="flex items-center gap-2 flex-wrap justify-center sm:justify-end">
                            {nextTier && (
                                <span className="text-[10px] font-black text-gold-500 uppercase tracking-widest bg-gold-500/10 px-2 py-1 rounded">
                                    NEXT: {nextTier.label}
                                </span>
                            )}
                            <button
                                type="button"
                                onClick={() => onNavigate?.('performance')}
                                className="text-[9px] font-black text-gold-500/80 uppercase tracking-widest hover:text-gold-400 transition-colors flex items-center gap-1"
                            >
                                {labels.viewTierDetails}
                                <ChevronRight size={12} />
                            </button>
                        </div>
                    </div>

                    <p className="text-[10px] text-white/40 mb-4">{labels.storeTierHint}</p>

                    <div className="space-y-6">
                        <div className="relative pt-4 pb-2">
                            <div className="absolute top-[32px] left-[10%] right-[10%] h-1 bg-white/5 rounded-full overflow-hidden">
                                <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${totalProgress}%` }}
                                    transition={{ duration: 1.5, ease: 'easeOut' }}
                                    className="h-full bg-gradient-to-r from-blue-500 via-gold-500 to-gold-400 shadow-[0_0_15px_rgba(212,175,55,0.5)]"
                                />
                            </div>
                            <div className="relative flex justify-between">
                                {storeTiers.map((tier, idx) => {
                                    const isCompleted = currentTierIdx > idx;
                                    const isCurrent = currentTierIdx === idx;
                                    let iconColor = 'text-white/20';
                                    let bgColor = 'bg-[#1A1814] border-white/10';
                                    let labelColor = 'text-white/30';
                                    if (isCompleted) {
                                        iconColor = 'text-gold-500';
                                        bgColor = 'bg-gold-500/10 border-gold-500/30';
                                        labelColor = 'text-gold-500/80';
                                    } else if (isCurrent) {
                                        iconColor = 'text-white';
                                        bgColor =
                                            'bg-gradient-to-tr from-gold-600 to-gold-400 border-white shadow-[0_0_20px_rgba(212,175,55,0.4)]';
                                        labelColor = 'text-gold-400 font-bold';
                                    }
                                    return (
                                        <div key={tier.id} className="flex flex-col items-center gap-2 z-10 w-[20%]">
                                            <div
                                                className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center border-2 transition-all duration-500 ${bgColor}`}
                                            >
                                                {isCurrent ? (
                                                    <Crown size={16} className={iconColor} fill="currentColor" />
                                                ) : (
                                                    <ShieldCheck size={14} className={iconColor} />
                                                )}
                                            </div>
                                            <div className="flex flex-col items-center text-center">
                                                <span
                                                    className={`text-[8px] sm:text-[9px] uppercase tracking-widest ${labelColor}`}
                                                >
                                                    {tier.id}
                                                </span>
                                                <span className="text-[7px] text-white/40 font-bold mt-0.5">
                                                    {tier.label}
                                                </span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="flex justify-between text-[10px] uppercase font-black tracking-widest text-white/40 bg-white/5 p-3 rounded-xl border border-white/5">
                            <span className="flex flex-col gap-1">
                                <span className="text-white/30 text-[8px]">{labels.progressToNext}</span>
                                <span className="flex items-center gap-1.5 text-white flex-wrap">
                                    <TrendingUp size={12} className="text-gold-500 shrink-0" />
                                    {segmentProgress}%
                                    {progressSummary && (
                                        <span className="text-[8px] font-medium opacity-60 normal-case">
                                            · {progressSummary}
                                        </span>
                                    )}
                                </span>
                            </span>
                            <span className="flex flex-col items-end gap-1">
                                <span className="text-white/30 text-[8px]">
                                    {isAr ? 'درجة الأداء' : 'Performance'}
                                </span>
                                <span className="text-gold-500 flex items-center gap-1">
                                    {stats.performanceScore ?? 0}%
                                    <ChevronRight size={12} />
                                </span>
                            </span>
                        </div>

                        <div className="grid grid-cols-3 gap-2 text-[9px]">
                            <div className="bg-white/5 rounded-lg p-2 border border-white/5 text-center">
                                <p className="text-white/30 uppercase font-black">{labels.completedOrders}</p>
                                <p className="text-white font-bold mt-1">
                                    {performanceSnap?.completedOrdersCount ?? stats.completedOrders ?? 0}
                                </p>
                            </div>
                            <div className="bg-white/5 rounded-lg p-2 border border-white/5 text-center">
                                <p className="text-white/30 uppercase font-black">{isAr ? 'التقييم' : 'Rating'}</p>
                                <p className="text-white font-bold mt-1">
                                    {(performanceSnap?.rankingBreakdown?.rating ?? stats.rating ?? 0).toFixed(1)}/5
                                </p>
                            </div>
                            <div className="bg-white/5 rounded-lg p-2 border border-white/5 text-center">
                                <p className="text-white/30 uppercase font-black">{labels.totalSales}</p>
                                <p className="text-white font-bold mt-1">
                                    {Number(stats.totalSales || 0).toLocaleString()}
                                </p>
                            </div>
                        </div>

                        <p className="text-[9px] text-white/40 uppercase font-black tracking-tighter flex items-center gap-2 bg-black/40 px-3 py-1.5 rounded-lg border border-white/5">
                            {nextTier
                                ? `${labels.progressToNext}: ${nextTier.label} (${segmentProgress}%)`
                                : currentTier === 'ELITE'
                                  ? labels.eliteInviteOnly
                                  : labels.maxStoreTier}
                        </p>

                        <div className="pt-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {stats.tierBenefits?.map((benefit, i) => (
                                <div
                                    key={`cur-${i}`}
                                    className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-500/5 border border-emerald-500/10"
                                >
                                    <ShieldCheck size={12} className="text-emerald-400" />
                                    <span className="text-[10px] font-bold text-white/80">
                                        {isAr ? benefit.ar : benefit.en}
                                    </span>
                                </div>
                            ))}
                            {nextTier &&
                                stats.nextTierBenefits
                                    ?.filter((nb) => !stats.tierBenefits?.some((cb) => cb.en === nb.en))
                                    .map((benefit, i) => (
                                        <div
                                            key={`next-${i}`}
                                            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 border border-white/5 opacity-50"
                                        >
                                            <Zap size={12} className="text-white/20" />
                                            <span className="text-[10px] font-bold text-white/30 truncate">
                                                {isAr ? benefit.ar : benefit.en}
                                            </span>
                                        </div>
                                    ))}
                        </div>
                    </div>
                </motion.div>
            </div>
        </GlassCard>
    );
};
