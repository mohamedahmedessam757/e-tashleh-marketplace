import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Package } from 'lucide-react';
import { useLanguage } from '../../../contexts/LanguageContext';
import type { CartItemType } from '../../../stores/useCartStore';

interface AssemblyCartHandoverBannerProps {
    items: CartItemType[];
}

export const AssemblyCartHandoverBanner: React.FC<AssemblyCartHandoverBannerProps> = ({ items }) => {
    const { t, language } = useLanguage();
    const isAr = language === 'ar';
    const sc = t.dashboard.shippingCart;

    const stats = useMemo(() => {
        const locked = items.filter((i) => i.canSelectForShipping === false);
        const selectable = items.filter((i) => i.canSelectForShipping !== false);
        const handoverPending = items.filter(
            (i) => i.handoverPending || i.fulfillmentStatus === 'VERIFICATION_SUCCESS',
        );
        return { locked: locked.length, selectable: selectable.length, handoverPending: handoverPending.length };
    }, [items]);

    const show = items.length > 0 && stats.locked > 0;

    if (!show) return null;

    const isMixed = stats.selectable > 0 && stats.locked > 0;
    const title = isMixed ? sc.handoverPendingTitleMixed : sc.handoverPendingTitle;
    const description = isMixed
        ? sc.handoverPendingDescMixed
              .replace('{ready}', String(stats.selectable))
              .replace('{waiting}', String(stats.handoverPending))
        : sc.handoverPendingDesc;

    return (
        <AnimatePresence>
            <motion.div
                key="assembly-cart-handover-banner"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.25 }}
                className="p-4 md:p-5 rounded-2xl border bg-gradient-to-r from-teal-600/15 to-teal-500/5 border-teal-500/30 flex gap-4 items-start shadow-lg"
                role="status"
                aria-live="polite"
            >
                <div className="w-11 h-11 rounded-xl bg-black/20 flex items-center justify-center shrink-0">
                    <Package size={22} className="text-teal-400" />
                </div>
                <div className="flex-1 min-w-0">
                    <p className="font-bold text-white text-sm md:text-base mb-1">{title}</p>
                    <p className="text-xs md:text-sm text-white/70 leading-relaxed">{description}</p>
                </div>
            </motion.div>
        </AnimatePresence>
    );
};
