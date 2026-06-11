import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GlassCard } from '../../ui/GlassCard';
import { useReviewStore } from '../../../stores/useReviewStore';
import { useVendorStore } from '../../../stores/useVendorStore';
import { useLanguage } from '../../../contexts/LanguageContext';
import { Star, MessageSquare, User, Calendar, Quote, TrendingUp, Award, ThumbsUp, Loader2, Search, ShieldCheck, AlertTriangle } from 'lucide-react';

export const MerchantReviews: React.FC = () => {
    const { t, language } = useLanguage();
    const { 
        reviews, 
        merchantStats, 
        fetchMerchantReviews, 
        fetchMerchantStats, 
        fetchImpactRules,
        impactRules,
        subscribeToMerchantReviews,
        unsubscribeFromMerchantReviews,
        isLoading 
    } = useReviewStore();
    const { performance, storeId } = useVendorStore();
    const isAr = language === 'ar';

    useEffect(() => {
        fetchMerchantReviews();
        fetchMerchantStats();
        fetchImpactRules();

        // Real-time synchronization
        if (storeId) {
            subscribeToMerchantReviews(storeId);
        }

        return () => {
            unsubscribeFromMerchantReviews();
        };
    }, [storeId]);

    // Calculate dynamic stats from backend
    const averageRating = merchantStats?.averageRating || performance?.rating || 0;
    const totalReviews = merchantStats?.totalReviews || 0;
    const fiveStarPercentage = merchantStats?.satisfaction || 0;
    const reputationGrowth = merchantStats?.reputationGrowth || 0;
    const currentRank = merchantStats?.storeRank || 5; 

    // Find applicable impact rule
    const applicableRule = impactRules
        .filter(r => r.isActive)
        .find(r => averageRating >= Number(r.minRating) && averageRating <= Number(r.maxRating));

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">
            {/* Header / Summary Card */}
            <div className="grid lg:grid-cols-3 gap-6">
                <GlassCard className="lg:col-span-1 p-8 bg-gradient-to-br from-gold-500/10 to-transparent border-gold-500/20 flex flex-col items-center justify-center text-center">
                    <div className="relative mb-4">
                        <div className="text-6xl font-black text-white">{averageRating.toFixed(1)}</div>
                        <div className="absolute -top-2 -right-4 bg-gold-500 text-black text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-tighter shadow-lg shadow-gold-500/20">
                            {isAr ? 'ممتاز' : 'EXCELLENT'}
                        </div>
                    </div>
                    
                    <div className="flex gap-1 mb-4">
                        {[1, 2, 3, 4, 5].map(s => (
                            <Star 
                                key={s} 
                                size={24} 
                                fill={s <= Math.round(averageRating) ? "currentColor" : "none"} 
                                className={s <= Math.round(averageRating) ? "text-gold-500 drop-shadow-[0_0_10px_rgba(234,179,8,0.4)]" : "text-white/10"} 
                            />
                        ))}
                    </div>
                    
                    <p className="text-white/40 text-sm font-medium uppercase tracking-widest">
                        {isAr ? `بناءً على ${totalReviews} تقييم` : `Based on ${totalReviews} reviews`}
                    </p>
                </GlassCard>

                <GlassCard className="lg:col-span-2 p-8 grid md:grid-cols-3 gap-8">
                     <div className="space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-400">
                                <ThumbsUp size={18} />
                            </div>
                            <span className="text-xs font-black text-white/40 uppercase tracking-widest">{isAr ? 'رضا العملاء' : 'CUSTOMER SATISFACTION'}</span>
                        </div>
                        <div className="text-3xl font-black text-white">{fiveStarPercentage.toFixed(0)}%</div>
                        <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                            <motion.div 
                                initial={{ width: 0 }}
                                animate={{ width: `${fiveStarPercentage}%` }}
                                className="h-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.3)]"
                            />
                        </div>
                        <p className="text-[10px] text-white/30">{isAr ? 'نسبة التقييمات 5 نجوم' : 'Percentage of 5-star ratings'}</p>
                     </div>

                      <div className="space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400">
                                <TrendingUp size={18} />
                            </div>
                            <span className="text-xs font-black text-white/40 uppercase tracking-widest">{isAr ? 'نمو السمعة' : 'REPUTATION GROWTH'}</span>
                        </div>
                        <div className="text-3xl font-black text-white">+{reputationGrowth}</div>
                        <p className="text-xs text-white/60 leading-tight">{isAr ? 'تأثير التقييمات على ظهورك في نتائج البحث' : 'Impact of reviews on your search ranking visibility'}</p>
                      </div>

                     <div className="space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-purple-500/10 rounded-lg text-purple-400">
                                <Award size={18} />
                            </div>
                            <span className="text-xs font-black text-white/40 uppercase tracking-widest">{isAr ? 'ترتيب المتجر' : 'STORE RANK'}</span>
                        </div>
                        <div className="text-3xl font-black text-white">TOP {currentRank}%</div>
                        <div className="flex -space-x-2">
                             {[...Array(4)].map((_, i) => (
                                 <div key={i} className="w-8 h-8 rounded-full bg-gold-500/20 border-2 border-[#1A1814] flex items-center justify-center">
                                     <Star size={12} className="text-gold-500" fill="currentColor" />
                                 </div>
                             ))}
                        </div>
                     </div>
                </GlassCard>
            </div>

            {/* Impact Status Card */}
            <GlassCard className="p-8 border-white/5 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-gold-500/5 blur-[60px] rounded-full -translate-y-12 translate-x-12 group-hover:bg-gold-500/10 transition-all duration-700" />
                
                <div className="flex flex-col md:flex-row items-center gap-8 relative z-10">
                    <div className={`w-20 h-20 rounded-3xl flex items-center justify-center shrink-0 border transition-all duration-500 ${
                        applicableRule?.actionType === 'FEATURED' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' :
                        applicableRule?.actionType === 'WARNING' ? 'bg-amber-500/10 border-amber-400/20 text-amber-400' :
                        applicableRule?.actionType === 'SUSPEND' ? 'bg-rose-500/10 border-rose-400/20 text-rose-400' :
                        'bg-white/5 border-white/10 text-white/40'
                    }`}>
                        {applicableRule?.actionType === 'FEATURED' ? <Star size={40} fill="currentColor" /> :
                         applicableRule?.actionType === 'WARNING' ? <ShieldCheck size={40} /> :
                         applicableRule?.actionType === 'SUSPEND' ? <AlertTriangle size={40} /> :
                         <TrendingUp size={40} />}
                    </div>

                    <div className="flex-1 text-center md:text-right rtl:md:text-left">
                        <div className="flex items-center justify-center md:justify-start gap-3 mb-2">
                             <span className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em]">{t.dashboard.merchant.reviews.impactStatus}</span>
                             <div className="h-px w-8 bg-white/10" />
                        </div>
                        <h2 className="text-2xl font-black text-white uppercase tracking-tighter mb-1">
                            {applicableRule 
                                ? (isAr ? applicableRule.actionLabelAr : applicableRule.actionLabelEn)
                                : (averageRating >= 4 ? t.dashboard.merchant.reviews.featuredStore : t.dashboard.merchant.reviews.maintainingQuality)
                            }
                        </h2>
                        <p className="text-white/50 text-sm max-w-xl">
                            {applicableRule 
                                ? (applicableRule.actionType === 'SUSPEND' 
                                    ? (isAr ? `تنبيه: تقييمك الحالي قد يؤدي إلى إيقاف المتجر لمدة ${applicableRule.suspendDurationDays} أيام.` : `Warning: Your current rating may lead to a ${applicableRule.suspendDurationDays} day store suspension.`)
                                    : t.dashboard.merchant.reviews.impactDesc)
                                : (averageRating >= 4 ? t.dashboard.merchant.reviews.featuredDesc : t.dashboard.merchant.reviews.qualityDesc)
                            }
                        </p>
                    </div>

                    <div className="shrink-0 flex flex-col items-center gap-2">
                         <div className="bg-black/40 px-6 py-4 rounded-2xl border border-white/5 text-center">
                            <span className="block text-[10px] font-black text-white/30 uppercase tracking-widest mb-1">{t.dashboard.merchant.reviews.ratingRules}</span>
                            <div className="text-2xl font-black text-gold-500">{averageRating.toFixed(1)} / 5.0</div>
                         </div>
                    </div>
                </div>
            </GlassCard>

            {/* List Header */}
            <div className="flex justify-between items-center px-2">
                <h3 className="text-xl font-black text-white uppercase tracking-tighter flex items-center gap-3">
                    <Quote className="text-gold-500 rotate-180" size={24} />
                    {isAr ? 'آراء العملاء' : 'Customer Feedback'}
                </h3>
            </div>

            {/* Reviews List */}
            <div className="grid gap-8">
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-32 gap-4">
                        <Loader2 size={40} className="animate-spin text-gold-500/40" />
                        <p className="text-white/20 font-bold uppercase tracking-widest text-xs">{isAr ? 'جاري تحميل الآراء...' : 'Loading Feedback...'}</p>
                    </div>
                ) : reviews.length > 0 ? (
                    <AnimatePresence mode="popLayout">
                        {reviews.map((review, idx) => (
                            <motion.div
                                key={review.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: idx * 0.05 }}
                            >
                                <GlassCard className="p-0 overflow-hidden border-white/5 hover:border-gold-500/30 transition-all group bg-[#151310]">
                                     {/* Top Accent Line */}
                                     {review.rating === 5 && (
                                         <div className="h-1 w-full bg-gradient-to-r from-transparent via-gold-500/50 to-transparent" />
                                     )}
                                     
                                     <div className="p-6 md:p-8 flex flex-col md:flex-row gap-8">
                                         {/* Left: Identity & Metadata */}
                                         <div className="md:w-72 space-y-6 shrink-0">
                                             <div className="flex items-center gap-4">
                                                 <div className="relative group">
                                                     <div className="absolute -inset-1 bg-gradient-to-tr from-gold-500/20 to-transparent rounded-2xl blur opacity-0 group-hover:opacity-100 transition-opacity" />
                                                     <div className="relative w-16 h-16 rounded-2xl bg-white/5 border border-white/10 overflow-hidden flex items-center justify-center shrink-0">
                                                         {review.customer?.avatar ? (
                                                             <img src={review.customer.avatar} alt="Customer" className="w-full h-full object-cover transition-transform group-hover:scale-110" />
                                                         ) : (
                                                             <User size={28} className="text-white/20 group-hover:text-gold-500/60 transition-colors" />
                                                         )}
                                                     </div>
                                                 </div>
                                                 
                                                 <div className="min-w-0">
                                                     <div className="flex items-center gap-2 mb-1">
                                                         <h4 className="font-mono font-black text-white text-lg tracking-tight truncate">{review.customerCode}</h4>
                                                         <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" title="Verified Session" />
                                                     </div>
                                                     <div className="text-[10px] text-white/40 font-bold uppercase tracking-widest flex items-center gap-2">
                                                         <Calendar size={12} className="text-gold-500/40" />
                                                         {new Date(review.createdAt).toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                                                     </div>
                                                 </div>
                                             </div>

                                             <div className="space-y-3">
                                                 {/* Order Ref Badge */}
                                                 <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white/5 border border-white/5 rounded-xl text-[10px] font-black text-white/50 uppercase tracking-widest group-hover:text-gold-500/80 group-hover:border-gold-500/20 transition-all">
                                                     <Award size={12} />
                                                     {isAr ? 'الطلب رقم' : 'Order REF'}: 
                                                     <span className="text-white font-mono ml-1">{review.order?.orderNumber || review.orderId.substring(0, 8)}</span>
                                                 </div>

                                                 {/* Stars Rating */}
                                                 <div className="flex gap-1.5 p-3 bg-black/20 rounded-2xl w-fit border border-white/5">
                                                     {[1, 2, 3, 4, 5].map(s => (
                                                         <Star 
                                                             key={s} 
                                                             size={16} 
                                                             fill={s <= review.rating ? "currentColor" : "none"} 
                                                             className={s <= review.rating ? "text-gold-500 drop-shadow-[0_0_8px_rgba(234,179,8,0.4)]" : "text-white/5"} 
                                                         />
                                                     ))}
                                                 </div>
                                             </div>
                                         </div>

                                         {/* Right: Feedback Content */}
                                         <div className="flex-1 relative">
                                              <Quote size={80} className="absolute -top-6 -right-6 text-white/[0.03] rotate-12 pointer-events-none group-hover:text-gold-500/[0.05] transition-all duration-700" />
                                              
                                              <div className="h-full flex flex-col justify-center">
                                                  <div className="relative z-10">
                                                      <p className="text-white/80 text-lg md:text-xl font-medium leading-relaxed italic pr-4 rtl:pr-0 rtl:pl-4">
                                                          "{review.comment}"
                                                      </p>
                                                      
                                                      {/* Subtle Decoration */}
                                                      <div className="mt-6 flex items-center gap-4">
                                                          <div className="h-px w-12 bg-gold-500/20" />
                                                          <span className="text-[10px] font-black text-gold-500/40 uppercase tracking-[0.2em]">Verified Transaction</span>
                                                      </div>
                                                  </div>
                                              </div>
                                         </div>
                                     </div>

                                     {/* Interactive Footer Overlay */}
                                     <div className="absolute bottom-0 left-0 right-0 h-1 bg-gold-500/0 group-hover:bg-gold-500/20 transition-all" />
                                </GlassCard>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                ) : (
                    <GlassCard className="py-32 flex flex-col items-center justify-center text-center opacity-50 grayscale border-dashed bg-[#151310] border-white/5">
                        <Search size={48} className="text-white/10 mb-4" />
                        <h4 className="text-white/60 font-bold uppercase tracking-widest">{isAr ? 'لا توجد تقييمات منشورة بعد' : 'No published reviews yet'}</h4>
                        <p className="text-white/20 text-xs mt-2">{isAr ? 'عندما يقوم العملاء بتقييم طلباتهم ويوافق المسؤول عليها ستظهر هنا' : 'Once customers rate their orders and admin approves, they will appear here'}</p>
                    </GlassCard>
                )}
            </div>
        </div>
    );
};
