export type UploadPurpose =
    | 'order-draft'
    | 'offer'
    | 'verification'
    | 'returns'
    | 'disputes'
    | 'support'
    | 'chat'
    | 'appeals'
    | 'avatar'
    | 'store-logo'
    | 'vendor-document';

export type UploadKind = 'image' | 'video' | 'pdf';

const MB = 1024 * 1024;

/** Must stay identical to backend/src/uploads/upload-policy.ts */
export const UPLOAD_LIMITS: Record<UploadPurpose, Partial<Record<UploadKind, number>>> = {
    'order-draft': { image: 10 * MB, video: 50 * MB, pdf: 10 * MB },
    offer: { image: 10 * MB, video: 50 * MB },
    verification: { image: 10 * MB, video: 50 * MB, pdf: 10 * MB },
    returns: { image: 10 * MB, video: 50 * MB, pdf: 10 * MB },
    disputes: { image: 10 * MB, video: 50 * MB, pdf: 10 * MB },
    support: { image: 10 * MB, video: 25 * MB, pdf: 10 * MB },
    chat: { image: 10 * MB, video: 25 * MB, pdf: 10 * MB },
    appeals: { image: 10 * MB, video: 25 * MB, pdf: 10 * MB },
    avatar: { image: 2 * MB },
    'store-logo': { image: 2 * MB },
    'vendor-document': { image: 5 * MB, pdf: 5 * MB },
};

export const ALLOWED_UPLOAD_MIMES = [
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'application/pdf',
    'video/mp4',
    'video/quicktime',
    'video/webm',
] as const;

export const MIME_BY_EXT: Record<string, string> = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    webp: 'image/webp',
    gif: 'image/gif',
    pdf: 'application/pdf',
    mp4: 'video/mp4',
    m4v: 'video/mp4',
    mov: 'video/quicktime',
    webm: 'video/webm',
    heic: 'image/heic',
    heif: 'image/heif',
};

const RASTER = ['image/jpeg', 'image/png', 'image/webp'] as const;

/** Narrower per-purpose allow-lists; must stay identical to backend `mimes`. */
export const PURPOSE_MIMES: Partial<Record<UploadPurpose, readonly string[]>> = {
    avatar: RASTER,
    'store-logo': RASTER,
    'vendor-document': [...RASTER, 'application/pdf'],
};

export function kindOfMime(mime: string): UploadKind | null {
    if (mime.startsWith('image/')) return 'image';
    if (mime.startsWith('video/')) return 'video';
    if (mime === 'application/pdf') return 'pdf';
    return null;
}

export function maxBytesForPurpose(purpose: UploadPurpose, mime: string): number | null {
    if (!(ALLOWED_UPLOAD_MIMES as readonly string[]).includes(mime)) return null;
    const narrowed = PURPOSE_MIMES[purpose];
    if (narrowed && !narrowed.includes(mime)) return null;
    const kind = kindOfMime(mime);
    return (kind && UPLOAD_LIMITS[purpose][kind]) || null;
}
