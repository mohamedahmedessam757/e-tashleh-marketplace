/** GCC dial codes supported at registration (matches Frontend auth forms). */
export const GULF_DIAL_CODES = [
    '+966',
    '+971',
    '+973',
    '+974',
    '+965',
    '+968',
] as const;

export type GulfDialCode = (typeof GULF_DIAL_CODES)[number];

const GCC_DIGITS = GULF_DIAL_CODES.map((c) => c.slice(1));

function stripDialCode(digits: string): string | null {
    for (const code of GCC_DIGITS) {
        if (digits.startsWith(code)) {
            return digits.slice(code.length);
        }
    }
    return null;
}

function normalizeCountryCode(countryCode?: string | null): GulfDialCode | null {
    if (!countryCode?.trim()) return null;
    const trimmed = countryCode.replace(/\s+/g, '').trim();
    const withPlus = trimmed.startsWith('+') ? trimmed : `+${trimmed}`;
    return (GULF_DIAL_CODES as readonly string[]).includes(withPlus)
        ? (withPlus as GulfDialCode)
        : null;
}

/**
 * Normalize phone to E.164 for GCC countries.
 * @param input - Full E.164, digits with country, or local 9-digit mobile
 * @param countryCode - e.g. +971 when input is local only
 */
export function normalizeGulfPhone(
    input: string,
    countryCode?: string | null,
): string {
    const trimmed = input.replace(/\s+/g, '').trim();
    if (!trimmed) return trimmed;

    if (trimmed.startsWith('+')) {
        const digits = trimmed.slice(1).replace(/\D/g, '');
        const local = stripDialCode(digits);
        if (local !== null) {
            const prefix = digits.slice(0, digits.length - local.length);
            return `+${prefix}${local}`;
        }
        return `+${digits}`;
    }

    const digits = trimmed.replace(/\D/g, '');
    const embeddedLocal = stripDialCode(digits);
    if (embeddedLocal !== null) {
        return `+${digits}`;
    }

    const cc = normalizeCountryCode(countryCode);
    let local = digits;
    if (local.startsWith('0')) {
        local = local.slice(1);
    }

    if (cc && local.length === 9 && local.startsWith('5')) {
        return `${cc}${local}`;
    }

    if (local.startsWith('05') && local.length === 10) {
        const fallback = cc ?? '+966';
        return `${fallback}${local.slice(1)}`;
    }

    if (local.startsWith('5') && local.length === 9) {
        const fallback = cc ?? '+966';
        return `${fallback}${local}`;
    }

    return digits ? `+${digits}` : trimmed;
}

/** Combine stored user phone + countryCode when phone may be local-only. */
export function resolveUserPhone(
    phone: string | null | undefined,
    countryCode?: string | null,
): string | null {
    if (!phone?.trim()) return null;
    return normalizeGulfPhone(phone, countryCode);
}
