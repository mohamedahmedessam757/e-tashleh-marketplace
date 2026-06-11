import { client } from './client';

export const offersApi = {
    create: async (data: any) => {
        const response = await client.post('/offers', data);
        return response.data;
    },

    update: async (offerId: string, data: any) => {
        const response = await client.patch(`/offers/${offerId}`, data);
        return response.data;
    },

    findByOrder: async (orderId: string) => {
        const response = await client.get(`/offers/order/${orderId}`);
        return response.data;
    },

    findMyOffers: async (orderId: string) => {
        const response = await client.get(`/offers/my/${orderId}`);
        return response.data;
    },

    cancel: async (offerId: string) => {
        const response = await client.delete(`/offers/${offerId}`);
        return response.data;
    },

    withdraw: async (offerId: string) => {
        const response = await client.post(`/offers/${offerId}/withdraw`);
        return response.data;
    },

    voluntaryWithdraw: async (offerId: string) => {
        const response = await client.post(`/offers/${offerId}/voluntary-withdraw`);
        return response.data;
    },
};
