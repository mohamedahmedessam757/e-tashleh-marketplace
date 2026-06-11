import React, { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingBag, ArrowRight, Info, PackageCheck, CheckSquare, Square } from 'lucide-react';
import { useLanguage } from '../../../contexts/LanguageContext';
import { CartItem } from './CartItem';
import { AssemblyCartHandoverBanner } from './AssemblyCartHandoverBanner';
import { GlassCard } from '../../ui/GlassCard';
import { useCartStore } from '../../../stores/useCartStore';
import { getCurrentUserId } from '../../../utils/auth';

export const ShippingCartPage: React.FC = () => {
    const { t } = useLanguage();
    const { items, loading, fetchCartItems, requestShipping, requestingShipping, subscribeToRealtime, unsubscribeFromRealtime } = useCartStore();
    
    const [selectedOfferIds, setSelectedOfferIds] = useState<string[]>([]);

    useEffect(() => {
        fetchCartItems();
        subscribeToRealtime(getCurrentUserId() || undefined);
        return () => unsubscribeFromRealtime();
    }, [fetchCartItems, subscribeToRealtime, unsubscribeFromRealtime]);

    // Reset selection when items change (e.g. after a partial shipment)
    useEffect(() => {
        setSelectedOfferIds([]);
    }, [items.length]);

    const selectableItems = useMemo(
        () => items.filter((i) => i.canSelectForShipping !== false),
        [items],
    );

    const handleSelectToggle = (offerId: string) => {
        const item = items.find((i) => i.offerId === offerId);
        if (item && item.canSelectForShipping === false) return;
        setSelectedOfferIds(prev => 
            prev.includes(offerId) 
                ? prev.filter(id => id !== offerId) 
                : [...prev, offerId]
        );
    };

    const handleSelectAll = () => {
        const selectableIds = selectableItems.map((i) => i.offerId);
        if (selectableIds.length === 0) return;
        const allSelected = selectableIds.every((id) => selectedOfferIds.includes(id));
        if (allSelected) {
            setSelectedOfferIds([]);
        } else {
            setSelectedOfferIds(selectableIds);
        }
    };

    const handleRequestShipping = async () => {
        if (selectedOfferIds.length === 0) return;
        
        // We pass offerIds for granular fulfillment
        const success = await requestShipping(undefined, selectedOfferIds);
        
        if (success) {
            // If all items were shipped, redirect. Otherwise, state refreshes via store.
            if (selectedOfferIds.length === selectableItems.length && selectableItems.length > 0) {
                window.history.pushState({ view: 'dashboard', dashboardPath: 'shipments' }, '', '/dashboard/shipments');
                window.dispatchEvent(new PopStateEvent('popstate', { state: { view: 'dashboard', dashboardPath: 'shipments' } }));
            } else {
                setSelectedOfferIds([]);
            }
        }
    };

    const totalSelectedPrice = useMemo(() => {
        return items
            .filter(i => selectedOfferIds.includes(i.offerId))
            .reduce((sum, i) => sum + (i.totalPaid || 0), 0);
    }, [items, selectedOfferIds]);

    return (
        <div className="space-y-8 max-w-4xl mx-auto pb-56 md:pb-48">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                        <PackageCheck className="text-gold-500" size={32} />
                        {t.dashboard.menu.shippingCart}
                    </h1>
                    <p className="text-white/50 mt-2">{t.dashboard.shippingCart.subtitle}</p>
                </div>
                
                <div className="flex items-center gap-3">
                    {items.length > 0 && (
                        <button 
                            onClick={handleSelectAll}
                            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white/60 hover:text-white hover:bg-white/10 transition-colors text-sm font-medium"
                        >
                            {selectableItems.length > 0 && selectableItems.every((i) => selectedOfferIds.includes(i.offerId)) ? <CheckSquare size={16} className="text-gold-500" /> : <Square size={16} />}
                            {selectableItems.length > 0 && selectableItems.every((i) => selectedOfferIds.includes(i.offerId)) ? 'إلغاء الكل' : 'تحديد الجاهز'}
                        </button>
                    )}
                    <div className="bg-white/5 px-4 py-2 rounded-lg border border-white/10">
                        <span className="text-white/60 text-sm">{t.dashboard.shippingCart.itemsInCart}: </span>
                        <span className="text-gold-500 font-bold ml-1">{items.length}</span>
                    </div>
                </div>
            </div>

            {selectedOfferIds.length > 0 && (
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl flex items-start gap-4"
                >
                    <Info className="text-blue-400 shrink-0 mt-0.5" size={20} />
                    <p className="text-sm text-white/70 leading-relaxed">
                        {t.dashboard.shippingCart.waybillBatchNote}
                    </p>
                </motion.div>
            )}

            {/* Partial Shipping Banner */}
            {selectedOfferIds.length > 0 && selectedOfferIds.length < items.length && (
                <motion.div 
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 bg-gold-500/10 border border-gold-500/20 rounded-xl flex items-start gap-4"
                >
                    <Info className="text-gold-500 shrink-0 mt-0.5" size={20} />
                    <div className="text-sm">
                        <p className="text-gold-400 font-bold mb-1">{t.dashboard.shippingCart.partialShipping}</p>
                        <p className="text-white/70 leading-relaxed">{t.dashboard.shippingCart.consolidationWarning}</p>
                    </div>
                </motion.div>
            )}

            {/* Content List */}
            <div className="space-y-4">
                <AnimatePresence mode="popLayout">
                    {items.map((item) => (
                        <motion.div
                            key={`${item.id}-${item.offerId}`}
                            layout
                            initial={{ opacity: 0, scale: 0.98, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.98, y: -10 }}
                        >
                            <CartItem 
                                item={item} 
                                isSelected={selectedOfferIds.includes(item.offerId)}
                                onSelect={handleSelectToggle}
                            />
                        </motion.div>
                    ))}
                </AnimatePresence>

                {items.length === 0 && !loading && (
                    <GlassCard className="text-center py-20 border border-dashed border-white/10">
                        <ShoppingBag className="mx-auto mb-4 text-white/20" size={48} />
                        <p className="text-white/50 font-medium mb-2">{t.dashboard.shippingCart.empty}</p>
                        <p className="text-white/30 text-sm max-w-md mx-auto">
                            {t.dashboard.shippingCart.emptyDesc}
                        </p>
                    </GlassCard>
                )}
            </div>

            {/* Bottom Floating Bar */}
            {items.length > 0 && (
                <motion.div
                    initial={{ y: 100, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    className="fixed bottom-0 left-0 right-0 bg-[#0a0f1a]/95 backdrop-blur-2xl border-t border-white/10 z-30 shadow-[0_-10px_40px_rgba(0,0,0,0.5)]"
                >
                    <div className="max-w-4xl mx-auto px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-6">
                        <div className="flex-1 w-full flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-8">
                            <div className="flex-1">
                                <div className="flex items-start gap-4 p-4 bg-blue-500/10 rounded-xl border border-blue-500/20 text-xs sm:text-sm text-blue-300/90 shadow-inner">
                                    <Info size={20} className="shrink-0 text-blue-400 mt-0.5" />
                                    <div className="space-y-1">
                                        <p className="font-bold text-blue-200">{t.dashboard.shippingCart.timerNote}</p>
                                        <p className="opacity-80 leading-relaxed font-medium">{t.dashboard.shippingCart.autoShipNote}</p>
                                    </div>
                                </div>
                            </div>
                            
                            {selectedOfferIds.length > 0 && (
                                <div className="hidden lg:block shrink-0 border-l border-white/10 pl-8">
                                    <p className="text-white/40 text-xs font-bold uppercase tracking-widest mb-1">{t.dashboard.shippingCart.batchTotal}</p>
                                    <p className="text-2xl font-black text-gold-500">{totalSelectedPrice.toFixed(2)} <span className="text-sm font-normal">AED</span></p>
                                    <p className="text-white/60 text-xs mt-1">{selectedOfferIds.length} {t.dashboard.shippingCart.itemsCount}</p>
                                </div>
                            )}
                        </div>
                        
                        <button
                            onClick={handleRequestShipping}
                            disabled={requestingShipping || selectedOfferIds.length === 0}
                            className="w-full sm:w-auto px-10 py-4 bg-gold-500 text-black font-extrabold rounded-xl hover:bg-gold-400 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-3 whitespace-nowrap shadow-[0_0_20px_rgba(168,139,62,0.3)] group"
                        >
                            <div className="flex flex-col items-center">
                                <span className="flex items-center gap-2">
                                    {requestingShipping ? t.common.loading : (
                                        selectedOfferIds.length === selectableItems.length && selectableItems.length > 0
                                        ? t.dashboard.shippingCart.requestShipping 
                                        : t.dashboard.shippingCart.shipSelected
                                    )}
                                    {!requestingShipping && <ArrowRight size={22} className="group-hover:translate-x-1 transition-transform" />}
                                </span>
                                {selectedOfferIds.length > 0 && !requestingShipping && (
                                    <span className="text-[10px] uppercase tracking-tighter opacity-70 mt-0.5">
                                        {selectedOfferIds.length} {t.dashboard.shippingCart.itemsCount} • {totalSelectedPrice.toFixed(2)} AED
                                    </span>
                                )}
                            </div>
                        </button>
                    </div>
                </motion.div>
            )}
        </div>
    );
};
