import React, { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GlassCard } from '../../ui/GlassCard';
import { Badge, StatusType } from '../../ui/Badge';
import { StatusTimeline } from '../../ui/StatusTimeline';
import { OfferCard } from '../OfferCard';
import { PartOffersDrawer } from '../PartOffersDrawer';
import { CountdownTimer } from '../OrderDetails';
import { WarrantyProtectionCard } from '../../ui/WarrantyProtectionCard';
import { ShipmentTracker } from '../shipments/ShipmentTracker';
import { OrderCountdown } from '../../ui/OrderCountdown';
import { useLanguage } from '../../../contexts/LanguageContext';
import { useOrderStore } from '../../../stores/useOrderStore';
import { useOrderById } from '../../../hooks/useOrderById';
import { useOrderRealtimeSync } from '../../../hooks/useOrderRealtimeSync';
import { useAdminStore } from '../../../stores/useAdminStore';
import {
    ChevronLeft, ChevronRight, User, Store, DollarSign, Settings2, ShieldAlert,
    AlertTriangle, Clock, PlayCircle, Search, Package, Eye, Truck, Calendar, FileText, MapPin, X,
    Edit2, Trash2, Ban, Copy, CheckCircle2, MessageSquare, Info, CreditCard, Box, XCircle, RotateCcw, AlertOctagon, Award, Zap
} from 'lucide-react';
import { VerificationReviewPanel } from './VerificationReviewPanel';
import { VerificationTaskManager } from './VerificationTaskManager';
import { ordersApi } from '../../../services/api/orders';
import { OrderInvoicesPanel } from '../shared/OrderInvoicesPanel';
import { OrderWaybillsPanel } from '../shared/OrderWaybillsPanel';
import { POST_DELIVERY_RETURN_DISPUTE_HOURS } from '../../../utils/orderSla';
import { shouldShowAdminVerificationSections } from '../../../utils/orderVerificationVisibility';
import { VerificationPhaseBanner, shouldShowVerificationBanner } from '../../ui/VerificationPhaseBanner';
import { formatOrderDisplayId } from '../../../utils/orderDisplayId';
import { CartShipmentBadge } from '../shared/CartShipmentBadge';
import { PartialShippingProgressCard } from '../shared/PartialShippingProgressCard';
import { PartialDeliveryProgressCard } from '../shared/PartialDeliveryProgressCard';
import { MultiItemCompletionBadge } from '../shared/MultiItemCompletionBadge';
import { useOrderFulfillmentSummary } from '../../../hooks/useOrderFulfillmentSummary';
import { computeShipmentDeliverySummary } from '../../../utils/offerFulfillmentHelpers';

interface AdminOrderDetailsProps {
    orderId: any;
    onBack: () => void;
    onNavigate?: (path: string, id?: any) => void;
}

// Internal Component: Risk Timer

// NEW: Edit Offer Modal for Admin
const EditOfferModal = ({ offer, onClose, onSave }: { offer: any, onClose: () => void, onSave: (data: any) => void }) => {
    const { t, language } = useLanguage();
    const isAr = language === 'ar';
    const et = t.admin.orderDetails.editOfferModal;

    const [price, setPrice] = useState(offer.unitPrice);
    const [shipping, setShipping] = useState(offer.shippingCost);
    const [delivery, setDelivery] = useState(offer.deliveryDays);
    const [condition, setCondition] = useState(offer.condition || '');
    const [partType, setPartType] = useState(offer.partType || '');
    const [hasWarranty, setHasWarranty] = useState(offer.hasWarranty || false);
    const [warrantyDuration, setWarrantyDuration] = useState(offer.warrantyDuration || '');
    const [weightKg, setWeightKg] = useState(offer.weightKg || 0);
    const [isShippingIncluded, setIsShippingIncluded] = useState(offer.isShippingIncluded || false);
    const [offerNotes, setOfferNotes] = useState(offer.notes || '');

    // Standard Options
    const conditionOptions = [
        { value: 'new', label: et.conditions.new },
        { value: 'used_clean', label: et.conditions.used_clean },
        { value: 'used_scratched', label: et.conditions.used_scratched },
        { value: 'for_parts', label: et.conditions.for_parts },
    ];

    const partTypeOptions = [
        { value: 'oem', label: et.partTypes.oem },
        { value: 'aftermarket', label: et.partTypes.aftermarket },
        { value: 'commercial', label: et.partTypes.commercial },
        { value: 'rebuilt', label: et.partTypes.rebuilt },
    ];

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto pt-24 pb-12">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-[#1a1c1e] border border-white/10 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden mt-8 mb-8 my-auto max-h-[90vh] flex flex-col">
                <div className="p-6 border-b border-white/10 flex justify-between items-center bg-gradient-to-r from-blue-500/10 to-transparent shrink-0">
                    <div className="flex flex-col">
                        <h3 className="text-lg font-bold text-white flex items-center gap-2">
                            <Edit2 size={18} className="text-blue-400" />
                            {et.title}
                        </h3>
                        <div className="text-[10px] text-white/40 mt-0.5 flex items-center gap-1">
                            <Store size={10} />
                            {offer.merchantName || offer.store?.name || offer.dealerName}
                        </div>
                    </div>
                    <button onClick={onClose} className="text-white/40 hover:text-white transition-colors"><X size={20} /></button>
                </div>

                <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4 overflow-y-auto">
                    {/* Unit Price */}
                    <div className="space-y-2">
                        <label className="text-xs text-white/40 uppercase font-bold tracking-wider">{et.unitPrice} (AED)</label>
                        <input type="number" value={price} onChange={(e) => setPrice(Number(e.target.value))} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500/50 transition-all font-mono" />
                    </div>

                    {/* Shipping Cost */}
                    <div className="space-y-2">
                        <label className="text-xs text-white/40 uppercase font-bold tracking-wider">{et.shippingCost} (AED)</label>
                        <input type="number" value={shipping} onChange={(e) => setShipping(Number(e.target.value))} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500/50 transition-all font-mono" />
                    </div>

                    {/* Weight */}
                    <div className="space-y-2">
                        <label className="text-xs text-white/40 uppercase font-bold tracking-wider">{et.weight} (Kg)</label>
                        <input type="number" step="0.1" value={weightKg} onChange={(e) => setWeightKg(Number(e.target.value))} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500/50 transition-all font-mono" />
                    </div>

                    {/* Delivery Days */}
                    <div className="space-y-2">
                        <label className="text-xs text-white/40 uppercase font-bold tracking-wider">{et.deliveryDays}</label>
                        <input type="text" value={delivery} onChange={(e) => setDelivery(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500/50 transition-all" />
                    </div>

                    {/* Condition Dropdown */}
                    <div className="space-y-2">
                        <label className="text-xs text-white/40 uppercase font-bold tracking-wider">{et.condition}</label>
                        <select
                            value={condition}
                            onChange={(e) => setCondition(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500/50 transition-all appearance-none cursor-pointer"
                        >
                            <option value="" className="bg-[#1a1c1e]">{isAr ? '-- اختر الحالة --' : '-- Select Condition --'}</option>
                            {conditionOptions.map(opt => (
                                <option key={opt.value} value={opt.value} className="bg-[#1a1c1e]">{opt.label}</option>
                            ))}
                        </select>
                    </div>

                    {/* Part Type Dropdown */}
                    <div className="space-y-2">
                        <label className="text-xs text-white/40 uppercase font-bold tracking-wider">{et.partType}</label>
                        <select
                            value={partType}
                            onChange={(e) => setPartType(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500/50 transition-all appearance-none cursor-pointer"
                        >
                            <option value="" className="bg-[#1a1c1e]">{isAr ? '-- اختر النوع --' : '-- Select Type --'}</option>
                            {partTypeOptions.map(opt => (
                                <option key={opt.value} value={opt.value} className="bg-[#1a1c1e]">{opt.label}</option>
                            ))}
                        </select>
                    </div>

                    {/* Options Row */}
                    <div className="col-span-1 sm:col-span-2 flex flex-wrap gap-4">
                        <div className="flex-1 min-w-[140px] flex items-center gap-3 bg-white/5 rounded-xl px-4 py-3 border border-white/10 hover:bg-white/[0.07] transition-all cursor-pointer select-none" onClick={() => setHasWarranty(!hasWarranty)}>
                            <input type="checkbox" checked={hasWarranty} readOnly className="w-5 h-5 accent-blue-500 rounded border-white/20 bg-black/50 cursor-pointer" />
                            <label className="text-sm font-bold text-white cursor-pointer">{et.hasWarranty}</label>
                        </div>
                        <div className="flex-1 min-w-[140px] flex items-center gap-3 bg-white/5 rounded-xl px-4 py-3 border border-white/10 hover:bg-white/[0.07] transition-all cursor-pointer select-none" onClick={() => setIsShippingIncluded(!isShippingIncluded)}>
                            <input type="checkbox" checked={isShippingIncluded} readOnly className="w-5 h-5 accent-blue-500 rounded border-white/20 bg-black/50 cursor-pointer" />
                            <label className="text-sm font-bold text-white cursor-pointer">{et.isShippingIncluded}</label>
                        </div>
                    </div>

                    {/* Warranty Duration */}
                    {hasWarranty && (
                        <div className="space-y-2 col-span-1 sm:col-span-2">
                            <label className="text-xs text-white/40 uppercase font-bold tracking-wider">{et.warrantyDuration}</label>
                            <input type="text" value={warrantyDuration} onChange={(e) => setWarrantyDuration(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500/50 transition-all" placeholder={isAr ? 'مثال: 6 شهور' : 'e.g. 6 Months'} />
                        </div>
                    )}

                    {/* Offer Notes */}
                    <div className="space-y-2 col-span-1 sm:col-span-2">
                        <label className="text-xs text-white/40 uppercase font-bold tracking-wider">{et.notes}</label>
                        <textarea
                            value={offerNotes}
                            onChange={(e) => setOfferNotes(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500/50 transition-all min-h-[80px]"
                            placeholder={et.placeholderNotes}
                        />
                    </div>
                </div>

                <div className="p-6 border-t border-white/10 bg-black/20 flex gap-3 shrink-0">
                    <button onClick={onClose} className="flex-1 py-3 px-4 rounded-xl border border-white/10 text-white font-bold hover:bg-white/5 transition-all">
                        {et.cancel}
                    </button>
                    <button
                        onClick={() => onSave({
                            unitPrice: price,
                            shippingCost: shipping,
                            deliveryDays: delivery,
                            condition,
                            partType,
                            hasWarranty,
                            warrantyDuration,
                            weightKg,
                            isShippingIncluded,
                            notes: offerNotes
                        })}
                        className="flex-1 py-3 px-4 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-500 shadow-lg shadow-blue-600/20 transition-all"
                    >
                        {et.save}
                    </button>
                </div>
            </motion.div>
        </div>
    );
};

export const AdminOrderDetails: React.FC<AdminOrderDetailsProps> = ({ orderId, onBack, onNavigate }) => {
    const { t, language } = useLanguage();
    const { transitionOrder, forceStatus, getValidTransitions, fetchOrder } = useOrderStore();
    const { currentAdmin } = useAdminStore();

    const order = useOrderById(orderId ? String(orderId) : undefined);
    useOrderRealtimeSync(orderId ? String(orderId) : undefined);
    const fulfillmentSummary = useOrderFulfillmentSummary(
        orderId ? String(orderId) : undefined,
        order,
    );

    const shipmentDeliverySummary = useMemo(
        () => computeShipmentDeliverySummary(order?.shipments, order?.status),
        [order?.shipments, order?.status],
    );

    const multiItemCompletion = useMemo(() => {
        const parts = fulfillmentSummary?.parts ?? [];
        if (parts.length <= 1) return null;
        const completedCount = parts.filter(
            (p) => p.fulfillmentStatus === 'COMPLETED' || p.resolutionLocked,
        ).length;
        return { completedCount, totalCount: parts.length };
    }, [fulfillmentSummary]);

    const isAr = language === 'ar';
    const ArrowIcon = isAr ? ChevronRight : ChevronLeft;

    const [isLoadingDetail, setIsLoadingDetail] = useState(!order);

    useEffect(() => {
        if (order) setIsLoadingDetail(false);
    }, [order]);

    const [activeMedia, setActiveMedia] = useState<{ type: 'image' | 'video', url: string } | null>(null);
    const [showTracking, setShowTracking] = useState(false);
    const [editingOffer, setEditingOffer] = useState<any | null>(null);
    const [internalNotes, setInternalNotes] = useState(order?.adminNotes || "");
    const [isSavingNotes, setIsSavingNotes] = useState(false);

    // Keep internal notes in sync with store
    useEffect(() => {
        if (order?.adminNotes !== undefined) {
            setInternalNotes(order.adminNotes || "");
        }
    }, [order?.adminNotes]);
    const [expandedParts, setExpandedParts] = useState<Record<string, boolean>>({});
    const [activeTab, setActiveTab] = useState<'overview' | 'invoices' | 'waybills'>('overview');
    const [drawerPart, setDrawerPart] = useState<{
        id: string;
        name: string;
        description?: string;
        image?: string;
        index: number;
    } | null>(null);

    const { adminUpdateOffer, adminDeleteOffer } = useOrderStore();

    // Permissions
    const isAdmin = currentAdmin?.role === 'ADMIN' || currentAdmin?.role === 'SUPER_ADMIN';
    const isSuper = currentAdmin?.role === 'SUPER_ADMIN';

    if (isLoadingDetail && !order) {
        return <motion.div className="text-white p-8 text-center">{isAr ? 'جاري تحميل تفاصيل الطلب...' : 'Loading order details...'}</motion.div>;
    }

    if (!order) return <motion.div className="text-white p-8 text-center">{t.admin.orderDetails.notFound}</motion.div>;

    const validTransitions = getValidTransitions(order.status);


    const handleTransition = async (target: StatusType) => {
        const result = await transitionOrder(orderId, target, currentAdmin?.role || 'ADMIN');
        if (!result.success) alert(result.message);
    };

    const handleForce = (target: StatusType) => {
        if (confirm(t.admin.actions.forceWarningDialog)) {
            forceStatus(orderId, target, "Admin Manual Override via Dashboard");
        }
    };

    const getOfferDeadline = () => {
        const d = new Date(order.createdAt || order.date);
        d.setHours(d.getHours() + 24);
        return d.toISOString();
    };

    const getPaymentDeadline = () => {
        if (!order.offerAcceptedAt) return '';
        const d = new Date(order.offerAcceptedAt);
        d.setHours(d.getHours() + 24);
        return d.toISOString();
    };

    const getReturnDeadline = () => {
        const baseDate = order.deliveredAt || order.updatedAt;
        if (!baseDate || (order.status !== 'DELIVERED' && order.status !== 'DELIVERED_TO_CUSTOMER')) return '';
        const d = new Date(baseDate);
        d.setHours(d.getHours() + POST_DELIVERY_RETURN_DISPUTE_HOURS);
        return d.toISOString();
    };

    const isOrderExpired = () => {
        if (order.status === 'CANCELLED') return true;
        if (order.status !== 'AWAITING_OFFERS') return false;
        const deadline = new Date(getOfferDeadline()).getTime();
        return new Date().getTime() > deadline;
    };

    const isExpired = isOrderExpired();
    const noOp = () => { };

    // Financial calculations
    const orderPrice = Number(order.price) || 0;

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 relative">
            {/* Media Lightbox */}
            <AnimatePresence>
                {activeMedia && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setActiveMedia(null)}
                        className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 cursor-zoom-out"
                    >
                        <button
                            onClick={() => setActiveMedia(null)}
                            className="absolute top-6 right-6 p-2 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors"
                        >
                            <X size={24} />
                        </button>
                        {activeMedia.type === 'video' ? (
                            <motion.video
                                initial={{ scale: 0.9, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0.9, opacity: 0 }}
                                src={activeMedia.url}
                                controls
                                autoPlay
                                className="max-w-full max-h-[90vh] rounded-xl border border-white/10 shadow-2xl"
                                onClick={(e) => e.stopPropagation()}
                            />
                        ) : (
                            <motion.img
                                initial={{ scale: 0.9, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0.9, opacity: 0 }}
                                src={activeMedia.url}
                                alt="Preview"
                                className="max-w-full max-h-[90vh] object-contain rounded-xl border border-white/10 shadow-2xl"
                                onClick={(e) => e.stopPropagation()}
                            />
                        )}
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
                        <ArrowIcon size={18} className="group-hover:-translate-x-1 rtl:group-hover:translate-x-1 transition-transform" />
                        <span className="text-sm font-medium">{(t.dashboard.orders as any)?.backToList || 'Back to list'}</span>
                    </button>

                    {/* Customer Timers (Mirrored) */}
                    <div className="flex gap-4">
                        {order.status === 'AWAITING_OFFERS' && (
                            <CountdownTimer targetDate={getOfferDeadline()} label={(t.dashboard.timers as any)?.offers_expires || 'Offers Expires'} />
                        )}
                        {order.status === 'AWAITING_PAYMENT' && order.offerAcceptedAt && (
                            <CountdownTimer targetDate={getPaymentDeadline()} label={(t.dashboard.timers as any)?.payment_expires || 'Payment Expires'} />
                        )}
                        {(order.status === 'DELIVERED' || order.status === 'DELIVERED_TO_CUSTOMER') && (
                            <OrderCountdown updatedAt={order.deliveredAt || order.updatedAt} status={order.status} variant="badge" />
                        )}
                    </div>
                </div>

                {(order.status === 'DELIVERED' || order.status === 'DELIVERED_TO_CUSTOMER') && (
                    <OrderCountdown updatedAt={order.deliveredAt || order.updatedAt} status={order.status} variant="full" />
                )}

                <GlassCard className="p-0 overflow-hidden bg-[#1A1814] border-white/5">
                    <div className="p-6 border-b border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <div className="flex items-center gap-3 mb-1">
                                <h1 className="text-2xl font-bold text-white">
                                    {(order.parts && order.parts.length > 1)
                                        ? (isAr ? `طلبية متعددة (${order.parts.length} قطع)` : `Multi-Part Order (${order.parts.length} items)`)
                                        : order.part}
                                </h1>
                                <Badge status={order.status} />
                                {multiItemCompletion && (
                                    <MultiItemCompletionBadge
                                        completedCount={multiItemCompletion.completedCount}
                                        totalCount={multiItemCompletion.totalCount}
                                    />
                                )}
                                {order.warranty_end_at && (
                                    <WarrantyProtectionCard 
                                        order={order} 
                                        variant="compact"
                                        role="admin"
                                    />
                                )}
                                {order.shipments && order.shipments.length > 0 && !['CANCELLED', 'AWAITING_OFFERS', 'AWAITING_PAYMENT'].includes(order.status) && (
                                    <Badge status={order.shipments[0].status as StatusType} className="animate-in fade-in zoom-in duration-500" />
                                )}
                            </div>
                            <div className="text-white/60 text-sm flex flex-wrap items-center gap-2">
                                <span>{(t.dashboard.orders as any)?.orderId || 'Order #'} {formatOrderDisplayId(order)}</span>
                                <span>•</span>
                                <span>{order.vehicle?.make ? `${order.vehicle.make} ${order.vehicle.model}` : order.car}</span>
                            </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-3">
                            {/* Attractive Go to Shipping Button */}
                            {['PREPARED', 'VERIFICATION', 'VERIFICATION_SUCCESS', 'READY_FOR_SHIPPING', 'PARTIALLY_SHIPPED', 'PARTIALLY_DELIVERED', 'SHIPPED', 'DELIVERED', 'COMPLETED', 'DISPUTED', 'RETURNED', 'RETURN_REQUESTED', 'RETURN_APPROVED', 'REFUNDED', 'WARRANTY_ACTIVE', 'WARRANTY_EXPIRED', 'NON_MATCHING', 'CORRECTION_PERIOD', 'CORRECTION_SUBMITTED'].includes(order.status) && (
                                <button
                                    onClick={() => onNavigate?.('shipping', order.id)}
                                    className="px-5 py-2 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white rounded-xl font-bold text-sm transition-all shadow-lg shadow-emerald-500/20 flex items-center gap-2 group active:scale-95"
                                >
                                    <Truck size={18} className="group-hover:translate-x-1 transition-transform rtl:group-hover:-translate-x-1" />
                                    <span>{isAr ? 'الذهاب إلى الشحن' : 'Go to Shipping'}</span>
                                </button>
                            )}

                            <div className="text-right hidden md:block border-l border-white/10 pl-4 ml-2 rtl:border-l-0 rtl:border-r rtl:pl-0 rtl:pr-4 rtl:mr-2">
                                <div className="text-xs text-white/40 mb-1">{(t.dashboard.orders as any)?.requestDate || 'Request Date'}</div>
                                <div className="flex items-center gap-2 text-white/80 font-mono text-sm">
                                    <Calendar size={14} />
                                    {order.date}
                                </div>
                            </div>
                        </div>
                    </div>


                    {/* Premium Warranty Protection Hub for Admin */}
                    {order.status === 'WARRANTY_ACTIVE' && order.warranty_end_at && (
                        <div className="px-6 py-4 border-b border-white/5 bg-emerald-500/5">
                            <WarrantyProtectionCard order={order} role="admin" />
                        </div>
                    )}

                    <div className="px-6 pt-4 space-y-4">
                        <MerchantHandoverPendingBanner
                            order={order}
                            role="admin"
                            isAr={isAr}
                        />
                        <PartialShippingProgressCard order={order} isAr={isAr} />
                        <PartialDeliveryProgressCard
                            shipments={order.shipments}
                            shipmentBatches={order.shipmentBatches}
                            orderStatus={order.status}
                            isAr={isAr}
                            className="mt-4"
                        />
                    </div>

                    {/* Derived Shipment Status for Tracker Accuracy */}
                    {(() => {
                        const derivedShipmentStatus = (order.shipments && order.shipments.length > 0)
                            ? order.shipments[0].status
                            : order.status === 'READY_FOR_SHIPPING'
                                ? 'PREPARED'
                                : order.status === 'VERIFICATION_SUCCESS'
                                    ? 'PREPARATION'
                                    : order.status === 'PARTIALLY_SHIPPED'
                                    ? 'PACKAGED_FOR_SHIPPING'
                                    : order.status === 'SHIPPED'
                                    ? 'PICKED_UP_BY_CARRIER'
                                    : order.status === 'DELIVERED'
                                        ? 'DELIVERED_TO_CUSTOMER'
                                        : order.status;
                        
                        return !['AWAITING_OFFERS', 'COLLECTING_OFFERS', 'AWAITING_PAYMENT', 'CANCELLED'].includes(order.status) ? (
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
                                            className="overflow-hidden border-t border-white/5 pt-6 mt-6 px-1"
                                        >
                                            <ShipmentTracker status={derivedShipmentStatus} variant="admin" />
                                        </motion.div>
                                    )}
                                </AnimatePresence>

                                <div className="flex justify-center mt-6">
                                    <button
                                        onClick={() => setShowTracking(!showTracking)}
                                        className="flex items-center gap-2 text-gold-400 font-bold hover:text-gold-300 transition-colors text-xs uppercase tracking-widest bg-white/5 px-4 py-2 rounded-lg border border-white/5 hover:border-gold-500/30 shadow-lg shadow-black/20"
                                    >
                                        <MapPin size={16} />
                                        {showTracking ? (t.dashboard.orders as any)?.hideTracking || 'Hide Tracking' : (t.dashboard.orders as any)?.viewTracking || 'View Tracking'}
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="p-6">
                                {shouldShowVerificationBanner(order.status) && (
                                    <VerificationPhaseBanner className="mb-6" />
                                )}
                                <StatusTimeline
                                    currentStatus={order.status}
                                    fulfillmentSummary={fulfillmentSummary}
                                    shipmentDeliverySummary={shipmentDeliverySummary}
                                />
                            </div>
                        );
                    })()}
                </GlassCard>
            </div>

            {/* 2. Main Grid: Actions/Offers (Left) vs Summary (Right) */}
            <div className="grid lg:grid-cols-3 gap-8">

                {/* Left Column (Spans 2 cols): Content changes based on Active Tab */}
                <div className="lg:col-span-2 space-y-6 flex flex-col">
                    {/* Tab Navigation */}
                    <div className="flex gap-4 border-b border-white/10 pb-2 overflow-x-auto shrink-0 hide-scrollbar">
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
                        {['PREPARED', 'VERIFICATION', 'VERIFICATION_SUCCESS', 'READY_FOR_SHIPPING', 'SHIPPED', 'DELIVERED', 'COMPLETED', 'DISPUTED', 'RETURNED', 'RETURN_REQUESTED', 'RETURN_APPROVED', 'REFUNDED', 'WARRANTY_ACTIVE', 'WARRANTY_EXPIRED', 'NON_MATCHING', 'CORRECTION_PERIOD', 'CORRECTION_SUBMITTED'].includes(order.status) && (
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

                    {/* OVERVIEW CONTENT */}
                    <div className={`space-y-6 ${activeTab === 'overview' ? 'block' : 'hidden'}`}>
                    {shouldShowAdminVerificationSections(order) && (
                        <VerificationReviewPanel
                            orderId={order.id}
                            status={order.status}
                            documents={order.verificationDocuments || []}
                            offers={order.offers}
                            parts={order.parts}
                            onReviewSubmit={async (action, payload) => {
                                await ordersApi.adminReviewVerification(String(order.id), {
                                    action,
                                    documentId: payload?.documentId,
                                    offerId: payload?.offerId,
                                    rejectionReason: payload?.reason,
                                    ...(payload?.rejectionImages?.length
                                        ? { rejectionImages: payload.rejectionImages }
                                        : {}),
                                    ...(payload?.rejectionVideo
                                        ? { rejectionVideo: payload.rejectionVideo }
                                        : {}),
                                    adminSignatureName: payload?.adminSignatureName,
                                    adminSignatureImage: payload?.adminSignatureImage,
                                    adminSignatureType: payload?.adminSignatureType,
                                    adminSignatureText: payload?.adminSignatureText,
                                });
                                await fetchOrder(String(order.id));
                            }}
                        />
                    )}

                    {shouldShowAdminVerificationSections(order) && (
                        <VerificationTaskManager
                            orderId={order.id}
                            offers={order.offers}
                            parts={order.parts}
                            verificationDocuments={order.verificationDocuments}
                        />
                    )}

                    {/* STATE: AWAITING OFFERS - Only show if NO offers yet */}
                    {order.status === 'AWAITING_OFFERS' && !isExpired && (!order.offers || order.offers.filter((o: any) => o.status !== 'rejected').length === 0) && (
                        <GlassCard className="flex flex-col items-center justify-center text-center py-16 border-dashed border-white/10 bg-white/5">
                            <div className="w-20 h-20 bg-[#1A1814] rounded-full flex items-center justify-center mb-6 relative">
                                <div className="absolute inset-0 bg-gold-500 rounded-full opacity-20 animate-ping" />
                                <Search size={32} className="text-gold-400 relative z-10" />
                            </div>
                            <h3 className="text-xl font-bold text-white mb-2">{(t.dashboard.orders as any)?.searching || 'Searching for offers...'}</h3>
                            <p className="text-white/50 max-w-md mx-auto mb-8">
                                {(t.dashboard.orders as any)?.searchingDesc || 'Merchants have been notified.'}
                            </p>
                        </GlassCard>
                    )}

                    {/* Requested Parts List + View Offers Button */}
                    {(order.parts && order.parts.length > 0) ? (
                        <div className="space-y-6">
                            <h3 className="text-white font-bold flex items-center gap-2">
                                <span className="w-1.5 h-6 bg-gold-500 rounded-full" />
                                {isAr ? 'القطع المطلوبة والعروض' : 'Requested Parts & Offers'}
                            </h3>

                            <div className="space-y-4">
                                {order.parts.map((p: any, idx: number) => {
                                    const partOffers = (order.offers || [])
                                        .filter((o: any) => o.orderPartId === p.id); // Show ALL offers for admin

                                    const hasOffers = partOffers.length > 0;
                                    const primaryOffer = partOffers.find((o: any) =>
                                        ['accepted', 'ACCEPTED'].includes(String(o.status))
                                    ) || partOffers[0];
                                    const offerPartImage = primaryOffer?.offerImage;
                                    const customerPartImage = p.images?.[0]
                                        ? (typeof p.images[0] === 'string' ? p.images[0] : URL.createObjectURL(p.images[0] as File))
                                        : undefined;
                                    const partImgSrc = customerPartImage || offerPartImage;

                                    return (
                                        <GlassCard key={p.id || idx} className="p-0 overflow-hidden border-white/5 bg-[#1A1814]">
                                            {/* Part Row */}
                                            <div className="p-5 flex flex-wrap items-center justify-between gap-4 border-b border-white/5">
                                                {/* Part Info */}
                                                <div className="flex items-center gap-4 flex-1 min-w-[200px]">
                                                    <div className="w-16 h-16 rounded-xl bg-white/5 border border-white/10 overflow-hidden shrink-0 flex items-center justify-center relative group cursor-pointer"
                                                        onClick={() => partImgSrc && setActiveMedia({ type: 'image', url: partImgSrc })}>
                                                        {partImgSrc ? (
                                                            <img src={partImgSrc} alt={p.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform" />
                                                        ) : (
                                                            <Package size={24} className="text-white/20" />
                                                        )}
                                                        {partImgSrc && <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"><Eye size={16} /></div>}
                                                    </div>
                                                    <div>
                                                        <h4 className="font-bold text-white text-lg">{p.name}</h4>
                                                        {p.description && <p className="text-white/60 text-sm line-clamp-1">{p.description}</p>}
                                                        <span className="text-[10px] font-mono text-gold-500/50 uppercase mt-1 block tracking-wider">
                                                            {isAr ? `قطعة ${idx + 1}` : `Part ${idx + 1}`}
                                                        </span>
                                                    </div>
                                                </div>

                                                {/* Image preview circles (Legacy/Part level) */}
                                                {p.images && p.images.length > 1 && (
                                                    <div className="flex -space-x-3 rtl:space-x-reverse overflow-hidden">
                                                        {p.images.slice(1, 4).map((img: any, i: number) => {
                                                            const src = typeof img === 'string' ? img : URL.createObjectURL(img as File);
                                                            return (
                                                                <button key={i} onClick={() => setActiveMedia({ type: 'image', url: src })}
                                                                    className="w-8 h-8 rounded-full border-2 border-[#1A1814] overflow-hidden hover:scale-110 transition-transform">
                                                                    <img src={src} alt="" className="w-full h-full object-cover" />
                                                                </button>
                                                            );
                                                        })}
                                                    </div>
                                                )}
                                            </div>

                                            {/* Admin: Expand/Collapse ALL offers for this part */}
                                            {hasOffers ? (
                                                <div className="border-t border-white/5">
                                                    <button
                                                        onClick={() => setExpandedParts(prev => ({ ...prev, [p.id]: !prev[p.id] }))}
                                                        className="w-full flex items-center justify-between px-5 py-3 bg-white/[0.02] hover:bg-white/[0.05] transition-colors text-white/60 font-bold text-xs uppercase cursor-pointer"
                                                    >
                                                        <span className="flex items-center gap-2">
                                                            {isAr ? 'العروض المتاحة' : 'Available Offers'}
                                                            <span className="bg-gold-500 text-black px-2 py-0.5 rounded-md">{partOffers.length}</span>
                                                        </span>
                                                        {expandedParts[p.id] ? <ChevronLeft className="rtl:rotate-90 -rotate-90 transition-transform" size={16} /> : <ChevronRight className="rtl:rotate-180 transition-transform" size={16} />}
                                                    </button>
                                                    <AnimatePresence>
                                                        {expandedParts[p.id] && (
                                                            <motion.div
                                                                initial={{ height: 0, opacity: 0 }}
                                                                animate={{ height: 'auto', opacity: 1 }}
                                                                exit={{ height: 0, opacity: 0 }}
                                                                className="overflow-hidden"
                                                            >
                                                                <div className="p-4 space-y-4 bg-black/20">
                                                                    {partOffers.map((o: any, oIdx: number) => {
                                                                        // Determine status label
                                                                        const offerStatus = o.status || 'pending';
                                                                        const statusConfig = {
                                                                            accepted: { label: isAr ? 'مقبول' : 'Accepted', color: 'bg-green-500/20 text-green-400 border-green-500/30' },
                                                                            rejected: { label: isAr ? 'مرفوض' : 'Rejected', color: 'bg-red-500/20 text-red-400 border-red-500/30' },
                                                                            pending: { label: isAr ? 'قيد الانتظار' : 'Pending', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
                                                                            in_chat: { label: isAr ? 'في محادثة' : 'In Chat', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
                                                                        }[offerStatus] || { label: offerStatus, color: 'bg-white/10 text-white/60 border-white/20' };

                                                                        return (
                                                                            <div key={o.id || oIdx} className="relative">
                                                                                {/* Admin Action Toolbar */}
                                                                                <div className="flex items-center justify-between px-4 py-2 bg-white/[0.03] border border-white/5 rounded-t-xl border-b-0">
                                                                                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-lg border ${statusConfig.color}`}>
                                                                                        {statusConfig.label}
                                                                                    </span>
                                                                                    <div className="flex items-center gap-1.5">
                                                                                        <button
                                                                                            onClick={() => setEditingOffer(o)}
                                                                                            className="p-1.5 rounded-lg text-white/30 hover:text-blue-400 hover:bg-blue-400/10 transition-all"
                                                                                            title={isAr ? 'تعديل العرض' : 'Edit Offer'}
                                                                                        >
                                                                                            <Edit2 size={13} />
                                                                                        </button>
                                                                                        <button
                                                                                            onClick={() => {
                                                                                                if (confirm(isAr ? 'هل أنت متأكد من حذف هذا العرض؟ سيتم تبليغ التاجر.' : 'Delete this offer? The merchant will be notified.')) {
                                                                                                    adminDeleteOffer(o.id).catch((err: any) => alert(err.message));
                                                                                                }
                                                                                            }}
                                                                                            className="p-1.5 rounded-lg text-white/30 hover:text-red-400 hover:bg-red-400/10 transition-all"
                                                                                            title={isAr ? 'حذف العرض' : 'Delete Offer'}
                                                                                        >
                                                                                            <Trash2 size={13} />
                                                                                        </button>
                                                                                        <div className="w-px h-4 bg-white/10 mx-0.5" />
                                                                                        <button
                                                                                            onClick={() => {
                                                                                                if (confirm(isAr ? 'هل تريد حظر هذا التاجر؟' : 'Ban this vendor?')) {
                                                                                                    useAdminStore.getState().updateVendorStatus(o.storeId || '', 'BANNED' as any);
                                                                                                    alert(isAr ? 'تم حظر التاجر' : 'Vendor Banned');
                                                                                                }
                                                                                            }}
                                                                                            className="p-1.5 rounded-lg text-white/30 hover:text-red-600 hover:bg-red-600/10 transition-all flex items-center gap-1 text-[10px] font-bold"
                                                                                            title={isAr ? 'حظر التاجر' : 'Ban Vendor'}
                                                                                        >
                                                                                            <Ban size={13} />
                                                                                        </button>
                                                                                    </div>
                                                                                </div>
                                                                                {/* The actual OfferCard — same as customer sees */}
                                                                                <div className={offerStatus === 'rejected' ? 'opacity-50' : ''}>
                                                                                    <OfferCard
                                                                                        id={o.id}
                                                                                        storeName={o.merchantName || o.store?.name || ''}
                                                                                        rating={o.storeRating || 0}
                                                                                        storeCity={o.storeCity}
                                                                                        reviewCount={o.storeReviewCount || 0}
                                                                                        price={o.unitPrice || o.price || 0}
                                                                                        unitPrice={o.unitPrice || 0}
                                                                                        condition={o.condition || ''}
                                                                                        warranty={o.warranty || false}
                                                                                        deliveryTime={o.deliveryTime || o.deliveryDays || ''}
                                                                                        status={offerStatus}
                                                                                        onAccept={noOp}
                                                                                        onChat={noOp}
                                                                                        onReject={noOp}
                                                                                        offerImage={o.offerImage}
                                                                                        storeLogo={o.storeLogo}
                                                                                        isShippingIncluded={o.isShippingIncluded}
                                                                                        shippingCost={o.shippingCost}
                                                                                        weight={o.weight || o.weightKg}
                                                                                        partType={o.partType}
                                                                                        offerNumber={o.offerNumber}
                                                                                        storeCode={o.storeCode}
                                                                                        submittedAt={o.submittedAt}
                                                                                        disabled={true}
                                                                                        isSelected={offerStatus === 'accepted'}
                                                                                    />
                                                                                </div>
                                                                            </div>
                                                                        );
                                                                    })}
                                                                </div>
                                                            </motion.div>
                                                        )}
                                                    </AnimatePresence>
                                                </div>
                                            ) : (
                                                <div className="px-5 py-6 text-center border-t border-white/5">
                                                    <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-3">
                                                        <Search size={18} className="text-white/20" />
                                                    </div>
                                                    <p className="text-xs text-white/30">{isAr ? 'لا توجد عروض لهذه القطعة حالياً' : 'No offers for this part yet'}</p>
                                                </div>
                                            )}
                                        </GlassCard>
                                    );
                                })}
                            </div>

                            {/* PartOffersDrawer for Admin (Read-only) */}
                            {drawerPart && (
                                <PartOffersDrawer
                                    isOpen={!!drawerPart}
                                    onClose={() => setDrawerPart(null)}
                                    partName={drawerPart.name}
                                    partDescription={drawerPart.description}
                                    partImage={drawerPart.image}
                                    partIndex={drawerPart.index}
                                    offers={(order.offers || []).filter((o: any) => o.orderPartId === drawerPart.id)}
                                    selectedOffer={null}
                                    onAcceptOffer={noOp}
                                    onChat={noOp}
                                    onRejectOffer={noOp}
                                    disabled={true} // Disable actions for admin
                                />
                            )}
                        </div>
                    ) : (
                        /* Legacy single part fallback for AWAITING_OFFERS with offers, or general fallback */
                        <div className="space-y-4">
                            <div className="aspect-video bg-black/40 rounded-xl border border-white/10 flex items-center justify-center text-white/20 overflow-hidden relative mb-4">
                                {order.partImages && order.partImages.length > 0 ? (
                                    <img src={order.partImages[0]} alt={order.part} className="w-full h-full object-cover cursor-pointer" onClick={() => setActiveMedia({ type: 'image', url: order.partImages[0] })} />
                                ) : (
                                    <span>{t.admin.orderDetails.noImage}</span>
                                )}
                            </div>
                            <h4 className="font-bold text-white text-lg">{order.part}</h4>
                        </div>
                    )}

                    {/* General Offers (Unlinked) */}
                    {order.offers && order.offers.filter((o: any) => !o.orderPartId && o.status !== 'rejected').length > 0 && (
                        <div className="space-y-4 mt-8">
                            <h3 className="text-white font-bold flex items-center gap-2">
                                <span className="w-1.5 h-6 bg-gold-500 rounded-full" />
                                {isAr ? 'عروض عامة' : 'General Offers'}
                            </h3>
                            <div className="space-y-4">
                                {order.offers
                                    .filter((o: any) => !o.orderPartId && o.status !== 'rejected')
                                    .slice(0, 10)
                                    .map((offer: any) => (
                                        <div key={offer.id} className="relative">
                                            <OfferCard
                                                {...offer}
                                                storeName={offer.merchantName}
                                                rating={offer.storeRating || 0}
                                                reviewCount={offer.storeReviewCount || 0}
                                                unitPrice={offer.unitPrice || offer.price}
                                                isSelected={order.acceptedOffers?.some((acc: any) => acc.id === offer.id) || order.acceptedOffer?.id === offer.id}
                                                onAccept={noOp}
                                                onChat={noOp}
                                                onReject={noOp}
                                                disabled={true} // Admin only views
                                            />
                                        </div>
                                    ))
                                }
                            </div>
                        </div>
                    )}
                    </div>

                    {/* INVOICES TAB */}
                    <div className={activeTab === 'invoices' ? 'block' : 'hidden'}>
                        <OrderInvoicesPanel 
                            orderId={order.id} 
                            role={currentAdmin?.role || 'ADMIN'} 
                            initialData={order.invoices}
                        />
                    </div>
                    {/* WAYBILLS TAB */}
                    <div className={activeTab === 'waybills' ? 'block' : 'hidden'}>
                        {['VERIFICATION_SUCCESS', 'READY_FOR_SHIPPING', 'SHIPPED', 'DELIVERED', 'COMPLETED', 'DISPUTED', 'RETURNED', 'RETURN_REQUESTED', 'RETURN_APPROVED', 'REFUNDED', 'WARRANTY_ACTIVE', 'WARRANTY_EXPIRED'].includes(order.status) && (
                            <OrderWaybillsPanel 
                                orderId={order.id} 
                                orderStatus={order.status} 
                                role={currentAdmin?.role || 'ADMIN'} 
                                initialData={order.shippingWaybills}
                                requestType={order.requestType}
                                orderNumber={order.orderNumber}
                                offers={order.offers}
                                shipmentBatches={order.shipmentBatches}
                                onRefreshOrder={() => fetchOrder(String(order.id))}
                            />
                        )}
                    </div>
                </div>

                {/* Right Column (Spans 1 col): Sidebar (Details, Finances, Admin Actions) */}
                <div className="space-y-6">

                    {/* Order Details Panel */}
                    <GlassCard className="bg-[#1A1814] border-white/5 p-6">
                        <h3 className="text-sm font-bold text-white/50 uppercase tracking-wider mb-6 pb-2 border-b border-white/10">
                            {isAr ? 'تفاصيل الطلب' : 'Order Details'}
                        </h3>

                        <div className="space-y-6">
                            <div className="flex gap-4">
                                <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center text-white/30 shrink-0">
                                    <Package size={20} />
                                </div>
                                <div>
                                    <div className="text-xs text-white/40 mb-1">{isAr ? 'القطع المطلوبة' : 'Requested Parts'}</div>
                                    <div className="text-white font-medium">
                                        {(order.parts && order.parts.length > 1)
                                            ? (isAr ? `طلبية متعددة (${order.parts.length} قطع)` : `Multi-Part Order (${order.parts.length} items)`)
                                            : order.part}
                                    </div>
                                    <div className="text-xs text-white/40 mt-1">
                                        {isAr ? 'الحالة: ' : 'Condition: '}
                                        <span className="text-white border px-1.5 py-0.5 rounded border-white/10 ml-1 font-bold">
                                            {order.preferences?.condition === 'new'
                                                ? (isAr ? 'جديد' : 'New')
                                                : (isAr ? 'مستعمل' : 'Used')}
                                        </span>
                                    </div>
                                    <div className="text-xs text-white/40 mt-1">
                                        {isAr ? 'الضمان المطلوب: ' : 'Warranty: '}
                                        <span className="text-white border px-1.5 py-0.5 rounded border-white/10 ml-1 font-bold">
                                            {order.preferences?.warranty ? (isAr ? 'نعم' : 'Yes') : (isAr ? 'لا' : 'No')}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-4">
                                <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center text-white/30 shrink-0">
                                    <FileText size={20} />
                                </div>
                                <div>
                                    <div className="text-xs text-white/40 mb-1">{isAr ? 'المركبة المعنية' : 'Target Vehicle'}</div>
                                    <div className="text-white font-medium">{order.vehicle?.make ? `${order.vehicle.make} ${order.vehicle.model}` : order.car}</div>
                                    <div className="text-xs text-white/30 font-mono mt-1">VIN: {order.vehicle?.vin || order.vin || 'N/A'}</div>
                                </div>
                            </div>

                            <div className="flex gap-4">
                                <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center text-white/30 shrink-0">
                                    <Truck size={20} />
                                </div>
                                <div>
                                    <div className="text-xs text-white/40 mb-1">{isAr ? 'التسليم' : 'Delivery Method'}</div>
                                    <div className="text-white text-sm">
                                        {isAr ? 'الطلب: ' : 'Request: '}
                                        <span className="font-bold text-gold-400">
                                            {order.requestType === 'multiple' ? (isAr ? 'عدة قطع' : 'Multiple Parts') : (isAr ? 'قطعة واحدة' : 'Single Part')}
                                        </span>
                                    </div>
                                    <div className="text-white/60 text-xs mt-1">
                                        {isAr ? 'الشحن: ' : 'Shipping: '}
                                        <span>
                                            {order.shippingType === 'combined'
                                                ? (isAr ? '(عدة قطع) تجميع الطلبات' : '(Multiple) Combined Delivery')
                                                : (order.requestType === 'multiple'
                                                    ? (isAr ? '(عدة قطع) كل طلب فى شحنه لوحده' : '(Multiple) Separate Delivery')
                                                    : (isAr ? '(قطعة واحدة) شحن كل قطعة لوحدها' : '(Single) Direct Delivery')
                                                )
                                            }
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </GlassCard>

                    {/* Participants */}
                    <GlassCard className="p-6 bg-[#1A1814] border-white/5">
                        <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4 border-b border-white/5 pb-2">
                            {t.admin.orderDetails.participants || 'Participants'}
                        </h3>
                        <div className="space-y-3">
                            {/* Customer */}
                            <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-blue-500/10 group">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 rounded-full bg-blue-500/10 text-blue-400"><User size={16} /></div>
                                    <div>
                                        <div className="text-[10px] text-white/40">{t.admin.orderDetails.customerInfo || 'Customer Info'}</div>
                                        <div className="text-sm font-bold text-white">{order.customer?.name}</div>
                                    </div>
                                </div>
                                <button onClick={() => alert('Ban Customer')} className="opacity-0 group-hover:opacity-100 p-2 text-red-500 hover:bg-red-500/10 rounded-lg transition-all tooltip" title={isAr ? "حظر العميل" : "Ban Customer"}><Ban size={14} /></button>
                            </div>

                            {/* Merchant(s) from accepted offers */}
                            {order.acceptedOffers?.length > 0 && order.acceptedOffers.map((offer: any, oIdx: number) => (
                                <div key={offer.id || oIdx} className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-gold-500/10 group">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 rounded-full bg-gold-500/10 text-gold-400"><Store size={16} /></div>
                                        <div>
                                            <div className="text-[10px] text-white/40">{t.admin.orderDetails.merchantInfo || 'Merchant Info'}</div>
                                            <div className="text-sm font-bold text-white">{offer.merchantName || offer.store?.name || offer.dealerName || (isAr ? 'تاجر غير معروف' : 'Unknown Merchant')}</div>
                                        </div>
                                    </div>
                                    <button onClick={() => {
                                        if (confirm(isAr ? 'هل تريد حظر هذا التاجر؟' : 'Do you want to ban this vendor?')) {
                                            useAdminStore.getState().updateVendorStatus(offer.storeId || offer.store?.id || '', 'BANNED' as any);
                                            alert(isAr ? 'تم حظر التاجر' : 'Vendor Banned');
                                        }
                                    }} className="opacity-0 group-hover:opacity-100 p-2 text-red-500 hover:bg-red-500/10 rounded-lg transition-all tooltip" title={isAr ? "حظر التاجر" : "Ban Vendor"}><Ban size={14} /></button>
                                </div>
                            ))}
                        </div>
                    </GlassCard>

                    {/* Internal Notes */}
                    <GlassCard className="p-5 bg-[#1A1814] border-white/5">
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="text-[10px] font-bold text-white/40 uppercase tracking-widest flex items-center gap-2">
                                <MessageSquare size={12} />
                                {isAr ? 'ملاحظات إدارية داخلية' : 'Internal Admin Notes'}
                            </h3>
                            <button
                                onClick={async () => {
                                    setIsSavingNotes(true);
                                    try {
                                        await useOrderStore.getState().updateAdminNotes(order.id, internalNotes);
                                        // Brief success feedback
                                    } catch (err: any) {
                                        alert(err.message);
                                    } finally {
                                        setIsSavingNotes(false);
                                    }
                                }}
                                disabled={isSavingNotes || internalNotes === order.adminNotes}
                                className="text-[10px] bg-gold-500/20 text-gold-400 hover:bg-gold-500/30 px-3 py-1.5 rounded-lg transition-colors font-bold disabled:opacity-50 flex items-center gap-2"
                            >
                                {isSavingNotes ? (
                                    <span className="w-3 h-3 border-2 border-gold-400 border-t-transparent rounded-full animate-spin" />
                                ) : <CheckCircle2 size={12} />}
                                {isAr ? 'حفظ الملاحظات' : 'Save Notes'}
                            </button>
                        </div>
                        <textarea
                            value={internalNotes}
                            onChange={(e: any) => {
                                setInternalNotes(e.target.value);
                                e.target.style.height = 'auto';
                                e.target.style.height = e.target.scrollHeight + 'px';
                            }}
                            onFocus={(e: any) => {
                                e.target.style.height = 'auto';
                                e.target.style.height = e.target.scrollHeight + 'px';
                            }}
                            placeholder={isAr ? 'أضف ملاحظة خاصة للأدمن فقط...' : 'Add private notes for admins only...'}
                            className="w-full bg-black/40 border border-white/5 rounded-xl p-3 text-xs text-white/70 placeholder:text-white/10 min-h-[120px] focus:outline-none focus:border-gold-500/30 transition-all overflow-hidden resize-none"
                        />
                    </GlassCard>

                    {/* Modern Admin Actions (2026 Refactor) */}
                    {isAdmin && (
                        <GlassCard className="p-6 bg-emerald-900/5 border-emerald-500/20 overflow-hidden relative group">
                            <div className="absolute -top-12 -right-12 w-24 h-24 bg-emerald-500/10 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-700" />
                            
                            <h3 className="text-xs font-bold text-emerald-400 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                                <div className="p-1.5 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
                                    <Zap size={14} className="fill-emerald-400/20" />
                                </div>
                                {t.admin.orderDetails.availableActions || 'Available Actions'}
                            </h3>

                            <div className="grid grid-cols-1 gap-3">
                                <AnimatePresence mode="popLayout">
                                    {validTransitions.length > 0 ? (
                                        validTransitions.map((status, idx) => {
                                            // Dynamic UI Config per status
                                            const getStatusInfo = (s: string) => {
                                                const mapping: any = {
                                                    AWAITING_PAYMENT: { icon: CreditCard, color: 'emerald' },
                                                    PREPARATION: { icon: Box, color: 'emerald' },
                                                    SHIPPED: { icon: Truck, color: 'emerald' },
                                                    DELIVERED: { icon: CheckCircle2, color: 'emerald' },
                                                    CANCELLED: { icon: XCircle, color: 'rose' },
                                                    AWAITING_SELECTION: { icon: Search, color: 'emerald' },
                                                };
                                                return mapping[s] || { icon: PlayCircle, color: 'emerald' };
                                            };
                                            const info = getStatusInfo(status);
                                            const Icon = info.icon;

                                            return (
                                                <motion.button
                                                    key={status}
                                                    initial={{ opacity: 0, y: 10 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    transition={{ delay: idx * 0.05 }}
                                                    whileHover={{ scale: 1.02, x: 4 }}
                                                    whileTap={{ scale: 0.98 }}
                                                    onClick={() => handleTransition(status)}
                                                    className="relative w-full group/btn overflow-hidden rounded-2xl p-4 flex items-center justify-between transition-all bg-emerald-500/5 border border-emerald-500/10 hover:border-emerald-500/40 hover:bg-emerald-500/10"
                                                >
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 group-hover/btn:scale-110 group-hover/btn:bg-emerald-500 group-hover/btn:text-white transition-all duration-300">
                                                            <Icon size={18} />
                                                        </div>
                                                        <div className="flex flex-col items-start">
                                                            <span className="text-sm font-bold text-white group-hover/btn:text-emerald-400 transition-colors">
                                                                {t.common.status[status]}
                                                            </span>
                                                            <span className="text-[10px] text-white/40 font-medium tracking-tight">
                                                                {(t.admin.actions as any)?.move || 'Move to'}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <ChevronRight size={16} className="text-white/20 group-hover/btn:text-emerald-400 group-hover/btn:translate-x-1 rtl:rotate-180 transition-all" />
                                                </motion.button>
                                            );
                                        })
                                    ) : (
                                        <div className="text-center py-6 border border-dashed border-white/10 rounded-2xl">
                                            <p className="text-xs text-white/20 font-medium italic">{(t.admin.actions as any)?.noActions || 'No manual actions available for current state'}</p>
                                        </div>
                                    )}
                                </AnimatePresence>
                            </div>
                        </GlassCard>
                    )}

                    {/* Financial Summary (Improved) */}
                    <GlassCard className="p-6 bg-[#1A1814] border-green-500/20 shadow-[0_0_20px_rgba(34,197,94,0.05)]">
                        <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4 border-b border-white/5 pb-2 flex items-center gap-2">
                            <DollarSign size={16} className="text-green-400" />
                            {t.admin.orderDetails.financials || 'Financial Summary'}
                        </h3>

                        {order.acceptedOffers && order.acceptedOffers.length > 0 ? (
                            <div className="space-y-4">
                                {order.acceptedOffers.map((offer: any, idx: number) => {
                                    const base = Number(offer.unitPrice || 0);
                                    const shipping = Number(offer.shippingCost || 0);
                                    const percentCommission = Math.round(base * 0.25);
                                    const commission = base > 0 ? Math.max(percentCommission, 100) : 0;
                                    const partTotal = base + shipping + commission;

                                    // Real Part Name Lookup
                                    const matchedPart = order.parts?.find((p: any) => p.id === offer.orderPartId);
                                    const partDisplayName = matchedPart?.name || offer.partName || (isAr ? 'قطعة ' + (idx + 1) : 'Part ' + (idx + 1));

                                    return (
                                        <div key={offer.id || idx} className="space-y-2 p-3 bg-black/40 rounded-xl border border-white/5 relative overflow-hidden group">
                                            <div className="absolute top-0 left-0 w-1 h-full bg-green-500/40" />
                                            <div className="pl-3 rtl:pl-0 rtl:pr-3">
                                                <div className="text-[10px] font-bold text-gold-400 uppercase mb-2 flex justify-between items-center gap-2">
                                                    <span className="truncate max-w-[150px]">{partDisplayName}</span>
                                                    <button onClick={() => setEditingOffer(offer)} className="text-white/20 hover:text-white transition-colors opacity-0 group-hover:opacity-100"><Edit2 size={10} /></button>
                                                </div>
                                                {order.requestType === 'multiple' && (
                                                    <div className="mb-2">
                                                        <CartShipmentBadge
                                                            offer={offer}
                                                            order={order}
                                                            allOffers={order.offers || order.acceptedOffers || []}
                                                            inAssemblyCart={!offer.shippedFromCart}
                                                            isAr={isAr}
                                                        />
                                                    </div>
                                                )}
                                                <div className="flex justify-between text-xs text-white/70">
                                                    <span>{isAr ? 'السعر' : 'Price'}</span>
                                                    <span className="font-mono">{base.toFixed(2)} AED</span>
                                                </div>
                                                <div className="flex justify-between text-xs text-white/70">
                                                    <span>{isAr ? 'الشحن' : 'Shipping'}</span>
                                                    <span className="font-mono">{shipping.toFixed(2)} AED</span>
                                                </div>
                                                <div className="flex justify-between text-xs text-green-400 mt-1">
                                                    <span>{isAr ? 'الرسوم' : 'Fees'}</span>
                                                    <span className="font-mono">+{commission.toFixed(2)} AED</span>
                                                </div>
                                                <div className="h-px bg-white/10 my-1.5" />
                                                <div className="flex justify-between font-bold text-white text-sm">
                                                    <span>{isAr ? 'المجموع' : 'Total'}</span>
                                                    <span className="text-white font-mono">{partTotal.toFixed(2)} AED</span>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}

                                <div className="pt-4 border-t border-white/10 mt-4">
                                    <div className="flex justify-between items-end text-white">
                                        <div>
                                            <span className="font-bold text-lg">{isAr ? 'إجمالي الدفع' : 'Grand Total'}</span>
                                            <div className="text-[10px] text-white/40">VAT {isAr ? 'شامل ضريبة القيمة المضافة' : 'Included'}</div>
                                        </div>
                                        <div className="text-right">
                                            <span className="text-green-400 font-mono text-2xl font-bold block leading-none">
                                                {orderPrice.toFixed(2)} AED
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="text-center py-8">
                                <DollarSign size={24} className="text-white/10 mx-auto mb-2" />
                                <div className="text-xs text-white/30">{isAr ? 'لم يتم قبول أي عروض بعد' : 'No accepted offers yet'}</div>
                            </div>
                        )}
                        <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between text-xs">
                            <span className="text-white/40">{isAr ? 'حالة الدفع:' : 'Payment Status:'}</span>
                            <span className={`font-bold flex items-center gap-1 ${['AWAITING_OFFERS', 'AWAITING_PAYMENT', 'CANCELLED'].includes(order.status) ? 'text-red-400' : 'text-green-400'}`}>
                                <div className={`w-1.5 h-1.5 rounded-full ${['AWAITING_OFFERS', 'AWAITING_PAYMENT', 'CANCELLED'].includes(order.status) ? 'bg-red-400' : 'bg-green-400'}`} />
                                {['AWAITING_OFFERS', 'AWAITING_PAYMENT', 'CANCELLED'].includes(order.status)
                                    ? (isAr ? 'لم يتم الدفع' : 'Unpaid')
                                    : (isAr ? 'مدفوع' : 'Paid')}
                            </span>
                        </div>
                    </GlassCard>

                    {/* Danger Zone (High-Alert 2026 UI) */}
                    <GlassCard className="p-6 bg-[#160B0B]/80 border-red-500/20 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/5 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-red-500/10 transition-colors duration-1000" />
                        
                        <h3 className="text-xs font-bold text-red-500 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                            <div className="p-1.5 bg-red-500/10 rounded-lg border border-red-500/20">
                                <ShieldAlert size={14} className="fill-red-500/20" />
                            </div>
                            {(t.admin.actions as any)?.danger || 'Danger Zone'}
                        </h3>

                        {!isSuper ? (
                            <div className="relative p-6 rounded-2xl bg-black/40 border border-red-500/10 flex flex-col items-center text-center gap-3">
                                <div className="w-12 h-12 rounded-full bg-red-500/5 border border-red-500/10 flex items-center justify-center text-red-500/30">
                                    <Ban size={24} />
                                </div>
                                <p className="text-[10px] text-white/30 font-medium leading-relaxed max-w-[180px]">
                                    {(t.admin.actions as any)?.superReq || 'Requires Super Admin privileges to perform forced state overrides.'}
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div className="p-3 rounded-xl bg-red-500/5 border border-red-500/10 mb-4">
                                    <p className="text-[10px] text-red-400/80 font-medium leading-relaxed italic">
                                        {(t.admin.orderDetails as any)?.forceWarning || 'Manual override will bypass state machine rules and create a priority audit log entry.'}
                                    </p>
                                </div>

                                <div className="grid grid-cols-2 gap-2">
                                    {[
                                        { status: 'CANCELLED', icon: XCircle, color: 'rose' },
                                        { status: 'RETURNED', icon: RotateCcw, color: 'orange' },
                                        { status: 'DISPUTED', icon: AlertOctagon, color: 'amber' },
                                        { status: 'COMPLETED', icon: Award, color: 'gold' }
                                    ].map((item, idx) => (
                                        <motion.button
                                            key={item.status}
                                            initial={{ opacity: 0, scale: 0.9 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            transition={{ delay: idx * 0.05 }}
                                            whileHover={{ scale: 1.05 }}
                                            whileTap={{ scale: 0.95 }}
                                            onClick={() => handleForce(item.status as StatusType)}
                                            disabled={order.status === item.status}
                                            className={`group/danger relative p-3 rounded-xl border transition-all flex flex-col items-center justify-center gap-2
                                                ${order.status === item.status
                                                    ? 'bg-white/5 border-white/5 text-white/10 cursor-not-allowed opacity-50'
                                                    : 'bg-black/60 border-red-500/20 text-red-400/70 hover:border-red-500 hover:text-white hover:bg-red-500/10 active:bg-red-500/20 shadow-lg'}`
                                            }
                                        >
                                            <item.icon size={16} className={order.status !== item.status ? "group-hover/danger:scale-125 transition-transform" : ""} />
                                            <span className="text-[10px] font-bold uppercase tracking-wider">
                                                {t.common.status[item.status as StatusType]}
                                            </span>
                                            
                                            {order.status !== item.status && (
                                                <div className="absolute top-1 right-1">
                                                    <div className="w-1 h-1 rounded-full bg-red-500 animate-ping" />
                                                </div>
                                            )}
                                        </motion.button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </GlassCard>
                </div>
            </div >

            {editingOffer && (
                <EditOfferModal
                    offer={editingOffer}
                    onClose={() => setEditingOffer(null)}
                    onSave={async (data) => {
                        try {
                            await adminUpdateOffer(editingOffer.id, data);
                            setEditingOffer(null);
                        } catch (err: any) {
                            alert(err.message);
                        }
                    }}
                />
            )}
        </div >
    );
};
