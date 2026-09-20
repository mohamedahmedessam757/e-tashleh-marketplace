/** Logistics shipping class declared by customer / merchant (maps to shipmentTypes ids). */
export type ShippingClass = 'engine' | 'gearbox' | 'standard';

export const SHIPPING_CLASS_VALUES: ShippingClass[] = ['engine', 'gearbox', 'standard'];

export function isShippingClass(value: unknown): value is ShippingClass {
  return value === 'engine' || value === 'gearbox' || value === 'standard';
}

/** Canonical Arabic questions — must match product copy verbatim. */
export const SHIPPING_CLASS_QUESTIONS_AR = {
  engine: 'هل القطعه مكينه - محرك - Engine ؟',
  gearbox: 'هل القطعه ناقل حركه - قير - جيربوكس - قير بوكس - Domination ؟',
  other: 'هل القطعه أخرى غير ذالك ؟',
} as const;

export const SHIPPING_CLASS_QUESTIONS_EN = {
  engine: 'Is the part an Engine - مكينه - محرك - Engine?',
  gearbox:
    'Is the part a Transmission - Gear - Gearbox - قير بوكس - Domination?',
  other: 'Is the part Other than that?',
} as const;

export function shippingClassLabel(
  value: ShippingClass | string | null | undefined,
  isAr: boolean,
): string {
  switch (value) {
    case 'engine':
      return isAr ? SHIPPING_CLASS_QUESTIONS_AR.engine : 'Engine';
    case 'gearbox':
      return isAr ? SHIPPING_CLASS_QUESTIONS_AR.gearbox : 'Gearbox / Transmission';
    case 'standard':
      return isAr ? SHIPPING_CLASS_QUESTIONS_AR.other : 'Other (standard shipping)';
    default:
      return isAr ? 'غير محدد' : 'Not set';
  }
}

/**
 * Cascade yes/no → exactly one ShippingClass.
 * Answers: engineYes / gearboxYes / otherYes — only one may be true.
 */
export type ShippingClassAnswers = {
  engine: boolean | null;
  gearbox: boolean | null;
  other: boolean | null;
};

export function answersFromShippingClass(
  value: ShippingClass | null | undefined,
): ShippingClassAnswers {
  if (value === 'engine') return { engine: true, gearbox: false, other: false };
  if (value === 'gearbox') return { engine: false, gearbox: true, other: false };
  if (value === 'standard') return { engine: false, gearbox: false, other: true };
  return { engine: null, gearbox: null, other: null };
}

export function shippingClassFromAnswers(
  a: ShippingClassAnswers,
): ShippingClass | null {
  if (a.engine === true) return 'engine';
  if (a.engine === false && a.gearbox === true) return 'gearbox';
  if (a.engine === false && a.gearbox === false && a.other === true) return 'standard';
  return null;
}

/** Apply a yes/no on one question; enforces single-yes cascade. */
export function applyShippingClassAnswer(
  prev: ShippingClassAnswers,
  key: keyof ShippingClassAnswers,
  yes: boolean,
): ShippingClassAnswers {
  if (key === 'engine') {
    if (yes) return { engine: true, gearbox: false, other: false };
    return { engine: false, gearbox: null, other: null };
  }
  if (key === 'gearbox') {
    if (prev.engine !== false) return prev;
    if (yes) return { engine: false, gearbox: true, other: false };
    return { engine: false, gearbox: false, other: null };
  }
  // other
  if (prev.engine !== false || prev.gearbox !== false) return prev;
  if (yes) return { engine: false, gearbox: false, other: true };
  return { engine: false, gearbox: false, other: false };
}
