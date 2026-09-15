/**
 * Reject handover datetime that is already in the past (server clock).
 * Accepts YYYY-MM-DD + HH:mm (or HH:mm:ss). Tolerance: 60 seconds.
 */
export function assertHandoverNotInPast(
    handoverDate: string | Date | null | undefined,
    handoverTime: string | null | undefined,
    nowMs: number = Date.now(),
): { ok: true } | { ok: false; code: 'HANDOVER_IN_PAST' } {
    if (handoverDate == null || handoverTime == null || String(handoverTime).trim() === '') {
        return { ok: true };
    }

    let y: number;
    let mo: number;
    let da: number;

    if (handoverDate instanceof Date) {
        if (!Number.isFinite(handoverDate.getTime())) return { ok: true };
        // Date-only fields often arrive as UTC midnight — use UTC parts
        y = handoverDate.getUTCFullYear();
        mo = handoverDate.getUTCMonth() + 1;
        da = handoverDate.getUTCDate();
    } else {
        const dateStr = String(handoverDate).trim().slice(0, 10);
        const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr);
        if (!m) return { ok: true };
        y = Number(m[1]);
        mo = Number(m[2]);
        da = Number(m[3]);
    }

    const timeParts = String(handoverTime)
        .trim()
        .split(':')
        .map((p) => Number(p));
    const hh = timeParts[0];
    const mm = timeParts[1] ?? 0;
    if (![y, mo, da, hh, mm].every((n) => Number.isFinite(n))) return { ok: true };

    // Interpret as local server wall-clock (Nest process TZ)
    const handoverMs = new Date(y, mo - 1, da, hh, mm, 0, 0).getTime();
    if (!Number.isFinite(handoverMs)) return { ok: true };

    if (handoverMs < nowMs - 60_000) {
        return { ok: false, code: 'HANDOVER_IN_PAST' };
    }
    return { ok: true };
}

export const HANDOVER_IN_PAST_EXCEPTION = {
    statusCode: 400,
    message: 'Handover date/time cannot be in the past.',
    messageAr: 'لا يمكن اختيار تاريخ أو وقت تسليم في الماضي.',
    messageEn: 'Handover date/time cannot be in the past.',
    code: 'HANDOVER_IN_PAST',
} as const;
