/** Parse part/order image fields from API (string[] | JSON string | Json). */
export function parseImageList(value: unknown): string[] {
    if (!value) return [];
    if (Array.isArray(value)) {
        return value.filter((v): v is string => typeof v === 'string' && v.trim().length > 0);
    }
    if (typeof value === 'string') {
        try {
            return parseImageList(JSON.parse(value));
        } catch {
            const trimmed = value.trim();
            if (trimmed.startsWith('http') || trimmed.startsWith('data:') || trimmed.startsWith('/')) {
                return [trimmed];
            }
        }
    }
    return [];
}

const blobUrlCache = new WeakMap<File | Blob, string>();

/** Stable src for string URLs; caches blob URLs for File/Blob (avoids flicker on re-render). */
export function resolveMediaSrc(value: unknown): string | undefined {
    if (value == null) return undefined;
    if (typeof value === 'string') {
        const trimmed = value.trim();
        if (!trimmed) return undefined;
        if (trimmed.startsWith('http') || trimmed.startsWith('data:') || trimmed.startsWith('/')) {
            return trimmed;
        }
        return undefined;
    }
    if (value instanceof File || value instanceof Blob) {
        let cached = blobUrlCache.get(value);
        if (!cached) {
            cached = URL.createObjectURL(value);
            blobUrlCache.set(value, cached);
        }
        return cached;
    }
    return undefined;
}

export function resolvePartPrimaryImage(
    part?: { images?: unknown } | null,
    orderFallback?: unknown,
): string | undefined {
    for (const img of parseImageList(part?.images)) {
        const src = resolveMediaSrc(img);
        if (src) return src;
    }
    for (const img of parseImageList(orderFallback)) {
        const src = resolveMediaSrc(img);
        if (src) return src;
    }
    return undefined;
}
