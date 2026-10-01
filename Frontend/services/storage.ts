import { uploadMedia } from './upload/uploadService';

export const storageService = {
    uploadFile: async (file: File, bucket = 'marketplace-uploads', folder = 'orders') => {
        try {
            if (bucket !== 'marketplace-uploads') {
                throw new Error('Unsupported bucket for client-side upload');
            }
            return await uploadMedia(file, { purpose: 'order-draft', context: { folder } });
        } catch (err) {
            console.error('Upload Error:', err);
            throw err;
        }
    }
};
