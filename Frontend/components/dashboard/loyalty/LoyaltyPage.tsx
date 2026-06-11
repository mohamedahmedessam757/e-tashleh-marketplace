import React from 'react';
import { MessageSquare, Crown, Star, Shield, Zap, TrendingUp, Trophy } from 'lucide-react';
import { motion } from 'framer-motion';
import { GlassCard } from '../../ui/GlassCard';
import { LoyaltyTab } from '../profile/tabs/LoyaltyTab';
import { useLanguage } from '../../../contexts/LanguageContext';

export const LoyaltyPage: React.FC = () => {
    const { language } = useLanguage();
    const isAr = language === 'ar';

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
            {/* Header */}
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-white flex items-center gap-4">
                        <div className="p-3 bg-gold-500/10 rounded-2xl border border-gold-500/20 shadow-lg shadow-gold-500/5">
                            <Trophy className="text-gold-500" size={32} />
                        </div>
                        {isAr ? 'مركز الولاء والمكافآت 2026' : 'Loyalty & Rewards Hub 2026'}
                    </h1>
                    <p className="text-white/50 mt-2 max-w-2xl leading-relaxed">
                        {isAr 
                            ? 'نظام الولاء المتطور: شارك المنصة أرباحها واحصل على مكافآت حصرية تصل إلى 6% من عمولة المنصة عند اكتمال طلباتك.' 
                            : 'Advanced Loyalty System: Share platform profits and unlock exclusive rewards up to 6% of platform commission on every completed order.'}
                    </p>
                </div>
                
                <div className="hidden lg:flex items-center gap-2 bg-white/5 border border-white/10 p-2 rounded-2xl">
                    <div className="flex -space-x-3">
                        {[1, 2, 3, 4].map(i => (
                            <div key={i} className="w-10 h-10 rounded-full border-2 border-[#111] bg-white/10 flex items-center justify-center overflow-hidden">
                                <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${i + 10}`} alt="user" />
                            </div>
                        ))}
                    </div>
                    <div className="px-3">
                        <p className="text-[10px] text-white/30 font-black uppercase tracking-widest">{isAr ? 'أحدث المنضمين' : 'Newest VIPs'}</p>
                        <p className="text-xs font-bold text-emerald-400">+1.2k {isAr ? 'عضو جديد' : 'New Members'}</p>
                    </div>
                </div>
            </div>

            {/* Loyalty Tiers Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                {[
                    { id: 'BASIC', label: isAr ? 'أساسي' : 'Basic', profit: '2%', color: 'from-slate-400/20', border: 'border-slate-500/20', icon: Zap },
                    { id: 'SILVER', label: isAr ? 'فضي' : 'Silver', profit: '3%', color: 'from-blue-400/20', border: 'border-blue-500/20', icon: Star },
                    { id: 'GOLD', label: isAr ? 'ذهبي' : 'Gold', profit: '4%', color: 'from-gold-400/20', border: 'border-gold-500/20', icon: Crown },
                    { id: 'VIP', label: 'VIP', profit: '5%', color: 'from-purple-400/20', border: 'border-purple-500/20', icon: Shield },
                    { id: 'PARTNER', label: isAr ? 'شريك' : 'Partner', profit: '6%', color: 'from-emerald-400/20', border: 'border-emerald-500/20', icon: Trophy },
                ].map((tier, idx) => (
                    <motion.div 
                        key={tier.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.1 }}
                        className={`relative group p-6 rounded-3xl bg-gradient-to-br ${tier.color} to-transparent border ${tier.border} backdrop-blur-xl hover:scale-[1.02] transition-all`}
                    >
                        <div className="flex justify-between items-start mb-4">
                            <div className="p-2 bg-white/5 rounded-xl border border-white/10 text-white/40 group-hover:text-white transition-colors">
                                <tier.icon size={20} />
                            </div>
                            <span className="text-[10px] font-black text-white/20 uppercase tracking-widest">STEP {idx + 1}</span>
                        </div>
                        <h3 className="text-xl font-black text-white mb-1 uppercase tracking-tighter">{tier.label}</h3>
                        <div className="flex items-baseline gap-1 mt-4">
                            <span className="text-3xl font-black text-white group-hover:text-gold-500 transition-colors">{tier.profit}</span>
                            <span className="text-[10px] text-white/40 font-bold uppercase">{isAr ? 'ربح' : 'Profit'}</span>
                        </div>
                        
                        <div className="mt-6 pt-6 border-t border-white/5 space-y-3">
                            <div className="flex items-center gap-2 text-[10px] font-bold text-white/60">
                                <div className="w-1 h-1 rounded-full bg-emerald-500" />
                                {isAr ? 'دعم فني مخصص' : 'Custom Support'}
                            </div>
                            <div className="flex items-center gap-2 text-[10px] font-bold text-white/60">
                                <div className="w-1 h-1 rounded-full bg-emerald-500" />
                                {isAr ? 'كاش باك حقيقي' : 'Real Cashback'}
                            </div>
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* Dashboard and Reviews Tabs */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-1 space-y-6">
                    <GlassCard className="p-8 border-gold-500/20 bg-gradient-to-br from-gold-600/10 via-transparent to-transparent group h-full">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-2 bg-gold-500/10 rounded-lg border border-gold-400/20 text-gold-500">
                                <TrendingUp size={20} />
                            </div>
                            <h3 className="text-lg font-bold text-white">{isAr ? 'كيف يعمل النظام؟' : 'How it works?'}</h3>
                        </div>
                        <div className="space-y-6">
                            {[
                                { tAr: 'أكمل طلبك', tEn: 'Complete Your Order', dAr: 'انتظر حتى انتهاء فترة الضمان (3 أيام).', dEn: 'Wait for the 3rd-day guarantee period to end.', i: Zap },
                                { tAr: 'احتساب العمولة', tEn: 'Commission Calc', dAr: 'يقوم النظام بحساب عمولة المنصة للطلب.', dEn: 'The system calculates the platform commission.', i: Star },
                                { tAr: 'استلم أرباحك', tEn: 'Receive Profits', dAr: 'تضاف الأرباح لمحفظتك تلقائياً حسب مستواك.', dEn: 'Profits are auto-added to your wallet per tier.', i: Trophy },
                            ].map((step, i) => (
                                <div key={i} className="flex gap-4 items-start group/step">
                                    <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center shrink-0 border border-white/10 group-hover/step:bg-gold-500 group-hover/step:text-black transition-all">
                                        <step.i size={14} />
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-bold text-white mb-1">{isAr ? step.tAr : step.tEn}</h4>
                                        <p className="text-[11px] text-white/40 leading-relaxed">{isAr ? step.dAr : step.dEn}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </GlassCard>
                </div>
                
                <div className="lg:col-span-2">
                    <GlassCard className="p-0 border-white/5 overflow-hidden">
                        <div className="p-6 border-b border-white/5 bg-white/[0.01]">
                            <h3 className="text-xl font-bold text-white">{isAr ? 'تقييماتي وتأثيري' : 'My Reviews & Impact'}</h3>
                        </div>
                        <div className="p-6 md:p-10">
                            <LoyaltyTab />
                        </div>
                    </GlassCard>
                </div>
            </div>
        </div>
    );
};
