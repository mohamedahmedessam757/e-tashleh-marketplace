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

export function kindOfMime(mime: string): UploadKind | null {
    if (mime.startsWith('image/')) return 'image';
    if (mime.startsWith('video/')) return 'video';
    if (mime === 'application/pdf') return 'pdf';
    return null;
}
