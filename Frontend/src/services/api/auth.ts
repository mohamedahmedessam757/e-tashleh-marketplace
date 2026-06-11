import { client } from './client';

export const authApi = {
    login: async (email: string, password: string) => {
        // Backend API: POST /auth/login
        // Body: { email, password }
        const response = await client.post('/auth/login', { email, password });
        return response.data; // Should return { access_token, user }
    },

    registerCustomer: async (data: any) => {
        const response = await client.post('/auth/register/customer', data);
        return response.data;
    },

    registerVendor: async (data: any) => {
        const response = await client.post('/auth/register/vendor', data);
        return response.data;
    },

    getProfile: async () => {
        const response = await client.get('/auth/profile');
        return response.data;
    }
};
