
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Star, UploadCloud, Loader2, CheckCircle2, Sparkles } from 'lucide-react';
import { useLanguage } from '../../../contexts/LanguageContext';
import { useReviewStore } from '../../../stores/useReviewStore';

interface ReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderId: string | number;
  storeId?: string;
  merchantName?: string;
  partName?: string;
  offerId?: string;
  onSuccess?: (review: {
    id: string;
    rating: number;
    comment?: string;
    adminStatus?: string;
    createdAt?: string;
  }) => void;
}

export const ReviewModal: React.FC<ReviewModalProps> = ({
  isOpen,
  onClose,
  orderId,
  storeId = '',
  merchantName = 'Store',
  partName = 'Part',
  offerId,
  onSuccess,
}) => {
  const { t, language } = useLanguage();
  const { submitReview, isSubmitting, error, clearReviewError } = useReviewStore();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const [pending, setPending] = useState(false);

  const busy = pending || isSubmitting;
  const canSubmit = Boolean(storeId?.trim()) && rating > 0 && !busy;

  useEffect(() => {
    if (isOpen) {
      clearReviewError();
      setIsSuccess(false);
    }
  }, [isOpen, clearReviewError]);

  const handleSubmit = async () => {
    if (!canSubmit) return;

    setPending(true);
    try {
      const created = await submitReview({
          orderId: String(orderId),
          storeId: storeId.trim(),
          rating,
          comment,
          offerId,
      });

      if (created) {
          onSuccess?.(created);
          setIsSuccess(true);
          setTimeout(() => {
              onClose();
              setIsSuccess(false);
              setRating(0);
              setComment('');
          }, 700);
      }
    } finally {
      setPending(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
      >
        <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="bg-[#1A1814] border border-white/10 rounded-3xl w-full max-w-md p-8 relative overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.5)]"
        >
            <div className="absolute top-0 right-0 p-32 bg-gold-500/5 rounded-full blur-3xl -mr-16 -mt-16" />

            {isSuccess ? (
                <div className="flex flex-col items-center justify-center py-12 text-center relative z-10">
                    <motion.div 
                        initial={{ scale: 0 }}
                        animate={{ scale: [0, 1.2, 1] }}
                        transition={{ duration: 0.5 }}
                        className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center text-emerald-400 mb-6 border border-emerald-500/30 shadow-[0_0_20px_rgba(16,185,129,0.2)]"
                    >
                        <CheckCircle2 size={40} />
                    </motion.div>
                    
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                    >
                        <h3 className="text-2xl font-bold text-white mb-2">
                            {language === 'ar' ? 'شكراً لتقييمك!' : 'Thank You!'}
                        </h3>
                        <p className="text-white/40 text-sm">
                            {language === 'ar' ? 'سيتم مراجعة تقييمك ونشرها قريباً' : 'Your review will be moderated and published soon'}
                        </p>
                    </motion.div>

                    {/* Simple Sparkle Animation */}
                    <div className="mt-8 flex gap-1">
                        {[...Array(5)].map((_, i) => (
                            <motion.div 
                                key={i}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: [0, 1, 0] }}
                                transition={{ delay: 0.5 + (i * 0.1), duration: 1, repeat: Infinity }}
                            >
                                <Star size={16} fill="currentColor" className="text-gold-500" />
                            </motion.div>
                        ))}
                    </div>
                </div>
            ) : (
                <>
                    <div className="flex justify-between items-center mb-8 relative z-10">
                        <div>
                            <h3 className="text-2xl font-bold text-white flex items-center gap-2">
                                <Sparkles size={20} className="text-gold-500" />
                                {t.dashboard.reviews?.writeTitle || (language === 'ar' ? 'ضع تقييمك' : 'Write Review')}
                            </h3>
                            <p className="text-white/40 text-xs mt-1">{language === 'ar' ? 'شارك تجربتك مع الآخرين' : 'Share your experience with others'}</p>
                        </div>
                        <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full text-white/40 hover:text-white transition-colors"><X size={24} /></button>
                    </div>

                    <div className="space-y-8 relative z-10">
                        <div className="bg-white/5 border border-white/5 p-4 rounded-2xl">
                             <p className="text-white/40 text-[10px] uppercase font-bold tracking-widest mb-1">{language === 'ar' ? 'المتجر' : 'STORE'}</p>
                             <h4 className="text-white font-bold">{merchantName}</h4>
                             <p className="text-gold-500/60 text-xs font-mono">{partName}</p>
                        </div>

                        {/* Star Rating */}
                        <div className="flex justify-center gap-3">
                            {[1, 2, 3, 4, 5].map((star) => (
                                <motion.button
                                    key={star}
                                    whileHover={{ scale: 1.2 }}
                                    whileTap={{ scale: 0.9 }}
                                    onClick={() => setRating(star)}
                                    className={`p-1 transition-all focus:outline-none ${rating >= star ? 'text-gold-500 drop-shadow-[0_0_8px_rgba(234,179,8,0.4)]' : 'text-white/10'}`}
                                >
                                    <Star size={40} fill={rating >= star ? "currentColor" : "none"} strokeWidth={1.5} />
                                </motion.button>
                            ))}
                        </div>

                        {/* Comment */}
                        <div className="group">
                            <label className="block text-[10px] font-black text-white/30 uppercase tracking-widest mb-2 group-focus-within:text-gold-500 transition-colors">
                                {t.dashboard.reviews?.comment || (language === 'ar' ? 'تعليقك' : 'Comment')}
                            </label>
                            <textarea 
                                value={comment}
                                onChange={(e) => setComment(e.target.value)}
                                className="w-full bg-[#24221F] border border-white/5 rounded-2xl p-4 text-white focus:border-gold-500/50 focus:bg-black/40 outline-none resize-none h-32 placeholder-white/10 text-sm transition-all"
                                placeholder={t.dashboard.reviews?.placeholder || (language === 'ar' ? 'اكتب انطباعك عن الخدمة...' : 'How was your experience?')}
                            />
                        </div>

                        {!storeId?.trim() && (
                            <p className="text-amber-400 text-xs font-bold text-center">
                                {language === 'ar'
                                    ? 'تعذر تحديد المتجر لهذا الطلب. حدّث الصفحة أو تواصل مع الدعم.'
                                    : 'Store could not be resolved for this order. Refresh or contact support.'}
                            </p>
                        )}

                        {error && <p className="text-red-500 text-xs font-bold text-center animate-shake">{error}</p>}

                        <motion.button 
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={handleSubmit}
                            disabled={!canSubmit}
                            className="w-full py-4 bg-gradient-to-r from-gold-600 to-gold-400 disabled:from-white/5 disabled:to-white/5 disabled:text-white/20 text-white rounded-2xl font-black uppercase tracking-tighter text-sm flex items-center justify-center gap-2 shadow-xl shadow-gold-500/10"
                        >
                            {busy ? <Loader2 className="animate-spin" size={18} /> : null}
                            {t.dashboard.reviews?.submit || (language === 'ar' ? 'إرسال التقييم' : 'Submit Review')}
                        </motion.button>
                    </div>
                </>
            )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
