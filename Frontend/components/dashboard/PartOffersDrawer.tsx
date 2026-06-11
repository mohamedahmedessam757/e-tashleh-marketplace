import React, { useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Package, Tag } from 'lucide-react';
import { OfferCard } from './OfferCard';
import { OrderOffer } from '../../stores/useOrderStore';
import { useLanguage } from '../../contexts/LanguageContext';

interface PartOffersDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    partName: string;
    partDescription?: string;
    partImage?: string;
    partIndex: number;
    offers: OrderOffer[];
    selectedOffer: string | number | null;
    onAcceptOffer: (offer: any) => void;
    onChat: (offer: any) => void;
    onRejectOffer: (offer: any) => void;
    disabled?: boolean;
}

export const PartOffersDrawer: React.FC<PartOffersDrawerProps> = ({
    isOpen,
    onClose,
    partName,
    partDescription,
    partImage,
    partIndex,
    offers,
    selectedOffer,
    onAcceptOffer,
    onChat,
    onRejectOffer,
    disabled
}) => {
    const { language } = useLanguage();
    const isAr = language === 'ar';
    const [acceptLoadingOfferId, setAcceptLoadingOfferId] = React.useState<string | null>(null);
    const isRejectedOfferStatus = (status?: string) => String(status || '').toUpperCase() === 'REJECTED';

    // Strictly limit to 10 and exclude rejected offers
    const displayedOffers = offers.filter(o => !isRejectedOfferStatus(o.status)).slice(0, 10);

    // Memoize handlers to prevent OfferCard re-renders
    const handleAccept = useCallback(async (offer: any) => {
        setAcceptLoadingOfferId(String(offer.id));
        try {
            await onAcceptOffer(offer);
        } finally {
            setAcceptLoadingOfferId(null);
        }
    }, [onAcceptOffer]);

    const handleChat = useCallback((offer: any) => {
        onChat(offer);
        onClose();
    }, [onChat, onClose]);

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        key="backdrop"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm"
                    />

                    {/* Full-Screen Page Modal */}
                    <motion.div
                        key="drawer"
                        initial={{ opacity: 0, scale: 0.96, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.96, y: 20 }}
                        transition={{ type: 'spring', damping: 28, stiffness: 300 }}
                        className="fixed inset-0 md:inset-6 lg:inset-10 z-[70] flex flex-col bg-[#13110E] md:rounded-3xl border border-white/5 shadow-2xl overflow-hidden"
                    >
                        {/* Header */}
                        <div className="flex items-center gap-4 p-6 border-b border-white/5 bg-[#1A1814] shrink-0">
                            {/* Part Image */}
                            <div className="w-14 h-14 rounded-xl bg-white/5 border border-white/10 overflow-hidden flex items-center justify-center shrink-0">
                                {partImage ? (
                                    <img src={partImage} alt={partName} className="w-full h-full object-cover" />
                                ) : (
                                    <Package size={22} className="text-white/30" />
                                )}
                            </div>

                            {/* Part Info */}
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-0.5">
                                    <span className="text-[10px] font-mono text-gold-500/60 uppercase tracking-wider">
                                        {isAr ? `قطعة ${partIndex + 1}` : `Part ${partIndex + 1}`}
                                    </span>
                                </div>
                                <h2 className="text-white font-bold text-lg leading-tight truncate">{partName}</h2>
                                {partDescription && (
                                    <p className="text-white/50 text-sm line-clamp-1 mt-0.5">{partDescription}</p>
                                )}
                            </div>

                            {/* Offer Count Badge */}
                            <div className="flex items-center gap-3">
                                <div className="flex flex-col items-center">
                                    <div className="w-10 h-10 rounded-full bg-gold-500/20 border border-gold-500/30 flex items-center justify-center font-bold text-gold-400 text-lg">
                                        {displayedOffers.length}
                                    </div>
                                    <span className="text-[10px] text-white/40 mt-1 uppercase tracking-tighter">
                                        {isAr ? 'عرض' : displayedOffers.length === 1 ? 'Offer' : 'Offers'}
                                    </span>
                                </div>

                                {/* Close Button */}
                                <button
                                    onClick={onClose}
                                    className="w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-white/60 hover:text-white transition-all"
                                >
                                    <X size={18} />
                                </button>
                            </div>
                        </div>

                        {/* Offers Info Bar */}
                        <div className="flex items-center gap-3 px-6 py-3 bg-gold-500/5 border-b border-gold-500/10 shrink-0">
                            <Tag size={14} className="text-gold-500/60" />
                            <p className="text-xs text-white/50">
                                {isAr
                                    ? `عرض ${displayedOffers.length} من أصل ${Math.min(offers.length, 10)} عرض متاح لهذه القطعة (الحد الأقصى 10)`
                                    : `Showing ${displayedOffers.length} of up to 10 offers for this part`}
                            </p>
                        </div>

                        {/* Offers List */}
                        <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-black/40 scrollbar-none custom-scrollbar">
                            <div className="max-w-4xl mx-auto w-full space-y-6">
                                {displayedOffers.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center h-full text-white/30 py-20">
                                        <Package size={64} className="mb-6 opacity-30" />
                                        <p className="text-xl font-medium">
                                            {isAr ? 'لا توجد عروض لهذه القطعة' : 'No offers for this part yet'}
                                        </p>
                                    </div>
                                ) : (
                                    <AnimatePresence mode="sync">
                                        <div className="space-y-4">
                                            {displayedOffers.map(offer => (
                                                <OfferCard
                                                    key={offer.id}
                                                    {...offer}
                                                    storeName={offer.merchantName}
                                                    rating={offer.storeRating || 0}
                                                    reviewCount={offer.storeReviewCount || 0}
                                                    unitPrice={offer.unitPrice || offer.price}
                                                    isSelected={
                                                        selectedOffer != null &&
                                                        String(selectedOffer) === String(offer.id)
                                                    }
                                                    onAccept={() => handleAccept(offer)}
                                                    onChat={() => handleChat(offer)}
                                                    onReject={() => onRejectOffer(offer)}
                                                    disabled={
                                                        disabled ||
                                                        (acceptLoadingOfferId !== null &&
                                                            acceptLoadingOfferId !== String(offer.id))
                                                    }
                                                    acceptLoading={
                                                        acceptLoadingOfferId !== null &&
                                                        acceptLoadingOfferId === String(offer.id)
                                                    }
                                                />
                                            ))}
                                        </div>
                                    </AnimatePresence>
                                )}
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};
