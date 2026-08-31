import { client } from './api/client';
import { compressImageForUpload } from '../utils/compressImage';

export const storageService = {
    uploadFile: async (file: File, bucket = 'marketplace-uploads', folder = 'orders') => {
        try {
            if (bucket !== 'marketplace-uploads') {
                throw new Error('Unsupported bucket for client-side upload');
            }
            // Shrink large phone-camera photos before network transfer
            const payloadFile = await compressImageForUpload(file);
            const formData = new FormData();
            formData.append('file', payloadFile);
            formData.append('folder', folder);
            const { data } = await client.post<{ url: string }>('/uploads/order-draft', formData);
            return data.url;
        } catch (err) {
            console.error('Upload Error:', err);
            throw err;
        }
    }
};
