import type {
    UploadErrorCode,
    UploadFeedbackKind,
    UploadFeedbackStatus,
} from '../../stores/useUploadFeedbackStore';

const ERROR_TEXT: Record<Exclude<UploadErrorCode, 'cancelled'>, { ar: string; en: string }> = {
    too_large: { ar: 'حجم الملف أكبر من المسموح', en: 'File is too large' },
    type: { ar: 'نوع الملف غير مدعوم', en: 'File type not supported' },
    network: { ar: 'انقطع الاتصال أثناء الرفع، حاول مرة أخرى', en: 'Connection lost during upload, try again' },
    timeout: { ar: 'استغرق الرفع وقتاً طويلاً، حاول مرة أخرى', en: 'Upload took too long, try again' },
    server: { ar: 'تعذر الرفع مؤقتاً، حاول مرة أخرى', en: 'Upload temporarily unavailable, try again' },
    forbidden: { ar: 'ليس لديك صلاحية لرفع هذا الملف', en: 'You are not allowed to upload this file' },
    rejected: { ar: 'تم رفض الملف', en: 'File was rejected' },
    rate_limited: { ar: 'محاولات كثيرة، انتظر قليلاً', en: 'Too many attempts, please wait' },
};

function uploadingNoun(kind: UploadFeedbackKind, count: number, isAr: boolean): string {
    if (kind === 'image') {
        if (count > 1) return isAr ? `${count} صور` : `${count} photos`;
        return isAr ? 'الصورة' : 'photo';
    }
    if (kind === 'video') return isAr ? 'الفيديو' : 'video';
    if (count > 1) return isAr ? `${count} ملفات` : `${count} files`;
    return isAr ? 'الملف' : 'file';
}

function successText(kind: UploadFeedbackKind, count: number, isAr: boolean): string {
    if (kind === 'image') {
        if (count > 1) return isAr ? `تم رفع ${count} صور بنجاح` : `${count} photos uploaded successfully`;
        return isAr ? 'تم رفع الصورة بنجاح' : 'Photo uploaded successfully';
    }
    if (kind === 'video') return isAr ? 'تم رفع الفيديو بنجاح' : 'Video uploaded successfully';
    if (count > 1) return isAr ? `تم رفع ${count} ملفات بنجاح` : `${count} files uploaded successfully`;
    return isAr ? 'تم رفع الملف بنجاح' : 'File uploaded successfully';
}

export function getUploadMessage(
    status: UploadFeedbackStatus,
    kind: UploadFeedbackKind,
    count: number,
    code: UploadErrorCode | undefined,
    isAr: boolean,
    progress = 0,
): string {
    if (status === 'uploading') {
        const noun = uploadingNoun(kind, count, isAr);
        return isAr ? `جارٍ رفع ${noun}… ${progress}%` : `Uploading ${noun}… ${progress}%`;
    }
    if (status === 'success') return successText(kind, count, isAr);
    if (!code || code === 'cancelled') return '';
    const t = ERROR_TEXT[code];
    return isAr ? t.ar : t.en;
}
