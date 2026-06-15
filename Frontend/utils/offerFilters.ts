import type { OrderOffer } from '../stores/useOrderStore';

export type OfferPriceSort = 'low' | 'high' | 'default';
export type OfferWarrantyFilter = 'all' | '3' | '6' | '12';

const WARRANTY_MONTHS_RE = /(\d+)\s*(?:month|months|شهر|أشهر|mo)/i;

export function parseWarrantyMonths(warranty?: string | null): number | null {
  if (!warranty?.trim()) return null;
  const match = warranty.match(WARRANTY_MONTHS_RE);
  if (!match) return null;
  const n = Number(match[1]);
  return Number.isFinite(n) ? n : null;
}

export function filterOffersByWarrantyMinMonths(
  offers: OrderOffer[],
  minMonths: OfferWarrantyFilter,
): OrderOffer[] {
  if (minMonths === 'all') return offers;
  const threshold = Number(minMonths);
  return offers.filter((o) => {
    const months = parseWarrantyMonths(o.warranty);
    return months !== null && months >= threshold;
  });
}

export function sortOffersByPrice(
  offers: OrderOffer[],
  sort: OfferPriceSort,
): OrderOffer[] {
  if (sort === 'default') return offers;
  const copy = [...offers];
  copy.sort((a, b) => {
    const pa = Number(a.price) || 0;
    const pb = Number(b.price) || 0;
    return sort === 'low' ? pa - pb : pb - pa;
  });
  return copy;
}

export function applyOfferFilters(
  offers: OrderOffer[],
  opts: { priceSort: OfferPriceSort; warrantyFilter: OfferWarrantyFilter },
): OrderOffer[] {
  const filtered = filterOffersByWarrantyMinMonths(offers, opts.warrantyFilter);
  return sortOffersByPrice(filtered, opts.priceSort);
}
