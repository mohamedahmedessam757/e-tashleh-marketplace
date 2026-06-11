import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Package, Truck } from 'lucide-react';
import {
    getOffersAwaitingMerchantHandover,
    getHandoverPendingMessage,
    type HandoverBannerRole,
} from '../../../utils/merchantHandoverHelpers';

interface MerchantHandoverPendingBannerProps {
    order: { offers?: any[]; parts?: any[]; orderNumber?: string; id?: string } | null | undefined;
    role: HandoverBannerRole;
    storeId?: string;
    isAr: boolean;
    className?: string;
}

export const MerchantHandoverPendingBanner: React.FC<MerchantHandoverPendingBannerProps> = ({
    order,
    role,
    storeId,
    isAr,
    className = '',
}) => {
    const pending = getOffersAwaitingMerchantHandover(order, { storeId });
    if (!pending.length) return null;

    const { title, description } = getHandoverPendingMessage(
        role,
        pending,
        isAr,
        order?.orderNumber,
    );

    const accent =
        role === 'merchant'
            ? 'from-blue-600/15 to-blue-500/5 border-blue-500/30 text-blue-300'
            : role === 'admin'
              ? 'from-amber-600/15 to-amber-500/5 border-amber-500/30 text-amber-300'
              : 'from-teal-600/15 to-teal-500/5 border-teal-500/30 text-teal-300';

    return (
        <AnimatePresence>
            <motion.div
                key={`handover-pending-${pending.map((p) => p.id).join('-')}`}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.25 }}
                className={`rounded-2xl border bg-gradient-to-r p-4 md:p-5 flex gap-4 items-start shadow-lg ${accent} ${className}`}
                role="status"
                aria-live="polite"
            >
                <div className="w-11 h-11 rounded-xl bg-black/20 flex items-center justify-center shrink-0 animate-pulse">
                    {role === 'merchant' ? (
                        <Truck size={22} className="text-blue-400" />
                    ) : (
                        <Package size={22} className={role === 'admin' ? 'text-amber-400' : 'text-teal-400'} />
                    )}
                </div>
                <div className="flex-1 min-w-0">
                    <p className="font-bold text-white text-sm md:text-base mb-1">{title}</p>
                    <p className="text-xs md:text-sm text-white/70 leading-relaxed">{description}</p>
                    {pending.length > 1 && (
                        <ul className="mt-2 space-y-1">
                            {pending.map((p) => (
                                <li
                                    key={p.id}
                                    className="text-[11px] text-white/50 flex items-center gap-1.5"
                                >
                                    <span className="w-1 h-1 rounded-full bg-current shrink-0" />
                                    {p.partName}
                                    {role === 'admin' && p.merchantName ? ` — ${p.merchantName}` : ''}
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </motion.div>
        </AnimatePresence>
    );
};
