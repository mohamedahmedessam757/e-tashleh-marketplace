import React, { useMemo } from 'react';
import { useCheckoutStore } from '../../../../stores/useCheckoutStore';
import { useOrderStore } from '../../../../stores/useOrderStore';
import { useLanguage } from '../../../../contexts/LanguageContext';
import { useProfileStore } from '../../../../stores/useProfileStore';
import { MapPin, Info, AlertTriangle, Package, CheckCircle2, Copy, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export const OrderSummaryStep: React.FC = () => {
    const { orderId, address, partAddresses, selectedOffer } = useCheckoutStore();
    const { orders } = useOrderStore();
    const { t, language } = useLanguage();
    const isAr = language === 'ar';
    const [selectedImage, setSelectedImage] = React.useState<string | null>(null);

    const order = useMemo(() => orders.find(o => String(o.id) === String(orderId)), [orders, orderId]);
    const tFR = t.dashboard.checkout.finalReview;
    const acceptedStatuses = useMemo(() => new Set(['ACCEPTED', 'COMPLETED', 'SHIPPED', 'DELIVERED', 'PREPARATION', 'PARTIALLY_PAID', 'accepted', 'completed', 'shipped', 'delivered', 'preparation', 'partially_paid']), []);

    if (!order) return <div className="p-8 text-center text-white/50">{t.common.loading}</div>;

    // Determine parts with accepted offers
    const requiredPartsArray = order.parts || [];
    const itemsCount = requiredPartsArray.length;

    const allOffers = order.offers || [];
    const acceptedOffers = allOffers.filter((o: any) => acceptedStatuses.has(String(o.status || '').toUpperCase()) || acceptedStatuses.has(String(o.status || '')));
    const offersToDisplay = acceptedOffers.length > 0 ? acceptedOffers : (selectedOffer ? [selectedOffer] : []);

    const isGrouped = itemsCount > 1; // Assuming multi-part implies grouped unless explicitly 'separate'

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
    };

    const formatCondition = (cond?: string) => {
        if (!cond || cond === '---') return '---';
        const c = cond.toLowerCase();
        if (c.includes('clean')) return isAr ? 'مستعمل - نظيف' : 'Used - Clean';
        if (c.includes('avg')) return isAr ? 'مستعمل - متوسط' : 'Used - Average';
        if (c === 'new') return isAr ? 'جديد' : 'New';
        if (c === 'used') return isAr ? 'مستعمل' : 'Used';
        return cond;
    };

    const formatWarranty = (w?: string) => {
        if (!w || w === 'no' || w === 'none' || w === 'false') return tFR.noWarranty;
        const clean = w.toLowerCase().replace(/\s+/g, '');
        if (clean === 'yes' || clean === 'true') return isAr ? 'يوجد ضمان' : 'Warranty Included';
        if (clean === 'd15' || clean === '15days') return isAr ? '15 يوم' : '15 Days';
        if (clean === 'month1' || clean === '1month' || clean === '1months') return isAr ? 'شهر واحد' : '1 Month';
        if (clean === 'month3' || clean === '3month' || clean === '3months') return isAr ? '3 أشهر' : '3 Months';
        if (clean === 'month6' || clean === '6month' || clean === '6months') return isAr ? '6 أشهر' : '6 Months';
        if (clean === 'year1' || clean === '1year' || clean === '1years') return isAr ? 'سنة واحدة' : '1 Year';
        
        const num = w.match(/\d+/)?.[0];
        if (num) {
            if (w.includes('day')) return isAr ? `${num} يوم` : `${num} Days`;
            if (w.includes('month')) {
                const n = parseInt(num);
                if (isAr) {
                    if (n === 1) return 'شهر واحد';
                    if (n === 2) return 'شهران';
                    if (n >= 3 && n <= 10) return `${n} أشهر`;
                    return `${n} شهر`;
                }
                return `${num} Month${n > 1 ? 's' : ''}`;
            }
            if (w.includes('year')) return isAr ? `${num} سنة` : `${num} Year${parseInt(num) > 1 ? 's' : ''}`;
        }
        return w;
    };

    const getOfferStoreCode = (offer: any) => {
        return offer?.storeCode || offer?.store?.storeCode || offer?.storeId || offer?.store?.id || '---';
    };

    const getOfferMerchantName = (offer: any) => {
        return offer?.merchantName || offer?.store?.name || '---';
    };

    const getOfferWarranty = (offer: any) => {
        if (typeof offer?.warranty === 'string' && offer.warranty.trim()) return offer.warranty;
        if (offer?.hasWarranty) return offer?.warrantyDuration || 'yes';
        return 'no';
    };

    const getOfferWeight = (offer: any) => {
        const rawWeight = offer?.weight ?? offer?.weightKg ?? offer?.weight_kg;
        const weightValue = Number(rawWeight);
        return Number.isFinite(weightValue) && weightValue > 0 ? weightValue : null;
    };

    const getOfferCylinders = (offer: any) => {
        const cylindersValue = Number(offer?.cylinders);
        return Number.isFinite(cylindersValue) && cylindersValue > 0 ? cylindersValue : null;
    };



    const hasMultiAddresses = Object.keys(partAddresses).length > 0;

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300" dir={isAr ? 'rtl' : 'ltr'}>

            {/* Main Header */}
            <div className="text-center mb-8 mt-4">
                <h2 className="text-2xl md:text-3xl font-bold text-white mb-2">تأكيد الطلبات</h2>
                <p className="text-white/50 text-sm">مراجعة نهائية قبل إتمام عملية الشراء</p>
            </div>

            {/* Final Order Details (Table List) */}
            <div className="space-y-4">
                <h3 className="text-lg font-bold text-white text-right mb-4">{tFR.orderDetails}</h3>

                {offersToDisplay.map((offer, idx) => {
                    const part = requiredPartsArray.find(p => p.id === offer.orderPartId);
                    const partName = part ? part.name : order.partName;
                    const storeCode = getOfferStoreCode(offer);
                    const merchantName = getOfferMerchantName(offer);
                    const warrantyValue = getOfferWarranty(offer);
                    const weightValue = getOfferWeight(offer);
                    const cylindersValue = getOfferCylinders(offer);

                    // Determine which image to show
                    const merchantImage = offer.offerImage;
                    const customerImage = part?.images?.[0] || order.partImages?.[0];
                    const imageToShow = merchantImage || customerImage;

                    return (
                        <div key={offer.id || idx} className="bg-[#121212] border border-[#2b271d] rounded-2xl overflow-hidden shadow-lg p-5 mb-4 transition-all hover:border-gold-500/30">

                            {/* Top Section: Image, Name & Final Price */}
                            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-5">
                                <div className="flex items-center gap-4 w-full md:w-auto">
                                    <div
                                        onClick={() => imageToShow && setSelectedImage(imageToShow)}
                                        className={`w-16 h-16 bg-white/5 rounded-xl flex items-center justify-center shrink-0 border border-white/10 overflow-hidden ${imageToShow ? 'cursor-pointer hover:border-gold-500/50 transition-colors' : ''}`}
                                    >
                                        {imageToShow ? (
                                            <img src={imageToShow} alt={partName} className="w-full h-full object-cover" />
                                        ) : (
                                            <Package className="w-8 h-8 text-white/20" />
                                        )}
                                    </div>
                                    <h4 className="font-bold text-white text-base md:text-lg ltr:text-left rtl:text-right leading-tight">
                                        {partName}
                                    </h4>
                                </div>
                                <div className="w-full md:w-auto flex justify-start md:justify-end shrink-0">
                                    <div className="bg-[#241d0f] border border-[#4a3e20] px-5 py-2 rounded-xl text-center min-w-[130px]">
                                        <p className="text-[11px] text-gold-300/80 mb-0.5">{tFR.price}</p>
                                        <p className="font-bold text-gold-500 font-mono text-lg">AED {Number(offer.price).toLocaleString()}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Middle Grid: Identifiers & Status */}
                            <div className="flex flex-wrap justify-between gap-4 pt-5 pb-5 border-t border-b border-white/5 text-right rtl:text-right ltr:text-left mb-5">
                                <div className="flex-1 min-w-[110px]">
                                    <p className="text-[10px] text-white/40 mb-1">{tFR.orderNoDate}</p>
                                    <p className="text-xs font-bold text-white font-mono flex items-center rtl:justify-start ltr:justify-start gap-2">
                                        <button onClick={() => copyToClipboard(order.orderNumber || order.id?.toString())} className="text-gold-500 hover:text-gold-400"><Copy size={12} /></button>
                                        #{order.orderNumber || order.id?.toString().slice(0, 6).toUpperCase()}
                                    </p>
                                    <p className="text-[10px] text-white/30 mt-1">{new Date(order.createdAt).toLocaleDateString()}</p>
                                </div>
                                <div className="flex-1 min-w-[110px]">
                                    <p className="text-[10px] text-white/40 mb-1">{tFR.offerNo}</p>
                                    <p className="text-xs font-bold text-white font-mono flex items-center rtl:justify-start ltr:justify-start gap-2">
                                        <button onClick={() => copyToClipboard(offer.offerNumber || offer.id?.toString())} className="text-gold-500 hover:text-gold-400"><Copy size={12} /></button>
                                        #{offer.offerNumber !== 'N/A' && offer.offerNumber ? offer.offerNumber : offer.id?.toString().slice(0, 8).toUpperCase()}
                                    </p>
                                </div>
                                <div className="flex-1 min-w-[110px]">
                                    <p className="text-[10px] text-white/40 mb-1">{tFR.storeNo}</p>
                                    <p className="text-xs font-bold text-white font-mono">
                                        {storeCode && storeCode !== 'N/A' ? `#${storeCode}` : '---'}
                                    </p>
                                    <p className="text-[10px] text-white/30 mt-1">{merchantName}</p>
                                </div>
                                <div className="flex-1 min-w-[110px]">
                                    <p className="text-[10px] text-white/40 mb-1">{tFR.paymentStatus}</p>
                                    <span className="inline-flex items-center gap-1.5 text-green-400 text-xs font-bold bg-green-500/10 border border-green-500/20 px-2.5 py-1 rounded-full mt-0.5">
                                        <CheckCircle2 size={12} />
                                        جاهز للدفع
                                    </span>
                                </div>
                            </div>

                            {/* Bottom Grid: New Detailed Info */}
                            <div className="flex flex-wrap justify-between gap-4 text-right rtl:text-right ltr:text-left">
                                <div className="flex-1 min-w-[110px]">
                                    <p className="text-[10px] text-white/40 mb-1">{tFR.condition}</p>
                                    <p className="text-xs font-bold text-white/90">{formatCondition(offer.condition)}</p>
                                </div>
                                <div className="flex-1 min-w-[110px]">
                                    <p className="text-[10px] text-white/40 mb-1">{tFR.warranty}</p>
                                    <p className="text-xs font-bold text-amber-400/90">{formatWarranty(warrantyValue)}</p>
                                </div>

                                <div className="flex-1 min-w-[110px]">
                                    <p className="text-[10px] text-white/40 mb-1">{cylindersValue ? (isAr ? 'السلندرات' : 'Cylinders') : tFR.approxWeight}</p>
                                    {cylindersValue ? (
                                        <p className="text-xs font-bold text-white/90">
                                            <span className="font-mono text-gold-400 mr-1">{cylindersValue}</span>
                                        </p>
                                    ) : (
                                        <p className="text-xs font-bold text-white/90">
                                            <span className="font-mono text-gold-400 mr-1">{weightValue ?? '---'}</span> {weightValue ? 'kg' : ''}
                                        </p>
                                    )}
                                </div>
                            </div>

                        </div>
                    );
                })}
            </div>

            {/* Shipping Info & Order Meta Info Grid */}
            <div className="grid lg:grid-cols-2 gap-6">

                {/* Order Information Block (Blue) */}
                <div className="bg-[#0b101e] border border-blue-900/40 rounded-2xl p-6 h-full flex flex-col items-end ltr:items-start text-right ltr:text-left">
                    <div className="flex justify-between items-center w-full mb-6">
                        <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
                            <Info className="text-blue-400 w-4 h-4" />
                        </div>
                        <h3 className="font-bold text-blue-400 text-base">{tFR.orderInfo}</h3>
                    </div>

                    <ul className="space-y-4 text-xs md:text-sm text-blue-100/80 w-full">
                        <li className="flex justify-between items-start border-b border-blue-500/10 pb-2">
                            <span className="text-blue-50 font-bold ltr:text-left rtl:text-right flex-1">{isGrouped ? 'شحن مجمع في بوليصة واحدة' : 'شحن منفصل'}</span>
                            <span className="text-blue-400 font-medium whitespace-nowrap px-2 flex items-center gap-2">
                                {tFR.shippingType} <span className="w-1.5 h-1.5 rounded-full bg-blue-500 block"></span>
                            </span>
                        </li>
                        <li className="flex justify-between items-start border-b border-blue-500/10 pb-2">
                            <span className="text-blue-50 font-bold ltr:text-left rtl:text-right flex-1">نشط</span>
                            <span className="text-blue-400 font-medium whitespace-nowrap px-2 flex items-center gap-2">
                                {tFR.orderStatus} <span className="w-1.5 h-1.5 rounded-full bg-blue-500 block"></span>
                            </span>
                        </li>
                        <li className="flex justify-between items-start border-b border-blue-500/10 pb-2">
                            <span className="text-blue-50 font-bold ltr:text-left rtl:text-right flex-1">{itemsCount} قطعة</span>
                            <span className="text-blue-400 font-medium whitespace-nowrap px-2 flex items-center gap-2">
                                {tFR.itemsCount} <span className="w-1.5 h-1.5 rounded-full bg-blue-500 block"></span>
                            </span>
                        </li>

                        {/* Iterate dynamically to show notes per part */}
                        {requiredPartsArray.map((part, i) => (
                            <li key={i} className="flex justify-between items-start pt-1">
                                <span className="text-blue-50 font-bold ltr:text-left rtl:text-right flex-1 pl-2">
                                    {part.description || part.notes || 'لا يوجد ملاحظات'}
                                </span>
                                <span className="text-blue-400 font-medium whitespace-nowrap px-2 flex items-center gap-2 min-w-[80px]">
                                    ملاحظات: {part.name} <span className="w-1.5 h-1.5 rounded-full bg-blue-500 block"></span>
                                </span>
                            </li>
                        ))}
                    </ul>
                </div>

                {/* Shipping Info Block (Green) */}
                <div className="bg-[#0b1712] border border-green-900/40 rounded-2xl p-6 h-full flex flex-col items-end ltr:items-start text-right ltr:text-left">
                    <div className="flex justify-between items-center w-full mb-6">
                        <div className="w-8 h-8 rounded-full bg-green-500/10 flex items-center justify-center border border-green-500/20">
                            <MapPin className="text-green-400 w-4 h-4" />
                        </div>
                        <h3 className="font-bold text-green-400 text-base">{tFR.shippingInfo}</h3>
                    </div>

                    {!hasMultiAddresses ? (
                        <div className="space-y-3 text-xs md:text-sm w-full">
                            <div className="flex justify-between items-start border-b border-green-500/10 pb-2">
                                <span className="text-green-50 font-bold ltr:text-left rtl:text-right flex-1">{address.fullName}</span>
                                <span className="text-green-500/70 font-medium w-1/3 shrink-0">{t.dashboard.checkout.address.name}</span>
                            </div>
                            <div className="flex justify-between items-start border-b border-green-500/10 pb-2">
                                <span className="text-green-50 font-bold ltr:text-left rtl:text-right flex-1" dir="ltr">{address.phone}</span>
                                <span className="text-green-500/70 font-medium w-1/3 shrink-0">{t.dashboard.checkout.address.phone}</span>
                            </div>
                            <div className="flex justify-between items-start border-b border-green-500/10 pb-2">
                                <span className="text-green-50 font-bold ltr:text-left rtl:text-right flex-1">{address.email}</span>
                                <span className="text-green-500/70 font-medium w-1/3 shrink-0">{t.dashboard.checkout.address.email}</span>
                            </div>
                            <div className="flex justify-between items-start border-b border-green-500/10 pb-2">
                                <span className="text-green-50 font-bold ltr:text-left rtl:text-right flex-1">{address.country}</span>
                                <span className="text-green-500/70 font-medium w-1/3 shrink-0">{t.dashboard.checkout.address.country}</span>
                            </div>
                            <div className="flex justify-between items-start border-b border-green-500/10 pb-2">
                                <span className="text-green-50 font-bold ltr:text-left rtl:text-right flex-1">{address.city}</span>
                                <span className="text-green-500/70 font-medium w-1/3 shrink-0">{t.dashboard.checkout.address.city}</span>
                            </div>
                            <div className="flex justify-between items-start pt-1">
                                <span className="text-green-50 font-bold ltr:text-left rtl:text-right flex-1 leading-relaxed">{address.details}</span>
                                <span className="text-green-500/70 font-medium w-1/3 shrink-0">{t.dashboard.checkout.address.address}</span>
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col gap-4 w-full h-full overflow-y-auto max-h-[250px] pr-2 custom-scrollbar">
                            {Object.entries(partAddresses).map(([partId, addr], idx) => {
                                const partName = requiredPartsArray.find(p => p.id === partId)?.name || partId;
                                return (
                                    <div key={partId} className="bg-black/30 p-3 rounded-lg border border-green-500/10 text-xs text-green-50/90 text-right">
                                        <span className="block text-green-400 font-bold mb-2">{partName}</span>
                                        <div className="space-y-1">
                                            <p><span className="text-white/40">{t.dashboard.checkout.address.name}:</span> {addr.fullName}</p>
                                            <p dir="ltr" className="text-right"><span className="text-white/40">{t.dashboard.checkout.address.phone}:</span> {addr.phone}</p>
                                            <p><span className="text-white/40">{t.dashboard.checkout.address.city}:</span> {addr.city}, {addr.country}</p>
                                            <p><span className="text-white/40">{t.dashboard.checkout.address.address}:</span> {addr.details}</p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            {/* Conditional Grouped Shipping Alert */}
            {isGrouped && (
                <div className="bg-[#1f1606] border border-amber-600/40 rounded-xl px-5 py-4 flex flex-col md:flex-row items-center gap-4 text-right">
                    <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0 border border-amber-500/20">
                        <AlertTriangle className="text-amber-500 w-5 h-5" />
                    </div>
                    <div className="flex-1 w-full text-right rtl:text-right ltr:text-left rtl:flex rtl:flex-col rtl:items-start ltr:flex ltr:flex-col ltr:items-start">
                        <h4 className="font-bold text-amber-500 text-sm mb-1">{tFR.groupedAlertTitle}</h4>
                        <ul className="text-amber-200/70 text-xs space-y-1 list-disc list-inside">
                            <li>{tFR.groupedAlert1}</li>
                            <li>{tFR.groupedAlert2}</li>
                        </ul>
                    </div>
                </div>
            )}

            {/* Fullscreen Image Modal */}
            <AnimatePresence>
                {selectedImage && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
                        onClick={() => setSelectedImage(null)}
                    >
                        {/* Close button */}
                        <button
                            className="absolute top-6 right-6 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"
                            onClick={() => setSelectedImage(null)}
                        >
                            <X size={24} />
                        </button>

                        {/* Image */}
                        <motion.img
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            transition={{ type: "spring", damping: 25, stiffness: 300 }}
                            src={selectedImage}
                            alt="Preview"
                            className="max-w-full max-h-[90vh] object-contain rounded-xl shadow-2xl"
                            onClick={(e) => e.stopPropagation()} // Prevent click from closing immediately when clicking on image
                        />
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};
