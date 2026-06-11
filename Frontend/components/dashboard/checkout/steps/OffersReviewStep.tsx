import React, { useMemo } from 'react';
import { useOrderStore } from '../../../../stores/useOrderStore';
import { useCheckoutStore } from '../../../../stores/useCheckoutStore';
import { useLanguage } from '../../../../contexts/LanguageContext';
import { Package, AlertCircle, CheckCircle2, ChevronRight } from 'lucide-react';
import {
    isAcceptedOfferStatus,
    isActiveOfferStatus,
} from '../../../../utils/offerStatusHelpers';

export const OffersReviewStep: React.FC<{
    onBackToOffers: (partId?: string) => void,
    showValidationErrors?: boolean
}> = ({ onBackToOffers, showValidationErrors }) => {
    const { t, language } = useLanguage();
    const { orders } = useOrderStore();
    const { orderId } = useCheckoutStore();

    const order = useMemo(() => orders.find(o => o.id === orderId), [orders, orderId]);

    if (!order) return null;

    const parts = order.parts || [];
    const offers = order.offers || [];

    // Grouping parts and finding accepted offers
    const partStatus = parts.map(part => {
        const partOffers = offers.filter(
            (o) =>
                String(o.orderPartId) === String(part.id) &&
                isActiveOfferStatus(o.status),
        );
        const acceptedOffer = partOffers.find((o) => isAcceptedOfferStatus(o.status));
        return {
            part,
            hasOffers: partOffers.length > 0,
            acceptedOffer,
        };
    });

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            {/* Header Text */}
            <div className="text-center space-y-3 mb-8">
                <div className="w-16 h-16 bg-gold-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-gold-500/20">
                    <Package size={32} className="text-gold-500" />
                </div>
                <h2 className="text-2xl font-bold text-white">
                    {language === 'ar' ? 'انتظار قبول عروض القطع' : 'Awaiting Part Offers'}
                </h2>
                <p className="text-white/60 text-sm max-w-lg mx-auto">
                    {language === 'ar'
                        ? 'يجب قبول عرض واحد على الأقل لكل قطعة في طلبك (أو رفض العروض) قبل المتابعة إلى خطوة الدفع.'
                        : 'You must accept at least one offer for each part in your order (or reject offers) before proceeding to payment.'}
                </p>
            </div>

            {/* Table-like Container */}
            <div className="bg-[#1A1814] border border-white/5 rounded-2xl overflow-hidden shadow-2xl">
                {/* Table Header */}
                <div className="text-center p-4 border-b border-white/5 bg-white/5">
                    <h3 className="text-lg font-bold text-white">
                        {language === 'ar' ? 'القطع المطلوبة وحالة العروض' : 'Requested Parts & Offers Status'}
                    </h3>
                </div>

                {/* Column Headers */}
                <div className="grid grid-cols-4 gap-4 p-4 text-center text-sm font-bold text-white/50 border-b border-white/5 bg-black/20">
                    <div>{language === 'ar' ? 'الصورة' : 'Image'}</div>
                    <div className="text-start rtl:text-right">{language === 'ar' ? 'اسم القطعة' : 'Part Name'}</div>
                    <div>{language === 'ar' ? 'الحالة' : 'Status'}</div>
                    <div>{language === 'ar' ? 'الإجراء' : 'Action'}</div>
                </div>

                {/* List Items */}
                <div className="divide-y divide-white/5">
                    {partStatus.map(({ part, hasOffers, acceptedOffer }, idx) => {
                        const partImgSrc = part.images?.[0]
                            ? (typeof part.images[0] === 'string' ? part.images[0] : URL.createObjectURL(part.images[0] as unknown as File))
                            : undefined;

                        const needsAction = hasOffers && !acceptedOffer;
                        const isError = showValidationErrors && needsAction;

                        return (
                            <div key={part.id} className={`grid grid-cols-4 gap-4 p-4 items-center transition-all duration-300 ${isError ? 'bg-red-500/10 border border-red-500 shadow-[inset_0_0_20px_rgba(239,68,68,0.2)]' : 'hover:bg-white/[0.02]'}`}>
                                {/* 1. Image */}
                                <div className="flex justify-center">
                                    <div className="w-16 h-16 rounded-xl bg-black/40 border border-white/10 overflow-hidden flex items-center justify-center">
                                        {partImgSrc ? (
                                            <img src={partImgSrc} alt={part.name} className="w-full h-full object-cover" />
                                        ) : (
                                            <Package size={24} className="text-white/20" />
                                        )}
                                    </div>
                                </div>

                                {/* 2. Part Name & Details */}
                                <div className="text-start rtl:text-right">
                                    <div className="font-bold text-white mb-1">{part.name}</div>
                                    <div className="text-xs text-white/40 line-clamp-1">{part.description || part.name}</div>
                                    <div className="text-[10px] text-gold-500/60 font-mono tracking-wider mt-1 uppercase">
                                        {language === 'ar' ? `قطعة ${idx + 1}` : `PART ${idx + 1}`}
                                    </div>
                                </div>

                                {/* 3. Status Badge */}
                                <div className="flex justify-center flex-col items-center">
                                    {acceptedOffer ? (
                                        <div className="flex items-center gap-1.5 text-green-400 font-bold bg-green-500/10 px-4 py-1.5 rounded-full border border-green-500/20 text-sm whitespace-nowrap">
                                            <CheckCircle2 size={16} />
                                            <span>{language === 'ar' ? 'تم قبول عرض' : 'Offer Accepted'}</span>
                                        </div>
                                    ) : hasOffers ? (
                                        <div className="flex items-center gap-1.5 text-red-400 font-bold bg-red-500/10 px-4 py-1.5 rounded-full border border-red-500/20 text-sm whitespace-nowrap">
                                            <AlertCircle size={16} />
                                            <span>{language === 'ar' ? 'لم يتم قبول عرض' : 'No Offer Accepted'}</span>
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-1.5 text-white/40 font-bold bg-white/5 px-4 py-1.5 rounded-full border border-white/5 text-sm whitespace-nowrap">
                                            <AlertCircle size={16} />
                                            <span>{language === 'ar' ? 'لا توجد عروض نشطة' : 'No Active Offers'}</span>
                                        </div>
                                    )}
                                </div>

                                {/* 4. Action Button */}
                                <div className="flex justify-center">
                                    <button
                                        onClick={() => onBackToOffers(part.id)}
                                        disabled={!hasOffers}
                                        className={`px-4 py-2 rounded-xl text-sm font-bold border transition-all ${isError
                                            ? 'text-red-400 border-red-500/50 hover:bg-red-500/20 hover:border-red-500'
                                            : hasOffers
                                                ? 'text-gold-400 border-gold-500/30 hover:bg-gold-500/10 hover:border-gold-500/50'
                                                : 'text-white/20 border-white/5 cursor-not-allowed bg-white/5'
                                            }`}
                                    >
                                        {language === 'ar' ? 'عرض العروض' : 'View Offers'}
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Bottom Back Button */}
            <div className="flex justify-center mt-6">
                <button
                    onClick={() => onBackToOffers()}
                    className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-8 py-3 rounded-xl font-bold transition-colors shadow-lg shadow-emerald-500/20"
                >
                    <ChevronRight size={20} className={language === 'ar' ? 'rotate-180' : ''} />
                    {language === 'ar' ? 'العودة إلى عروض القطع' : 'Back to Parts Offers'}
                </button>
            </div>
        </div>
    );
};
