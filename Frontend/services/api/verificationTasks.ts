import { client } from './client';

export const verificationTasksApi = {
  assignTask: (orderId: string, officerId?: string, offerId?: string) =>
    client.post('/verification-tasks', { orderId, officerId, offerId }),

  getMyTasks: () => client.get('/verification-tasks/my-tasks'),

  getAdminQueue: () => client.get('/verification-tasks/admin-queue'),

  /** Every field verification task (admin dashboard — full history). */
  listAllForAdmin: () => client.get('/verification-tasks/admin/all'),

  getByOrder: (orderId: string) => client.get(`/verification-tasks/order/${orderId}`),

  getTask: (taskId: string) => client.get(`/verification-tasks/${taskId}`),

  getActivityLog: (taskId: string) => client.get(`/verification-tasks/${taskId}/activity-log`),

  generateLink: (taskId: string, durationHours = 24) =>
    client.post(`/verification-tasks/${taskId}/generate-link`, { durationHours }),

  validatePublicLink: (token: string) =>
    client.get(`/verification-tasks/public/link/${token}`),

  activateLink: (token: string, payload?: { lat?: number; lng?: number; deviceInfo?: Record<string, unknown> }) =>
    client.post(`/verification-tasks/link/${token}/activate`, payload ?? {}),

  start: (
    taskId: string,
    body: {
      lat?: number;
      lng?: number;
      deviceInfo?: Record<string, unknown>;
      gpsDevBypass?: boolean;
    },
  ) => client.post(`/verification-tasks/${taskId}/start`, body),

  uploadPhotos: (taskId: string, body: { photos: string[]; lat?: number; lng?: number }) =>
    client.post(`/verification-tasks/${taskId}/upload-photos`, body),

  uploadFieldPhotos: (taskId: string, files: File[]) => {
    const fd = new FormData();
    files.forEach((f) => fd.append('files', f));
    return client.post<{ urls: string[]; success: boolean }>(
      `/verification-tasks/${taskId}/field-photos`,
      fd,
    );
  },

  complete: (
    taskId: string,
    body: {
      decision: 'MATCHING' | 'NON_MATCHING';
      reason?: string;
      notes?: string;
      lat?: number;
      lng?: number;
      deviceInfo?: Record<string, unknown>;
    },
  ) => client.post(`/verification-tasks/${taskId}/complete`, body),

  adminFieldReview: (taskId: string, body: { approved: boolean; reason?: string }) =>
    client.post(`/verification-tasks/${taskId}/admin-review`, body),

  /** HTML report (field verification). Use with responseType blob + object URL to open in new tab. */
  getReportBlob: (taskId: string) =>
    client.get<Blob>(`/verification-tasks/${taskId}/report`, {
      responseType: 'blob',
      headers: { Accept: 'text/html' },
    }),

  listOfficers: () => client.get('/verification-tasks/officers'),
};
