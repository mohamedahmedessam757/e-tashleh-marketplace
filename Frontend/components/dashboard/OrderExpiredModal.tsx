import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ArrowLeft, ArrowRight } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import type { OrderExpiryScenario } from '../../utils/orderExpiryHelpers';

interface OrderExpiredModalProps {
    isOpen: boolean;
    orderId: string;
    orderNumber?: string;
    partName?: string;
    variant?: OrderExpiryScenario;
    onClose: (dontShowAgain: boolean) => void;
}

export const OrderExpiredModal: React.FC<OrderExpiredModalProps> = ({
    isOpen,
    orderId,
    orderNumber,
    partName,
    variant = 'no_offers',
    onClose,
}) => {
    const { t, language } = useLanguage();
    const isRTL = language === 'ar';
    const [dontShowAgain, setDontShowAgain] = useState(false);

    const copy =
        variant === 'selection_expired'
            ? (t.dashboard.orders as any)?.selectionExpiredModal
            : t.dashboard.orders?.expiredModal;

    const containerVariants = {
        hidden: { opacity: 0, scale: 0.95, y: 20 },
        visible: {
            opacity: 1,
            scale: 1,
            y: 0,
            transition: {
                type: 'spring',
                stiffness: 300,
                damping: 30,
                staggerChildren: 0.15,
                delayChildren: 0.1,
            },
        },
        exit: { opacity: 0, scale: 0.95, y: -20, transition: { duration: 0.2 } },
    };

    const childVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } },
    };

    if (!isOpen) return null;

    const description = (copy?.desc || '')
        .replace('#{orderNumber}', orderNumber || orderId)
        .replace('({partName})', partName ? `(${partName})` : '')
        .replace(' ( )', '');

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
            >
                <motion.div
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    className="bg-[#1A1814]/95 backdrop-blur-xl rounded-[32px] w-full max-w-sm overflow-hidden shadow-[0_0_40px_rgba(239,68,68,0.15)] relative border border-red-500/20"
                >
                    <motion.div variants={childVariants} className="pt-8 pb-4 text-center">
                        <h2 className="text-xl font-bold text-white">
                            {copy?.title ||
                                (variant === 'selection_expired' ? 'Selection Expired' : 'Order Expired')}
                        </h2>
                    </motion.div>

                    <motion.div variants={childVariants} className="px-6 pb-8 space-y-6">
                        <motion.div className="flex justify-center">
                            <div className="relative w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center shadow-[inset_0_2px_10px_rgba(239,68,68,0.2)]">
                                <motion.div
                                    initial={{ scale: 0, rotate: -90 }}
                                    animate={{ scale: [0, 1.2, 1], rotate: 0 }}
                                    transition={{ duration: 0.5, delay: 0.3, type: 'spring' }}
                                >
                                    <X className="w-8 h-8 text-red-500" strokeWidth={3} />
                                </motion.div>
                                <div className="absolute inset-0 rounded-full border-2 border-red-500 opacity-20 animate-ping delay-300" />
                            </div>
                        </motion.div>

                        <motion.div className="text-center space-y-1">
                            <p className="text-white/80 font-medium text-[13px] leading-relaxed max-w-[280px] mx-auto whitespace-pre-line">
                                {description}
                            </p>
                        </motion.div>

                        <motion.div className="space-y-4">
                            <label className="flex items-center justify-center gap-2 cursor-pointer group pb-2">
                                <input
                                    type="checkbox"
                                    className="w-4 h-4 rounded border-white/20 bg-white/5 text-gold-500 focus:ring-gold-500/20"
                                    checked={dontShowAgain}
                                    onChange={(e) => setDontShowAgain(e.target.checked)}
                                />
                                <span className="text-xs text-white/50 group-hover:text-white/70 transition-colors">
                                    {copy?.dontShow || 'Do not show this message again'}
                                </span>
                            </label>

                            <button
                                type="button"
                                onClick={() => onClose(dontShowAgain)}
                                className="w-full bg-white/5 hover:bg-white/10 text-white border border-white/10 py-3.5 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2"
                            >
                                {copy?.understood || 'OK'}
                                {isRTL ? <ArrowLeft size={16} /> : <ArrowRight size={16} />}
                            </button>
                        </motion.div>
                    </motion.div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};
