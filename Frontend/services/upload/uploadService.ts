import axios from 'axios';
import { client } from '../api/client';
import { compressImageForUpload } from '../../utils/compressImage';
import { useUploadFeedbackStore, type UploadErrorCode, type UploadFeedbackKind } from '../../stores/useUploadFeedbackStore';
import { beginUploadActivity, endUploadActivity } from './uploadActivity';
import { MIME_BY_EXT, UPLOAD_LIMITS, kindOfMime, maxBytesForPurpose, type UploadPurpose } from './uploadLimits';

export class UploadError extends Error {
    code: UploadErrorCode;
    constructor(code: UploadErrorCode, message?: string) {
        super(message || code);
        this.name = 'UploadError';
        this.code = code;
    }
}

export interface UploadContext {
    orderId?: string;
    folder?: string;
    chatId?: string;
    violationId?: string;
}

export interface UploadMediaOptions {
    purpose: UploadPurpose;
    context?: UploadContext;
    onProgress?: (pct: number) => void;
    signal?: AbortSignal;
    silent?: boolean;
}

const RETRY_DELAYS_MS = [0, 1000, 3000];
const STALL_TIMEOUT_MS = 30_000;
const API_TIMEOUT_MS = 15_000;
const NON_RETRYABLE: UploadErrorCode[] = ['too_large', 'type', 'forbidden', 'rejected', 'cancelled'];

const sleep = (ms: number, signal?: AbortSignal) =>
    new Promise<void>((resolve, reject) => {
        if (ms <= 0) return resolve();
        const t = setTimeout(resolve, ms);
        signal?.addEventListener(
            'abort',
            () => {
                clearTimeout(t);
                reject(new UploadError('cancelled'));
            },
            { once: true },
        );
    });

function resolveMime(file: File): string {
    let mime = (file.type || '').toLowerCase();
    if (mime === 'image/jpg') mime = 'image/jpeg';
    if (!mime) {
        const ext = (file.name.split('.').pop() || '').toLowerCase();
        mime = MIME_BY_EXT[ext] || '';
    }
    return mime;
}

function feedbackKind(mime: string): UploadFeedbackKind {
    return kindOfMime(mime) ?? 'file';
}

function statusToCode(status: number): UploadErrorCode {
    if (status === 413) return 'too_large';
    if (status === 401 || status === 403) return 'forbidden';
    if (status === 429) return 'rate_limited';
    if (status >= 500) return 'server';
    if (status >= 400) return 'rejected';
    return 'network';
}

function toUploadError(err: unknown): UploadError {
    if (err instanceof UploadError) return err;
    if (axios.isCancel(err)) return new UploadError('cancelled');
    if (axios.isAxiosError(err)) {
        if (err.code === 'ECONNABORTED' || err.code === 'ETIMEDOUT') return new UploadError('timeout');
        if (err.response) {
            const msg = String((err.response.data as any)?.message || '').toLowerCase();
            if (msg.includes('too large')) return new UploadError('too_large');
            if (msg.includes('type not allowed')) return new UploadError('type');
            return new UploadError(statusToCode(err.response.status));
        }
        return new UploadError('network');
    }
    return new UploadError('network');
}

/** Prepares the file (mime fix, compression) and validates it against the purpose limits. */
async function prepareFile(file: File, purpose: UploadPurpose): Promise<{ file: File; mime: string }> {
    let mime = resolveMime(file);
    let prepared = file;

    const imageLimit = UPLOAD_LIMITS[purpose].image ?? 0;
    const isHeic = mime === 'image/heic' || mime === 'image/heif';
    // Output is always JPEG, so PNG/WebP (which may carry transparency) are only re-encoded when they exceed the limit.
    const shouldCompress =
        isHeic || mime === 'image/jpeg' || ((mime === 'image/png' || mime === 'image/webp') && file.size > imageLimit);

    if (shouldCompress) {
        const typed = file.type ? file : new File([file], file.name, { type: mime });
        prepared = await compressImageForUpload(typed, { maxEdge: 1600, quality: 0.82, force: isHeic || file.size > imageLimit });
        mime = resolveMime(prepared);
        if (mime === 'image/heic' || mime === 'image/heif') throw new UploadError('type');
    }

    if (!prepared.type || prepared.type.toLowerCase() !== mime) {
        prepared = new File([prepared], prepared.name, { type: mime });
    }

    const limit = maxBytesForPurpose(purpose, mime);
    if (!limit) throw new UploadError('type');
    if (prepared.size > limit) throw new UploadError('too_large');

    return { file: prepared, mime };
}

function putWithProgress(
    signedUrl: string,
    file: File,
    onProgress: (pct: number) => void,
    signal?: AbortSignal,
): Promise<void> {
    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        let stallTimer: ReturnType<typeof setTimeout> | undefined;
        let settled = false;

        const finish = (err?: UploadError) => {
            if (settled) return;
            settled = true;
            if (stallTimer) clearTimeout(stallTimer);
            signal?.removeEventListener('abort', onAbort);
            if (err) reject(err);
            else resolve();
        };
        const armStall = () => {
            if (stallTimer) clearTimeout(stallTimer);
            stallTimer = setTimeout(() => {
                xhr.abort();
                finish(new UploadError('timeout'));
            }, STALL_TIMEOUT_MS);
        };
        const onAbort = () => {
            xhr.abort();
            finish(new UploadError('cancelled'));
        };

        if (signal?.aborted) return finish(new UploadError('cancelled'));
        signal?.addEventListener('abort', onAbort, { once: true });

        xhr.open('PUT', signedUrl);
        xhr.setRequestHeader('x-upsert', 'false');
        xhr.upload.onprogress = (e) => {
            armStall();
            if (e.lengthComputable && e.total > 0) onProgress((e.loaded / e.total) * 100);
        };
        xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) return finish();
            let code = statusToCode(xhr.status);
            const body = (xhr.responseText || '').toLowerCase();
            if (body.includes('maximum allowed size') || body.includes('payload too large')) code = 'too_large';
            else if (body.includes('mime type') && body.includes('not supported')) code = 'type';
            finish(new UploadError(code));
        };
        xhr.onerror = () => finish(new UploadError('network'));
        xhr.ontimeout = () => finish(new UploadError('timeout'));

        const body = new FormData();
        body.append('cacheControl', '3600');
        body.append('', file);
        armStall();
        xhr.send(body);
    });
}

async function uploadPrepared(
    file: File,
    mime: string,
    opts: UploadMediaOptions,
    onPct: (pct: number) => void,
): Promise<string> {
    const ctx = opts.context || {};
    let lastError: UploadError = new UploadError('network');

    for (let attempt = 0; attempt < RETRY_DELAYS_MS.length; attempt++) {
        try {
            await sleep(RETRY_DELAYS_MS[attempt], opts.signal);
            if (opts.signal?.aborted) throw new UploadError('cancelled');

            const { data: signed } = await client.post(
                '/uploads/sign',
                {
                    purpose: opts.purpose,
                    contentType: mime,
                    size: file.size,
                    ...(ctx.folder ? { folder: ctx.folder } : {}),
                    ...(ctx.orderId ? { orderId: ctx.orderId } : {}),
                    ...(ctx.chatId ? { chatId: ctx.chatId } : {}),
                    ...(ctx.violationId ? { violationId: ctx.violationId } : {}),
                },
                { timeout: API_TIMEOUT_MS, signal: opts.signal },
            );

            onPct(0);
            await putWithProgress(signed.signedUrl, file, onPct, opts.signal);

            const { data: confirmed } = await client.post(
                '/uploads/confirm',
                { purpose: opts.purpose, path: signed.path },
                { timeout: API_TIMEOUT_MS, signal: opts.signal },
            );
            onPct(100);
            return String(confirmed.url);
        } catch (err) {
            lastError = toUploadError(err);
            if (NON_RETRYABLE.includes(lastError.code)) throw lastError;
        }
    }
    throw lastError;
}

/** Uploads one file directly to storage via a backend-issued signed URL. Resolves to the public URL. */
export async function uploadMedia(file: File, opts: UploadMediaOptions): Promise<string> {
    const store = useUploadFeedbackStore.getState();
    let feedbackId: string | null = null;
    const fallbackKind = feedbackKind(resolveMime(file));

    try {
        const { file: prepared, mime } = await prepareFile(file, opts.purpose);
        if (!opts.silent) feedbackId = store.start({ kind: feedbackKind(mime), count: 1 });
        beginUploadActivity();
        try {
            const url = await uploadPrepared(prepared, mime, opts, (pct) => {
                opts.onProgress?.(pct);
                if (feedbackId) useUploadFeedbackStore.getState().progress(feedbackId, pct);
            });
            if (feedbackId) useUploadFeedbackStore.getState().succeed(feedbackId);
            return url;
        } finally {
            endUploadActivity();
        }
    } catch (err) {
        const e = toUploadError(err);
        if (!opts.silent) {
            if (feedbackId) useUploadFeedbackStore.getState().fail(feedbackId, e.code);
            else useUploadFeedbackStore.getState().notify({ status: 'error', kind: fallbackKind, errorCode: e.code });
        }
        throw e;
    }
}

/** Uploads several files (max 3 in parallel) under one capsule; URLs keep the input order. */
export async function uploadManyMedia(files: File[], opts: UploadMediaOptions): Promise<string[]> {
    if (files.length === 0) return [];
    if (files.length === 1) return [await uploadMedia(files[0], opts)];

    const kinds = new Set(files.map((f) => feedbackKind(resolveMime(f))));
    const kind: UploadFeedbackKind = kinds.size === 1 ? [...kinds][0] : 'file';
    const feedbackId = opts.silent ? null : useUploadFeedbackStore.getState().start({ kind, count: files.length });

    const controller = new AbortController();
    const onOuterAbort = () => controller.abort();
    opts.signal?.addEventListener('abort', onOuterAbort, { once: true });

    const progress = new Array(files.length).fill(0);
    const report = () => {
        const pct = progress.reduce((a, b) => a + b, 0) / files.length;
        opts.onProgress?.(pct);
        if (feedbackId) useUploadFeedbackStore.getState().progress(feedbackId, pct);
    };

    const results = new Array<string>(files.length);
    let next = 0;
    const worker = async () => {
        while (next < files.length) {
            const index = next++;
            results[index] = await uploadMedia(files[index], {
                ...opts,
                silent: true,
                signal: controller.signal,
                onProgress: (pct) => {
                    progress[index] = pct;
                    report();
                },
            });
        }
    };

    try {
        await Promise.all(Array.from({ length: Math.min(3, files.length) }, worker));
        if (feedbackId) useUploadFeedbackStore.getState().succeed(feedbackId);
        return results;
    } catch (err) {
        controller.abort();
        const e = toUploadError(err);
        if (feedbackId) useUploadFeedbackStore.getState().fail(feedbackId, e.code);
        throw e;
    } finally {
        opts.signal?.removeEventListener('abort', onOuterAbort);
    }
}
