import { create } from 'zustand';
import { Return, Dispute } from '../types';

interface ReturnsState {
    returns: Return[];
    disputes: Dispute[];
    deliveredOrders: any[];
    loading: boolean;
    error: string | null;

    fetchReturnsAndDisputes: (options?: { silent?: boolean }) => Promise<void>;
    fetchDeliveredOrders: () => Promise<void>;
    requestReturn: (orderId: string, orderPartId: string | undefined, reason: string, description: string, usageCondition: string | undefined, files: File[]) => Promise<boolean>;
    cancelReturn: (returnId: string) => Promise<boolean>;
    escalateDispute: (orderId: string, orderPartId: string | undefined, reason: string, description: string, files: File[]) => Promise<boolean>;
}

const getApiUrl = () => import.meta.env.VITE_API_URL || 'http://localhost:3000';

const getAuthHeaders = (): HeadersInit => {
    const token = localStorage.getItem('access_token');
    if (!token) throw new Error('No authentication token found');
    return { Authorization: `Bearer ${token}` };
};

const parseApiError = async (response: Response, fallback: string) => {
    const errorText = await response.text();
    try {
        const parsed = JSON.parse(errorText);
        return parsed?.message || parsed?.error || errorText || fallback;
    } catch {
        return errorText || fallback;
    }
};

export const useReturnsStore = create<ReturnsState>((set, get) => ({
    returns: [],
    disputes: [],
    deliveredOrders: [],
    loading: false,
    error: null,

    fetchDeliveredOrders: async () => {
        const token = localStorage.getItem('access_token');
        if (!token) return;

        set({ loading: true, error: null });
        try {
            const response = await fetch(`${getApiUrl()}/orders/delivered`, {
                headers: { Authorization: `Bearer ${token}` },
            });

            if (!response.ok) {
                throw new Error('Failed to fetch delivered orders');
            }

            const data = await response.json();
            set({ deliveredOrders: data || [], loading: false });
        } catch (err: any) {
            console.error('Error fetching delivered orders:', err);
            set({ error: err.message, loading: false });
        }
    },

    fetchReturnsAndDisputes: async (options?: { silent?: boolean }) => {
        const token = localStorage.getItem('access_token');
        if (!token) return;

        const silent = options?.silent ?? false;
        if (!silent) {
            set({ loading: true, error: null });
        }
        try {
            const response = await fetch(`${getApiUrl()}/returns/my-requests`, {
                headers: { Authorization: `Bearer ${token}` },
            });

            if (!response.ok) {
                throw new Error('Failed to fetch returns history');
            }

            const data = await response.json();
            set({
                returns: data.returns || [],
                disputes: data.disputes || [],
                ...(silent ? {} : { loading: false }),
            });
        } catch (err: any) {
            console.error('Error fetching returns/disputes:', err);
            set({ error: err.message });
        } finally {
            if (!silent) {
                set({ loading: false });
            }
        }
    },

    requestReturn: async (orderId, orderPartId, reason, description, usageCondition, files) => {
        set({ error: null });
        try {
            const formData = new FormData();
            formData.append('orderId', orderId);
            if (orderPartId) formData.append('orderPartId', orderPartId);
            formData.append('reason', reason);
            formData.append('description', description);
            if (usageCondition) formData.append('usageCondition', usageCondition);
            files?.forEach((file) => formData.append('files', file));

            const response = await fetch(`${getApiUrl()}/returns/request`, {
                method: 'POST',
                headers: getAuthHeaders(),
                body: formData,
            });

            if (!response.ok) {
                throw new Error(await parseApiError(response, 'Failed to request return'));
            }

            void get().fetchReturnsAndDisputes({ silent: true });
            return true;
        } catch (error: any) {
            console.error('Failed to request return:', error);
            set({ error: error?.message || 'Failed to request return' });
            return false;
        }
    },

    cancelReturn: async (returnId: string) => {
        try {
            const response = await fetch(`${getApiUrl()}/returns/${returnId}/cancel`, {
                method: 'POST',
                headers: getAuthHeaders(),
            });

            if (!response.ok) {
                throw new Error(await parseApiError(response, 'Failed to cancel return'));
            }

            void get().fetchReturnsAndDisputes({ silent: true });
            return true;
        } catch (err: any) {
            console.error('Failed to cancel return:', err);
            set({ error: err?.message || 'Failed to cancel return' });
            return false;
        }
    },

    escalateDispute: async (orderId, orderPartId, reason, description, files) => {
        set({ error: null });
        try {
            const formData = new FormData();
            formData.append('orderId', orderId);
            if (orderPartId) formData.append('orderPartId', orderPartId);
            formData.append('reason', reason);
            formData.append('description', description);
            files?.forEach((file) => formData.append('files', file));

            const response = await fetch(`${getApiUrl()}/returns/dispute`, {
                method: 'POST',
                headers: getAuthHeaders(),
                body: formData,
            });

            if (!response.ok) {
                throw new Error(await parseApiError(response, 'Failed to escalate dispute'));
            }

            void get().fetchReturnsAndDisputes({ silent: true });
            return true;
        } catch (error: any) {
            console.error('Failed to escalate dispute:', error);
            set({ error: error?.message || 'Failed to escalate dispute' });
            return false;
        }
    },
}));
