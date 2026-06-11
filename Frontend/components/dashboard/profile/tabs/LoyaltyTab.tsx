import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { Star, MessageSquare, ThumbsUp } from 'lucide-react';
import { useLoyaltyStore } from '../../../../stores/useLoyaltyStore';
import { useLanguage } from '../../../../contexts/LanguageContext';
import { GlassCard } from '../../../ui/GlassCard';

export const LoyaltyTab: React.FC = () => {
    const { reviews, fetchLoyaltyData, loading } = useLoyaltyStore();
    const { t, language } = useLanguage();

    useEffect(() => {
        fetchLoyaltyData();
    }, []);

    const isAr = language === 'ar';

    return (
        <motion.div 
            key="loyalty-reviews" 
            initial={{ opacity: 0, x: 20 }} 
            animate={{ opacity: 1, x: 0 }} 
            exit={{ opacity: 0, x: -20 }} 
            className="space-y-6"
        >
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-white flex items-center gap-3">
                    <MessageSquare className="text-gold-500" />
                    {isAr ? 'تقييماتي للمتاجر' : 'My Store Reviews'}
                </h3>
            </div>

            {loading ? (
                <div className="text-center py-20">
                    <div className="w-12 h-12 border-2 border-gold-500/20 border-t-gold-500 rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-white/40 text-sm">{isAr ? 'جاري تحميل التقييمات...' : 'Loading reviews...'}</p>
                </div>
            ) : reviews && reviews.length > 0 ? (
                <div className="grid grid-cols-1 gap-4">
                    {reviews.map((review: any) => (
                        <GlassCard key={review.id} className="p-6 flex flex-col md:flex-row gap-6 hover:bg-white/[0.04] transition-colors border-white/5">
                            <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center shrink-0 border border-white/10">
                                <ThumbsUp size={28} className="text-gold-500/40" />
                            </div>
                            <div className="flex-1">
                                <div className="flex justify-between items-start mb-3">
                                    <div>
                                        <h4 className="font-bold text-white text-lg">{review.store?.name || t.common.store}</h4>
                                        <div className="flex gap-1 text-gold-500 mt-1">
                                            {[...Array(5)].map((_, i) => (
                                                <Star key={i} size={14} fill={i < review.rating ? "currentColor" : "none"} className={i < review.rating ? "" : "text-white/10"} />
                                            ))}
                                        </div>
                                    </div>
                                    <span className={`px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                                        review.adminStatus === 'PUBLISHED' ? 'bg-emerald-500/20 text-emerald-400' : 
                                        review.adminStatus === 'PENDING' ? 'bg-amber-500/20 text-amber-400' : 
                                        'bg-red-500/20 text-red-400'
                                    }`}>
                                        {review.adminStatus}
                                    </span>
                                </div>
                                <p className="text-white/70 text-sm leading-relaxed bg-black/40 p-4 rounded-xl italic border-l-2 border-gold-500/30">
                                    "{review.comment}"
                                </p>
                                <div className="mt-4 flex items-center justify-between text-[11px] text-white/40 font-mono">
                                    <span className="opacity-50">#ID: {review.id.slice(0,8)}</span>
                                    <span>{new Date(review.created_at).toLocaleDateString(isAr ? 'ar-EG' : 'en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                                </div>
                            </div>
                        </GlassCard>
                    ))}
                </div>
            ) : (
                <div className="text-center py-20 bg-white/[0.02] rounded-3xl border border-white/5 border-dashed">
                    <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6 text-white/20">
                        <MessageSquare size={40} />
                    </div>
                    <h3 className="text-xl font-bold text-white/40 mb-2">{t.dashboard.profile.loyalty.noReviews}</h3>
                    <p className="text-white/20 text-sm">{t.dashboard.profile.loyalty.noReviewsDesc}</p>
                </div>
            )}
        </motion.div>
    );
};
