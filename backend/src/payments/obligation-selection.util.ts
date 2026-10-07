const LINE_ID =
    /^(wallet|return|dispute):[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}:(GATEWAY_CANCEL_FEE|ADJUDICATION_FEE|SHIPPING_FEE)$/i;

const CHUNK = 450;
const MAX_LINES = 100;
const MAX_CHUNKS = 40;

export class ObligationSelectionError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'ObligationSelectionError';
    }
}

export function parseObligationLineIds(raw: unknown): string[] {
    if (!Array.isArray(raw) || raw.length === 0) {
        throw new ObligationSelectionError(
            'اختر بندًا واحدًا على الأقل / Select at least one obligation',
        );
    }
    if (raw.length > MAX_LINES) {
        throw new ObligationSelectionError(
            'عدد البنود أكبر من الحد المسموح / Too many obligations selected',
        );
    }
    const seen = new Set<string>();
    const ids: string[] = [];
    for (const item of raw) {
        const id = String(item || '').trim();
        if (!LINE_ID.test(id)) {
            throw new ObligationSelectionError(
                'معرّف بند غير صالح / Invalid obligation id',
            );
        }
        const key = id.toLowerCase();
        if (seen.has(key)) {
            throw new ObligationSelectionError(
                'البند مكرر / Duplicate obligation id',
            );
        }
        seen.add(key);
        ids.push(id);
    }
    return ids;
}

export interface SelectableObligationLine {
    id: string;
    status: string;
    amount: number;
}

function money2(n: number): number {
    return Math.round((n + Number.EPSILON) * 100) / 100;
}

/** Every id must match an OPEN line. Unknown or settled ids reject the whole request. */
export function selectOpenLines<T extends SelectableObligationLine>(
    lines: T[],
    ids: string[],
): { lines: T[]; amount: number } {
    const openById = new Map<string, T>();
    for (const line of lines) {
        if (String(line.status).toUpperCase() === 'OPEN') {
            openById.set(line.id.toLowerCase(), line);
        }
    }
    const selected: T[] = [];
    for (const id of ids) {
        const line = openById.get(id.toLowerCase());
        if (!line) {
            throw new ObligationSelectionError(
                'أحد البنود غير متاح أو تم سداده، حدّث الصفحة / An obligation is unavailable or already settled',
            );
        }
        selected.push(line);
    }
    const amount = money2(selected.reduce((sum, line) => sum + Number(line.amount || 0), 0));
    if (!(amount > 0)) {
        throw new ObligationSelectionError(
            'المبلغ المختار غير صالح / Selected amount is invalid',
        );
    }
    return { lines: selected, amount };
}

/** Packs ids across Stripe metadata keys (500-char limit per value). */
export function packLineIds(ids: string[]): Record<string, string> {
    const joined = ids.join(',');
    const out: Record<string, string> = {};
    let index = 0;
    for (let offset = 0; offset < joined.length; offset += CHUNK) {
        if (index >= MAX_CHUNKS) {
            throw new ObligationSelectionError(
                'عدد البنود أكبر من الحد المسموح / Too many obligations selected',
            );
        }
        out[`lineIds${index}`] = joined.slice(offset, offset + CHUNK);
        index += 1;
    }
    return out;
}

export function unpackLineIds(meta: Record<string, unknown> | null | undefined): string[] {
    if (!meta) return [];
    const parts: string[] = [];
    for (let index = 0; index < MAX_CHUNKS; index += 1) {
        const chunk = meta[`lineIds${index}`];
        if (typeof chunk !== 'string' || !chunk) break;
        parts.push(chunk);
    }
    if (!parts.length) return [];
    return parseObligationLineIds(parts.join('').split(','));
}
