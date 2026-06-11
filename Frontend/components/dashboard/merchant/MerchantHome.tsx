import React, { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { GlassCard } from '../../ui/GlassCard';
import { Badge, StatusType } from '../../ui/Badge';
import { TrendingUp, Package, DollarSign, Clock, CheckCircle2, Box, RefreshCcw, Activity, Zap, Star, AlertTriangle, ShieldAlert, Car, ChevronRight, ChevronLeft, ArrowRight, ArrowLeft, MessageSquare, ListChecks, FileText } from 'lucide-react';
import { useLanguage } from '../../../contexts/LanguageContext';
import { useOrderStore } from '../../../stores/useOrderStore';
import { useVendorStore } from '../../../stores/useVendorStore';
import { useNotificationStore } from '../../../stores/useNotificationStore';
import { useReviewStore } from '../../../stores/useReviewStore';
import { useResolutionStore } from '../../../stores/useResolutionStore';
import { MerchantShippingPayAlert } from './MerchantShippingPayAlert';
import {
    belongsToMerchantStore,
    getMerchantOrderProgress,
    getMerchantStatusLabel,
    isMerchantCompleted,
    isMerchantInProgress,
    isMerchantMarketplaceOpen,
    isMerchantNegotiating,
    MERCHANT_LIVE_TRACKING_STATUSES,
    MERCHANT_TERMINAL_STATUSES,
} from '../../../utils/merchantOrderBuckets';

interface MerchantHomeProps {
    onNavigate: (path: string, id?: string | number) => void;
}

export const MerchantHome: React.FC<MerchantHomeProps> = ({ onNavigate }) => {
    const { t, language } = useLanguage();
    const { orders, fetchOrders } = useOrderStore();
    const { performance, documents, vendorStatus, storeId: myStoreId, storeInfo, withdrawalsFrozen, offerLimit, dailyOfferCount, visibilityRestricted, visibilityRate, restrictionAlertMessage } = useVendorStore();
    const { addNotification, notifications } = useNotificationStore();
    const isAr = language === 'ar';
    const ChevronIcon = isAr ? ChevronLeft : ChevronRight;
    const ArrowIcon = isAr ? ArrowLeft : ArrowRight;

    // Fetch Dashboard Stats on Mount
    const { fetchDashboardStats, fetchVendorProfile } = useVendorStore();
    const { fetchImpactRules, impactRules } = useReviewStore();
    const { cases: resolutionCases, fetchMerchantCases } = useResolutionStore();
    const fetchLock = useRef(false);

    useEffect(() => {
        if (fetchLock.current) return;
        fetchLock.current = true;
        Promise.all([
            fetchDashboardStats(),
            fetchVendorProfile(),
            fetchImpactRules(),
            fetchMerchantCases(true),
            fetchOrders({ page: 1, limit: 100 }),
        ]).finally(() => fetchLock.current = false);
    }, [fetchDashboardStats, fetchVendorProfile, fetchImpactRules, fetchMerchantCases, fetchOrders]);

    // --- LOGIC: Alerts ---
    const activeAlerts = [];
    
    // 1. License Check
    const license = documents.license;
    if (license.expiryDate) {
        const today = new Date();
        const expiry = new Date(license.expiryDate);
        const diffTime = expiry.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays <= 0 || vendorStatus === 'LICENSE_EXPIRED') {
            activeAlerts.push({ 
                type: 'error', 
                title: t.dashboard.merchant.alerts.accountRestricted, 
                msg: t.dashboard.merchant.alerts.licenseExpired,
                icon: ShieldAlert
            });
        } else if (diffDays <= 30) {
            activeAlerts.push({ 
                type: 'warning', 
                title: t.dashboard.merchant.alerts.attention, 
                msg: `${t.dashboard.merchant.alerts.licenseExpiring} (${diffDays} ${t.common.days})`,
                icon: AlertTriangle
            });
        }
    }

    // 1.1 Review Queued Alert (2026 Governance)
    const hasPendingDocs = Object.values(documents).some((d: any) => d?.status === 'pending');
    const hasActiveOrders = (performance?.activeOrdersCount || 0) > 0;
    
    if (hasPendingDocs && hasActiveOrders && vendorStatus === 'ACTIVE') {
        activeAlerts.push({
            type: 'warning',
            title: isAr ? 'المراجعة الإدارية مجدولة' : 'Administrative Review Queued',
            msg: isAr 
                ? 'لقد قمت بتحديث مستنداتك. ستبدأ المراجعة الرسمية فور اكتمال طلباتك النشطة لضمان عدم توقف عملك.'
                : 'Documents updated. Formal review will begin automatically once your active orders are completed to ensure business continuity.',
            icon: Clock,
            onClick: () => onNavigate('profile')
        });
    }

    // 2. Re-upload Requests (2026 UX)
    Object.entries(documents).filter(([_, d]: any) => d?.status === 'reupload_requested').forEach(([key, d]: any) => {
        activeAlerts.push({
            type: 'error',
            title: isAr ? 'مطلوب إعادة رفع مستند!' : 'Document Re-upload Required!',
            msg: isAr 
                ? `المستند (${key.toUpperCase()}) يحتاج إلى تصحيح: ${d.reuploadMessage || (isAr ? 'يرجى مراجعة بيانات المستند.' : 'Please review document details.')}` 
                : `Document (${key.toUpperCase()}) needs correction: ${d.reuploadMessage || 'Please review document details.'}`,
            icon: ShieldAlert,
            onClick: () => onNavigate('profile')
        });
    });

    // --- LOGIC: Stats & Categories ---
    const myOrders = orders.filter(o => belongsToMerchantStore(o, myStoreId));

    // 1. New marketplace requests (open bidding — includes COLLECTING_OFFERS / AWAITING_SELECTION)
    const newRequests = orders.filter(o => {
        if (!isMerchantMarketplaceOpen(o.status)) return false;

        const d = new Date(o.createdAt || o.date);
        d.setHours(d.getHours() + 24);
        if (new Date().getTime() > d.getTime() && o.status === 'AWAITING_OFFERS') return false;

        const make = (o.vehicle?.make || o.car || '').toLowerCase();
        const model = (o.vehicle?.model || '').toLowerCase();

        const selectedMakesLower = (storeInfo?.selectedMakes || []).map((m: string) => m.toLowerCase());
        const selectedModelsLower = (storeInfo?.selectedModels || []).map((m: string) => m.toLowerCase());

        const hasMakes = selectedMakesLower.length > 0;
        const hasModels = selectedModelsLower.length > 0;

        const matchesSpecialization = !hasMakes || selectedMakesLower.some((m: string) => make.includes(m));
        const matchesModel = !hasModels || selectedModelsLower.some((m: string) => model.includes(m));

        return matchesSpecialization && matchesModel;
    }).length;
    
    // 3. Orders Awaiting Verification Alert
    const preparedOrders = myOrders.filter(o => o.status === 'PREPARED');
    preparedOrders.forEach(o => {
        activeAlerts.push({
            type: 'error', // Made red and glowing
            title: isAr ? 'توثيق حالة القطعة إلزامي!' : 'Part Verification Required!',
            msg: isAr 
                ? `طلب #${o.id} (${o.car}) تم تجهيزه. يرجى رفع التوثيق لتتمكن من تسليمه.` 
                : `Order #${o.id} (${o.car}) is prepared. Please upload verification to proceed with delivery.`,
            icon: FileText,
            onClick: () => onNavigate('explore-offer', o.id)
        });
    });

    const negotiating = myOrders.filter(o => isMerchantNegotiating(o.status)).length;
    const inProgress = myOrders.filter(o => isMerchantInProgress(o.status)).length;
    const completedCount = myOrders.filter(o => isMerchantCompleted(o.status)).length;
    
    // Rejected: Count of orders where ALL of my offers were rejected
    const rejectedCount = orders.filter(o => {
        const merchantOffers = o.offers?.filter(off => off.storeId === myStoreId) || [];
        return merchantOffers.length > 0 && merchantOffers.every(off => off.status?.toLowerCase() === 'rejected');
    }).length;

    const statsCards = [
        { label: t.dashboard.merchant.kpi.newRequests, value: newRequests, icon: Box, color: 'text-blue-400', bg: 'bg-blue-500/10' },
        { label: t.dashboard.merchant.kpi.negotiating, value: negotiating, icon: MessageSquare, color: 'text-yellow-400', bg: 'bg-yellow-500/10' },
        { label: t.dashboard.merchant.kpi.executing, value: inProgress, icon: Zap, color: 'text-orange-400', bg: 'bg-orange-500/10' },
        { label: t.dashboard.merchant.kpi.done, value: completedCount, icon: CheckCircle2, color: 'text-green-400', bg: 'bg-green-500/10' },
        { label: t.dashboard.merchant.kpi.rejected, value: rejectedCount, icon: AlertTriangle, color: 'text-red-400', bg: 'bg-red-500/10' },
    ];

    // --- Logic for Offers Summary (KPIs area) ---
    const offersSent = orders.reduce((acc, o) => acc + (o.offers?.filter(off => off.storeId === myStoreId).length || 0), 0);
    const offersAccepted = orders.reduce((acc, o) => acc + (o.offers?.filter(off => off.storeId === myStoreId && (off.status === 'accepted' || off.status === 'ACCEPTED')).length || 0), 0);
    const offersRejectedTotal = orders.reduce((acc, o) => acc + (o.offers?.filter(off => off.storeId === myStoreId && (off.status === 'rejected' || off.status === 'REJECTED')).length || 0), 0);

    const summaryCards = [
        { label: t.dashboard.merchant.kpi.offersSent, value: offersSent, icon: FileText, color: 'text-blue-400' },
        { label: t.dashboard.merchant.kpi.offersAccepted, value: offersAccepted, icon: CheckCircle2, color: 'text-green-400' },
        { label: t.dashboard.merchant.kpi.offersRejected, value: offersRejectedTotal, icon: AlertTriangle, color: 'text-red-400' }
    ];

    const liveOrder = MERCHANT_LIVE_TRACKING_STATUSES
        .map(status => myOrders.find(o => o.status === status))
        .find(Boolean) || myOrders.find(o => !MERCHANT_TERMINAL_STATUSES.includes(o.status as any));

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">
            
            {/* Header / Welcome */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#1A1814] via-[#24211B] to-[#151310] border border-white/5 shadow-2xl p-8 transition-all hover:shadow-gold-500/5 group">
                <div className="absolute top-0 right-0 w-64 h-64 bg-gold-500/5 rounded-full blur-3xl -mr-20 -mt-20 group-hover:bg-gold-500/10 transition-all duration-700" />
                <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-6">
                    <div>
                        <div className="flex items-center gap-2 mb-3">
                            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                            <span className="text-xs font-bold text-green-400/80 uppercase tracking-widest">{t.dashboard.merchant.home.online}</span>
                        </div>
                        <h1 className="text-3xl font-bold text-white mb-2">{t.dashboard.merchant.home.welcome}</h1>
                        <p className="text-white/40 text-sm max-w-md leading-relaxed">{t.dashboard.merchant.home.welcomeSub}</p>
                        
                        {/* NEW: Administrative Restriction Highlights (2026 UX) */}
                        {(withdrawalsFrozen || (offerLimit !== -1) || visibilityRestricted || restrictionAlertMessage) && (
                            <div className="flex flex-wrap gap-3 mt-6">
                                {withdrawalsFrozen && (
                                    <button 
                                        onClick={() => onNavigate('wallet')}
                                        className="px-4 py-2 bg-red-500/20 border border-red-500/30 rounded-xl flex items-center gap-2 animate-pulse hover:bg-red-500/30 transition-all cursor-pointer group/pill"
                                    >
                                        <ShieldAlert size={14} className="text-red-500 group-hover/pill:scale-110 transition-transform" />
                                        <span className="text-[10px] font-black text-red-400 uppercase tracking-widest">{isAr ? 'السحب مجمد إدارياً' : 'Payouts Frozen by Admin'}</span>
                                    </button>
                                )}
                                {offerLimit !== -1 && (
                                    <button 
                                        onClick={() => onNavigate('marketplace')}
                                        className="px-4 py-2 bg-amber-500/20 border border-amber-500/30 rounded-xl flex items-center gap-2 hover:bg-amber-500/30 transition-all cursor-pointer group/pill"
                                    >
                                        <Package size={14} className="text-amber-500 group-hover/pill:scale-110 transition-transform" />
                                        <span className="text-[10px] font-black text-amber-400 uppercase tracking-widest">
                                            {isAr ? `حد العروض: ${dailyOfferCount}/${offerLimit}` : `Offer Limit: ${dailyOfferCount}/${offerLimit}`}
                                        </span>
                                    </button>
                                )}
                                {visibilityRestricted && (
                                    <button 
                                        onClick={() => onNavigate('marketplace')}
                                        className="px-4 py-2 bg-blue-500/20 border border-blue-500/30 rounded-xl flex items-center gap-2 hover:bg-blue-500/30 transition-all cursor-pointer group/pill"
                                    >
                                        <Zap size={14} className="text-blue-500 group-hover/pill:scale-110 transition-transform" />
                                        <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">
                                            {isAr ? `الظهور: ${visibilityRate}%` : `Visibility: ${visibilityRate}%`}
                                        </span>
                                    </button>
                                )}

                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Featured Badge Logic */}
            {(() => {
                const isFeatured = impactRules.some(r => 
                    r.actionType === 'FEATURED' && 
                    r.isActive && 
                    (performance?.rating || 0) >= Number(r.minRating) && 
                    (performance?.rating || 0) <= Number(r.maxRating)
                );
                
                if (!isFeatured) return null;

                return (
                    <motion.div 
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex items-center gap-3 px-6 py-3 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl w-fit"
                    >
                        <Star size={18} className="text-emerald-400" fill="currentColor" />
                        <span className="text-xs font-black text-emerald-400 uppercase tracking-widest">{t.dashboard.merchant.reviews.featuredStore}</span>
                    </motion.div>
                );
            })()}

            {/* Reputation & Performance Overview [NEW 2026] */}
            <div className="grid lg:grid-cols-4 gap-6">
                <GlassCard 
                    onClick={() => onNavigate('reviews')}
                    className="lg:col-span-1 p-6 bg-gradient-to-br from-gold-500/10 to-transparent border-gold-500/20 flex flex-col items-center justify-center text-center cursor-pointer group hover:border-gold-500/40 transition-all"
                >
                    <div className="text-[10px] font-black text-gold-500/60 uppercase tracking-[0.2em] mb-3 group-hover:text-gold-500 transition-colors">
                        {isAr ? 'سمعة المتجر' : 'STORE REPUTATION'}
                    </div>
                    <div className="flex items-end gap-1 mb-2">
                        <span className="text-4xl font-black text-white leading-none">{(performance?.rating || 0).toFixed(1)}</span>
                        <span className="text-white/20 font-bold mb-1">/ 5.0</span>
                    </div>
                    <div className="flex gap-0.5 mb-4">
                        {[1, 2, 3, 4, 5].map(s => (
                            <Star 
                                key={s} 
                                size={14} 
                                fill={s <= Math.round(performance?.rating || 0) ? "currentColor" : "none"} 
                                className={s <= Math.round(performance?.rating || 0) ? "text-gold-500 drop-shadow-[0_0_8px_rgba(234,179,8,0.4)]" : "text-white/10"} 
                            />
                        ))}
                    </div>
                    <div className="px-4 py-1.5 rounded-full bg-gold-500/10 border border-gold-500/20 text-[10px] font-black text-gold-500 uppercase tracking-widest group-hover:bg-gold-500 group-hover:text-black transition-all">
                        {isAr ? 'عرض كل التقييمات' : 'VIEW ALL REVIEWS'}
                    </div>
                </GlassCard>

                <div className="lg:col-span-3 grid grid-cols-2 md:grid-cols-4 gap-4">
                    {statsCards.map((stat, idx) => (
                        <GlassCard key={idx} className="p-5 flex flex-col justify-between h-32 hover:border-gold-500/30 transition-all group cursor-default">
                            <div className="flex justify-between items-start">
                                <div className={`p-2.5 rounded-xl ${stat.bg} ${stat.color} group-hover:scale-110 transition-transform duration-300`}>
                                    <stat.icon size={20} />
                                </div>
                            </div>
                            <div>
                                <div className="text-2xl font-bold text-white mb-1">{stat.value}</div>
                                <div className="text-[11px] text-white/40 font-medium uppercase tracking-wider">{stat.label}</div>
                            </div>
                        </GlassCard>
                    ))}
                </div>
            </div>

            <MerchantShippingPayAlert
                cases={resolutionCases}
                onNavigate={(path, id) => onNavigate(path as any, id as any)}
            />

            {/* System Notifications / Alerts (Conditional) */}
            {activeAlerts.length > 0 && (
                <div className="space-y-4">
                    <h3 className="text-white font-bold flex items-center gap-2 text-sm uppercase tracking-widest px-1">
                        <ShieldAlert size={16} className="text-red-500" />
                        {t.dashboard.merchant.alerts.urgent}
                    </h3>
                    <div className="grid md:grid-cols-2 gap-4">
                        {activeAlerts.map((alert, idx) => (
                            <motion.div 
                                key={idx}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                onClick={alert.onClick}
                                className={`p-4 rounded-2xl border flex items-start gap-4 hover:-translate-y-0.5 transition-all duration-300 ${
                                    alert.onClick ? 'cursor-pointer' : ''
                                } ${
                                    alert.type === 'error' 
                                        ? 'bg-red-500/5 border-red-500/30 shadow-[0_0_30px_rgba(239,68,68,0.15)] hover:border-red-500/50 hover:bg-red-500/10' 
                                        : 'bg-yellow-500/5 border-yellow-500/30 shadow-[0_0_30px_rgba(234,179,8,0.1)] hover:border-yellow-500/50 hover:bg-yellow-500/10'
                                }`}
                            >
                                <div className={`p-2 rounded-xl ${alert.type === 'error' ? 'bg-red-500/10 text-red-500' : 'bg-yellow-500/10 text-yellow-500'}`}>
                                    <alert.icon size={20} />
                                </div>
                                <div className="flex-1">
                                    <h4 className="font-bold text-sm text-white mb-1">{alert.title}</h4>
                                    <p className="text-xs text-white/50 leading-relaxed">{alert.msg}</p>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>
            )}

            {/* Main Content Grid: Live Tracking & Offers Summary */}
            <div className="grid lg:grid-cols-3 gap-8">
                
                {/* Left Side: Live Tracking (Col Span 2) */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="flex items-center justify-between px-1">
                        <h3 className="text-lg font-bold text-white flex items-center gap-3">
                            <span className="w-1.5 h-6 bg-gold-500 rounded-full" />
                            {t.dashboard.merchant.marketplace.activeOffers}
                        </h3>
                    </div>

                    {liveOrder ? (
                        <GlassCard 
                            onClick={() => onNavigate('explore-offer', liveOrder.id)}
                            className="p-0 overflow-hidden bg-[#151310] border-gold-500/10 hover:border-gold-500/30 transition-all duration-500 group shadow-xl cursor-pointer"
                        >
                            <div className="p-8">
                                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
                                    <div className="flex items-center gap-5">
                                        <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-gold-500 group-hover:scale-110 transition-transform duration-500">
                                            <Car size={32} />
                                        </div>
                                        <div>
                                            <h4 className="text-2xl font-bold text-white mb-1">{liveOrder.car}</h4>
                                            <div className="flex items-center gap-3 text-sm">
                                                <span className="text-white/60">{liveOrder.part}</span>
                                                <span className="w-1 h-1 rounded-full bg-white/20" />
                                                <span className="text-gold-500/80 font-mono">#{liveOrder.id}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <Badge status={liveOrder.status as StatusType} />
                                </div>

                                <div className="space-y-6">
                                    <div>
                                        <div className="flex justify-between text-xs font-bold mb-3">
                                            <span className="text-white/40 uppercase tracking-widest">{t.dashboard.orders.status}</span>
                                            <span className="text-gold-500">{getMerchantOrderProgress(liveOrder.status)}%</span>
                                        </div>
                                        <div className="h-2.5 w-full bg-white/5 rounded-full overflow-hidden p-[1px]">
                                            <motion.div 
                                                initial={{ width: 0 }}
                                                animate={{ width: `${getMerchantOrderProgress(liveOrder.status)}%` }}
                                                className="h-full bg-gradient-to-r from-gold-600 to-gold-400 rounded-full shadow-[0_0_15px_rgba(212,175,55,0.3)]"
                                            />
                                        </div>
                                    </div>

                                    <div className="flex flex-wrap items-center gap-4 text-xs">
                                        <div className="px-3 py-1.5 rounded-lg bg-gold-500/5 border border-gold-500/10 text-gold-500/80 font-bold">
                                            {liveOrder.offersCount} {t.dashboard.merchant.marketplace.competingOffers}
                                        </div>
                                        <div className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white/40">
                                            {t.dashboard.merchant.marketplace.lastUpdate} {liveOrder.date}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <button 
                                onClick={(e) => { e.stopPropagation(); onNavigate('explore-offer', liveOrder.id); }}
                                className="w-full py-4 border-t border-white/5 bg-white/[0.02] hover:bg-white/[0.05] transition-all flex items-center justify-center gap-2 group/btn"
                            >
                                <span className="text-sm font-bold text-white/60 group-hover/btn:text-white transition-colors">{t.dashboard.merchant.marketplace.viewDetails}</span>
                                <ArrowIcon size={16} className="text-white/20 group-hover/btn:text-gold-500 transition-all group-hover/btn:translate-x-1" />
                            </button>
                        </GlassCard>
                    ) : (
                        <GlassCard className="p-12 flex flex-col items-center justify-center text-center opacity-50 grayscale">
                            <ListChecks size={48} className="text-white/10 mb-4" />
                            <p className="text-white/60 font-medium">{t.dashboard.merchant.marketplace.noActiveOffers}</p>
                        </GlassCard>
                    )}

                    {/* Offers Summary (KPIs Row Replacement) */}
                    <div className="space-y-4 pt-4">
                        <h3 className="text-sm font-bold text-white/40 uppercase tracking-[0.2em] px-1">{t.dashboard.merchant.kpi.offersSummary}</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {summaryCards.map((card, idx) => (
                                <GlassCard key={idx} className="p-6 bg-white/[0.02] border-white/5 hover:border-gold-500/20 transition-all group">
                                    <div className="flex items-center gap-4">
                                        <div className={`p-3 rounded-2xl bg-white/5 ${card.color} group-hover:scale-110 transition-transform`}>
                                            <card.icon size={24} />
                                        </div>
                                        <div>
                                            <div className="text-2xl font-bold text-white mb-0.5">{card.value}</div>
                                            <div className="text-[10px] text-white/40 font-bold uppercase tracking-wider">{card.label}</div>
                                        </div>
                                    </div>
                                </GlassCard>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Right Side: Recent Activity (Right Sidebar pattern) */}
                <div className="space-y-6">
                    <GlassCard className="h-full flex flex-col min-h-[500px] border-white/5 shadow-2xl">
                        <div className="p-6 border-b border-white/5 flex justify-between items-center">
                            <h3 className="font-bold text-white flex items-center gap-2">
                                <Activity size={18} className="text-gold-500" />
                                {t.dashboard.dashboardHome.headers.recentActivity}
                            </h3>
                            <button onClick={() => onNavigate('active-orders')} className="text-xs text-gold-500 hover:text-gold-400 transition-colors">
                                {t.common.viewAll}
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                            {myOrders.filter(o => !MERCHANT_TERMINAL_STATUSES.includes(o.status as any)).length === 0 ? (
                                <div className="flex flex-col items-center justify-center text-white/10 space-y-3 py-20">
                                    <Activity size={40} />
                                    <span className="text-sm font-medium">{t.common.noData}</span>
                                </div>
                            ) : (
                                myOrders
                                    .filter(o => !MERCHANT_TERMINAL_STATUSES.includes(o.status as any))
                                    .slice(0, 5)
                                    .map((order, i) => {
                                        const getStatusLabel = (status: string) => getMerchantStatusLabel(status, isAr);

                                        const getStatusColor = (status: string) => {
                                            if (isMerchantNegotiating(status)) return 'bg-yellow-500';
                                            if (isMerchantInProgress(status)) return 'bg-orange-500';
                                            if (isMerchantCompleted(status)) return 'bg-green-500';
                                            if (isMerchantMarketplaceOpen(status)) return 'bg-gold-500';
                                            return 'bg-gray-500';
                                        };

                                        return (
                                            <motion.div 
                                                key={i}
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: i * 0.1 }}
                                                onClick={() => onNavigate('explore-offer', order.id)}
                                                className="p-4 rounded-2xl bg-white/[0.03] border border-white/5 hover:border-gold-500/20 transition-all cursor-pointer group/item relative overflow-hidden"
                                            >
                                                <div className="flex justify-between items-start mb-3">
                                                    <div className="min-w-0">
                                                        <h5 className="text-sm font-bold text-white truncate group-hover/item:text-gold-500 transition-colors uppercase tracking-tight">{order.car}</h5>
                                                        <p className="text-[10px] text-white/40 truncate mt-0.5">{order.part}</p>
                                                    </div>
                                                    <span className="text-[9px] font-mono text-white/20">{order.date}</span>
                                                </div>

                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-2">
                                                        <div className={`w-1.5 h-1.5 rounded-full animate-pulse ${getStatusColor(order.status)}`} />
                                                        <span className="text-[11px] font-bold text-white/60">
                                                            {getStatusLabel(order.status)}
                                                        </span>
                                                    </div>
                                                    <div className="px-2 py-0.5 rounded-md bg-white/5 text-[10px] font-bold text-white/40 border border-white/5">
                                                        {order.offersCount && order.offersCount > 0 ? order.offersCount : order.offers?.length || 0} {language === 'ar' ? 'عروض' : 'Offers'}
                                                    </div>
                                                </div>
                                            </motion.div>
                                        );
                                    })
                            )}
                        </div>

                        <div className="p-6 bg-white/[0.02] border-t border-white/5">
                            <button 
                                onClick={() => onNavigate('my-offers')}
                                className="w-full py-3 rounded-xl bg-gold-500/10 text-gold-500 font-bold text-sm hover:bg-gold-500 hover:text-black transition-all border border-gold-500/20 shadow-lg"
                            >
                                {t.dashboard.merchant.marketplace.viewOffersHistory}
                            </button>
                        </div>
                    </GlassCard>
                </div>

            </div>
        </div>
    );
};
