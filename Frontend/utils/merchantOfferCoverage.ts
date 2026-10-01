import { getActiveOffersForStore } from './merchantOffers';
import { isAcceptedOfferStatus } from './offerStatusHelpers';

export interface MerchantOfferCoverage {
    totalParts: number;
    offeredParts: number;
    remainingParts: number;
    hasAnyOffer: boolean;
    isFullyOffered: boolean;
}

/** How many parts of an open order this store has already offered on, and how many are still open to it. */
export function getMerchantOfferCoverage(order: any, storeId?: string | null): MerchantOfferCoverage {
    const mine = storeId ? getActiveOffersForStore(order?.offers || [], storeId) : [];
    const parts: Array<{ id: string }> = order?.parts || [];
    if (parts.length === 0) {
        const has = mine.length > 0;
        return { totalParts: 1, offeredParts: has ? 1 : 0, remainingParts: has ? 0 : 1, hasAnyOffer: has, isFullyOffered: has };
    }
    const offeredIds = new Set(mine.map((o: any) => o.orderPartId).filter(Boolean));
    const takenIds = new Set(
        (order.offers || []).filter((o: any) => isAcceptedOfferStatus(o.status)).map((o: any) => o.orderPartId),
    );
    const offeredParts = parts.filter((p) => offeredIds.has(p.id)).length;
    const remainingParts = parts.filter((p) => !offeredIds.has(p.id) && !takenIds.has(p.id)).length;
    return {
        totalParts: parts.length,
        offeredParts,
        remainingParts,
        hasAnyOffer: mine.length > 0,
        isFullyOffered: remainingParts === 0,
    };
}
