import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '../../../contexts/LanguageContext';
import { useOrderStore } from '../../../stores/useOrderStore';
import { getOfferModificationMetrics, isActiveMerchantOffer } from '../../../utils/merchantOffers';
import { useOrderById } from '../../../hooks/useOrderById';
import { useOrderRealtimeSync } from '../../../hooks/useOrderRealtimeSync';
import { useVendorStore } from '../../../stores/useVendorStore';
import {
    ArrowLeft, ArrowRight, Clock, MapPin, Package, Settings, Monitor, ShieldCheck, FileText, CheckCircle2, ChevronDown, MessageCircle, AlertTriangle, Search, Car, Box, Calendar, Truck, User, DollarSign, Weight, Shield, Edit3, XCircle, Loader2, ExternalLink, Scale
} from 'lucide-react';
import { CountdownTimer } from '../OrderDetails';
import { WarrantyProtectionCard } from '../../ui/WarrantyProtectionCard';
import { SubmitOfferModal } from './SubmitOfferModal';
import { GlassCard } from '../../ui/GlassCard';
import { Badge, StatusType } from '../../ui/Badge';
import { offersApi } from '../../../services/api/offers';
import { ordersApi } from '../../../services/api/orders';
import { shipmentsApi } from '../../../services/api/shipments.api';
import { StatusTimeline } from '../../ui/StatusTimeline';
import type { FulfillmentSummaryPartHint } from '../../ui/StatusTimeline';
import { VerificationPhaseBanner, shouldShowVerificationBanner } from '../../ui/VerificationPhaseBanner';
import { VerificationForm } from './VerificationForm';
import { OrderInvoicesPanel } from '../shared/OrderInvoicesPanel';
import { OrderWaybillsPanel } from '../shared/OrderWaybillsPanel';
import { ShipmentBatchCard } from '../shared/ShipmentBatchCard';
import { useShipmentsStore } from '../../../stores/useShipmentsStore';
import { ShipmentTracker } from '../shipments/ShipmentTracker';
import { useResolutionStore } from '../../../stores/useResolutionStore';
import { ShippingPaymentCard } from '../resolution/ShippingPaymentCard';
import {
    getFulfillmentLabel,
    getFulfillmentRank,
    getVerificationDocForOffer,
    merchantCanMarkPrepared,
    merchantCanSubmitVerification,
    merchantCanRequestReadyForShipping,
    merchantOfferVerificationPending,
    merchantOfferAdminRejected,
} from '../../../utils/offerFulfillmentHelpers';
import { getOfferGovernanceWindow } from '../../../utils/offerGovernance';
import { MerchantHandoverPendingBanner } from '../shared/MerchantHandoverPendingBanner';
import { CartShipmentBadge } from '../shared/CartShipmentBadge';
import { PartialShippingProgressCard } from '../shared/PartialShippingProgressCard';
import { useOrderFulfillmentSummary } from '../../../hooks/useOrderFulfillmentSummary';
import { computeShipmentDeliverySummary } from '../../../utils/offerFulfillmentHelpers';
import {
    getMerchantHandoverStatusCopy,
    getMerchantPartLogisticsLabel,
    resolveMerchantHandoverPhase,
} from '../../../utils/merchantLogisticsStatus';
import { readDashboardDeepLink } from '../../../utils/widersDeepLink';

function toDisplayImageUrls(images?: (string | File)[]): string[] {
    return (images ?? []).filter((item): item is string => typeof item === 'string');
}

const MarketplaceDetailsSkeleton = ({ isAr }: { isAr: boolean }) => (
    <div className="space-y-6 animate-pulse">
        {/* Header Skeleton */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-white/5" />
                <div className="space-y-2">
                    <div className="h-8 w-64 bg-white/10 rounded-lg" />
                    <div className="h-4 w-48 bg-white/5 rounded-lg" />
                </div>
            </div>
            <div className="h-12 w-48 bg-white/5 rounded-xl border border-white/10" />
        </div>

        {/* Content Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
                <div className="h-64 bg-white/5 rounded-2xl border border-white/10" />
                <div className="h-48 bg-white/5 rounded-2xl border border-white/10" />
            </div>
            <div className="space-y-6">
                <div className="h-64 bg-white/5 rounded-2xl border border-white/10" />
                <div className="h-32 bg-white/5 rounded-2xl border border-white/10" />
            </div>
        </div>

        {/* Parts Skeleton */}
        <div className="space-y-4">
            <div className="h-8 w-40 bg-white/10 rounded-lg" />
            {[1, 2].map(i => (
                <div key={i} className="h-48 bg-white/5 rounded-2xl border border-white/10" />
            ))}
        </div>
    </div>
);

interface MarketplaceOfferDetailsProps {
    orderId: string;
    onBack: () => void;
}

export const MarketplaceOfferDetails: React.FC<MarketplaceOfferDetailsProps> = ({ orderId, onBack }) => {
    const { t, language } = useLanguage();
    const { addOfferToOrder, patchOrderFromRealtime, fetchOrder, removeOfferFromOrder, markOfferWithdrawnInOrder } =
        useOrderStore();
    const order = useOrderById(orderId);
    const fulfillmentSummary = useOrderFulfillmentSummary(orderId, order);

    const partResolutionByOfferId = useMemo(() => {
        const map = new Map<string, FulfillmentSummaryPartHint>();
        fulfillmentSummary?.parts?.forEach((p) => map.set(p.offerId, p));
        return map;
    }, [fulfillmentSummary]);
    const shipmentDeliverySummary = useMemo(
        () => computeShipmentDeliverySummary(order?.shipments, order?.status),
        [order?.shipments, order?.status],
    );
    const { storeId, performance, fetchDashboardStats } = useVendorStore();
    const { shipments, fetchShipments } = useShipmentsStore();
    const { cases, fetchCases } = useResolutionStore();
    const isAr = language === 'ar';
    const ArrowIcon = isAr ? ArrowRight : ArrowLeft;

    // Translation helpers matching OfferCard - Correct path for 2026 Merchant Dashboard
    const offersT = (t.dashboard as any)?.merchant?.offerModal;
    const exploreOfferT = (t.dashboard as any)?.merchant?.exploreOffer;

    const getConditionText = (val: string) => {
        if (!val) return '';
        const lowerVal = val.toLowerCase().trim();
        return offersT?.conditions?.[lowerVal] || offersT?.conditions?.[val.trim()] || val;
    };

    const getWarrantyText = (val: string | boolean) => {
        if (val === undefined || val === null || val === 'No' || val === false) return isAr ? 'بدون ضمان' : 'No Warranty';
        const strictVal = typeof val === 'boolean' ? (val ? 'yes' : 'no') : val.toLowerCase().trim().replace(/\s/g, '');
        
        // Priority: Translation File -> Hardcoded fallback -> Raw Value
        const duration = (offersT?.warranties?.[strictVal]) || 
               (strictVal === '15days' ? (isAr ? '15 يوم' : '15 Days') :
                strictVal === '1month' ? (isAr ? 'شهر واحد' : '1 Month') :
                strictVal === '3months' ? (isAr ? '3 أشهر' : '3 Months') :
                strictVal === '12months' ? (isAr ? '12 شهر' : '12 Months') : 
                val.toString());
        
        return duration;
    };

    const getDeliveryText = (val: string) => {
        if (!val) return '';
        const key = val.trim();
        if (offersT?.delivery?.[key]) return offersT?.delivery?.[key];
        if (key.match(/^d\d+_\d+$/)) {
            const [min, max] = key.substring(1).split('_');
            return isAr ? `من ${min} إلى ${max} أيام` : `${min}-${max} Days`;
        }
        return key;
    };

    const [isLoading, setIsLoading] = useState(true);
    const [showVerificationForm, setShowVerificationForm] = useState(false);
    const [activeImageIndex, setActiveImageIndex] = useState(0);

    // Lightbox State
    const [isLightboxOpen, setIsLightboxOpen] = useState(false);
    const [lightboxImages, setLightboxImages] = useState<string[]>([]);
    const [lightboxIndex, setLightboxIndex] = useState(0);

    // Bidding State
    const [isBidding, setIsBidding] = useState(false);
    const [biddingPart, setBiddingPart] = useState<any | null>(null);

    // Real offers from API (persistent across page reloads)
    const [myOffers, setMyOffers] = useState<any[]>([]);
    const [isBlockedFromOrder, setIsBlockedFromOrder] = useState(false);

    // Offer Lock/Cancel States
    const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);
    const [isCancelling, setIsCancelling] = useState(false);
    const [offerToCancel, setOfferToCancel] = useState<any | null>(null);
    const [isVoluntaryWithdrawDialogOpen, setIsVoluntaryWithdrawDialogOpen] = useState(false);
    const [isVoluntaryWithdrawing, setIsVoluntaryWithdrawing] = useState(false);
    const [offerToVoluntaryWithdraw, setOfferToVoluntaryWithdraw] = useState<any | null>(null);
    // Tab State
    const deepLink = useMemo(() => readDashboardDeepLink(), []);
    const [activeTab, setActiveTab] = useState<'overview' | 'invoices' | 'waybills'>(
        deepLink.tab ?? 'overview',
    );

    // Preparation States
    const [isPrepareDialogOpen, setIsPrepareDialogOpen] = useState(false);
    const [isPreparing, setIsPreparing] = useState(false);
    const [prepareOfferId, setPrepareOfferId] = useState<string | null>(null);
    const [verificationOfferId, setVerificationOfferId] = useState<string | null>(null);

    // Shipping Request State
    const [isRequestingShipping, setIsRequestingShipping] = useState(false);

    
    // Fetch stats on mount to ensure governance metrics are fresh
    useEffect(() => {
        fetchDashboardStats();
    }, [fetchDashboardStats]);

    // Fetch merchant's real offers from API on mount and after submissions
    const fetchMyOffers = useCallback(async () => {
        if (!orderId) return;
        try {
            const response = await offersApi.findMyOffers(String(orderId));
            const offersList = Array.isArray(response)
                ? response
                : (response?.activeOffers ?? []);
            setIsBlockedFromOrder(
                Array.isArray(response) ? false : Boolean(response?.isBlockedFromOrder),
            );
            const mappedOffers = (offersList || []).map((o: any) => ({
                ...o,
                storeCode: o.store?.storeCode || o.storeCode,
                submittedAt: o.createdAt || o.submittedAt,
                weight: o.weightKg || o.weight,
                deliveryTime: o.deliveryDays || o.deliveryTime,
                warranty: o.hasWarranty ? o.warrantyDuration : o.warranty || 'No',
            }));
            setMyOffers(mappedOffers);
        } catch (err) {
            // If API fails (e.g. not logged in), fallback to store offers
            if (order?.offers) {
                const fallback = order.offers.filter((o: any) =>
                    o.storeId === 'my-store-session'
                );
                setMyOffers(fallback);
            }
        }
    }, [orderId, order?.offers]);

    useOrderRealtimeSync(orderId, { onOffersChange: fetchMyOffers });

    useEffect(() => {
        const fetchInitialData = async () => {
            await fetchMyOffers();
            await fetchShipments();
            setTimeout(() => setIsLoading(false), 200);
        };
        setIsLoading(true);
        fetchInitialData();
    }, [orderId, fetchMyOffers, fetchShipments]);

    useEffect(() => {
        if (order) setIsLoading(false);
    }, [order]);

    useEffect(() => {
        if (orderId) {
            fetchCases('merchant');
        }
    }, [orderId]);

    const activeShippingCase = cases.find((c) => {
        if (String(c.orderId) !== String(orderId)) return false;
        if (c.shippingPayee !== 'MERCHANT') return false;
        const amount = Number(c.shippingRefund || c.shippingRoundtrip || 0);
        if (amount <= 0) return false;
        if (['CLOSED', 'CANCELLED'].includes(c.status)) return false;
        if (c.shippingPaymentStatus === 'PENDING' || c.shippingPaymentStatus === 'INSUFFICIENT_FUNDS') {
            return true;
        }
        return c.shippingPaymentStatus === 'PAID' && !c.shippingPaymentMethod;
    });

    // Map partId -> count of ALL offers (from all merchants)
    const offersPerPart = useMemo(() => {
        const counts = new Map<string, number>();
        if (order?.offers) {
            order.offers.forEach((o: any) => {
                const pId = o.orderPartId || o.order_part_id;
                if (pId) {
                    counts.set(pId, (counts.get(pId) || 0) + 1);
                }
            });
        }
        return counts;
    }, [order?.offers]);

    // Accepted offers for this store — merge fulfillment from myOffers + order, dedupe by part
    const merchantAcceptedOffers = useMemo(() => {
        if (!storeId || !order?.offers) return [];
        const myById = new Map(myOffers.map((o: any) => [o.id, o]));
        const accepted = order.offers.filter(
            (o) => o.storeId === storeId && String(o.status).toLowerCase() === 'accepted',
        );
        const merged = accepted.map((o) => {
            const mine = myById.get(o.id);
            const rankOrder = getFulfillmentRank(o.fulfillmentStatus);
            const rankMine = getFulfillmentRank(mine?.fulfillmentStatus);
            const fulfillmentStatus =
                rankMine > rankOrder
                    ? mine?.fulfillmentStatus
                    : o.fulfillmentStatus ?? mine?.fulfillmentStatus;
            return { ...o, fulfillmentStatus };
        });
        const byPart = new Map<string, (typeof merged)[0]>();
        for (const o of merged) {
            const partId = String(o.orderPartId || (o as { order_part_id?: string }).order_part_id || o.id);
            const existing = byPart.get(partId);
            if (
                !existing ||
                getFulfillmentRank(o.fulfillmentStatus) >= getFulfillmentRank(existing.fulfillmentStatus)
            ) {
                byPart.set(partId, o);
            }
        }
        return Array.from(byPart.values());
    }, [order?.offers, storeId, myOffers]);

    const offersNeedingPrepare = useMemo(
        () => merchantAcceptedOffers.filter((o) => merchantCanMarkPrepared(o.fulfillmentStatus)),
        [merchantAcceptedOffers],
    );
    const offersNeedingVerification = useMemo(
        () => merchantAcceptedOffers.filter((o) => merchantCanSubmitVerification(o.fulfillmentStatus)),
        [merchantAcceptedOffers],
    );
    const offersUnderVerificationReview = useMemo(
        () => merchantAcceptedOffers.filter((o) => merchantOfferVerificationPending(o.fulfillmentStatus)),
        [merchantAcceptedOffers],
    );
    const offersVerificationApproved = useMemo(
        () =>
            merchantAcceptedOffers.filter(
                (o) =>
                    getFulfillmentRank(o.fulfillmentStatus) >=
                    getFulfillmentRank('VERIFICATION_SUCCESS'),
            ),
        [merchantAcceptedOffers],
    );
    const offersRejectedVerification = useMemo(
        () =>
            merchantAcceptedOffers.filter((o) => {
                const doc = getVerificationDocForOffer(
                    order?.verificationDocuments,
                    o.id,
                );
                return merchantOfferAdminRejected(o.fulfillmentStatus, doc);
            }),
        [merchantAcceptedOffers, order?.verificationDocuments],
    );
    const offersReadyForHandover = useMemo(
        () => merchantAcceptedOffers.filter((o) => merchantCanRequestReadyForShipping(o.fulfillmentStatus)),
        [merchantAcceptedOffers],
    );

    const shipment = useMemo(
        () => shipments.find((s) => s.orderId === (orderId || '')),
        [shipments, orderId],
    );

    const handoverPhase = useMemo(
        () =>
            resolveMerchantHandoverPhase({
                orderStatus: order?.status || '',
                waybills: order?.shippingWaybills,
                shipmentStatus: shipment?.status,
            }),
        [order?.status, order?.shippingWaybills, shipment?.status],
    );

    const handoverCopy = useMemo(
        () => getMerchantHandoverStatusCopy(handoverPhase, isAr, shipment?.status),
        [handoverPhase, isAr, shipment?.status],
    );

    const myOffersByPart = useMemo(() => {
        const map = new Map<string, any>();
        myOffers
            .filter((o: any) => isActiveMerchantOffer(o))
            .forEach((o: any) => {
                const partId = o.orderPartId || o.order_part_id;
                if (partId) map.set(partId, o);
            });
        return map;
    }, [myOffers]);

    const getPartOfferEnriched = useCallback(
        (partId: string) => {
            const mine = myOffersByPart.get(partId);
            if (!mine || !isActiveMerchantOffer(mine)) return null;
            const enriched = merchantAcceptedOffers.find((o) => o.id === mine.id);
            return {
                ...mine,
                fulfillmentStatus:
                    enriched?.fulfillmentStatus ??
                    order?.offers?.find((o) => o.id === mine.id)?.fulfillmentStatus ??
                    mine.fulfillmentStatus,
            };
        },
        [myOffersByPart, order?.offers, merchantAcceptedOffers],
    );

    const getMerchantOfferPartName = useCallback(
        (offer: { orderPartId?: string; order_part_id?: string; partName?: string }) => {
            const partId = offer.orderPartId || offer.order_part_id;
            const part = order?.parts?.find((p: any) => p.id === partId);
            return part?.name || offer.partName || (isAr ? 'قطعة' : 'Part');
        },
        [order?.parts, isAr],
    );

    const merchantPartsPreparedCount = useMemo(
        () =>
            merchantAcceptedOffers.filter((o) =>
                getFulfillmentRank(o.fulfillmentStatus) >= getFulfillmentRank('PREPARED'),
            ).length,
        [merchantAcceptedOffers],
    );

    const merchantPartsUnderReviewCount = useMemo(
        () => offersUnderVerificationReview.length,
        [offersUnderVerificationReview],
    );

    const merchantPartsVerifiedCount = useMemo(
        () =>
            merchantAcceptedOffers.filter((o) =>
                getFulfillmentRank(o.fulfillmentStatus) >= getFulfillmentRank('VERIFICATION_SUCCESS'),
            ).length,
        [merchantAcceptedOffers],
    );

    const merchantPrepProgressPct = useMemo(() => {
        const total = merchantAcceptedOffers.length;
        if (total === 0) return 0;
        return Math.min(100, Math.round((merchantPartsPreparedCount / total) * 100));
    }, [merchantAcceptedOffers.length, merchantPartsPreparedCount]);

    const merchantVerificationProgressPct = useMemo(() => {
        const total = merchantAcceptedOffers.length;
        if (total === 0) return 0;
        const done = merchantPartsUnderReviewCount + merchantPartsVerifiedCount;
        return Math.min(100, Math.round((done / total) * 100));
    }, [
        merchantAcceptedOffers.length,
        merchantPartsUnderReviewCount,
        merchantPartsVerifiedCount,
    ]);

    const verificationExistingData = useMemo(() => {
        if (!verificationOfferId) return undefined;
        const offer = merchantAcceptedOffers.find((o) => o.id === verificationOfferId);
        if (!offer || !merchantOfferVerificationPending(offer.fulfillmentStatus)) {
            return undefined;
        }
        return getVerificationDocForOffer(order?.verificationDocuments, verificationOfferId);
    }, [verificationOfferId, merchantAcceptedOffers, order?.verificationDocuments]);

    /** Timeline reflects this merchant's parts, not the whole multi-vendor order. */
    const merchantTimelineStatus = useMemo((): StatusType => {
        if (merchantAcceptedOffers.length === 0) return (order?.status || 'PREPARATION') as StatusType;
        const statuses = merchantAcceptedOffers.map((o) =>
            String(o.fulfillmentStatus || 'IN_PREPARATION').toUpperCase(),
        );
        if (statuses.some((s) => s === 'AWAITING_PAYMENT' || s === 'IN_PREPARATION')) return 'PREPARATION';
        if (statuses.some((s) => s === 'PREPARED')) return 'PREPARED';
        if (statuses.some((s) => s === 'VERIFICATION')) return 'VERIFICATION';
        if (statuses.some((s) => s === 'VERIFICATION_SUCCESS')) return 'VERIFICATION_SUCCESS';
        if (statuses.some((s) => s === 'READY_FOR_SHIPPING')) return 'READY_FOR_SHIPPING';
        if (statuses.every((s) => s === 'DELIVERED')) return 'DELIVERED';
        if (statuses.every((s) => s === 'SHIPPED' || s === 'DELIVERED')) return 'SHIPPED';
        return (order?.status || 'PREPARATION') as StatusType;
    }, [merchantAcceptedOffers, order?.status]);

    const merchantFulfillmentSummary = useMemo(() => {
        const total = merchantAcceptedOffers.length;
        if (total <= 1) return fulfillmentSummary;
        const stepCounts = {
            preparation: 0,
            prepared: 0,
            verification: 0,
            verificationSuccess: 0,
            handoverPending: 0,
            readyForShipping: 0,
            shipped: 0,
            inCart: 0,
        };
        for (const o of merchantAcceptedOffers) {
            const s = String(o.fulfillmentStatus || 'IN_PREPARATION').toUpperCase();
            if (s === 'AWAITING_PAYMENT' || s === 'IN_PREPARATION') stepCounts.preparation++;
            else if (s === 'PREPARED') stepCounts.prepared++;
            else if (s === 'VERIFICATION') stepCounts.verification++;
            else if (s === 'VERIFICATION_SUCCESS') stepCounts.handoverPending++;
            else if (s === 'READY_FOR_SHIPPING') stepCounts.readyForShipping++;
            else if (s === 'SHIPPED') stepCounts.shipped++;
            else if (s === 'DELIVERED') stepCounts.shipped++;
        }
        return { total, stepCounts };
    }, [merchantAcceptedOffers, fulfillmentSummary]);

    const prepareOfferForDialog = useMemo(
        () => offersNeedingPrepare.find((o) => o.id === prepareOfferId) || offersNeedingPrepare[0],
        [offersNeedingPrepare, prepareOfferId],
    );

    // Map partId -> check if awarded to ANOTHER merchant
    const awardedToOthers = useMemo(() => {
        const map = new Map<string, boolean>();
        if (order?.parts && order?.offers) {
            order.parts.forEach((p: any) => {
                const isAwardedToOther = order.offers.some((of: any) => 
                    (of.orderPartId === p.id || of.order_part_id === p.id) && 
                    of.status === 'accepted' && 
                    String(of.storeId) !== String(storeId)
                );
                map.set(p.id, isAwardedToOther);
            });
        }
        return map;
    }, [order?.parts, order?.offers, storeId]);

    // Competition Level Helper based on User Thresholds:
    // 0-4: Low, 5-7: Medium, 8-9: High, 10: Full
    const getCompetitionLevel = (count: number) => {
        if (count >= 10) return { label: isAr ? 'مكتمل' : 'Full', color: 'text-purple-400 bg-purple-500/10 border-purple-500/20', level: 'full' };
        if (count >= 8) return { label: isAr ? 'عالي' : 'High', color: 'text-red-400 bg-red-500/10 border-red-500/20', level: 'high' };
        if (count >= 5) return { label: isAr ? 'متوسط' : 'Medium', color: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20', level: 'medium' };
        return { label: isAr ? 'منخفض' : 'Low', color: 'text-green-400 bg-green-500/10 border-green-500/20', level: 'low' };
    };

    const hasSubmittedAny = myOffers.some((o: any) => isActiveMerchantOffer(o));

    const modificationMetrics = useMemo(
        () => getOfferModificationMetrics(performance),
        [performance.editCount, performance.withdrawalCount, performance.totalOffersSent],
    );

    const getOfferDeadline = (dateStr: string) => {
        const d = new Date(dateStr);
        d.setHours(d.getHours() + 23);
        d.setMinutes(d.getMinutes() + 45); // 23:45 Cutoff for 2026 Governance
        return d.toISOString();
    };

    const getPaymentDeadline = (dateStr?: string) => {
        if (order?.paymentDeadlineAt) return order.paymentDeadlineAt;
        const base = dateStr || order?.offerAcceptedAt || order?.updatedAt;
        const d = new Date(base);
        d.setHours(d.getHours() + 24);
        return d.toISOString();
    };

    const getPreparationDeadline = (dateStr?: string) => {
        const paymentDates = order?.payments?.map((p: any) => new Date(p.createdAt || p.paidAt).getTime()).filter(Boolean) || [];
        const paidAt = paymentDates.length > 0 ? new Date(Math.min(...paymentDates)).toISOString() : null;
        const base = paidAt || dateStr || order?.updatedAt;
        const d = new Date(base);
        d.setHours(d.getHours() + 48);
        return d.toISOString();
    };

    const isOrderExpired = (dateStr: string) => {
        if (!dateStr) return false;
        try {
            const deadline = new Date(getOfferDeadline(dateStr)).getTime();
            if (isNaN(deadline)) return false;
            return new Date().getTime() > deadline;
        } catch (e) {
            return false;
        }
    };

    // 2026 Centralized Lifecycle States
    const progressiveStates = ['AWAITING_SELECTION', 'AWAITING_PAYMENT', 'PREPARATION', 'DELAYED_PREPARATION', 'PREPARED', 'VERIFICATION', 'VERIFICATION_SUCCESS', 'READY_FOR_SHIPPING', 'PARTIALLY_SHIPPED', 'PARTIALLY_DELIVERED', 'NON_MATCHING', 'CORRECTION_PERIOD', 'CORRECTION_SUBMITTED', 'SHIPPED', 'DELIVERED', 'COMPLETED', 'RETURN_REQUESTED', 'RETURN_APPROVED', 'RETURNED', 'WARRANTY_ACTIVE', 'WARRANTY_EXPIRED'];
    const isProgressive = order ? progressiveStates.includes(order.status) : false;

    const handleOpenLightbox = (images: string[], index: number) => {
        setLightboxImages(images);
        setLightboxIndex(index);
        setIsLightboxOpen(true);
    };

    const handleCancelOffer = async () => {
        if (!offerToCancel || !order) return;
        if (offerToCancel.isWithdrawn) {
            alert(isAr ? 'هذا العرض تم سحبه بالفعل.' : 'This offer is already withdrawn.');
            setIsCancelDialogOpen(false);
            return;
        }

        const { isFreeCancelWindow } = getOfferGovernanceWindow(order, offerToCancel);
        if (!isFreeCancelWindow) {
            alert(
                isAr
                    ? 'انتهت مهلة التعديل المجاني. استخدم زر الانسحاب الطوعي إن كانت المهلة ما زالت متاحة.'
                    : 'Free edit window has ended. Use voluntary withdrawal if still within the allowed period.',
            );
            setIsCancelDialogOpen(false);
            return;
        }

        setIsCancelling(true);
        try {
            await offersApi.cancel(offerToCancel.id);
            removeOfferFromOrder(offerToCancel.id);
            await fetchDashboardStats();
            await fetchMyOffers();
            await fetchOrder(String(orderId));
            setIsCancelDialogOpen(false);
            setOfferToCancel(null);
        } catch (err: any) {
            console.error('Failed to cancel offer:', err);
            const msg = err.response?.data?.message || err.message;
            alert(isAr ? `فشل إلغاء العرض: ${msg}` : `Failed to cancel offer: ${msg}`);
        } finally {
            setIsCancelling(false);
        }
    };

    const handleVoluntaryWithdraw = async () => {
        if (!offerToVoluntaryWithdraw || !order) return;

        setIsVoluntaryWithdrawing(true);
        try {
            await offersApi.voluntaryWithdraw(offerToVoluntaryWithdraw.id);
            markOfferWithdrawnInOrder(offerToVoluntaryWithdraw.id);
            await fetchDashboardStats();
            await fetchMyOffers();
            await fetchOrder(String(orderId));
            setIsVoluntaryWithdrawDialogOpen(false);
            setOfferToVoluntaryWithdraw(null);
        } catch (err: any) {
            console.error('Failed voluntary withdraw:', err);
            const msg = err.response?.data?.message || err.message;
            alert(isAr ? `فشل الانسحاب: ${msg}` : `Withdrawal failed: ${msg}`);
        } finally {
            setIsVoluntaryWithdrawing(false);
        }
    };

    const handleMarkPrepared = async () => {
        const targetOfferId = prepareOfferId || offersNeedingPrepare[0]?.id;
        if (!targetOfferId) return;
        setIsPreparing(true);
        try {
            await ordersApi.markOfferPrepared(String(orderId), targetOfferId);
            await fetchOrder(String(orderId));
            setIsPrepareDialogOpen(false);
            setPrepareOfferId(null);
        } catch (err: any) {
            console.error('Failed to mark prepared:', err);
            const msg = err?.response?.data?.message || err?.message;
            alert(
                isAr
                    ? `فشل تأكيد التجهيز: ${msg || 'يرجى المحاولة لاحقاً'}`
                    : `Failed to confirm preparation: ${msg || 'Please try again'}`,
            );
        } finally {
            setIsPreparing(false);
        }
    };

    const handleRequestShipping = async (offerId?: string) => {
        const targetOfferId = offerId || offersReadyForHandover[0]?.id;
        if (!targetOfferId) return;
        setIsRequestingShipping(true);
        try {
            await ordersApi.markOfferReadyForShipping(String(orderId), targetOfferId);
            await fetchOrder(String(orderId));
            alert(isAr ? 'تم تأكيد جاهزية القطعة للشحن! يمكن للعميل شحنها من السلة.' : 'Part marked ready for shipping! Customer can ship from cart.');
        } catch (err) {
            console.error('Failed to request shipping:', err);
            alert(isAr ? 'فشل طلب الشحن، يرجى المحاولة لاحقاً.' : 'Failed to request shipping.');
        } finally {
            setIsRequestingShipping(false);
        }
    };

    if (isLoading) {
        return <MarketplaceDetailsSkeleton isAr={isAr} />;
    }

    if (!order) {
        return (
            <div className="flex flex-col items-center justify-center p-12 text-center h-full">
                <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mb-6">
                    <AlertTriangle size={32} className="text-red-500" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-2">{isAr ? 'الطلب غير موجود' : 'Order Not Found'}</h3>
                <p className="text-white/60 mb-8 max-w-sm">
                    {isAr ? 'لم نتمكن من العثور على هذا الطلب، قد يكون تم حذفه أو تم اغلاق تقديم العروض له.' : 'We could not find this order. It may have been deleted or closed for bidding.'}
                </p>
                <button
                    onClick={onBack}
                    className="px-6 py-3 bg-white/5 hover:bg-white/10 text-white rounded-xl transition-colors flex items-center gap-2"
                >
                    <ArrowIcon size={18} />
                    {isAr ? 'العودة للسوق' : 'Back to Marketplace'}
                </button>
            </div>
        );
    }

    if (showVerificationForm) {
        const verifyPartName = verificationOfferId
            ? getMerchantOfferPartName(
                  merchantAcceptedOffers.find((o) => o.id === verificationOfferId) || {},
              )
            : null;
        return (
            <div className="pt-6 space-y-4">
                {verifyPartName && (
                    <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-center">
                        <p className="text-xs text-amber-400/80 uppercase tracking-wider font-bold mb-1">
                            {isAr ? 'توثيق القطعة' : 'Verifying part'}
                        </p>
                        <p className="text-white font-bold">{verifyPartName}</p>
                    </div>
                )}
                <VerificationForm
                    key={verificationOfferId || 'order-verification'}
                    resetKey={verificationOfferId || 'order-verification'}
                    orderId={order.id}
                    isCorrection={order.status === 'CORRECTION_PERIOD' || order.status === 'NON_MATCHING'}
                    existingData={
                        order.status === 'CORRECTION_PERIOD' || order.status === 'NON_MATCHING'
                            ? order.verificationDocuments?.[0]
                            : verificationExistingData
                    }
                    onSubmit={async (payload) => {
                        try {
                            if (order.status === 'CORRECTION_PERIOD' || order.status === 'NON_MATCHING') {
                                await ordersApi.submitCorrectionVerification(order.id, payload);
                                patchOrderFromRealtime(String(order.id), {
                                    status: 'CORRECTION_SUBMITTED',
                                });
                            } else {
                                const oid = verificationOfferId || offersNeedingVerification[0]?.id;
                                if (oid) {
                                    await ordersApi.submitOfferVerification(order.id, oid, payload);
                                } else {
                                    await ordersApi.submitVerification(order.id, payload);
                                }
                            }
                            setShowVerificationForm(false);
                            setVerificationOfferId(null);
                            await fetchOrder(String(order.id));
                            await fetchMyOffers();
                        } catch (err) {
                            console.error(err);
                            throw err; // VerificationForm will catch and show error
                        }
                    }}
                    onCancel={() => setShowVerificationForm(false)}
                />
            </div>
        );
    }

    const expired = isOrderExpired(order.createdAt || order.date);

    return (
        <motion.div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 pb-20 lg:pb-0">

            {isBlockedFromOrder && (
                <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-start gap-3 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30"
                >
                    <AlertTriangle size={20} className="text-amber-400 shrink-0 mt-0.5" />
                    <p className="text-sm text-amber-200/90 leading-relaxed">
                        {exploreOfferT?.blockedFromOrder ||
                            (isAr
                                ? 'لقد انسحبت من هذا الطلب ولا يمكنك تقديم عرض جديد عليه.'
                                : 'You have withdrawn from this request and cannot submit a new offer on it.')}
                    </p>
                </motion.div>
            )}

            {/* HEADER */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <button
                        onClick={onBack}
                        className="w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center text-white transition-colors"
                    >
                        <ArrowIcon size={20} />
                    </button>
                    <div>
                        <div className="flex flex-wrap items-center gap-3 mb-1">
                            <h1 className="text-2xl md:text-3xl font-bold text-white">
                                {isAr ? 'تفاصيل طلب العميل' : 'Customer Request Details'}
                            </h1>
                            <Badge status={order.status} />
                            {order.warranty_end_at && (
                                <WarrantyProtectionCard 
                                    order={order} 
                                    variant="compact"
                                    role="merchant"
                                />
                            )}
                            {shipment && !['CANCELLED', 'AWAITING_OFFERS', 'AWAITING_PAYMENT'].includes(order.status) && (
                                <Badge status={shipment.status as StatusType} className="animate-in fade-in zoom-in duration-500" />
                            )}
                            <span className="px-3 py-1 bg-gold-500/10 text-gold-400 border border-gold-500/20 rounded-full text-xs font-mono">
                                #{order.id}
                            </span>
                        </div>
                        <p className="text-white/50 text-sm flex items-center gap-4">
                            <span className="flex items-center gap-1"><Calendar size={14} /> {order.date}</span>
                            <span className="text-white/20 px-2">•</span>
                            <span className="flex items-center gap-1 font-mono tracking-wide text-gold-400 text-xs bg-gold-400/5 px-2 py-0.5 rounded-md border border-gold-400/10">
                                <User size={12} className="text-white/50" /> 
                                {order.customer?.customerCode || (order.customer?.id ? `CUS-${order.customer.id.substring(0, 6).toUpperCase()}` : (isAr ? 'عميل إي-تشليح' : 'E-Tashleh Customer'))}
                            </span>
                        </p>
                    </div>
                </div>

                {/* Status Badge & Timer */}
                <div className="flex items-center gap-4 bg-white/5 px-4 py-2 rounded-xl border border-white/10 w-full md:w-auto">
                    {(() => {
                        // If order is active and time hasn't expired (or status is explicitly collecting)
                        if ((order.status === 'AWAITING_OFFERS' || order.status === 'COLLECTING_OFFERS') && (!expired || order.status === 'COLLECTING_OFFERS')) {
                            return (
                                <div className="flex items-center justify-between w-full md:w-auto gap-4">
                                    <span className="text-sm text-white/60">{isAr ? 'الوقت المتبقي لتقديم عرض:' : 'Time left to offer:'}</span>
                                    <CountdownTimer targetDate={getOfferDeadline(order.createdAt || order.date)} compact={true} />
                                </div>
                            );
                        }

                        if (order.status === 'AWAITING_SELECTION') {
                            return (
                                <div className="flex items-center justify-between w-full md:w-auto gap-4">
                                    <span className="text-sm text-white/60">{isAr ? 'مهلة اختيار العميل المتبقية:' : 'Selection deadline:'}</span>
                                    <CountdownTimer targetDate={order.selectionDeadlineAt || new Date(new Date(order.createdAt || order.date).getTime() + 48 * 60 * 60 * 1000).toISOString()} compact={true} />
                                </div>
                            );
                        }
                        
                        if (order.status === 'AWAITING_PAYMENT') {
                            return (
                                <div className="flex items-center justify-between w-full md:w-auto gap-4">
                                    <span className="text-sm text-white/60">{isAr ? 'الوقت المتبقي لإتمام العميل الدفع:' : 'Time left for client pay:'}</span>
                                    <CountdownTimer targetDate={getPaymentDeadline(order.offerAcceptedAt || order.updatedAt)} compact={true} />
                                </div>
                            );
                        }

                        if (order.status === 'PREPARATION') {
                            return (
                                <div className="flex items-center justify-between w-full md:w-auto gap-4">
                                    <span className="text-sm text-white/60">{isAr ? 'مهلة التجهيز المتبقية:' : 'Time left for preparation:'}</span>
                                    <CountdownTimer targetDate={getPreparationDeadline(order.updatedAt)} compact={true} />
                                </div>
                            );
                        }

                        if (order.status === 'DELAYED_PREPARATION') {
                            return (
                                <div className="flex items-center justify-between w-full md:w-auto gap-4 bg-red-500/10 px-4 py-2 rounded-xl border border-red-500/20 shadow-[0_0_15px_rgba(239,68,68,0.2)]">
                                    <span className="text-sm font-bold text-red-500 animate-pulse flex items-center gap-1.5"><AlertTriangle size={16} /> {isAr ? 'عاجل: وقت إضافي أخير للتجهيز' : 'URGENT: Final penalty grace period'}</span>
                                    <div className="text-red-400 font-bold bg-zinc-950 px-2 py-0.5 rounded border border-red-500/30">
                                         <CountdownTimer targetDate={order.delayedPreparationDeadlineAt || getOfferDeadline(order.updatedAt)} compact={true} />
                                    </div>
                                </div>
                            );
                        }

                        // CORRECTION_PERIOD: show urgent countdown timer (48h)
                        if (order.status === 'CORRECTION_PERIOD') {
                            const correctionDeadline = order.correctionDeadlineAt || 
                                new Date(new Date().getTime() + 48 * 60 * 60 * 1000).toISOString();
                            return (
                                <div className="flex items-center gap-3 bg-orange-500/10 border border-orange-500/30 px-4 py-2 rounded-xl animate-pulse">
                                    <AlertTriangle size={16} className="text-orange-400 shrink-0" />
                                    <span className="text-orange-400 font-bold text-sm">{isAr ? '⚠️ مهلة التصحيح:' : '⚠️ Correction:'}</span>
                                    <CountdownTimer targetDate={correctionDeadline} compact hideExpiredText={false} />
                                </div>
                            );
                        }

                        // NON_MATCHING: preparing to enter correction period
                        if (order.status === 'NON_MATCHING') {
                            return (
                                <div className="flex items-center gap-2 text-red-400 bg-red-500/10 border border-red-500/20 px-4 py-2 rounded-xl">
                                    <AlertTriangle size={16} className="animate-pulse" />
                                    <span className="font-bold text-sm">{isAr ? 'غير مطابق - مطلوب تصحيح' : 'Non-Matching - Action Required'}</span>
                                </div>
                            );
                        }

                        // VERIFICATION: pending admin review
                        if (order.status === 'VERIFICATION' || order.status === 'CORRECTION_SUBMITTED') {
                            return (
                                <div className="flex items-center gap-2 text-amber-400 bg-amber-500/10 border border-amber-500/20 px-4 py-2 rounded-xl">
                                    <CheckCircle2 size={16} />
                                    <span className="font-bold text-sm">{isAr ? 'قيد مراجعة الإدارة' : 'Under Admin Review'}</span>
                                </div>
                            );
                        }

                        // VERIFICATION_SUCCESS: approved, awaiting shipment
                        if (order.status === 'VERIFICATION_SUCCESS') {
                            return (
                                <div className="flex items-center gap-2 text-green-400 bg-green-500/10 border border-green-500/20 px-4 py-2 rounded-xl">
                                    <CheckCircle2 size={16} />
                                    <span className="font-bold text-sm">{isAr ? 'تمت المطابقة - جاهز للشحن' : 'Verified - Ready to Ship'}</span>
                                </div>
                            );
                        }

                        // WARRANTY_ACTIVE: Show protection status
                        if (order.status === 'WARRANTY_ACTIVE') {
                            return (
                                <div className="flex items-center gap-2 text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-4 py-2 rounded-xl">
                                    <Shield size={16} className="animate-pulse" />
                                    <span className="font-bold text-sm">{isAr ? 'حماية الضمان نشطة' : 'Warranty Protection Active'}</span>
                                </div>
                            );
                        }

                        // If the order has progressed to checkout/shipping
                        if (isProgressive) {
                            // Check if the merchant has at least one accepted offer on this order
                            const hasAccepted = myOffers.some(o => o.status === 'accepted');
                            return (
                                <div className={`flex items-center gap-2 ${hasAccepted ? 'text-green-400' : 'text-white/60'}`}>
                                    {hasAccepted ? (order.status === 'PREPARED' ? <Package size={16} /> : <CheckCircle2 size={16} />) : <AlertTriangle size={16} />}
                                    <span className="font-bold">
                                        {hasAccepted 
                                            ? (order.status === 'PREPARED' 
                                                ? (isAr ? 'جاهز للتوثيق والتسليم' : 'Ready - Upload Documents') 
                                                : (isAr ? 'قيد التنفيذ (مبروك!)' : 'In Progress (You Won!)'))
                                            : (isAr ? 'مغلق (تم الترسية)' : 'Closed (Awarded)')
                                        }
                                    </span>
                                </div>
                            );
                        }


                        // Otherwise it's genuinely expired or cancelled
                        return (
                            <div className="flex items-center gap-2 text-red-400">
                                <AlertTriangle size={16} />
                                <span className="font-bold">{isAr ? 'الطلب منتهي' : 'Order Expired'}</span>
                            </div>
                        );
                    })()}
                </div>
            </div>

            <MerchantHandoverPendingBanner
                order={order}
                role="merchant"
                storeId={storeId ?? undefined}
                isAr={isAr}
                className="mb-2"
            />

            {/* MAIN CONTENT GRID */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* LEFT COLUMN: Request Intel */}
                <div className="lg:col-span-2 space-y-6">
                    {activeShippingCase && (
                        <ShippingPaymentCard 
                            caseRecord={activeShippingCase} 
                            role="MERCHANT" 
                            onSuccess={() => fetchCases('merchant')}
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
                            {isAr ? 'نظرة عامة' : 'Overview'}
                        </button>
                        <button
                            onClick={() => setActiveTab('invoices')}
                            className={`px-4 py-2 text-sm font-bold uppercase tracking-wider rounded-lg transition-colors whitespace-nowrap flex items-center gap-2 ${
                                activeTab === 'invoices' ? 'bg-gold-500 text-black' : 'text-white/50 hover:bg-white/5 hover:text-white'
                            }`}
                        >
                            <FileText size={16} />
                            {isAr ? 'الفواتير' : 'Invoices'}
                        </button>
                        {['VERIFICATION_SUCCESS', 'READY_FOR_SHIPPING', 'SHIPPED', 'DELIVERED', 'COMPLETED', 'DISPUTED', 'RETURNED', 'RETURN_REQUESTED', 'RETURN_APPROVED', 'REFUNDED', 'WARRANTY_ACTIVE', 'WARRANTY_EXPIRED'].includes(order.status) && (
                            <button
                                onClick={() => setActiveTab('waybills')}
                                className={`px-4 py-2 text-sm font-bold uppercase tracking-wider rounded-lg transition-colors whitespace-nowrap flex items-center gap-2 ${
                                    activeTab === 'waybills' ? 'bg-gold-500 text-black' : 'text-white/50 hover:bg-white/5 hover:text-white'
                                }`}
                            >
                                <Truck size={16} />
                                {isAr ? 'البوليصة' : 'Waybills'}
                            </button>
                        )}
                    </div>

                    <div className={activeTab === 'invoices' ? 'block' : 'hidden'}>
                        <OrderInvoicesPanel 
                            orderId={order.id} 
                            role="MERCHANT" 
                            initialData={order.invoices}
                            highlightOfferId={deepLink.offerId}
                        />
                    </div>
                    <div className={activeTab === 'waybills' ? 'block' : 'hidden'}>
                        {['VERIFICATION_SUCCESS', 'READY_FOR_SHIPPING', 'SHIPPED', 'DELIVERED', 'COMPLETED', 'DISPUTED', 'RETURNED', 'RETURN_REQUESTED', 'RETURN_APPROVED', 'REFUNDED', 'WARRANTY_ACTIVE', 'WARRANTY_EXPIRED'].includes(order.status) && (
                            <OrderWaybillsPanel 
                                orderId={order.id} 
                                orderStatus={order.status} 
                                role="MERCHANT" 
                                initialData={order.shippingWaybills}
                                requestType={order.requestType}
                                orderNumber={order.orderNumber}
                                offers={order.offers}
                                shipmentBatches={order.shipmentBatches}
                            />
                        )}
                    </div>

                    <div className={activeTab === 'overview' ? 'space-y-6' : 'hidden'}>

                    {order.shipmentBatches?.length > 0 && (
                        <div className="space-y-3">
                            <h4 className="text-sm font-bold text-white/50 uppercase tracking-wider">
                                {isAr ? 'دفعات الشحن للطلب' : 'Order shipment batches'}
                            </h4>
                            {order.shipmentBatches.map((batch: { shipmentId: string }) => (
                                <ShipmentBatchCard
                                    key={batch.shipmentId}
                                    batch={batch as any}
                                    orderNumber={order.orderNumber}
                                    isAr={isAr}
                                />
                            ))}
                        </div>
                    )}

                    {/* Premium Warranty Protection Hub (2026) */}
                    {order.status === 'WARRANTY_ACTIVE' && order.warranty_end_at && (
                        <motion.div 
                            initial={{ opacity: 0, y: -20 }}
                            animate={{ opacity: 1, y: 0 }}
                        >
                            <WarrantyProtectionCard order={order} role="merchant" />
                        </motion.div>
                    )}

                    <PartialShippingProgressCard order={order} isAr={isAr} />

                    {/* ★ Order Progress Tracker (Mirror of Customer View) */}
                    <GlassCard className="p-0 overflow-hidden bg-[#1A1814] border-white/5">
                        <div className="p-6">
                            {shouldShowVerificationBanner(
                                merchantAcceptedOffers.length > 0
                                    ? merchantTimelineStatus
                                    : order.status,
                            ) && <VerificationPhaseBanner className="mb-6" />}
                            <StatusTimeline
                                currentStatus={
                                    merchantAcceptedOffers.length > 0
                                        ? merchantTimelineStatus
                                        : order.status
                                }
                                fulfillmentSummary={
                                    merchantAcceptedOffers.length > 1
                                        ? merchantFulfillmentSummary
                                        : fulfillmentSummary
                                }
                                shipmentDeliverySummary={shipmentDeliverySummary}
                            />
                            {merchantAcceptedOffers.length > 0 &&
                                merchantTimelineStatus !== order.status &&
                                ['PREPARATION', 'DELAYED_PREPARATION', 'PREPARED'].includes(order.status) && (
                                    <p className="mt-4 text-center text-xs text-white/45 px-4 leading-relaxed">
                                        {isAr
                                            ? 'شريط التقدم يعرض قطعك فقط. حالة الطلب العامة قد تتأخر إذا كانت هناك قطع من تجار آخرين.'
                                            : 'Progress reflects your parts only. Overall order status may lag while other merchants finish their parts.'}
                                    </p>
                                )}
                        </div>
                        {['SHIPPED', 'PARTIALLY_SHIPPED', 'PARTIALLY_DELIVERED', 'PREPARATION', 'READY_FOR_SHIPPING', 'DELIVERED', 'COMPLETED', 'DISPUTED', 'RETURNED', 'RETURN_REQUESTED', 'RETURN_APPROVED', 'REFUNDED', 'WARRANTY_ACTIVE', 'WARRANTY_EXPIRED'].includes(order.status) && shipment && (
                            <div className="border-t border-white/5 pt-6 mt-2 px-6 pb-6 shadow-inner">
                                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                                    <Truck className="text-gold-500" size={20} />
                                    {isAr ? 'تتبع الشحنة' : 'Shipment Tracking'}
                                </h3>
                                {/* Meta Info */}
                                <div className="flex flex-wrap gap-4 items-center justify-between bg-white/5 p-4 rounded-xl border border-white/10 mb-6">
                                    <div>
                                        <p className="text-sm text-white/50">{isAr ? 'رقم التتبع' : 'Tracking Num'}</p>
                                        <p className="font-mono font-bold text-lg text-gold-400">{shipment.trackingNumber || 'PENDING'}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-white/50">{isAr ? 'الشركة الناقلة' : 'Carrier'}</p>
                                        <p className="font-bold text-white flex items-center gap-2">
                                            <Truck size={16} />
                                            {shipment.carrier || (isAr ? 'تشليح السريعة' : 'Tashleh Express')}
                                        </p>
                                    </div>
                                    {shipment.trackingLink && (
                                        <a 
                                            href={shipment.trackingLink} 
                                            target="_blank" 
                                            rel="noopener noreferrer"
                                            className="flex items-center gap-2 px-4 py-2 bg-gold-500/10 hover:bg-gold-500 text-gold-400 hover:text-black border border-gold-500/20 rounded-lg font-bold text-sm transition-all"
                                        >
                                            <ExternalLink size={16} />
                                            {isAr ? 'تتبع' : 'Track'}
                                        </a>
                                    )}
                                </div>
                                <ShipmentTracker status={shipment.status} />
                            </div>
                        )}
                    </GlassCard>

                    {/* Vehicle Information Card */}
                    <GlassCard className="p-6">
                        <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                            <Car className="text-gold-500" size={24} />
                            {isAr ? 'تفاصيل المركبة' : 'Vehicle Information'}
                        </h2>
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                            <div className="bg-[#151310] p-4 rounded-xl border border-white/5">
                                <p className="text-white/40 text-xs mb-1">{isAr ? 'الشركة المصنعة' : 'Make'}</p>
                                <p className="text-white font-bold">{order.vehicle?.make || order.car}</p>
                            </div>
                            <div className="bg-[#151310] p-4 rounded-xl border border-white/5">
                                <p className="text-white/40 text-xs mb-1">{isAr ? 'الموديل' : 'Model'}</p>
                                <p className="text-white font-bold">{order.vehicle?.model || '-'}</p>
                            </div>
                            <div className="bg-[#151310] p-4 rounded-xl border border-white/5">
                                <p className="text-white/40 text-xs mb-1">{isAr ? 'سنة الصنع' : 'Year'}</p>
                                <p className="text-white font-bold">{order.vehicle?.year || '-'}</p>
                            </div>
                            <div className="bg-[#151310] p-4 rounded-xl border border-white/5">
                                <p className="text-white/40 text-xs mb-1 font-mono">VIN</p>
                                <p className="text-white font-bold font-mono text-sm">{order.vehicle?.vin || order.vin || '-'}</p>
                            </div>
                        </div>
                    </GlassCard>

                    {/* Preferences & Delivery Form */}
                    <GlassCard className="p-6">
                        <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                            <Settings className="text-gold-500" size={24} />
                            {isAr ? 'تفضيلات العميل' : 'Customer Preferences'}
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="bg-[#151310] p-4 rounded-xl border border-white/5 flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-gold-500/10 flex items-center justify-center text-gold-500">
                                    <Monitor size={18} />
                                </div>
                                <div>
                                    <p className="text-white/40 text-xs mb-0.5">{isAr ? 'حالة القطعة' : 'Condition'}</p>
                                    <p className="text-sm font-bold text-white">{order.conditionPref === 'new' ? (isAr ? 'جديد (وكالة)' : 'New Only') : (isAr ? 'مستعمل (تشليح)' : 'Used Only')}</p>
                                </div>
                            </div>

                            <div className="bg-[#151310] p-4 rounded-xl border border-white/5 flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-gold-500/10 flex items-center justify-center text-gold-500">
                                    <Truck size={18} />
                                </div>
                                <div>
                                    <p className="text-white/40 text-xs mb-0.5">{isAr ? 'طريقة الشحن' : 'Shipping'}</p>
                                    <p className="text-sm font-bold text-white">
                                        {order.shippingType === 'combined'
                                            ? (isAr ? '(عدة قطع) تجميع الطلبات' : '(Multiple) Combined')
                                            : ((order.parts && order.parts.length > 1) || order.requestType === 'multiple'
                                                ? (isAr ? '(عدة قطع) كل طلب فى شحنه لوحده' : '(Multiple) Separate')
                                                : (isAr ? '(قطعة واحدة) شحن كل قطعة لوحدها' : '(Single) Separate')
                                            )}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </GlassCard>

                    {/* Store Instructions Section */}
                    <GlassCard className="p-6 overflow-hidden relative border-gold-500/10 bg-[#1A1814]">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-500/50 via-gold-500/50 to-green-500/50" />
                        <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                            <ShieldCheck className="text-gold-500" size={24} />
                            {t.dashboard.merchant.marketplace.instructions.title}
                        </h2>
                        
                        <div className="grid md:grid-cols-2 gap-6">
                            {/* Forbidden Section */}
                            <div className="bg-red-500/5 border border-red-500/10 rounded-2xl p-5 space-y-4">
                                <div className="flex items-center gap-2 text-red-400 font-bold mb-2">
                                    <XCircle size={20} />
                                    <span>{t.dashboard.merchant.marketplace.instructions.forbidden.title}</span>
                                </div>
                                <ul className="space-y-3">
                                    {t.dashboard.merchant.marketplace.instructions.forbidden.items.map((item: string, i: number) => (
                                        <li key={i} className="flex items-start gap-2 text-sm text-white/70">
                                            <div className="w-1.5 h-1.5 rounded-full bg-red-400 mt-1.5 shrink-0" />
                                            {item}
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            {/* Mandatory Section */}
                            <div className="bg-green-500/5 border border-green-500/10 rounded-2xl p-5 space-y-4">
                                <div className="flex items-center gap-2 text-green-400 font-bold mb-2">
                                    <CheckCircle2 size={20} />
                                    <span>{t.dashboard.merchant.marketplace.instructions.mandatory.title}</span>
                                </div>
                                <ul className="space-y-3">
                                    {t.dashboard.merchant.marketplace.instructions.mandatory.items.map((item: string, i: number) => (
                                        <li key={i} className="flex items-start gap-2 text-sm text-white/70">
                                            <div className="w-1.5 h-1.5 rounded-full bg-green-400 mt-1.5 shrink-0" />
                                            {item}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    </GlassCard>

                    {/* Parts List */}
                    <div className="space-y-4">
                        <h2 className="text-xl font-bold text-white flex items-center gap-2">
                            <Box className="text-gold-500" size={24} />
                            {isAr ? 'القطع المطلوبة' : 'Requested Parts'}
                        </h2>

                        {order.parts && order.parts.length > 0 ? (
                            order.parts.map((part: any, idx: number) => {
                                    const partOffer = getPartOfferEnriched(part.id);
                                    const hasOffer = !!partOffer;
                                    const isAwardedToOther = awardedToOthers.get(part.id);

                                    return (
                                        <GlassCard key={part.id} className={`p-6 relative overflow-hidden transition-all ${hasOffer ? 'border-green-500/30 bg-green-500/[0.02]' : ''} ${isAwardedToOther ? 'opacity-75 grayscale-[0.5]' : 'hover:border-gold-500/20'}`}>
                                            {isAwardedToOther && (
                                                <div className="absolute top-2 right-2 z-20">
                                                    <div className="bg-red-500/20 text-red-400 border border-red-500/30 px-2 py-1 rounded text-[10px] font-bold backdrop-blur-md animate-in zoom-in duration-300 uppercase tracking-tighter">
                                                        {isAr ? 'تم الاختيار من تاجر آخر' : 'Awarded to Another'}
                                                    </div>
                                                </div>
                                            )}
                                        {/* Numerator */}
                                        <div className={`absolute top-0 ${isAr ? 'right-0 rounded-bl-xl' : 'left-0 rounded-br-xl'} ${hasOffer ? 'bg-green-500/10' : 'bg-white/5'} px-3 py-1 border-b ${isAr ? 'border-l' : 'border-r'} ${hasOffer ? 'border-green-500/20' : 'border-white/10'} text-xs font-mono ${hasOffer ? 'text-green-400' : 'text-white/40'}`}>
                                            {hasOffer ? <CheckCircle2 size={14} className="inline mr-1" /> : null}{idx + 1}
                                        </div>

                                        {/* Offer Status Badge */}
                                        {hasOffer && (
                                            <div className={`absolute top-0 ${isAr ? 'left-0 rounded-br-xl' : 'right-0 rounded-bl-xl'} bg-green-500/10 px-3 py-1 border-b ${isAr ? 'border-r' : 'border-l'} border-green-500/20`}>
                                                <span className="text-xs font-bold text-green-400 flex items-center gap-1">
                                                    <CheckCircle2 size={12} />
                                                    {isAr ? 'عرض مقدم' : 'Offer Submitted'}
                                                </span>
                                            </div>
                                        )}

                                        <div className="mt-4 flex flex-col md:flex-row gap-6">

                                            {/* Media Preview Area */}
                                            <div className="w-full md:w-48 shrink-0">
                                                {part.video ? (
                                                    <div className="aspect-video md:aspect-square rounded-xl overflow-hidden bg-black/50 border border-white/10 relative group">
                                                        <video
                                                            src={part.video}
                                                            className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                                                            controls
                                                            controlsList="nodownload"
                                                        />
                                                    </div>
                                                ) : toDisplayImageUrls(part.images).length > 0 ? (
                                                    <div
                                                        onClick={() => handleOpenLightbox(toDisplayImageUrls(part.images), 0)}
                                                        className="aspect-square rounded-xl overflow-hidden bg-black/50 border border-white/10 relative group cursor-pointer"
                                                    >
                                                        <img src={toDisplayImageUrls(part.images)[0]} alt={part.name || 'Part image'} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                                        {toDisplayImageUrls(part.images).length > 1 && (
                                                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                                <span className="text-white font-medium bg-black/50 px-3 py-1 rounded-full text-sm backdrop-blur-md">
                                                                    +{toDisplayImageUrls(part.images).length - 1} {isAr ? 'صور أخرى' : 'more'}
                                                                </span>
                                                            </div>
                                                        )}
                                                    </div>
                                                ) : toDisplayImageUrls(order.partImages).length > 0 ? (
                                                    <div
                                                        onClick={() => handleOpenLightbox(toDisplayImageUrls(order.partImages), 0)}
                                                        className="aspect-square rounded-xl overflow-hidden bg-black/50 border border-white/10 relative group cursor-pointer"
                                                    >
                                                        <img src={toDisplayImageUrls(order.partImages)[0]} alt={part.name || 'Part image'} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                                        {toDisplayImageUrls(order.partImages).length > 1 && (
                                                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                                <span className="text-white font-medium bg-black/50 px-3 py-1 rounded-full text-sm backdrop-blur-md">
                                                                    +{toDisplayImageUrls(order.partImages).length - 1} {isAr ? 'صور أخرى' : 'more'}
                                                                </span>
                                                            </div>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <div className="aspect-square rounded-xl bg-white/5 border border-white/10 flex flex-col items-center justify-center text-white/20">
                                                        <Box size={32} className="mb-2" />
                                                        <span className="text-xs">{isAr ? 'لا توجد صور' : 'No images'}</span>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Content Area */}
                                            <div className="flex-1">
                                                <div className="flex flex-wrap items-center gap-2 mb-2">
                                                    <h3 className="text-lg font-bold text-white">{part.name || order.part}</h3>
                                                    {hasOffer && (() => {
                                                        const meta = partResolutionByOfferId.get(partOffer.id);
                                                        if (!meta?.hasOpenCase && !(meta?.resolutionLocked && meta.fulfillmentStatus !== 'COMPLETED')) {
                                                            return null;
                                                        }
                                                        return (
                                                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                                                                meta.hasOpenCase
                                                                    ? 'bg-red-500/10 text-red-400 border-red-500/30'
                                                                    : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                                                            }`}>
                                                                <AlertTriangle size={10} />
                                                                {meta.hasOpenCase
                                                                    ? (isAr ? 'نزاع/إرجاع' : 'Open case')
                                                                    : (isAr ? 'مقفل' : 'Locked')}
                                                            </span>
                                                        );
                                                    })()}
                                                </div>
                                                <p className="text-white/60 text-sm mb-4 leading-relaxed">{part.description || order.partDescription || (isAr ? 'لا توجد تفاصيل إضافية للقطعة المحددة.' : 'No additional details provided.')}</p>

                                                {/* Your Offer Summary for this part */}
                                                {hasOffer && (
                                                    <div className="mt-3 p-3 bg-green-500/5 rounded-xl border border-green-500/15">
                                                        <h4 className="text-xs font-bold text-green-400 mb-2 flex items-center gap-1.5">
                                                            <DollarSign size={14} />
                                                            {isAr ? 'عرضك على هذه القطعة' : 'Your Offer on this Part'}
                                                        </h4>
                                                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                                                            <div className="bg-black/20 rounded-lg px-2 py-1.5">
                                                                <span className="text-[10px] text-white/40 block">{isAr ? 'رقم العرض' : 'Offer No.'}</span>
                                                                <span className="text-sm font-bold text-white font-mono tracking-tight">{partOffer.offerNumber || '---'}</span>
                                                            </div>
                                                            <div className="bg-black/20 rounded-lg px-2 py-1.5">
                                                                <span className="text-[10px] text-white/40 block">{isAr ? 'رقم المتجر' : 'Store ID'}</span>
                                                                <span className="text-sm font-bold text-white font-mono tracking-tight">{partOffer.storeCode || '---'}</span>
                                                            </div>
                                                            <div className="bg-black/20 rounded-lg px-2 py-1.5">
                                                                <span className="text-[10px] text-white/40 block">{isAr ? 'تاريخ التقديم' : 'Submitted'}</span>
                                                                <span className="text-sm font-bold text-white">
                                                                    {partOffer.submittedAt ? new Date(partOffer.submittedAt).toLocaleDateString(isAr ? 'ar-EG' : 'en-GB', { day: 'numeric', month: 'short' }) : '---'}
                                                                </span>
                                                            </div>
                                                            <div className="bg-black/20 rounded-lg px-2 py-1.5">
                                                                <span className="text-[10px] text-white/40 block">{isAr ? 'السعر للعميل' : 'Customer Price'}</span>
                                                                <span className="text-sm font-bold text-gold-400">AED {
                                                                    (() => {
                                                                        const base = Number(partOffer.unitPrice || 0);
                                                                        const shipping = Number(partOffer.shippingCost || 0);
                                                                        const percentCommission = Math.round(base * 0.25);
                                                                        const commission = base > 0 ? Math.max(percentCommission, 100) : 0;
                                                                        return (base + shipping + commission).toLocaleString();
                                                                    })()
                                                                }</span>
                                                            </div>
                                                            {partOffer.condition && (
                                                                <div className="bg-black/20 rounded-lg px-2 py-1.5">
                                                                    <span className="text-[10px] text-white/40 block">{isAr ? 'الحالة' : 'Condition'}</span>
                                                                    <span className="text-sm font-bold text-white uppercase">{getConditionText(partOffer.condition)}</span>
                                                                </div>
                                                            )}
                                                            {partOffer.weight && Number(partOffer.weight) > 0 && (
                                                                <div className="bg-black/20 rounded-lg px-2 py-1.5 truncate">
                                                                    <span className="text-[10px] text-white/40 block">{isAr ? 'الوزن' : 'Weight'}</span>
                                                                    <span className="text-sm font-bold text-white">{partOffer.weight} {offersT?.units?.kg || 'kg'}</span>
                                                                </div>
                                                            )}
                                                            {partOffer.cylinders && (
                                                                <div className="bg-black/20 rounded-lg px-2 py-1.5 truncate border border-gold-500/20">
                                                                    <span className="text-[10px] text-gold-400 block font-bold">{isAr ? 'السلندرات' : 'Cylinders'}</span>
                                                                    <span className="text-sm font-bold text-white">{partOffer.cylinders}</span>
                                                                </div>
                                                            )}
                                                            {partOffer.partType && (
                                                                <div className="bg-black/20 rounded-lg px-2 py-1.5 truncate">
                                                                    <span className="text-[10px] text-white/40 block">{isAr ? 'النوع' : 'Type'}</span>
                                                                    <span className="text-sm font-bold text-white">{offersT?.partTypes?.[(partOffer.partType || 'standard').toLowerCase()] || partOffer.partType || (isAr ? 'شحن قياسي' : 'Standard')}</span>
                                                                </div>
                                                            )}
                                                            {partOffer.warranty && (
                                                                <div className="bg-black/20 rounded-lg px-2 py-1.5 truncate">
                                                                    <span className="text-[10px] text-white/40 block">{isAr ? 'الضمان' : 'Warranty'}</span>
                                                                    <span className="text-sm font-bold text-white">{getWarrantyText(partOffer.warranty)}</span>
                                                                </div>
                                                            )}
                                                            {partOffer.fulfillmentStatus && String(partOffer.status).toLowerCase() === 'accepted' && (() => {
                                                                const partVerificationDoc = getVerificationDocForOffer(
                                                                    order?.verificationDocuments,
                                                                    partOffer.id,
                                                                );
                                                                const isPartRejected = merchantOfferAdminRejected(
                                                                    partOffer.fulfillmentStatus,
                                                                    partVerificationDoc,
                                                                );
                                                                const isPartVerified =
                                                                    getFulfillmentRank(partOffer.fulfillmentStatus) >=
                                                                    getFulfillmentRank('VERIFICATION_SUCCESS');
                                                                const isPartInReview = merchantOfferVerificationPending(
                                                                    partOffer.fulfillmentStatus,
                                                                );
                                                                return (
                                                                <div className={`rounded-lg px-2 py-1.5 border col-span-2 sm:col-span-3 ${
                                                                    isPartRejected
                                                                        ? 'bg-red-500/10 border-red-500/25'
                                                                        : isPartInReview
                                                                        ? 'bg-amber-500/10 border-amber-500/25'
                                                                        : isPartVerified
                                                                          ? 'bg-green-500/10 border-green-500/25'
                                                                          : 'bg-blue-500/10 border-blue-500/20'
                                                                }`}>
                                                                    <span className={`text-[10px] block font-bold flex items-center gap-1 ${
                                                                        isPartRejected
                                                                            ? 'text-red-400'
                                                                            : isPartInReview
                                                                            ? 'text-amber-400'
                                                                            : isPartVerified
                                                                              ? 'text-green-400'
                                                                              : 'text-blue-400'
                                                                    }`}>
                                                                        {isPartRejected && <XCircle size={12} />}
                                                                        {isPartInReview && <Clock size={12} />}
                                                                        {isPartVerified && <CheckCircle2 size={12} />}
                                                                        {isAr ? 'حالة التجهيز' : 'Fulfillment'}
                                                                    </span>
                                                                    <span className="text-sm font-bold text-white">
                                                                        {isPartRejected
                                                                            ? (isAr ? 'مرفوض — مطلوب إعادة التوثيق' : 'Rejected — re-verify required')
                                                                            : getFulfillmentLabel(partOffer.fulfillmentStatus, isAr)}
                                                                    </span>
                                                                    {isPartRejected && partVerificationDoc?.adminRejectionReason && (
                                                                        <p className="text-[11px] text-red-300/90 mt-1 line-clamp-2">
                                                                            {partVerificationDoc.adminRejectionReason}
                                                                        </p>
                                                                    )}
                                                                    {order.requestType === 'multiple' && (
                                                                        <div className="mt-2">
                                                                            <CartShipmentBadge
                                                                                offer={partOffer}
                                                                                order={order}
                                                                                allOffers={order.offers || []}
                                                                                inAssemblyCart={!partOffer.shippedFromCart}
                                                                                isAr={isAr}
                                                                            />
                                                                        </div>
                                                                    )}
                                                                </div>
                                                                );
                                                            })()}
                                                            {(() => {
                                                                const logistics = getMerchantPartLogisticsLabel({
                                                                    order,
                                                                    partOffer,
                                                                    shipmentStatus: shipment?.status,
                                                                    isAr,
                                                                });
                                                                if (!logistics.show) return null;
                                                                return (
                                                                    <div className="bg-gold-500/10 rounded-lg px-2 py-1.5 border border-gold-500/20 flex flex-col justify-center animate-in zoom-in duration-500">
                                                                        <span className="text-[10px] text-gold-400 block font-bold uppercase tracking-tighter">{logistics.title}</span>
                                                                        <span className="text-[11px] font-black text-white flex items-center gap-1">
                                                                            <Box size={10} className="text-gold-400" />
                                                                            {logistics.value}
                                                                        </span>
                                                                    </div>
                                                                );
                                                            })()}
                                                            {partOffer.cartShipmentId && (() => {
                                                                const batchMates = (order?.offers || []).filter(
                                                                    (o: { id: string; cartShipmentId?: string }) =>
                                                                        o.cartShipmentId === partOffer.cartShipmentId &&
                                                                        o.id !== partOffer.id,
                                                                );
                                                                if (!batchMates.length) return null;
                                                                const names = batchMates.map((o: { orderPartId?: string; partName?: string }) => {
                                                                    const p = order?.parts?.find((pp: { id: string }) => pp.id === o.orderPartId);
                                                                    return p?.name || o.partName || (isAr ? 'قطعة' : 'Part');
                                                                });
                                                                return (
                                                                    <div className="col-span-2 sm:col-span-3 rounded-lg px-3 py-2 bg-blue-500/10 border border-blue-500/25 text-xs text-blue-200">
                                                                        <span className="font-bold block mb-1">
                                                                            {isAr ? 'مشمول في شحنة مجمعة مع:' : 'Grouped in one shipment with:'}
                                                                        </span>
                                                                        <span>{names.join(isAr ? ' · ' : ', ')}</span>
                                                                        <span className="block text-[10px] text-white/30 font-mono mt-1">
                                            #{String(partOffer.cartShipmentId).slice(0, 8)}
                                                                        </span>
                                                                    </div>
                                                                );
                                                            })()}
                                                        </div>

                                                        {partOffer && String(partOffer.status).toLowerCase() === 'accepted' && (
                                                            <div className="mt-4 flex flex-wrap gap-2">
                                                                {merchantCanMarkPrepared(partOffer.fulfillmentStatus) && (
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => {
                                                                            setPrepareOfferId(partOffer.id);
                                                                            setIsPrepareDialogOpen(true);
                                                                        }}
                                                                        className="px-4 py-2 rounded-lg text-xs font-bold bg-blue-500 hover:bg-blue-400 text-white border border-blue-500/30"
                                                                    >
                                                                        {isAr ? 'تأكيد تجهيز هذه القطعة' : 'Mark this part prepared'}
                                                                    </button>
                                                                )}
                                                                {merchantOfferVerificationPending(partOffer.fulfillmentStatus) && (
                                                                    <span className="px-4 py-2 rounded-lg text-xs font-bold bg-amber-500/10 text-amber-300 border border-amber-500/25 flex items-center gap-1.5">
                                                                        <Clock size={14} />
                                                                        {isAr ? 'التوثيق قيد مراجعة الإدارة' : 'Verification under admin review'}
                                                                    </span>
                                                                )}
                                                                {(() => {
                                                                    const partDoc = getVerificationDocForOffer(
                                                                        order?.verificationDocuments,
                                                                        partOffer.id,
                                                                    );
                                                                    if (
                                                                        !merchantOfferAdminRejected(
                                                                            partOffer.fulfillmentStatus,
                                                                            partDoc,
                                                                        )
                                                                    ) {
                                                                        return null;
                                                                    }
                                                                    return (
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => {
                                                                                setVerificationOfferId(partOffer.id);
                                                                                setShowVerificationForm(true);
                                                                            }}
                                                                            className="px-4 py-2 rounded-lg text-xs font-bold bg-red-600/90 hover:bg-red-500 text-white border border-red-500/30 flex items-center gap-1.5"
                                                                        >
                                                                            <AlertTriangle size={14} />
                                                                            {isAr ? 'إعادة التوثيق' : 'Re-verify'}
                                                                        </button>
                                                                    );
                                                                })()}
                                                                {merchantCanSubmitVerification(partOffer.fulfillmentStatus) && (
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => {
                                                                            setVerificationOfferId(partOffer.id);
                                                                            setShowVerificationForm(true);
                                                                        }}
                                                                        className="px-4 py-2 rounded-lg text-xs font-bold bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30"
                                                                    >
                                                                        {isAr ? 'توثيق هذه القطعة' : 'Verify this part'}
                                                                    </button>
                                                                )}
                                                                {merchantCanRequestReadyForShipping(partOffer.fulfillmentStatus) && (
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => handleRequestShipping(partOffer.id)}
                                                                        disabled={isRequestingShipping}
                                                                        className="px-4 py-2 rounded-lg text-xs font-bold bg-teal-600/90 hover:bg-teal-500 text-white border border-teal-500/30 disabled:opacity-50"
                                                                    >
                                                                        {isAr ? 'تسليم للإدارة' : 'Handover to admin'}
                                                                    </button>
                                                                )}
                                                            </div>
                                                        )}

                                                        {/* 2026 Governance: Edit/Withdraw Logic */}
                                                        {(order.status === 'AWAITING_OFFERS' || order.status === 'COLLECTING_OFFERS') && (
                                                            <div className="mt-3 space-y-2">
                                                                {/* Edit Timer (15 min window) */}
                                                                {partOffer.canEditUntil && new Date(partOffer.canEditUntil) > new Date() && (
                                                                    <div className="flex items-center justify-between bg-gold-500/10 px-3 py-2 rounded-xl border border-gold-500/20">
                                                                        <span className="text-[10px] font-bold text-gold-400 uppercase tracking-widest flex items-center gap-1">
                                                                            <Clock size={12} />
                                                                            {exploreOfferT?.freeEditWindow || (isAr ? 'مهلة التعديل المجاني' : 'Free Edit Window')}
                                                                        </span>
                                                                        <CountdownTimer 
                                                                            targetDate={partOffer.canEditUntil} 
                                                                            compact={true} 
                                                                            hideExpiredText={true}
                                                                        />
                                                                    </div>
                                                                )}

                                                                {(() => {
                                                                    const gov = getOfferGovernanceWindow(order, partOffer);
                                                                    return (
                                                                        <>
                                                                            {gov.isVoluntaryWithdrawWindow && (
                                                                                <div className="flex items-center justify-between bg-amber-500/10 px-3 py-2 rounded-xl border border-amber-500/20 mb-2">
                                                                                    <span className="text-[10px] font-bold text-amber-400 uppercase tracking-widest flex items-center gap-1">
                                                                                        <Clock size={12} />
                                                                                        {exploreOfferT?.voluntaryWithdrawCountdown || (isAr ? 'المتبقي للانسحاب من الطلب' : 'Time left to withdraw')}
                                                                                    </span>
                                                                                    <CountdownTimer
                                                                                        targetDate={gov.voluntaryEndDate}
                                                                                        compact={true}
                                                                                        hideExpiredText={true}
                                                                                    />
                                                                                </div>
                                                                            )}
                                                                            {gov.isFreeCancelWindow && (
                                                                                <button
                                                                                    type="button"
                                                                                    onClick={(e) => {
                                                                                        e.stopPropagation();
                                                                                        setOfferToCancel(partOffer);
                                                                                        setIsCancelDialogOpen(true);
                                                                                    }}
                                                                                    className="w-full py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-sm bg-white/5 hover:bg-white/10 text-white/70 border border-white/10"
                                                                                >
                                                                                    <Edit3 size={14} />
                                                                                    {isAr ? 'إلغاء وتعديل العرض' : 'Cancel & Edit'}
                                                                                </button>
                                                                            )}
                                                                            {gov.isVoluntaryWithdrawWindow && (
                                                                                <button
                                                                                    type="button"
                                                                                    onClick={(e) => {
                                                                                        e.stopPropagation();
                                                                                        setOfferToVoluntaryWithdraw(partOffer);
                                                                                        setIsVoluntaryWithdrawDialogOpen(true);
                                                                                    }}
                                                                                    className="w-full py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-sm bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/20"
                                                                                >
                                                                                    <AlertTriangle size={14} />
                                                                                    {exploreOfferT?.voluntaryWithdrawBtn || (isAr ? 'إلغاء والانسحاب من الطلب' : 'Cancel & Withdraw from Request')}
                                                                                </button>
                                                                            )}
                                                                        </>
                                                                    );
                                                                })()}
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </GlassCard>
                                );
                            })
                        ) : (
                            <GlassCard className="p-6">
                                <div className="flex flex-col md:flex-row gap-6">
                                    {/* Media Preview Area for Single Part (Legacy/Fallback) */}
                                    <div className="w-full md:w-48 shrink-0">
                                        {toDisplayImageUrls(order.partImages).length > 0 ? (
                                            <div
                                                onClick={() => handleOpenLightbox(toDisplayImageUrls(order.partImages), 0)}
                                                className="aspect-square rounded-xl overflow-hidden bg-black/50 border border-white/10 relative group cursor-pointer"
                                            >
                                                <img src={toDisplayImageUrls(order.partImages)[0]} alt={order.part || 'Part image'} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                                {toDisplayImageUrls(order.partImages).length > 1 && (
                                                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <span className="text-white font-medium bg-black/50 px-3 py-1 rounded-full text-sm backdrop-blur-md">
                                                            +{toDisplayImageUrls(order.partImages).length - 1} {isAr ? 'صور أخرى' : 'more'}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            <div className="aspect-square rounded-xl bg-white/5 border border-white/10 flex flex-col items-center justify-center text-white/20">
                                                <Box size={32} className="mb-2" />
                                                <span className="text-xs">{isAr ? 'لا توجد صور' : 'No images'}</span>
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex-1">
                                        <h3 className="text-lg font-bold text-white mb-2">{order.part}</h3>
                                        <p className="text-white/60 text-sm mb-4 leading-relaxed">{order.partDescription || (isAr ? 'لا توجد تفاصيل إضافية للقطعة المحددة.' : 'No additional details provided.')}</p>
                                    </div>
                                </div>
                            </GlassCard>
                        )}
                    </div>
                    </div> {/* End overview tab */}

                </div>

                {/* RIGHT COLUMN: Sidebar (Bidding Action & Intelligence) */}
                <div className="space-y-6 lg:sticky lg:top-24 self-start">

                    {/* Market Intelligence Widget */}
                    <GlassCard className="p-6 border-gold-500/30 bg-gold-500/5 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-gold-500/10 blur-[50px] rounded-full pointer-events-none" />

                        <h3 className="text-gold-400 font-bold mb-4 flex items-center gap-2">
                            <Monitor size={18} />
                            {isAr ? 'معلومات السوق' : 'Market Intelligence'}
                        </h3>

                        <div className="space-y-4 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
                            {(order.parts && order.parts.length > 0) ? (
                                order.parts.map((p: any, i: number) => {
                                    const count = offersPerPart.get(p.id) || 0;
                                    const comp = getCompetitionLevel(count);
                                    return (
                                        <div key={p.id} className={`pb-3 space-y-2 ${i < order.parts.length - 1 ? 'border-b border-white/5' : ''}`}>
                                            <div className="flex items-center justify-between gap-3">
                                                <span className="text-white font-medium text-sm truncate flex-1">{p.name}</span>
                                                <div className="flex items-center gap-2" dir="ltr">
                                                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded whitespace-nowrap border border-current ${comp.color.split(' ').filter(c => !c.startsWith('border-')).join(' ')}`}>
                                                        {comp.label}
                                                    </span>
                                                    <div className="flex items-center text-white font-bold text-sm">
                                                        <span>{count}</span>
                                                        <span className="text-[10px] text-white/40 mx-1">/</span>
                                                        <span className="text-[10px] text-white/40">10</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                                                <motion.div 
                                                    initial={{ width: 0 }}
                                                    animate={{ width: `${Math.max((count / 10) * 100, 2)}%` }} // Show at least a sliver if 0
                                                    className={`h-full ${count >= 10 ? 'bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.4)]' : count >= 8 ? 'bg-red-500' : count >= 5 ? 'bg-yellow-500' : 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.3)]'}`}
                                                />
                                            </div>
                                        </div>
                                    );
                                })
                            ) : (
                                <div className="flex items-center justify-between pb-4 border-b border-white/5">
                                    <span className="text-white/60 text-sm">{isAr ? 'عروض القطعة' : 'Part Bids'}</span>
                                    <div className="flex items-center gap-3" dir="ltr">
                                        {(() => {
                                            const count = order._count?.offers || order.offersCount || 0;
                                            const comp = getCompetitionLevel(count);
                                            return (
                                                <>
                                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded whitespace-nowrap border border-current ${comp.color.split(' ').filter(c => !c.startsWith('border-')).join(' ')}`}>
                                                        {comp.label}
                                                    </span>
                                                    <div className="flex items-center text-white font-bold text-lg">
                                                        <span>{count}</span>
                                                        <span className="text-sm text-white/40 mx-1">/</span>
                                                        <span className="text-sm text-white/40">10</span>
                                                    </div>
                                                </>
                                            );
                                        })()}
                                    </div>
                                </div>
                            )}

                            {/* Merchant's Own Offer Status */}
                            <div className="pt-2 flex items-center justify-between">
                                <span className="text-white/40 text-[11px] uppercase tracking-wider">{isAr ? 'حالة عروضك' : 'Your Status'}</span>
                                {hasSubmittedAny ? (
                                    <span className="text-green-400 text-[11px] font-bold bg-green-500/10 border border-green-500/20 px-2 py-1 rounded-lg flex items-center gap-1.5">
                                        <CheckCircle2 size={12} />
                                        <div className="flex items-center" dir="ltr">
                                            <span>{myOffers.length}</span>
                                            <span className="opacity-40 mx-0.5">/</span>
                                            <span>{order.parts?.length || 1}</span>
                                        </div>
                                        <span className="ml-0.5">{isAr ? 'قطع' : 'parts'}</span>
                                    </span>
                                ) : (
                                    <span className="text-white/30 text-sm bg-white/5 px-2 py-1 rounded">{isAr ? 'لم يتم التقديم' : 'Not Submitted'}</span>
                                )}
                            </div>
                        </div>
                    </GlassCard>

                    {/* Dynamic Context Card (Bidding vs Action) */}
                    <GlassCard className="p-6 relative z-20 space-y-6">
                        {merchantAcceptedOffers.length > 1 && (
                            <div className="rounded-xl border border-indigo-500/25 bg-indigo-500/10 p-4 text-sm text-indigo-200/90 leading-relaxed">
                                {isAr
                                    ? 'طلب متعدد القطع: جهّز كل قطعة على حدة، ثم وثّق كل قطعة بشكل منفصل. لا يمكن الانتقال للتوثيق لقطعة حتى تُعلّم «تم التجهيز» لتلك القطعة فقط.'
                                    : 'Multi-part order: prepare and verify each part separately. A part can only be verified after you mark that specific part as prepared.'}
                            </div>
                        )}

                        {merchantAcceptedOffers.length > 0 &&
                            !['AWAITING_OFFERS', 'COLLECTING_OFFERS', 'AWAITING_SELECTION', 'AWAITING_PAYMENT', 'CANCELLED'].includes(
                                order.status,
                            ) && (
                                <div className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-3">
                                    <div>
                                        <div className="flex justify-between text-xs font-bold uppercase tracking-wider text-white/40 mb-2">
                                            <span>{isAr ? 'التجهيز' : 'Preparation'}</span>
                                            <span className="text-gold-400">
                                                {merchantPartsPreparedCount}/{merchantAcceptedOffers.length}{' '}
                                                {isAr ? 'جهّزت' : 'prepared'}
                                            </span>
                                        </div>
                                        <div className="h-2 bg-white/5 rounded-full overflow-hidden" dir="ltr">
                                            <motion.div
                                                className="h-full bg-gradient-to-r from-blue-600 to-blue-400"
                                                initial={false}
                                                animate={{ width: `${merchantPrepProgressPct}%` }}
                                                transition={{ duration: 0.4, ease: 'easeOut' }}
                                            />
                                        </div>
                                    </div>
                                    {merchantPartsPreparedCount > 0 && (
                                        <div>
                                            <div className="flex justify-between text-xs font-bold uppercase tracking-wider text-white/40 mb-2">
                                                <span>{isAr ? 'التوثيق' : 'Verification'}</span>
                                                <span className="text-amber-400">
                                                    {merchantPartsUnderReviewCount > 0 && (
                                                        <span>
                                                            {merchantPartsUnderReviewCount}/{merchantAcceptedOffers.length}{' '}
                                                            {isAr ? 'قيد المراجعة' : 'in review'}
                                                        </span>
                                                    )}
                                                    {merchantPartsUnderReviewCount > 0 &&
                                                        merchantPartsVerifiedCount > 0 && (
                                                            <span className="text-white/30 mx-1">·</span>
                                                        )}
                                                    {merchantPartsVerifiedCount > 0 && (
                                                        <span className="text-green-400">
                                                            {merchantPartsVerifiedCount}/{merchantAcceptedOffers.length}{' '}
                                                            {isAr ? 'موثّق' : 'verified'}
                                                        </span>
                                                    )}
                                                    {merchantPartsUnderReviewCount === 0 &&
                                                        merchantPartsVerifiedCount === 0 && (
                                                            <span className="text-white/40">
                                                                0/{merchantAcceptedOffers.length}
                                                            </span>
                                                        )}
                                                </span>
                                            </div>
                                            <div className="h-2 bg-white/5 rounded-full overflow-hidden" dir="ltr">
                                                <motion.div
                                                    className="h-full bg-gradient-to-r from-amber-500 to-green-500"
                                                    initial={false}
                                                    animate={{ width: `${merchantVerificationProgressPct}%` }}
                                                    transition={{ duration: 0.4, ease: 'easeOut' }}
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                        {offersNeedingPrepare.length > 0 && (
                            <div className="text-center space-y-4">
                                <div
                                    className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto border ${order.status === 'DELAYED_PREPARATION' ? 'bg-red-500/10 border-red-500/30' : 'bg-blue-500/10 border-blue-500/20'}`}
                                >
                                    <Package
                                        size={28}
                                        className={order.status === 'DELAYED_PREPARATION' ? 'text-red-500 animate-pulse' : 'text-blue-400'}
                                    />
                                </div>
                                <h3
                                    className={`text-xl font-bold ${order.status === 'DELAYED_PREPARATION' ? 'text-red-400' : 'text-white'}`}
                                >
                                    {isAr ? 'تجهيز القطع' : 'Part preparation'}
                                </h3>
                                <p className="text-white/60 text-sm px-2 leading-relaxed">
                                    {merchantAcceptedOffers.length > 1
                                        ? isAr
                                            ? 'اختر القطعة التي أنهيت تجهيزها وتغليفها. يمكنك تأكيد التجهيز قطعة بقطعة دون انتظار باقي القطع.'
                                            : 'Select each part you have packed. Confirm preparation one part at a time.'
                                        : isAr
                                          ? 'بعد تغليف القطعة بشكل محكم، أكّد أنها جاهزة للتوثيق.'
                                          : 'Once securely packed, confirm it is ready for verification.'}
                                </p>
                                <div className="space-y-2">
                                    {offersNeedingPrepare.map((offer) => (
                                        <button
                                            key={offer.id}
                                            type="button"
                                            onClick={() => {
                                                setPrepareOfferId(offer.id);
                                                setIsPrepareDialogOpen(true);
                                            }}
                                            className={`w-full py-3 px-4 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 border ${
                                                order.status === 'DELAYED_PREPARATION'
                                                    ? 'bg-red-600/90 hover:bg-red-500 text-white border-red-500/30'
                                                    : 'bg-blue-500/90 hover:bg-blue-400 text-white border-blue-500/30'
                                            }`}
                                        >
                                            <CheckCircle2 size={18} />
                                            <span className="truncate">
                                                {isAr ? 'تجهيز:' : 'Prepare:'} {getMerchantOfferPartName(offer)}
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {offersUnderVerificationReview.length > 0 && (
                            <div className="space-y-2 border-t border-white/10 pt-6">
                                <p className="text-center text-white/50 text-xs uppercase tracking-wider font-bold">
                                    {isAr ? 'بانتظار مراجعة الإدارة' : 'Awaiting admin review'}
                                </p>
                                {offersUnderVerificationReview.map((offer) => (
                                    <div
                                        key={offer.id}
                                        className="w-full py-3 px-4 rounded-xl text-sm bg-amber-500/10 border border-amber-500/25 flex items-center gap-2 text-amber-200"
                                    >
                                        <Clock size={18} className="text-amber-400 shrink-0" />
                                        <span className="truncate flex-1">
                                            {getMerchantOfferPartName(offer)}
                                        </span>
                                        <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400/90 shrink-0">
                                            {isAr ? 'قيد المراجعة' : 'In review'}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}

                        {offersVerificationApproved.length > 0 && (
                            <div className="space-y-2 border-t border-white/10 pt-6">
                                <p className="text-center text-white/50 text-xs uppercase tracking-wider font-bold">
                                    {isAr ? 'تم اعتماد التوثيق' : 'Verification approved'}
                                </p>
                                {offersVerificationApproved.map((offer) => (
                                    <div
                                        key={offer.id}
                                        className="w-full py-3 px-4 rounded-xl text-sm bg-green-500/10 border border-green-500/25 flex items-center gap-2 text-green-200"
                                    >
                                        <CheckCircle2 size={18} className="text-green-400 shrink-0" />
                                        <span className="truncate flex-1">
                                            {getMerchantOfferPartName(offer)}
                                        </span>
                                        <span className="text-[10px] font-bold uppercase tracking-wider text-green-400/90 shrink-0">
                                            {isAr ? 'معتمد' : 'Approved'}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}

                        {offersRejectedVerification.length > 0 && (
                            <div className="space-y-3 border-t border-white/10 pt-6">
                                <p className="text-center text-white/50 text-xs uppercase tracking-wider font-bold">
                                    {isAr ? 'رفض التوثيق — مطلوب تصحيح' : 'Verification rejected — correction required'}
                                </p>
                                {offersRejectedVerification.map((offer) => {
                                    const doc = getVerificationDocForOffer(
                                        order?.verificationDocuments,
                                        offer.id,
                                    );
                                    return (
                                        <div
                                            key={offer.id}
                                            className="rounded-xl text-sm bg-red-500/10 border border-red-500/25 overflow-hidden"
                                        >
                                            <div className="py-3 px-4 flex items-center gap-2 text-red-200">
                                                <XCircle size={18} className="text-red-400 shrink-0" />
                                                <span className="truncate flex-1 font-bold">
                                                    {getMerchantOfferPartName(offer)}
                                                </span>
                                                <span className="text-[10px] font-bold uppercase tracking-wider text-red-400/90 shrink-0">
                                                    {isAr ? 'مرفوض' : 'Rejected'}
                                                </span>
                                            </div>
                                            {doc?.adminRejectionReason && (
                                                <div className="px-4 pb-3 border-t border-red-500/15 pt-3">
                                                    <p className="text-xs text-red-300/90 font-bold mb-1">
                                                        {isAr ? 'سبب الرفض:' : 'Rejection reason:'}
                                                    </p>
                                                    <p className="text-white/80 text-sm whitespace-pre-wrap">
                                                        {doc.adminRejectionReason}
                                                    </p>
                                                </div>
                                            )}
                                            <div className="px-4 pb-4">
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setVerificationOfferId(offer.id);
                                                        setShowVerificationForm(true);
                                                    }}
                                                    className="w-full py-2.5 rounded-lg font-bold text-xs bg-red-600/90 hover:bg-red-500 text-white flex items-center justify-center gap-2"
                                                >
                                                    <AlertTriangle size={14} />
                                                    {isAr ? 'إعادة توثيق هذه القطعة' : 'Re-verify this part'}
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        {offersNeedingVerification.length > 0 && (
                            <div className="space-y-3 border-t border-white/10 pt-6">
                                <p className="text-center text-white/50 text-xs uppercase tracking-wider font-bold">
                                    {isAr ? 'التوثيق — لكل قطعة على حدة' : 'Verification — per part'}
                                </p>
                                {offersNeedingVerification.length === 1 ? (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setVerificationOfferId(offersNeedingVerification[0]?.id || null);
                                            setShowVerificationForm(true);
                                        }}
                                        className="w-full py-4 rounded-xl font-bold bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-black transition-all shadow-[0_0_25px_rgba(245,158,11,0.35)] flex items-center justify-center gap-2"
                                    >
                                        <ShieldCheck size={20} />
                                        <span>{isAr ? 'توثيق القطعة' : 'Verify part'}</span>
                                    </button>
                                ) : (
                                    offersNeedingVerification.map((offer) => (
                                        <button
                                            key={offer.id}
                                            type="button"
                                            onClick={() => {
                                                setVerificationOfferId(offer.id);
                                                setShowVerificationForm(true);
                                            }}
                                            className="w-full py-3 px-4 rounded-xl font-bold text-sm bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 flex items-center justify-center gap-2"
                                        >
                                            <ShieldCheck size={18} />
                                            <span className="truncate">
                                                {isAr ? 'توثيق:' : 'Verify:'} {getMerchantOfferPartName(offer)}
                                            </span>
                                        </button>
                                    ))
                                )}
                            </div>
                        )}

                        {offersReadyForHandover.length > 0 && (
                            <div className="space-y-3 border-t border-white/10 pt-6">
                                <p className="text-center text-white/50 text-xs uppercase tracking-wider font-bold">
                                    {isAr ? 'تسليم للإدارة — لكل قطعة' : 'Handover to admin — per part'}
                                </p>
                                {offersReadyForHandover.map((offer) => (
                                    <button
                                        key={offer.id}
                                        type="button"
                                        onClick={() => handleRequestShipping(offer.id)}
                                        disabled={isRequestingShipping}
                                        className="w-full py-3 px-4 rounded-xl font-bold text-sm bg-blue-600/90 hover:bg-blue-500 text-white border border-blue-500/30 flex items-center justify-center gap-2 disabled:opacity-50"
                                    >
                                        {isRequestingShipping ? (
                                            <Loader2 size={18} className="animate-spin" />
                                        ) : (
                                            <Truck size={18} />
                                        )}
                                        <span className="truncate">
                                            {isAr ? 'تسليم:' : 'Handover:'} {getMerchantOfferPartName(offer)}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        )}

                        {offersNeedingPrepare.length === 0 && offersNeedingVerification.length === 0 && (
                            <>
                                {(() => {
                                    const display = (() => {
                                        const s = (t.dashboard as any)?.merchant?.marketplace?.statusBox;
                                        if (!s) return null;

                                        switch (order.status) {
                                            case 'AWAITING_PAYMENT':
                                                return {
                                                    icon: <DollarSign size={28} className="text-orange-500" />,
                                                    title: isAr ? s.AWAITING_PAYMENT.title : s.AWAITING_PAYMENT.enTitle,
                                                    desc: isAr ? s.AWAITING_PAYMENT.desc : s.AWAITING_PAYMENT.enDesc,
                                                    bgColor: 'bg-orange-500/10',
                                                    borderColor: 'border-orange-500/20'
                                                };
                                            case 'PREPARATION':
                                            case 'DELAYED_PREPARATION':
                                                return {
                                                    icon: <Package size={28} className="text-blue-400" />,
                                                    title: isAr ? s.PREPARATION.title : s.PREPARATION.enTitle,
                                                    desc: isAr ? s.PREPARATION.desc : s.PREPARATION.enDesc,
                                                    bgColor: 'bg-blue-500/10',
                                                    borderColor: 'border-blue-500/20'
                                                };
                                            case 'PREPARED':
                                                return {
                                                    icon: <ShieldCheck size={28} className="text-amber-500" />,
                                                    title: isAr ? s.PREPARED.title : s.PREPARED.enTitle,
                                                    desc: isAr ? s.PREPARED.desc : s.PREPARED.enDesc,
                                                    bgColor: 'bg-amber-500/10',
                                                    borderColor: 'border-amber-500/20'
                                                };
                                            case 'VERIFICATION':
                                            case 'CORRECTION_SUBMITTED':
                                                return {
                                                    icon: <Clock size={28} className="text-amber-500" />,
                                                    title: isAr ? s.VERIFICATION.title : s.VERIFICATION.enTitle,
                                                    desc: isAr ? s.VERIFICATION.desc : s.VERIFICATION.enDesc,
                                                    bgColor: 'bg-amber-500/10',
                                                    borderColor: 'border-amber-500/20'
                                                };
                                            case 'VERIFICATION_SUCCESS':
                                                return {
                                                    icon: <CheckCircle2 size={28} className="text-green-400" />,
                                                    title: isAr ? s.VERIFICATION_SUCCESS.title : s.VERIFICATION_SUCCESS.enTitle,
                                                    desc: isAr ? s.VERIFICATION_SUCCESS.desc : s.VERIFICATION_SUCCESS.enDesc,
                                                    bgColor: 'bg-green-500/10',
                                                    borderColor: 'border-green-500/20'
                                                };
                                            case 'READY_FOR_SHIPPING': {
                                                const dynamic = handoverCopy;
                                                return {
                                                    icon: <Truck size={28} className="text-blue-400" />,
                                                    title: dynamic.title,
                                                    desc: dynamic.desc,
                                                    bgColor: 'bg-blue-500/10',
                                                    borderColor: 'border-blue-500/20',
                                                };
                                            }
                                            case 'NON_MATCHING':
                                            case 'CORRECTION_PERIOD':
                                                return {
                                                    icon: <AlertTriangle size={28} className="text-red-400" />,
                                                    title: isAr ? s.NON_MATCHING.title : s.NON_MATCHING.enTitle,
                                                    desc: isAr ? s.NON_MATCHING.desc : s.NON_MATCHING.enDesc,
                                                    bgColor: 'bg-red-500/10',
                                                    borderColor: 'border-red-500/20'
                                                };
                                            case 'SHIPPED':
                                                return {
                                                    icon: <Truck size={28} className="text-cyan-400" />,
                                                    title: isAr ? s.SHIPPED.title : s.SHIPPED.enTitle,
                                                    desc: isAr ? s.SHIPPED.desc : s.SHIPPED.enDesc,
                                                    bgColor: 'bg-cyan-500/10',
                                                    borderColor: 'border-cyan-500/20'
                                                };
                                            case 'DELIVERED':
                                            case 'COMPLETED':
                                                return {
                                                    icon: <Package size={28} className="text-green-400" />,
                                                    title: isAr ? s.DELIVERED.title : s.DELIVERED.enTitle,
                                                    desc: isAr ? s.DELIVERED.desc : s.DELIVERED.enDesc,
                                                    bgColor: 'bg-green-500/10',
                                                    borderColor: 'border-green-500/20'
                                                };
                                            default:
                                                if (hasSubmittedAny) {
                                                    return {
                                                        icon: <CheckCircle2 size={28} className="text-green-400" />,
                                                        title: isAr ? s.AWAITING_OFFERS.title : s.AWAITING_OFFERS.enTitle,
                                                        desc: isAr ? s.AWAITING_OFFERS.desc : s.AWAITING_OFFERS.enDesc,
                                                        bgColor: 'bg-green-500/10',
                                                        borderColor: 'border-green-500/20'
                                                    };
                                                }
                                                return {
                                                    icon: <FileText size={28} className="text-gold-500" />,
                                                    title: isAr ? 'هل لديك القطع المطلوبة؟' : 'Have the parts?',
                                                    desc: isAr ? 'أرسل تسعيرتك الآن، المشتري ينتظر!' : 'Submit your pricing now, the buyer is waiting!',
                                                    bgColor: 'bg-gold-500/10',
                                                    borderColor: 'border-gold-500/20'
                                                };
                                        }
                                    })();

                                    if (!display) return null;

                                    return (
                                        <motion.div 
                                            key={order.status}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            className="text-center mb-6"
                                        >
                                            <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 border transition-colors duration-500 ${display.bgColor} ${display.borderColor}`}>
                                                {display.icon}
                                            </div>
                                            <h3 className="text-xl font-bold text-white mb-2">
                                                {display.title}
                                            </h3>
                                            <p className="text-white/50 text-sm px-4">
                                                {display.desc}
                                            </p>
                                        </motion.div>
                                    );
                                })()}

                                {(() => {
                                    const progressiveStates = ['AWAITING_PAYMENT', 'PREPARATION', 'DELAYED_PREPARATION', 'PREPARED', 'VERIFICATION', 'VERIFICATION_SUCCESS', 'READY_FOR_SHIPPING', 'PARTIALLY_SHIPPED', 'PARTIALLY_DELIVERED', 'NON_MATCHING', 'CORRECTION_PERIOD', 'CORRECTION_SUBMITTED', 'SHIPPED', 'DELIVERED', 'COMPLETED', 'RETURN_REQUESTED', 'RETURN_APPROVED', 'RETURNED'];
                                    const isProgressive = progressiveStates.includes(order.status);

                                    if (order.status === 'VERIFICATION' || order.status === 'CORRECTION_SUBMITTED') {
                                        return (
                                            <button disabled className="w-full py-4 rounded-xl font-bold text-amber-500/80 bg-amber-500/10 cursor-not-allowed border border-amber-500/20">
                                                {isAr ? 'في انتظار مراجعة الإدارة' : 'Pending Admin Review'}
                                            </button>
                                        );
                                    }

                                    if (order.status === 'READY_FOR_SHIPPING') {
                                        return (
                                            <button 
                                                disabled
                                                className="w-full py-4 rounded-xl font-bold text-blue-400 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 transition-all flex flex-col items-center justify-center gap-1 group shadow-[0_0_20px_rgba(59,130,246,0.1)]"
                                            >
                                                <div className="flex items-center gap-2">
                                                    <Truck className="w-5 h-5 inline group-hover:translate-x-1 transition-transform" />
                                                    <span>{handoverCopy.actionLabel}</span>
                                                </div>
                                            </button>
                                        );
                                    }

                                    if (order.status === 'NON_MATCHING' || order.status === 'CORRECTION_PERIOD') {
                                        const doc = order.verificationDocuments?.[0];
                                        return (
                                            <div className="space-y-4">
                                                {doc?.adminRejectionReason && (
                                                    <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 space-y-3">
                                                        <h4 className="text-sm font-bold text-red-400 flex items-center gap-2">
                                                            <XCircle size={16} /> 
                                                            {isAr ? 'سبب الرفض المسجّل من الإدارة' : 'Admin Rejection Reason'}
                                                        </h4>
                                                        <p className="text-white/80 text-sm whitespace-pre-wrap">{doc.adminRejectionReason}</p>
                                                        
                                                        {doc.adminRejectionImages?.length > 0 && (
                                                            <div className="grid grid-cols-3 gap-2 mt-3">
                                                                {doc.adminRejectionImages.map((img: string, i: number) => (
                                                                    <a key={i} href={img} target="_blank" rel="noopener noreferrer"
                                                                       className="aspect-square rounded-xl overflow-hidden border border-red-500/20 block hover:border-red-400 transition-colors">
                                                                        <img src={img} alt="Rejection reason" className="w-full h-full object-cover" />
                                                                    </a>
                                                                ))}
                                                            </div>
                                                        )}
                                                        
                                                        {doc.adminRejectionVideo && (
                                                            <div className="mt-3 aspect-video rounded-xl overflow-hidden border border-red-500/20">
                                                                <video src={doc.adminRejectionVideo} controls className="w-full h-full bg-black/50" />
                                                            </div>
                                                        )}
                                                    </div>
                                                )}

                                                <button
                                                    onClick={() => setShowVerificationForm(true)}
                                                    className="w-full py-4 rounded-xl font-bold bg-red-600 hover:bg-red-500 text-white transition-all shadow-[0_0_20px_rgba(239,68,68,0.3)] animate-pulse flex items-center justify-center gap-2"
                                                >
                                                    <AlertTriangle size={18} />
                                                    {isAr ? 'غير مطابق - اضغط لإعادة التوثيق' : 'Non-Matching - Click to Re-verify'}
                                                </button>
                                            </div>
                                        );
                                    }

                                    if (isBlockedFromOrder) {
                                        return (
                                            <button
                                                disabled
                                                className="w-full py-4 rounded-xl font-bold text-amber-400/70 bg-amber-500/5 cursor-not-allowed border border-amber-500/20 flex flex-col items-center justify-center gap-1 leading-tight px-4"
                                            >
                                                <span>
                                                    {exploreOfferT?.blockedFromOrder ||
                                                        (isAr ? 'لا يمكنك التقديم على هذا الطلب' : 'Cannot bid on this request')}
                                                </span>
                                            </button>
                                        );
                                    }

                                    if (isProgressive || (order.status !== 'AWAITING_OFFERS' && order.status !== 'COLLECTING_OFFERS' && order.status !== 'CANCELLED')) {
                                        return (
                                            <button
                                                disabled
                                                className="w-full py-4 rounded-xl font-bold text-white/50 bg-white/5 cursor-not-allowed border border-white/10"
                                            >
                                                {isAr ? 'تم إغلاق باب التقديم' : 'Bidding Closed'}
                                            </button>
                                        );
                                    }

                                    if ((expired && order.status !== 'COLLECTING_OFFERS') || order.status === 'CANCELLED') {
                                        return (
                                            <button
                                                disabled
                                                className="w-full py-4 rounded-xl font-bold text-red-400/50 bg-red-500/5 cursor-not-allowed border border-red-500/10"
                                            >
                                                {isAr ? 'انتهت فترة تقديم العروض' : 'Offer Period Ended'}
                                            </button>
                                        );
                                    }

                                    // check if ALL parts have reached the 10-offer limit
                                    const allPartsFull = order.parts && order.parts.length > 0 && order.parts.every((p: any) => (offersPerPart.get(p.id) || 0) >= 10);
                                    const globalFull = (order._count?.offers || order.offersCount || 0) >= 10;

                                    if (allPartsFull || (!order.parts && globalFull)) {
                                        return (
                                            <button
                                                disabled
                                                className="w-full py-4 rounded-xl font-bold text-red-400/50 bg-red-500/5 cursor-not-allowed border border-red-500/10 flex flex-col items-center justify-center gap-1 leading-tight"
                                            >
                                                <span>{isAr ? 'تم الوصول للحد الأقصى للعروض' : 'Maximum Offers Reached'}</span>
                                            </button>
                                        );
                                    }

                                    const hasSubmittedAll = order.parts ? myOffers.length >= order.parts.length : myOffers.length > 0;

                                    if (hasSubmittedAll) {
                                        return (
                                            <button
                                                disabled
                                                className="w-full py-4 rounded-xl font-bold transition-all flex flex-col items-center justify-center gap-1 leading-tight text-white/50 bg-white/5 cursor-not-allowed border border-white/10"
                                            >
                                                <span>{isAr ? 'تم تقديم عروضك المتوفرة' : 'All Offers Submitted'}</span>
                                                <span className="text-xs font-normal opacity-70 flex items-center gap-1"><ShieldCheck size={12}/> {isAr ? 'الأسعار مقفلة، قم بالإلغاء للتعديل' : 'Prices locked, cancel to edit'}</span>
                                            </button>
                                        );
                                    }

                                    return (
                                        <button
                                            onClick={() => setIsBidding(true)}
                                            className={`w-full py-4 rounded-xl font-bold transition-all flex items-center justify-center gap-2 group ${hasSubmittedAny
                                                ? 'bg-white/5 hover:bg-white/10 text-gold-400 border border-gold-500/20 hover:border-gold-500/40'
                                                : 'bg-gold-500 hover:bg-gold-400 text-black shadow-[0_0_20px_rgba(234,179,8,0.3)] hover:shadow-[0_0_30px_rgba(234,179,8,0.5)]'
                                                }`}
                                        >
                                            <span>{hasSubmittedAny ? (isAr ? 'إضافة عرض لقطعة أخرى' : 'Add offer for another part') : (isAr ? 'تقديم عرض الآن' : 'Submit Offer')}</span>
                                            {!hasSubmittedAny && <ArrowIcon size={18} className={`transition-transform ${isAr ? 'group-hover:-translate-x-1' : 'group-hover:translate-x-1'}`} />}
                                        </button>
                                    );
                                })()}
                            </>
                        )}
                    </GlassCard>

                    {/* 2026 Merchant Governance & SLA Card */}
                    <GlassCard className="bg-[#1A1814] border-gold-500/10 p-6 overflow-hidden relative group z-10">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-gold-500/5 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-gold-500/10 transition-colors" />
                        
                        <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-6 uppercase tracking-wider">
                            <Scale size={18} className="text-gold-400" />
                            {isAr ? 'حوكمة العروض 2026' : 'Offer Governance 2026'}
                        </h3>

                        <div className="space-y-4 relative z-10">
                            {/* 15m Rule */}
                            <div className="flex gap-3">
                                <div className="w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center text-green-400 shrink-0">
                                    <Clock size={16} />
                                </div>
                                <div>
                                    <div className="text-xs font-bold text-white mb-0.5">{isAr ? 'نافذة التعديل والتحكم' : 'Edit & Control Window'}</div>
                                    <div className="text-[10px] text-white/40 leading-relaxed">
                                        {exploreOfferT?.governance?.editWindow ||
                                            (isAr
                                                ? 'لديك 15 دقيقة لتعديل أو حذف عرضك بعد الإرسال مباشرة.'
                                                : 'You have 15 minutes to edit or delete your offer immediately after submission.')}
                                    </div>
                                </div>
                            </div>

                            {/* Withdrawal Rule */}
                            <div className="flex gap-3">
                                <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center text-red-400 shrink-0">
                                    <AlertTriangle size={16} />
                                </div>
                                <div>
                                    <div className="text-xs font-bold text-white mb-0.5">{isAr ? 'الانسحاب الطوعي من الطلب' : 'Voluntary Request Withdrawal'}</div>
                                    <div className="text-[10px] text-white/40 leading-relaxed">
                                        {exploreOfferT?.governance?.voluntaryWindow ||
                                            (isAr
                                                ? 'بعد 15 دقيقة يمكنك الانسحاب الطوعي حتى ساعة قبل اختيار العميل. الانسحاب يمنعك من التقديم على هذا الطلب فقط.'
                                                : 'After 15 minutes you may withdraw until 1 hour before customer selection. Blocks you from this request only.')}
                                    </div>
                                </div>
                            </div>

                            {/* 23:45 Cutoff */}
                            <div className="flex gap-3">
                                <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-400 shrink-0">
                                    <ShieldCheck size={16} />
                                </div>
                                <div>
                                    <div className="text-xs font-bold text-white mb-0.5">{isAr ? 'موعد الإغلاق (23:45)' : 'Cutoff Time (23:45)'}</div>
                                    <div className="text-[10px] text-white/40 leading-relaxed">
                                        {exploreOfferT?.governance?.cutoff ||
                                            (isAr
                                                ? 'يتوقف النظام عن استقبال العروض قبل 15 دقيقة من نهاية الـ 24 ساعة.'
                                                : 'Submission stops 15 minutes before the 24h collection ends.')}
                                    </div>
                                </div>
                            </div>

                            {/* 5% Violation Rule */}
                            <div className="mt-4 pt-4 border-t border-white/5">
                                <div className="flex items-center justify-between text-[10px] mb-2">
                                    <span className="text-white/40 uppercase font-bold">{isAr ? 'معدل التعديل الحالي' : 'Current Mod Rate'}</span>
                                    <span
                                        className={`font-bold ${modificationMetrics.exceedsThreshold ? 'text-red-400' : 'text-gold-400'}`}
                                    >
                                        {modificationMetrics.hasSample
                                            ? `${modificationMetrics.percentLabel}%`
                                            : '0%'}
                                    </span>
                                </div>
                                <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden relative">
                                    <div className="absolute inset-y-0 left-[100%] w-px bg-red-500/40 -translate-x-px z-10" title="5%" />
                                    <motion.div
                                        key={`${modificationMetrics.modActions}-${modificationMetrics.total}`}
                                        initial={{ width: 0 }}
                                        animate={{ width: `${modificationMetrics.barPercent}%` }}
                                        transition={{ duration: 0.6, ease: 'easeOut' }}
                                        className={`h-full transition-colors ${modificationMetrics.exceedsThreshold ? 'bg-red-500' : 'bg-gold-500/40'}`}
                                    />
                                </div>
                                <p className="text-[9px] text-white/30 mt-2">
                                    {modificationMetrics.hasSample ? (
                                        isAr ? (
                                            <>
                                                {modificationMetrics.modActions} تعديل/سحب من أصل{' '}
                                                {modificationMetrics.total} عرض · الحد 5%
                                            </>
                                        ) : (
                                            <>
                                                {modificationMetrics.modActions} mods/withdrawals of{' '}
                                                {modificationMetrics.total} offers · 5% cap
                                            </>
                                        )
                                    ) : isAr ? (
                                        'يُحسب المعدل بعد تقديم أول عرض.'
                                    ) : (
                                        'Rate is calculated after your first submitted offer.'
                                    )}
                                </p>
                            </div>
                        </div>
                    </GlassCard>
                </div>
            </div>

            {/* LIGHTBOX IMPLEMENTATION */}
            <AnimatePresence>
                {isLightboxOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-sm"
                    >
                        <button
                            onClick={() => setIsLightboxOpen(false)}
                            className="absolute top-6 right-6 w-12 h-12 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white transition-colors"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
                        </button>

                        <div className="w-full max-w-5xl px-4 flex items-center justify-between gap-4">
                            <button
                                onClick={() => setLightboxIndex(Math.max(0, lightboxIndex - 1))}
                                disabled={lightboxIndex === 0}
                                className="w-12 h-12 bg-white/10 hover:bg-white/20 disabled:opacity-30 disabled:hover:bg-white/10 rounded-full flex items-center justify-center text-white transition-colors shrink-0"
                            >
                                <ChevronDown size={24} className="rotate-90" />
                            </button>

                            <div className="relative aspect-square md:aspect-video w-full max-h-[80vh] flex items-center justify-center">
                                <img
                                    src={lightboxImages[lightboxIndex]}
                                    alt="Enlarged view"
                                    className="max-w-full max-h-full object-contain rounded-lg"
                                />
                            </div>

                            <button
                                onClick={() => setLightboxIndex(Math.min(lightboxImages.length - 1, lightboxIndex + 1))}
                                disabled={lightboxIndex === lightboxImages.length - 1}
                                className="w-12 h-12 bg-white/10 hover:bg-white/20 disabled:opacity-30 disabled:hover:bg-white/10 rounded-full flex items-center justify-center text-white transition-colors shrink-0"
                            >
                                <ChevronDown size={24} className="-rotate-90" />
                            </button>
                        </div>

                        {lightboxImages.length > 1 && (
                            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 px-4 py-2 bg-black/50 rounded-full backdrop-blur-md">
                                {lightboxImages.map((_, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => setLightboxIndex(idx)}
                                        className={`w-2 h-2 rounded-full transition-all ${idx === lightboxIndex ? 'bg-gold-500 w-6' : 'bg-white/30 hover:bg-white/50'}`}
                                    />
                                ))}
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* VOLUNTARY WITHDRAW DIALOG */}
            <AnimatePresence>
                {isVoluntaryWithdrawDialogOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4"
                    >
                        <motion.div
                            initial={{ scale: 0.95, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.95, y: 20 }}
                            className="w-full max-w-md bg-[#1A1814] border border-amber-500/30 rounded-3xl p-6 shadow-2xl relative overflow-hidden"
                        >
                            <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 blur-[50px] rounded-full pointer-events-none" />
                            <div className="flex flex-col items-center text-center space-y-4 relative z-10">
                                <div className="w-16 h-16 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                                    <AlertTriangle size={32} />
                                </div>
                                <h3 className="text-xl font-bold text-white">
                                    {exploreOfferT?.voluntaryWithdrawDialog?.title ||
                                        (isAr ? 'إلغاء والانسحاب من الطلب؟' : 'Cancel & Withdraw from Request?')}
                                </h3>
                                <p className="text-sm text-white/50 leading-relaxed px-2">
                                    {exploreOfferT?.voluntaryWithdrawDialog?.body ||
                                        (isAr
                                            ? 'إذا انسحبت بإرادتك من هذا الطلب، سيُعتبر ملغياً بالنسبة لك ولن تتمكن من تقديم أي عرض آخر عليه. يمكنك التقديم على طلبات أخرى.'
                                            : 'If you voluntarily withdraw, this request is cancelled for you and you cannot submit another offer on it. You may still bid on other requests.')}
                                </p>
                            </div>
                            <div className="flex flex-col gap-3 mt-8 relative z-10">
                                <button
                                    type="button"
                                    onClick={handleVoluntaryWithdraw}
                                    disabled={isVoluntaryWithdrawing}
                                    className="w-full py-3.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold transition-all shadow-lg flex items-center justify-center gap-2"
                                >
                                    {isVoluntaryWithdrawing ? (
                                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    ) : (
                                        <AlertTriangle size={18} />
                                    )}
                                    <span>
                                        {exploreOfferT?.voluntaryWithdrawDialog?.confirm ||
                                            (isAr ? 'تأكيد الانسحاب' : 'Confirm Withdrawal')}
                                    </span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsVoluntaryWithdrawDialogOpen(false);
                                        setOfferToVoluntaryWithdraw(null);
                                    }}
                                    disabled={isVoluntaryWithdrawing}
                                    className="w-full py-3.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 hover:text-white font-bold transition-colors border border-white/5"
                                >
                                    {exploreOfferT?.voluntaryWithdrawDialog?.cancel ||
                                        (isAr ? 'تراجع (الاحتفاظ بالعرض)' : 'Keep Offer')}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* CANCEL OFFER WARNING DIALOG */}
            <AnimatePresence>
                {isCancelDialogOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4"
                    >
                        <motion.div
                            initial={{ scale: 0.95, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.95, y: 20 }}
                            className="w-full max-w-md bg-[#1A1814] border border-red-500/30 rounded-3xl p-6 shadow-2xl relative overflow-hidden"
                        >
                            <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/10 blur-[50px] rounded-full pointer-events-none" />
                            
                            <div className="flex flex-col items-center text-center space-y-4">
                                <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500 shadow-[0_0_30px_rgba(239,68,68,0.1)]">
                                    <AlertTriangle size={32} className="animate-bounce" />
                                </div>
                                <h3 className="text-xl font-bold text-white">
                                    {isAr ? 'تنبيه: إلغاء العرض ومسحه؟' : 'Warning: Cancel & Delete Offer?'}
                                </h3>
                                <p className="text-sm text-white/50 leading-relaxed px-2">
                                    {isAr 
                                        ? 'سيتم حذف هذا العرض المسعر نهائياً من العميل ولا يمكن التراجع. إذا أردت تعديل السعر أو المواصفات، يجب حذفه ثم تقديم عرض جديد تماماً.' 
                                        : 'This offer will be permanently deleted and removed from the customer list. To edit, you must cancel and issue a fresh offer.'}
                                </p>
                            </div>

                            <div className="flex flex-col gap-3 mt-8">
                                <button
                                    onClick={handleCancelOffer}
                                    disabled={isCancelling}
                                    className="w-full py-3.5 rounded-xl bg-red-500 hover:bg-red-400 text-white font-bold transition-all shadow-lg hover:shadow-red-500/20 active:scale-98 flex items-center justify-center gap-2"
                                >
                                    {isCancelling ? (
                                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    ) : (
                                        <AlertTriangle size={18} />
                                    )}
                                    <span>{isAr ? 'تأكيد الإلغاء والحذف' : 'Confirm Cancellation'}</span>
                                </button>
                                <button
                                    onClick={() => { setIsCancelDialogOpen(false); setOfferToCancel(null); }}
                                    disabled={isCancelling}
                                    className="w-full py-3.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 hover:text-white font-bold transition-colors border border-white/5"
                                >
                                    {isAr ? 'تراجع (الاحتفاظ بالعرض)' : 'Keep Offer'}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* PREPARATION CONFIRMATION DIALOG */}
            <AnimatePresence>
                {isPrepareDialogOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4"
                    >
                        <motion.div
                            initial={{ scale: 0.95, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.95, y: 20 }}
                            className="w-full max-w-md bg-[#1A1814] border border-blue-500/30 rounded-3xl p-6 shadow-2xl relative overflow-hidden"
                        >
                            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 blur-[50px] rounded-full pointer-events-none" />
                            
                            <div className="flex flex-col items-center text-center space-y-4">
                                <div className="w-16 h-16 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-500 shadow-[0_0_30px_rgba(59,130,246,0.1)]">
                                    <Package size={32} />
                                </div>
                                <h3 className="text-xl font-bold text-white">
                                    {isAr ? 'تأكيد تجهيز القطعة' : 'Confirm part preparation'}
                                </h3>
                                {prepareOfferForDialog && (
                                    <p className="text-gold-400 font-bold text-sm">
                                        {getMerchantOfferPartName(prepareOfferForDialog)}
                                    </p>
                                )}
                                <p className="text-sm text-white/50 leading-relaxed px-2">
                                    {isAr
                                        ? 'هل هذه القطعة مغلفة بشكل محكم وجاهزة للتوثيق؟ التوثيق يتم لكل قطعة على حدة في الخطوة التالية.'
                                        : 'Is this part securely packed and ready for verification? Each part is verified separately in the next step.'}
                                </p>
                            </div>

                            <div className="flex flex-col gap-3 mt-8">
                                <button
                                    onClick={handleMarkPrepared}
                                    disabled={isPreparing}
                                    className="w-full py-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold transition-all shadow-lg hover:shadow-blue-500/20 active:scale-98 flex items-center justify-center gap-2"
                                >
                                    {isPreparing ? (
                                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    ) : (
                                        <CheckCircle2 size={18} />
                                    )}
                                    <span>{isAr ? 'نعم، الشحنة جاهزة للتسليم' : 'Yes, Ready for Pickup'}</span>
                                </button>
                                <button
                                    onClick={() => setIsPrepareDialogOpen(false)}
                                    disabled={isPreparing}
                                    className="w-full py-3.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 hover:text-white font-bold transition-colors border border-white/5"
                                >
                                    {isAr ? 'إلغاء' : 'Cancel'}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* EMBEDDED SUBMIT OFFER MODAL FORM */}
            <SubmitOfferModal
                isOpen={isBidding}
                onClose={() => setIsBidding(false)}
                requestDetails={
                    order
                        ? {
                              id: order.id,
                              car: order.car,
                              part: order.part,
                              parts: order.parts,
                              vehicle: order.vehicle,
                              vin: order.vin,
                              date: order.date,
                              createdAt: order.createdAt,
                              offers: order.offers,
                          }
                        : null
                }
                existingOffers={myOffers} // Pass offers back so modal enforces locks
                onSubmit={async () => {
                    setIsBidding(false);
                    await fetchDashboardStats();
                    await fetchMyOffers();
                }}
            />
        </motion.div>
    );
};
