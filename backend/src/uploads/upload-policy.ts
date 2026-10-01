export const UPLOAD_PURPOSES = [
    'order-draft',
    'offer',
    'verification',
    'returns',
    'disputes',
    'support',
    'chat',
    'appeals',
    'avatar',
    'store-logo',
    'vendor-document',
] as const;
export type UploadPurpose = (typeof UPLOAD_PURPOSES)[number];
export type UploadKind = 'image' | 'video' | 'pdf';

export const MIME_EXT: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/gif': 'gif',
    'application/pdf': 'pdf',
    'video/mp4': 'mp4',
    'video/quicktime': 'mov',
    'video/webm': 'webm',
};

export const EXT_MIME: Record<string, string> = Object.fromEntries(
    Object.entries(MIME_EXT).map(([m, e]) => [e, m]),
);

export function kindOfMime(mime: string): UploadKind | null {
    if (mime.startsWith('image/')) return 'image';
    if (mime.startsWith('video/')) return 'video';
    if (mime === 'application/pdf') return 'pdf';
    return null;
}

const MB = 1024 * 1024;

export const UPLOAD_POLICIES: Record<UploadPurpose, { bucket: string; limits: Partial<Record<UploadKind, number>> }> = {
    'order-draft': { bucket: 'marketplace-uploads', limits: { image: 10 * MB, video: 50 * MB, pdf: 10 * MB } },
    offer: { bucket: 'offer-attachments', limits: { image: 10 * MB, video: 50 * MB } },
    verification: { bucket: 'verification-docs', limits: { image: 10 * MB, video: 50 * MB, pdf: 10 * MB } },
    returns: { bucket: 'returns-disputes', limits: { image: 10 * MB, video: 50 * MB, pdf: 10 * MB } },
    disputes: { bucket: 'returns-disputes', limits: { image: 10 * MB, video: 50 * MB, pdf: 10 * MB } },
    support: { bucket: 'support-files', limits: { image: 10 * MB, video: 25 * MB, pdf: 10 * MB } },
    chat: { bucket: 'chat_media', limits: { image: 10 * MB, video: 25 * MB, pdf: 10 * MB } },
    appeals: { bucket: 'appeals', limits: { image: 10 * MB, video: 25 * MB, pdf: 10 * MB } },
    avatar: { bucket: 'marketplace-uploads', limits: { image: 2 * MB } },
    'store-logo': { bucket: 'profile', limits: { image: 2 * MB } },
    'vendor-document': { bucket: 'vendor-documents', limits: { image: 5 * MB, pdf: 5 * MB } },
};
