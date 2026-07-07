import { fetchPublicConfig } from '../hooks/usePublicConfig';

export let POST_DELIVERY_RETURN_DISPUTE_HOURS = 24;
export let ASSEMBLY_CART_DAYS = 7;

export async function refreshOrderSlaFromApi(): Promise<void> {
  try {
    const cfg = await fetchPublicConfig(true);
    POST_DELIVERY_RETURN_DISPUTE_HOURS = Number(
      cfg.orderDurations?.returnWindowHours ?? 24,
    );
    ASSEMBLY_CART_DAYS = Number(cfg.orderDurations?.assemblyCartDays ?? 7);
  } catch {
    /* keep fallbacks */
  }
}

void refreshOrderSlaFromApi();

export function getReturnDisputeHours(): number {
  return POST_DELIVERY_RETURN_DISPUTE_HOURS;
}

export function getAssemblyCartDays(): number {
  return ASSEMBLY_CART_DAYS;
}
