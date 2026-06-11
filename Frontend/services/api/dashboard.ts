
import { client } from './client';

export const dashboardApi = {
    getStats: async () => {
        const response = await client.get('/dashboard/stats');
        return response.data;
    }
};
