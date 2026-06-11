import { client } from './api/client';

export const storageService = {
    uploadFile: async (file: File, bucket = 'marketplace-uploads', folder = 'orders') => {
        try {
            if (bucket !== 'marketplace-uploads') {
                throw new Error('Unsupported bucket for client-side upload');
            }
            const formData = new FormData();
            formData.append('file', file);
            formData.append('folder', folder);
            const { data } = await client.post<{ url: string }>('/uploads/order-draft', formData);
            return data.url;
        } catch (err) {
            console.error('Upload Error:', err);
            throw err;
        }
    }
};
