import React, { useState, useEffect, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Package, Truck, CheckCircle2, Box, Calendar, MapPin, Printer, ArrowRight, ArrowLeft, AlertTriangle, PlayCircle, ShieldCheck, Eye, PieChart } from 'lucide-react';
import { useLanguage } from '../../../contexts/LanguageContext';
import { useOrderStore } from '../../../stores/useOrderStore';
import { useNotificationStore } from '../../../stores/useNotificationStore';
import { GlassCard } from '../../ui/GlassCard';
import { Badge, StatusType } from '../../ui/Badge';
import { OrderCountdown } from '../../ui/OrderCountdown';
import { WarrantyProtectionCard } from '../../ui/WarrantyProtectionCard';

const CarIcon = (props: any) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2" /><circle cx="7" cy="17" r="2" /><path d="M9 17h6" /><circle cx="17" cy="17" r="2" /></svg>
);

const ShippingTimer = ({ startDate, label, isAr }: { startDate: string, label: string, isAr: boolean }) => {
    const [timeLeft, setTimeLeft] = useState<{ h: number, m: number } | null>(null);
    const [isLate, setIsLate] = useState(false);

    useEffect(() => {
        const interval = setInterval(() => {
            if (!startDate) return;
            const start = new Date(startDate).getTime();
            if (isNaN(start)) return;

            const deadline = start + (24 * 60 * 60 * 1000); // 24 Hours Shipping SLA
            const now = new Date().getTime();
            const diff = deadline - now;

            if (diff <= 0) {
                setIsLate(true);
                setTimeLeft(null);
            } else {
                const h = Math.floor(diff / (1000 * 60 * 60));
                const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
                setTimeLeft({ h, m });
            }
        }, 1000);

        // Initial call
        const start = new Date(startDate).getTime();
        if (!isNaN(start)) {
            const diff = start + (24 * 60 * 60 * 1000) - new Date().getTime();
            if (diff <= 0) setIsLate(true);
            else setTimeLeft({ h: Math.floor(diff / (1000 * 60 * 60)), m: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)) });
        }

        return () => clearInterval(interval);
    }, [startDate]);

    if (isLate) {
        return null; // Per user request: Remove 'Late' (متأخر) badge
    }

    if (!timeLeft) return null;

    return (
        <div className="text-right flex flex-col items-end">
            <span className="block text-[10px] text-white/40 uppercase tracking-wider">{label}</span>
            <div className={`flex items-center gap-1 px-2 py-0.5 rounded ${timeLeft.h < 4 ? 'bg-red-500/10 text-red-400' : 'bg-green-500/10 text-green-400'}`}>
                <span className="font-mono font-bold text-xs">
                    {timeLeft.h}h {timeLeft.m}m
                </span>
            </div>
        </div>
    );
};

// Warranty Timer Calculation for Delivered state
const WarrantyProgress = ({ deliveredAt, durationStr, isAr }: { deliveredAt: string, durationStr: string, isAr: boolean }) => {
    const [progress, setProgress] = useState(100);
    const [statusText, setStatusText] = useState('');

    useEffect(() => {
        if (!deliveredAt || !durationStr) return;
        const start = new Date(deliveredAt).getTime();
        if (isNaN(start)) return;

        // Duration Mapping
        let durationDays = 0;
        if (durationStr.includes('3') && !durationStr.includes('month')) durationDays = 3;
        else if (durationStr.includes('1') && !durationStr.includes('month')) durationDays = 30;
        else if (durationStr.includes('month3')) durationDays = 90;
        else if (durationStr.includes('month6')) durationDays = 180;
        else return;

        const totalMs = durationDays * 24 * 60 * 60 * 1000;
        const end = start + totalMs;

        const update = () => {
            const now = new Date().getTime();
            const left = end - now;

            if (left <= 0) {
                setProgress(0);
                setStatusText(isAr ? 'منتهي الصلاحية' : 'Expired');
            } else {
                const percentage = Math.max(0, Math.min(100, (left / totalMs) * 100));
                setProgress(percentage);
                const daysLeft = Math.floor(left / (1000 * 60 * 60 * 24));
                const hoursLeft = Math.floor((left % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                const minsLeft = Math.floor((left % (1000 * 60 * 60)) / (1000 * 60));

                if (daysLeft > 0) {
                    setStatusText(isAr
                        ? `${daysLeft} يوم و ${hoursLeft} ساعة متبقية`
                        : `${daysLeft}d ${hoursLeft}h left`);
                } else if (hoursLeft > 0) {
                    setStatusText(isAr
                        ? `${hoursLeft} ساعة و ${minsLeft} دقيقة`
                        : `${hoursLeft}h ${minsLeft}m left`);
                } else {
                    setStatusText(isAr
                        ? `${minsLeft} دقيقة متبقية`
                        : `${minsLeft}m left`);
                }
            }
        };

        update();
        const interval = setInterval(update, 60000);
        return () => clearInterval(interval);
    }, [deliveredAt, durationStr, isAr]);

    return (
        <div className="w-full mt-3">
            <div className="flex justify-between text-[10px] text-white/50 mb-1">
                <span className="flex items-center gap-1"><ShieldCheck size={12} /> {isAr ? 'الضمان' : 'Warranty'}</span>
                <span className={progress === 0 ? 'text-red-400' : 'text-green-400 font-bold'}>{statusText}</span>
            </div>
            <div className="w-full bg-white/5 rounded-full h-1.5 overflow-hidden">
                <div className={`h-full transition-all duration-1000 ${progress > 20 ? 'bg-green-500' : progress > 0 ? 'bg-orange-500' : 'bg-red-500'}`} style={{ width: `${progress}%` }} />
            </div>
        </div>
    );
};


interface MerchantOrdersProps {
    onNavigate?: (path: string, id?: any) => void;
}

export const MerchantOrders: React.FC<MerchantOrdersProps> = ({ onNavigate }) => {
    const { t, language } = useLanguage();
    const { orders, transitionOrder } = useOrderStore();
    const { addNotification } = useNotificationStore();
    const isAr = language === 'ar';

    const [activeTab, setActiveTab] = useState<'PREPARATION' | 'SHIPPED' | 'DELIVERED' | 'RESOLUTION'>('PREPARATION');

    // Using strictly filtered orders that are in active transit or resolution states.
    const myStoreId = localStorage.getItem('merchant_store_id') || '';

    // Status groups for 2026 workflow
    const prepStatuses = [
        'PREPARATION', 'PREPARED', 'VERIFICATION', 'VERIFICATION_SUCCESS',
        'READY_FOR_SHIPPING', 'NON_MATCHING', 'CORRECTION_PERIOD',
        'CORRECTION_SUBMITTED', 'DELAYED_PREPARATION'
    ];
    const resolutionStatuses = [
        'DISPUTED', 'RETURN_REQUESTED', 'RETURN_APPROVED', 'RETURNED', 'REFUNDED', 'WARRANTY_DISPUTED'
    ];

    const activeOrders = orders.filter(o =>
        [...prepStatuses, 'SHIPPED', 'DELIVERED', 'WARRANTY_ACTIVE', 'COMPLETED', 'COLLECTING_OFFERS', 'AWAITING_OFFERS', ...resolutionStatuses].includes(o.status) &&
        myStoreId && o.offers?.some(off => off.storeId === myStoreId && off.status === 'accepted')
    );

    const preparation = activeOrders.filter(o => prepStatuses.includes(o.status));
    const shipped = activeOrders.filter(o => o.status === 'SHIPPED');
    const delivered = activeOrders.filter(o => ['DELIVERED', 'WARRANTY_ACTIVE', 'COMPLETED'].includes(o.status));
    const resolution = activeOrders.filter(o => resolutionStatuses.includes(o.status));

    // Robust field extractor
    const extractOrderInfo = (order: any) => {
        const primaryPart = order.parts?.[0]?.name || order.partName || order.part || (isAr ? 'قطعة غير محددة' : 'Unknown Part');
        const extrasCount = order.parts?.length > 1 ? order.parts.length - 1 : 0;
        const partTitle = extrasCount > 0 ? `${primaryPart} + ${extrasCount} ${t.common.others || (isAr ? 'أخرى' : 'others')}` : primaryPart;

        const hasMedia = order.parts?.some((p: any) => p.video || (p.images && p.images.length > 0)) || order.partVideo;
        const vehicle = order.vehicle ? `${order.vehicle.make} ${order.vehicle.model} ${order.vehicle.year}` : (order.vehicleMake ? `${order.vehicleMake} ${order.vehicleModel} ${order.vehicleYear}` : (order.car || (isAr ? 'مركبة غير محددة' : 'Unknown Vehicle')));

        const priceNum = Number(order.price || order.totalAmount || 0);
        const formattedPrice = isNaN(priceNum) ? '0.00' : priceNum.toLocaleString();

        return { partTitle, hasMedia, vehicle, formattedPrice };
    };

    const tabs = [
        { id: 'PREPARATION', label: t.dashboard.merchant.home.readyShip || (isAr ? 'جاهزة للشحن' : 'Ready for Shipping'), count: preparation.length, color: 'text-blue-400', bg: 'bg-blue-500/10' },
        { id: 'SHIPPED', label: t.dashboard.merchant.home.inTransit || (isAr ? 'جاري التوصيل' : 'In Transit'), count: shipped.length, color: 'text-purple-400', bg: 'bg-purple-500/10' },
        { id: 'DELIVERED', label: t.dashboard.merchant.home.delivered || (isAr ? 'تم التسليم (فترة الضمان)' : 'Delivered (Warranty)'), count: delivered.length, color: 'text-green-400', bg: 'bg-green-500/10' },
        { id: 'RESOLUTION', label: isAr ? 'المرتجعات والنزاعات' : 'Returns & Disputes', count: resolution.length, color: 'text-orange-400', bg: 'bg-orange-500/10' },
    ];

    const renderEmptyState = (tabId: string) => {
        let Icon = Box;
        let message = '';
        if (tabId === 'SHIPPED') { Icon = Truck; message = t.dashboard.merchant.shipping.noShipments || (isAr ? 'لا توجد شحنات في الطريق حالياً.' : 'No shipments currently in transit.'); }
        else if (tabId === 'DELIVERED') { Icon = CheckCircle2; message = isAr ? 'لم تقم بتسليم أي طلبات حديثاً.' : 'No items delivered recently.'; }
        else if (tabId === 'RESOLUTION') { Icon = AlertTriangle; message = isAr ? 'لا توجد نزاعات أو مرتجعات نشطة.' : 'No active disputes or returns.'; }
        else { message = t.dashboard.merchant.shipping.noReady || (isAr ? 'لا توجد طلبات في مرحلة التحضير حالياً.' : 'No orders currently in preparation.'); }

        return (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-16 border-2 border-dashed border-white/5 rounded-3xl text-center flex flex-col items-center justify-center gap-4 bg-white/2 backdrop-blur-sm">
                <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center text-white/20">
                    <Icon size={40} strokeWidth={1.5} />
                </div>
                <div className="max-w-xs">
                    <p className="text-white/40 font-medium">{message}</p>
                </div>
            </motion.div>
        );
    };

    const StatusIndicator = ({ status }: { status: string }) => {
        const config: any = {
            PREPARATION: { color: 'text-blue-400', bg: 'bg-blue-500/10', label: isAr ? 'قيد التجهيز' : 'In Preparation' },
            PREPARED: { color: 'text-blue-400', bg: 'bg-blue-500/10', label: isAr ? 'تم التجهيز' : 'Prepared' },
            VERIFICATION: { color: 'text-yellow-400', bg: 'bg-yellow-500/10', label: isAr ? 'قيد التوثيق' : 'Verification' },
            VERIFICATION_SUCCESS: { color: 'text-green-400', bg: 'bg-green-500/10', label: isAr ? 'تم التوثيق' : 'Verified' },
            READY_FOR_SHIPPING: { color: 'text-blue-400', bg: 'bg-blue-500/10', label: isAr ? 'جاهز للشحن' : 'Ready' },
            NON_MATCHING: { color: 'text-red-400', bg: 'bg-red-500/10', label: isAr ? 'غير مطابق' : 'Non-Matching' },
            CORRECTION_PERIOD: { color: 'text-orange-400', bg: 'bg-orange-500/10', label: isAr ? 'فترة تصحيح' : 'Correction' },
            PARTIALLY_SHIPPED: { color: 'text-blue-300', bg: 'bg-blue-500/10', label: isAr ? 'شحن جزئي' : 'Partially Shipped' },
            SHIPPED: { color: 'text-purple-400', bg: 'bg-purple-500/10', label: isAr ? 'جاري التوصيل' : 'In Transit' },
            DELIVERED: { color: 'text-green-400', bg: 'bg-green-500/10', label: isAr ? 'تم التسليم' : 'Delivered' },
            DISPUTED: { color: 'text-red-400', bg: 'bg-red-500/10', label: isAr ? 'نزاع نشط' : 'Disputed' },
            WARRANTY_DISPUTED: { color: 'text-red-400', bg: 'bg-red-500/10', label: isAr ? 'نزاع ضمان' : 'Warranty Dispute' },
            WARRANTY_ACTIVE: { color: 'text-emerald-400', bg: 'bg-emerald-500/10', label: isAr ? 'حماية الضمان' : 'Warranty Active' },
            COMPLETED: { color: 'text-green-400', bg: 'bg-green-500/10', label: isAr ? 'مكتمل' : 'Completed' },
            RETURN_REQUESTED: { color: 'text-orange-400', bg: 'bg-orange-500/10', label: isAr ? 'طلب إرجاع' : 'Return Requested' },
            RETURN_APPROVED: { color: 'text-green-400', bg: 'bg-green-500/10', label: isAr ? 'مقبول للإرجاع' : 'Return Approved' },
        };
        const c = config[status] || config.PREPARATION;
        return (
            <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full ${c.bg} ${c.color} text-[10px] font-bold uppercase tracking-wider border border-white/5`}>
                <span className="w-1 h-1 rounded-full bg-current animate-pulse" />
                {c.label}
            </div>
        );
    };

    const InCartBadge = ({ order, isAr }: { order: any, isAr: boolean }) => {
        const myStoreId = localStorage.getItem('merchant_store_id') || '';
        const inCart = order.offers?.some((off: any) =>
            off.storeId === myStoreId &&
            off.status === 'accepted' &&
            !off.shippedFromCart &&
            ['READY_FOR_SHIPPING', 'VERIFICATION_SUCCESS', 'PARTIALLY_SHIPPED', 'PREPARATION'].includes(order.status)
        );

        if (!inCart) return null;

        return (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gold-500/10 text-gold-400 text-[10px] font-bold uppercase tracking-wider border border-gold-500/20 shadow-[0_0_10px_rgba(234,179,8,0.1)]">
                <Box size={10} className="animate-pulse" />
                {isAr ? 'في سلة الشحن' : 'In Shipping Cart'}
            </div>
        );
    };

    const renderCard = (order: any, tabId: string) => {
        const info = extractOrderInfo(order);
        const accentColor = tabId === 'PREPARATION' ? 'blue' : tabId === 'SHIPPED' ? 'purple' : 'green';

        return (
            <motion.div layout initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.98 }} key={order.id} className="relative group">
                <GlassCard
                    onClick={() => onNavigate?.('explore-offer', order.id)}
                    className={`p-6 border border-white/5 hover:border-${accentColor}-500/30 transition-all duration-500 group overflow-hidden relative cursor-pointer h-full flex flex-col`}
                >
                    <div className={`absolute top-0 right-0 w-32 h-32 bg-${accentColor}-500/5 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none group-hover:bg-${accentColor}-500/10 transition-colors`} />
                    <div className={`absolute top-0 left-0 w-1 h-0 group-hover:h-full bg-gradient-to-b from-${accentColor}-500 to-transparent transition-all duration-500`} />

                    <div className="flex justify-between items-start mb-5">
                        <div className="flex items-center gap-3">
                            <div className={`w-12 h-12 rounded-2xl bg-${accentColor}-500/10 border border-${accentColor}-500/20 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-500`}>
                                {tabId === 'PREPARATION' ? <Box size={24} className="text-blue-400" /> : tabId === 'SHIPPED' ? <Truck size={24} className="text-purple-400" /> : <CheckCircle2 size={24} className="text-green-400" />}
                            </div>
                            <div>
                                <span className="text-gold-400 font-mono font-bold text-sm block leading-none mb-1">#{order.orderNumber || order.id}</span>
                                <div className="flex flex-wrap items-center gap-2">
                                    <StatusIndicator status={order.status} />
                                    <InCartBadge order={order} isAr={isAr} />
                                    {order.shipments?.[0] && !['CANCELLED', 'AWAITING_OFFERS', 'AWAITING_PAYMENT'].includes(order.status) && (
                                        <Badge status={order.shipments[0].status as StatusType} className="scale-75 origin-left animate-in fade-in zoom-in duration-500" />
                                    )}
                                </div>
                            </div>
                        </div>
                        <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition-all" title={t.dashboard.merchant.merchantSettings.viewDetails}>
                            <Eye size={18} />
                        </div>
                    </div>

                    <div className="space-y-4 flex-1">
                        <div>
                            <h3 className="font-bold text-white text-lg mb-1 flex items-center gap-2 line-clamp-1 group-hover:text-gold-400 transition-colors">
                                {info.partTitle}
                                {info.hasMedia && <PlayCircle size={16} className="text-gold-400/60 shrink-0" />}
                            </h3>
                            <p className="text-sm text-white/40 flex items-center gap-2">
                                <CarIcon size={14} className="shrink-0" />
                                <span className="line-clamp-1">{info.vehicle}</span>
                            </p>
                        </div>

                        {tabId === 'SHIPPED' && (
                            <div className="bg-white/5 rounded-xl p-3 border border-white/5">
                                <div className="flex items-center justify-between gap-2 mb-2">
                                    <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-purple-500" />
                                        <span className="text-[10px] text-white/40 uppercase font-bold tracking-tighter">
                                            {order.shipments?.[0]?.carrierName || order.courier || t.dashboard.merchant.shipping.processing || (isAr ? 'جاري التجهيز' : 'Processing')}
                                        </span>
                                    </div>
                                    <span className="text-[10px] text-white/60 font-mono">
                                        {order.shipments?.[0]?.trackingNumber || order.waybillNumber || '---'}
                                    </span>
                                </div>
                                <div className="w-full bg-white/5 rounded-full h-1 overflow-hidden">
                                    <motion.div
                                        initial={{ x: '-100%' }}
                                        animate={{ x: '100%' }}
                                        transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                                        className="h-full bg-gradient-to-r from-transparent via-purple-500 to-transparent w-1/2"
                                    />
                                </div>
                            </div>
                        )}

                        {tabId === 'DELIVERED' && (
                            <div className="pt-2 border-t border-white/5 mt-auto">
                                <div className="flex items-center gap-2 text-[10px] text-white/30 font-mono mb-3">
                                    <Calendar size={12} />
                                    {isAr ? 'سلمت يوم:' : 'Delivered:'} {new Date(order.deliveredAt || order.updatedAt).toLocaleDateString()}
                                    <div className="mx-2">•</div>
                                    <OrderCountdown updatedAt={order.deliveredAt || order.updatedAt} status={order.status} />
                                </div>
                                {order.warranty_end_at ? (
                                    <div className="flex justify-center mt-2">
                                        <WarrantyProtectionCard
                                            order={order}
                                            variant="compact"
                                            role="merchant"
                                        />
                                    </div>
                                ) : (
                                    <div className="text-[10px] text-white/20 text-center bg-white/2 py-2 rounded-lg border border-dashed border-white/5 italic">
                                        {isAr ? 'بدون ضمان' : 'No Warranty'}
                                    </div>
                                )}
                            </div>
                        )}

                        {tabId === 'PREPARATION' && (
                            <div className="flex items-end justify-between pt-4 border-t border-white/5 mt-auto">
                                <div>
                                    <span className="block text-[10px] text-white/30 uppercase font-bold tracking-wider mb-1">{t.dashboard.merchant.home.paidAmount || (isAr ? 'المبلغ المحصل' : 'Collected Amount')}</span>
                                    <span className="text-xl font-bold text-white font-mono">{info.formattedPrice} <span className="text-xs text-gold-400">AED</span></span>
                                </div>
                                {order.acceptedOffer?.submittedAt || order.createdAt ? (
                                    <ShippingTimer startDate={order.acceptedOffer?.submittedAt || order.createdAt} label={t.dashboard.merchant.timers.shipping_deadline || (isAr ? 'موعد الشحن' : 'Ship Within')} isAr={isAr} />
                                ) : null}
                            </div>
                        )}
                    </div>
                </GlassCard>
            </motion.div>
        );
    };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
            {/* Real-time Header */}
            <div className="relative p-8 rounded-[2.5rem] bg-gradient-to-br from-white/5 to-transparent border border-white/10 overflow-hidden group">
                <div className="absolute top-0 right-0 w-96 h-96 bg-gold-500/5 rounded-full blur-[120px] -mr-20 -mt-20 group-hover:bg-gold-500/10 transition-colors duration-1000" />
                <div className="relative flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div>
                        <div className="flex items-center gap-3 mb-3">
                            <div className="w-10 h-10 rounded-xl bg-gold-500/10 flex items-center justify-center">
                                <PieChart className="text-gold-400" size={20} />
                            </div>
                            <h1 className="text-3xl font-black text-white tracking-tight uppercase italic underline-offset-8 decoration-gold-500/20 underline">
                                {t.dashboard.merchant.headers.activeOrders || (isAr ? 'الطلبات النشطة' : 'Active Orders')}
                            </h1>
                        </div>
                        <p className="text-white/40 text-sm max-w-md font-medium">
                            {t.dashboard.merchant.home.trackingDesc || (isAr ? 'متابعة حية وحقيقية لحالة شحناتك وضمانات القطع المسلمة لعملائك.' : 'Live tracking of your shipments and active warranties for delivered items.')}
                        </p>
                    </div>

                    <div className="flex gap-4 w-full md:w-auto overflow-x-auto pb-2 md:pb-0">
                        {tabs.map(tab => (
                            <div key={tab.id} className={`${tab.bg} rounded-2xl p-4 min-w-[120px] border border-white/5 backdrop-blur-md`}>
                                <span className="block text-[10px] text-white/40 uppercase font-bold tracking-widest mb-1">{tab.label.split(' ')[0]}</span>
                                <div className="flex items-center justify-between">
                                    <span className={`text-2xl font-black ${tab.color} font-mono`}>{tab.count}</span>
                                    <div className={`w-1.5 h-1.5 rounded-full ${tab.color} animate-pulse`} />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Premium Tabs Navigation */}
            <div className="flex gap-4 p-1.5 bg-white/5 rounded-full w-fit border border-white/5 backdrop-blur-xl">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={`
                            relative px-8 py-3 text-xs font-black transition-all duration-300 rounded-full flex items-center gap-3 tracking-widest uppercase
                            ${activeTab === tab.id ? 'text-white' : 'text-white/30 hover:text-white/60'}
                        `}
                    >
                        {activeTab === tab.id && (
                            <motion.div
                                layoutId="activeTabGlow"
                                className={`absolute inset-0 rounded-full ${tab.bg} border border-${tab.id === 'PREPARATION' ? 'blue' : tab.id === 'SHIPPED' ? 'purple' : 'green'}-500/20`}
                                transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                            />
                        )}
                        <span className="relative z-10">{tab.label}</span>
                        <span className={`relative z-10 px-2 py-0.5 rounded-md text-[10px] ${activeTab === tab.id ? 'bg-white/10 text-white' : 'bg-white/5 text-white/20'}`}>
                            {tab.count}
                        </span>
                    </button>
                ))}
            </div>

            {/* Interactive Grid */}
            <AnimatePresence mode="wait">
                <motion.div
                    key={activeTab}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                >
                    {((activeTab === 'PREPARATION' && preparation.length === 0) ||
                        (activeTab === 'SHIPPED' && shipped.length === 0) ||
                        (activeTab === 'DELIVERED' && delivered.length === 0) ||
                        (activeTab === 'RESOLUTION' && resolution.length === 0)) ? (
                        renderEmptyState(activeTab)
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 auto-rows-fr">
                            {activeTab === 'PREPARATION' && preparation.map(o => renderCard(o, 'PREPARATION'))}
                            {activeTab === 'SHIPPED' && shipped.map(o => renderCard(o, 'SHIPPED'))}
                            {activeTab === 'DELIVERED' && delivered.map(o => renderCard(o, 'DELIVERED'))}
                            {activeTab === 'RESOLUTION' && resolution.map(o => renderCard(o, 'RESOLUTION'))}
                        </div>
                    )}
                </motion.div>
            </AnimatePresence>
        </div>
    );
};

// End of MerchantOrders component
