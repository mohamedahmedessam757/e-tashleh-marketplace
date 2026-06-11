import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Bell, MessageCircle, Mail, ArrowLeft, ArrowRight } from 'lucide-react';
import { useAdminStore } from '../../../stores/useAdminStore';
import { useLanguage } from '../../../contexts/LanguageContext';

interface OrderSuccessModalProps {
    isOpen: boolean;
    orderId: string | null;
    onConfirm: () => void;
}

export const OrderSuccessModal: React.FC<OrderSuccessModalProps> = ({
    isOpen,
    onConfirm,
}) => {
    const { systemConfig } = useAdminStore();
    const { language } = useLanguage();
    const isRTL = language === 'ar';

    // Countdown State for 24 hours
    const [timeLeft, setTimeLeft] = useState(24 * 60 * 60);

    useEffect(() => {
        if (!isOpen) return;
        setTimeLeft(24 * 60 * 60);
        const interval = setInterval(() => {
            setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
        }, 1000);
        return () => clearInterval(interval);
    }, [isOpen]);

    const hours = Math.floor(timeLeft / 3600);
    const minutes = Math.floor((timeLeft % 3600) / 60);
    const seconds = timeLeft % 60;
    const pad = (num: number) => num.toString().padStart(2, '0');

    // Animation Variants
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
                delayChildren: 0.1
            }
        },
        exit: { opacity: 0, scale: 0.95, y: -20, transition: { duration: 0.2 } }
    };

    const childVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } }
    };

    const checkmarkVariants = {
        hidden: { scale: 0, opacity: 0 },
        visible: {
            scale: 1,
            opacity: 1,
            transition: { type: 'spring', stiffness: 400, damping: 20, delay: 0.2 }
        }
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
                <motion.div
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    className="bg-[#1A1814]/95 backdrop-blur-xl rounded-[32px] w-full max-w-sm overflow-hidden shadow-[0_0_40px_rgba(168,139,62,0.15)] relative border border-gold-500/20"
                >
                    {/* Header */}
                    <motion.div variants={childVariants} className="pt-8 pb-4 text-center">
                        <h2 className="text-xl font-bold text-white">
                            {isRTL ? 'تم إنشاء الطلب بنجاح' : 'Order Created Successfully'}
                        </h2>
                    </motion.div>

                    <div className="px-6 pb-8 space-y-6">
                        {/* Success Icon */}
                        <motion.div variants={checkmarkVariants} className="flex justify-center">
                            <div className="relative w-16 h-16 bg-gold-500/20 rounded-full flex items-center justify-center shadow-[inset_0_2px_10px_rgba(168,139,62,0.3)]">
                                <motion.div
                                    initial={{ scale: 0 }}
                                    animate={{ scale: [0, 1.2, 1] }}
                                    transition={{ duration: 0.5, delay: 0.3, type: "spring" }}
                                >
                                    <Check className="w-8 h-8 text-gold-400" strokeWidth={3} />
                                </motion.div>
                                {/* Ping animation behind */}
                                <div className="absolute inset-0 rounded-full border-2 border-gold-400 opacity-20 animate-ping" />
                            </div>
                        </motion.div>

                        {/* Subtitle Message */}
                        <motion.div variants={childVariants} className="text-center space-y-1">
                            <p className="text-white/80 font-medium text-[13px] leading-relaxed max-w-[260px] mx-auto">
                                {isRTL
                                    ? 'تم تلقي الطلب وجاري تلقي العروض من التجار المسجلين خلال 24 ساعة'
                                    : 'Order received and offers are being collected from registered merchants within 24 hours'}
                            </p>
                        </motion.div>

                        {/* Countdown Box */}
                        <motion.div variants={childVariants} className="bg-black/40 rounded-2xl p-4 text-center border border-white/5 shadow-inner relative overflow-hidden backdrop-blur-sm">
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-[100%] animate-[shimmer_2s_infinite]" />

                            <p className="text-gold-400/80 font-bold text-sm mb-3 relative z-10">
                                {isRTL ? 'الوقت المتبقي لاستلام العروض:' : 'Time remaining to receive offers:'}
                            </p>
                            <div className="flex justify-center items-center gap-4 text-white relative z-10" dir="ltr">
                                <div className="flex flex-col items-center">
                                    <span className="text-2xl font-bold font-mono text-gold-400">{pad(hours)}</span>
                                    <span className="text-xs font-medium mt-1 text-white/50">{isRTL ? 'س' : 'h'}</span>
                                </div>
                                <span className="text-2xl font-bold mb-4 text-white/20">:</span>
                                <div className="flex flex-col items-center">
                                    <span className="text-2xl font-bold font-mono text-gold-400">{pad(minutes)}</span>
                                    <span className="text-xs font-medium mt-1 text-white/50">{isRTL ? 'د' : 'm'}</span>
                                </div>
                                <span className="text-2xl font-bold mb-4 text-white/20">:</span>
                                <div className="flex flex-col items-center">
                                    <span className="text-2xl font-bold font-mono text-gold-400">{pad(seconds)}</span>
                                    <span className="text-xs font-medium mt-1 text-white/50">{isRTL ? 'ث' : 's'}</span>
                                </div>
                            </div>
                        </motion.div>

                        {/* Notification Info Box */}
                        <motion.div variants={childVariants} className="bg-white/5 rounded-2xl p-4 border border-white/10">
                            <div className="flex items-center gap-2 mb-3 text-gold-400 font-bold text-sm">
                                <div className="bg-gold-500/10 p-1.5 rounded-full">
                                    <Bell size={14} className="animate-pulse" />
                                </div>
                                <p className="text-white/90">{isRTL ? 'سيتم إرسال إشعارات العروض عبر:' : 'Offers notifications will be sent via:'}</p>
                            </div>

                            <div className="space-y-3">
                                <div className="flex items-center justify-between text-sm bg-black/20 p-2.5 rounded-lg border border-white/5">
                                    <div className="flex items-center gap-2 text-white/70 font-medium">
                                        {isRTL ? 'الواتساب:' : 'WhatsApp:'}
                                    </div>
                                    <div className="flex items-center gap-1.5 text-white/90 font-bold" dir="ltr">
                                        <MessageCircle size={16} className="text-green-400" />
                                        <span dir="ltr">+{systemConfig.general.supportPhone}</span>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between text-sm bg-black/20 p-2.5 rounded-lg border border-white/5">
                                    <div className="flex items-center gap-2 text-white/70 font-medium">
                                        {isRTL ? 'البريد الإلكتروني:' : 'Email:'}
                                    </div>
                                    <div className="flex items-center gap-1.5 text-white/90 font-bold">
                                        <Mail size={16} className="text-gold-400" />
                                        <span>{systemConfig.general.contactEmail}</span>
                                    </div>
                                </div>
                            </div>
                        </motion.div>

                        {/* Action Button */}
                        <motion.div variants={childVariants}>
                            <button
                                onClick={onConfirm}
                                className="w-full bg-gradient-to-r from-gold-600 to-gold-400 hover:from-gold-500 hover:to-gold-300 text-white py-4 rounded-xl font-bold text-lg transition-all flex items-center justify-center gap-2 shadow-[0_4px_15px_rgba(168,139,62,0.4)] hover:shadow-[0_6px_20px_rgba(168,139,62,0.5)] active:scale-[0.98]"
                            >
                                {isRTL ? (
                                    <>
                                        موافق <ArrowLeft size={20} className="animate-bounce-x-reverse" />
                                    </>
                                ) : (
                                    <>
                                        OK <ArrowRight size={20} className="animate-bounce-x" />
                                    </>
                                )}
                            </button>
                        </motion.div>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};
