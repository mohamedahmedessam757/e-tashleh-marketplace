/**
 * Customer-facing offer pricing (single source of truth on the frontend).
 * Matches backend FinancialConfigService.computeCommissionForPrice + payment total:
 *   final = unitPrice + shippingCost + commission(unitPrice)
 */

export type OfferPriceInputs = {
  unitPrice?: number | string | null;
  shippingCost?: number | string | null;
  /** Already-computed commission; if omitted, derived from rate/min. */
  commission?: number | string | null;
};

export type CommissionConfig = {
  commissionRate?: number | null; // percent, e.g. 25
  minCommission?: number | null;
};

export type OfferPriceBreakdown = {
  unitPrice: number;
  shippingCost: number;
  commission: number;
  finalPrice: number;
};

const DEFAULT_RATE_PERCENT = 25;
const DEFAULT_MIN_COMMISSION = 100;

export function computeOfferCommission(
  unitPrice: number,
  config?: CommissionConfig | null,
): number {
  const base = Number(unitPrice) || 0;
  if (base <= 0) return 0;
  const rate = (Number(config?.commissionRate) || DEFAULT_RATE_PERCENT) / 100;
  const minComm = Number(config?.minCommission) || DEFAULT_MIN_COMMISSION;
  return Math.max(Math.round(base * rate), minComm);
}

export function computeOfferFinalPrice(
  input: OfferPriceInputs,
  config?: CommissionConfig | null,
): OfferPriceBreakdown {
  const unitPrice = Number(input.unitPrice) || 0;
  const shippingCost = Number(input.shippingCost) || 0;
  const commission =
    input.commission != null && input.commission !== ''
      ? Number(input.commission) || 0
      : computeOfferCommission(unitPrice, config);
  return {
    unitPrice,
    shippingCost,
    commission,
    finalPrice: unitPrice + shippingCost + commission,
  };
}

/** Prefer mapped all-in `price`; never treat bare unitPrice as final. */
export function resolveDisplayFinalPrice(
  offer: {
    price?: number | string | null;
    unitPrice?: number | string | null;
    shippingCost?: number | string | null;
    commission?: number | string | null;
  },
  config?: CommissionConfig | null,
): number {
  const mapped = Number(offer.price);
  if (Number.isFinite(mapped) && mapped > 0) return mapped;
  return computeOfferFinalPrice(offer, config).finalPrice;
}
