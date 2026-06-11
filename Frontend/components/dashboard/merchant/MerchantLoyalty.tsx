import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Award, 
    TrendingUp, 
    Star, 
    Zap, 
    Target, 
    ChevronRight, 
    ShieldCheck, 
    BarChart3, 
    Percent, 
    Users,
    ArrowUpRight,
    Search,
    MessageCircle
} from 'lucide-react';
import { GlassCard } from '../../ui/GlassCard';
import { useLanguage } from '../../../contexts/LanguageContext';
import { useVendorStore } from '../../../stores/useVendorStore';
import { useLoyaltyStore } from '../../../stores/useLoyaltyStore';

export const MerchantLoyalty: React.FC = () => {
    const { t, language } = useLanguage();
    const { vendorStatus, performance, storeInfo } = useVendorStore();
    const [activeTab, setActiveTab] = useState<'overview' | 'benefits' | 'history'>('overview');

    // Real data from store
    const storeStats = {
        tier: (performance as any).loyaltyTier || 'BASIC',
        performanceScore: (performance as any).performanceScore ?? performance.acceptanceRate ?? 0,
        lifetimeEarnings: (performance as any).lifetimeEarnings || 0,
        completedOrders: (performance as any).completedOrdersCount || 0,
        avgRating: performance.rating || 0,
        nextTier: 'SILVER',
        progressToNext: 75, // Logic for progress can be added to store later
        remainingAmount: 4800 
    };

    const tiers: Record<string, { label: string; color: string; bg: string; icon: typeof Award }> = {
        BASIC: { label: language === 'ar' ? 'أساسي' : 'Basic', color: 'text-orange-400', bg: 'bg-orange-400/10', icon: Award },
        SILVER: { label: language === 'ar' ? 'فضي' : 'Silver', color: 'text-slate-300', bg: 'bg-slate-300/10', icon: ShieldCheck },
        GOLD: { label: language === 'ar' ? 'ذهبي' : 'Gold', color: 'text-gold-500', bg: 'bg-gold-500/10', icon: Zap },
        VIP: { label: 'VIP', color: 'text-cyan-400', bg: 'bg-cyan-400/10', icon: Target },
        ELITE: { label: language === 'ar' ? 'نخبة' : 'Elite', color: 'text-amber-300', bg: 'bg-amber-300/10', icon: Target },
    };

    const currentTierInfo = tiers[storeStats.tier] || tiers.BASIC;

    return (
        <div className="space-y-8 min-h-screen pb-20">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-4xl font-black text-white tracking-tighter flex items-center gap-4">
                        <Award className="text-gold-500" size={40} />
                        {language === 'ar' ? 'مركز السمعة والولاء' : 'Reputation & Loyalty Center'}
                    </h1>
                    <p className="text-white/50 mt-2 font-medium">
                        {language === 'ar' 
                            ? 'طور أداء متجرك واحصل على مميزات حصرية لزيادة مبيعاتك' 
                            : 'Grow your store performance and unlock exclusive benefits to boost sales'}
                    </p>
                </div>
                
                <div className="flex items-center gap-3">
                    <div className={`px-6 py-3 rounded-2xl ${currentTierInfo.bg} border border-white/10 flex items-center gap-3`}>
                        <currentTierInfo.icon className={currentTierInfo.color} size={24} />
                        <div>
                            <p className="text-[10px] text-white/40 uppercase font-black tracking-widest leading-none">
                                {language === 'ar' ? 'المستوى الحالي' : 'Current Tier'}
                            </p>
                            <p className={`text-lg font-bold ${currentTierInfo.color} leading-none mt-1`}>
                                {currentTierInfo.label}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Performance Overview Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main Progress Card */}
                <GlassCard className="lg:col-span-2 p-10 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-40 bg-gold-500/5 rounded-full blur-[100px] -mr-20 -mt-20 group-hover:bg-gold-500/10 transition-colors duration-1000"></div>
                    
                    <div className="relative z-10">
                        <div className="flex items-center justify-between mb-10">
                            <h3 className="text-xl font-bold text-white flex items-center gap-3">
                                <TrendingUp className="text-emerald-400" />
                                {language === 'ar' ? 'مسار التقدم للمستوى القادم' : 'Progress to Next Tier'}
                            </h3>
                            <span className="text-white/40 text-sm font-mono">
                                {storeStats.nextTier}
                            </span>
                        </div>

                        <div className="space-y-6">
                            <div className="flex justify-between items-end">
                                <p className="text-3xl font-black text-white">
                                    {storeStats.progressToNext}%
                                    <span className="text-sm font-normal text-white/40 ml-3 tracking-normal">
                                        {language === 'ar' 
                                            ? `تبقّى ${storeStats.remainingAmount.toLocaleString()} درهم` 
                                            : `${storeStats.remainingAmount.toLocaleString()} AED remaining`}
                                    </span>
                                </p>
                            </div>

                            <div className="h-4 bg-white/5 rounded-full overflow-hidden border border-white/10 p-1">
                                <motion.div 
                                    initial={{ width: 0 }}
                                    animate={{ width: `${storeStats.progressToNext}%` }}
                                    transition={{ duration: 2, ease: "circOut" }}
                                    className="h-full bg-gradient-to-r from-gold-600 via-gold-400 to-amber-300 rounded-full shadow-[0_0_20px_rgba(234,179,8,0.3)] relative"
                                >
                                    <div className="absolute inset-0 bg-[linear-gradient(45deg,rgba(255,255,255,0.2)_25%,transparent_25%,transparent_50%,rgba(255,255,255,0.2)_50%,rgba(255,255,255,0.2)_75%,transparent_75%,transparent)] bg-[length:1.5rem_1.5rem] animate-[progress_3s_linear_infinite]" />
                                </motion.div>
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-10">
                                {[
                                    { label: language === 'ar' ? 'إجمالي المبيعات' : 'Lifetime Sales', value: `${storeStats.lifetimeEarnings.toLocaleString()} AED`, icon: BarChart3, color: 'text-blue-400' },
                                    { label: language === 'ar' ? 'الطلبات المكتملة' : 'Orders Done', value: storeStats.completedOrders, icon: ShieldCheck, color: 'text-emerald-400' },
                                    { label: language === 'ar' ? 'متوسط التقييم' : 'Avg Rating', value: `${storeStats.avgRating}/5`, icon: Star, color: 'text-gold-500' },
                                    { label: language === 'ar' ? 'درجة الأداء' : 'Perf Score', value: `${storeStats.performanceScore}%`, icon: Zap, color: 'text-purple-400' },
                                ].map((stat, i) => (
                                    <div key={i} className="bg-white/5 p-4 rounded-2xl border border-white/5 hover:bg-white/10 transition-colors">
                                        <stat.icon className={`${stat.color} mb-2`} size={18} />
                                        <p className="text-[10px] text-white/40 uppercase font-black">{stat.label}</p>
                                        <p className="text-white font-bold mt-1 tracking-tight">{stat.value}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </GlassCard>

                {/* Reputation Score Metric */}
                <GlassCard className="p-10 flex flex-col items-center justify-center text-center border-white/10 hover:border-gold-500/30 transition-all duration-500">
                    <div className="relative mb-6">
                        <svg className="w-40 h-40 transform -rotate-90">
                            <circle
                                cx="80"
                                cy="80"
                                r="70"
                                stroke="currentColor"
                                strokeWidth="8"
                                fill="transparent"
                                className="text-white/5"
                            />
                            <motion.circle
                                cx="80"
                                cy="80"
                                r="70"
                                stroke="currentColor"
                                strokeWidth="8"
                                strokeDasharray="440"
                                initial={{ strokeDashoffset: 440 }}
                                animate={{ strokeDashoffset: 440 - (440 * storeStats.performanceScore) / 100 }}
                                transition={{ duration: 2, ease: "easeOut" }}
                                fill="transparent"
                                className="text-gold-500"
                            />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <span className="text-4xl font-black text-white">{storeStats.performanceScore}</span>
                            <span className="text-[10px] text-white/40 font-bold uppercase tracking-widest">
                                {language === 'ar' ? 'درجة الثقة' : 'Trust Score'}
                            </span>
                        </div>
                    </div>
                    <p className="text-sm text-white/60 leading-relaxed font-medium">
                        {language === 'ar' 
                            ? 'أداؤك الحالي ممتاز! استمر في شحن الطلبات بسرعة لزيادة درجتك.' 
                            : 'Your current performance is excellent! Keep shipping orders fast to boost your score.'}
                    </p>
                </GlassCard>
            </div>

            {/* Benefits Sections */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                    { 
                        title: language === 'ar' ? 'عمولة مخفضة' : 'Lower Commission', 
                        desc: language === 'ar' ? 'خصم 5% على عمولة المنصة للمستوى الذهبي' : '5% discount on fees for Gold tier',
                        icon: Percent, 
                        status: storeStats.tier === 'GOLD' || storeStats.tier === 'VIP' || storeStats.tier === 'ELITE' ? 'active' : 'locked' 
                    },
                    { 
                        title: language === 'ar' ? 'أولوية الظهور' : 'Search Priority', 
                        desc: language === 'ar' ? 'متجرك سيظهر في أعلى نتائج البحث للقطع المطلوبة' : 'Your store will appear at the top of search results',
                        icon: Search, 
                        status: storeStats.tier === 'SILVER' ? 'active' : 'locked' 
                    },
                    { 
                        title: language === 'ar' ? 'شارة التحقق' : 'Verified Badge', 
                        desc: language === 'ar' ? 'شارة "بائع موثوق" لزيادة ثقة العملاء بك' : 'Trusted Seller badge to boost customer confidence',
                        icon: ShieldCheck, 
                        status: 'active' 
                    },
                    { 
                        title: language === 'ar' ? 'مدير حساب خاص' : 'Direct Support', 
                        desc: language === 'ar' ? 'خط دعم مباشر مع فريق الإدارة للمستوى البلاتيني' : 'Direct line with management for Platinum tier',
                        icon: MessageCircle, 
                        status: storeStats.tier === 'VIP' || storeStats.tier === 'ELITE' ? 'active' : 'locked' 
                    },
                ].map((benefit, i) => (
                    <GlassCard key={i} className={`p-6 border-l-4 ${benefit.status === 'active' ? 'border-emerald-500 bg-emerald-500/5' : 'border-white/5 opacity-50 grayscale'} transition-all`}>
                        <div className="flex justify-between items-start mb-4">
                            <div className={`p-3 rounded-xl bg-white/5 ${benefit.status === 'active' ? 'text-emerald-400' : 'text-white/20'}`}>
                                <benefit.icon size={24} />
                            </div>
                            {benefit.status === 'active' ? (
                                <span className="bg-emerald-500/20 text-emerald-400 text-[10px] font-black px-2 py-1 rounded-full uppercase tracking-tighter">
                                    {language === 'ar' ? 'مفعل' : 'Active'}
                                </span>
                            ) : (
                                <span className="bg-white/5 text-white/40 text-[10px] font-black px-2 py-1 rounded-full uppercase tracking-tighter">
                                    {language === 'ar' ? 'مقفل' : 'Locked'}
                                </span>
                            )}
                        </div>
                        <h4 className="font-bold text-white mb-2">{benefit.title}</h4>
                        <p className="text-xs text-white/40 leading-relaxed font-medium">{benefit.desc}</p>
                    </GlassCard>
                ))}
            </div>
        </div>
    );
};
