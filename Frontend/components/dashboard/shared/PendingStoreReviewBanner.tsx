import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, ChevronRight, ChevronLeft, Sparkles, X, Package } from 'lucide-react';
import { useLanguage } from '../../../contexts/LanguageContext';
import { useOrderStore, type Order, type OrderOffer } from '../../../stores/useOrderStore';
import { ReviewModal } from '../reviews/ReviewModal';
import {
  findOrdersPendingReview,
  getReviewableOffers,
  isMultiPartOrder,
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
  const [showPicker, setShowPicker] = useState(false);
  const [activeOrder, setActiveOrder] = useState<Order | null>(null);
  const [selectedOfferId, setSelectedOfferId] = useState<string | undefined>(undefined);
  const [pickerMessage, setPickerMessage] = useState<string | null>(null);

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
  const reviewable = getReviewableOffers(targetOrder);
  const modalOfferId = selectedOfferId || reviewable[0]?.id;
  const reviewTarget = resolveReviewTarget(targetOrder, modalOfferId);
  if (!reviewTarget && reviewable.length === 0) return null;

  const partLabel = (offer: OrderOffer) =>
    offer.partName ||
    targetOrder.parts?.find((p) => String(p.id) === String(offer.orderPartId))?.name ||
    targetOrder.part ||
    (isAr ? 'قطعة' : 'Part');

  const openReviewFlow = (order: Order) => {
    setActiveOrder(order);
    setPickerMessage(null);
    const offers = getReviewableOffers(order);
    if (offers.length === 0) {
      setPickerMessage(
        isAr
          ? 'لا توجد قطع مكتملة بانتظار التقييم حالياً.'
          : 'No completed parts awaiting review right now.',
      );
      return;
    }
    if (offers.length === 1) {
      const onlyId = String(offers[0].id);
      setSelectedOfferId(onlyId);
      // Multi-part still needs explicit offerId — we always set it above
      setShowModal(true);
      return;
    }
    setSelectedOfferId(undefined);
    setShowPicker(true);
  };

  const pickOffer = (offerId: string) => {
    setSelectedOfferId(String(offerId));
    setShowPicker(false);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedOfferId(undefined);
    setActiveOrder(null);
  };

  const bannerTarget = resolveReviewTarget(targetOrder, reviewable[0]?.id) ?? reviewTarget;
  if (!bannerTarget) return null;

  // Hard gate: never submit multi without a concrete offerId
  const effectiveOfferId = String(
    selectedOfferId || reviewTarget?.offerId || reviewable[0]?.id || '',
  );
  const canOpenModal =
    Boolean(reviewTarget?.storeId) &&
    (!isMultiPartOrder(targetOrder) || Boolean(effectiveOfferId));

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
                  ? `قيّم ${bannerTarget.merchantName} — طلب #${targetOrder.orderNumber || targetOrder.id}`
                  : `Rate ${bannerTarget.merchantName} — Order #${targetOrder.orderNumber || targetOrder.id}`}
              </h3>
              <p className="text-white/55 text-sm mt-1.5 leading-relaxed">
                {isAr
                  ? 'تقييمك يساعد التاجر على التقدم في مستوى المتجر ويحسّن تجربة الجميع على المنصة.'
                  : 'Your rating helps the merchant advance their store level and improves the marketplace for everyone.'}
              </p>
              {reviewable.length > 1 && (
                <p className="text-gold-500/70 text-xs font-bold mt-2">
                  {isAr
                    ? `${reviewable.length} قطع مكتملة بانتظار تقييمك`
                    : `${reviewable.length} completed parts awaiting your review`}
                </p>
              )}
              {pendingOrders.length > 1 && (
                <p className="text-gold-500/70 text-xs font-bold mt-1">
                  {isAr
                    ? `${pendingOrders.length} طلبات بانتظار تقييمك`
                    : `${pendingOrders.length} orders awaiting your review`}
                </p>
              )}
              {pickerMessage && (
                <p className="text-amber-400/90 text-xs font-bold mt-2">{pickerMessage}</p>
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
              onClick={() => openReviewFlow(targetOrder)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gold-500 hover:bg-gold-400 text-black font-black text-sm transition-all shadow-lg shadow-gold-500/20"
            >
              <Star size={16} fill="currentColor" />
              {isAr ? 'قيّم المتجر الآن' : 'Rate store now'}
              <Chevron size={16} />
            </button>
          </div>
        </div>
      </motion.div>

      <AnimatePresence>
        {showPicker && (
          <div className="fixed inset-0 z-[130] flex items-end sm:items-center justify-center p-0 sm:p-4">
            <motion.button
              type="button"
              aria-label="Close"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/75 backdrop-blur-sm"
              onClick={() => setShowPicker(false)}
            />
            <motion.div
              role="dialog"
              aria-modal="true"
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 24 }}
              className="relative z-10 w-full sm:max-w-md bg-[#12100E] border border-white/10 rounded-t-3xl sm:rounded-3xl p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] shadow-2xl max-h-[80vh] overflow-y-auto"
            >
              <div className="flex items-start justify-between gap-3 mb-5">
                <div>
                  <h3 className="text-lg font-black text-white">
                    {isAr ? 'اختر القطعة للتقييم' : 'Choose a part to review'}
                  </h3>
                  <p className="text-xs text-white/45 mt-1">
                    {isAr
                      ? 'قطع مكتملة فقط — كل تقييم مرتبط بعرض ومتجر'
                      : 'Completed parts only — each review is tied to an offer and store'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowPicker(false)}
                  className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white/60 hover:text-white"
                >
                  <X size={18} />
                </button>
              </div>
              <div className="space-y-2">
                {reviewable.map((offer) => (
                  <button
                    key={offer.id}
                    type="button"
                    onClick={() => pickOffer(String(offer.id))}
                    className="w-full min-h-[52px] flex items-center gap-3 p-4 rounded-2xl border border-white/10 bg-white/[0.03] hover:bg-gold-500/10 hover:border-gold-500/30 text-start transition-all"
                  >
                    <span className="w-10 h-10 rounded-xl bg-gold-500/15 border border-gold-500/25 flex items-center justify-center text-gold-400 shrink-0">
                      <Package size={18} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-black text-white truncate">
                        {partLabel(offer)}
                      </span>
                      <span className="block text-[11px] text-white/45 font-bold mt-0.5 truncate">
                        {offer.merchantName || bannerTarget.merchantName}
                        {' · '}
                        {isAr ? 'مكتمل' : 'Completed'}
                      </span>
                    </span>
                    <Chevron size={18} className="text-white/30 shrink-0" />
                  </button>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {canOpenModal && reviewTarget && (
        <ReviewModal
          isOpen={showModal}
          onClose={closeModal}
          orderId={targetOrder.id}
          storeId={reviewTarget.storeId}
          merchantName={reviewTarget.merchantName}
          partName={reviewTarget.partName}
          offerId={effectiveOfferId || reviewTarget.offerId}
          onSuccess={(review) => {
            useOrderStore.getState().patchOrderReview(String(targetOrder.id), {
              id: review.id,
              rating: review.rating,
              comment: review.comment,
              adminStatus: review.adminStatus,
              createdAt: review.createdAt,
              offerId: effectiveOfferId || reviewTarget.offerId || null,
            });
            closeModal();
          }}
        />
      )}
    </>
  );
};
