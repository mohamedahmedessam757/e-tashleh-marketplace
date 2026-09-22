import React from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, RefreshCcw, CheckCircle2, Lock } from 'lucide-react';
import { OrderCountdown } from '../../ui/OrderCountdown';
import { POST_DELIVERY_RETURN_DISPUTE_HOURS } from '../../../utils/orderSla';
import { getServerNowMs } from '../../../utils/serverClock';

export interface PartReturnWindowOffer {
    offerId: string;
    orderPartId?: string | null;
    partName: string;
    merchantName: string;
    fulfillmentStatus?: string;
    deliveredAt?: string | null;
    completedAt?: string | null;
    returnWindowEndsAt?: string | null;
    /** Short 24h return/dispute window only */
    isReturnEligible?: boolean;
    /** Past short window with usable warranty */
    isWarrantyEligible?: boolean;
    resolutionLocked?: boolean;
    hasOpenCase?: boolean;
    warrantyEndAt?: string | null;
}

interface PartReturnWindowCardProps {
    offer: PartReturnWindowOffer;
    isAr: boolean;
    onReturn: (offer: PartReturnWindowOffer) => void;
    onDispute: (offer: PartReturnWindowOffer) => void;
    className?: string;
}

function isShortWindowOpen(offer: PartReturnWindowOffer): boolean {
    if (offer.isReturnEligible === true) return true;
    if (offer.isReturnEligible === false) return false;
    const endMs = offer.returnWindowEndsAt
        ? new Date(offer.returnWindowEndsAt).getTime()
        : offer.deliveredAt
          ? new Date(offer.deliveredAt).getTime() +
            POST_DELIVERY_RETURN_DISPUTE_HOURS * 60 * 60 * 1000
          : null;
    if (endMs == null) return false;
    return getServerNowMs() < endMs;
}

export const PartReturnWindowCard: React.FC<PartReturnWindowCardProps> = ({
    offer,
    isAr,
    onReturn,
    onDispute,
    className = '',
}) => {
    const status = String(offer.fulfillmentStatus || '').toUpperCase();
    const isDelivered = status === 'DELIVERED';
    const hasOpenCase = !!offer.hasOpenCase;
    const isCompleted =
        status === 'COMPLETED' || (!!offer.resolutionLocked && !hasOpenCase);
    const inWarrantyPhase =
        !!offer.isWarrantyEligible ||
        (!!offer.warrantyEndAt && new Date(offer.warrantyEndAt).getTime() > getServerNowMs());

    // Generic return/dispute CTAs only while the short post-delivery window is open.
    // After that, warranty parts switch to the warranty banner (not this card's actions).
    const canAct =
        isDelivered &&
        !hasOpenCase &&
        !isCompleted &&
        !inWarrantyPhase &&
        isShortWindowOpen(offer);

    // Hide entirely once warranty phase owns the CTA — parent shows WarrantyBadge.
    if (inWarrantyPhase && !hasOpenCase && !canAct) return null;

    if (!isDelivered && !isCompleted) return null;

    return (
        <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className={`rounded-xl border p-4 ${
                canAct
                    ? 'border-cyan-500/30 bg-cyan-500/5'
                    : isCompleted
                      ? 'border-white/10 bg-white/[0.02]'
                      : 'border-amber-500/25 bg-amber-500/5'
            } ${className}`}
        >
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-white truncate">{offer.partName}</p>
                    <p className="text-[10px] text-white/40 mt-0.5">{offer.merchantName}</p>
                </div>
                {canAct && offer.deliveredAt && (
                    <OrderCountdown
                        updatedAt={offer.deliveredAt}
                        status="DELIVERED"
                        variant="badge"
                    />
                )}
            </div>

            <div className="mt-3">
                {hasOpenCase && (
                    <div className="flex items-center gap-2 text-amber-400 text-[11px] font-bold">
                        <AlertTriangle size={14} />
                        {isAr ? 'يوجد طلب نزاع/إرجاع مفتوح لهذه القطعة' : 'Open return/dispute case for this item'}
                    </div>
                )}
                {isCompleted && !hasOpenCase && (
                    <div className="flex items-center gap-2 text-white/50 text-[11px] font-bold">
                        <Lock size={14} />
                        {isAr
                            ? 'مكتملة — انتهت مهلة الإرجاع/النزاع'
                            : 'Completed — return/dispute window closed'}
                    </div>
                )}
                {canAct && (
                    <>
                        <p className="text-[11px] text-cyan-300/80 mb-3">
                            {isAr
                                ? `لديك ${POST_DELIVERY_RETURN_DISPUTE_HOURS} ساعة من وصول هذه القطعة لطلب الإرجاع أو النزاع`
                                : `${POST_DELIVERY_RETURN_DISPUTE_HOURS}h from delivery to return or dispute this item`}
                        </p>
                        {offer.deliveredAt && (
                            <OrderCountdown
                                updatedAt={offer.deliveredAt}
                                status="DELIVERED"
                                variant="full"
                            />
                        )}
                        <div className="flex flex-col sm:flex-row flex-wrap gap-2 mt-3 w-full">
                            <button
                                type="button"
                                onClick={() => onReturn(offer)}
                                className="flex items-center justify-center gap-2 w-full sm:w-auto px-5 py-3 bg-cyan-500/15 hover:bg-cyan-500 text-cyan-300 hover:text-white border border-cyan-400/50 rounded-xl transition-all font-bold text-sm shadow-[0_0_18px_rgba(34,211,238,0.35)]"
                            >
                                <RefreshCcw size={16} />
                                {isAr ? 'طلب إرجاع' : 'Return'}
                            </button>
                            <button
                                type="button"
                                onClick={() => onDispute(offer)}
                                className="flex items-center justify-center gap-2 w-full sm:w-auto px-5 py-3 bg-red-500/15 hover:bg-red-600 text-red-300 hover:text-white border border-red-400/50 rounded-xl transition-all font-bold text-sm shadow-[0_0_18px_rgba(239,68,68,0.4)]"
                            >
                                <AlertTriangle size={16} />
                                {isAr ? 'فتح نزاع' : 'Dispute'}
                            </button>
                        </div>
                    </>
                )}
                {isDelivered && !canAct && !hasOpenCase && !isCompleted && !inWarrantyPhase && (
                    <div className="flex items-center gap-2 text-red-400 text-[11px] font-bold">
                        <CheckCircle2 size={14} />
                        {isAr ? 'انتهت مهلة الإرجاع لهذه القطعة' : 'Return window expired for this item'}
                    </div>
                )}
            </div>
        </motion.div>
    );
};
