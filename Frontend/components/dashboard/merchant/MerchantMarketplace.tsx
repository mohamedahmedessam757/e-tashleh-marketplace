

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Box, Calendar, MapPin, ChevronRight, ChevronLeft, Car, AlertTriangle, FileText, Clock, Info, Shield, Truck, CheckCircle2 } from 'lucide-react';
import { useLanguage } from '../../../contexts/LanguageContext';
import { useOrderStore } from '../../../stores/useOrderStore';
import { useVendorStore } from '../../../stores/useVendorStore';
import { GlassCard } from '../../ui/GlassCard';
import { Badge } from '../../ui/Badge';
import { SubmitOfferModal } from './SubmitOfferModal';
import { CountdownTimer } from '../OrderDetails';
import { getDynamicOrderDeadline, isOrderExpired } from '../../../utils/dateUtils';
import { getActiveOffersForStore } from '../../../utils/merchantOffers';

interface MerchantMarketplaceProps {
    onNavigate?: (path: string, id?: any) => void;
}

export const MerchantMarketplace: React.FC<MerchantMarketplaceProps> = ({ onNavigate }) => {
    const { t, language } = useLanguage();
    const { orders, addOfferToOrder } = useOrderStore();
    const { vendorStatus, storeInfo, storeId, visibilityRestricted, visibilityRate, visibilityNote } = useVendorStore();
    const [searchQuery, setSearchQuery] = useState('');
    const [activeFilter, setActiveFilter] = useState('all');

    // LICENSE CHECK
    if (vendorStatus === 'LICENSE_EXPIRED') {
        return (
            <div className="flex flex-col items-center justify-center min-h-[500px] text-center space-y-6">
                <div className="w-24 h-24 bg-red-500/10 rounded-full flex items-center justify-center border border-red-500/30">
                    <AlertTriangle size={48} className="text-red-500" />
                </div>
                <div className="max-w-md">
                    <h2 className="text-2xl font-bold text-white mb-3">{t.dashboard.merchant.alerts.restricted}</h2>
                    <p className="text-white/60 leading-relaxed">
                        {t.dashboard.merchant.alerts.restrictedDesc}
                    </p>
                </div>
                <button className="px-8 py-3 bg-red-600 hover:bg-red-500 text-white rounded-xl font-bold flex items-center gap-2 transition-colors">
                    <FileText size={18} />
                    {t.dashboard.merchant.alerts.updateLicense}
                </button>
            </div>
        );
    }

    // Base active requests (excluding terminal states)
    const activeRequests = useMemo(() => {
        const terminalStates = ['COMPLETED', 'RETURNED', 'REFUNDED', 'CANCELLED'];
        return orders.filter(o => !terminalStates.includes(o.status));
    }, [orders]);

    // Compute unique car makes dynamically
    const dynamicFilters = useMemo(() => {
        const makes = new Set<string>();
        activeRequests.forEach(req => {
            const make = req.vehicle?.make || req.car;
            if (make && typeof make === 'string') makes.add(make);
        });
        const filtersArr = Array.from(makes).map(make => ({ id: make, label: make }));
        return [{ id: 'all', label: t.dashboard.merchant.marketplace.filters.all }, ...filtersArr];
    }, [activeRequests, t.dashboard.merchant.marketplace.filters.all]);

    // Search & Filter Logic
    const openRequests = activeRequests.filter(o => {
        // 1. Specialization Filtering (Relaxed & Case-Insensitive)
        const make = (o.vehicle?.make || o.car || '').toLowerCase();
        const model = (o.vehicle?.model || '').toLowerCase();
        
        const selectedMakesLower = (storeInfo?.selectedMakes || []).map((m: string) => m.toLowerCase());
        const selectedModelsLower = (storeInfo?.selectedModels || []).map((m: string) => m.toLowerCase());
        
        const hasMakes = selectedMakesLower.length > 0;
        const hasModels = selectedModelsLower.length > 0;

        // If merchant has specializations, check matching
        const matchesSpecialization = !hasMakes || selectedMakesLower.includes(make);
        const matchesModel = !hasModels || selectedModelsLower.includes(model);

        // 2. Advanced Logic: Visibility overrides
        const myOffers = getActiveOffersForStore(o.offers, storeId);
        const hasOfferByMe = myOffers.length > 0;
        const hasAcceptedByMe = myOffers.some((of: any) => of.status === 'accepted' || of.status === 'ACCEPTED');

        const partsCount = (o.parts || []).length;
        const partsWithAcceptedOffer = (o.parts || []).filter((part: any) => {
            return (o.offers || []).some((of: any) =>
                (of.orderPartId === part.id || of.order_part_id === part.id) && 
                (of.status === 'accepted' || of.status === 'ACCEPTED')
            );
        });

        // Determine if everything is taken
        const allPartsTaken = partsCount > 0
            ? partsWithAcceptedOffer.length === partsCount
            : (o.offers || []).some((of: any) => of.status === 'accepted' || of.status === 'ACCEPTED');

        const isClosedStatus = ['COMPLETED', 'DELIVERED', 'CANCELLED', 'RETURNED'].includes(o.status);
        const isExpired = isOrderExpired(o);
        
        // VISIBILITY RULES:
        // - Hide if status is definitively closed (COMPLETED etc.)
        if (isClosedStatus) return false;
        
        let shouldShowByVisibility = false;
        if (hasOfferByMe) {
            // If I have an offer, ignore expiration and specialization (to track follow-up).
            // But hide if ALL parts are taken by others AND I didn't win anything.
            shouldShowByVisibility = !(allPartsTaken && !hasAcceptedByMe);
        } else {
            // If no offer yet: MUST NOT be expired, MUST match both Make and Model specialization, and MUST have open parts
            shouldShowByVisibility = !isExpired && matchesSpecialization && matchesModel && !allPartsTaken;
        }

        if (!shouldShowByVisibility) return false;

        // 3. Standard Search filters
        const matchesSearch = (
            o.part?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            o.id?.toString().includes(searchQuery) ||
            o.car?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            make.toLowerCase().includes(searchQuery.toLowerCase())
        );

        const matchesViewFilter = (activeFilter === 'all' || make?.toLowerCase() === activeFilter.toLowerCase());

        return matchesSearch && matchesViewFilter;
    });

    const isAr = language === 'ar';
    const ArrowIcon = isAr ? ChevronLeft : ChevronRight;

    const handleOpenExplore = (request: any) => {
        if (onNavigate) {
            onNavigate('explore-offer', request.id);
        }
    };

    // Removed old filters array & CardTimer component

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
            {/* Visibility Restriction Transparency Banner [2026 Governance] */}
            {visibilityRestricted && visibilityRate < 100 && (
                <GlassCard className="bg-blue-500/10 border-blue-500/20 p-5 flex items-center justify-between gap-6">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-blue-500/20 rounded-2xl flex items-center justify-center text-blue-400">
                            <Shield size={24} />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-white mb-1">
                                {isAr ? 'تم تطبيق تحسين الرؤية' : 'Visibility Optimization Applied'}
                            </h3>
                            <p className="text-white/60 text-sm max-w-2xl">
                                {isAr 
                                    ? `متجرك حالياً في وضع الرؤية المحسنة بنسبة ${visibilityRate}%. هذا يعني أنك تشاهد مجموعة مختارة من الطلبات لضمان توازن السوق وجودة العروض.` 
                                    : `Your store is currently in ${visibilityRate}% visibility optimization mode. This means you are seeing a curated selection of orders to ensure market balance and offer quality.`}
                                {visibilityNote && <span className="block mt-1 text-blue-400/80 font-medium">Note: {visibilityNote}</span>}
                            </p>
                        </div>
                    </div>
                    <div className="hidden md:flex flex-col items-end gap-2">
                        <div className="flex items-center gap-2">
                            <div className="h-2 w-32 bg-white/5 rounded-full overflow-hidden border border-white/5">
                                <motion.div 
                                    initial={{ width: 0 }}
                                    animate={{ width: `${visibilityRate}%` }}
                                    className="h-full bg-blue-500"
                                />
                            </div>
                            <span className="text-xs font-mono text-blue-400">{visibilityRate}%</span>
                        </div>
                        <span className="text-[10px] font-black text-blue-500/60 uppercase tracking-widest">
                            {isAr ? 'تنظيم إداري' : 'Admin Regulation'}
                        </span>
                    </div>
                </GlassCard>
            )}


            {/* Header & Filter Bar */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-1">{t.dashboard.merchant.marketplace.filterTitle}</h1>
                    <p className="text-white/50 text-sm">
                        {isAr ? 'تصفح طلبات العملاء وقدم عروضك المنافسة' : 'Browse customer requests and submit competitive offers'}
                    </p>
                </div>

                <div className="flex gap-3 w-full md:w-auto">
                    <div className="relative flex-1 md:w-64">
                        <Search size={16} className="absolute top-1/2 -translate-y-1/2 left-3 text-white/30" />
                        <input
                            type="text"
                            placeholder={t.dashboard.merchant.marketplace.searchPlaceholder}
                            className="w-full bg-[#1A1814] border border-white/10 rounded-xl pl-10 pr-4 py-3 text-sm text-white focus:border-gold-500 outline-none transition-colors"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>
            </div>

            {/* Dynamic Filter Tabs */}
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-white/10">
                {dynamicFilters.map(f => (
                    <button
                        key={f.id}
                        onClick={() => setActiveFilter(f.id)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap border ${activeFilter === f.id ? 'bg-gold-500 text-white border-gold-400' : 'bg-white/5 text-white/60 hover:bg-white/10 border-white/5'}`}
                    >
                        {f.label}
                    </button>
                ))}
            </div>

            {/* Requests Feed */}
            <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
                <AnimatePresence mode="popLayout">
                    {openRequests.length > 0 ? (
                        openRequests.map((req, idx) => (
                            <motion.div
                                key={req.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                transition={{ delay: idx * 0.05 }}
                            >
                                {(() => {
                                    const myOffersOnThisOrder = getActiveOffersForStore(req.offers, storeId);
                                    const hasMyOffer = myOffersOnThisOrder.length > 0;

                                    return (
                                        <GlassCard className={`p-5 flex flex-col justify-between h-full bg-[#151310] hover:border-gold-500/30 transition-all group relative overflow-hidden ${hasMyOffer ? 'border-green-500/15' : ''}`}>
                                            {/* Top Border Indicator */}
                                            <div className={`absolute top-0 left-0 w-full h-1 ${hasMyOffer ? 'bg-green-500/40 group-hover:bg-green-500' : 'bg-gold-500/20 group-hover:bg-gold-500'} transition-colors`} />

                                            <div>
                                                <div className="flex justify-between items-start mb-4 gap-2">
                                                    <div className="flex items-center gap-3 min-w-0">
                                                        <div className={`w-10 h-10 rounded-lg border flex items-center justify-center transition-colors shrink-0 ${hasMyOffer ? 'bg-green-500/10 border-green-500/20 text-green-400' : 'bg-white/5 border-white/10 text-white/40 group-hover:text-gold-400 group-hover:bg-gold-500/10'}`}>
                                                            {hasMyOffer ? <CheckCircle2 size={20} /> : <Box size={20} />}
                                                        </div>
                                                        <div className="min-w-0">
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-[10px] text-gold-400 font-mono bg-gold-500/10 px-1.5 py-0.5 rounded border border-gold-500/10">#{req.id}</span>
                                                            </div>
                                                            <div className="text-xs text-white/40 mt-1 flex items-center gap-1">
                                                                <Calendar size={10} />
                                                                {req.date}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    {/* Timer + Badge Column (right side, no overlap) */}
                                                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                                                        <Badge status={req.status} className="scale-75 origin-right" />
                                                        {getDynamicOrderDeadline(req) && (
                                                            <CountdownTimer targetDate={getDynamicOrderDeadline(req)!} compact={true} hideExpiredText={true} />
                                                        )}
                                                        {hasMyOffer && (
                                                            <div className="bg-green-500/10 border border-green-500/20 rounded-lg px-2 py-0.5 flex items-center gap-1">
                                                                <CheckCircle2 size={10} className="text-green-400" />
                                                                <span className="text-[9px] font-bold text-green-400">
                                                                    {req.parts && req.parts.length > 1
                                                                        ? `${myOffersOnThisOrder.length}/${req.parts.length} ${isAr ? 'قطع' : 'parts'}`
                                                                        : (isAr ? 'عرض مقدم' : 'Offered')
                                                                    }
                                                                </span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>

                                        <h3 className="text-lg font-bold text-white mb-1 line-clamp-1">
                                            {req.parts && req.parts.length > 0
                                                ? (req.parts.length > 1 ? `${req.parts[0].name} + ${req.parts.length - 1} ${t.common.others || 'others'}` : req.parts[0].name)
                                                : req.part}
                                            {/* Video Indicator */}
                                            {(req.parts?.some((p: any) => p.video)) && (
                                                <span className="ml-2 inline-flex items-center justify-center p-1 rounded-full bg-gold-500/10 text-gold-500" title="Video Available">
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m22 8-6 4 6 4V8Z" /><rect width="14" height="12" x="2" y="6" rx="2" ry="2" /></svg>
                                                </span>
                                            )}
                                        </h3>
                                        <p className="text-white/60 text-sm mb-4 flex items-center gap-2">
                                            <Car size={14} />
                                            {req.vehicle ? `${req.vehicle.make} ${req.vehicle.model} ${req.vehicle.year}` : req.car}
                                        </p>

                                        <div className="space-y-2 mb-6">
                                            <div className="flex items-center gap-2 text-xs text-white/40 bg-white/5 p-2 rounded-lg">
                                                <Truck size={12} />
                                                <span className="truncate">
                                                    {req.shippingType === 'combined'
                                                        ? (isAr ? 'تجميع الطلبات' : 'Combined Delivery')
                                                        : (isAr ? 'شحن منفصل' : 'Separate Delivery')}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-2 justify-between">
                                                {(req.vin || req.vehicle?.vin) && (
                                                    <div className="text-[10px] text-white/30 font-mono px-2 py-1 bg-white/5 rounded border border-white/5">
                                                        VIN: {req.vehicle?.vin || req.vin}
                                                    </div>
                                                )}
                                                <div className="text-[10px] text-white/40 bg-white/5 px-2 py-1 rounded border border-white/5">
                                                    {req.requestType === 'multiple' ? (isAr ? 'عدة قطع' : 'Multiple Parts') : (isAr ? 'قطعة واحدة' : 'Single Part')}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <button
                                        onClick={() => handleOpenExplore(req)}
                                        className="w-full py-3 bg-white/5 hover:bg-gold-500 text-gold-400 hover:text-white border border-white/10 hover:border-gold-500 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 group/btn"
                                    >
                                        <span>{isAr ? 'استكشف العرض' : 'Explore Offer'}</span>
                                        <ArrowIcon size={16} className={`transition-transform ${isAr ? 'group-hover/btn:-translate-x-1' : 'group-hover/btn:translate-x-1'}`} />
                                    </button>
                                        </GlassCard>
                                    );
                                })()}
                            </motion.div>
                        ))
                    ) : (
                        <div className="col-span-full py-20 text-center text-white/30 border border-dashed border-white/10 rounded-2xl">
                            <Box size={40} className="mx-auto mb-4 opacity-20" />
                            <p>{t.dashboard.merchant.marketplace.noRequests}</p>
                        </div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
};
