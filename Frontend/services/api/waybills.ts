import { client } from './client';

export const waybillsApi = {
    // Get waybills for order
    getByOrder: async (orderId: string) => {
        const response = await client.get(`/waybills/order/${orderId}`);
        return response.data;
    },

    // Get specific waybill
    getById: async (id: string) => {
        const response = await client.get(`/waybills/${id}`);
        return response.data;
    },

    issueForOrder: async (
        orderId: string,
        payload: {
            mode: 'per_part' | 'single_batch' | 'custom';
            offerIds?: string[];
            groups?: { offerIds: string[] }[];
        },
    ) => {
        const response = await client.post(`/orders/${orderId}/waybills/issue`, payload);
        return response.data;
    },
};
