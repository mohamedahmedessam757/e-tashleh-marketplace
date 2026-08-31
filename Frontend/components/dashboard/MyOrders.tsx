
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { GlassCard } from '../ui/GlassCard';
import { Badge, StatusType } from '../ui/Badge';
import { Search, Filter, Calendar, Box, ChevronRight, ChevronLeft, RefreshCw, XCircle, Trash2, CreditCard, Tag, Clock, AlertCircle } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useOrderStore } from '../../stores/useOrderStore';
import { useShipmentsStore } from '../../stores/useShipmentsStore';
import { Order } from '../../types';
import { OrderCountdown } from '../ui/OrderCountdown';
import { OrderStatusCountdown } from '../ui/OrderStatusCountdown';
import { WarrantyProtectionCard } from '../ui/WarrantyProtectionCard';
import { isOrderExpired } from '../../utils/dateUtils';
import { useProfileStore } from '../../stores/useProfileStore';
import { ShieldAlert, AlertTriangle, Info } from 'lucide-react';



interface MyOrdersProps {
    onNavigate: (path: string, id?: number) => void;
}

export const MyOrders: React.FC<MyOrdersProps> = ({ onNavigate }) => {
    const { t, language } = useLanguage();
    const isAr = language === 'ar';
    const { 
        orders, 
        isLoading: loading, 
        fetchOrders, 
        cancelOrder, 
        deleteOrder, 
        renewOrder, 
        canCancelOrder,
    } = useOrderStore();
    const { shipments, fetchShipments } = useShipmentsStore();
    const { user } = useProfileStore();

    // Filters State
    const [statusFilter, setStatusFilter] = useState<string>('ALL');
    const [offersFilter, setOffersFilter] = useState<string>('ALL');
    const [paymentFilter, setPaymentFilter] = useState<string>('ALL');
    const [searchQuery, setSearchQuery] = useState('');

    const ArrowIcon = language === 'ar' ? ChevronLeft : ChevronRight;

    useEffect(() => {
        // Realtime owned by DashboardLayout; refresh list if store is empty
        if (!user?.id) {
            fetchOrders();
        }
        fetchShipments();
    }, [user?.id, fetchOrders, fetchShipments]);



    // Filtering Logic (Matching Vue implementation)
    const filteredOrders = orders.filter(order => {
        // 1. Search
        const searchLower = searchQuery.toLowerCase();
        const matchesSearch =
            (order.part || '').toLowerCase().includes(searchLower) ||
            (order.car || '').toLowerCase().includes(searchLower) ||
            (order.orderNumber || '').toLowerCase().includes(searchLower);

        if (!matchesSearch) return false;

        // 2. Status Filter
        if (statusFilter !== 'ALL') {
            const expired = isOrderExpired(order);

            if (statusFilter === 'ACTIVE') {
                if (expired) return false;
                if (![
                    'AWAITING_OFFERS', 'COLLECTING_OFFERS', 'AWAITING_SELECTION', 'AWAITING_PAYMENT', 'PARTIALLY_PAID',
                    'PREPARATION', 'DELAYED_PREPARATION', 'PREPARED', 'VERIFICATION', 
                    'VERIFICATION_SUCCESS', 'NON_MATCHING', 'CORRECTION_PERIOD', 
                    'CORRECTION_SUBMITTED', 'READY_FOR_SHIPPING', 'SHIPPED', 'DISPUTED'
                ].includes(order.status)) return false;
            } else if (statusFilter === 'COMPLETED') {
                if (!['COMPLETED', 'DELIVERED'].includes(order.status)) return false;
            } else if (statusFilter === 'CANCELLED') {
                if (order.status !== 'CANCELLED') return false;
            } else if (statusFilter === 'PENDING') {
                if (expired) return false;
                if (order.status !== 'AWAITING_OFFERS') return false;
            }
        }

        // 3. Offers Filter
        if (offersFilter !== 'ALL') {
            const expired = isOrderExpired(order);
            const activeOffers = (order.offers?.filter(o => o.status !== 'rejected') || []);
            const hasOffers = activeOffers.length > 0;
            if (offersFilter === 'WITH_OFFERS' && !hasOffers) return false;
            if (offersFilter === 'WITHOUT_OFFERS' && hasOffers) return false;
            if (offersFilter === 'EXPIRED' && !expired) return false;
        }

        // 4. Payment Filter
        if (paymentFilter !== 'ALL') {
            const isPaid = !['AWAITING_OFFERS', 'COLLECTING_OFFERS', 'AWAITING_SELECTION', 'AWAITING_PAYMENT', 'CANCELLED', 'RETURNED'].includes(order.status);

            if (paymentFilter === 'PAID' && !isPaid) return false;
            if (paymentFilter === 'UNPAID' && !['AWAITING_OFFERS', 'COLLECTING_OFFERS', 'AWAITING_SELECTION', 'AWAITING_PAYMENT'].includes(order.status)) return false;
            if (paymentFilter === 'PARTIAL' && order.status !== 'PARTIALLY_PAID') return false;
        }

        return true;
    });

    const handleCancel = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        if (window.confirm(t.dashboard.orders.cancelConfirm || 'Are you sure you want to cancel this order?')) {
            await cancelOrder(id);
        }
    };

    // Removed handleDelete as per requirements

    return (
        <div className="space-y-8">
            {/* Header & Controls */}
            <div className="flex flex-col gap-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-white mb-2">{t.dashboard.menu.orders}</h1>
                        <p className="text-white/50 text-sm">{t.dashboard.orders.manageTitle}</p>
                    </div>
                    <div>
                        <button
                            onClick={() => fetchOrders()}
                            className="p-2 bg-white/5 hover:bg-white/10 rounded-full transition-colors"
                            title="Refresh"
                        >
                            <RefreshCw size={20} className={`text-gold-500 ${loading ? 'animate-spin' : ''}`} />
                        </button>
                    </div>
                </div>

                {/* 2026 Governance Alert: Order Restrictions */}
                {(user?.orderLimit !== undefined && user.orderLimit !== -1) && (
                    <motion.div 
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="relative overflow-hidden group"
                    >
                        <GlassCard className="p-0 border-amber-500/20 bg-amber-500/5 hover:bg-amber-500/10 transition-colors">
                            <div className="flex items-stretch">
                                <div className="w-2 bg-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.3)]"></div>
                                <div className="p-5 flex flex-col sm:flex-row items-center justify-between gap-6 w-full">
                                    <div className="flex items-center gap-5">
                                        <div className="w-12 h-12 rounded-2xl bg-amber-500/20 flex items-center justify-center text-amber-500 border border-amber-500/20 shadow-inner">
                                            <ShieldAlert size={26} className="animate-pulse" />
                                        </div>
                                        <div>
                                            <h4 className="text-base font-black text-white uppercase tracking-tight flex items-center gap-2">
                                                {isAr ? 'تنبيه: قيود نشطة على الطلبات' : 'Alert: Active Order Restrictions'}
                                                <span className="px-2 py-0.5 rounded-full bg-amber-500 text-black text-[9px] font-black">{isAr ? 'نشط' : 'ACTIVE'}</span>
                                            </h4>
                                            <p className="text-xs text-white/50 font-medium mt-1">
                                                {user.restrictionAlertMessage || (isAr 
                                                    ? `تم وضع سقف لطلباتك اليومية بحد أقصى ${user.orderLimit} طلبات.` 
                                                    : `Your account has a daily order limit of ${user.orderLimit} requests.`)}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="text-right hidden sm:block">
                                            <div className="text-[10px] font-black text-amber-500/50 uppercase tracking-widest">{isAr ? 'الحد المسموح' : 'Limit'}</div>
                                            <div className="text-lg font-black text-white">{user.orderLimit} <span className="text-[10px] text-white/30">{isAr ? 'طلبات' : 'Orders'}</span></div>
                                        </div>
                                        <div className="w-px h-8 bg-white/10 mx-2 hidden sm:block"></div>
                                        <button className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-[10px] font-black text-white/60 hover:text-white uppercase tracking-widest transition-all">
                                            {isAr ? 'التفاصيل' : 'Details'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </GlassCard>
                    </motion.div>
                )}

                {/* Filters Bar */}
                <GlassCard className="p-4 flex flex-col md:flex-row items-start md:items-end gap-5 z-20 relative">
                    <div className="flex flex-col gap-2 w-full md:w-auto">
                        <label className="text-xs font-bold text-white/50 px-1">{language === 'ar' ? 'البحث في الطلبات' : 'Search in orders'}</label>
                        <div className="relative w-full md:w-64">
                            <Search size={16} className="absolute top-1/2 -translate-y-1/2 start-3 text-white/30" />
                            <input
                                type="text"
                                placeholder={(t.dashboard.orders as any).searchPlaceholder || (language === 'ar' ? 'بحث عن الطلبات...' : 'Search orders...')}
                                className="bg-black/20 border border-white/10 rounded-xl py-2.5 ps-10 pe-4 text-sm text-white focus:outline-none focus:border-gold-500/50 w-full placeholder:text-white/20"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="flex flex-wrap gap-4 w-full md:flex-1 md:justify-end">
                        {/* Status Select */}
                        <div className="flex flex-col gap-2 w-full sm:w-auto">
                            <label className="text-xs font-bold text-white/50 px-1">{language === 'ar' ? 'فلترة حسب الحالة' : 'Filter by Status'}</label>
                            <div className="relative">
                                <Filter size={14} className="absolute top-1/2 -translate-y-1/2 start-3 text-white/40" />
                                <select
                                    value={statusFilter}
                                    onChange={(e) => setStatusFilter(e.target.value)}
                                    className="bg-black/20 border border-white/10 rounded-xl py-2.5 ps-9 pe-8 text-sm text-white focus:outline-none appearance-none cursor-pointer w-full sm:w-auto hover:border-white/20"
                                    style={{ colorScheme: 'dark' }}
                                >
                                    <option value="ALL" className="text-black bg-white">{language === 'ar' ? 'جميع الحالات' : 'All Statuses'}</option>
                                    <option value="PENDING" className="text-black bg-white">{language === 'ar' ? 'في الانتظار' : 'Pending'}</option>
                                    <option value="ACTIVE" className="text-black bg-white">{t.dashboard.orders.tabs.active}</option>
                                    <option value="COMPLETED" className="text-black bg-white">{t.dashboard.orders.tabs.completed}</option>
                                    <option value="CANCELLED" className="text-black bg-white">{language === 'ar' ? 'ملغى' : 'Cancelled'}</option>
                                </select>
                            </div>
                        </div>

                        {/* Offers Select */}
                        <div className="flex flex-col gap-2 w-full sm:w-auto">
                            <label className="text-xs font-bold text-white/50 px-1">{language === 'ar' ? 'فلترة حسب العروض' : 'Filter by Offers'}</label>
                            <div className="relative">
                                <Tag size={14} className="absolute top-1/2 -translate-y-1/2 start-3 text-white/40" />
                                <select
                                    value={offersFilter}
                                    onChange={(e) => setOffersFilter(e.target.value)}
                                    className="bg-black/20 border border-white/10 rounded-xl py-2.5 ps-9 pe-8 text-sm text-white focus:outline-none appearance-none cursor-pointer w-full sm:w-auto hover:border-white/20"
                                    style={{ colorScheme: 'dark' }}
                                >
                                    <option value="ALL" className="text-black bg-white">{language === 'ar' ? 'جميع الطلبات' : 'All Orders'}</option>
                                    <option value="WITH_OFFERS" className="text-black bg-white">{language === 'ar' ? 'طلبات بها عروض' : 'Orders with Offers'}</option>
                                    <option value="WITHOUT_OFFERS" className="text-black bg-white">{language === 'ar' ? 'طلبات بدون عروض' : 'Orders without Offers'}</option>
                                    <option value="EXPIRED" className="text-black bg-white">{language === 'ar' ? 'طلبات منتهيه الصلاحيه' : 'Expired Orders'}</option>
                                </select>
                            </div>
                        </div>

                        {/* Payment Select */}
                        <div className="flex flex-col gap-2 w-full sm:w-auto">
                            <label className="text-xs font-bold text-white/50 px-1">{language === 'ar' ? 'الدفع' : 'Payment'}</label>
                            <div className="relative">
                                <CreditCard size={14} className="absolute top-1/2 -translate-y-1/2 start-3 text-white/40" />
                                <select
                                    value={paymentFilter}
                                    onChange={(e) => setPaymentFilter(e.target.value)}
                                    className="bg-black/20 border border-white/10 rounded-xl py-2.5 ps-9 pe-8 text-sm text-white focus:outline-none appearance-none cursor-pointer w-full sm:w-auto hover:border-white/20"
                                    style={{ colorScheme: 'dark' }}
                                >
                                    <option value="ALL" className="text-black bg-white">{language === 'ar' ? 'الكل' : 'All'}</option>
                                    <option value="PAID" className="text-black bg-white">{language === 'ar' ? 'مدفوع بالكامل' : 'Paid'}</option>
                                    <option value="PARTIAL" className="text-black bg-white">{language === 'ar' ? 'مدفوع جزئيا' : 'Partially Paid'}</option>
                                    <option value="UNPAID" className="text-black bg-white">{language === 'ar' ? 'غير مدفوع' : 'Unpaid'}</option>
                                </select>
                            </div>
                        </div>
                    </div>
                </GlassCard>
            </div>

            {/* Orders List */}
            <div className="space-y-4">
                    {loading ? (
                        <div className="text-center py-20">
                            <RefreshCw className="animate-spin mx-auto text-gold-500 mb-4" size={32} />
                            <p className="text-white/50">Loading orders...</p>
                        </div>
                    ) : filteredOrders.length > 0 ? (
                        filteredOrders.map((order) => {
                            const expired = isOrderExpired(order);
                            return (
                                    <GlassCard
                                    key={order.id}
                                    enableBlur={false}
                                    className={`
                            p-6 cursor-pointer hover:border-gold-500/30 transition-all group bg-[#151310]
                            border-s-4
                            ${order.status === 'COMPLETED' ? 'border-s-green-500' :
                                            order.status === 'SHIPPED' ? 'border-s-purple-500' : 
                                                order.status === 'AWAITING_PAYMENT' ? 'border-s-orange-500' :
                                                    isOrderExpired(order) ? 'border-s-red-500' : 
                                                    ['AWAITING_OFFERS', 'COLLECTING_OFFERS'].includes(order.status) ? 'border-s-yellow-500' :
                                                            order.status === 'CANCELLED' ? 'border-s-gray-600' :
                                                                'border-s-gold-500'}
                        `}
                                    onClick={() => onNavigate('order-details', order.id)}
                                    >
                                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-6 min-w-0">

                                            <div className="flex items-start sm:items-center gap-3 sm:gap-5 min-w-0 flex-1">
                                                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                                                    <Box size={22} className="text-white/30 group-hover:text-gold-400 transition-colors sm:w-6 sm:h-6" />
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mb-1">
                                                        <span className="font-mono text-[11px] sm:text-xs text-white/40 truncate max-w-full">#{order.orderNumber}</span>
                                                        <span className="w-1 h-1 rounded-full bg-white/20 hidden xs:inline-block shrink-0"></span>
                                                        <span className="text-[11px] sm:text-xs text-white/40 flex items-center gap-1 shrink-0">
                                                            <Calendar size={12} />
                                                            {new Date(order.createdAt).toLocaleDateString()}
                                                        </span>
                                                    </div>
                                                    <h3 className="font-bold text-white text-base sm:text-lg leading-snug break-words">
                                                        {(order.parts && order.parts.length > 1)
                                                            ? (language === 'ar' ? `طلبية متعددة (${order.parts.length} قطع)` : `Multi-Part Order (${order.parts.length} items)`)
                                                            : order.part}
                                                    </h3>
                                                    <p className="text-sm text-white/60 truncate">{order.car}</p>
                                                </div>
                                            </div>

                                            <div className="flex items-start sm:items-center justify-between md:justify-end gap-3 md:gap-6 min-w-0 w-full md:w-auto">
                                                <div className="flex flex-col items-start md:items-end gap-2 min-w-0 flex-1">
                                                    {/* Always show actual status badge */}
                                                    <div className="flex flex-wrap items-center gap-2 max-w-full">
                                                        <Badge status={order.status as StatusType} />
                                                        {(() => {
                                                            const shipment = shipments.find(s => s.orderId === order.id);
                                                            if (shipment && !['CANCELLED', 'AWAITING_OFFERS', 'COLLECTING_OFFERS', 'AWAITING_SELECTION', 'AWAITING_PAYMENT'].includes(order.status)) {
                                                                return (
                                                                    <>
                                                                        <Badge status={shipment.status as StatusType} className="animate-in fade-in zoom-in duration-500" />
                                                                        <OrderStatusCountdown order={order} variant="compact" />
                                                                    </>
                                                                );
                                                            }
                                                            return null;
                                                        })()}
                                                    </div>

                                                    {['AWAITING_OFFERS', 'COLLECTING_OFFERS', 'AWAITING_SELECTION', 'AWAITING_PAYMENT', 'PARTIALLY_PAID'].includes(order.status) &&
                                                        order.status !== 'CANCELLED' &&
                                                        !expired &&
                                                        !(
                                                            order.status === 'AWAITING_SELECTION' &&
                                                            !(order.offers?.some((o) => o.status !== 'rejected'))
                                                        ) && (
                                                        <OrderStatusCountdown order={order} variant="compact" className="mt-0.5" />
                                                    )}

                                                    {order.warranty_end_at &&
                                                        (order.status === 'WARRANTY_ACTIVE' ||
                                                            order.status === 'COMPLETED') && (
                                                        <WarrantyProtectionCard
                                                            order={order}
                                                            variant="compact"
                                                        />
                                                    )}

                                                    {/* New Offers Count */}
                                                    {(() => {
                                                        const activeOffersCount = order.offers?.filter(o => o.status !== 'rejected').length || 0;
                                                        if (activeOffersCount > 0 && ['AWAITING_OFFERS', 'COLLECTING_OFFERS', 'AWAITING_SELECTION'].includes(order.status)) {
                                                            return (
                                                                <span className="text-xs font-medium text-gold-400 animate-pulse">
                                                                    {activeOffersCount} {t.dashboard.orders.newOffers}
                                                                </span>
                                                            );
                                                        }
                                                        return null;
                                                    })()}
                                                </div>

                                                <div className="flex items-center gap-2 shrink-0 self-center">
                                                    {/* Action Buttons */}
                                                    {canCancelOrder(order.id) && !expired && (
                                                        <button
                                                            onClick={(e) => handleCancel(e, order.id)}
                                                            className="p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center hover:bg-red-500/20 rounded-full text-white/30 hover:text-red-500 transition-colors"
                                                            title={t.dashboard.orders.cancelConfirm || "Cancel Order"}
                                                        >
                                                            <XCircle size={18} />
                                                        </button>
                                                    )}

                                                    <div className="w-10 h-10 sm:w-8 sm:h-8 rounded-full bg-white/5 flex items-center justify-center text-white/20 group-hover:text-white group-hover:bg-gold-500 transition-all">
                                                        <ArrowIcon size={16} />
                                                    </div>
                                                </div>
                                            </div>

                                        </div>
                                    </GlassCard>
                            );
                        })
                    ) : (
                        <div className="py-20 text-center border border-dashed border-white/10 rounded-2xl bg-white/5">
                            <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Box size={24} className="text-white/20" />
                            </div>
                            <h3 className="text-white font-bold mb-1">{t.dashboard.orders.notFound}</h3>
                            <p className="text-white/40 text-sm">{t.dashboard.orders.notFoundDesc}</p>
                        </div>
                    )}
            </div>
        </div>
    );
};
