import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GlassCard } from '../ui/GlassCard';
import { Button } from '../ui/Button';
import { Badge, StatusType } from '../ui/Badge';
import { StatusTimeline } from '../ui/StatusTimeline';
import type { FulfillmentSummaryPartHint } from '../ui/StatusTimeline';
import { VerificationPhaseBanner, shouldShowVerificationBanner } from '../ui/VerificationPhaseBanner';
import { formatOrderDisplayId } from '../../utils/orderDisplayId';
import { OfferCard } from './OfferCard';
import { PartOffersDrawer } from './PartOffersDrawer';
import { ChevronRight, ChevronLeft, Calendar, FileText, Package, Clock, Shield, Truck, Search, MapPin, Star, AlertTriangle, RefreshCcw, CheckCircle2, X, Loader2, Eye, ChevronDown, ChevronUp, ExternalLink, Lock, ShoppingBag } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useCheckoutStore } from '../../stores/useCheckoutStore';
import { useChatStore } from '../../stores/useChatStore';
import { useOrderStore, Order, OrderOffer } from '../../stores/useOrderStore';
import { useOrderById } from '../../hooks/useOrderById';
import { useOrderRealtimeSync } from '../../hooks/useOrderRealtimeSync';
import { isAcceptedOfferStatus, isRejectedOfferStatus } from '../../utils/offerStatusHelpers';
import { getOrderExpiryScenario, getExpiredPartsWithoutOffers, type OrderExpiryScenario } from '../../utils/orderExpiryHelpers';
import { writeCreateOrderPrefill } from '../../stores/useCreateOrderStore';
import { useOrderChatStore } from '../../stores/useOrderChatStore';
import { useNotificationStore } from '../../stores/useNotificationStore';
import { TrackingView } from './tracking/TrackingView';
import { ReviewModal } from './reviews/ReviewModal';
import { ReturnRequestModal } from './resolution/ReturnRequestModal';
import { DisputeModal } from './resolution/DisputeModal';
import { OrderExpiredModal } from './OrderExpiredModal';
import { OrderInvoicesPanel } from './shared/OrderInvoicesPanel';
import { OrderWaybillsPanel } from './shared/OrderWaybillsPanel';
import { ShipmentBatchCard } from './shared/ShipmentBatchCard';
import { useShipmentsStore } from '../../stores/useShipmentsStore';
import { ShipmentTracker } from './shipments/ShipmentTracker';
import { OrderCountdown } from '../ui/OrderCountdown';
import { WarrantyProtectionCard } from '../ui/WarrantyProtectionCard';
import { useResolutionStore } from '../../stores/useResolutionStore';
import { ShippingPaymentCard } from './resolution/ShippingPaymentCard';
import { POST_DELIVERY_RETURN_DISPUTE_HOURS } from '../../utils/orderSla';
import { resolveReviewTarget } from '../../utils/reviewHelpers';
import { parseImageList, resolveMediaSrc, resolvePartPrimaryImage } from '../../utils/partMedia';
import { ordersApi } from '../../services/api/orders';
import {
    getFulfillmentLabel,
    computeShipmentDeliverySummary,
    allShipmentBatchesDelivered,
} from '../../utils/offerFulfillmentHelpers';
import { MerchantHandoverPendingBanner } from './shared/MerchantHandoverPendingBanner';
import { CartShipmentBadge } from './shared/CartShipmentBadge';
import { PartialShippingProgressCard } from './shared/PartialShippingProgressCard';
import { PartialDeliveryProgressCard } from './shared/PartialDeliveryProgressCard';
import { PartReturnWindowCard, PartReturnWindowOffer } from './shared/PartReturnWindowCard';
import { useOrderFulfillmentSummary } from '../../hooks/useOrderFulfillmentSummary';
import type { EligibleResolutionPart } from './resolution/resolutionTypes';
import {
    collectPaidOfferIdsFromOrder,
    getAcceptedOffersFromList,
    hasRemainingPaymentDue,
    isOfferConsideredPaid,
    shouldShowContinuePaymentButton,
} from '../../utils/checkoutPaymentHelpers';
import { PendingStoreReviewBanner } from './shared/PendingStoreReviewBanner';
import { MultiItemCompletionBadge } from './shared/MultiItemCompletionBadge';
import { MultiItemResolutionProgress } from './shared/MultiItemResolutionProgress';
import { readDashboardDeepLink } from '../../utils/widersDeepLink';

interface OrderDetailsProps {
    orderId: string | null;
    onBack: () => void;
    onNavigate: (path: string, id?: any) => void;
}




export const CountdownTimer = ({ targetDate, label, compact = false, hideExpiredText = false }: { targetDate: string, label?: string, compact?: boolean, hideExpiredText?: boolean }) => {
    const { t } = useLanguage();
    const [timeLeft, setTimeLeft] = useState<{ h: number, m: number, s: number } | null>(null);

    useEffect(() => {
        const interval = setInterval(() => {
            const now = new Date().getTime();
            const target = new Date(targetDate).getTime();
            const diff = target - now;

            if (diff <= 0) {
                setTimeLeft(null);
                clearInterval(interval);
            } else {
                const h = Math.floor(diff / (1000 * 60 * 60));
                const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
                const s = Math.floor((diff % (1000 * 60)) / 1000);
                setTimeLeft({ h, m, s });
            }
        }, 1000);
        return () => clearInterval(interval);
    }, [targetDate]);

    if (!timeLeft) return hideExpiredText ? null : <span className="text-red-500 font-bold text-xs">{t.dashboard.common?.expired || 'Expired'}</span>;

    return (
        <div className={`flex ${compact ? 'flex-row items-center gap-2' : 'flex-col items-end'}`}>
            {label && <span className={`${compact ? 'text-xs text-white/60' : 'text-[10px] text-white/40 mb-1'}`}>{label}</span>}
            <div className={`flex gap-1 text-gold-400 font-mono font-bold ${compact ? 'text-xs' : 'text-sm'}`}>
                {compact && <Clock size={12} className="text-white/40 mr-1" />}
                <span>{String(timeLeft.h).padStart(2, '0')}</span>:
                <span>{String(timeLeft.m).padStart(2, '0')}</span>:
                <span>{String(timeLeft.s).padStart(2, '0')}</span>
            </div>
        </div>
    );
};

export const WarrantyBadge = ({ endDate, status, onReplace }: { endDate: string, status: string, onReplace?: () => void }) => {
    const { t, language } = useLanguage();
    const isAr = language === 'ar';
    const [timeLeft, setTimeLeft] = useState<{ d: number, h: number, m: number } | null>(null);

    useEffect(() => {
        const calculate = () => {
            const now = new Date().getTime();
            const target = new Date(endDate).getTime();
            const diff = target - now;

            if (diff <= 0) {
                setTimeLeft(null);
            } else {
                const d = Math.floor(diff / (1000 * 60 * 60 * 24));
                const h = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
                setTimeLeft({ d, h, m });
            }
        };
        calculate();
        const interval = setInterval(calculate, 60000); // Update every minute
        return () => clearInterval(interval);
    }, [endDate]);

    const isExpired = !timeLeft || status === 'WARRANTY_EXPIRED';

    return (
        <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className={`flex items-center gap-3 px-4 py-2 rounded-2xl border backdrop-blur-md shadow-lg transition-all ${
                isExpired 
                ? 'bg-zinc-500/10 border-zinc-500/20 text-zinc-400' 
                : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 shadow-emerald-500/10'
            }`}
        >
            <div className={`relative ${!isExpired && 'animate-pulse'}`}>
                <Shield size={18} className={isExpired ? 'text-zinc-500' : 'text-emerald-400'} />
                {!isExpired && <div className="absolute inset-0 bg-emerald-400 blur-md opacity-30" />}
            </div>
            
            <div className="flex flex-col">
                <span className="text-[10px] font-black uppercase tracking-widest opacity-60">
                    {isAr ? 'حماية الضمان 2026' : '2026 Warranty Protection'}
                </span>
                <div className="flex items-center gap-2">
                    <span className="text-sm font-bold">
                        {isExpired 
                            ? (isAr ? 'الضمان منتهي' : 'Warranty Expired') 
                            : (isAr ? `ينتهي خلال: ${timeLeft.d} يوم و ${timeLeft.h} س` : `Ends in: ${timeLeft.d}d ${timeLeft.h}h`)
                        }
                    </span>
                    {!isExpired && (
                        <button
                            onClick={(e) => { e.stopPropagation(); onReplace?.(); }}
                            className="ms-3 px-3 py-1 bg-emerald-500 text-black text-[10px] font-black rounded-lg hover:bg-emerald-400 transition-all active:scale-95 shadow-lg shadow-emerald-500/20"
                        >
                            {isAr ? 'استبدال القطعة' : 'REPLACE PART'}
                        </button>
                    )}
                </div>
            </div>
        </motion.div>
    );
};

export const OrderDetails: React.FC<OrderDetailsProps> = ({ orderId, onBack, onNavigate }) => {
    const { t, language } = useLanguage();
    const { checkSLA, updateOrderStatus } = useOrderStore();
    const { setSelectedOffer: setSelectedOfferAction } = useCheckoutStore();
    const { fetchChat } = useOrderChatStore();
    const { addNotification } = useNotificationStore();
    const { shipments, fetchShipments } = useShipmentsStore();
    const { cases, fetchCases } = useResolutionStore();
    // UI State
    const [selectedOffer, setSelectedOffer] = useState<string | null>(null);
    const [acceptLoadingOfferId, setAcceptLoadingOfferId] = useState<string | null>(null);
    const [chatLoading, setChatLoading] = useState(false);
    const [showTracking, setShowTracking] = useState(false);
    const [isLoadingSupport, setIsLoadingSupport] = useState(false);
    const [showReviewModal, setShowReviewModal] = useState(false);
    const [reviewOfferId, setReviewOfferId] = useState<string | undefined>(undefined);
    const [reviewedOfferIds, setReviewedOfferIds] = useState<Set<string>>(() => new Set());
    const [showReturnModal, setShowReturnModal] = useState(false);
    const [showDisputeModal, setShowDisputeModal] = useState(false);
    const [showExpiredModal, setShowExpiredModal] = useState(false);
    const [expiredModalVariant, setExpiredModalVariant] = useState<OrderExpiryScenario>('no_offers');
    const [expiryTick, setExpiryTick] = useState(0);
    const [isRenewing, setIsRenewing] = useState(false);
    const [lightboxImage, setLightboxImage] = useState<string | null>(null);
    const deepLink = useMemo(() => readDashboardDeepLink(), []);
    const [activeTab, setActiveTab] = useState<'overview' | 'invoices' | 'waybills'>(
        deepLink.tab ?? 'overview',
    );
    const [returnInitialReason, setReturnInitialReason] = useState<string | undefined>(undefined);
    const [resolutionPart, setResolutionPart] = useState<{
        orderPartId?: string;
        partName: string;
        merchantName: string;
    } | null>(null);

    // Rejection State
    const [offerToReject, setOfferToReject] = useState<OrderOffer | null>(null);
    const [rejectReason, setRejectReason] = useState('');
    const [customRejectReason, setCustomRejectReason] = useState('');
    const [isRejecting, setIsRejecting] = useState(false);

    // Part Offers Drawer state
    const [drawerPart, setDrawerPart] = useState<{
        id: string;
        name: string;
        description?: string;
        image?: string;
        index: number;
    } | null>(null);
    const [isConfirmingDelivery, setIsConfirmingDelivery] = useState(false);
    const [deliveryNote, setDeliveryNote] = useState('');
    const [showConfirmDeliveryModal, setShowConfirmDeliveryModal] = useState(false);

    const order = useOrderById(orderId || undefined);
    useOrderRealtimeSync(orderId, { includeReviews: true });
    const shipment = shipments.find(s => s.orderId === (orderId || ''));
    const fulfillmentSummary = useOrderFulfillmentSummary(orderId || undefined, order);

    const shipmentDeliverySummary = useMemo(
        () => computeShipmentDeliverySummary(order?.shipments, order?.status),
        [order?.shipments, order?.status],
    );

    const canConfirmFullReceipt = useMemo(() => {
        if (!order || order.status !== 'SHIPPED') return false;
        return allShipmentBatchesDelivered(order.shipments);
    }, [order?.status, order?.shipments]);

    // Re-check selection/offer/collection deadlines while customer stays on the page
    useEffect(() => {
        if (!order) return;
        if (!['AWAITING_SELECTION', 'AWAITING_OFFERS', 'CANCELLED', 'COLLECTING_OFFERS'].includes(order.status)) return;
        const id = setInterval(() => setExpiryTick((t) => t + 1), 30000);
        return () => clearInterval(id);
    }, [order?.status]);

    // Show expired modal when pre-payment window closes (no offers or selection timeout)
    useEffect(() => {
        if (!order) return;

        const visible = order.offers?.filter((o: any) => !isRejectedOfferStatus(o.status)) || [];
        const accepted = order.offers?.filter((o: any) => isAcceptedOfferStatus(o.status)) || [];
        const scenario = getOrderExpiryScenario({
            order: {
                status: order.status,
                createdAt: order.createdAt,
                date: order.date,
                requestType: order.requestType,
                selectionDeadlineAt: order.selectionDeadlineAt,
                revealOffersAt: order.revealOffersAt,
            },
            offers: order.offers,
            parts: order.parts?.map((p) => ({ id: p.id, name: p.name })) ?? [],
            visibleOffersCount: visible.length,
            acceptedOffersCount: accepted.length,
        });

        if (!scenario) return;

        const storageKey = `expired_modal_seen_${order.id}`;
        if (localStorage.getItem(storageKey)) return;

        setExpiredModalVariant(scenario);
        const timer = setTimeout(() => setShowExpiredModal(true), 500);
        return () => clearTimeout(timer);
    }, [order, order?.status, order?.offers, expiryTick]);

    useEffect(() => {
        if (orderId) {
            fetchCases('customer');
        }
    }, [orderId]);

    const activeShippingCase = cases.find(c => 
        c.orderId === orderId && 
        c.shippingPaymentStatus === 'PENDING' && 
        !['RESOLVED', 'CLOSED', 'CANCELLED'].includes(c.status)
    );

    const handleCloseExpiredModal = (dontShowAgain: boolean) => {
        if (dontShowAgain && order) {
            localStorage.setItem(`expired_modal_seen_${order.id}`, 'true');
        }
        setShowExpiredModal(false);
    };

    useEffect(() => {
        checkSLA();
        fetchShipments();
    }, [orderId, checkSLA, fetchShipments]);

    // Auto-open drawer for specific part if requested from checkout
    useEffect(() => {
        const { openDrawerForPartId, setOpenDrawerForPartId } = useCheckoutStore.getState();
        if (openDrawerForPartId && order?.parts) {
            const partIdx = order.parts.findIndex(p => p.id === openDrawerForPartId);
            if (partIdx !== -1) {
                const p = order.parts[partIdx];
                const partImgSrc = resolvePartPrimaryImage(p, order.partImages);

                // Small timeout to ensure DOM is ready and modal transitions don't conflict
                setTimeout(() => {
                    setDrawerPart({
                        id: String(p.id),
                        name: p.name,
                        description: p.description,
                        image: partImgSrc,
                        index: partIdx
                    });
                }, 100);
            }
            // Clear it so it doesn't trigger again
            setOpenDrawerForPartId(null);
        }
    }, [order]);

    if (!order) return <div className="text-white text-center py-10">{t.dashboard.common?.notFound || 'Order not found'}</div>;

    const visibleOffers = order.offers?.filter((o: any) => !isRejectedOfferStatus(o.status)) || [];
    const acceptedOffers = order.offers?.filter((o: any) => isAcceptedOfferStatus(o.status)) || [];
    const orderExpiryContext = {
        status: order.status,
        createdAt: order.createdAt,
        date: order.date,
        requestType: order.requestType,
        selectionDeadlineAt: order.selectionDeadlineAt,
        revealOffersAt: order.revealOffersAt,
    };
    const expiryScenario = getOrderExpiryScenario({
        order: orderExpiryContext,
        offers: order.offers,
        parts: order.parts?.map((p) => ({ id: p.id, name: p.name })) ?? [],
        visibleOffersCount: visibleOffers.length,
        acceptedOffersCount: acceptedOffers.length,
    });
    const firstAcceptedOffer = acceptedOffers[0];
    const isMultiPartOrder = (order.parts?.length ?? 0) > 1;
    const isDeliveredLike = ['DELIVERED', 'PARTIALLY_DELIVERED', 'DELIVERED_TO_CUSTOMER'].includes(
        order.status,
    );

    const BackIcon = language === 'ar' ? ChevronRight : ChevronLeft;

    const partResolutionByOfferId = useMemo(() => {
        const map = new Map<string, FulfillmentSummaryPartHint>();
        fulfillmentSummary?.parts?.forEach((p) => {
            if (p.offerId) map.set(p.offerId, p);
        });
        return map;
    }, [fulfillmentSummary]);

    const eligibleResolutionParts = useMemo((): EligibleResolutionPart[] => {
        if (!order || !fulfillmentSummary?.parts?.length) return [];
        return fulfillmentSummary.parts
            .filter((p) => p.isReturnEligible && p.orderPartId && !p.hasOpenCase)
            .map((p) => {
                const offer = order.offers?.find((o) => String(o.id) === String(p.offerId));
                return {
                    offerId: p.offerId,
                    orderId: order.id,
                    orderPartId: p.orderPartId!,
                    partName: p.partName,
                    merchantName: offer?.merchantName ?? order.merchantName ?? 'Store',
                    orderNumber: order.orderNumber,
                    returnWindowEndsAt: p.returnWindowEndsAt,
                    isReturnEligible: p.isReturnEligible,
                };
            });
    }, [fulfillmentSummary, order]);

    const openReturnForPart = (offer: PartReturnWindowOffer) => {
        setResolutionPart({
            orderPartId: offer.orderPartId || undefined,
            partName: offer.partName,
            merchantName: offer.merchantName,
        });
        setReturnInitialReason(undefined);
        setShowReturnModal(true);
    };

    const openDisputeForPart = (offer: PartReturnWindowOffer) => {
        setResolutionPart({
            orderPartId: offer.orderPartId || undefined,
            partName: offer.partName,
            merchantName: offer.merchantName,
        });
        setShowDisputeModal(true);
    };

    const modalPartName = resolutionPart?.partName ?? order?.part ?? 'Part';
    const modalMerchantName = resolutionPart?.merchantName ?? order?.merchantName ?? 'Store';
    const modalOrderPartId = isMultiPartOrder ? resolutionPart?.orderPartId : undefined;

    const expiredPartsWithoutOffers = isMultiPartOrder
        ? getExpiredPartsWithoutOffers(
              orderExpiryContext,
              order.offers,
              order.parts?.map((p) => ({ id: p.id, name: p.name })) ?? [],
          )
        : [];
    const expiredPartIdsWithoutOffers = new Set(expiredPartsWithoutOffers.map((p) => p.id));

    const handleReorderPart = (sourcePartId?: string) => {
        const make = order.vehicle?.make;
        const model = order.vehicle?.model;
        if (!make || !model) return;
        writeCreateOrderPrefill({
            make,
            model,
            year: order.vehicle?.year ? String(order.vehicle.year) : undefined,
            sourceOrderId: order.id,
            sourcePartId: sourcePartId,
        });
        onNavigate('create-order');
    };

    const openCheckout = (accOffer?: typeof firstAcceptedOffer) => {
        const checkout = useCheckoutStore.getState();

        const paidIds = collectPaidOfferIdsFromOrder(order);
        const acceptedForPay = getAcceptedOffersFromList(order.offers);
        const hasPartialPayment =
            paidIds.length > 0 && hasRemainingPaymentDue(order);
        const firstUnpaid =
            acceptedForPay.find((o) => !isOfferConsideredPaid(o, paidIds)) ??
            firstAcceptedOffer;

        const defaultStep = isMultiPartOrder
            ? hasPartialPayment
                ? 3
                : 0
            : hasPartialPayment
              ? 3
              : 1;

        checkout.initCheckoutForOrder(order.id, { defaultStep });
        checkout.hydrateShippingFromOrder(order);

        if (paidIds.length > 0) {
            useCheckoutStore.setState((s) => ({
                paidOfferIds: [
                    ...new Set([...s.paidOfferIds.map(String), ...paidIds]),
                ],
            }));
            checkout.persistCheckoutSession();
        }

        if (hasPartialPayment && useCheckoutStore.getState().step < 3) {
            checkout.setStep(3);
        }

        const target = accOffer ?? firstUnpaid ?? firstAcceptedOffer;
        if (target) {
            setSelectedOfferAction({
                id: target.id,
                merchantName: target.merchantName,
                price: target.price,
                partName: order.part,
            });
        }

        void checkout.syncPaidOffersForOrder(
            acceptedForPay.map((o) => String(o.id)),
        );
        onNavigate('checkout');
    };

    const showContinuePayment = shouldShowContinuePaymentButton(order);
    const continuePaymentLabel =
        order.status === 'PARTIALLY_PAID' || hasRemainingPaymentDue(order)
            ? language === 'ar'
                ? 'إكمال دفع باقي القطع'
                : 'Pay Remaining Parts'
            : language === 'ar'
              ? 'إكمال تفاصيل الدفع'
              : 'Continue Checkout';

    const handleAcceptOffer = async (offer: any) => {
        setAcceptLoadingOfferId(String(offer.id));

        try {
            const partId = offer.orderPartId || (order.parts && order.parts[0]?.id) || 'main';
            if (!offer.orderPartId && isMultiPartOrder) {
                console.warn('Accepting a general offer on a multi-part order is not supported.');
            }

            await useOrderStore.getState().acceptOffer(order.id, partId, offer.id);

            if (isMultiPartOrder) {
                setDrawerPart(null);
                useNotificationStore.getState().addNotification({
                    type: 'SYSTEM',
                    titleAr: 'تم قبول العرض',
                    titleEn: 'Offer accepted',
                    messageAr: 'يمكنك قبول عروض باقي القطع ثم المتابعة للدفع.',
                    messageEn: 'You can accept offers for other parts, then continue to checkout.',
                    recipientRole: 'CUSTOMER',
                });
            } else {
                openCheckout(offer);
            }
        } catch (error) {
            console.error('Failed to accept offer:', error);
            useNotificationStore.getState().addNotification({
                type: 'SYSTEM',
                titleAr: 'فشل قبول العرض',
                titleEn: 'Failed to accept offer',
                messageAr: 'حدث خطأ أثناء معالجة طلبك.',
                messageEn: 'An error occurred while processing your request.',
                recipientRole: 'CUSTOMER',
            });
        } finally {
            setAcceptLoadingOfferId(null);
        }
    };

    const handleChat = async (offer: any) => {
        setChatLoading(true);
        try {
            // Resolve the vendor/store ID from multiple potential fields
            const vendorId = offer.storeId || offer.vendorId || offer.store_id || offer.merchantId;
            
            if (!vendorId) {
                console.error('Chat Initiation Failed: Missing vendor ID', offer);
                throw new Error(language === 'ar' ? 'معرف التاجر مفقود' : 'Merchant ID is missing');
            }

            // Use the REAL backend API — creates/gets chat in order_chats table
            const newChat = await fetchChat(String(order.id), String(vendorId));
            
            if (newChat && newChat.id) {
                onNavigate('chats', newChat.id); // Explicitly pass the chat ID
            } else {
                throw new Error('Chat was initialized but no ID was returned.');
            }
        } catch (e: any) {
            const apiMessage = e?.response?.data?.message;
            console.error('Failed to init chat:', e);
            
            useNotificationStore.getState().addNotification({
                type: 'SYSTEM',
                titleAr: 'فشل فتح المحادثة',
                titleEn: 'Failed to Open Chat',
                messageAr: apiMessage || (language === 'ar' ? 'حدث خطأ أثناء محاولة بدء المحادثة.' : 'An error occurred while trying to initialize the chat.'),
                messageEn: apiMessage || 'An error occurred while trying to initialize the chat.',
                recipientRole: 'CUSTOMER'
            });
        } finally {
            setChatLoading(false);
        }
    };

    const handleSupportClick = async () => {
        setIsLoadingSupport(true);
        try {
            const subject = `${language === 'ar' ? 'طلب رقم' : 'Order'} #${order.id}`;

            // We simulate API call
            await new Promise(res => setTimeout(res, 500));
            onNavigate('support', { subject });
        } catch (e) {
            console.error('Failed to open support ticket dialog', e);
        } finally {
            setIsLoadingSupport(false);
        }
    };

    const submitRejectOffer = async () => {
        if (!offerToReject || !orderId) return;
        setIsRejecting(true);
        try {
            await useOrderStore.getState().rejectOffer(
                orderId,
                offerToReject.id,
                rejectReason,
                rejectReason === 'أسباب أخرى' ? customRejectReason : undefined
            );

            // Rejection successful
            addNotification({
                type: 'success',
                titleAr: 'تم رفض العرض',
                titleEn: 'Offer Rejected',
                messageAr: 'تم رفض العرض بنجاح',
                messageEn: 'The offer was successfully rejected'
            });

            setOfferToReject(null);
            setRejectReason('');
            setCustomRejectReason('');

            // If the drawer is open and there are no more offers, close it
            if (drawerPart) {
                const remainingOffers = order.offers.filter((o: any) => o.orderPartId === drawerPart.id && o.id !== offerToReject.id && !isRejectedOfferStatus(o.status));
                if (remainingOffers.length === 0) {
                    setDrawerPart(null);
                }
            }
        } catch (error) {
            addNotification({
                type: 'error',
                titleAr: 'خطأ',
                titleEn: 'Error',
                messageAr: 'تعذر إرسال الرفض',
                messageEn: 'Could not submit rejection'
            });
        } finally {
            setIsRejecting(false);
        }
    };

    // Helper to calculate deadlines
    const getOfferDeadline = () => {
        const d = new Date(order.createdAt || order.date); // Fallback to date if createdAt missing
        d.setHours(d.getHours() + 24);
        return d.toISOString();
    };

    const isOrderExpired = () => {
        if (order.status === 'CANCELLED') return true;
        
        // 1. Awaiting Offers Expiry (Legacy/Single-Part)
        if (order.status === 'AWAITING_OFFERS') {
            const d = new Date(order.createdAt || order.date);
            d.setHours(d.getHours() + 24);
            return new Date().getTime() > d.getTime();
        }

        // 2. Awaiting Selection Expiry (2026/Multi-Part Reveal Logic)
        if (order.status === 'AWAITING_SELECTION') {
            if (order.selectionDeadlineAt) {
                return new Date().getTime() > new Date(order.selectionDeadlineAt).getTime();
            }
            // Fallback: 48h from creation (24h collecting + 24h selection)
            const d = new Date(order.createdAt || order.date);
            d.setHours(d.getHours() + 48);
            return new Date().getTime() > d.getTime();
        }

        return false;
    };

    const isExpired = isOrderExpired();

    const getPaymentDeadline = () => {
        if (order.paymentDeadlineAt) return order.paymentDeadlineAt;
        const baseDate = order.offerAcceptedAt || order.updatedAt;
        if (!baseDate) return '';
        const d = new Date(baseDate);
        d.setHours(d.getHours() + 24);
        return d.toISOString();
    };

    const getPreparationDeadline = () => {
        const paymentDates = order.payments?.map((p: any) => new Date(p.createdAt || p.paidAt).getTime()).filter(Boolean) || [];
        const paidAt = paymentDates.length > 0 ? new Date(Math.min(...paymentDates)).toISOString() : null;
        const baseDate = paidAt || order.updatedAt; // timestamp of switching to PREPARATION node
        if (!baseDate) return '';
        const d = new Date(baseDate);
        d.setHours(d.getHours() + 48);
        return d.toISOString();
    };

    const getReturnDeadline = () => {
        if (isMultiPartOrder) return '';
        if (order.status !== 'DELIVERED' && order.status !== 'DELIVERED_TO_CUSTOMER') return '';
        const baseDate = order.deliveredAt || order.updatedAt;
        if (!baseDate) return '';
        const d = new Date(baseDate);
        d.setHours(d.getHours() + POST_DELIVERY_RETURN_DISPUTE_HOURS);
        return d.toISOString();
    }

    const handleConfirmDelivery = async () => {
        setIsConfirmingDelivery(true);
        try {
            const success = await useOrderStore.getState().confirmOrderReceived(order.id, deliveryNote);
            if (success) {
                setShowConfirmDeliveryModal(false);
                setDeliveryNote('');
                addNotification({
                    type: 'success',
                    titleAr: 'تم استلام الطلب',
                    titleEn: 'Order Received',
                    messageAr: 'شكراً لك! تم تحديث حالة الطلب إلى "تم التوصيل". يمكنك الآن تقييم التاجر.',
                    messageEn: 'Thank you! Order status updated to "Delivered". You can now review the merchant.'
                });
            }
        } catch (error) {
            console.error('Delivery confirmation error:', error);
        } finally {
            setIsConfirmingDelivery(false);
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 relative">

            {/* Chat Initiation Loading Overlay */}
            {chatLoading && (
                <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center gap-4">
                    <div className="w-12 h-12 border-3 border-gold-500/30 border-t-gold-500 rounded-full animate-spin" />
                    <p className="text-white font-bold text-lg animate-pulse">
                        {language === 'ar' ? 'جاري فتح المحادثة...' : 'Opening chat...'}
                    </p>
                </div>
            )}

            {(() => {
                const reviewTarget = resolveReviewTarget(order, reviewOfferId);
                return (
                    <ReviewModal
                        isOpen={showReviewModal}
                        onClose={() => {
                            setShowReviewModal(false);
                            setReviewOfferId(undefined);
                        }}
                        orderId={order.id}
                        storeId={reviewTarget?.storeId}
                        merchantName={reviewTarget?.merchantName}
                        partName={reviewTarget?.partName}
                        offerId={reviewTarget?.offerId}
                        onSuccess={(review) => {
                            if (!orderId) return;
                            if (reviewTarget?.offerId) {
                                setReviewedOfferIds((prev) => new Set(prev).add(reviewTarget.offerId!));
                            }
                            useOrderStore.getState().patchOrderReview(orderId, {
                                id: review.id,
                                rating: review.rating,
                                comment: review.comment,
                                adminStatus: review.adminStatus,
                                createdAt: review.createdAt,
                            });
                        }}
                    />
                );
            })()}

            <OrderExpiredModal
                isOpen={showExpiredModal}
                orderId={order.id}
                orderNumber={order.orderNumber}
                partName={order.part}
                variant={expiredModalVariant}
                onClose={handleCloseExpiredModal}
            />

            <PendingStoreReviewBanner order={order} onNavigate={onNavigate} className="mb-6" />

            {isMultiPartOrder && (fulfillmentSummary?.parts?.length ?? 0) > 1 && (
                <motion.div
                    initial={{ opacity: 0, y: -12 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-6"
                >
                    <GlassCard className="p-4 border-amber-500/20 bg-amber-500/[0.04] flex flex-col sm:flex-row sm:items-center gap-3">
                        <MultiItemCompletionBadge
                            completedCount={
                                fulfillmentSummary?.parts?.filter((p) => p.fulfillmentStatus === 'COMPLETED').length ?? 0
                            }
                            totalCount={fulfillmentSummary?.parts?.length ?? order.parts?.length ?? 0}
                        />
                        <p className="text-sm text-white/60 leading-relaxed">
                            {language === 'ar'
                                ? 'كل قطعة لها نافذة إرجاع/نزاع مستقلة لمدة 24 ساعة بعد التسليم.'
                                : 'Each part has its own independent 24-hour return/dispute window after delivery.'}
                        </p>
                    </GlassCard>
                </motion.div>
            )}

            {/* Premium Warranty Protection Hub (2026) */}
            {order.status === 'WARRANTY_ACTIVE' && order.warranty_end_at && (
                <motion.div 
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-8"
                >
                    <WarrantyProtectionCard 
                        order={order} 
                        onClaim={(id) => {
                            setReturnInitialReason('warranty_claim');
                            // If a specific offer/part ID is passed, we can handle it in the modal or store
                            setShowReturnModal(true);
                        }} 
                    />
                </motion.div>
            )}

            {/* Lightbox Viewer */}
            <AnimatePresence>
                {lightboxImage && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setLightboxImage(null)}
                        className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 cursor-zoom-out"
                    >
                        <button
                            onClick={() => setLightboxImage(null)}
                            className="absolute top-6 right-6 p-2 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors"
                        >
                            <X size={24} />
                        </button>
                        <motion.img
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            src={lightboxImage}
                            alt="Preview"
                            className="max-w-full max-h-[90vh] object-contain rounded-xl border border-white/10 shadow-2xl"
                            onClick={(e) => e.stopPropagation()}
                        />
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Lightbox Viewer */}
            <AnimatePresence>
                {lightboxImage && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setLightboxImage(null)}
                        className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 cursor-zoom-out"
                    >
                        <button
                            onClick={() => setLightboxImage(null)}
                            className="absolute top-6 right-6 p-2 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors"
                        >
                            <X size={24} />
                        </button>
                        <motion.img
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            src={lightboxImage}
                            alt="Preview"
                            className="max-w-full max-h-[90vh] object-contain rounded-xl border border-white/10 shadow-2xl"
                            onClick={(e) => e.stopPropagation()}
                        />
                    </motion.div>
                )}
            </AnimatePresence>

            {/* 1. Header & Timeline Section (Full Width) */}
            <div className="space-y-4">
                <div className="flex justify-between items-center mb-2">
                    <button
                        onClick={onBack}
                        className="flex items-center gap-2 text-white/50 hover:text-white transition-colors group"
                    >
                        <BackIcon size={18} className="group-hover:-translate-x-1 rtl:group-hover:translate-x-1 transition-transform" />
                        <span className="text-sm font-medium">{t.dashboard.orders.backToList}</span>
                    </button>

                    {/* Timers — each status shows its own correct deadline */}
                    {order.status === 'COLLECTING_OFFERS' && order.revealOffersAt && (
                        <CountdownTimer targetDate={order.revealOffersAt} label={language === 'ar' ? 'يتم الكشف عن العروض خلال' : 'Offers Reveal In'} />
                    )}
                    {order.status === 'AWAITING_OFFERS' && (
                        <CountdownTimer targetDate={getOfferDeadline()} label={t.dashboard.timers.offers_expires} />
                    )}
                    {(order.status === 'AWAITING_PAYMENT' || order.status === 'PARTIALLY_PAID') && (
                        <CountdownTimer targetDate={getPaymentDeadline()} label={language === 'ar' ? 'مهلة الدفع' : 'Payment Deadline'} />
                    )}
                    {order.status === 'PREPARATION' && (
                        <CountdownTimer targetDate={getPreparationDeadline()} label={language === 'ar' ? 'مهلة التجهيز (48س)' : 'Prep Deadline (48h)'} />
                    )}
                    {order.status === 'DELAYED_PREPARATION' && order.delayedPreparationDeadlineAt && (
                        <div className="flex flex-col items-end gap-1">
                            <span className="text-[10px] text-red-400/80 font-bold uppercase tracking-wider animate-pulse">
                                {language === 'ar' ? '⚠️ مهلة التجهيز الأخيرة (24س)' : '⚠️ Final Grace Deadline (24h)'}
                            </span>
                            <div className="flex gap-1 text-red-400 font-mono font-bold text-sm bg-red-500/10 px-3 py-1 rounded-full border border-red-500/30 animate-pulse">
                                <CountdownTimer
                                    targetDate={order.delayedPreparationDeadlineAt}
                                    label=""
                                    compact
                                    hideExpiredText={false}
                                />
                            </div>
                        </div>
                    )}
                    {order.status === 'CORRECTION_PERIOD' && (
                        <div className="flex flex-col items-end gap-1">
                            <span className="text-[10px] text-orange-400 font-bold uppercase tracking-wider animate-pulse">
                                {language === 'ar' ? '⚠️ مهلة تصحيح التوثيق (48س)' : '⚠️ Correction Deadline (48h)'}
                            </span>
                            <div className="flex gap-1 text-orange-400 font-mono font-bold text-sm bg-orange-500/10 px-3 py-1 rounded-full border border-orange-500/30 animate-pulse">
                                <CountdownTimer
                                    targetDate={order.correctionDeadlineAt || new Date(new Date().getTime() + 48*60*60*1000).toISOString()}
                                    label=""
                                    compact
                                    hideExpiredText={false}
                                />
                            </div>
                        </div>
                    )}
                    {!isMultiPartOrder &&
                        (order.status === 'DELIVERED' ||
                            order.status === 'PARTIALLY_DELIVERED' ||
                            order.status === 'DELIVERED_TO_CUSTOMER') && (
                        <div className="w-full md:w-auto">
                            <OrderCountdown updatedAt={order.deliveredAt || order.updatedAt} status={order.status} variant="badge" />
                        </div>
                    )}
                </div>

                {!isMultiPartOrder &&
                    (order.status === 'DELIVERED' ||
                        order.status === 'PARTIALLY_DELIVERED' ||
                        order.status === 'DELIVERED_TO_CUSTOMER') && (
                    <OrderCountdown updatedAt={order.deliveredAt || order.updatedAt} status={order.status} variant="full" />
                )}

                <MerchantHandoverPendingBanner
                    order={order}
                    role="customer"
                    isAr={language === 'ar'}
                    className="mb-4"
                />

                <GlassCard className="p-0 overflow-hidden bg-[#1A1814] border-white/5">
                    <div className="p-6 border-b border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <div className="flex items-center gap-3 mb-1">
                                <h1 className="text-2xl font-bold text-white">
                                    {(order.parts && order.parts.length > 1)
                                        ? (language === 'ar' ? `طلبية متعددة (${order.parts.length} قطع)` : `Multi-Part Order (${order.parts.length} items)`)
                                        : order.part}
                                </h1>
                                <Badge status={order.status} />
                                {order.warranty_end_at && (
                                    <WarrantyProtectionCard 
                                        order={order} 
                                        variant="compact"
                                        onClaim={(id) => {
                                            setReturnInitialReason('warranty_claim');
                                            setShowReturnModal(true);
                                        }} 
                                    />
                                )}
                                {shipment && !['CANCELLED', 'AWAITING_OFFERS', 'AWAITING_PAYMENT'].includes(order.status) && (
                                    <Badge status={shipment.status as StatusType} className="animate-in fade-in zoom-in duration-500" />
                                )}
                            </div>
                            <div className="text-white/60 text-sm flex items-center gap-2">
                                <span>{(t.dashboard.orders as any).orderId} {formatOrderDisplayId(order)}</span>
                                <span>•</span>
                                <span>{order.car}</span>
                            </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-3">

                            {/* Simulation buttons removed for production/customer view */}

                            {/* Continue Checkout / partial payment */}
                            {showContinuePayment && (
                                <button
                                    onClick={() => openCheckout()}
                                    className="hidden md:flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-gold-500 to-gold-600 hover:from-gold-400 hover:to-gold-500 text-black rounded-lg transition-all shadow-[0_0_15px_rgba(212,175,55,0.3)] hover:shadow-[0_0_20px_rgba(212,175,55,0.5)] font-bold text-sm"
                                >
                                    <CheckCircle2 size={16} />
                                    {continuePaymentLabel}
                                </button>
                            )}

                            {canConfirmFullReceipt && (
                                <button
                                    onClick={() => setShowConfirmDeliveryModal(true)}
                                    className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-gold-500 to-gold-600 hover:from-gold-400 hover:to-gold-500 text-black rounded-lg transition-all shadow-[0_0_15px_rgba(212,175,55,0.3)] font-black text-sm"
                                >
                                    <Truck size={16} />
                                    {language === 'ar' ? 'تأكيد الاستلام' : 'Confirm Receipt'}
                                </button>
                            )}

                            {/* Warranty Badge Removed (Replaced by Hub above or Compact Badge in header) */}

                            {/* Review: write CTA or submitted badge (single-item orders) */}
                            {!isMultiPartOrder && (order.status === 'COMPLETED' || order.status === 'DELIVERED' || order.status === 'PARTIALLY_DELIVERED' || order.status === 'WARRANTY_ACTIVE') && (
                                order.review ? (
                                    <motion.div
                                        initial={{ opacity: 0, scale: 0.95 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 border border-emerald-500/30 rounded-lg"
                                    >
                                        <motion.div className="flex gap-0.5">
                                            {[1, 2, 3, 4, 5].map((star) => (
                                                <Star
                                                    key={star}
                                                    size={14}
                                                    className={star <= (order.review?.rating ?? 0) ? 'text-gold-500' : 'text-white/15'}
                                                    fill={star <= (order.review?.rating ?? 0) ? 'currentColor' : 'none'}
                                                />
                                            ))}
                                        </motion.div>
                                        <span className="text-emerald-400 font-bold text-sm">
                                            {language === 'ar'
                                                ? (order.review.adminStatus === 'PUBLISHED' ? 'تم نشر تقييمك' : 'تم إرسال تقييمك')
                                                : (order.review.adminStatus === 'PUBLISHED' ? 'Review published' : 'Review submitted')}
                                        </span>
                                    </motion.div>
                                ) : (
                                    <button
                                        onClick={() => setShowReviewModal(true)}
                                        className="flex items-center gap-2 px-4 py-2 bg-gold-500/10 hover:bg-gold-500 text-gold-400 hover:text-white border border-gold-500/30 rounded-lg transition-all font-bold text-sm"
                                    >
                                        <Star size={16} />
                                        {t.dashboard.reviews.writeTitle}
                                    </button>
                                )
                            )}

                            {/* Return / Dispute — single-item orders only (multi-part uses PartReturnWindowCard) */}
                            {!isMultiPartOrder && isDeliveredLike && (
                                <button
                                    onClick={() => {
                                        setResolutionPart(null);
                                        setReturnInitialReason(undefined);
                                        setShowReturnModal(true);
                                    }}
                                    className="flex items-center gap-2 px-4 py-2 bg-cyan-500/10 hover:bg-cyan-500 text-cyan-400 hover:text-white border border-cyan-500/30 rounded-lg transition-all font-bold text-sm"
                                >
                                    <RefreshCcw size={16} />
                                    {t.dashboard.resolution.newReturn}
                                </button>
                            )}

                            {isMultiPartOrder && eligibleResolutionParts.length > 0 && (
                                <button
                                    onClick={() => {
                                        setResolutionPart(null);
                                        setReturnInitialReason(undefined);
                                        setShowReturnModal(true);
                                    }}
                                    className="flex items-center gap-2 px-4 py-2 bg-cyan-500/10 hover:bg-cyan-500 text-cyan-400 hover:text-white border border-cyan-500/30 rounded-lg transition-all font-bold text-sm"
                                >
                                    <RefreshCcw size={16} />
                                    {language === 'ar' ? 'طلب إرجاع (اختر قطعة)' : 'Request Return (select part)'}
                                </button>
                            )}

                            {!isMultiPartOrder && isDeliveredLike && (
                                <button
                                    onClick={() => {
                                        setResolutionPart(null);
                                        setShowDisputeModal(true);
                                    }}
                                    className="flex items-center gap-2 px-4 py-2 bg-red-500/10 hover:bg-red-600 text-red-400 hover:text-white border border-red-500/30 rounded-lg transition-all font-bold text-sm"
                                >
                                    <AlertTriangle size={16} />
                                    {t.dashboard.resolution.newDispute}
                                </button>
                            )}

                            {isMultiPartOrder && eligibleResolutionParts.length > 0 && (
                                <button
                                    onClick={() => {
                                        setResolutionPart(null);
                                        setShowDisputeModal(true);
                                    }}
                                    className="flex items-center gap-2 px-4 py-2 bg-red-500/10 hover:bg-red-600 text-red-400 hover:text-white border border-red-500/30 rounded-lg transition-all font-bold text-sm"
                                >
                                    <AlertTriangle size={16} />
                                    {language === 'ar' ? 'فتح نزاع (اختر قطعة)' : 'Open Dispute (select part)'}
                                </button>
                            )}

                            {/* Dynamic Phase Timer (COLLECTING_OFFERS / AWAITING_SELECTION) */}
                            {['COLLECTING_OFFERS', 'AWAITING_SELECTION'].includes(order.status) && (
                                <div className="text-right hidden md:block border-l border-white/10 pl-4 ml-2">
                                    <div className="text-xs text-gold-500/60 font-bold uppercase tracking-widest mb-1">
                                        {order.status === 'COLLECTING_OFFERS' 
                                            ? (language === 'ar' ? 'كشف العروض خلال' : 'Revealing In')
                                            : (language === 'ar' ? 'انتهاء مهلة الاختيار' : 'Selection Ends')}
                                    </div>
                                    <CountdownTimer 
                                        targetDate={order.status === 'COLLECTING_OFFERS' ? order.revealOffersAt : order.selectionDeadlineAt} 
                                        compact 
                                    />
                                </div>
                            )}

                            <div className="text-right hidden md:block border-l border-white/10 pl-4 ml-2">
                                <div className="text-xs text-white/40 mb-1">{(t.dashboard.orders as any).requestDate}</div>
                                <div className="flex items-center gap-2 text-white/80 font-mono text-sm">
                                    <Calendar size={14} />
                                    {order.date}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Extended Tracking View Trigger */}
                    {!['AWAITING_OFFERS', 'COLLECTING_OFFERS', 'AWAITING_SELECTION', 'AWAITING_PAYMENT', 'CANCELLED'].includes(order.status) ? (
                        <div className="p-6">
                            {shouldShowVerificationBanner(order.status) && (
                                <VerificationPhaseBanner className="mb-6" />
                            )}
                            <div className="flex justify-between items-center mb-6">
                                <StatusTimeline
                                    currentStatus={order.status}
                                    fulfillmentSummary={fulfillmentSummary}
                                    shipmentDeliverySummary={shipmentDeliverySummary}
                                />
                            </div>

                            <AnimatePresence>
                                {showTracking && (
                                    <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        className="overflow-hidden border-t border-white/5 pt-6 mt-6"
                                    >
                                        {shipment ? (
                                            <div className="space-y-6">
                                                {/* Meta Info */}
                                                <div className="flex flex-wrap gap-4 items-center justify-between bg-white/5 p-4 rounded-xl border border-white/10">
                                                    <div>
                                                        <p className="text-sm text-white/50">{language === 'ar' ? 'رقم التتبع' : 'Tracking Num'}</p>
                                                        <p className="font-mono font-bold text-lg text-gold-400">{shipment.trackingNumber || 'PENDING'}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-sm text-white/50">{language === 'ar' ? 'الشركة الناقلة' : 'Carrier'}</p>
                                                        <p className="font-bold text-white flex items-center gap-2">
                                                            <Truck size={16} />
                                                            {shipment.carrier || (language === 'ar' ? 'تشليح السريعة' : 'Tashleh Express')}
                                                        </p>
                                                    </div>
                                                    {shipment.trackingLink && (
                                                        <a 
                                                            href={shipment.trackingLink} 
                                                            target="_blank" 
                                                            rel="noopener noreferrer"
                                                            className="flex items-center gap-2 px-4 py-2 bg-gold-500 text-black rounded-lg font-bold text-sm hover:bg-gold-400 transition-all shadow-[0_0_10px_rgba(212,175,55,0.3)] animate-in zoom-in duration-300"
                                                        >
                                                            <ExternalLink size={16} />
                                                            {language === 'ar' ? 'تتبع الشحنة مباشرة' : 'Track Directly'}
                                                        </a>
                                                    )}
                                                </div>

                                                {/* 14-Step Tracker */}
                                                <ShipmentTracker status={shipment.status} />
                                            </div>
                                        ) : (
                                            <div className="text-center py-8">
                                                <Truck size={48} className="mx-auto text-white/10 mb-4" />
                                                <p className="text-white/50 mb-2">{language === 'ar' ? 'جاري تجهيز بيانات الشحن...' : 'Preparing shipping details...'}</p>
                                                <p className="text-sm text-gold-400">{language === 'ar' ? 'سيتم تحديث التتبع قريباً' : 'Tracking will be updated soon'}</p>
                                            </div>
                                        )}
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            <div className="flex justify-center mt-2">
                                <button
                                    onClick={() => setShowTracking(!showTracking)}
                                    className="flex items-center gap-2 text-gold-400 font-bold hover:text-gold-300 transition-colors text-sm"
                                >
                                    <MapPin size={16} />
                                    {showTracking ? (t.dashboard.orders as any).hideTracking : (t.dashboard.orders as any).viewTracking}
                                </button>
                            </div>
                        </div>
                    ) : (
                        <StatusTimeline
                            currentStatus={order.status}
                            fulfillmentSummary={fulfillmentSummary}
                            shipmentDeliverySummary={shipmentDeliverySummary}
                        />
                    )}
                </GlassCard>
            </div>

            {/* 2. Main Grid: Actions/Offers (Left) vs Summary (Right) */}
            <div className="grid lg:grid-cols-3 gap-8">

                {/* Main Content Area (Offers, Tracking, etc) - Spans 2 cols */}
                <div className="lg:col-span-2 space-y-6">
                    {activeShippingCase && (
                        <ShippingPaymentCard 
                            caseRecord={activeShippingCase} 
                            role="CUSTOMER" 
                            onSuccess={() => fetchCases('customer')}
                        />
                    )}

                    {/* Tab Navigation */}
                    <div className="flex gap-4 border-b border-white/10 pb-2 overflow-x-auto hide-scrollbar">
                        <button
                            onClick={() => setActiveTab('overview')}
                            className={`px-4 py-2 text-sm font-bold uppercase tracking-wider rounded-lg transition-colors whitespace-nowrap ${
                                activeTab === 'overview' ? 'bg-gold-500 text-black' : 'text-white/50 hover:bg-white/5 hover:text-white'
                            }`}
                        >
                            {language === 'ar' ? 'نظرة عامة' : 'Overview'}
                        </button>
                        <button
                            onClick={() => setActiveTab('invoices')}
                            className={`px-4 py-2 text-sm font-bold uppercase tracking-wider rounded-lg transition-colors whitespace-nowrap flex items-center gap-2 ${
                                activeTab === 'invoices' ? 'bg-gold-500 text-black' : 'text-white/50 hover:bg-white/5 hover:text-white'
                            }`}
                        >
                            <FileText size={16} />
                            {language === 'ar' ? 'الفواتير' : 'Invoices'}
                        </button>
                        {!['AWAITING_OFFERS', 'AWAITING_PAYMENT', 'PREPARATION', 'DELAYED_PREPARATION', 'PREPARED', 'VERIFICATION', 'NON_MATCHING', 'CORRECTION_PERIOD', 'CORRECTION_SUBMITTED'].includes(order.status) && (
                            <button
                                onClick={() => setActiveTab('waybills')}
                                className={`px-4 py-2 text-sm font-bold uppercase tracking-wider rounded-lg transition-colors whitespace-nowrap flex items-center gap-2 ${
                                    activeTab === 'waybills' ? 'bg-gold-500 text-black' : 'text-white/50 hover:bg-white/5 hover:text-white'
                                }`}
                            >
                                <Truck size={16} />
                                {language === 'ar' ? 'البوليصة' : 'Waybills'}
                            </button>
                        )}
                    </div>

                    {/* Panels */}
                    <div className={activeTab === 'invoices' ? 'block' : 'hidden'}>
                        <OrderInvoicesPanel 
                            orderId={order.id} 
                            role="CUSTOMER" 
                            initialData={order.invoices}
                            highlightOfferId={deepLink.offerId}
                        />
                    </div>
                    <div className={activeTab === 'waybills' ? 'block' : 'hidden'}>
                        {!['AWAITING_OFFERS', 'AWAITING_PAYMENT', 'PREPARATION', 'DELAYED_PREPARATION', 'PREPARED', 'VERIFICATION', 'NON_MATCHING', 'CORRECTION_PERIOD', 'CORRECTION_SUBMITTED'].includes(order.status) && (
                            <OrderWaybillsPanel 
                                orderId={order.id} 
                                orderStatus={order.status} 
                                role="CUSTOMER" 
                                initialData={order.shippingWaybills}
                                requestType={order.requestType}
                                orderNumber={order.orderNumber}
                                offers={order.offers}
                                shipmentBatches={order.shipmentBatches}
                            />
                        )}
                    </div>

                    {/* OVERVIEW CONTENT */}
                    <div className={activeTab === 'overview' ? 'space-y-6' : 'hidden'}>

                    <PartialShippingProgressCard
                        order={order}
                        isAr={language === 'ar'}
                    />

                    <PartialDeliveryProgressCard
                        shipments={order.shipments}
                        shipmentBatches={order.shipmentBatches}
                        orderStatus={order.status}
                        isAr={language === 'ar'}
                    />

                    {order.shipmentBatches?.length > 0 && (
                        <div className="space-y-3">
                            <h4 className="text-sm font-bold text-white/60 uppercase tracking-wider px-1">
                                {language === 'ar' ? 'دفعات الشحن' : 'Shipment batches'}
                            </h4>
                            {order.shipmentBatches.map((batch: any) => (
                                <ShipmentBatchCard
                                    key={batch.shipmentId}
                                    batch={batch}
                                    orderNumber={order.orderNumber}
                                    isAr={language === 'ar'}
                                />
                            ))}
                        </div>
                    )}

                    {/* STATE: COLLECTING OFFERS (2026 Reveal Buffer) */}
                    {order.status === 'COLLECTING_OFFERS' && (
                        <GlassCard className="flex flex-col items-center justify-center text-center py-16 border-dashed border-gold-500/20 bg-gold-500/5">
                            <div className="w-20 h-20 bg-[#1A1814] rounded-full flex items-center justify-center mb-6 relative">
                                <div className="absolute inset-0 bg-gold-500 rounded-full opacity-20 animate-pulse" />
                                <Lock size={32} className="text-gold-400 relative z-10" />
                            </div>
                            <h3 className="text-xl font-bold text-white mb-2">
                                {language === 'ar' ? 'جاري جمع عروض التجار' : 'Collecting Merchant Offers'}
                            </h3>
                            <p className="text-white/50 max-w-md mx-auto mb-4">
                                {language === 'ar' 
                                    ? 'يتم حالياً جمع أفضل العروض من التجار الموثوقين. سيتم الكشف عنها جميعاً فور انتهاء المهلة لضمان الشفافية والعدالة.'
                                    : 'We are collecting the best offers from trusted merchants. They will all be revealed once the deadline expires to ensure transparency and fairness.'}
                            </p>
                            {order.revealOffersAt && (
                                <div className="flex items-center gap-2 px-6 py-3 bg-white/5 rounded-2xl border border-white/10">
                                    <Clock size={16} className="text-gold-400" />
                                    <span className="text-sm text-white font-mono">
                                        {language === 'ar' ? 'الوقت المتبقي للكشف:' : 'Reveal In:'}
                                    </span>
                                    <CountdownTimer targetDate={order.revealOffersAt} compact hideExpiredText />
                                </div>
                            )}
                        </GlassCard>
                    )}

                    {/* STATE: AWAITING OFFERS - Only show if NO offers yet */}
                    {order.status === 'AWAITING_OFFERS' && !isExpired && visibleOffers.length === 0 && (
                        <GlassCard className="flex flex-col items-center justify-center text-center py-16 border-dashed border-white/10 bg-white/5">
                            <div className="w-20 h-20 bg-[#1A1814] rounded-full flex items-center justify-center mb-6 relative">
                                <div className="absolute inset-0 bg-gold-500 rounded-full opacity-20 animate-ping" />
                                <Search size={32} className="text-gold-400 relative z-10" />
                            </div>
                            <h3 className="text-xl font-bold text-white mb-2">{(t.dashboard.orders as any).searching}</h3>
                            <p className="text-white/50 max-w-md mx-auto mb-8">
                                {(t.dashboard.orders as any).searchingDesc}
                            </p>
                        </GlassCard>
                    )}

                    {/* STATE: EXPIRED — no offers or selection deadline passed */}
                    {expiryScenario && (
                        <GlassCard className="flex flex-col items-center justify-center text-center py-16 border-dashed border-red-500/20 bg-red-500/5">
                            <div className="w-20 h-20 bg-red-950/20 rounded-full flex items-center justify-center mb-6 relative border border-red-500/10">
                                <div className="absolute inset-0 bg-red-500 rounded-full opacity-10 animate-pulse" />
                                <AlertTriangle size={32} className="text-red-400 relative z-10" />
                            </div>
                            <h3 className="text-xl font-bold text-white mb-2">
                                {expiryScenario === 'selection_expired'
                                    ? ((t.dashboard.orders as any)?.selectionExpiredModal?.title ||
                                        (language === 'ar' ? 'انتهت مهلة اختيار العرض' : 'Selection Period Expired'))
                                    : (language === 'ar' ? 'نعتذر منك لعدم توفر عروض حالياً' : 'We apologize for the lack of offers')}
                            </h3>
                            <p className="text-white/60 max-w-md mx-auto mb-4 text-sm">
                                {expiryScenario === 'selection_expired'
                                    ? ((t.dashboard.orders as any)?.selectionExpiredModal?.desc
                                        ?.replace('#{orderNumber}', order.orderNumber || order.id)
                                        ?.replace('({partName})', order.part ? `(${order.part})` : '')
                                        ?.replace(' ( )', '') ||
                                        (language === 'ar'
                                            ? 'انتهت المهلة المتاحة لاختيار عرض وتم إغلاق الطلب تلقائياً.'
                                            : 'The deadline to select an offer has passed and the request was closed.'))
                                    : (language === 'ar'
                                        ? 'يمكنك اعادة أرسال الطلب خلال أيام العمل من الاثنين الى الخميس'
                                        : 'You can resubmit the order during working days from Monday to Thursday')}
                            </p>
                            {!isMultiPartOrder && expiryScenario === 'no_offers' && (
                                <div className="flex flex-col items-center gap-2">
                                    <button
                                        type="button"
                                        disabled={isRenewing}
                                        title={(t.dashboard.orders as any).renewOrderHint}
                                        onClick={async () => {
                                            setIsRenewing(true);
                                            try {
                                                const ok = await useOrderStore.getState().renewOrder(order.id);
                                                if (ok) {
                                                    await useOrderStore.getState().fetchOrder(order.id);
                                                    addNotification({
                                                        titleAr: (t.dashboard.orders as any).renewOrderSuccess,
                                                        titleEn: (t.dashboard.orders as any).renewOrderSuccess,
                                                        messageAr: (t.dashboard.orders as any).renewOrderHint,
                                                        messageEn: (t.dashboard.orders as any).renewOrderHint,
                                                        type: 'SYSTEM',
                                                    });
                                                } else {
                                                    addNotification({
                                                        titleAr: (t.dashboard.orders as any).renewOrderError,
                                                        titleEn: (t.dashboard.orders as any).renewOrderError,
                                                        messageAr: '',
                                                        messageEn: '',
                                                        type: 'SYSTEM',
                                                    });
                                                }
                                            } finally {
                                                setIsRenewing(false);
                                            }
                                        }}
                                        className="inline-flex items-center gap-2 px-6 py-2.5 bg-gold-500 hover:bg-gold-400 disabled:opacity-50 text-black rounded-xl font-bold text-sm transition-all"
                                    >
                                        {isRenewing ? (
                                            <Loader2 size={16} className="animate-spin" />
                                        ) : (
                                            <RefreshCcw size={16} />
                                        )}
                                        {(t.dashboard.orders as any).renewOrder}
                                    </button>
                                    <p className="text-white/40 text-xs max-w-sm">
                                        {(t.dashboard.orders as any).renewOrderHint}
                                    </p>
                                </div>
                            )}
                        </GlassCard>
                    )}



                    {/* Requested Parts List + View Offers Button */}
                    {(order.parts && order.parts.length > 0) && (
                        <div className="space-y-6">
                            <h3 className="text-white font-bold flex items-center gap-2">
                                <span className="w-1.5 h-6 bg-gold-500 rounded-full" />
                                {language === 'ar' ? 'القطع المطلوبة والعروض' : 'Requested Parts & Offers'}
                            </h3>

                            <div className="space-y-4">
                                {order.parts.map((p, idx) => {
                                    const partOffers = order.offers
                                        .filter((o: any) => (o.orderPartId === p.id || (!o.orderPartId && order.parts.length === 1)) && !isRejectedOfferStatus(o.status))
                                        .slice(0, 10); // Hard cap: max 10

                                    const hasOffers = partOffers.length > 0;
                                    const partHasAcceptedOffer = partOffers.some((o: any) =>
                                        isAcceptedOfferStatus(o.status),
                                    );
                                    const acceptedPartOffer = partOffers.find((o: any) =>
                                        isAcceptedOfferStatus(o.status),
                                    );
                                    const partImgSrc = resolvePartPrimaryImage(p, order.partImages);
                                    const thumbImages = parseImageList(p.images).length
                                        ? parseImageList(p.images)
                                        : parseImageList(order.partImages);

                                    return (
                                        <GlassCard key={p.id || idx} className="p-0 overflow-hidden border-white/5 bg-[#1A1814]">
                                            {/* Part Row */}
                                            <div className="p-5 flex flex-wrap items-center justify-between gap-4">
                                                {/* Part Info */}
                                                <div className="flex items-center gap-4 flex-1 min-w-[200px]">
                                                    <div className="w-16 h-16 rounded-xl bg-white/5 border border-white/10 overflow-hidden shrink-0 flex items-center justify-center">
                                                        {partImgSrc ? (
                                                            <img src={partImgSrc} alt={p.name} className="w-full h-full object-cover" loading="lazy" />
                                                        ) : (
                                                            <Package size={24} className="text-white/20" />
                                                        )}
                                                    </div>
                                                    <div>
                                                        <h4 className="font-bold text-white text-lg">{p.name}</h4>
                                                        {p.description && <p className="text-white/60 text-sm line-clamp-1">{p.description}</p>}
                                                        <span className="text-[10px] font-mono text-gold-500/50 uppercase mt-1 block tracking-wider">
                                                            {language === 'ar' ? `قطعة ${idx + 1}` : `Part ${idx + 1}`}
                                                        </span>
                                                    </div>
                                                </div>

                                                {/* Actions */}
                                                <div className="flex items-center gap-4">
                                                    {/* Offer Count Badge */}
                                                    <div className="flex flex-col items-center">
                                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg mb-1 ${hasOffers ? 'bg-gold-500/20 text-gold-400 border border-gold-500/30' : 'bg-white/5 text-white/20 border border-white/5'}`}>
                                                            {partOffers.length}
                                                        </div>
                                                        <span className="text-[10px] text-white/40 uppercase tracking-tighter">
                                                            {language === 'ar' ? 'عرض' : partOffers.length === 1 ? 'Offer' : 'Offers'}
                                                        </span>
                                                        {partHasAcceptedOffer && (
                                                            <span className="text-[9px] text-green-400 font-bold mt-1 flex items-center gap-0.5">
                                                                <CheckCircle2 size={10} />
                                                                {language === 'ar' ? 'مقبول' : 'Accepted'}
                                                            </span>
                                                        )}
                                                        {acceptedPartOffer?.fulfillmentStatus && !['AWAITING_OFFERS', 'COLLECTING_OFFERS', 'AWAITING_SELECTION', 'AWAITING_PAYMENT'].includes(order.status) && (
                                                            <span className="text-[9px] text-gold-400/90 font-bold mt-1 block">
                                                                {getFulfillmentLabel(acceptedPartOffer.fulfillmentStatus, language === 'ar')}
                                                            </span>
                                                        )}
                                                        {acceptedPartOffer && order.requestType === 'multiple' && (
                                                            <div className="mt-1.5">
                                                                <CartShipmentBadge
                                                                    offer={acceptedPartOffer}
                                                                    order={order}
                                                                    allOffers={order.offers || []}
                                                                    inAssemblyCart={!acceptedPartOffer.shippedFromCart}
                                                                    isAr={language === 'ar'}
                                                                />
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Image preview circles */}
                                                    {thumbImages.length > 0 && (
                                                        <div className="flex -space-x-3 rtl:space-x-reverse overflow-hidden">
                                                            {thumbImages.slice(0, 3).map((img: string, i: number) => {
                                                                const src = resolveMediaSrc(img);
                                                                if (!src) return null;
                                                                return (
                                                                    <button key={`${p.id}-img-${i}`} onClick={() => setLightboxImage(src)}
                                                                        className="w-10 h-10 rounded-full border-2 border-[#1A1814] overflow-hidden hover:scale-110 transition-transform">
                                                                        <img src={src} alt="" className="w-full h-full object-cover" loading="lazy" />
                                                                    </button>
                                                                );
                                                            })}
                                                        </div>
                                                    )}

                                                    {/* ★ KEY: View Offers Button → opens PartOffersDrawer */}
                                                    <button
                                                        onClick={() => setDrawerPart({ id: p.id, name: p.name, description: p.description, image: partImgSrc, index: idx })}
                                                        disabled={!hasOffers}
                                                        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${hasOffers
                                                            ? 'bg-gold-500/10 hover:bg-gold-500/20 text-gold-400 border border-gold-500/20 hover:border-gold-500/40 hover:shadow-[0_0_12px_rgba(212,175,55,0.15)]'
                                                            : 'bg-white/3 text-white/15 border border-white/5 cursor-not-allowed'
                                                            }`}
                                                    >
                                                        <Eye size={16} />
                                                        <span>{language === 'ar' ? 'عرض التفاصيل' : 'View Offers'}</span>
                                                    </button>
                                                </div>
                                            </div>

                                            {/* No offers hint / expired part reorder */}
                                            {!hasOffers && (
                                                expiredPartIdsWithoutOffers.has(p.id) ? (
                                                    <div className="border-t border-red-500/20 px-5 py-4 bg-red-500/5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                                                        <p className="text-sm text-red-300/90 font-medium leading-relaxed">
                                                            {(t.dashboard.orders as any)?.partNoOffers?.message ||
                                                                (language === 'ar'
                                                                    ? 'نعتذر منك لعدم توفر عروض يرجى اعاده الطلب مره أخرى'
                                                                    : 'We apologize — no offers were available. Please submit a new request.')}
                                                        </p>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleReorderPart(p.id)}
                                                            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold bg-gold-500/15 hover:bg-gold-500/25 text-gold-400 border border-gold-500/30 transition-all whitespace-nowrap shrink-0"
                                                        >
                                                            <RefreshCcw size={15} />
                                                            {(t.dashboard.orders as any)?.partNoOffers?.reorderBtn ||
                                                                (language === 'ar' ? 'إعادة الطلب' : 'Reorder')}
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <div className="border-t border-white/5 px-5 py-3 text-xs text-white/25 flex items-center gap-2">
                                                        <Search size={11} />
                                                        <span>
                                                            {(t.dashboard.orders as any)?.partNoOffers?.waiting ||
                                                                (language === 'ar'
                                                                    ? 'لا توجد عروض لهذه القطعة بعد'
                                                                    : 'No offers yet for this part')}
                                                        </span>
                                                    </div>
                                                )
                                            )}

                                            {acceptedPartOffer && isMultiPartOrder && (() => {
                                                const meta = partResolutionByOfferId.get(acceptedPartOffer.id);
                                                const cardOffer: PartReturnWindowOffer = {
                                                    offerId: acceptedPartOffer.id,
                                                    orderPartId: p.id,
                                                    partName: p.name,
                                                    merchantName:
                                                        (acceptedPartOffer as { store?: { name?: string } }).store?.name ||
                                                        order.merchantName ||
                                                        'Store',
                                                    fulfillmentStatus: acceptedPartOffer.fulfillmentStatus,
                                                    deliveredAt: meta?.deliveredAt ?? null,
                                                    completedAt: meta?.completedAt ?? null,
                                                    returnWindowEndsAt: meta?.returnWindowEndsAt ?? null,
                                                    isReturnEligible: Boolean(meta?.isReturnEligible),
                                                    resolutionLocked: Boolean(meta?.resolutionLocked),
                                                    hasOpenCase: Boolean(meta?.hasOpenCase),
                                                };
                                                return (
                                                    <div className="border-t border-white/5 px-5 py-4 space-y-3">
                                                        <PartReturnWindowCard
                                                            offer={cardOffer}
                                                            isAr={language === 'ar'}
                                                            onReturn={openReturnForPart}
                                                            onDispute={openDisputeForPart}
                                                        />
                                                        {typeof meta?.warrantyEndAt === 'string' && meta.warrantyEndAt && (
                                                            <WarrantyProtectionCard
                                                                order={{
                                                                    ...order,
                                                                    warranty_end_at: meta.warrantyEndAt,
                                                                }}
                                                                variant="compact"
                                                                onClaim={() => {
                                                                    setReturnInitialReason('warranty_claim');
                                                                    openReturnForPart(cardOffer);
                                                                }}
                                                            />
                                                        )}
                                                        {(cardOffer.fulfillmentStatus === 'COMPLETED' ||
                                                            cardOffer.fulfillmentStatus === 'completed') &&
                                                            !reviewedOfferIds.has(acceptedPartOffer.id) && (
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    setReviewOfferId(acceptedPartOffer.id);
                                                                    setShowReviewModal(true);
                                                                }}
                                                                className="flex items-center gap-2 px-3 py-2 bg-gold-500/10 hover:bg-gold-500/20 text-gold-400 border border-gold-500/30 rounded-lg transition-all font-bold text-xs"
                                                            >
                                                                <Star size={14} />
                                                                {language === 'ar' ? 'قيّم هذا المتجر' : 'Review this store'}
                                                            </button>
                                                        )}
                                                    </div>
                                                );
                                            })()}
                                        </GlassCard>
                                    );
                                })}
                            </div>

                            {/* ★ PartOffersDrawer — full-screen slide-over */}
                            {drawerPart && (
                                <PartOffersDrawer
                                    isOpen={!!drawerPart}
                                    onClose={() => setDrawerPart(null)}
                                    partName={drawerPart.name}
                                    partDescription={drawerPart.description}
                                    partImage={drawerPart.image}
                                    partIndex={drawerPart.index}
                                    offers={order.offers.filter(
                                        (o: any) =>
                                            String(o.orderPartId) === String(drawerPart.id) &&
                                            !isRejectedOfferStatus(o.status),
                                    )}
                                    selectedOffer={
                                        order.offers.find(
                                            (o: any) =>
                                                String(o.orderPartId) === String(drawerPart.id) &&
                                                isAcceptedOfferStatus(o.status),
                                        )?.id ?? null
                                    }
                                    onAcceptOffer={handleAcceptOffer}
                                    onChat={handleChat}
                                    onRejectOffer={(offer) => setOfferToReject(offer)}
                                    disabled={isExpired || ['CANCELLED', 'COMPLETED', 'REJECTED'].includes(order.status)}
                                />
                            )}
                        </div>
                    )}

                    {/* General Offers (Unlinked) */}
                    {order.offers.filter(o => !o.orderPartId && !isRejectedOfferStatus(o.status)).length > 0 && (
                        <div className="space-y-4">
                            <h3 className="text-white font-bold flex items-center gap-2">
                                <span className="w-1.5 h-6 bg-gold-500 rounded-full" />
                                {language === 'ar' ? 'عروض عامة' : 'General Offers'}
                            </h3>
                            <div className="space-y-4">
                                {order.offers
                                    .filter(o => !o.orderPartId && !isRejectedOfferStatus(o.status))
                                    .slice(0, 10)
                                    .map(offer => (
                                        <div key={offer.id} className="relative">
                                                <OfferCard
                                                    {...offer}
                                                    storeName={offer.merchantName}
                                                    rating={offer.storeRating || 0}
                                                    reviewCount={offer.storeReviewCount || 0}
                                                    unitPrice={offer.unitPrice || offer.price}
                                                    isSelected={String(selectedOffer) === String(offer.id)}
                                                    onAccept={() => handleAcceptOffer(offer)}
                                                    onChat={() => handleChat(offer)}
                                                    onReject={() => setOfferToReject(offer)}
                                                    acceptLoading={
                                                        acceptLoadingOfferId !== null &&
                                                        acceptLoadingOfferId === String(offer.id)
                                                    }
                                                    disabled={isExpired || ['CANCELLED', 'COMPLETED', 'REJECTED'].includes(order.status) || acceptLoadingOfferId !== null}
                                                />
                                            {/* Disable Cover during loading */}
                                            {acceptLoadingOfferId !== null && acceptLoadingOfferId !== offer.id && (
                                                <div className="absolute inset-0 bg-black/20 z-10 rounded-2xl pointer-events-none backdrop-blur-[1px]" />
                                            )}
                                        </div>
                                    ))
                                }
                            </div>
                        </div>
                    )}
                    </div>{/* end overview */}
                </div>

                {/* Sidebar Summary - Spans 1 col */}
                <div className="space-y-6">
                    {isMultiPartOrder && (
                        <MultiItemResolutionProgress fulfillmentSummary={fulfillmentSummary} />
                    )}
                    <GlassCard className="bg-[#1A1814] border-white/5 p-6">
                        <h3 className="text-sm font-bold text-white/50 uppercase tracking-wider mb-6 pb-2 border-b border-white/10">
                            {language === 'ar' ? 'تفاصيل الطلب' : 'Order Details'}
                        </h3>

                        <div className="space-y-6">
                            <div className="flex gap-4">
                                <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center text-white/30 shrink-0">
                                    <Package size={20} />
                                </div>
                                <div>
                                    <div className="text-xs text-white/40 mb-1">{language === 'ar' ? 'القطع المطلوبة' : 'Requested Parts'}</div>
                                    <div className="text-white font-medium">
                                        {(order.parts && order.parts.length > 1)
                                            ? (language === 'ar' ? `طلبية متعددة (${order.parts.length} قطع)` : `Multi-Part Order (${order.parts.length} items)`)
                                            : order.part}
                                    </div>
                                    <div className="text-xs text-white/40 mt-1">
                                        {language === 'ar' ? 'الحالة: ' : 'Condition: '}
                                        <span className="text-white border px-1.5 py-0.5 rounded border-white/10 ml-1">
                                            {order.preferences?.condition === 'new'
                                                ? (language === 'ar' ? 'جديد' : 'New')
                                                : (language === 'ar' ? 'مستعمل' : 'Used')}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-4">
                                <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center text-white/30 shrink-0">
                                    <FileText size={20} />
                                </div>
                                <div>
                                    <div className="text-xs text-white/40 mb-1">{language === 'ar' ? 'المركبة المعنية' : 'Target Vehicle'}</div>
                                    <div className="text-white font-medium">{order.car}</div>
                                    <div className="text-xs text-white/30 font-mono mt-1">VIN: {order.vin || 'N/A'}</div>
                                </div>
                            </div>

                            <div className="flex gap-4">
                                <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center text-white/30 shrink-0">
                                    <Truck size={20} />
                                </div>
                                <div>
                                    <div className="text-xs text-white/40 mb-1">{language === 'ar' ? 'التسليم والدفع' : 'Delivery & Payment'}</div>
                                    <div className="text-white text-sm">
                                        {language === 'ar' ? 'الطلب: ' : 'Request: '}
                                        <span className="font-bold text-gold-400">
                                            {order.requestType === 'multiple' ? (language === 'ar' ? 'عدة قطع' : 'Multiple Parts') : (language === 'ar' ? 'قطعة واحدة' : 'Single Part')}
                                        </span>
                                    </div>
                                    <div className="text-white/60 text-xs mt-1 mb-2">
                                        {language === 'ar' ? 'الشحن: ' : 'Shipping: '}
                                        <span>
                                            {order.shippingType === 'combined'
                                                ? (language === 'ar' ? '(عدة قطع) تجميع الطلبات' : '(Multiple) Combined Delivery')
                                                : (order.requestType === 'multiple'
                                                    ? (language === 'ar' ? '(عدة قطع) كل طلب فى شحنه لوحده' : '(Multiple) Separate Delivery')
                                                    : (language === 'ar' ? '(قطعة واحدة) شحن كل قطعة لوحدها' : '(Single) Direct Delivery')
                                                )
                                            }
                                        </span>
                                    </div>
                                    <div className="pt-2 border-t border-white/10 flex items-center gap-2">
                                        <div className={`w-2 h-2 rounded-full ${
                                            order.status === 'PARTIALLY_PAID'
                                                ? 'bg-amber-500 animate-pulse'
                                                : order.status === 'AWAITING_OFFERS' || order.status === 'AWAITING_PAYMENT' || order.status === 'CANCELLED'
                                                  ? 'bg-red-500 animate-pulse'
                                                  : 'bg-green-500'
                                        }`} />
                                        <span className={`text-xs font-bold ${
                                            order.status === 'PARTIALLY_PAID'
                                                ? 'text-amber-400'
                                                : order.status === 'AWAITING_OFFERS' || order.status === 'AWAITING_PAYMENT' || order.status === 'CANCELLED'
                                                  ? 'text-red-400'
                                                  : 'text-green-400'
                                        }`}>
                                            {order.status === 'PARTIALLY_PAID'
                                                ? (language === 'ar' ? 'دفع جزئي — باقي القطع معلّقة' : 'Partial payment — parts pending')
                                                : order.status === 'AWAITING_OFFERS' || order.status === 'AWAITING_PAYMENT' || order.status === 'CANCELLED'
                                                  ? (language === 'ar' ? 'لم يتم الدفع' : 'Not Paid')
                                                  : (language === 'ar' ? 'تم الدفع بنجاح' : 'Paid Successfully')}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </GlassCard>

                    <button
                        onClick={handleSupportClick}
                        disabled={isLoadingSupport}
                        className="w-full text-start bg-gradient-to-br from-[#1A1814] to-gold-900/10 border border-white/5 rounded-2xl p-5 flex items-center gap-4 hover:border-gold-500/50 hover:bg-gold-500/5 transition-all group disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-white/60 group-hover:bg-gold-500/20 group-hover:text-gold-400 transition-colors">
                            {isLoadingSupport ? <Loader2 size={20} className="animate-spin" /> : <Shield size={20} />}
                        </div>
                        <div>
                            <div className="font-bold text-white text-sm group-hover:text-gold-400 transition-colors">{(t.dashboard.orders as any).supportTitle}</div>
                            <div className="text-xs text-white/40">{(t.dashboard.orders as any).supportDesc}</div>
                        </div>
                    </button>

                    {/* Mobile/Sidebar Continue payment */}
                    {showContinuePayment && (
                        <button
                            onClick={() => openCheckout()}
                            className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-gradient-to-r from-gold-500 to-gold-600 hover:from-gold-400 hover:to-gold-500 text-black rounded-2xl transition-all shadow-[0_0_15px_rgba(212,175,55,0.3)] font-bold text-lg mb-4"
                        >
                            <CheckCircle2 size={24} />
                            {continuePaymentLabel}
                        </button>
                    )}
                </div>
            </div>

            {/* Reject Offer Modal */}
            <AnimatePresence>
                {offerToReject && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
                    >
                        <motion.div
                            initial={{ scale: 0.95, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.95, y: 20 }}
                            className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
                            dir={language === 'ar' ? 'rtl' : 'ltr'}
                        >
                            {/* Header */}
                            <div className="p-4 flex items-center justify-between border-b border-gray-100">
                                <h3 className="text-lg font-bold text-gray-800">
                                    {language === 'ar' ? 'سبب رفض العرض' : 'Reason for Rejection'}
                                </h3>
                                <button
                                    onClick={() => {
                                        setOfferToReject(null);
                                        setRejectReason('');
                                        setCustomRejectReason('');
                                    }}
                                    className="p-1 hover:bg-gray-100 rounded-full transition-colors"
                                >
                                    <X className="w-5 h-5 text-gray-500" />
                                </button>
                            </div>

                            {/* Body */}
                            <div className="p-6 space-y-6">
                                {/* Offer Details Summary */}
                                <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 space-y-3">
                                    <h4 className="text-sm font-bold text-gray-700 mb-2">
                                        {language === 'ar' ? 'تفاصيل العرض' : 'Offer Details'}
                                    </h4>

                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-gray-500">{language === 'ar' ? 'رقم العرض:' : 'Offer No:'}</span>
                                        <span className="font-mono text-gold-600 font-bold">{offerToReject.offerNumber || 'N/A'}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-gray-500">{language === 'ar' ? 'السعر:' : 'Price:'}</span>
                                        <span className="font-bold text-gray-900 flex items-center gap-1">
                                            {offerToReject.price.toLocaleString()} <span className="text-xs">AED</span>
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-gray-500">{language === 'ar' ? 'القطعة:' : 'Part:'}</span>
                                        <span className="font-medium text-gray-800">{offerToReject.partName || order.part}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-gray-500">{language === 'ar' ? 'التاجر:' : 'Merchant:'}</span>
                                        <span className="font-mono text-gray-600">{offerToReject.storeCode || 'N/A'}</span>
                                    </div>
                                </div>

                                {/* Form */}
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            {language === 'ar' ? 'اختر سبب الرفض *' : 'Select Rejection Reason *'}
                                        </label>
                                        <div className="relative">
                                            <select
                                                value={rejectReason}
                                                onChange={(e) => setRejectReason(e.target.value)}
                                                className="w-full appearance-none bg-white border border-gray-200 rounded-xl px-4 py-3 text-gray-800 font-medium focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all cursor-pointer"
                                            >
                                                <option value="" disabled>{language === 'ar' ? '— اضغط للاختيار —' : '— Select —'}</option>
                                                <option value="السعر مرتفع جداً">{language === 'ar' ? 'السعر مرتفع جداً' : 'Price is too high'}</option>
                                                <option value="لا يوجد ضمان">{language === 'ar' ? 'لا يوجد ضمان' : 'No warranty'}</option>
                                                <option value="وقت التسليم طويل">{language === 'ar' ? 'وقت التسليم طويل' : 'Delivery time is too long'}</option>
                                                <option value="القطعة غير متوفرة">{language === 'ar' ? 'القطعة غير متوفرة' : 'Part is not available'}</option>
                                                <option value="جودة القطعة غير مناسبة">{language === 'ar' ? 'جودة القطعة غير مناسبة' : 'Part quality is not suitable'}</option>
                                                <option value="مشكلة في التواصل مع التاجر">{language === 'ar' ? 'مشكلة في التواصل مع التاجر' : 'Issue communicating with merchant'}</option>
                                                <option value="وجدت عرض أفضل">{language === 'ar' ? 'وجدت عرض أفضل' : 'Found a better offer'}</option>
                                                <option value="غير مهتم بالعرض">{language === 'ar' ? 'غير مهتم بالعرض' : 'Not interested'}</option>
                                                <option value="أسباب أخرى">{language === 'ar' ? 'أسباب أخرى' : 'Other reasons'}</option>
                                            </select>
                                            <div className="absolute inset-y-0 left-0 pr-3 rtl:left-auto rtl:right-0 rtl:pl-3 flex items-center pointer-events-none">
                                                <ChevronDown className="w-5 h-5 text-gray-400" />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Custom Reason Area */}
                                    <AnimatePresence>
                                        {rejectReason === 'أسباب أخرى' && (
                                            <motion.div
                                                initial={{ height: 0, opacity: 0 }}
                                                animate={{ height: 'auto', opacity: 1 }}
                                                exit={{ height: 0, opacity: 0 }}
                                                className="overflow-hidden"
                                            >
                                                <label className="block text-sm font-medium text-gray-700 mb-2 mt-4">
                                                    {language === 'ar' ? 'اكتب سبب الرفض *' : 'Write Rejection Reason *'}
                                                </label>
                                                <textarea
                                                    value={customRejectReason}
                                                    onChange={(e) => setCustomRejectReason(e.target.value)}
                                                    placeholder={language === 'ar' ? 'يرجى كتابة التفاصيل هنا (بحد أقصى 500 حرف)...' : 'Please provide details here (max 500 chars)...'}
                                                    maxLength={500}
                                                    rows={4}
                                                    className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 resize-none transition-all placeholder:text-gray-400"
                                                />
                                                <div className="flex justify-end mt-1">
                                                    <span className={`text-xs ${customRejectReason.length >= 500 ? 'text-red-500' : 'text-gray-400'}`}>
                                                        {customRejectReason.length} / 500
                                                    </span>
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            </div>

                            {/* Footer Actions */}
                            <div className="p-4 border-t border-gray-100 flex gap-3 bg-gray-50/50">
                                <button
                                    onClick={() => {
                                        setOfferToReject(null);
                                        setRejectReason('');
                                        setCustomRejectReason('');
                                    }}
                                    disabled={isRejecting}
                                    className="flex-1 py-3 px-4 rounded-xl border border-gray-200 text-gray-700 font-bold hover:bg-gray-100 transition-colors bg-white disabled:opacity-50"
                                >
                                    {language === 'ar' ? 'إلغاء' : 'Cancel'}
                                </button>
                                <button
                                    onClick={submitRejectOffer}
                                    disabled={!rejectReason || (rejectReason === 'أسباب أخرى' && !customRejectReason.trim()) || isRejecting}
                                    className="flex-1 py-3 px-4 rounded-xl bg-red-500 hover:bg-red-600 text-white font-bold shadow hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                >
                                    {isRejecting && <Loader2 className="w-4 h-4 animate-spin" />}
                                    {language === 'ar' ? 'رفض العرض' : 'Reject Offer'}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Confirm Delivery Modal */}
            <AnimatePresence>
                {showConfirmDeliveryModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 20 }}
                            className="bg-[#1A1814] border border-white/10 rounded-3xl w-full max-w-md p-8 relative overflow-hidden shadow-2xl"
                        >
                            <div className="absolute top-0 right-0 p-32 bg-gold-500/5 rounded-full blur-3xl -mr-16 -mt-16" />
                            
                            <div className="flex justify-between items-center mb-6 relative z-10">
                                <div>
                                    <h3 className="text-2xl font-bold text-white flex items-center gap-2">
                                        <Truck size={24} className="text-gold-500" />
                                        {language === 'ar' ? 'تأكيد استلام الطلب' : 'Confirm Receipt'}
                                    </h3>
                                    <p className="text-white/40 text-xs mt-1">
                                        {language === 'ar' ? 'هل استلمت جميع القطع وبحالة سليمة؟' : 'Have you received all items in good condition?'}
                                    </p>
                                </div>
                                <button onClick={() => setShowConfirmDeliveryModal(false)} className="p-2 hover:bg-white/5 rounded-full text-white/40 hover:text-white transition-colors">
                                    <X size={24} />
                                </button>
                            </div>

                            <div className="space-y-6 relative z-10">
                                <div className="bg-white/5 border border-white/5 p-4 rounded-2xl">
                                     <p className="text-white/40 text-[10px] uppercase font-bold tracking-widest mb-1">{language === 'ar' ? 'الطلب رقم' : 'ORDER NO'}</p>
                                     <h4 className="text-white font-mono font-bold">#{order.orderNumber}</h4>
                                </div>

                                <div className="group">
                                    <label className="block text-[10px] font-black text-white/30 uppercase tracking-widest mb-2 group-focus-within:text-gold-500 transition-colors">
                                        {language === 'ar' ? 'ملاحظات إضافية (اختياري)' : 'Additional Notes (Optional)'}
                                    </label>
                                    <textarea 
                                        value={deliveryNote}
                                        onChange={(e) => setDeliveryNote(e.target.value)}
                                        className="w-full bg-[#24221F] border border-white/5 rounded-2xl p-4 text-white focus:border-gold-500/50 focus:bg-black/40 outline-none resize-none h-24 placeholder-white/10 text-sm transition-all"
                                        placeholder={language === 'ar' ? 'اكتب أي ملاحظات عن الاستلام...' : 'Any notes about the delivery...'}
                                    />
                                </div>

                                <div className="flex gap-3">
                                    <button
                                        onClick={() => setShowConfirmDeliveryModal(false)}
                                        className="flex-1 py-4 bg-white/5 hover:bg-white/10 text-white rounded-2xl font-bold text-sm transition-all"
                                    >
                                        {language === 'ar' ? 'إلغاء' : 'Cancel'}
                                    </button>
                                    <button 
                                        onClick={handleConfirmDelivery}
                                        disabled={isConfirmingDelivery}
                                        className="flex-[2] py-4 bg-gradient-to-r from-gold-600 to-gold-400 text-white rounded-2xl font-black uppercase tracking-tighter text-sm flex items-center justify-center gap-2 shadow-xl shadow-gold-500/10 disabled:opacity-50"
                                    >
                                        {isConfirmingDelivery ? <Loader2 className="animate-spin" size={18} /> : null}
                                        {language === 'ar' ? 'تأكيد الاستلام' : 'Confirm Delivery'}
                                    </button>
                                </div>

                                <p className="text-[10px] text-white/20 text-center px-4">
                                    {language === 'ar'
                                        ? `بتأكيد الاستلام، فإنك تقر بأن الطلب قد وصلك تماماً. تبدأ فترة ${POST_DELIVERY_RETURN_DISPUTE_HOURS} ساعة لطلب الإرجاع أو فتح النزاع (ثم يُكتمل الطلب تلقائياً).`
                                        : `By confirming receipt, you acknowledge delivery. Your ${POST_DELIVERY_RETURN_DISPUTE_HOURS}-hour window opens for returns or disputes (after which the order completes automatically).`}
                                </p>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Resolution Modals (bottom — shared with part-level actions) */}
            <ReturnRequestModal 
                isOpen={showReturnModal}
                onClose={() => {
                    setShowReturnModal(false);
                    setResolutionPart(null);
                }}
                orderId={order.id}
                orderPartId={modalOrderPartId}
                eligibleParts={isMultiPartOrder ? eligibleResolutionParts : undefined}
                initialReason={returnInitialReason}
                merchantName={modalMerchantName}
                partName={modalPartName}
                onSuccess={() => useOrderStore.getState().fetchOrder(order.id)}
            />

            <DisputeModal 
                isOpen={showDisputeModal}
                onClose={() => {
                    setShowDisputeModal(false);
                    setResolutionPart(null);
                }}
                orderId={order.id}
                orderPartId={modalOrderPartId}
                eligibleParts={isMultiPartOrder ? eligibleResolutionParts : undefined}
                merchantName={modalMerchantName}
                partName={modalPartName}
                onSuccess={() => useOrderStore.getState().fetchOrder(order.id)}
            />
        </div >
    );
};