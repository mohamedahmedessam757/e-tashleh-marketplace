import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useCheckoutStore } from '../../../../stores/useCheckoutStore';
import { useOrderStore } from '../../../../stores/useOrderStore';
import { useLanguage } from '../../../../contexts/LanguageContext';
import { CheckCircle, AlertTriangle, Package, Loader2, ChevronDown, ChevronUp, Copy, CheckCircle2, X, Wifi, WifiOff, RefreshCw, Lock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { StripePaymentForm } from '../StripePaymentForm';
import { supabase } from '../../../../services/supabase';
import { cardsApi, UserCard } from '../../../../services/api/cards';
import { paymentsApi } from '../../../../services/api/payments';
import { CreditCard } from 'lucide-react';
import {
  areAllAcceptedOffersPaid,
  collectPaidOfferIdsFromOrder,
  getAcceptedOffersFromList,
  isOfferConsideredPaid,
} from '../../../../utils/checkoutPaymentHelpers';
import { formatApiErrorMessage } from '../../../../utils/formatApiErrorMessage';

export const PaymentStep: React.FC = () => {
  const { t, language } = useLanguage();
  const isAr = language === 'ar';
  const tPay = t.dashboard.checkout.payment;
  const tFR = t.dashboard.checkout.finalReview;
  const { 
    orderId, 
    createPaymentIntent, 
    isProcessing, 
    paidOfferIds, 
    paymentError, 
    clearPaymentError,
    isOnline,
    setIsOnline,
    resetPaymentState,
    syncPaidOffersForOrder,
  } = useCheckoutStore();
  const { orders } = useOrderStore();

  // Selected offer being actively paid (has a client secret)
  const [activePaymentOfferId, setActivePaymentOfferId] = useState<string | null>(null);
  const [activeClientSecret, setActiveClientSecret] = useState<string | null>(null);
  const [activeAmount, setActiveAmount] = useState<number>(0);
  const [isPreparing, setIsPreparing] = useState(false);
  const [savedCards, setSavedCards] = useState<UserCard[]>([]);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  /** When true, show Stripe PaymentElement instead of saved-card quick pay */
  const [useNewCard, setUseNewCard] = useState(false);
  /** Client secrets from expand-prefetch — avoids a second create-intent on Pay click */
  const [prefetchedSecrets, setPrefetchedSecrets] = useState<Record<string, string>>({});
  const paymentSuccessHandledRef = useRef(new Set<string>());

  // UI state
  const [expandedOfferId, setExpandedOfferId] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  // Find the current order and its accepted offers
  const currentOrder = useMemo(() => {
    return orders.find(o => String(o.id) === String(orderId));
  }, [orders, orderId]);

  const requiredPartsArray = currentOrder?.parts || [];

  const acceptedOffers = useMemo(
    () => getAcceptedOffersFromList(currentOrder?.offers),
    [currentOrder?.offers],
  );

  const mergedPaidOfferIds = useMemo(() => {
    const fromOrder = currentOrder
      ? collectPaidOfferIdsFromOrder(currentOrder)
      : [];
    return [
      ...new Set([...paidOfferIds.map(String), ...fromOrder]),
    ];
  }, [paidOfferIds, currentOrder]);

  /** Active Stripe session — ignore stale lock on an offer already paid. */
  const effectiveActivePaymentOfferId = useMemo(() => {
    if (!activePaymentOfferId) return null;
    if (isOfferConsideredPaid(activePaymentOfferId, mergedPaidOfferIds)) {
      return null;
    }
    return activePaymentOfferId;
  }, [activePaymentOfferId, mergedPaidOfferIds]);

  useEffect(() => {
    if (!orderId || acceptedOffers.length === 0) return;
    void syncPaidOffersForOrder(acceptedOffers.map((o) => String(o.id)));
  }, [orderId, acceptedOffers, syncPaidOffersForOrder]);

  useEffect(() => {
    if (
      activePaymentOfferId &&
      isOfferConsideredPaid(activePaymentOfferId, mergedPaidOfferIds)
    ) {
      setActivePaymentOfferId(null);
      setActiveClientSecret(null);
    }
  }, [activePaymentOfferId, mergedPaidOfferIds]);

  const formatCondition = (cond: string) => {
    if (!cond || cond === '---') return '---';
    const c = cond.toLowerCase();
    if (c.includes('clean')) return isAr ? 'مستعمل - نظيف' : 'Used - Clean';
    if (c === 'new') return isAr ? 'جديد' : 'New';
    if (c === 'used') return isAr ? 'مستعمل' : 'Used';
    return cond;
  };

  const formatWarranty = (w?: string) => {
    if (!w || w === 'no' || w === 'none' || w === 'false') return tFR.noWarranty;
    const clean = w.toLowerCase().replace(/\s+/g, '');
    if (clean === 'yes' || clean === 'true') return isAr ? 'يوجد ضمان' : 'Warranty Included';
    if (clean === 'd15' || clean === '15days') return isAr ? '15 يوم' : '15 Days';
    if (clean === 'month1' || clean === '1month' || clean === '1months') return isAr ? 'شهر واحد' : '1 Month';
    if (clean === 'month3' || clean === '3month' || clean === '3months') return isAr ? '3 أشهر' : '3 Months';
    if (clean === 'month6' || clean === '6month' || clean === '6months') return isAr ? '6 أشهر' : '6 Months';
    if (clean === 'year1' || clean === '1year' || clean === '1years') return isAr ? 'سنة واحدة' : '1 Year';
    
    const num = w.match(/\d+/)?.[0];
    if (num) {
      if (w.includes('day')) return isAr ? `${num} يوم` : `${num} Days`;
      if (w.includes('month')) {
        const n = parseInt(num);
        if (isAr) {
          if (n === 1) return 'شهر واحد';
          if (n === 2) return 'شهران';
          if (n >= 3 && n <= 10) return `${n} أشهر`;
          return `${n} شهر`;
        }
        return `${num} Month${n > 1 ? 's' : ''}`;
      }
      if (w.includes('year')) return isAr ? `${num} سنة` : `${num} Year${parseInt(num) > 1 ? 's' : ''}`;
    }
    return w;
  };

  const getOfferWarranty = (offer: any) => {
    if (typeof offer?.warranty === 'string' && offer.warranty.trim()) return offer.warranty;
    if (offer?.hasWarranty) return offer?.warrantyDuration || 'yes';
    return 'no';
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  /**
   * Network Resilience: Sync online/offline state (2026 Standards)
   */
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [setIsOnline]);

  // Fetch saved cards (2026 Wallet Integration)
  useEffect(() => {
    const fetchCards = async () => {
      try {
        const cards = await cardsApi.getUserCards();
        setSavedCards(cards);
        if (cards.length > 0) {
          const defaultCard = cards.find(c => c.isDefault) || cards[0];
          setSelectedCardId(defaultCard.id);
          setUseNewCard(!defaultCard.stripePaymentMethodId);
        } else {
          setSelectedCardId(null);
          setUseNewCard(true);
        }
      } catch (err) {
        console.error('Failed to fetch saved cards:', err);
        setUseNewCard(true);
      }
    };
    fetchCards();
  }, []);

  /**
   * Real-time Synchronization: Supabase Subscription (2026 Standards)
   * This ensures the UI stays in sync even if the webhook confirms payment while the tab is closed.
   */
  useEffect(() => {
    if (!orderId) return;

    const channel = supabase
      .channel(`order-payments-${orderId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'payment_transactions',
          filter: `order_id=eq.${orderId}`,
        },
        (payload) => {
          if (payload.new.status === 'SUCCESS') {
            const offerId = String(payload.new.offer_id);
            if (!isOfferConsideredPaid(offerId, mergedPaidOfferIds)) {
              useCheckoutStore.setState((state) => ({
                paidOfferIds: [
                  ...new Set([...state.paidOfferIds.map(String), offerId]),
                ],
              }));
              
              if (activePaymentOfferId === offerId) {
                setActivePaymentOfferId(null);
                setActiveClientSecret(null);
              }
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [orderId, mergedPaidOfferIds, activePaymentOfferId, isAr]);

  /**
   * Pre-fetching Logic: Prepare intent when card is expanded (Speed Optimization)
   */
  const handlePreFetchIntent = async (offerId: string) => {
    if (isOfferConsideredPaid(offerId, mergedPaidOfferIds)) return;
    if (
      effectiveActivePaymentOfferId &&
      effectiveActivePaymentOfferId !== offerId
    ) {
      return;
    }
    if (prefetchedSecrets[offerId]) return;

    const currentOrderId = String(currentOrder?.id || orderId);
    const secret = await createPaymentIntent(currentOrderId, offerId);
    if (secret) {
      setPrefetchedSecrets((prev) => ({ ...prev, [offerId]: secret }));
    }
  };

  /**
   * Step 1: Initialize Payment (Fetch Client Secret)
   */
  const handlePreparePayment = async (offerId: string) => {
    clearPaymentError();
    setSuccessMessage(null);
    setActivePaymentOfferId(offerId);
    setIsPreparing(true);

    const currentOrderId = String(currentOrder?.id || orderId);
    
    const offer = acceptedOffers.find((o: any) => o.id === offerId);
    const price = Number(offer?.price || 0);
    setActiveAmount(price);

    try {
      const cached = prefetchedSecrets[offerId];
      const secret = cached ?? (await createPaymentIntent(currentOrderId, offerId));
      if (secret) {
        setActiveClientSecret(secret);
        if (!cached) {
          setPrefetchedSecrets((prev) => ({ ...prev, [offerId]: secret }));
        }
      } else {
        setActivePaymentOfferId(null);
      }
    } finally {
      setIsPreparing(false);
    }
  };

  /**
   * Step 2: Final Success (Callback from Stripe Component)
   */
  const handlePaymentSuccess = async (paymentIntent?: { id?: string }) => {
    const paidId = String(activePaymentOfferId!);
    const dedupeKey = paymentIntent?.id ? `${paidId}:${paymentIntent.id}` : paidId;
    if (paymentSuccessHandledRef.current.has(dedupeKey)) return;
    paymentSuccessHandledRef.current.add(dedupeKey);

    useCheckoutStore.setState((state) => ({
      paidOfferIds: [
        ...new Set([...state.paidOfferIds.map(String), paidId]),
      ],
    }));

    // Ensure backend ledger (payment, escrow, wallets) is fulfilled immediately — not only after delivery/webhook
    if (paymentIntent?.id) {
      try {
        await paymentsApi.confirmIntent(paymentIntent.id);
      } catch (err) {
        console.warn('Payment confirm-intent:', err);
      }
    }

    await syncPaidOffersForOrder([paidId]);

    // Sync saved card immediately so Quick Pay works on next offer
    if (paymentIntent?.id) {
      try {
        await cardsApi.syncFromIntent(paymentIntent.id);
        const cards = await cardsApi.getUserCards();
        setSavedCards(cards);
      } catch (err) {
        console.warn('Card sync after payment:', err);
      }
    }

    setSuccessMessage(
      isAr
        ? `✅ تم الدفع بنجاح! شكراً لك.`
        : `✅ Payment Successful! Thank you.`
    );
    
    setActivePaymentOfferId(null);
    setActiveClientSecret(null);
    setExpandedOfferId(null);
  };

  const selectedSavedCard = selectedCardId
    ? savedCards.find((c) => c.id === selectedCardId)
    : null;
  const activeSavedPaymentMethodId =
    !useNewCard && selectedSavedCard?.stripePaymentMethodId
      ? selectedSavedCard.stripePaymentMethodId
      : null;

  const totalOffers = acceptedOffers.length;
  const paidCount = acceptedOffers.filter((o) =>
    isOfferConsideredPaid(o, mergedPaidOfferIds),
  ).length;
  const allPaid = areAllAcceptedOffersPaid(acceptedOffers, mergedPaidOfferIds);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300" dir={isAr ? 'rtl' : 'ltr'}>

      {/* ────────────── Image Viewer Modal ────────────── */}
      <AnimatePresence>
        {selectedImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] bg-black/90 flex items-center justify-center p-4"
            onClick={() => setSelectedImage(null)}
          >
            <button
              onClick={() => setSelectedImage(null)}
              className="absolute top-6 right-6 text-white/60 hover:text-white bg-white/10 hover:bg-white/20 rounded-full p-2 transition-colors z-10"
            >
              <X size={24} />
            </button>
            <motion.img
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              src={selectedImage}
              alt="Part"
              className="max-w-[90vw] max-h-[85vh] object-contain rounded-2xl shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ────────────── Payment Progress Header ────────────── */}
      <div className="bg-[#121212] border border-[#2b271d] rounded-2xl p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-white font-bold text-base md:text-lg">
            {isAr ? 'الدفع للعروض المقبولة' : 'Pay for Accepted Offers'}
          </h3>
          <div className={`px-3 py-1 rounded-full text-xs font-bold ${allPaid ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'}`}>
            {paidCount}/{totalOffers} {tPay.paid}
          </div>
        </div>

        {/* Progress bar */}
        <div className="w-full bg-white/5 rounded-full h-2 overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-gold-500 to-green-500 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: totalOffers > 0 ? `${(paidCount / totalOffers) * 100}%` : '0%' }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          />
        </div>

        {!allPaid && totalOffers > 0 && (
          <p className="text-amber-400/70 text-xs mt-2 flex items-center gap-1">
            <AlertTriangle size={12} />
            {tPay.remainingParts} ({totalOffers - paidCount} {tPay.remaining})
          </p>
        )}

        {allPaid && (
          <motion.p
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-green-400 text-xs mt-2 flex items-center gap-1 font-bold"
          >
            <CheckCircle size={14} />
            {tPay.allPaid}
          </motion.p>
        )}
      </div>

      {/* ────────────── Success Message ────────────── */}
      <AnimatePresence>
        {successMessage && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: -20 }}
            className="bg-green-500/10 border-2 border-green-500/30 rounded-2xl p-6 text-green-400 text-sm font-bold text-center shadow-[0_0_30px_rgba(34,197,94,0.15)] relative overflow-hidden"
          >
            <motion.div 
              initial={{ x: '-100%' }}
              animate={{ x: '100%' }}
              transition={{ repeat: Infinity, duration: 2, ease: 'linear' }}
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent pointer-events-none"
            />
            <div className="flex flex-col items-center gap-2">
              <CheckCircle2 size={32} className="text-green-400 mb-1" />
              <span className="text-lg">{successMessage}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ────────────── Global Payment Error / Offline ────────────── */}
      <AnimatePresence>
        {!isOnline && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 text-amber-400 text-sm font-bold flex items-center gap-3 shadow-lg"
          >
            <WifiOff size={18} className="animate-pulse" />
            <div className="flex-1">
              {isAr ? 'عذراً، يبدو أنك غير متصل بالإنترنت. يرجى التحقق من اتصالك.' : 'Oops, it seems you are offline. Please check your connection.'}
            </div>
          </motion.div>
        )}

        {paymentError && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-red-400 text-sm font-bold flex flex-col md:flex-row items-center gap-3 shadow-[0_0_20px_rgba(239,68,68,0.2)]"
          >
            <div className="flex items-center gap-2 flex-1">
              <AlertTriangle size={16} />
              {formatApiErrorMessage(paymentError)}
            </div>
            <button 
              onClick={() => resetPaymentState()}
              className="px-4 py-1.5 bg-red-500 text-white rounded-lg text-xs hover:bg-red-600 transition-colors flex items-center gap-2 shrink-0"
            >
              <RefreshCw size={12} />
              {isAr ? 'إعادة المحاولة' : 'Retry'}
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ────────────── Per-Offer Payment Cards ────────────── */}
      <div className="space-y-4">
        <h3 className="text-lg font-bold text-white mb-2">{tFR.orderDetails}</h3>

        {acceptedOffers.map((offer: any) => {
          const isPaid = isOfferConsideredPaid(offer, mergedPaidOfferIds);
          const isPreparing =
            effectiveActivePaymentOfferId === offer.id && !activeClientSecret;
          const isReadyToPay =
            effectiveActivePaymentOfferId === offer.id && !!activeClientSecret;
          const isExpanded = expandedOfferId === offer.id;

          // Get the real part name from the order parts
          const part = requiredPartsArray.find((p: any) => p.id === offer.orderPartId);
          const partName = part?.name || offer.partName || offer.orderPartName || (isAr ? 'قطعة' : 'Part');

          // Get the image
          const merchantImage = offer.offerImage;
          const customerImage = part?.images?.[0] || currentOrder?.partImages?.[0];
          const imageToShow = merchantImage || customerImage;

          // Price for display
          const price = Number(offer.price || offer.unitPrice || 0);

          return (
            <motion.div
              key={offer.id}
              layout
              whileHover={{ y: isPaid ? 0 : -4 }}
              className={`rounded-2xl border overflow-hidden transition-all duration-500 relative ${isPaid
                ? 'bg-green-500/5 border-green-500/30 shadow-none'
                : isReadyToPay
                  ? 'bg-[#1a1508] border-gold-500/50 shadow-[0_20px_50px_rgba(212,175,55,0.15)]'
                  : 'bg-[#121212] border-[#2b271d] hover:border-gold-500/30 hover:shadow-[0_10px_30px_rgba(0,0,0,0.3)]'
                }`}
            >
              {isProcessing && activePaymentOfferId === offer.id && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="absolute inset-0 z-50 bg-black/40 backdrop-blur-[2px] flex items-center justify-center"
                >
                  <div className="flex flex-col items-center gap-3">
                    <Loader2 className="animate-spin text-gold-500" size={40} />
                    <span className="text-gold-500 font-bold text-xs animate-pulse uppercase tracking-widest">
                      {isAr ? 'جاري المعالجة...' : 'Processing...'}
                    </span>
                  </div>
                </motion.div>
              )}
              {/* ── Top Header ── */}
              <div
                className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 p-5 cursor-pointer"
                onClick={() => {
                  if (!isPaid && !isReadyToPay) {
                    const nextExpanded = expandedOfferId === offer.id ? null : offer.id;
                    setExpandedOfferId(nextExpanded);
                    if (nextExpanded) {
                      if (
                        activePaymentOfferId &&
                        activePaymentOfferId !== offer.id
                      ) {
                        setActivePaymentOfferId(null);
                        setActiveClientSecret(null);
                        clearPaymentError();
                      }
                      handlePreFetchIntent(offer.id);
                    }
                  }
                }}
              >
                <div className="flex items-center gap-4 w-full md:w-auto">
                  <div
                    onClick={(e) => {
                      e.stopPropagation();
                      if (imageToShow) setSelectedImage(imageToShow);
                    }}
                    className={`w-16 h-16 bg-white/5 rounded-xl flex items-center justify-center shrink-0 border border-white/10 overflow-hidden ${imageToShow ? 'cursor-pointer hover:border-gold-500/50 transition-colors' : ''}`}
                  >
                    {imageToShow ? (
                      <img src={imageToShow} alt={partName} className="w-full h-full object-cover" />
                    ) : (
                      <Package className="w-8 h-8 text-white/20" />
                    )}
                  </div>
                  <div>
                    <h4 className="font-bold text-white text-base md:text-lg leading-tight">{partName}</h4>
                    <p className="text-white/40 text-[11px] mt-0.5">
                      {offer.merchantName || 'Store'} • #{offer.offerNumber !== 'N/A' && offer.offerNumber ? offer.offerNumber : offer.id?.toString().slice(0, 8).toUpperCase()}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end">
                  <div className={`px-5 py-2 rounded-xl text-center min-w-[130px] ${isPaid ? 'bg-green-500/10 border border-green-500/20' : 'bg-[#241d0f] border border-[#4a3e20]'}`}>
                    <p className="text-[11px] text-gold-300/80 mb-0.5">{tFR.price}</p>
                    <p className={`font-bold font-mono text-lg ${isPaid ? 'text-green-400' : 'text-gold-500'}`}>
                      AED {price.toLocaleString()}
                    </p>
                  </div>

                  {isPaid ? (
                    <CheckCircle size={22} className="text-green-400 shrink-0" />
                  ) : (
                    <button className="text-white/30 hover:text-white/60 transition-colors shrink-0">
                      {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                    </button>
                  )}
                </div>
              </div>

              {/* ── Details Grid ── */}
              <div className="flex flex-wrap justify-between gap-4 px-5 pb-4 pt-2 border-t border-white/5">
                <div className="flex-1 min-w-[110px]">
                  <p className="text-[10px] text-white/40 mb-1">{tFR.orderNoDate}</p>
                  <p className="text-xs font-bold text-white font-mono flex items-center gap-2">
                    #{currentOrder?.orderNumber || currentOrder?.id?.toString().slice(0, 6).toUpperCase()}
                  </p>
                </div>
                <div className="flex-1 min-w-[110px]">
                  <p className="text-[10px] text-white/40 mb-1">{tFR.condition}</p>
                  <p className="text-xs font-bold text-white/90">{formatCondition(offer.condition)}</p>
                </div>
                <div className="flex-1 min-w-[110px]">
                  <p className="text-[10px] text-white/40 mb-1">{tFR.warranty}</p>
                  <p className="text-xs font-bold text-amber-400/90">{formatWarranty(getOfferWarranty(offer))}</p>
                </div>
                <div className="flex-1 min-w-[110px]">
                  <p className="text-[10px] text-white/40 mb-1">{tFR.paymentStatus}</p>
                  {isPaid ? (
                    <span className="inline-flex items-center gap-1.5 text-green-400 text-xs font-bold bg-green-500/10 border border-green-500/20 px-2.5 py-1 rounded-full">{tPay.paid}</span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 text-amber-400 text-xs font-bold bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-full">
                      {isAr ? 'في انتظار الدفع' : 'Awaiting Payment'}
                    </span>
                  )}
                </div>
              </div>

              {/* ── Expanded Section ── */}
              <AnimatePresence>
                {isExpanded && !isPaid && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden bg-black/20"
                  >
                    <div className="px-5 pb-6 pt-2 space-y-4">
                      {/* ── Saved Cards Quick Select ── */}
                      {savedCards.length > 0 && !isPaid && (
                        <div className="space-y-3 p-3 rounded-2xl bg-white/[0.02] border border-white/5">
                          <div className="flex items-center justify-between">
                            <p className="text-[10px] font-bold text-gold-500/80 uppercase tracking-widest flex items-center gap-2">
                              <CreditCard size={12} />
                              {isAr ? 'اختر بطاقة للدفع' : 'Choose a card to pay with'}
                            </p>
                            <span className="text-[9px] text-white/20 uppercase font-mono">
                              {savedCards.length} {isAr ? 'بطاقات' : 'Cards'}
                            </span>
                          </div>
                          <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-hide">
                            {savedCards.map((card) => (
                              <motion.button
                                key={card.id}
                                type="button"
                                whileHover={{ y: -2 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => {
                                  setSelectedCardId(card.id);
                                  setUseNewCard(!card.stripePaymentMethodId);
                                }}
                                className={`flex-shrink-0 flex items-center gap-3 px-4 py-2.5 rounded-xl border transition-all duration-300 ${
                                  !useNewCard && selectedCardId === card.id
                                    ? 'bg-gold-500/10 border-gold-500 shadow-[0_0_15px_rgba(212,175,55,0.1)]'
                                    : 'bg-white/5 border-white/5 hover:border-white/10'
                                }`}
                              >
                                <div className={`w-7 h-4 rounded flex items-center justify-center text-[7px] font-bold uppercase ${
                                  card.brand === 'visa' ? 'bg-blue-600 text-white' : 'bg-orange-500 text-white'
                                }`}>
                                  {card.brand}
                                </div>
                                <p className="text-xs font-bold text-white">•••• {card.last4}</p>
                                {!useNewCard && selectedCardId === card.id && (
                                  <CheckCircle2 size={12} className="text-gold-500" />
                                )}
                              </motion.button>
                            ))}
                            <motion.button
                              type="button"
                              whileHover={{ y: -2 }}
                              whileTap={{ scale: 0.95 }}
                              onClick={() => {
                                setUseNewCard(true);
                                setSelectedCardId(null);
                              }}
                              className={`flex-shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-xl border border-dashed transition-all duration-300 ${
                                useNewCard
                                  ? 'bg-gold-500/10 border-gold-500 text-gold-400'
                                  : 'bg-white/[0.02] border-white/10 text-white/50 hover:border-gold-500/40 hover:text-gold-400'
                              }`}
                            >
                              <CreditCard size={14} />
                              <span className="text-xs font-bold whitespace-nowrap">
                                {isAr ? 'بطاقة جديدة' : 'New Card'}
                              </span>
                            </motion.button>
                          </div>
                          {!useNewCard && selectedSavedCard && !selectedSavedCard.stripePaymentMethodId && (
                            <p className="text-[11px] text-amber-400/80 flex items-center gap-1.5">
                              <AlertTriangle size={12} />
                              {isAr
                                ? 'هذه البطاقة غير مربوطة بـ Stripe — أدخل بياناتها أدناه أو اختر «بطاقة جديدة».'
                                : 'This card is not linked to Stripe — enter details below or choose «New Card».'}
                            </p>
                          )}
                        </div>
                      )}

                      {!effectiveActivePaymentOfferId ? (
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => handlePreparePayment(offer.id)}
                          className="w-full py-4 rounded-xl bg-gradient-to-r from-gold-600 via-gold-500 to-gold-600 bg-[length:200%_auto] hover:bg-right transition-all text-black font-extrabold text-sm shadow-[0_10px_20px_rgba(212,175,55,0.2)] flex items-center justify-center gap-2 active:scale-[0.98]"
                        >
                          <Lock size={16} />
                          {useNewCard || !activeSavedPaymentMethodId
                            ? (isAr ? 'متابعة الدفع' : 'Continue to Payment')
                            : (isAr ? 'تأكيد الدفع بالبطاقة المختارة' : 'Confirm & Pay with Selected Card')
                          } — AED {price.toLocaleString()}
                        </motion.button>
                      ) : effectiveActivePaymentOfferId === offer.id ? (
                        <div>
                          {isPreparing ? (
                            <div className="flex flex-col items-center justify-center py-8 gap-3">
                              <Loader2 className="animate-spin text-gold-500" size={32} />
                              <p className="text-gold-500/70 text-sm animate-pulse">
                                {isAr ? 'جاري تجهيز بوابة الدفع الآمنة...' : 'Preparing secure payment gateway...'}
                              </p>
                            </div>
                          ) : activeClientSecret && (
                            <div className="space-y-6">
                                <div className="flex items-center justify-between text-xs px-2">
                                    <div className="flex items-center gap-2">
                                      <span className="text-white/40">
                                        {isAr ? 'دفع آمن عبر ' : 'Secure payment via '}
                                        <span className="text-[#635bff] font-bold">Stripe</span>
                                      </span>
                                      <div className="h-3 w-[1px] bg-white/10 mx-1" />
                                      <div className={`flex items-center gap-1 ${isOnline ? 'text-green-500/80' : 'text-amber-500/80'}`}>
                                        {isOnline ? <Wifi size={10} /> : <WifiOff size={10} />}
                                        <span className="text-[9px] font-bold uppercase tracking-tighter opacity-80">
                                          {isOnline ? (isAr ? 'متصل' : 'Online') : (isAr ? 'غير متصل' : 'Offline')}
                                        </span>
                                      </div>
                                    </div>
                                    <button 
                                      onClick={() => { setActivePaymentOfferId(null); setActiveClientSecret(null); resetPaymentState(); }}
                                      className="text-red-400/60 hover:text-red-400 transition-colors"
                                    >
                                      {isAr ? 'إلغاء' : 'Cancel'}
                                    </button>
                                </div>
                                <StripePaymentForm 
                                    clientSecret={activeClientSecret}
                                    amount={activeAmount}
                                    savedPaymentMethodId={activeSavedPaymentMethodId}
                                    onSwitchToNewCard={() => {
                                      setUseNewCard(true);
                                      setSelectedCardId(null);
                                    }}
                                    onSuccess={handlePaymentSuccess}
                                    onError={(err) =>
                                      useCheckoutStore.setState({
                                        paymentError: formatApiErrorMessage(err, 'Payment failed'),
                                      })
                                    }
                                />
                            </div>
                          )}
                        </div>
                      ) : (
                        <p className="text-center text-xs text-white/20 py-4">
                           {isAr ? 'يرجى إكمال الدفع النشط أولاً' : 'Please complete active payment first'}
                        </p>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>

      {/* ────────────── Empty State ────────────── */}
      {acceptedOffers.length === 0 && (
        <div className="bg-[#121212] border border-[#2b271d] rounded-2xl p-8 text-center">
          <Package className="w-12 h-12 text-white/10 mx-auto mb-3" />
          <p className="text-white/40 text-sm">
            {isAr ? 'لا توجد عروض مقبولة للدفع' : 'No accepted offers to pay for'}
          </p>
        </div>
      )}
    </div>
  );
};
