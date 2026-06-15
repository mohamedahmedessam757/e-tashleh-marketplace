
import React from 'react';
import { motion } from 'framer-motion';
import { GlassCard } from '../ui/GlassCard';
import { Button } from '../ui/Button';
import { Badge, StatusType } from '../ui/Badge';
import { Plus, Search, Car, ArrowRight, ArrowLeft, Clock, CheckCircle2, TrendingUp, ChevronRight, ChevronLeft, Activity, Package } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useOrderStore } from '../../stores/useOrderStore';
import { useProfileStore } from '../../stores/useProfileStore';
import { PendingStoreReviewBanner } from './shared/PendingStoreReviewBanner';
import { isAcceptedOfferStatus } from '../../utils/offerStatusHelpers';

interface DashboardHomeProps {
    onNavigate: (path: string, id?: number) => void;
}

export const DashboardHome: React.FC<DashboardHomeProps> = ({ onNavigate }) => {
    const { t, language } = useLanguage();
    const { orders, fetchOrders } = useOrderStore();
    const { user } = useProfileStore();

    React.useEffect(() => {
        if (!user?.id) {
            fetchOrders();
        }
    }, [user?.id, fetchOrders]);

    const isAr = language === 'ar';
    const ArrowIcon = isAr ? ArrowLeft : ArrowRight;
    const ChevronIcon = isAr ? ChevronLeft : ChevronRight;

    // 1. Calculate Stats
    const activeStatuses = [
        'AWAITING_OFFERS', 'COLLECTING_OFFERS', 'AWAITING_SELECTION', 'AWAITING_PAYMENT', 'PARTIALLY_PAID',
        'PREPARATION', 'DELAYED_PREPARATION', 'PREPARED', 'VERIFICATION', 
        'VERIFICATION_SUCCESS', 'NON_MATCHING', 'CORRECTION_PERIOD', 
        'CORRECTION_SUBMITTED', 'READY_FOR_SHIPPING', 'PARTIALLY_SHIPPED', 'SHIPPED', 'DISPUTED'
    ];
    const activeOrdersCount = orders.filter(o => activeStatuses.includes(o.status)).length;
    const completedOrdersCount = orders.filter(o => ['COMPLETED', 'DELIVERED', 'WARRANTY_ACTIVE'].includes(o.status)).length;

    const totalOrdersCount = orders.length;

    // 2. Get the most relevant active order to show in the "Live Tracking" card
    // Priority: Shipped > Preparation > Awaiting Payment > Awaiting Offers
    const activeOrder = orders.find(o => o.status === 'SHIPPED')
        || orders.find(o => o.status === 'PARTIALLY_SHIPPED')
        || orders.find(o => o.status === 'READY_FOR_SHIPPING')
        || orders.find(o => o.status === 'VERIFICATION_SUCCESS')
        || orders.find(o => o.status === 'VERIFICATION')
        || orders.find(o => o.status === 'PREPARATION')
        || orders.find(o => o.status === 'DELAYED_PREPARATION')
        || orders.find(o => ['AWAITING_PAYMENT', 'COLLECTING_OFFERS', 'AWAITING_SELECTION', 'AWAITING_OFFERS'].includes(o.status))
        || orders.find(o => o.status === 'AWAITING_SELECTION')
        || orders.find(o => o.status === 'COLLECTING_OFFERS')
        || orders.find(o => o.status === 'AWAITING_OFFERS')
        || orders.find(o => ['NON_MATCHING', 'CORRECTION_PERIOD', 'CORRECTION_SUBMITTED', 'DISPUTED'].includes(o.status));

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
            transition: {
                staggerChildren: 0.1
            }
        }
    };

    const itemVariants = {
        hidden: { opacity: 0, y: 20 },
        show: { opacity: 1, y: 0 }
    };

    return (
        <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="show"
            className="space-y-8"
        >

            <motion.div variants={itemVariants}>
                <PendingStoreReviewBanner onNavigate={onNavigate} />
            </motion.div>

            {/* 1. Hero / Welcome Section */}
            <motion.div variants={itemVariants} className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#A88B3E] to-[#655020] shadow-2xl group">
                {/* Background Pattern */}
                <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
                <div className="absolute -right-20 -top-20 w-64 h-64 bg-white/20 rounded-full blur-3xl group-hover:bg-white/30 transition-all duration-700"></div>

                <div className="relative z-10 p-8 md:p-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
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
                        className="group relative px-8 py-4 bg-white text-gold-600 rounded-xl font-bold shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-300 flex items-center gap-3 whitespace-nowrap"
                    >
                        <span>{t.dashboard.menu.create}</span>
                        <div className="w-8 h-8 rounded-full bg-gold-50 flex items-center justify-center group-hover:bg-gold-600 group-hover:text-white transition-colors">
                            <Plus size={20} />
                        </div>
                    </button>
                </div>
            </motion.div>

            {/* 2. Quick Stats Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                    { label: (t.dashboard as any).dashboardHome?.stats.active, value: activeOrdersCount, icon: Clock, color: 'text-gold-400', bg: 'bg-gold-500/10', border: 'border-gold-500/20', action: () => onNavigate('orders') },
                    { label: (t.dashboard as any).dashboardHome?.stats.completed, value: completedOrdersCount, icon: CheckCircle2, color: 'text-green-400', bg: 'bg-green-500/10', border: 'border-green-500/20', action: () => onNavigate('orders') },
                    { label: (t.dashboard as any).dashboardHome?.stats.totalOrders, value: totalOrdersCount, icon: Package, color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20', action: () => onNavigate('orders') },
                ].map((stat, idx) => (
                    <motion.div key={idx} variants={itemVariants}>
                        <GlassCard
                            className={`p-6 flex items-center justify-between group hover:-translate-y-1 transition-transform duration-300 ${stat.bg} ${stat.border} ${stat.action ? 'cursor-pointer hover:shadow-lg' : ''}`}
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


            <div className="grid lg:grid-cols-3 gap-8">

                {/* 3. Highlighted Active Order (Left Col - Span 2) */}
                <motion.div variants={itemVariants} className="lg:col-span-2 space-y-6">
                    <div className="flex items-center justify-between">
                        <h3 className="text-xl font-bold text-white flex items-center gap-2">
                            <span className="w-1.5 h-6 bg-gold-500 rounded-full"></span>
                            {(t.dashboard as any).dashboardHome?.headers.liveTracking}
                        </h3>
                        <button onClick={() => onNavigate('orders')} className="text-sm text-gold-400 hover:text-white transition-colors flex items-center gap-1">
                            {(t.dashboard as any).dashboardHome?.headers.viewAll}
                            <ArrowIcon size={14} />
                        </button>
                    </div>

                    {/* Active Order Card */}
                    {activeOrder ? (
                        <GlassCard className="p-0 overflow-hidden bg-[#1A1814] border-gold-500/30 shadow-[0_0_30px_rgba(168,139,62,0.05)]">
                            <div className="p-6 md:p-8">
                                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                                    <div className="flex items-center gap-4">
                                        <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-white/40">
                                            <Car size={28} />
                                        </div>
                                        <div>
                                            <h4 className="text-xl font-bold text-white mb-1">{activeOrder.car}</h4>
                                            <div className="flex items-center gap-2 text-sm text-white/50">
                                                <span>{activeOrder.part}</span>
                                                <span className="w-1 h-1 rounded-full bg-white/20"></span>
                                                <span className="text-gold-400">#{activeOrder.id}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <Badge status={activeOrder.status as StatusType} />
                                </div>

                                {/* Progress Bar Visual */}
                                <div className="mb-2">
                                    <div className="flex justify-between text-xs font-bold mb-2">
                                        <span className="text-gold-400">{t.dashboard.orders.status}</span>
                                        <span className="text-white/40">{getProgress(activeOrder.status)}%</span>
                                    </div>
                                    <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                                        <motion.div
                                            initial={{ width: 0 }}
                                            animate={{ width: `${getProgress(activeOrder.status)}%` }}
                                            transition={{ duration: 1, ease: "easeOut" }}
                                            className="h-full bg-gradient-to-r from-gold-600 to-gold-400"
                                        />
                                    </div>
                                    <div className="mt-2 text-xs text-white/40 text-right">
                                        {activeOrder.date}
                                    </div>
                                    {activeOrder.requestType === 'multiple' &&
                                        (activeOrder.status === 'PARTIALLY_SHIPPED' ||
                                            (activeOrder.offers?.some(
                                                (o) =>
                                                    isAcceptedOfferStatus(o.status) &&
                                                    o.shippedFromCart,
                                            ) &&
                                                activeOrder.offers?.some(
                                                    (o) =>
                                                        isAcceptedOfferStatus(o.status) &&
                                                        !o.shippedFromCart,
                                                ))) && (
                                            <p className="mt-2 text-[10px] text-blue-300/90 font-medium">
                                                {language === 'ar'
                                                    ? 'شحن جزئي — بعض القطع في سلة التجميع'
                                                    : 'Partial shipping — some parts still in assembly cart'}
                                            </p>
                                        )}
                                </div>
                            </div>

                            <div className="bg-white/5 p-4 flex items-center justify-between border-t border-white/5 hover:bg-white/10 transition-colors cursor-pointer" onClick={() => onNavigate('order-details', activeOrder.id)}>
                                <span className="text-sm font-medium text-white/80">{(t.dashboard as any).dashboardHome?.actions.viewDetails}</span>
                                <ChevronIcon size={16} className="text-white/40" />
                            </div>
                        </GlassCard>
                    ) : (
                        <GlassCard className="p-8 flex flex-col items-center justify-center text-center bg-[#1A1814] border-white/5">
                            <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mb-4 text-white/20">
                                <CheckCircle2 size={32} />
                            </div>
                            <h3 className="text-lg font-bold text-white mb-2">{(t.dashboard as any).dashboardHome?.empty.noActive}</h3>
                            <p className="text-white/40 text-sm mb-6">{(t.dashboard as any).dashboardHome?.empty.noActiveDesc}</p>
                            <Button variant="secondary" onClick={() => onNavigate('create-order')} size="sm">
                                {t.dashboard.menu.create}
                            </Button>
                        </GlassCard>
                    )}
                </motion.div>

                {/* 4. Recent Activity (Right Col - Span 1) */}
                <motion.div variants={itemVariants} className="space-y-6">
                    <GlassCard className="h-full flex flex-col min-h-[400px]">
                        <div className="p-6 border-b border-white/5 flex justify-between items-center">
                            <h3 className="font-bold text-white flex items-center gap-2">
                                <Activity size={18} className="text-gold-500" />
                                {(t.dashboard as any).dashboardHome?.headers.recentActivity || 'Activity'}
                            </h3>
                            <button onClick={() => onNavigate('orders')} className="text-xs text-gold-500 hover:text-gold-400 transition-colors">
                                {t.common.viewAll}
                            </button>
                        </div>

                        {/* Changed h-64 to min-h-[100px] max-h-[300px] h-auto to fit content tightly */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar min-h-[100px] max-h-[300px] h-auto">
                            {orders.filter(o => activeStatuses.includes(o.status)).length === 0 ? (
                                <div className="flex flex-col items-center justify-center text-white/30 space-y-2 py-8">
                                    <Activity size={32} />
                                    <span className="text-sm">{t.common.noData}</span>
                                </div>
                            ) : (
                                orders
                                    .filter(o => activeStatuses.includes(o.status))
                                    .slice(0, 3) // STRICTLY LIMIT TO 3
                                    .map((order, i) => (
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

                                            <div className="flex justify-between items-center">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                                                    <span className="text-xs text-white/60 font-medium">Active</span>
                                                </div>

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

                        {/* Integrated Footer Button */}
                        <div className="p-4 border-t border-white/5 bg-white/5">
                            <button
                                onClick={() => onNavigate('orders')}
                                className="w-full py-2.5 rounded-lg bg-gold-500/10 text-gold-400 font-bold text-sm hover:bg-gold-500 hover:text-black transition-all border border-gold-500/20"
                            >
                                {(t.dashboard as any).dashboardHome?.actions.viewHistory}
                            </button>
                        </div>
                    </GlassCard>
                </motion.div>
            </div>
        </motion.div>
    );
};
