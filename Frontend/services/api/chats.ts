import { client } from './client';

export const chatsApi = {
    adminInitChat: async (data: {
        targetUserId: string;
        targetRole: 'CUSTOMER' | 'VENDOR';
        reason: string;
        employeeName: string;
        signature: string;
        signatureType: 'DRAWN' | 'TYPED';
        orderId?: string;
    }) => {
        const response = await client.post('/chats/admin-init-support', data);
        return response.data;
    },

    getChatById: async (id: string) => {
        const response = await client.get(`/chats/${id}`);
        return response.data;
    },

    sendMessage: async (chatId: string, data: any) => {
        const response = await client.post(`/chats/${chatId}/messages`, data);
        return response.data;
    }
};
