import { client } from './client';

export const paymentsApi = {
    process: async (data: {
        orderId: string;
        offerId: string;
        card: { number: string; expiry: string; cvv: string; holder: string };
    }) => {
        const res = await client.post('/payments/process', data);
        return res.data;
    },

    createIntent: async (data: { orderId: string; offerId: string }) => {
        const res = await client.post('/payments/create-intent', data);
        return res.data;
    },

    getAdminMerchantDashboard: async (targetUserId: string, filters?: { startDate?: string; endDate?: string }) => {
        const res = await client.get(`/payments/admin/merchant/${targetUserId}/dashboard`, { params: filters });
        return res.data;
    },
    getStatus: async (offerId: string) => {
        const res = await client.get(`/payments/status/${offerId}`);
        return res.data;
    },

    /** Triggers server-side fulfillment when Stripe succeeded but webhook is delayed. */
    confirmIntent: async (paymentIntentId: string) => {
        const res = await client.post('/payments/confirm-intent', { paymentIntentId });
        return res.data;
    },
};
