/**
 * Storage uploads go through backend-signed direct uploads (see services/upload/uploadService).
 */
import { uploadMedia } from '../upload/uploadService';

export const storageApi = {
  upload: async (
    file: File,
    _bucket: 'store_documents' | 'marketplace-uploads' | 'support-files',
    folder: string = '',
  ): Promise<string> => {
    if (_bucket === 'support-files') {
      return uploadMedia(file, { purpose: 'support', context: { folder } });
    }
    if (folder.includes('appeal')) {
      const violationId = folder.split('/').pop() || folder;
      return uploadMedia(file, { purpose: 'appeals', context: { violationId } });
    }
    // Admin dispute verdict assets — fast path (no verification-docs pipeline)
    if (
      folder.startsWith('admin-verdicts/') ||
      folder.startsWith('admin-evidence/')
    ) {
      return uploadMedia(file, { purpose: 'order-draft', context: { folder } });
    }
    const orderId = folder.split('/').pop() || 'misc';
    return uploadMedia(file, { purpose: 'verification', context: { orderId, folder } });
  },
};
