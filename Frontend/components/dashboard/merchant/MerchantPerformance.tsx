import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Award,
    TrendingUp,
    Star,
    Zap,
    Target,
    ShieldCheck,
    BarChart3,
    Percent,
    Users,
    ArrowUpRight,
    Search,
    MessageCircle,
    ShieldAlert,
    Clock,
    CheckCircle2,
    AlertTriangle,
    History,
    Wallet,
    Sparkles,
    ShoppingBag,
    Calendar,
    UserPlus,
    RefreshCw
} from 'lucide-react';
import { GlassCard } from '../../ui/GlassCard';
import { useLanguage } from '../../../contexts/LanguageContext';
import { io, Socket } from 'socket.io-client';
import { supabase } from '../../../services/supabase';
import { client } from '../../../services/api/client';

// Same origin as rest of app (axios injects access_token)
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// Types (must precede normalizePerformance)
interface PerformanceData {
    storeId: string;
    loyaltyTier: string;
    performanceScore: number;
    rankingBreakdown: {
        levelWeight: number;
        ratingWeight: number;
        responseWeight: number;
        rating: number;
        avgResponseScore: number;
    };
    subscription: {
        tier: string;
        active: boolean;
        effective: boolean;
        expiresAt: string | null;
    };
    completedOrdersCount: number;
    violationPoints: number;
    violationLimits: {
        freezeAt: number;
        suspendAt: number;
    };
    lifetimeEarnings: number;
    referralCode: string;
    currentTierBenefits: { ar: string; en: string }[];
    profitRate: number;
    benefitsByTier: {
        tier: string;
        benefits: { ar: string; en: string }[];
        rate: number;
    }[];
    progressToNext: {
        nextTier: string | null;
        percent: number;
        summaryAr: string;
        summaryEn: string;
        remaining: Record<string, number | boolean | string>;
    };
}

function num(v: unknown, fallback = 0): number {
    const n = Number(v);
    return Number.isFinite(n) ? n : fallback;
}

function normalizePerformance(raw: Record<string, unknown>): PerformanceData {
    const rb = (raw.rankingBreakdown as Record<string, unknown>) || {};
    const pt = (raw.progressToNext as Record<string, unknown>) || {};
    const sub = (raw.subscription as Record<string, unknown>) || {};
    const vl = (raw.violationLimits as Record<string, unknown>) || {};

    return {
        storeId: String(raw.storeId ?? ''),
        loyaltyTier: String(raw.loyaltyTier ?? 'BASIC'),
        performanceScore: num(raw.performanceScore),
        rankingBreakdown: {
            levelWeight: num(rb.levelWeight, 0.4),
            ratingWeight: num(rb.ratingWeight, 0.4),
            responseWeight: num(rb.responseWeight, 0.2),
            rating: num(rb.rating),
            avgResponseScore: num(rb.avgResponseScore),
        },
        subscription: {
            tier: String(sub.tier ?? 'NONE'),
            active: Boolean(sub.active),
            effective: Boolean(sub.effective),
            expiresAt: sub.expiresAt != null ? String(sub.expiresAt) : null,
        },
        completedOrdersCount: Math.round(num(raw.completedOrdersCount)),
        violationPoints: Math.round(num(raw.violationPoints)),
        violationLimits: {
            freezeAt: Math.round(num(vl.freezeAt, 50)),
            suspendAt: Math.round(num(vl.suspendAt, 80)),
        },
        lifetimeEarnings: num(raw.lifetimeEarnings),
        referralCode: raw.referralCode != null ? String(raw.referralCode) : '',
        currentTierBenefits: Array.isArray(raw.currentTierBenefits)
            ? (raw.currentTierBenefits as PerformanceData['currentTierBenefits'])
            : [],
        profitRate: num(raw.profitRate),
        benefitsByTier: Array.isArray(raw.benefitsByTier)
            ? (raw.benefitsByTier as PerformanceData['benefitsByTier'])
            : [],
        progressToNext: {
            nextTier: pt.nextTier != null ? String(pt.nextTier) : null,
            percent: Math.min(100, Math.max(0, Math.round(num(pt.percent)))),
            summaryAr: String(pt.summaryAr ?? ''),
            summaryEn: String(pt.summaryEn ?? ''),
            remaining:
                pt.remaining && typeof pt.remaining === 'object'
                    ? (pt.remaining as Record<string, number | boolean | string>)
                    : {},
        },
    };
}

function getAccessToken(): string | null {
    return localStorage.getItem('access_token') || localStorage.getItem('token');
}

interface ReferralItem {
    id: string;
    firstName: string;
    registeredAt: string;
    ordersCount: number;
    totalEarned: number;
    isActive: boolean;
    daysRemaining: number;
}

interface ViolationRow {
    id: string;
    points: number;
    createdAt: string;
    type?: { nameAr?: string; nameEn?: string };
    targetType?: string;
}

export const MerchantPerformance: React.FC = () => {
    const { t, language } = useLanguage();
    const isAr = language === 'ar';
    const mp = t.dashboard.merchant.performancePage;
    const [performance, setPerformance] = useState<PerformanceData | null>(null);
    const [referrals, setReferrals] = useState<ReferralItem[]>([]);
    const [referralTotals, setReferralTotals] = useState<{
        count: number;
        earned: number;
        activeCount: number;
    } | null>(null);
    const [violations, setViolations] = useState<ViolationRow[]>([]);
    const [violationsLoading, setViolationsLoading] = useState(true);
    const [loading, setLoading] = useState(true);
    const [refHistoryLoading, setRefHistoryLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchData = async () => {
        try {
            setLoading(true);
            const { data } = await client.get<Record<string, unknown>>('/merchant-performance/me');
            setPerformance(normalizePerformance(data));
            setError(null);
        } catch (err: unknown) {
            const ax = err as { response?: { data?: { message?: string } }; message?: string };
            setError(ax?.response?.data?.message || ax?.message || 'Failed to fetch performance data');
        } finally {
            setLoading(false);
        }
    };

    const fetchReferrals = async () => {
        try {
            setRefHistoryLoading(true);
            const { data } = await client.get<{ referrals?: ReferralItem[]; totals?: { count: number; earned: number; activeCount: number } }>(
                '/loyalty/referrals'
            );
            setReferrals(data.referrals || []);
            setReferralTotals(data.totals ?? null);
        } catch (err) {
            console.error('Referral fetch error:', err);
        } finally {
            setRefHistoryLoading(false);
        }
    };

    const fetchViolations = async () => {
        try {
            setViolationsLoading(true);
            const { data } = await client.get<ViolationRow[]>('/violations/my');
            const rows = Array.isArray(data) ? data : [];
            const merchantOnly = rows.filter((v) => v.targetType === 'MERCHANT');
            setViolations(merchantOnly.length ? merchantOnly : rows);
        } catch {
            /* non-fatal */
        } finally {
            setViolationsLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
        fetchReferrals();
        fetchViolations();
    }, []);

    // Realtime wiring
    useEffect(() => {
        if (!performance?.storeId) return;

        const token = getAccessToken();

        // 1. Socket.IO (server does not validate auth payload today — join room still scoped by storeId)
        const socket: Socket = io(`${API_URL}/loyalty`, {
            transports: ['websocket'],
            auth: token ? { token } : {},
        });

        socket.on('connect', () => {
            socket.emit('joinLoyalty', { targetId: performance.storeId, role: 'VENDOR' });
        });

        socket.on('loyaltyUpdated', () => {
            fetchData();
            fetchViolations();
            fetchReferrals();
        });

        // 2. Supabase Realtime
        const channel = supabase
            .channel(`public:stores:id=eq.${performance.storeId}`)
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'stores',
                filter: `id=eq.${performance.storeId}`
            }, () => {
                fetchData();
                fetchViolations();
            })
            .subscribe();

        return () => {
            socket.off('loyaltyUpdated');
            socket.disconnect();
            supabase.removeChannel(channel);
        };
    }, [performance?.storeId]);

    const tiers: Record<string, { label: { ar: string; en: string }; color: string; bg: string; icon: any }> = {
        BASIC: { label: { ar: 'أساسي', en: 'Basic' }, color: 'text-orange-400', bg: 'bg-orange-400/10', icon: Award },
        SILVER: { label: { ar: 'فضي', en: 'Silver' }, color: 'text-slate-300', bg: 'bg-slate-300/10', icon: ShieldCheck },
        GOLD: { label: { ar: 'ذهبي', en: 'Gold' }, color: 'text-gold-500', bg: 'bg-gold-500/10', icon: Zap },
        VIP: { label: { ar: 'VIP', en: 'VIP' }, color: 'text-cyan-400', bg: 'bg-cyan-400/10', icon: Target },
        ELITE: { label: { ar: 'نخبة', en: 'Elite' }, color: 'text-amber-300', bg: 'bg-amber-300/10', icon: Target },
    };

    if (loading && !performance) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
                <div className="w-12 h-12 border-4 border-gold-500/20 border-t-gold-500 rounded-full animate-spin" />
                <p className="text-white/40 font-bold animate-pulse uppercase tracking-widest">
                    {language === 'ar' ? 'جاري تحميل بيانات الأداء…' : 'Loading performance data…'}
                </p>
            </div>
        );
    }

    if (error || !performance) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6">
                <div className="w-20 h-20 bg-red-500/10 rounded-3xl flex items-center justify-center text-red-500">
                    <ShieldAlert size={40} />
                </div>
                <div className="text-center">
                    <h2 className="text-2xl font-bold text-white mb-2">{isAr ? 'عذراً، حدث خطأ' : 'Sorry, an error occurred'}</h2>
                    <p className="text-white/40 max-w-xs mx-auto">{error || 'Could not load performance metrics'}</p>
                </div>
                <button
                    type="button"
                    onClick={() => {
                        fetchData();
                        fetchReferrals();
                        fetchViolations();
                    }}
                    className="px-8 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl transition-all flex items-center gap-2"
                >
                    <RefreshCw size={18} />
                    {isAr ? 'إعادة المحاولة' : 'Try Again'}
                </button>
            </div>
        );
    }

    const currentTierInfo = tiers[performance.loyaltyTier] || tiers.BASIC;

    const ratingVal = performance.rankingBreakdown.rating;
    const avgResp = performance.rankingBreakdown.avgResponseScore;
    const arcPctRating = Math.min(100, Math.max(0, (ratingVal / 5) * 100));
    const responsePct =
        avgResp > 0 ? Math.round((avgResp / 5) * 100) : Math.round((ratingVal / 5) * 100);
    const responsePrimary =
        avgResp > 0 ? `${avgResp.toFixed(1)}/5` : `${responsePct}%`;
    const nextTierKey = performance.progressToNext.nextTier;
    const nextTierLabel = nextTierKey
        ? tiers[nextTierKey]?.label[isAr ? 'ar' : 'en'] ?? nextTierKey
        : isAr
          ? 'أقصى مستوى'
          : 'Top tier';

    const hasNoActivity =
        performance.rankingBreakdown.rating <= 0 &&
        performance.completedOrdersCount <= 0 &&
        performance.lifetimeEarnings <= 0;
    const progressPercent = hasNoActivity ? 0 : performance.progressToNext.percent;

    return (
        <div className="space-y-8 min-h-screen pb-20">
            {/* --- PROMPT A: Page shell & Header --- */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-4xl font-black text-white tracking-tighter flex items-center gap-4">
                        <Award className="text-gold-500" size={40} />
                        {mp.title}
                    </h1>
                    <p className="text-white/50 mt-2 font-medium">{mp.subtitle}</p>
                    {performance.subscription && (
                        <p className="text-xs text-white/35 mt-2">
                            {isAr ? 'الاشتراك: ' : 'Subscription: '}
                            <span className={performance.subscription.effective ? 'text-emerald-400/90' : 'text-white/40'}>
                                {performance.subscription.tier}
                                {performance.subscription.effective
                                    ? isAr ? ' (فعّال)' : ' (active)'
                                    : isAr ? ' (غير فعّال)' : ' (inactive)'}
                            </span>
                            {performance.subscription.expiresAt && (
                                <span className="text-white/25 ms-2">
                                    ·{' '}
                                    {isAr ? 'ينتهي: ' : 'Expires: '}
                                    {new Date(performance.subscription.expiresAt).toLocaleDateString()}
                                </span>
                            )}
                        </p>
                    )}
                </div>

                <div className="flex items-center gap-3">
                    <div className={`px-6 py-3 rounded-2xl ${currentTierInfo.bg} border border-white/10 flex items-center gap-3 shadow-xl`}>
                        <currentTierInfo.icon className={currentTierInfo.color} size={24} />
                        <div>
                            <p className="text-[10px] text-white/40 uppercase font-black tracking-widest leading-none">
                                {isAr ? 'المستوى الحالي' : 'Current Tier'}
                            </p>
                            <p className={`text-lg font-bold ${currentTierInfo.color} leading-none mt-1`}>
                                {isAr ? currentTierInfo.label.ar : currentTierInfo.label.en}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main Progress Card */}
                <GlassCard className="lg:col-span-2 p-10 relative overflow-hidden group border-white/10">
                    <div className="absolute top-0 right-0 p-40 bg-gold-500/5 rounded-full blur-[100px] -mr-20 -mt-20 group-hover:bg-gold-500/10 transition-colors duration-1000"></div>

                    <div className="relative z-10">
                        <div className="flex items-center justify-between mb-10">
                            <h3 className="text-xl font-bold text-white flex items-center gap-3">
                                <TrendingUp className="text-emerald-400" />
                                {isAr ? 'مسار التقدم للمستوى القادم' : 'Progress to Next Tier'}
                            </h3>
                            <span className="px-3 py-1 bg-white/5 rounded-lg text-white/40 text-xs font-black uppercase tracking-widest border border-white/5">
                                {nextTierLabel}
                            </span>
                        </div>

                        <div className="space-y-6">
                            <div className="flex justify-between items-end">
                                <p className="text-3xl font-black text-white">
                                    {progressPercent}%
                                    <span className="text-sm font-normal text-white/40 ml-3 tracking-normal">
                                        {isAr ? performance.progressToNext.summaryAr : performance.progressToNext.summaryEn}
                                    </span>
                                </p>
                            </div>

                            <div className="h-4 bg-white/5 rounded-full overflow-hidden border border-white/10 p-1">
                                <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${progressPercent}%` }}
                                    transition={{ duration: 2, ease: "circOut" }}
                                    className="h-full bg-gradient-to-r from-gold-600 via-gold-400 to-amber-300 rounded-full shadow-[0_0_20px_rgba(234,179,8,0.3)] relative"
                                >
                                    <div className="absolute inset-0 bg-[linear-gradient(45deg,rgba(255,255,255,0.2)_25%,transparent_25%,transparent_50%,rgba(255,255,255,0.2)_50%,rgba(255,255,255,0.2)_75%,transparent_75%,transparent)] bg-[length:1.5rem_1.5rem] animate-[progress_3s_linear_infinite]" />
                                </motion.div>
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-10">
                                {[
                                    {
                                        label: mp.totalEarnings,
                                        value: `${performance.lifetimeEarnings.toLocaleString(undefined, { maximumFractionDigits: 2 })} AED`,
                                        icon: BarChart3,
                                        color: 'text-blue-400',
                                    },
                                    {
                                        label: mp.ordersDone,
                                        value: performance.completedOrdersCount,
                                        icon: ShieldCheck,
                                        color: 'text-emerald-400',
                                    },
                                    {
                                        label: mp.avgRating,
                                        value: `${ratingVal.toFixed(1)}/5`,
                                        icon: Star,
                                        color: 'text-gold-500',
                                    },
                                    {
                                        label: mp.responseSpeed,
                                        value: (
                                            <span className="inline-flex flex-col items-start">
                                                <span>{responsePrimary}</span>
                                                {avgResp <= 0 && (
                                                    <span className="text-[9px] font-normal text-white/35 normal-case tracking-normal">
                                                        {mp.responseProxy}
                                                    </span>
                                                )}
                                            </span>
                                        ),
                                        icon: Zap,
                                        color: 'text-purple-400',
                                    },
                                ].map((stat, i) => (
                                    <div key={i} className="bg-white/5 p-4 rounded-2xl border border-white/5 hover:bg-white/10 transition-all group/stat">
                                        <stat.icon className={`${stat.color} mb-2 group-hover/stat:scale-110 transition-transform`} size={18} />
                                        <p className="text-[10px] text-white/40 uppercase font-black">{stat.label}</p>
                                        <div className="text-white font-bold mt-1 tracking-tight">{stat.value}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </GlassCard>

                {/* Rating gauge ( arc = avg rating ); composite score shown as caption */}
                <GlassCard className="p-10 flex flex-col items-center justify-center text-center border-white/10 hover:border-gold-500/30 transition-all duration-500 relative overflow-hidden group">
                    <div className="absolute inset-0 bg-gold-500/0 group-hover:bg-gold-500/[0.02] transition-colors duration-500" />
                    <div className="relative mb-6">
                        <svg className="w-44 h-44 transform -rotate-90">
                            <circle
                                cx="88"
                                cy="88"
                                r="80"
                                stroke="currentColor"
                                strokeWidth="12"
                                fill="transparent"
                                className="text-white/5"
                            />
                            <motion.circle
                                cx="88"
                                cy="88"
                                r="80"
                                stroke="currentColor"
                                strokeWidth="12"
                                strokeDasharray="502"
                                initial={{ strokeDashoffset: 502 }}
                                animate={{ strokeDashoffset: 502 - (502 * arcPctRating) / 100 }}
                                transition={{ duration: 2.5, ease: "easeOut" }}
                                fill="transparent"
                                className="text-gold-500"
                                strokeLinecap="round"
                            />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center px-2">
                            <span className="text-5xl font-black text-white tracking-tighter leading-none">
                                {ratingVal.toFixed(1)}
                            </span>
                            <span className="text-sm text-white/45 font-bold">/5</span>
                            <span className="text-[10px] text-white/40 font-black uppercase tracking-[0.15em] mt-2">
                                {mp.avgRating}
                            </span>
                        </div>
                    </div>
                    <p className="text-xs text-white/45 font-mono mb-3 relative z-10">
                        {mp.rankingScore}: <span className="text-gold-400/90">{performance.performanceScore}</span>
                        <span className="text-white/30"> /100</span>
                    </p>
                    <p className="text-sm text-white/60 leading-relaxed font-medium relative z-10 max-w-xs">
                        {ratingVal >= 4.5 && performance.performanceScore >= 70
                            ? isAr
                              ? 'أداؤك قوي في التقييم والترتيب الشامل.'
                              : 'Strong rating and overall ranking score.'
                            : isAr
                              ? 'حسّن متوسط التقييم، راجع الاشتراك والمخالفات، وأكمل الطلبات للترقية.'
                              : 'Improve rating, keep subscription active, reduce violations, and complete orders to tier up.'}
                    </p>
                </GlassCard>
            </div>

            {/* --- PROMPT B: Benefits Table --- */}
            <div className="space-y-6">
                <div className="flex items-center gap-4">
                    <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>
                    <h2 className="text-2xl font-black text-white tracking-tighter uppercase">
                        {isAr ? 'مزايا المستويات' : 'Level Benefits'}
                    </h2>
                    <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                    {performance.benefitsByTier.map((tier) => {
                        const isCurrent = tier.tier === performance.loyaltyTier;
                        const tierInfo = tiers[tier.tier] || tiers.BASIC;

                        return (
                            <GlassCard
                                key={tier.tier}
                                className={`p-6 border-t-4 transition-all duration-500 ${isCurrent ? 'border-gold-500 bg-gold-500/10 scale-105 z-10 shadow-2xl shadow-gold-500/10' : 'border-white/5 hover:border-white/20 bg-white/[0.02]'}`}
                            >
                                <div className="flex flex-col items-center text-center gap-4">
                                    <div className={`p-3 rounded-2xl ${tierInfo.bg} ${tierInfo.color}`}>
                                        <tierInfo.icon size={28} />
                                    </div>
                                    <div>
                                        <h4 className={`font-black text-lg ${tierInfo.color}`}>
                                            {isAr ? tierInfo.label.ar : tierInfo.label.en}
                                        </h4>
                                    </div>
                                    <div className="w-full h-px bg-white/5"></div>
                                    <ul className="space-y-3 w-full">
                                        {tier.benefits.map((b, i) => (
                                            <li key={i} className="text-xs text-white/60 font-medium flex items-start gap-2 text-left rtl:text-right">
                                                <div className={`w-1 h-1 rounded-full mt-1.5 shrink-0 ${isCurrent ? 'bg-gold-400' : 'bg-white/20'}`} />
                                                {isAr ? b.ar : b.en}
                                            </li>
                                        ))}
                                    </ul>
                                    {isCurrent && (
                                        <div className="mt-4 px-3 py-1 bg-gold-500 text-black text-[9px] font-black uppercase rounded-full">
                                            {isAr ? 'مستواك الحالي' : 'Your Current Level'}
                                        </div>
                                    )}
                                </div>
                            </GlassCard>
                        );
                    })}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* --- PROMPT C: Violations & Performance Points --- */}
                <GlassCard className="p-0 border-white/10 overflow-hidden flex flex-col">
                    <div className="p-8 border-b border-white/5 bg-gradient-to-r from-red-500/[0.03] to-transparent flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500">
                                <ShieldAlert size={24} />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-white tracking-tight">
                                    {isAr ? 'نقاط المخالفات والأداء' : 'Violations & Performance Points'}
                                </h3>
                                <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest mt-0.5">
                                    {isAr ? 'نظام الحوكمة والنزاهة 2026' : 'Governance & Integrity System 2026'}
                                </p>
                            </div>
                        </div>
                        <div className="text-right">
                            <p className="text-3xl font-black text-red-500 leading-none">{performance.violationPoints}</p>
                            <p className="text-[9px] text-white/30 font-black uppercase mt-1 tracking-tighter">{isAr ? 'نقطة حالية' : 'Points Current'}</p>
                        </div>
                    </div>

                    <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                            <p className="text-xs font-bold text-white/40 uppercase tracking-widest">{isAr ? 'عتبات النظام' : 'System Thresholds'}</p>
                            <div className="space-y-3">
                                <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-orange-500/10 flex items-center justify-center text-orange-500"><Clock size={16} /></div>
                                        <span className="text-sm font-bold text-white/80">{isAr ? 'تجميد السحب' : 'Freeze Withdrawals'}</span>
                                    </div>
                                    <span className="text-lg font-black text-orange-400">{performance.violationLimits.freezeAt}</span>
                                </div>
                                <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center text-red-500"><ShieldAlert size={16} /></div>
                                        <span className="text-sm font-bold text-white/80">{isAr ? 'إيقاف الحساب' : 'Suspend Account'}</span>
                                    </div>
                                    <span className="text-lg font-black text-red-500">{performance.violationLimits.suspendAt}</span>
                                </div>
                            </div>
                        </div>

                        <div className="bg-red-500/[0.02] border border-red-500/10 rounded-2xl p-6 flex flex-col justify-center text-center">
                            <AlertTriangle className="text-red-500/40 mx-auto mb-4" size={32} />
                            <p className="text-xs text-white/50 leading-relaxed">
                                {isAr
                                    ? 'تأكد من الالتزام بسياسات المنصة. النقاط السلبية تؤدي إلى قيود فورية على المتجر وظهوره.'
                                    : 'Ensure compliance with platform policies. Negative points lead to immediate store restrictions and visibility drops.'}
                            </p>
                        </div>
                    </div>

                    <div className="p-8 pt-0 border-t border-white/5">
                        <p className="text-xs font-bold text-white/40 uppercase tracking-widest mb-4">
                            {isAr ? 'سجل المخالفات' : 'Violation log'}
                        </p>
                        {violationsLoading ? (
                            <div className="space-y-2">
                                {[1, 2].map(i => (
                                    <div key={i} className="h-10 rounded-xl bg-white/[0.02] animate-pulse" />
                                ))}
                            </div>
                        ) : violations.length === 0 ? (
                            <p className="text-sm text-white/35">{isAr ? 'لا توجد مخالفات مسجلة' : 'No violations on record'}</p>
                        ) : (
                            <div className="overflow-x-auto rounded-xl border border-white/5">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="text-[10px] uppercase text-white/35 border-b border-white/10">
                                            <th className="text-start p-3">{isAr ? 'النوع' : 'Type'}</th>
                                            <th className="text-end p-3">{isAr ? 'النقاط' : 'Points'}</th>
                                            <th className="text-end p-3">{isAr ? 'التاريخ' : 'Date'}</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {violations.slice(0, 8).map(v => (
                                            <tr key={v.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                                                <td className="p-3 text-white/80">
                                                    {isAr ? (v.type?.nameAr || '—') : (v.type?.nameEn || v.type?.nameAr || '—')}
                                                </td>
                                                <td className="p-3 text-end font-black text-red-400">-{v.points}</td>
                                                <td className="p-3 text-end text-white/40 text-xs">
                                                    {new Date(v.createdAt).toLocaleDateString()}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </GlassCard>

                {/* --- PROMPT D: Referral history block --- */}
                <ReferralHistoryBlock
                    history={referrals}
                    loading={refHistoryLoading}
                    isAr={isAr}
                    code={performance.referralCode || '—'}
                    apiTotals={referralTotals}
                />
            </div>
        </div>
    );
};

const ReferralHistoryBlock: React.FC<{
    history: ReferralItem[];
    loading: boolean;
    isAr: boolean;
    code: string;
    apiTotals: { count: number; earned: number; activeCount: number } | null;
}> = ({ history, loading, isAr, code, apiTotals }) => {
    const totals = useMemo(() => {
        if (apiTotals) return apiTotals;
        return {
            count: history.length,
            earned: history.reduce((sum, item) => sum + item.totalEarned, 0),
            activeCount: history.filter(h => h.isActive).length,
        };
    }, [history, apiTotals]);

    const sortedHistory = useMemo(() => {
        return [...history].sort((a, b) => {
            if (a.isActive !== b.isActive) return a.isActive ? -1 : 1;
            return new Date(b.registeredAt).getTime() - new Date(a.registeredAt).getTime();
        });
    }, [history]);

    return (
        <GlassCard className="p-0 border-white/10 overflow-hidden flex flex-col h-full">
            <div className="p-8 border-b border-white/5 bg-gradient-to-r from-gold-500/[0.03] to-transparent flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-gold-500/10 border border-gold-500/20 flex items-center justify-center text-gold-500">
                        <Users size={24} />
                    </div>
                    <div>
                        <h3 className="text-xl font-bold text-white tracking-tight">
                            {isAr ? 'سجل الإحالات والمكاسب' : 'Referral & Earnings History'}
                        </h3>
                        <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest mt-0.5">
                            {isAr ? `كودك: ${code}` : `Your Code: ${code}`}
                        </p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-3 border-b border-white/5 bg-black/20">
                <div className="p-4 text-center border-e border-white/5">
                    <p className="text-[8px] font-black text-white/30 uppercase tracking-[0.2em]">{isAr ? 'الأصدقاء' : 'Friends'}</p>
                    <p className="text-xl font-black text-white mt-1">{totals.count}</p>
                </div>
                <div className="p-4 text-center border-e border-white/5">
                    <p className="text-[8px] font-black text-white/30 uppercase tracking-[0.2em]">{isAr ? 'الأرباح' : 'Earnings'}</p>
                    <p className="text-xl font-black text-gold-400 mt-1">{totals.earned.toFixed(0)} <span className="text-[9px]">AED</span></p>
                </div>
                <div className="p-4 text-center">
                    <p className="text-[8px] font-black text-white/30 uppercase tracking-[0.2em]">{isAr ? 'نشط' : 'Active'}</p>
                    <p className="text-xl font-black text-emerald-400 mt-1">{totals.activeCount}</p>
                </div>
            </div>

            <div className="flex-1 p-6 overflow-y-auto custom-scrollbar max-h-[400px]">
                {loading ? (
                    <div className="space-y-4">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="h-16 rounded-2xl bg-white/[0.02] border border-white/5 animate-pulse" />
                        ))}
                    </div>
                ) : sortedHistory.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                        <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center text-white/20 mb-4">
                            <UserPlus size={32} />
                        </div>
                        <p className="text-sm font-bold text-white/40">{isAr ? 'لا توجد إحالات مسجلة بعد' : 'No recorded referrals yet'}</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {sortedHistory.map((item, idx) => (
                            <div key={item.id} className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 flex items-center justify-between hover:bg-white/[0.04] transition-colors">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 overflow-hidden">
                                        <img src={`https://api.dicebear.com/7.x/notionists/svg?seed=${item.id}`} alt="" className="w-full h-full object-cover" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-white">{item.firstName}</p>
                                        <p className="text-[9px] text-white/30 font-bold uppercase tracking-tighter mt-0.5">
                                            {isAr ? `منذ ${new Date(item.registeredAt).toLocaleDateString()}` : `Joined ${new Date(item.registeredAt).toLocaleDateString()}`}
                                        </p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-right">
                                        <p className="text-sm font-black text-gold-400">{item.totalEarned.toFixed(2)} <span className="text-[9px]">AED</span></p>
                                        <p className="text-[9px] text-white/35 mt-0.5">
                                            {isAr ? 'طلبات: ' : 'Orders: '}{item.ordersCount ?? 0}
                                        </p>
                                    </div>
                                    <div className={`mt-1 inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[8px] font-black uppercase ${item.isActive ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' : 'text-white/20 bg-white/5 border-white/10'}`}>
                                        <div className={`w-1 h-1 rounded-full ${item.isActive ? 'bg-emerald-400 animate-pulse' : 'bg-white/20'}`} />
                                        {item.isActive ? (isAr ? 'نشط' : 'Active') : (isAr ? 'منتهي' : 'Expired')}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </GlassCard>
    );
};
