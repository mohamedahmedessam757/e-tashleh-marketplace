import { client } from './client';
import { AuditLog } from '../../stores/useAuditStore';

export const auditApi = {
    getAll: async (cursor?: string, limit: number = 25, search?: string) => {
        const params = new URLSearchParams();
        if (cursor) params.append('cursor', cursor);
        params.append('limit', limit.toString());
        if (search?.trim()) params.append('search', search.trim());

        const response = await client.get<any>(`/audit-logs?${params.toString()}`);
        return response.data;
    },

    getByAction: async (action: string, search?: string) => {
        const params = search?.trim() ? { search: search.trim() } : undefined;
        const response = await client.get<AuditLog[]>(`/audit-logs/action/${action}`, { params });
        return response.data;
    },

    getByOrder: async (orderId: string) => {
        const response = await client.get<AuditLog[]>(`/audit-logs/order/${orderId}`);
        return response.data;
    },

    getByActor: async (actorId: string) => {
        // Backend support pending, fallback to filtering client side if needed or generic all
        const response = await client.get<AuditLog[]>('/audit-logs');
        return response.data.filter(log => log.actorId === actorId);
    }
};
