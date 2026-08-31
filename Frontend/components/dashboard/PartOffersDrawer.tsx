import React, { useCallback, useEffect, useMemo, useRef, useState, startTransition, memo } from 'react';
import { X, Package, Tag, ArrowUpDown, Shield, SlidersHorizontal, RotateCcw } from 'lucide-react';
import { OfferCard } from './OfferCard';
import { OrderOffer } from '../../stores/useOrderStore';
import { useLanguage } from '../../contexts/LanguageContext';
import {
    applyOfferFilters,
    type OfferPriceSort,
    type OfferWarrantyFilter,
} from '../../utils/offerFilters';

const PRICE_SORT_OPTIONS: { id: OfferPriceSort; ar: string; en: string }[] = [
    { id: 'default', ar: 'الافتراضي', en: 'Default' },
    { id: 'low', ar: 'الأقل سعراً', en: 'Lowest' },
    { id: 'high', ar: 'الأعلى سعراً', en: 'Highest' },
];

const WARRANTY_OPTIONS: { id: OfferWarrantyFilter; ar: string; en: string }[] = [
    { id: 'all', ar: 'الكل', en: 'All' },
    { id: '3', ar: '3+ أشهر', en: '3+ mo' },
    { id: '6', ar: '6+ أشهر', en: '6+ mo' },
    { id: '12', ar: '12+ شهر', en: '12+ mo' },
];

interface OfferFiltersBarProps {
    isAr: boolean;
    displayedCount: number;
    totalCount: number;
    priceSort: OfferPriceSort;
    warrantyFilter: OfferWarrantyFilter;
    onPriceSort: (v: OfferPriceSort) => void;
    onWarrantyFilter: (v: OfferWarrantyFilter) => void;
    onReset: () => void;
    hasActiveFilters: boolean;
}

const OfferFiltersBar: React.FC<OfferFiltersBarProps> = memo(({
    isAr,
    displayedCount,
    totalCount,
    priceSort,
    warrantyFilter,
    onPriceSort,
    onWarrantyFilter,
    onReset,
    hasActiveFilters,
}) => (
    <div className="px-3 sm:px-4 md:px-6 py-3 sm:py-4 border-b border-white/5 bg-gradient-to-b from-[#1A1814] to-[#13110E] shrink-0">
        <div className="max-w-4xl mx-auto space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 sm:gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-gold-500/10 border border-gold-500/20 flex items-center justify-center shrink-0">
                        <SlidersHorizontal size={14} className="text-gold-400" />
                    </div>
                    <div className="min-w-0">
                        <p className="text-xs font-bold text-white/90 truncate">
                            {isAr ? 'ترتيب وتصفية العروض' : 'Sort & filter offers'}
                        </p>
                        <p className="text-[10px] text-white/40 mt-0.5">
                            {isAr
                                ? `${displayedCount} من ${totalCount} عرض`
                                : `${displayedCount} of ${totalCount} offers`}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                    <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/[0.04] border border-white/10 text-[10px] font-mono text-white/45">
                        <Tag size={10} className="text-gold-500/60" />
                        {isAr ? `الحد الأقصى 10` : `Max 10`}
                    </span>
                    {hasActiveFilters && (
                        <button
                            type="button"
                            onClick={onReset}
                            className="inline-flex items-center gap-1.5 min-h-[36px] px-3 py-1.5 rounded-full text-[10px] font-bold text-gold-300 bg-gold-500/10 border border-gold-500/25 hover:bg-gold-500/20 transition-colors"
                        >
                            <RotateCcw size={11} />
                            {isAr ? 'إعادة ضبط' : 'Reset'}
                        </button>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="rounded-2xl bg-black/30 border border-white/[0.06] p-2.5 sm:p-3">
                    <div className="flex items-center gap-2 mb-2.5 px-0.5">
                        <ArrowUpDown size={12} className="text-gold-500/70" />
                        <span className="text-[10px] font-black uppercase tracking-[0.15em] text-white/35">
                            {isAr ? 'ترتيب السعر' : 'Price order'}
                        </span>
                    </div>
                    <div className="relative grid grid-cols-3 gap-1 p-1 rounded-xl bg-white/[0.03] border border-white/[0.05]">
                        {PRICE_SORT_OPTIONS.map((opt) => {
                            const active = priceSort === opt.id;
                            return (
                                <button
                                    key={opt.id}
                                    type="button"
                                    onClick={() => onPriceSort(opt.id)}
                                    className={`relative z-10 min-h-[40px] py-2 px-1 rounded-lg text-[10px] sm:text-[11px] font-bold leading-tight transition-colors duration-150 ${
                                        active ? 'text-black' : 'text-white/45 hover:text-white/70'
                                    }`}
                                >
                                    {active && (
                                        <span
                                            className="absolute inset-0 rounded-lg bg-gradient-to-b from-gold-400 to-gold-600 shadow-[0_2px_12px_rgba(212,175,55,0.35)]"
                                        />
                                    )}
                                    <span className="relative z-10 block text-center">{isAr ? opt.ar : opt.en}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                <div className="rounded-2xl bg-black/30 border border-white/[0.06] p-2.5 sm:p-3">
                    <div className="flex items-center gap-2 mb-2.5 px-0.5">
                        <Shield size={12} className="text-gold-500/70" />
                        <span className="text-[10px] font-black uppercase tracking-[0.15em] text-white/35">
                            {isAr ? 'الضمان' : 'Warranty'}
                        </span>
                    </div>
                    <div className="grid grid-cols-4 gap-1.5">
                        {WARRANTY_OPTIONS.map((opt) => {
                            const active = warrantyFilter === opt.id;
                            return (
                                <button
                                    key={opt.id}
                                    type="button"
                                    onClick={() => onWarrantyFilter(opt.id)}
                                    className={`relative overflow-hidden min-h-[40px] px-1.5 sm:px-3.5 py-2 rounded-xl text-[10px] sm:text-[11px] font-bold leading-tight transition-colors duration-150 border ${
                                        active
                                            ? 'border-gold-500/50 text-gold-100 shadow-[0_0_20px_rgba(212,175,55,0.12)]'
                                            : 'border-white/[0.08] bg-white/[0.02] text-white/40 hover:border-white/15 hover:text-white/65'
                                    }`}
                                >
                                    {active && (
                                        <span className="absolute inset-0 bg-gradient-to-br from-gold-500/25 via-gold-600/10 to-transparent" />
                                    )}
                                    <span className="relative flex items-center justify-center gap-1">
                                        {active && (
                                            <span className="hidden sm:inline-block w-1.5 h-1.5 rounded-full bg-gold-400 shadow-[0_0_6px_rgba(212,175,55,0.8)]" />
                                        )}
                                        {isAr ? opt.ar : opt.en}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    </div>
));

OfferFiltersBar.displayName = 'OfferFiltersBar';

type OfferHandlers = {
    accept: (offer: OrderOffer) => void;
    chat: (offer: OrderOffer) => void;
    reject: (offer: OrderOffer) => void;
};

interface OfferRowProps {
    offer: OrderOffer;
    isSelected: boolean;
    disabled: boolean;
    readOnly?: boolean;
    orderStatus?: string;
    acceptLoading: boolean;
    handlersRef: React.MutableRefObject<OfferHandlers>;
}

const OfferRow = memo(function OfferRow({
    offer,
    isSelected,
    disabled,
    readOnly,
    orderStatus,
    acceptLoading,
    handlersRef,
}: OfferRowProps) {
    return (
        <div
            className="[content-visibility:auto] [contain-intrinsic-size:auto_280px] contain-paint"
        >
            <OfferCard
                {...offer}
                storeName={offer.merchantName}
                rating={offer.storeRating || 0}
                reviewCount={offer.storeReviewCount || 0}
                unitPrice={offer.unitPrice || offer.price}
                isSelected={isSelected}
                onAccept={() => handlersRef.current.accept(offer)}
                onChat={() => handlersRef.current.chat(offer)}
                onReject={() => handlersRef.current.reject(offer)}
                disabled={disabled}
                readOnly={readOnly}
                orderStatus={orderStatus}
                acceptLoading={acceptLoading}
            />
        </div>
    );
}, (prev, next) => (
    prev.offer === next.offer &&
    prev.isSelected === next.isSelected &&
    prev.disabled === next.disabled &&
    prev.readOnly === next.readOnly &&
    prev.orderStatus === next.orderStatus &&
    prev.acceptLoading === next.acceptLoading
));

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
    /** When true, hide accept/reject and show status (admin view) */
    readOnly?: boolean;
    orderStatus?: string;
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
    disabled,
    readOnly,
    orderStatus,
}) => {
    const { language } = useLanguage();
    const isAr = language === 'ar';
    const [priceSort, setPriceSort] = useState<OfferPriceSort>('default');
    const [warrantyFilter, setWarrantyFilter] = useState<OfferWarrantyFilter>('all');
    const [acceptLoadingOfferId, setAcceptLoadingOfferId] = useState<string | null>(null);
    const [acceptSuccessMsg, setAcceptSuccessMsg] = useState<string | null>(null);
    // Paint shell first, then offer list — snappier open
    const [listReady, setListReady] = useState(false);
    const dialogRef = useRef<HTMLDivElement>(null);
    const closeBtnRef = useRef<HTMLButtonElement>(null);
    const titleId = useMemo(
        () => `part-offers-drawer-title-${partIndex}`,
        [partIndex],
    );

    const isHiddenOffer = (o: { status?: string; isWithdrawn?: boolean }) => {
        if (o.isWithdrawn) return true;
        const s = String(o.status || '').toUpperCase();
        return s === 'REJECTED' || s === 'WITHDRAWN' || s === 'CANCELLED';
    };

    const baseOffers = useMemo(
        () => offers.filter((o) => !isHiddenOffer(o)).slice(0, 10),
        [offers],
    );
    const displayedOffers = useMemo(
        () => applyOfferFilters(baseOffers, { priceSort, warrantyFilter }),
        [baseOffers, priceSort, warrantyFilter],
    );

    const hasActiveFilters = priceSort !== 'default' || warrantyFilter !== 'all';

    const resetFilters = useCallback(() => {
        startTransition(() => {
            setPriceSort('default');
            setWarrantyFilter('all');
        });
    }, []);

    const handlePriceSort = useCallback((v: OfferPriceSort) => {
        startTransition(() => setPriceSort(v));
    }, []);

    const handleWarrantyFilter = useCallback((v: OfferWarrantyFilter) => {
        startTransition(() => setWarrantyFilter(v));
    }, []);

    const handleAccept = useCallback(async (offer: any) => {
        setAcceptLoadingOfferId(String(offer.id));
        setAcceptSuccessMsg(null);
        try {
            await onAcceptOffer(offer);
            setAcceptSuccessMsg(
                isAr
                    ? 'تم قبول العرض بنجاح. يمكنك متابعة باقي القطع من هنا.'
                    : 'Offer accepted successfully. You can continue with other parts here.',
            );
        } finally {
            setAcceptLoadingOfferId(null);
        }
    }, [onAcceptOffer, isAr]);

    const handleChat = useCallback((offer: any) => {
        onChat(offer);
        onClose();
    }, [onChat, onClose]);

    const handlersRef = useRef<OfferHandlers>({
        accept: handleAccept,
        chat: handleChat,
        reject: onRejectOffer,
    });
    handlersRef.current = {
        accept: handleAccept,
        chat: handleChat,
        reject: onRejectOffer,
    };

    useEffect(() => {
        if (!isOpen) {
            setAcceptSuccessMsg(null);
            setListReady(false);
            return;
        }
        let cancelled = false;
        let id2 = 0;
        const id1 = requestAnimationFrame(() => {
            id2 = requestAnimationFrame(() => {
                if (!cancelled) setListReady(true);
            });
        });
        return () => {
            cancelled = true;
            cancelAnimationFrame(id1);
            if (id2) cancelAnimationFrame(id2);
        };
    }, [isOpen]);

    // Lock body scroll while drawer is open
    useEffect(() => {
        if (!isOpen) return;
        const prev = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = prev;
        };
    }, [isOpen]);

    // Escape + focus trap/restore
    useEffect(() => {
        if (!isOpen) return;
        const previousFocus = document.activeElement as HTMLElement | null;
        const focusClose = () => {
            closeBtnRef.current?.focus();
        };
        // Defer so dialog is in the DOM
        const t = window.setTimeout(focusClose, 0);

        const getFocusable = () => {
            const root = dialogRef.current;
            if (!root) return [] as HTMLElement[];
            return Array.from(
                root.querySelectorAll<HTMLElement>(
                    'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
                ),
            ).filter((el) => !el.hasAttribute('disabled') && el.tabIndex !== -1);
        };

        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                e.preventDefault();
                onClose();
                return;
            }
            if (e.key !== 'Tab') return;
            const focusable = getFocusable();
            if (focusable.length === 0) return;
            const first = focusable[0];
            const last = focusable[focusable.length - 1];
            const active = document.activeElement as HTMLElement | null;
            if (e.shiftKey) {
                if (active === first || !dialogRef.current?.contains(active)) {
                    e.preventDefault();
                    last.focus();
                }
            } else if (active === last) {
                e.preventDefault();
                first.focus();
            }
        };

        window.addEventListener('keydown', onKeyDown);
        return () => {
            window.clearTimeout(t);
            window.removeEventListener('keydown', onKeyDown);
            previousFocus?.focus?.();
        };
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return (
        <>
            {/* Backdrop — CSS only (faster than framer on open) */}
            <div
                role="presentation"
                onClick={onClose}
                className="fixed inset-0 z-[60] bg-black/70 animate-modal-snap-in"
            />

            {/* Full-Screen Page Modal */}
            <div
                ref={dialogRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby={titleId}
                className="fixed inset-0 md:inset-6 lg:inset-10 z-[70] flex flex-col bg-[#13110E] md:rounded-3xl border border-white/5 shadow-2xl overflow-hidden animate-modal-snap-in"
            >
                {/* Header */}
                <div className="flex items-center gap-3 sm:gap-4 p-4 sm:p-6 border-b border-white/5 bg-[#1A1814] shrink-0">
                    <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-white/5 border border-white/10 overflow-hidden flex items-center justify-center shrink-0">
                        {partImage ? (
                            <img
                                src={partImage}
                                alt={partName}
                                className="w-full h-full object-cover"
                                loading="eager"
                                decoding="async"
                            />
                        ) : (
                            <Package size={22} className="text-white/30" />
                        )}
                    </div>

                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                            <span className="text-[10px] font-mono text-gold-500/60 uppercase tracking-wider">
                                {isAr ? `قطعة ${partIndex + 1}` : `Part ${partIndex + 1}`}
                            </span>
                        </div>
                        <h2
                            id={titleId}
                            className="text-white font-bold text-base sm:text-lg leading-tight truncate"
                        >
                            {partName}
                        </h2>
                        {partDescription && (
                            <p className="text-white/50 text-xs sm:text-sm line-clamp-1 mt-0.5">{partDescription}</p>
                        )}
                    </div>

                    <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                        <div className="flex flex-col items-center">
                            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-gold-500/20 border border-gold-500/30 flex items-center justify-center font-bold text-gold-400 text-base sm:text-lg">
                                {displayedOffers.length}
                            </div>
                            <span className="text-[10px] text-white/40 mt-1 uppercase tracking-tighter">
                                {isAr ? 'عرض' : displayedOffers.length === 1 ? 'Offer' : 'Offers'}
                            </span>
                        </div>

                        <button
                            ref={closeBtnRef}
                            type="button"
                            onClick={onClose}
                            aria-label={isAr ? 'إغلاق' : 'Close'}
                            className="w-11 h-11 sm:w-10 sm:h-10 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-white/60 hover:text-white transition-colors"
                        >
                            <X size={18} />
                        </button>
                    </div>
                </div>

                <OfferFiltersBar
                    isAr={isAr}
                    displayedCount={displayedOffers.length}
                    totalCount={baseOffers.length}
                    priceSort={priceSort}
                    warrantyFilter={warrantyFilter}
                    onPriceSort={handlePriceSort}
                    onWarrantyFilter={handleWarrantyFilter}
                    onReset={resetFilters}
                    hasActiveFilters={hasActiveFilters}
                />

                {acceptSuccessMsg && (
                    <div className="mx-4 md:mx-8 mt-4 p-4 rounded-2xl border border-green-500/30 bg-green-500/10 text-green-300 text-sm font-bold flex items-center justify-between gap-3 shrink-0">
                        <span>{acceptSuccessMsg}</span>
                        <button
                            type="button"
                            onClick={() => setAcceptSuccessMsg(null)}
                            className="text-[11px] uppercase tracking-wider text-green-200/70 hover:text-white shrink-0"
                        >
                            {isAr ? 'إخفاء' : 'Dismiss'}
                        </button>
                    </div>
                )}

                {/* Offers List */}
                <div
                    className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-4 md:p-8 bg-black/40 scrollbar-none custom-scrollbar touch-pan-y"
                    style={{ WebkitOverflowScrolling: 'touch', contain: 'content' }}
                >
                    <div className="max-w-4xl mx-auto w-full space-y-4">
                        {!listReady ? (
                            <div className="space-y-4 py-2">
                                {[0, 1].map((i) => (
                                    <div
                                        key={i}
                                        className="h-48 rounded-2xl bg-white/5 border border-white/5 animate-pulse"
                                    />
                                ))}
                            </div>
                        ) : displayedOffers.length === 0 ? (
                            <div className="flex flex-col items-center justify-center text-white/30 py-20">
                                <Package size={64} className="mb-6 opacity-30" />
                                <p className="text-xl font-medium">
                                    {hasActiveFilters
                                        ? isAr
                                            ? 'لا توجد عروض تطابق الفلتر'
                                            : 'No offers match your filters'
                                        : isAr
                                          ? 'لا توجد عروض لهذه القطعة'
                                          : 'No offers for this part yet'}
                                </p>
                                {hasActiveFilters && (
                                    <button
                                        type="button"
                                        onClick={resetFilters}
                                        className="mt-4 px-4 py-2 rounded-xl text-sm font-bold text-gold-300 border border-gold-500/30 hover:bg-gold-500/10 transition-colors"
                                    >
                                        {isAr ? 'مسح الفلاتر' : 'Clear filters'}
                                    </button>
                                )}
                            </div>
                        ) : (
                            displayedOffers.map((offer) => (
                                <OfferRow
                                    key={offer.id}
                                    offer={offer}
                                    isSelected={
                                        selectedOffer != null &&
                                        String(selectedOffer) === String(offer.id)
                                    }
                                    disabled={
                                        !readOnly &&
                                        Boolean(
                                            disabled ||
                                                (acceptLoadingOfferId !== null &&
                                                    acceptLoadingOfferId !== String(offer.id)),
                                        )
                                    }
                                    readOnly={readOnly}
                                    orderStatus={orderStatus}
                                    acceptLoading={
                                        acceptLoadingOfferId !== null &&
                                        acceptLoadingOfferId === String(offer.id)
                                    }
                                    handlersRef={handlersRef}
                                />
                            ))
                        )}
                    </div>
                </div>
            </div>
        </>
    );
};
