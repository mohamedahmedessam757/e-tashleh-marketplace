import { OrderStatus } from '@prisma/client';

/** Rolling 24h create-order governance (single / multiple). */
export const ORDER_CREATE_RULES = {
  windowMs: 24 * 60 * 60 * 1000,
  maxSinglePerWindow: 10,
  maxPartsMultiple: 10,
  maxPartsSingle: 1,
  /** Notify customer when single used count reaches this after a successful create. */
  singleWarnThreshold: 8,
} as const;

/** Statuses that free a slot (do not count toward 24h limits). */
export const RELEASED_STATUSES: OrderStatus[] = [OrderStatus.CANCELLED];

export type OrderCreateRuleCode =
  | 'SINGLE_VEHICLE_DUPLICATE'
  | 'SINGLE_LIMIT'
  | 'MULTIPLE_COOLDOWN'
  | 'DUPLICATE_PART_NAME'
  | 'PARTS_LIMIT'
  | 'INVALID_REQUEST_TYPE';

/** Collapse whitespace, lowercase (ar), unify common Arabic alef/ya/ta-marbuta variants. */
export function normalizeComparableText(input: string): string {
  return String(input ?? '')
    .normalize('NFC')
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .toLocaleLowerCase('ar');
}

export function normalizePartName(input: string): string {
  return normalizeComparableText(input);
}

export function normalizeVehicleKey(
  make: string,
  model: string,
  year: number,
): string {
  const y = Number(year);
  return `${normalizeComparableText(make)}|${normalizeComparableText(model)}|${Number.isFinite(y) ? y : 0}`;
}

export function hasDuplicatePartNames(names: string[]): boolean {
  const seen = new Set<string>();
  for (const name of names) {
    const key = normalizePartName(name);
    if (!key) continue;
    if (seen.has(key)) return true;
    seen.add(key);
  }
  return false;
}

export function unlockAtFromCreatedAt(createdAt: Date, now = new Date()): Date {
  return new Date(createdAt.getTime() + ORDER_CREATE_RULES.windowMs);
}

export function windowStart(now = new Date()): Date {
  return new Date(now.getTime() - ORDER_CREATE_RULES.windowMs);
}

/** Resolve effective request type for historical rows (null → infer from parts count). */
export function resolveRequestType(
  requestType: string | null | undefined,
  partsCount?: number,
): 'single' | 'multiple' {
  const t = String(requestType ?? '').trim().toLowerCase();
  if (t === 'single' || t === 'multiple') return t;
  if (typeof partsCount === 'number' && partsCount > 1) return 'multiple';
  return 'single';
}
