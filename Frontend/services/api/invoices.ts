import { client } from './client';

export const invoicesApi = {
    // Get all invoices for user
    getMyInvoices: async () => {
        const response = await client.get('/invoices');
        return response.data;
    },

    // Get all invoices for merchant's store
    getMerchantInvoices: async () => {
        const response = await client.get('/invoices/merchant');
        return response.data;
    },

    // Get invoices for a specific order
    getOrderInvoices: async (orderId: string) => {
        const response = await client.get(`/invoices/order/${orderId}`);
        return response.data;
    },

    // Get specific invoice
    getById: async (id: string) => {
        const response = await client.get(`/invoices/${id}`);
        return response.data;
    }
};
