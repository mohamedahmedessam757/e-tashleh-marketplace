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

    getWithdrawalReceipt: async (id: string) => {
        const res = await client.get(`/payments/withdrawals/${id}/receipt`);
        return res.data;
    },

    downloadWithdrawalsExport: async (params: {
        format?: 'xlsx' | 'csv';
        status?: string;
        role?: string;
        from?: string;
        to?: string;
        admin?: boolean;
    }) => {
        const format = params.format || 'xlsx';
        const path = params.admin
            ? '/payments/admin/withdrawals/export'
            : '/payments/withdrawals/export';
        const res = await client.get(path, {
            params: {
                format,
                status: params.status || 'ALL',
                role: params.role,
                from: params.from,
                to: params.to,
            },
            responseType: 'blob',
        });
        const blob = new Blob([res.data], {
            type:
                format === 'csv'
                    ? 'text/csv'
                    : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `withdrawals_${new Date().toISOString().slice(0, 10)}.${format}`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
    },
};
