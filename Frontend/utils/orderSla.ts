import { fetchPublicConfig } from '../hooks/usePublicConfig';
import {
  DEFAULT_ORDER_DURATIONS,
  type OrderDurationSettings,
} from '../types/orderSla';
import { mergeOrderDurationSettings } from './resolveOrderActiveSla';

let cachedSettings: OrderDurationSettings = { ...DEFAULT_ORDER_DURATIONS };

export let POST_DELIVERY_RETURN_DISPUTE_HOURS = cachedSettings.returnWindowHours;
export let ASSEMBLY_CART_DAYS = cachedSettings.assemblyCartDays;

export function getOrderDurationSettings(): OrderDurationSettings {
  return cachedSettings;
}

export async function refreshOrderSlaFromApi(force = false): Promise<OrderDurationSettings> {
  try {
    const cfg = await fetchPublicConfig(force);
    cachedSettings = mergeOrderDurationSettings(cfg.orderDurations as Partial<OrderDurationSettings>);
    POST_DELIVERY_RETURN_DISPUTE_HOURS = cachedSettings.returnWindowHours;
    ASSEMBLY_CART_DAYS = cachedSettings.assemblyCartDays;
  } catch {
    /* keep fallbacks */
  }
  return cachedSettings;
}

void refreshOrderSlaFromApi();

export function getReturnDisputeHours(): number {
  return Math.max(cachedSettings.returnWindowHours, cachedSettings.disputeWindowHours);
}

export function getAssemblyCartDays(): number {
  return cachedSettings.assemblyCartDays;
}
