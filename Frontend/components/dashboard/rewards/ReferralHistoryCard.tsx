import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import {
    History, Users, Wallet, Sparkles, Clock, AlertTriangle, CheckCircle2,
    ShoppingBag, Calendar, UserPlus, TrendingUp,
} from 'lucide-react';
import { GlassCard } from '../../ui/GlassCard';
import { useLanguage } from '../../../contexts/LanguageContext';
import type { ReferralHistoryItem, ReferralTotals } from '../../../stores/useLoyaltyStore';

interface ReferralHistoryCardProps {
    history: ReferralHistoryItem[];
    totals: ReferralTotals;
    loading: boolean;
}

const REFERRAL_WINDOW_DAYS = 180;

const formatRelative = (iso: string, isAr: boolean) => {
    const date = new Date(iso);
    const diffMs = Date.now() - date.getTime();
    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (days < 1) return isAr ? 'اليوم' : 'Today';
    if (days === 1) return isAr ? 'منذ يوم' : '1 day ago';
    if (days < 30) return isAr ? `منذ ${days} يوم` : `${days} days ago`;
    const months = Math.floor(days / 30);
    if (months === 1) return isAr ? 'منذ شهر' : '1 month ago';
    if (months < 12) return isAr ? `منذ ${months} شهر` : `${months} months ago`;
    const years = Math.floor(months / 12);
    return isAr ? `منذ ${years} سنة` : `${years} year${years > 1 ? 's' : ''} ago`;
};

export const ReferralHistoryCard: React.FC<ReferralHistoryCardProps> = ({
    history,
    totals,
    loading,
}) => {
    const { language } = useLanguage();
    const isAr = language === 'ar';

    const sortedHistory = useMemo(() => {
        return [...history].sort((a, b) => {
            if (a.isActive !== b.isActive) return a.isActive ? -1 : 1;
            return new Date(b.registeredAt).getTime() - new Date(a.registeredAt).getTime();
        });
    }, [history]);

    return (
        <GlassCard className="p-0 border-white/5 overflow-hidden">
            {/* Header */}
            <div className="p-5 sm:p-6 border-b border-white/5 bg-gradient-to-r from-gold-500/[0.04] to-transparent flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gold-500/10 border border-gold-500/20 flex items-center justify-center text-gold-500">
                        <History size={18} />
                    </div>
                    <div>
                        <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
                            {isAr ? 'سجل الإحالات' : 'Referral History'}
                        </h3>
                        <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest mt-0.5">
                            {isAr
                                ? 'كل صديق دعوته خلال آخر 6 شهور'
                                : 'Every friend you invited in the last 6 months'}
                        </p>
                    </div>
                </div>
                {totals.activeCount > 0 && (
                    <div className="px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        <span className="text-[10px] font-black text-emerald-400 uppercase tracking-tighter">
                            {totals.activeCount} {isAr ? 'نشطة' : 'Active'}
                        </span>
                    </div>
                )}
            </div>

            {/* Summary stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 border-b border-white/5">
                <div className="p-5 sm:p-6 border-b sm:border-b-0 sm:border-e border-white/5 flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 shrink-0">
                        <Users size={18} />
                    </div>
                    <div className="min-w-0">
                        <p className="text-[9px] font-black text-white/30 uppercase tracking-widest">
                            {isAr ? 'إجمالي الإحالات' : 'Total Referrals'}
                        </p>
                        <p className="text-xl sm:text-2xl font-black text-white truncate">
                            {totals.count.toLocaleString()}
                        </p>
                    </div>
                </div>
                <div className="p-5 sm:p-6 border-b sm:border-b-0 sm:border-e border-white/5 flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-gold-500/10 border border-gold-500/20 flex items-center justify-center text-gold-500 shrink-0">
                        <Wallet size={18} />
                    </div>
                    <div className="min-w-0">
                        <p className="text-[9px] font-black text-white/30 uppercase tracking-widest">
                            {isAr ? 'إجمالي ما كسبته' : 'Total Earned'}
                        </p>
                        <p className="text-xl sm:text-2xl font-black text-gold-400 truncate">
                            {totals.earned.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            <span className="text-[10px] text-white/40 font-bold ms-2">AED</span>
                        </p>
                    </div>
                </div>
                <div className="p-5 sm:p-6 flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
                        <Sparkles size={18} />
                    </div>
                    <div className="min-w-0">
                        <p className="text-[9px] font-black text-white/30 uppercase tracking-widest">
                            {isAr ? 'الإحالات النشطة' : 'Active Referrals'}
                        </p>
                        <p className="text-xl sm:text-2xl font-black text-emerald-400 truncate">
                            {totals.activeCount.toLocaleString()}
                        </p>
                    </div>
                </div>
            </div>

            {/* Body */}
            <div className="p-4 sm:p-6">
                {loading && history.length === 0 ? (
                    <div className="space-y-3">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="h-20 rounded-2xl bg-white/[0.03] border border-white/5 animate-pulse" />
                        ))}
                    </div>
                ) : sortedHistory.length === 0 ? (
                    <EmptyState isAr={isAr} />
                ) : (
                    <div className="space-y-3">
                        {sortedHistory.map((item, idx) => (
                            <ReferralRow key={item.id} item={item} isAr={isAr} index={idx} />
                        ))}
                    </div>
                )}
            </div>
        </GlassCard>
    );
};

const EmptyState: React.FC<{ isAr: boolean }> = ({ isAr }) => (
    <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center justify-center py-12 px-6 text-center bg-white/[0.02] border border-dashed border-white/10 rounded-2xl"
    >
        <div className="w-16 h-16 rounded-2xl bg-gold-500/10 border border-gold-500/20 flex items-center justify-center text-gold-500 mb-5 shadow-lg shadow-gold-500/5">
            <UserPlus size={28} />
        </div>
        <h4 className="text-base sm:text-lg font-bold text-white tracking-tight">
            {isAr ? 'لا توجد إحالات بعد' : 'No referrals yet'}
        </h4>
        <p className="text-white/40 text-xs sm:text-sm mt-2 max-w-xs leading-relaxed">
            {isAr
                ? 'كن أول من يشارك رابطك! ابدأ الآن واحصل على عمولة 1% من كل منتج يشتريه أصدقاؤك خلال 6 شهور.'
                : 'Be the first to share your link! Start now and earn 1% from every item your friends buy for 6 months.'}
        </p>
        <div className="mt-5 inline-flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
            <TrendingUp size={12} className="text-emerald-400" />
            <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">
                {isAr ? 'الفرصة في انتظارك' : 'Opportunity awaits'}
            </span>
        </div>
    </motion.div>
);

interface ReferralRowProps {
    item: ReferralHistoryItem;
    isAr: boolean;
    index: number;
}

const ReferralRow: React.FC<ReferralRowProps> = ({ item, isAr, index }) => {
    const consumedRatio = Math.min(
        100,
        Math.max(0, ((REFERRAL_WINDOW_DAYS - item.daysRemaining) / REFERRAL_WINDOW_DAYS) * 100)
    );
    const isExpiringSoon = item.isActive && item.daysRemaining < 14;

    const statusColor = !item.isActive
        ? 'text-zinc-400 bg-zinc-500/10 border-zinc-500/20'
        : isExpiringSoon
            ? 'text-orange-400 bg-orange-500/10 border-orange-500/20'
            : 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';

    const progressColor = !item.isActive
        ? 'bg-zinc-500'
        : isExpiringSoon
            ? 'bg-gradient-to-r from-orange-500 to-rose-500'
            : 'bg-gradient-to-r from-emerald-500 to-gold-400';

    const StatusIcon = !item.isActive ? Clock : isExpiringSoon ? AlertTriangle : CheckCircle2;

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: Math.min(index * 0.04, 0.4) }}
            className="bg-white/[0.02] hover:bg-white/[0.04] border border-white/5 hover:border-white/10 rounded-2xl p-4 sm:p-5 transition-colors"
        >
            <div className="flex flex-col md:flex-row md:items-center md:gap-5 gap-4">
                {/* Identity */}
                <div className="flex items-center gap-3 md:w-1/4 min-w-0">
                    <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-white/5 border border-white/10 overflow-hidden flex-shrink-0">
                        <img
                            src={`https://api.dicebear.com/7.x/notionists/svg?seed=${encodeURIComponent(item.id)}`}
                            alt=""
                            loading="lazy"
                            className="w-full h-full object-cover"
                            onError={(e) => {
                                (e.currentTarget as HTMLImageElement).style.display = 'none';
                            }}
                        />
                    </div>
                    <div className="min-w-0">
                        <p className="text-sm font-bold text-white truncate">{item.firstName}</p>
                        <p className="text-[10px] font-bold text-white/40 uppercase tracking-tighter flex items-center gap-1.5 mt-0.5 truncate">
                            <Calendar size={10} />
                            {formatRelative(item.registeredAt, isAr)}
                        </p>
                    </div>
                </div>

                {/* Orders + Earnings */}
                <div className="grid grid-cols-2 gap-3 md:gap-4 md:w-2/5">
                    <div className="bg-black/30 border border-white/5 rounded-xl p-3">
                        <p className="text-[9px] font-black text-white/30 uppercase tracking-widest flex items-center gap-1.5">
                            <ShoppingBag size={10} />
                            {isAr ? 'الطلبات' : 'Orders'}
                        </p>
                        <p className="text-base sm:text-lg font-black text-white mt-1">
                            {item.ordersCount.toLocaleString()}
                        </p>
                    </div>
                    <div className="bg-black/30 border border-white/5 rounded-xl p-3">
                        <p className="text-[9px] font-black text-white/30 uppercase tracking-widest flex items-center gap-1.5">
                            <Wallet size={10} />
                            {isAr ? 'المكاسب' : 'Earned'}
                        </p>
                        <p className="text-base sm:text-lg font-black text-gold-400 mt-1 truncate">
                            {item.totalEarned.toLocaleString(undefined, {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                            })}
                            <span className="text-[9px] text-white/40 font-bold ms-1">AED</span>
                        </p>
                    </div>
                </div>

                {/* Window */}
                <div className="md:flex-1 min-w-0 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] font-black uppercase tracking-tighter ${statusColor}`}>
                            <StatusIcon size={10} />
                            {!item.isActive
                                ? (isAr ? 'انتهت' : 'Expired')
                                : isExpiringSoon
                                    ? (isAr
                                        ? `${item.daysRemaining} يوم — على وشك الانتهاء`
                                        : `${item.daysRemaining}d — Ending soon`)
                                    : (isAr
                                        ? `${item.daysRemaining} يوم متبقي`
                                        : `${item.daysRemaining} days left`)}
                        </span>
                        <span className="text-[9px] font-black text-white/30 uppercase tracking-widest hidden sm:inline">
                            {isAr ? 'نافذة 6 شهور' : '6-month window'}
                        </span>
                    </div>
                    <div className="h-1.5 bg-black/40 rounded-full overflow-hidden border border-white/5">
                        <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${consumedRatio}%` }}
                            transition={{ duration: 1.2, ease: 'easeOut' }}
                            className={`h-full ${progressColor}`}
                        />
                    </div>
                </div>
            </div>
        </motion.div>
    );
};
