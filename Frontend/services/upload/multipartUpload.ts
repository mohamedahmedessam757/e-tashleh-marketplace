import axios from 'axios';
import { compressImageForUpload } from '../../utils/compressImage';
import { useUploadFeedbackStore, type UploadErrorCode, type UploadFeedbackKind } from '../../stores/useUploadFeedbackStore';
import { beginUploadActivity, endUploadActivity } from './uploadActivity';
import { UploadError } from './uploadService';

/**
 * Helpers for endpoints that still receive files inside a multipart form
 * (returns, disputes, field inspection, platform assets).
 */

const MB = 1024 * 1024;
export const MULTIPART_TIMEOUT_MS = 180_000;

export function multipartFeedbackKind(files: File[]): UploadFeedbackKind {
    const kinds = new Set(
        files.map((f) =>
            f.type.startsWith('image/') ? 'image' : f.type.startsWith('video/') ? 'video' : f.type === 'application/pdf' ? 'pdf' : 'file',
        ),
    );
    return kinds.size === 1 ? ([...kinds][0] as UploadFeedbackKind) : 'file';
}

/** Compresses images and enforces the server's per-file limits before building the FormData. */
export async function prepareMultipartFiles(
    files: File[] | undefined,
    limits: { maxBytes?: number; videoMaxBytes?: number; compress?: boolean } = {},
): Promise<File[]> {
    const maxBytes = limits.maxBytes ?? 10 * MB;
    const videoMaxBytes = limits.videoMaxBytes ?? maxBytes;
    const compress = limits.compress ?? true;
    const out: File[] = [];
    for (const file of files || []) {
        const prepared = compress && file.type.startsWith('image/') ? await compressImageForUpload(file) : file;
        const cap = prepared.type.startsWith('video/') ? videoMaxBytes : maxBytes;
        if (prepared.size > cap) throw new UploadError('too_large');
        out.push(prepared);
    }
    return out;
}

/** fetch() with a hard timeout; marks upload activity so connectivity probes don't flag platform_down. */
export async function fetchWithUploadTimeout(
    url: string,
    init: RequestInit,
    timeoutMs = MULTIPART_TIMEOUT_MS,
): Promise<Response> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    beginUploadActivity();
    try {
        return await fetch(url, { ...init, signal: controller.signal });
    } catch (err) {
        if (controller.signal.aborted) throw new UploadError('timeout');
        throw new UploadError('network', err instanceof Error ? err.message : undefined);
    } finally {
        clearTimeout(timer);
        endUploadActivity();
    }
}

/** Maps transport failures (axios timeout / no response) to UploadError; business errors pass through. */
export function asMultipartUploadError(err: unknown): unknown {
    if (err instanceof UploadError) return err;
    if (axios.isAxiosError(err) && !err.response) {
        return new UploadError(err.code === 'ECONNABORTED' || err.code === 'ETIMEDOUT' ? 'timeout' : 'network');
    }
    if (axios.isAxiosError(err) && err.response?.status === 413) return new UploadError('too_large');
    return err;
}

/** Runs a multipart request while marking upload activity (keeps connectivity probes from flagging platform_down). */
export async function withUploadActivity<T>(run: () => Promise<T>): Promise<T> {
    beginUploadActivity();
    try {
        return await run();
    } finally {
        endUploadActivity();
    }
}

/** Admin platform assets (logos, icons, NOMO document) — POST /admin/uploads/platform-asset. */
export async function uploadPlatformAssetFile(
    apiUrl: string,
    token: string | null,
    file: File,
    assetType: string,
): Promise<string> {
    const maxBytes = assetType === 'nomo-document' ? 50 * MB : 5 * MB;
    try {
        const [prepared] = await prepareMultipartFiles([file], { maxBytes, compress: false });
        const fd = new FormData();
        fd.append('file', prepared);
        fd.append('assetType', assetType);
        const res = await fetchWithUploadTimeout(`${apiUrl}/admin/uploads/platform-asset`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
            body: fd,
        });
        if (!res.ok) throw new UploadError(res.status === 413 ? 'too_large' : res.status >= 500 ? 'server' : 'rejected');
        const { url } = await res.json();
        notifyMultipartResult('success', [prepared]);
        return url;
    } catch (err) {
        notifyMultipartResult('error', [file], err);
        throw err;
    }
}

export function notifyMultipartResult(
    status: 'success' | 'error',
    files: File[] | undefined,
    error?: unknown,
): void {
    const list = files || [];
    if (list.length === 0) return;
    const mapped = asMultipartUploadError(error);
    // Business-rule rejections are shown by the caller's own error UI
    if (status === 'error' && !(mapped instanceof UploadError)) return;
    const errorCode: UploadErrorCode | undefined = mapped instanceof UploadError ? mapped.code : undefined;
    useUploadFeedbackStore.getState().notify({
        status,
        kind: multipartFeedbackKind(list),
        count: list.length,
        errorCode,
    });
}
