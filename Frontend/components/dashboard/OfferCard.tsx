import React, { useState, memo, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Star, ShieldCheck, Truck, MessageSquare, CheckCircle2, Box, Tag, X, ZoomIn,Settings } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { isAcceptedOfferStatus, isRejectedOfferStatus } from '../../utils/offerStatusHelpers';

export interface OfferProps {
    id: number | string;
    storeName: string;
    rating: number | string;
    storeCity?: string;
    reviewCount: number | string;
    price: number | string;
    unitPrice: number | string;
    condition: string;
    warranty: string | boolean;
    deliveryTime: string;
    status?: string;
    onAccept: () => void;
    onChat: () => void;
    onReject?: () => void;
    offerImage?: string;
    storeLogo?: string | null;
    isShippingIncluded?: boolean;
    shippingCost?: number;
    weight?: number | string;
    partType?: string;
    disabled?: boolean;
    offerNumber?: string;
    storeCode?: string;
    submittedAt?: string;
    acceptLoading?: boolean;
    cylinders?: number | string;
    isSelected?: boolean;
    notes?: string;
}

export const OfferCard: React.FC<OfferProps> = memo(({
    storeName,
    rating,
    reviewCount,
    price,
    unitPrice,
    condition,
    warranty,
    deliveryTime,
    status,
    onAccept,
    onChat,
    onReject,
    isSelected,
    storeLogo,
    offerImage,
    notes,
    storeCity,
    isShippingIncluded,
    shippingCost,
    weight,
    partType,
    disabled,
    offerNumber,
    storeCode,
    submittedAt,
    acceptLoading,
    cylinders
}) => {
    const { t, language } = useLanguage();
    const [isImageModalOpen, setIsImageModalOpen] = useState(false);

    const toSafeNumber = (value: number | string | undefined | null, fallback = 0) => {
        const parsed = typeof value === 'number' ? value : Number(value);
        return Number.isFinite(parsed) ? parsed : fallback;
    };

    // Helper to map raw values to translations
    // Access 'offers' from 'dashboard' namespace if nested, or root if moved. 
    // Based on index.ts, it is inside dashboard.
    const offersT = (t.dashboard as any)?.offers || (t.offers as any);

    const conditionText = useMemo(() => {
        if (!condition) return '';
        const lowerVal = condition.toLowerCase().trim();
        return offersT?.conditions?.[lowerVal] || offersT?.conditions?.[condition.trim()] || condition;
    }, [condition, offersT]);

    const warrantyText = useMemo(() => {
        if (warranty === undefined || warranty === null) return offersT?.warranties?.no || 'No Warranty';
        const strictVal = typeof warranty === 'boolean' ? (warranty ? 'yes' : 'no') : (warranty as string).toLowerCase().trim().replace(/\s/g, '');
        
        // Custom 2026 fallbacks
        if (strictVal === '15days') return language === 'ar' ? '15 يوم' : '15 Days';
        if (strictVal === '1month') return language === 'ar' ? 'شهر' : '1 Month';
        if (strictVal === '3months') return language === 'ar' ? '3 أشهر' : '3 Months';
        if (strictVal === '12months') return language === 'ar' ? '12 شهر' : '12 Months';
        if (strictVal === 'custom') return warranty.toString();
        
        return offersT?.warranties?.[strictVal] || warranty.toString();
    }, [warranty, offersT, language]);

    const deliveryTimeText = useMemo(() => {
        if (!deliveryTime) return '';
        const key = deliveryTime.trim();
        if (offersT?.delivery?.[key]) return offersT?.delivery?.[key];
        if (key.match(/^d\d+_\d+$/)) {
            const [min, max] = key.substring(1).split('_');
            return language === 'ar' ? `من ${min} إلى ${max} أيام` : `${min}-${max} Days`;
        }
        return key;
    }, [deliveryTime, offersT, language]);

    const ratingValue = toSafeNumber(rating);
    const reviewCountValue = toSafeNumber(reviewCount);
    const priceValue = toSafeNumber(price);
    const weightValue = toSafeNumber(weight, NaN);

    return (
        <>
            <motion.div
                initial={false}
                animate={{ opacity: 1, y: 0 }}
                className={`rounded-2xl p-6 mb-4 relative overflow-hidden group will-change-[transform,opacity,border-color] transition-[border-color,transform,box-shadow,background-color] duration-300 ${isSelected
                    ? 'bg-gradient-to-br from-gold-500/10 to-transparent border-2 border-gold-500 shadow-[0_0_30px_rgba(234,179,8,0.1)]'
                    : 'bg-white/5 border border-white/10 hover:border-white/20'
                    } ${disabled ? 'opacity-50 grayscale-[50%] pointer-events-none' : ''}`}
            >
                {/* Header: Store & Price */}
                <div className="flex justify-between items-start gap-4 mb-6">
                    {/* Merchant Info */}
                    <div className="flex items-start gap-4">
                        {/* Store Logo */}
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-white/10 to-white/5 border border-white/10 flex items-center justify-center font-bold text-white text-xl overflow-hidden shrink-0">
                            {storeLogo ? (
                                <img src={storeLogo} alt="Store" className="w-full h-full object-cover" />
                            ) : (
                                <ShieldCheck size={18} className="text-gold-400/40" />
                            )}
                        </div>
                        <div>
                            <h3 className="font-bold text-white text-lg flex items-center gap-1.5">
                                <span className="text-gold-400 text-sm font-mono tracking-wide">ID</span>
                                <span>{storeCode || '---'}</span>
                            </h3>
                            <div className="flex items-center gap-2 text-sm mt-1 min-h-[20px]">
                                {reviewCountValue > 0 ? (
                                    <>
                                        <div className="flex items-center text-yellow-500">
                                            <Star size={14} fill="currentColor" />
                                            <span className="mx-1 font-bold text-white">{ratingValue.toFixed(1)}</span>
                                        </div>
                                        <span className="text-white/30 text-xs">
                                            ({reviewCountValue} {(t.common as any)?.reviews || 'Reviews'})
                                        </span>
                                    </>
                                ) : (
                                    <span className="text-white/40 text-xs">
                                        {language === 'ar' ? 'لا توجد تقييمات بعد' : 'No reviews yet'}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Offer Image (Clickable) */}
                    {offerImage && (
                        <div
                            onClick={() => setIsImageModalOpen(true)}
                            className="w-24 h-24 rounded-xl bg-white/5 border border-white/10 overflow-hidden shrink-0 shadow-lg cursor-pointer relative group/image"
                        >
                            <img src={offerImage} alt="Offer Part" className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/image:opacity-100 transition-opacity flex items-center justify-center">
                                <ZoomIn className="text-white" size={24} />
                            </div>
                        </div>
                    )}

                    {/* Price Section */}
                    <div className="text-right shrink-0">
                        <div className="flex flex-col items-end">
                            <div className="text-3xl font-bold text-gold-400 number-font">
                                {priceValue.toLocaleString()}
                                <span className="text-sm font-medium text-white/50 ml-1">AED</span>
                            </div>
                            <div className="text-xs text-white/40 mt-1 flex items-center gap-1 justify-end">
                                {offersT?.finalPrice || 'Final Price'}
                                {isShippingIncluded && (
                                    <span className="text-green-400 ml-1">
                                        • {offersT?.shippingIncluded || 'Shipping Included'}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Separator */}
                <div className="h-px w-full bg-white/5 my-5" />

                {/* Offer Metadata Row */}
                <div className="flex flex-wrap items-center gap-4 mb-5 px-2">
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] text-white/40 uppercase tracking-wider">{offersT?.labels?.offerNumber || 'Offer No.'}</span>
                        <span className="text-sm font-medium text-white/80 font-mono tracking-tight">{offerNumber || '---'}</span>
                    </div>
                    <div className="w-1 h-1 rounded-full bg-white/20" />
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] text-white/40 uppercase tracking-wider">{offersT?.labels?.storeCode || 'Store ID'}</span>
                        <span className="text-sm font-medium text-white/80 font-mono tracking-tight">{storeCode || '---'}</span>
                    </div>
                    <div className="w-1 h-1 rounded-full bg-white/20" />
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] text-white/40 uppercase tracking-wider">{offersT?.labels?.submittedAt || 'Date'}</span>
                        <span className="text-sm font-medium text-white/80">
                             {submittedAt
                                ? new Date(submittedAt).toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
                                : '---'}
                        </span>
                    </div>
                </div>

                {/* Details Grid - Enhanced with Translation & New Fields */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    {/* Condition */}
                    <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/5 border border-white/5 text-white/80">
                        <div className="w-2 h-2 rounded-full bg-blue-400 shrink-0" />
                        <div className="flex flex-col">
                            <span className="text-[10px] text-white/40 uppercase tracking-wider">{offersT?.labels?.condition || 'Condition'}</span>
                            <span className="text-sm font-medium">{conditionText}</span>
                        </div>
                    </div>

                    {/* Cylinders (Moved up for better visibility - 2026 Engine Logic) */}
                    {(cylinders !== undefined && cylinders !== null && cylinders !== 0 && cylinders !== '') && (
                        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-gold-500/10 border border-gold-500/20 text-white/80">
                            <Settings size={16} className="text-gold-400 shrink-0" />
                            <div className="flex flex-col">
                                <span className="text-[10px] text-gold-400 uppercase tracking-wider font-bold">{language === 'ar' ? 'السلندرات' : 'Cylinders'}</span>
                                <span className="text-sm font-bold text-white">{cylinders}</span>
                            </div>
                        </div>
                    )}

                    {/* Part Type */}
                    <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/5 border border-white/5 text-white/80">
                        <Tag size={16} className="text-purple-400 shrink-0" />
                        <div className="flex flex-col">
                            <span className="text-[10px] text-white/40 uppercase tracking-wider">{offersT?.labels?.type || 'Type'}</span>
                            <span className="text-sm font-medium">
                                {offersT?.partTypes?.[(partType || 'Original').toLowerCase()] || partType || 'Original'}
                            </span>
                        </div>
                    </div>

                    {/* Warranty */}
                    <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/5 border border-white/5 text-white/80">
                        <ShieldCheck size={16} className="text-gold-400 shrink-0" />
                        <div className="flex flex-col">
                            <span className="text-[10px] text-white/40 uppercase tracking-wider">{offersT?.labels?.warranty || 'Warranty'}</span>
                            <span className="text-sm font-medium">{warrantyText}</span>
                        </div>
                    </div>

                    {/* Part Price (New) - Now showing Final Price */}
                    <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/5 border border-white/5 text-white/80">
                        <div className="text-yellow-400 font-bold shrink-0 text-lg">$</div>
                        <div className="flex flex-col">
                            <span className="text-[10px] text-white/40 uppercase tracking-wider">{offersT?.finalPrice || 'Final Price'}</span>
                            <span className="text-sm font-medium">{priceValue.toLocaleString()} AED</span>
                        </div>
                    </div>

                    {/* Weight (Optional) - Strict Guard for '0' issue */}
                    {Number.isFinite(weightValue) && weightValue > 0 && (
                        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/5 border border-white/5 text-white/80">
                            <Box size={16} className="text-orange-400 shrink-0" />
                            <div className="flex flex-col">
                                <span className="text-[10px] text-white/40 uppercase tracking-wider">{offersT?.labels?.weight || 'Weight'}</span>
                                <span className="text-sm font-medium">{weightValue} {offersT?.units?.kg || 'Kg'}</span>
                            </div>
                        </div>
                    )}
                </div>

                {/* Vendor Notes (if any) */}
                {notes && (
                    <div className="mb-6 p-4 rounded-xl bg-white/[0.02] border border-white/5">
                        <h4 className="text-xs font-bold text-white/40 mb-2 uppercase tracking-wider">
                            {offersT?.labels?.notes || 'Vendor Notes'}
                        </h4>
                        <p className="text-sm text-white/80 leading-relaxed font-light">
                            {notes}
                        </p>
                    </div>
                )}

                {/* Actions */}
                <div className="flex justify-end items-center gap-3 mt-4">
                    {/* Persistent Chat Button (Visible before and after acceptance) */}
                    {status !== 'rejected' && (
                        <button
                            onClick={onChat}
                            disabled={acceptLoading}
                            className={`px-6 py-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-white transition-colors flex items-center gap-2 ${acceptLoading ? 'opacity-50 pointer-events-none' : ''}`}
                        >
                            <MessageSquare size={18} />
                            <span>{offersT?.chat || 'Chat'}</span>
                        </button>
                    )}

                    {/* Status Banners or Action Buttons */}
                    {acceptLoading ? (
                         <button
                            disabled
                            className="px-8 py-3 rounded-xl bg-gold-500 text-white font-bold shadow-lg shadow-gold-500/20 flex items-center gap-2 animate-pulse"
                        >
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            <span>{language === 'ar' ? 'جاري القبول...' : 'Accepting...'}</span>
                        </button>
                    ) : isAcceptedOfferStatus(status) ? (
                        <div className="px-6 py-3 rounded-xl bg-green-500/20 border border-green-500/40 text-green-400 font-bold text-sm flex items-center gap-2">
                            <CheckCircle2 size={18} />
                            {language === 'ar' ? 'تم القبول' : 'Accepted'}
                        </div>
                    ) : isRejectedOfferStatus(status) ? (
                        <div className="px-6 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 font-bold text-sm">
                            {language === 'ar' ? 'تم الرفض' : 'Rejected'}
                        </div>
                    ) : disabled ? (
                        <div className="px-6 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500/60 font-bold text-sm">
                            {offersT?.orderClosed || 'Order Closed'}
                        </div>
                    ) : (
                        <>
                            {onReject && (
                                <button
                                    onClick={onReject}
                                    disabled={acceptLoading}
                                    className={`px-6 py-3 rounded-xl bg-red-500/10 border border-red-500/30 hover:bg-red-500/20 text-red-400 font-bold transition-all flex items-center gap-2 ${acceptLoading ? 'opacity-50 pointer-events-none' : ''}`}
                                >
                                    <X size={18} />
                                    <span>{language === 'ar' ? 'رفض العرض' : 'Reject'}</span>
                                </button>
                            )}
                            <button
                                onClick={onAccept}
                                disabled={acceptLoading}
                                className={`px-8 py-3 rounded-xl bg-gold-500 hover:bg-gold-600 text-white font-bold shadow-lg shadow-gold-500/20 active:scale-95 transition-all flex items-center gap-2 ${acceptLoading ? 'opacity-50 pointer-events-none' : ''}`}
                            >
                                <CheckCircle2 size={18} />
                                <span>{offersT?.acceptOffer || 'Accept Offer'}</span>
                            </button>
                        </>
                    )}
                </div>

                {/* Image Modal */}
                {isImageModalOpen && offerImage && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4" onClick={() => setIsImageModalOpen(false)}>
                        <button className="absolute top-4 right-4 text-white/50 hover:text-white transition-colors">
                            <X size={32} />
                        </button>
                        <img
                            src={offerImage}
                            alt="Offer Part Full"
                            className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl"
                            onClick={(e) => e.stopPropagation()}
                        />
                    </div>
                )}
            </motion.div>
        </>
    );
});

OfferCard.displayName = 'OfferCard';
