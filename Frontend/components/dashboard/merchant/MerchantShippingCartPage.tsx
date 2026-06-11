import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingBag, PackageCheck, Info } from 'lucide-react';
import { useLanguage } from '../../../contexts/LanguageContext';
import { MerchantCartItem } from './MerchantCartItem';
import { GlassCard } from '../../ui/GlassCard';
import { useCartStore } from '../../../stores/useCartStore';
import { getCurrentUserId } from '../../../utils/auth';

export const MerchantShippingCartPage: React.FC = () => {
    const { t } = useLanguage();
    const { items, loading, fetchMerchantCartItems, subscribeToRealtime, unsubscribeFromRealtime } = useCartStore();

    useEffect(() => {
        fetchMerchantCartItems();
        subscribeToRealtime(getCurrentUserId() || undefined);
        return () => unsubscribeFromRealtime();
    }, [fetchMerchantCartItems, subscribeToRealtime, unsubscribeFromRealtime]);

    return (
        <div className="space-y-8 max-w-4xl mx-auto pb-56 md:pb-48">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                        <PackageCheck className="text-gold-500" size={32} />
                        {t.dashboard.menu.shippingCart}
                    </h1>
                    <p className="text-white/50 mt-2">{t.dashboard.merchant.shippingCart.subtitle}</p>
                </div>
                <div className="bg-white/5 px-4 py-2 rounded-lg border border-white/10">
                    <span className="text-white/60 text-sm">{t.dashboard.shippingCart.itemsInCart}: </span>
                    <span className="text-gold-500 font-bold ml-1">{items.length}</span>
                </div>
            </div>

            {/* Note for Merchant */}
            <div className="flex items-start gap-4 p-4 bg-gold-500/10 rounded-xl border border-gold-500/20 text-sm text-gold-200/90 shadow-inner">
                <Info size={20} className="shrink-0 text-gold-400 mt-0.5" />
                <div className="space-y-1">
                    <p className="font-bold">{t.dashboard.merchant.shippingCart.readOnlyNote}</p>
                    <p className="opacity-80 leading-relaxed">{t.dashboard.merchant.shippingCart.dataMaskingNote}</p>
                </div>
            </div>

            {/* Content List */}
            <div className="space-y-4">
                <AnimatePresence>
                    {items.map((item) => (
                        <motion.div
                            key={`${item.id}-${item.offerId}`}
                            layout
                            initial={{ opacity: 0, scale: 0.98, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.98, y: -10 }}
                        >
                            <MerchantCartItem item={item} />
                        </motion.div>
                    ))}
                </AnimatePresence>

                {items.length === 0 && !loading && (
                    <GlassCard className="text-center py-20 border border-dashed border-white/10">
                        <ShoppingBag className="mx-auto mb-4 text-white/20" size={48} />
                        <p className="text-white/50 font-medium mb-2">{t.dashboard.merchant.shippingCart.empty}</p>
                        <p className="text-white/30 text-sm max-w-md mx-auto">
                            {t.dashboard.merchant.shippingCart.emptyDesc}
                        </p>
                    </GlassCard>
                )}
            </div>
        </div>
    );
};
