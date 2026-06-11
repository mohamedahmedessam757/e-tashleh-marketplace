
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, UploadCloud, Truck, Calendar, FileText, CheckCircle2, Loader2, AlertCircle } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useOrderStore } from '../../stores/useOrderStore';
import { useNotificationStore } from '../../stores/useNotificationStore';

interface WaybillUploadModalProps {
    isOpen: boolean;
    onClose: () => void;
    orderId: number;
}

export const WaybillUploadModal: React.FC<WaybillUploadModalProps> = ({ isOpen, onClose, orderId }) => {
    const { t, language } = useLanguage();
    const { transitionOrder } = useOrderStore(); // Use transitionOrder
    const { addNotification } = useNotificationStore();

    const [courier, setCourier] = useState('');
    const [waybillNumber, setWaybillNumber] = useState('');
    const [deliveryDate, setDeliveryDate] = useState('');
    const [file, setFile] = useState<File | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Couriers list with colors for logos (simulation)
    const couriers = [
        { id: 'aramex', label: t.dashboard.merchant.shipping.couriers.aramex, color: 'bg-orange-500' },
        { id: 'smsa', label: t.dashboard.merchant.shipping.couriers.smsa, color: 'bg-red-600' },
        { id: 'dhl', label: t.dashboard.merchant.shipping.couriers.dhl, color: 'bg-yellow-400 text-black' },
        { id: 'fedex', label: t.dashboard.merchant.shipping.couriers.fedex, color: 'bg-purple-600' },
        { id: 'other', label: t.dashboard.merchant.shipping.couriers.other, color: 'bg-gray-500' },
    ];

    const handleSubmit = async () => {
        if (!courier || !waybillNumber || !deliveryDate || !file) return;

        setIsSubmitting(true);
        // Simulate API upload
        await new Promise(resolve => setTimeout(resolve, 1500));

        // 1. Transition Order Status to SHIPPED
        const result = await transitionOrder(orderId, 'SHIPPED', 'MERCHANT', {
            courier,
            waybillNumber,
            expectedDeliveryDate: deliveryDate,
            waybillImage: URL.createObjectURL(file) // Storing local URL for demo
        });

        if (result.success) {
            // 2. TRIGGER NOTIFICATION FOR CUSTOMER
            const order = useOrderStore.getState().orders.find(o => o.id === orderId);
            if (order?.customer?.id) {
                addNotification({
                    recipientId: order.customer.id,
                    recipientRole: 'CUSTOMER',
                    type: 'shipping',
                    titleKey: 'shipped',
                    message: language === 'ar'
                        ? `تم شحن طلبك #${orderId} عبر ${courier}. رقم التتبع: ${waybillNumber}`
                        : `Your Order #${orderId} shipped via ${courier}. Tracking: ${waybillNumber}`,
                    orderId: orderId,
                    linkTo: 'order-details',
                    priority: 'normal'
                });
            }
            onClose();
        } else {
            alert('Error: ' + result.message);
        }

        setIsSubmitting(false);
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.[0]) setFile(e.target.files[0]);
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
            >
                <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.9, opacity: 0 }}
                    className="bg-[#1A1814] border border-gold-500/20 rounded-2xl w-full max-w-lg p-6 relative overflow-hidden shadow-2xl"
                >
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-xl font-bold text-white flex items-center gap-2">
                            <Truck className="text-gold-500" size={24} />
                            {t.dashboard.merchant.shipping.modalTitle}
                        </h3>
                        <button onClick={onClose} className="text-white/40 hover:text-white"><X size={20} /></button>
                    </div>

                    <div className="space-y-6">
                        {/* 1. Courier Selection */}
                        <div>
                            <label className="block text-xs text-white/40 mb-3">{t.dashboard.merchant.shipping.courierLabel}</label>
                            <div className="flex gap-2 flex-wrap">
                                {couriers.map((c) => (
                                    <button
                                        key={c.id}
                                        onClick={() => setCourier(c.id)}
                                        className={`
                                    px-4 py-2 rounded-lg text-sm font-bold transition-all border
                                    ${courier === c.id
                                                ? 'border-gold-500 text-white bg-gold-500/10'
                                                : 'border-white/10 text-white/50 hover:bg-white/5'}
                                `}
                                    >
                                        <span className={`inline-block w-2 h-2 rounded-full mr-2 ${c.color}`} />
                                        {c.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* 2. Waybill Number */}
                        <div>
                            <label className="block text-xs text-white/40 mb-2">{t.dashboard.merchant.shipping.waybillLabel}</label>
                            <div className="relative">
                                <FileText className="absolute top-3.5 right-3.5 w-5 h-5 text-white/20 pointer-events-none" />
                                <input
                                    type="text"
                                    value={waybillNumber}
                                    onChange={(e) => setWaybillNumber(e.target.value)}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-gold-500 outline-none font-mono tracking-wider"
                                    placeholder="e.g. 1234567890"
                                />
                            </div>
                        </div>

                        {/* 3. Expected Date */}
                        <div>
                            <label className="block text-xs text-white/40 mb-2">{t.dashboard.merchant.shipping.dateLabel}</label>
                            <div className="relative">
                                <Calendar className="absolute top-3.5 right-3.5 w-5 h-5 text-white/20 pointer-events-none" />
                                <input
                                    type="date"
                                    value={deliveryDate}
                                    onChange={(e) => setDeliveryDate(e.target.value)}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-gold-500 outline-none appearance-none"
                                />
                            </div>
                        </div>

                        {/* 4. File Upload */}
                        <div>
                            <label className="block text-xs text-white/40 mb-2">{t.dashboard.merchant.shipping.imageLabel}</label>
                            <label className={`
                        flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-xl cursor-pointer transition-all
                        ${file ? 'border-green-500/50 bg-green-500/10' : 'border-white/10 hover:border-gold-500/30 hover:bg-white/5'}
                    `}>
                                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                    {file ? (
                                        <>
                                            <CheckCircle2 size={32} className="text-green-500 mb-2" />
                                            <p className="text-sm text-green-400 font-medium">{file.name}</p>
                                        </>
                                    ) : (
                                        <>
                                            <UploadCloud size={32} className="text-white/30 mb-2" />
                                            <p className="text-sm text-white/50">{t.dashboard.merchant.shipping.upload}</p>
                                            <p className="text-xs text-white/30 mt-1">PNG, JPG or PDF</p>
                                        </>
                                    )}
                                </div>
                                <input type="file" className="hidden" accept="image/*,.pdf" onChange={handleFileChange} />
                            </label>
                        </div>
                    </div>

                    {/* Warning if late shipping (simulated check) */}
                    <div className="mt-6 flex items-center gap-2 text-xs text-yellow-500/70 bg-yellow-500/10 p-3 rounded-lg border border-yellow-500/20">
                        <AlertCircle size={16} />
                        {t.dashboard.merchant.shipping.warnings.late}
                    </div>

                    <div className="mt-6">
                        <button
                            onClick={handleSubmit}
                            disabled={!courier || !waybillNumber || !deliveryDate || !file || isSubmitting}
                            className="w-full py-4 bg-gold-500 hover:bg-gold-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg"
                        >
                            {isSubmitting ? <Loader2 className="animate-spin" size={20} /> : (
                                <>
                                    <Truck size={18} />
                                    {t.dashboard.merchant.shipping.confirm}
                                </>
                            )}
                        </button>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};
