import { client } from './client';

export const storesApi = {
    updateStatus: async (storeId: string, status: 'ACTIVE' | 'BLOCKED' | 'REJECTED' | 'SUSPENDED', reason?: string, suspendedUntil?: string) => {
        const response = await client.patch(`/stores/${storeId}/status`, { status, reason, suspendedUntil });
        return response.data;
    },

    updateDocumentStatus: async (storeId: string, docType: string, status: string, reason?: string, adminName?: string, adminSignature?: string) => {
        const response = await client.patch(`/stores/${storeId}/documents/${docType}/status`, { status, reason, adminName, adminSignature });
        return response.data;
    },

    updateNotes: async (storeId: string, notes: string) => {
        const response = await client.patch(`/stores/${storeId}/notes`, { notes });
        return response.data;
    },

    getStoreProfile: async (id: string) => {
        const response = await client.get(`/stores/${id}`);
        return response.data;
    },

    uploadDocument: async (file: File, type: string) => {
        // Implement if needed for separate upload
        // Placeholder for future logic
    }
};
