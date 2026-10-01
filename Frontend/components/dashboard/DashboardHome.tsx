
import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { GlassCard } from '../ui/GlassCard';
import { Button } from '../ui/Button';
import { Badge, StatusType } from '../ui/Badge';
import { OrderStatusCountdown } from '../ui/OrderStatusCountdown';
import { Plus, Car, ArrowRight, ArrowLeft, Clock, CheckCircle2, ChevronRight, ChevronLeft, Activity, Package, Eye } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useOrderStore } from '../../stores/useOrderStore';
import { useProfileStore } from '../../stores/useProfileStore';
import { PendingStoreReviewBanner } from './shared/PendingStoreReviewBanner';
import { PolicyChangeBanner } from '../ui/PolicyChangeBanner';
import { isAcceptedOfferStatus } from '../../utils/offerStatusHelpers';
import { formatOrderDisplayId } from '../../utils/orderDisplayId';
import {
    ACTIVE_ORDER_BUCKET,
    countOrdersByStatus,
    FEATURED_PRIORITY,
    pickFeaturedOrder,
} from '../../utils/orderStatusFilter.util';
import { CustomerActiveOrderCard } from './CustomerActiveOrderCard';

interface DashboardHomeProps {
    onNavigate: (path: string, id?: number) => void;
}

export const DashboardHome: React.FC<DashboardHomeProps> = ({ onNavigate }) => {
    const { t, language } = useLanguage();
    const { orders, fetchOrders } = useOrderStore();
    const { user } = useProfileStore();
    const [homeStatusFilter, setHomeStatusFilter] = useState<string>('ALL');

    React.useEffect(() => {
        if (!user?.id) {
            fetchOrders();
        }
    }, [user?.id, fetchOrders]);

    const isAr = language === 'ar';
    const ArrowIcon = isAr ? ArrowLeft : ArrowRight;
    const ChevronIcon = isAr ? ChevronLeft : ChevronRight;

    const activeStatuses = ACTIVE_ORDER_BUCKET as readonly string[];
    const activeOrdersCount = orders.filter((o) => activeStatuses.includes(o.status)).length;
    const completedOrdersCount = orders.filter((o) =>
        ['COMPLETED', 'DELIVERED', 'WARRANTY_ACTIVE'].includes(o.status),
    ).length;
    const totalOrdersCount = orders.length;

    const statusCounts = useMemo(() => countOrdersByStatus(orders), [orders]);

    const filteredOrders = useMemo(() => {
        if (homeStatusFilter === 'ALL') return orders;
        return orders.filter((o) => o.status === homeStatusFilter);
    }, [orders, homeStatusFilter]);

    // Realtime: if selected status disappears from the customer's orders, reset to ALL
    React.useEffect(() => {
        if (homeStatusFilter === 'ALL') return;
        if (!statusCounts.some((s) => s.status === homeStatusFilter)) {
            setHomeStatusFilter('ALL');
        }
    }, [statusCounts, homeStatusFilter]);

    const activeOrder = useMemo(() => {
        if (homeStatusFilter === 'ALL') {
            return pickFeaturedOrder(orders.filter((o) => activeStatuses.includes(o.status)))
                || pickFeaturedOrder(orders);
        }
        return pickFeaturedOrder(filteredOrders);
    }, [filteredOrders, homeStatusFilter, orders, activeStatuses]);

    const activeListOrders = useMemo(() => {
        const pool =
            homeStatusFilter === 'ALL'
                ? orders.filter((o) => activeStatuses.includes(o.status))
                : filteredOrders;
        const rank = (status: string) => {
            const idx = FEATURED_PRIORITY.indexOf(status);
            return idx === -1 ? Number.MAX_SAFE_INTEGER : idx;
        };
        const ts = (o: any) => new Date(o.updatedAt || o.createdAt || o.date || 0).getTime() || 0;
        return [...pool].sort((a, b) => rank(a.status) - rank(b.status) || ts(b) - ts(a));
    }, [filteredOrders, homeStatusFilter, orders, activeStatuses]);

    const [visibleCount, setVisibleCount] = useState(10);
    React.useEffect(() => {
        setVisibleCount(10);
    }, [homeStatusFilter]);

    const activityOrders = useMemo(() => {
        if (homeStatusFilter === 'ALL') {
            return orders.filter((o) => activeStatuses.includes(o.status)).slice(0, 3);
        }
        return filteredOrders.slice(0, 3);
    }, [filteredOrders, homeStatusFilter, orders, activeStatuses]);

    const statusLabel = (status: string) =>
        (t.common as any).status?.[status] || status;

    const getProgress = (status: StatusType) => {
        switch (status) {
            case 'COLLECTING_OFFERS': return 20;
            case 'AWAITING_SELECTION': return 30;
            case 'AWAITING_OFFERS': return 10;
            case 'AWAITING_PAYMENT': return 40;
            case 'PARTIALLY_PAID': return 45;
            case 'PREPARATION': return 50;
            case 'DELAYED_PREPARATION': return 55;
            case 'PREPARED': return 60;
            case 'VERIFICATION': return 70;
            case 'NON_MATCHING': return 72;
            case 'CORRECTION_PERIOD': return 74;
            case 'CORRECTION_SUBMITTED': return 76;
            case 'VERIFICATION_SUCCESS': return 80;
            case 'READY_FOR_SHIPPING': return 85;
            case 'PARTIALLY_SHIPPED': return 88;
            case 'SHIPPED': return 90;
            case 'DELIVERED': return 95;
            case 'WARRANTY_ACTIVE': return 98;
            case 'COMPLETED': return 100;
            case 'CANCELLED': return 0;
            default: return 0;
        }
    };

    const containerVariants = {
        hidden: { opacity: 0 },
        show: {
            opacity: 1,
            transition: { staggerChildren: 0.1 },
        },
    };

    const itemVariants = {
        hidden: { opacity: 0, y: 20 },
        show: { opacity: 1, y: 0 },
    };

    const dh = (t.dashboard as any).dashboardHome;

    return (
        <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="show"
            className="space-y-5 sm:space-y-8 min-w-0 overflow-x-clip"
        >
            <motion.div variants={itemVariants}>
                <PolicyChangeBanner audience="CUSTOMER" />
            </motion.div>

            <motion.div variants={itemVariants}>
                <PendingStoreReviewBanner onNavigate={onNavigate} />
            </motion.div>

            <motion.div variants={itemVariants} className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#A88B3E] to-[#655020] shadow-2xl group">
                <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
                <div className="absolute -right-20 -top-20 w-64 h-64 bg-white/20 rounded-full blur-3xl group-hover:bg-white/30 transition-all duration-700"></div>

                <div className="relative z-10 p-4 md:p-8 lg:p-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                    <div>
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-black/20 text-white/90 text-xs font-medium mb-3 border border-white/10 backdrop-blur-md">
                            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>
                            {t.dashboard.headers.welcome} {user?.name || (isAr ? 'مستخدم' : 'User')}
                        </div>
                        <h1 className="text-3xl md:text-4xl font-bold text-white mb-2 leading-tight">
                            {isAr ? 'هل تحتاج لقطعة غيار؟' : 'Need a spare part?'}
                        </h1>
                        <p className="text-white/80 text-sm md:text-base max-w-lg leading-relaxed">
                            {isAr
                                ? 'أنشئ طلبك الآن وسنقوم بالبحث عن أفضل العروض لك من شبكة موردينا المعتمدين حول العالم.'
                                : 'Create your request now and we will search for the best offers from our certified global suppliers.'}
                        </p>
                    </div>

                    <button
                        onClick={() => onNavigate('create-order')}
                        className="group relative w-full md:w-auto min-h-[48px] px-8 py-4 bg-white text-gold-600 rounded-xl font-bold shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-300 flex items-center justify-center gap-3"
                    >
                        <span>{t.dashboard.menu.create}</span>
                        <div className="w-8 h-8 rounded-full bg-gold-50 flex items-center justify-center group-hover:bg-gold-600 group-hover:text-white transition-colors shrink-0">
                            <Plus size={20} />
                        </div>
                    </button>
                </div>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                    { label: dh?.stats.active, value: activeOrdersCount, icon: Clock, color: 'text-gold-400', bg: 'bg-gold-500/10', border: 'border-gold-500/20', action: () => onNavigate('orders') },
                    { label: dh?.stats.completed, value: completedOrdersCount, icon: CheckCircle2, color: 'text-green-400', bg: 'bg-green-500/10', border: 'border-green-500/20', action: () => onNavigate('orders') },
                    { label: dh?.stats.totalOrders, value: totalOrdersCount, icon: Package, color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20', action: () => onNavigate('orders') },
                ].map((stat, idx) => (
                    <motion.div key={idx} variants={itemVariants}>
                        <GlassCard
                            className={`p-4 sm:p-6 flex items-center justify-between group hover:-translate-y-1 transition-transform duration-300 ${stat.bg} ${stat.border} ${stat.action ? 'cursor-pointer hover:shadow-lg' : ''}`}
                            onClick={stat.action}
                        >
                            <div>
                                <div className="text-sm text-white/60 mb-1 font-medium">{stat.label}</div>
                                <div className="text-3xl font-bold text-white flex items-baseline gap-1">
                                    {stat.value}
                                </div>
                            </div>
                            <div className={`w-12 h-12 rounded-2xl ${stat.bg} flex items-center justify-center ${stat.color} border border-white/5 group-hover:scale-110 transition-transform`}>
                                <stat.icon size={24} />
                            </div>
                        </GlassCard>
                    </motion.div>
                ))}
            </div>

            {/* Status filter chips — realtime from store orders */}
            {statusCounts.length > 0 && (
                <motion.div variants={itemVariants} className="space-y-2">
                    <div className="flex items-center gap-2 px-1">
                        <span className="text-xs font-bold text-white/40 uppercase tracking-wider">
                            {dh?.filters?.byStatus || (isAr ? 'حسب الحالة' : 'By status')}
                        </span>
                    </div>
                    <div className="flex gap-2 overflow-x-auto pb-1 custom-scrollbar px-1 min-w-0">
                        <button
                            type="button"
                            onClick={() => setHomeStatusFilter('ALL')}
                            className={`shrink-0 min-h-[44px] px-3.5 py-1.5 rounded-full text-xs font-bold border transition-all whitespace-nowrap ${
                                homeStatusFilter === 'ALL'
                                    ? 'bg-gold-500 text-black border-gold-400 shadow-[0_0_14px_rgba(196,169,92,0.45)]'
                                    : 'bg-white/5 text-white/70 border-white/10 hover:border-gold-500/40 hover:text-gold-300'
                            }`}
                        >
                            {dh?.filters?.all || (isAr ? 'الكل' : 'All')} ({totalOrdersCount})
                        </button>
                        {statusCounts.map(({ status, count }) => (
                            <button
                                key={status}
                                type="button"
                                onClick={() => setHomeStatusFilter(status)}
                                className={`shrink-0 min-h-[44px] px-3.5 py-1.5 rounded-full text-xs font-bold border transition-all whitespace-nowrap ${
                                    homeStatusFilter === status
                                        ? 'bg-gold-500 text-black border-gold-400 shadow-[0_0_14px_rgba(196,169,92,0.45)]'
                                        : 'bg-white/5 text-white/70 border-white/10 hover:border-gold-500/40 hover:text-gold-300'
                                }`}
                            >
                                {statusLabel(status)} ({count})
                            </button>
                        ))}
                    </div>
                </motion.div>
            )}

            <div className="grid lg:grid-cols-3 gap-8">
                <motion.div variants={itemVariants} className="lg:col-span-2 space-y-6">
                    <div className="flex items-center justify-between">
                        <h3 className="text-xl font-bold text-white flex items-center gap-2">
                            <span className="w-1.5 h-6 bg-gold-500 rounded-full"></span>
                            {dh?.headers.liveTracking}
                        </h3>
                        <button onClick={() => onNavigate('orders')} className="text-sm text-gold-400 hover:text-white transition-colors flex items-center gap-1">
                            {dh?.headers.viewAll}
                            <ArrowIcon size={14} />
                        </button>
                    </div>

                    {activeListOrders.length > 0 ? (
                        <div className="max-h-[min(70vh,760px)] overflow-y-auto overscroll-contain custom-scrollbar space-y-4 pe-1">
                            {activeListOrders.slice(0, visibleCount).map((order) => (
                                <CustomerActiveOrderCard
                                    key={order.id}
                                    order={order}
                                    isAr={isAr}
                                    language={language}
                                    t={t}
                                    dh={dh}
                                    getProgress={getProgress}
                                    onNavigate={onNavigate}
                                />
                            ))}
                            {activeListOrders.length > visibleCount && (
                                <button
                                    type="button"
                                    onClick={() => setVisibleCount((c) => c + 10)}
                                    className="w-full py-3 rounded-xl bg-gold-500/10 text-gold-400 font-bold text-sm hover:bg-gold-500 hover:text-black transition-all border border-gold-500/20"
                                >
                                    {isAr
                                        ? `عرض المزيد (${activeListOrders.length - visibleCount})`
                                        : `Show more (${activeListOrders.length - visibleCount})`}
                                </button>
                            )}
                        </div>
                    ) : (
                        <GlassCard className="p-4 md:p-8 flex flex-col items-center justify-center text-center bg-[#1A1814] border-white/5">
                            <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mb-4 text-white/20">
                                <CheckCircle2 size={32} />
                            </div>
                            <h3 className="text-lg font-bold text-white mb-2">
                                {homeStatusFilter !== 'ALL'
                                    ? (dh?.filters?.emptyStatus || (isAr ? 'لا طلبات في هذه الحالة' : 'No orders in this status'))
                                    : dh?.empty.noActive}
                            </h3>
                            <p className="text-white/40 text-sm mb-6">
                                {homeStatusFilter !== 'ALL'
                                    ? (dh?.filters?.emptyStatusDesc || (isAr ? 'جرّب حالة أخرى أو اختر الكل' : 'Try another status or select All'))
                                    : dh?.empty.noActiveDesc}
                            </p>
                            {homeStatusFilter === 'ALL' ? (
                                <Button variant="secondary" onClick={() => onNavigate('create-order')} size="sm">
                                    {t.dashboard.menu.create}
                                </Button>
                            ) : (
                                <Button variant="secondary" onClick={() => setHomeStatusFilter('ALL')} size="sm">
                                    {dh?.filters?.all || (isAr ? 'الكل' : 'All')}
                                </Button>
                            )}
                        </GlassCard>
                    )}
                </motion.div>

                <motion.div variants={itemVariants} className="space-y-6">
                    <GlassCard className="h-full flex flex-col min-h-[400px]">
                        <div className="p-6 border-b border-white/5 flex justify-between items-center">
                            <h3 className="font-bold text-white flex items-center gap-2">
                                <Activity size={18} className="text-gold-500" />
                                {dh?.headers.recentActivity || 'Activity'}
                            </h3>
                            <button onClick={() => onNavigate('orders')} className="text-xs text-gold-500 hover:text-gold-400 transition-colors">
                                {t.common.viewAll}
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar min-h-[100px] max-h-[300px] h-auto">
                            {activityOrders.length === 0 ? (
                                <div className="flex flex-col items-center justify-center text-white/30 space-y-2 py-8">
                                    <Activity size={32} />
                                    <span className="text-sm">{t.common.noData}</span>
                                </div>
                            ) : (
                                activityOrders.map((order, i) => (
                                    <motion.div
                                        key={order.id}
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: i * 0.1 }}
                                        onClick={() => onNavigate('order-details', order.id)}
                                        className="p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 hover:border-gold-500/30 transition-all cursor-pointer group"
                                    >
                                        <div className="flex justify-between items-start mb-2">
                                            <div>
                                                <div className="font-bold text-white text-sm group-hover:text-gold-400 transition-colors">
                                                    {order.car}
                                                </div>
                                                <div className="text-xs text-white/50">{order.part}</div>
                                            </div>
                                            <span className="text-[10px] text-white/30 font-mono">{order.date}</span>
                                        </div>

                                        <div className="flex justify-between items-center gap-2">
                                            <Badge status={order.status as StatusType} className="!text-[9px] !px-2 !py-0.5" />
                                            <div className="flex items-center gap-1.5 text-xs font-medium">
                                                {order.offersCount > 0 ? (
                                                    <span className="text-gold-400 bg-gold-500/10 px-3 py-1 rounded-lg border border-gold-500/20 flex items-center gap-1.5 font-bold">
                                                        <span>{order.offersCount}</span>
                                                        <span>{language === 'ar' ? 'عرض' : 'Offers'}</span>
                                                    </span>
                                                ) : (
                                                    <span className="text-white/30 px-2 py-0.5">{language === 'ar' ? 'بانتظار العروض' : 'Awaiting Offers'}</span>
                                                )}
                                            </div>
                                        </div>
                                    </motion.div>
                                ))
                            )}
                        </div>

                        <div className="p-4 border-t border-white/5 bg-white/5">
                            <button
                                onClick={() => onNavigate('orders')}
                                className="w-full py-2.5 rounded-lg bg-gold-500/10 text-gold-400 font-bold text-sm hover:bg-gold-500 hover:text-black transition-all border border-gold-500/20"
                            >
                                {dh?.actions.viewHistory}
                            </button>
                        </div>
                    </GlassCard>
                </motion.div>
            </div>
        </motion.div>
    );
};
