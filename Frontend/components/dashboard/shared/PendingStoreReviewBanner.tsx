import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Star, ChevronRight, ChevronLeft, Sparkles } from 'lucide-react';
import { useLanguage } from '../../../contexts/LanguageContext';
import { useOrderStore, type Order } from '../../../stores/useOrderStore';
import { ReviewModal } from '../reviews/ReviewModal';
import {
  findOrdersPendingReview,
  orderNeedsReview,
  resolveReviewTarget,
} from '../../../utils/reviewHelpers';

interface PendingStoreReviewBannerProps {
  /** When set, show banner only for this order (if it still needs a review). */
  order?: Order | null;
  className?: string;
  onNavigate?: (path: string, id?: string | number) => void;
}

export const PendingStoreReviewBanner: React.FC<PendingStoreReviewBannerProps> = ({
  order: orderProp,
  className = '',
  onNavigate,
}) => {
  const { language } = useLanguage();
  const isAr = language === 'ar';
  const Chevron = isAr ? ChevronLeft : ChevronRight;
  const { orders, fetchOrders } = useOrderStore();

  const [showModal, setShowModal] = useState(false);
  const [activeOrder, setActiveOrder] = useState<Order | null>(null);

  React.useEffect(() => {
    if (!orderProp && orders.length === 0) {
      void fetchOrders();
    }
  }, [orderProp, orders.length, fetchOrders]);

  const pendingOrders = useMemo(() => {
    if (orderProp) {
      return orderNeedsReview(orderProp) ? [orderProp] : [];
    }
    return findOrdersPendingReview(orders);
  }, [orderProp, orders]);

  if (pendingOrders.length === 0) return null;

  const targetOrder = activeOrder ?? pendingOrders[0];
  const reviewTarget = resolveReviewTarget(targetOrder);
  if (!reviewTarget) return null;

  const openReview = (order: Order) => {
    setActiveOrder(order);
    setShowModal(true);
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className={`relative overflow-hidden rounded-2xl border border-gold-500/30 bg-gradient-to-r from-gold-500/10 via-[#1A1814] to-gold-500/5 p-5 shadow-[0_0_30px_rgba(212,175,55,0.08)] ${className}`}
      >
        <div className="absolute -top-10 -right-10 w-32 h-32 bg-gold-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative flex flex-col md:flex-row md:items-center gap-4 md:gap-6">
          <div className="flex items-start gap-4 flex-1 min-w-0">
            <div className="shrink-0 w-12 h-12 rounded-2xl bg-gold-500/20 border border-gold-500/30 flex items-center justify-center">
              <Sparkles className="text-gold-400" size={22} />
            </div>
            <div className="min-w-0">
              <p className="text-gold-400 text-[10px] font-black uppercase tracking-[0.2em] mb-1">
                {isAr ? 'تقييم المتجر مطلوب' : 'Store review needed'}
              </p>
              <h3 className="text-white font-black text-lg leading-tight">
                {isAr
                  ? `قيّم ${reviewTarget.merchantName} — طلب #${targetOrder.orderNumber || targetOrder.id}`
                  : `Rate ${reviewTarget.merchantName} — Order #${targetOrder.orderNumber || targetOrder.id}`}
              </h3>
              <p className="text-white/55 text-sm mt-1.5 leading-relaxed">
                {isAr
                  ? 'تقييمك يساعد التاجر على التقدم في مستوى المتجر ويحسّن تجربة الجميع على المنصة.'
                  : 'Your rating helps the merchant advance their store level and improves the marketplace for everyone.'}
              </p>
              {pendingOrders.length > 1 && (
                <p className="text-gold-500/70 text-xs font-bold mt-2">
                  {isAr
                    ? `${pendingOrders.length} طلبات بانتظار تقييمك`
                    : `${pendingOrders.length} orders awaiting your review`}
                </p>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {onNavigate && (
              <button
                type="button"
                onClick={() => onNavigate('order-details', targetOrder.id)}
                className="px-4 py-2.5 rounded-xl border border-white/10 text-white/70 hover:text-white hover:bg-white/5 text-sm font-bold transition-all"
              >
                {isAr ? 'تفاصيل الطلب' : 'Order details'}
              </button>
            )}
            <button
              type="button"
              onClick={() => openReview(targetOrder)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gold-500 hover:bg-gold-400 text-black font-black text-sm transition-all shadow-lg shadow-gold-500/20"
            >
              <Star size={16} fill="currentColor" />
              {isAr ? 'قيّم المتجر الآن' : 'Rate store now'}
              <Chevron size={16} />
            </button>
          </div>
        </div>
      </motion.div>

      <ReviewModal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          setActiveOrder(null);
        }}
        orderId={targetOrder.id}
        storeId={reviewTarget.storeId}
        merchantName={reviewTarget.merchantName}
        partName={reviewTarget.partName}
        onSuccess={(review) => {
          useOrderStore.getState().patchOrderReview(String(targetOrder.id), {
            id: review.id,
            rating: review.rating,
            comment: review.comment,
            adminStatus: review.adminStatus,
            createdAt: review.createdAt,
          });
          setShowModal(false);
          setActiveOrder(null);
        }}
      />
    </>
  );
};
