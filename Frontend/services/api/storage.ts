/**
 * Storage uploads must go through the NestJS API (service role), not direct Supabase anon client.
 */
import { client } from './client';

export const storageApi = {
  upload: async (
    file: File,
    _bucket: 'store_documents' | 'marketplace-uploads' | 'support-files',
    folder: string = '',
  ): Promise<string> => {
    const formData = new FormData();
    formData.append('file', file);
    if (_bucket === 'support-files') {
      formData.append('folder', folder);
      const { data } = await client.post<{ url: string }>('/uploads/support', formData);
      return data.url;
    }
    if (folder.includes('appeal')) {
      const violationId = folder.split('/').pop() || folder;
      formData.append('violationId', violationId);
      const { data } = await client.post<{ url: string }>('/uploads/appeals', formData);
      return data.url;
    }
    const orderId = folder.split('/').pop() || 'misc';
    formData.append('orderId', orderId);
    formData.append('folder', folder);
    const { data } = await client.post<{ url: string }>('/uploads/verification', formData);
    return data.url;
  },
};
