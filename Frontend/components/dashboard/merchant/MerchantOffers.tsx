

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, XCircle, Clock, Eye, SlidersHorizontal, Package, AlertTriangle } from 'lucide-react';
import { useLanguage } from '../../../contexts/LanguageContext';
import { GlassCard } from '../../ui/GlassCard';
import { useOrderStore } from '../../../stores/useOrderStore';
import { Badge } from '../../ui/Badge';
import { CountdownTimer } from '../OrderDetails';
import { getDynamicOrderDeadline, isOrderExpired } from '../../../utils/dateUtils';

interface MerchantOffersProps {
    onNavigate?: (path: string, id?: any) => void;
}

export const MerchantOffers: React.FC<MerchantOffersProps> = ({ onNavigate }) => {
    const { language } = useLanguage();
    const { orders } = useOrderStore();
    const isAr = language === 'ar';
    // Reliable storeId from backend via localStorage (cached by orders API)
    const myStoreId = localStorage.getItem('merchant_store_id') || '';

    const [activeTab, setActiveTab] = useState<'ALL' | 'PENDING' | 'ACCEPTED' | 'REJECTED'>('ALL');

    // Filter orders where this vendor has submitted an offer
    const myOffers = useMemo(() => {
        // We will display any order that has offers connected to OUR specific store.
        // The old filter was too broad and showed orders from other vendors.
        return orders.filter(o => 
            myStoreId && o.offers?.some(off => off.storeId === myStoreId)
        );
    }, [orders, myStoreId]);

    // Categorize with expiration auto-move
    const getEffectiveStatus = (order: any): string => {
        const expired = isOrderExpired(order);

        // Find my offers using the reliably-cached storeId from backend
        const storeOffers = myStoreId
            ? (order.offers?.filter((o: any) => o.storeId === myStoreId) || [])
            : []; // If storeId not yet cached, don't assume anything
        const iWon = storeOffers.some((o: any) => o.status === 'accepted');
        const iLost = storeOffers.length > 0 && storeOffers.every((o: any) => o.status === 'rejected');

        if (iLost) return 'REJECTED';

        const progressiveStates = ['AWAITING_PAYMENT', 'PREPARATION', 'SHIPPED', 'DELIVERED', 'COMPLETED', 'RETURN_REQUESTED', 'RETURN_APPROVED', 'RETURNED'];
        
        if (iWon) return 'ACCEPTED';

        // Order progressed, but we didn't win
        if (progressiveStates.includes(order.status) && !iWon) {
            return 'REJECTED';
        }

        // Time expired and still awaiting offers
        if (expired && order.status === 'AWAITING_OFFERS') {
            return 'EXPIRED';
        }

        if (['CANCELLED', 'REJECTED'].includes(order.status)) return 'REJECTED';
        
        if (order.status === 'AWAITING_PAYMENT' || (order.status === 'AWAITING_OFFERS' && order.offersCount > 0)) return 'PENDING';

        return order.status;
    };

    const filteredOffers = myOffers.filter(o => {
        const effectiveStatus = getEffectiveStatus(o);
        if (activeTab === 'ALL') return true;
        if (activeTab === 'PENDING') return effectiveStatus === 'PENDING';
        if (activeTab === 'ACCEPTED') return effectiveStatus === 'ACCEPTED';
        if (activeTab === 'REJECTED') return effectiveStatus === 'REJECTED' || effectiveStatus === 'EXPIRED';
        return true;
    });

    const tabs = [
        { id: 'ALL', label: isAr ? 'الكل' : 'All', count: myOffers.length },
        { id: 'PENDING', label: isAr ? 'بانتظار الدفع' : 'Pending', count: myOffers.filter(o => getEffectiveStatus(o) === 'PENDING').length },
        { id: 'ACCEPTED', label: isAr ? 'مقبولة' : 'Accepted', count: myOffers.filter(o => getEffectiveStatus(o) === 'ACCEPTED').length },
        { id: 'REJECTED', label: isAr ? 'مرفوضة/ملغاة' : 'Rejected/Expired', count: myOffers.filter(o => ['REJECTED', 'EXPIRED'].includes(getEffectiveStatus(o))).length },
    ];

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">

            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-1">{isAr ? 'سجل المبيعات والعروض' : 'Sales & Offers History'}</h1>
                    <p className="text-white/50 text-sm">{isAr ? 'تتبع حالة العروض التي قدمتها للعملاء' : 'Track the status of offers submitted to customers'}</p>
                </div>
            </div>

            {/* Tabs with Counts */}
            <div className="flex gap-2 border-b border-white/5 pb-1 overflow-x-auto">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={`
                    relative px-6 py-3 text-sm font-bold transition-colors whitespace-nowrap flex items-center gap-2
                    ${activeTab === tab.id ? 'text-gold-400' : 'text-white/40 hover:text-white'}
                `}
                    >
                        {tab.label}
                        {tab.count > 0 && (
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${activeTab === tab.id ? 'bg-gold-500/20 text-gold-400' : 'bg-white/10 text-white/40'}`}>
                                {tab.count}
                            </span>
                        )}
                        {activeTab === tab.id && (
                            <motion.div
                                layoutId="activeTabOffer"
                                className="absolute bottom-0 left-0 right-0 h-0.5 bg-gold-400"
                            />
                        )}
                    </button>
                ))}
            </div>

            <AnimatePresence mode="popLayout">
                <div className="grid gap-4">
                    {filteredOffers.length === 0 ? (
                        <div className="py-20 text-center border border-dashed border-white/10 rounded-2xl bg-white/5">
                            <p className="text-white/40">{isAr ? 'لا توجد عروض في هذه القائمة' : 'No offers found in this category'}</p>
                        </div>
                    ) : (
                        filteredOffers.map((offer) => {
                            const effectiveStatus = getEffectiveStatus(offer);
                            const isExpired = effectiveStatus === 'EXPIRED';

                            return (
                                <motion.div
                                    key={offer.id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                >
                                    <GlassCard className={`p-0 overflow-hidden bg-[#151310] border-white/5 hover:border-gold-500/20 transition-all group ${isExpired ? 'opacity-60' : ''}`}>
                                        <div className="p-5 flex flex-col md:flex-row justify-between items-center gap-6">

                                            <div className="flex items-center gap-4 w-full md:w-auto">
                                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border ${effectiveStatus === 'ACCEPTED'
                                                        ? 'bg-green-500/10 border-green-500/20 text-green-400'
                                                        : effectiveStatus === 'PENDING'
                                                            ? 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400'
                                                            : 'bg-red-500/10 border-red-500/20 text-red-400'
                                                    }`}>
                                                    {effectiveStatus === 'ACCEPTED' ? <CheckCircle2 size={20} /> : effectiveStatus === 'PENDING' ? <Clock size={20} /> : <XCircle size={20} />}
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <h3 className="font-bold text-white">{offer.part}</h3>
                                                        <span className="text-[10px] text-white/30 bg-white/5 px-1.5 rounded">#{offer.id}</span>
                                                        {offer.parts && offer.parts.length > 1 && (
                                                            <span className="text-[10px] text-gold-400 bg-gold-500/10 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                                                                <Package size={10} />
                                                                {offer.parts.length} {isAr ? 'قطع' : 'parts'}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className="text-sm text-white/50">{offer.car}</p>
                                                </div>
                                            </div>

                                            <div className="flex items-center justify-between w-full md:w-auto gap-8">
                                                <div className="text-center md:text-right">
                                                    <div className="text-xs text-white/40 mb-1">{isAr ? 'عرضك' : 'Your Offer'}</div>
                                                    <div className="font-mono font-bold text-gold-400 text-lg">
                                                        {(() => {
                                                            const myStoreOffers = myStoreId
                                                                ? (offer.offers?.filter((o: any) => o.storeId === myStoreId) || [])
                                                                : [];
                                                            const myLastOffer = myStoreOffers[myStoreOffers.length - 1];
                                                            return myLastOffer ? `AED ${myLastOffer.price || myLastOffer.unitPrice || '-'}` : '-';
                                                        })()}
                                                    </div>
                                                </div>

                                                <div className="text-center md:text-right min-w-[100px]">
                                                    <div className="text-xs text-white/40 mb-1">{isAr ? 'الحالة' : 'Status'}</div>
                                                    {isExpired ? (
                                                        <span className="inline-flex items-center gap-1 text-xs font-bold text-red-400 bg-red-500/10 px-2 py-1 rounded border border-red-500/20 whitespace-nowrap">
                                                            <AlertTriangle size={12} />
                                                            {isAr ? 'منتهي مهلته' : 'Expired'}
                                                        </span>
                                                    ) : effectiveStatus === 'REJECTED' ? (
                                                        <span className="inline-flex items-center gap-1 text-xs font-bold text-red-400 bg-red-500/10 px-2 py-1 rounded border border-red-500/20 whitespace-nowrap">
                                                            <XCircle size={12} />
                                                            {isAr ? 'مغلق (تم الرفض)' : 'Closed (Rejected)'}
                                                        </span>
                                                    ) : (
                                                        <Badge status={offer.status} />
                                                    )}
                                                </div>

                                                {/* Functional Eye Button */}
                                                <button
                                                    onClick={() => onNavigate?.('explore-offer', offer.id)}
                                                    className="p-2.5 hover:bg-gold-500/10 rounded-lg text-white/30 hover:text-gold-400 transition-colors border border-transparent hover:border-gold-500/20"
                                                    title={isAr ? 'عرض التفاصيل' : 'View Details'}
                                                >
                                                    <Eye size={18} />
                                                </button>
                                            </div>

                                        </div>

                                        {/* Contextual Footer Info */}
                                        {effectiveStatus === 'PENDING' && !isExpired && getDynamicOrderDeadline(offer) && (
                                            <div className="bg-yellow-500/5 px-5 py-2 flex items-center justify-between gap-2 text-xs text-yellow-500/80 border-t border-yellow-500/10">
                                                <div className="flex items-center gap-2">
                                                    <Clock size={12} />
                                                    <span>{isAr ? 'بانتظار قرار العميل لتأكيد الدفع...' : 'Waiting for customer decision to confirm payment...'}</span>
                                                </div>
                                                <CountdownTimer targetDate={getDynamicOrderDeadline(offer)!} compact={true} />
                                            </div>
                                        )}

                                        {isExpired && (
                                            <div className="bg-red-500/5 px-5 py-2 flex items-center gap-2 text-xs text-red-400/80 border-t border-red-500/10">
                                                <AlertTriangle size={12} />
                                                <span>{isAr ? 'انتهت مهلة العرض بدون قبول من العميل' : 'Offer expired without customer acceptance'}</span>
                                            </div>
                                        )}
                                        
                                        {effectiveStatus === 'REJECTED' && !isExpired && (
                                            <div className="bg-red-500/5 px-5 py-2 flex items-center gap-2 text-xs text-red-400/80 border-t border-red-500/10">
                                                <XCircle size={12} />
                                                <span>{isAr ? 'تم إغلاق العرض (ترسيته على متجر آخر أو تم إلغاؤه)' : 'Offer closed (awarded to another store or cancelled)'}</span>
                                            </div>
                                        )}
                                    </GlassCard>
                                </motion.div>
                            );
                        })
                    )}
                </div>
            </AnimatePresence>

        </div>
    );
};
