import { client as api } from './client';

export const supportApi = {
    createTicket: async (data: { subject: string; message: string; priority: string; userId?: string; mediaUrl?: string; mediaType?: string }) => {
        const response = await api.post('/support/tickets', data);
        return response.data;
    },

    getAll: async () => {
        const response = await api.get('/support/tickets');
        return response.data;
    },

    addMessage: async (ticketId: string, data: { text: string; senderId: string; role: string; mediaUrl?: string; mediaType?: string }) => {
        const response = await api.post(`/support/tickets/${ticketId}/messages`, data);
        return response.data;
    }
};
