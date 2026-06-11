import { client } from './client';

export const violationsApi = {
  // Admin Endpoints
  getAll: async (params: any = {}) => {
    const response = await client.get('/violations/admin', { params });
    return response.data;
  },

  getTypes: async (targetType?: string) => {
    const params = targetType ? { targetType } : {};
    const response = await client.get('/violations/types', { params });
    return response.data;
  },

  getThresholds: async (targetType?: string) => {
    const params = targetType ? { targetType } : {};
    const response = await client.get('/violations/thresholds', { params });
    return response.data;
  },

  getPendingAppeals: async () => {
    const response = await client.get('/violations/admin/appeals/pending');
    return response.data;
  },

  getPendingPenalties: async () => {
    const response = await client.get('/violations/admin/penalties/pending');
    return response.data;
  },

  issue: async (data: any) => {
    const response = await client.post('/violations/admin/issue', data);
    return response.data;
  },

  reviewAppeal: async (id: string, data: any) => {
    const response = await client.patch(`/violations/admin/appeals/${id}/review`, data);
    return response.data;
  },

  reviewPenalty: async (id: string, data: any) => {
    const response = await client.patch(`/violations/admin/penalties/${id}/review`, data);
    return response.data;
  },

  createType: async (data: any) => {
    const response = await client.post('/violations/admin/types', data);
    return response.data;
  },

  updateType: async (id: string, data: any) => {
    const response = await client.patch(`/violations/admin/types/${id}`, data);
    return response.data;
  },

  createThreshold: async (data: any) => {
    const response = await client.post('/violations/admin/thresholds', data);
    return response.data;
  },

  updateThreshold: async (id: string, data: any) => {
    const response = await client.patch(`/violations/admin/thresholds/${id}`, data);
    return response.data;
  },

  deleteThreshold: async (id: string) => {
    const response = await client.delete(`/violations/admin/thresholds/${id}`);
    return response.data;
  },

  getRiskAlerts: async (status?: string) => {
    const params = status ? { status } : {};
    const response = await client.get('/violations/admin/risk-alerts', { params });
    return response.data;
  },

  resolveRiskAlert: async (id: string, data: any) => {
    const response = await client.patch(`/violations/admin/risk-alerts/${id}/resolve`, data);
    return response.data;
  },

  // User Endpoints
  getMyViolations: async () => {
    const response = await client.get('/violations/my');
    return response.data;
  },

  getMyScore: async () => {
    const response = await client.get('/violations/score');
    return response.data;
  },

  submitAppeal: async (violationId: string, data: { reason: string; evidenceUrls?: string[] }) => {
    const response = await client.post(`/violations/${violationId}/appeal`, data);
    return response.data;
  },

  uploadAppealFile: async (violationId: string, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('violationId', violationId);
    const response = await client.post('/uploads/appeals', formData);
    return response.data;
  },

  // 2026 Loyalty Review Alerts (admin-gated rewards cancellation)
  getLoyaltyAlerts: async (status?: string) => {
    const params = status ? { status } : {};
    const response = await client.get('/violations/admin/loyalty-alerts', { params });
    return response.data;
  },

  decideLoyaltyAlert: async (
    id: string,
    data: { decision: 'CANCEL_REWARDS' | 'KEEP_REWARDS'; adminNotes?: string }
  ) => {
    const response = await client.patch(`/violations/admin/loyalty-alerts/${id}/decide`, data);
    return response.data;
  },

  // Admin: drop a violation directly (without an appeal)
  dropViolation: async (id: string, reason: string) => {
    const response = await client.patch(`/violations/admin/${id}/drop`, { reason });
    return response.data;
  }
};
