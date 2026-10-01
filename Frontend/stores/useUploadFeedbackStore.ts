import { create } from 'zustand';

export type UploadFeedbackStatus = 'uploading' | 'success' | 'error';
export type UploadFeedbackKind = 'image' | 'video' | 'pdf' | 'file';
export type UploadErrorCode =
    | 'too_large'
    | 'type'
    | 'network'
    | 'timeout'
    | 'server'
    | 'forbidden'
    | 'rejected'
    | 'rate_limited'
    | 'cancelled';

export interface UploadFeedbackItem {
    id: string;
    status: UploadFeedbackStatus;
    kind: UploadFeedbackKind;
    count: number;
    progress: number;
    errorCode?: UploadErrorCode;
}

interface UploadFeedbackState {
    items: UploadFeedbackItem[];
    start: (input: { kind: UploadFeedbackKind; count?: number }) => string;
    progress: (id: string, pct: number) => void;
    succeed: (id: string) => void;
    fail: (id: string, code: UploadErrorCode) => void;
    notify: (input: {
        status: 'success' | 'error';
        kind: UploadFeedbackKind;
        count?: number;
        errorCode?: UploadErrorCode;
    }) => void;
    dismiss: (id: string) => void;
}

const MAX_ITEMS = 3;
const SUCCESS_TTL_MS = 3000;
const ERROR_TTL_MS = 6000;

const newId = () =>
    (typeof crypto !== 'undefined' && crypto.randomUUID?.()) || String(Date.now() + Math.random());

const pushItem = (items: UploadFeedbackItem[], item: UploadFeedbackItem) =>
    [...items, item].slice(-MAX_ITEMS);

export const useUploadFeedbackStore = create<UploadFeedbackState>((set, get) => {
    const scheduleDismiss = (id: string, ms: number) => {
        setTimeout(() => get().dismiss(id), ms);
    };

    return {
        items: [],

        start: ({ kind, count = 1 }) => {
            const id = newId();
            set((s) => ({ items: pushItem(s.items, { id, status: 'uploading', kind, count, progress: 0 }) }));
            return id;
        },

        progress: (id, pct) => {
            const next = Math.max(0, Math.min(100, Math.round(pct)));
            const cur = get().items.find((i) => i.id === id);
            if (!cur || cur.status !== 'uploading') return;
            if (next !== 100 && Math.abs(next - cur.progress) < 5) return;
            set((s) => ({ items: s.items.map((i) => (i.id === id ? { ...i, progress: next } : i)) }));
        },

        succeed: (id) => {
            set((s) => ({
                items: s.items.map((i) => (i.id === id ? { ...i, status: 'success', progress: 100 } : i)),
            }));
            scheduleDismiss(id, SUCCESS_TTL_MS);
        },

        fail: (id, code) => {
            if (code === 'cancelled') {
                get().dismiss(id);
                return;
            }
            set((s) => ({
                items: s.items.map((i) => (i.id === id ? { ...i, status: 'error', errorCode: code } : i)),
            }));
            scheduleDismiss(id, ERROR_TTL_MS);
        },

        notify: ({ status, kind, count = 1, errorCode }) => {
            if (status === 'error' && errorCode === 'cancelled') return;
            const id = newId();
            set((s) => ({
                items: pushItem(s.items, {
                    id,
                    status,
                    kind,
                    count,
                    progress: status === 'success' ? 100 : 0,
                    errorCode,
                }),
            }));
            scheduleDismiss(id, status === 'success' ? SUCCESS_TTL_MS : ERROR_TTL_MS);
        },

        dismiss: (id) => {
            set((s) => ({ items: s.items.filter((i) => i.id !== id) }));
        },
    };
});
