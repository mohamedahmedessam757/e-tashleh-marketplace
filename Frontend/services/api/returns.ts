import { client } from './client';

export interface MerchantResolutionResponse {
    returns: any[];
    disputes: any[];
}

export const returnsApi = {
    // Customer
    requestReturn: (data: FormData) => client.post('/returns/request', data),
    
    escalateDispute: (data: FormData) => client.post('/returns/dispute', data),

    getUserReturns: () => client.get('/returns/my-requests'),
    
    escalateCase: (id: string) => client.patch(`/returns/${id}/escalate`),

    // Case Messaging (Phase 4)
    getCaseMessages: (id: string) => client.get(`/returns/${id}/messages`),
    
    sendCaseMessage: (id: string, caseType: 'return' | 'dispute', text: string, attachments?: string[]) => 
        client.post(`/returns/${id}/messages`, { caseType, text, attachments }),


    // Merchant
    getMerchantCases: () => client.get<MerchantResolutionResponse>('/returns/merchant/cases'),

    respondToReturn: (id: string, action: 'APPROVE' | 'REJECT', responseText: string, evidence?: string[] | File[]) => {
        if (evidence && evidence.length > 0 && typeof evidence[0] === 'string') {
            // JSON approach (Supplied URLs)
            return client.post(`/returns/${id}/respond-return`, { action, responseText, evidenceUrls: evidence });
        }
        
        // Legacy FormData approach
        const formData = new FormData();
        formData.append('action', action);
        formData.append('responseText', responseText);
        if (evidence) {
            (evidence as File[]).forEach(file => formData.append('files', file));
        }
        return client.post(`/returns/${id}/respond-return`, formData);
    },

    respondToDispute: (
        id: string,
        action: 'APPROVE' | 'REJECT',
        responseText: string,
        evidence?: string[] | File[],
    ) => {
        if (evidence && evidence.length > 0 && typeof evidence[0] === 'string') {
            return client.post(`/returns/${id}/respond-dispute`, {
                action,
                responseText,
                evidenceUrls: evidence,
            });
        }

        const formData = new FormData();
        formData.append('action', action);
        formData.append('responseText', responseText);
        if (evidence) {
            (evidence as File[]).forEach((file) => formData.append('files', file));
        }
        return client.post(`/returns/${id}/respond-dispute`, formData);
    },

    // Admin
    getAdminCases: () => client.get<MerchantResolutionResponse>('/returns/admin/cases'),

    issueVerdict: (id: string, type: 'return' | 'dispute', verdict: 'REFUND' | 'RELEASE_FUNDS' | 'DENY', notes: string, extra?: any) => 
        client.post(`/returns/${id}/verdict`, { type, verdict, notes, extra }),

    updateAdminVerdict: (id: string, type: 'return' | 'dispute', verdict: 'REFUND' | 'RELEASE_FUNDS' | 'DENY', notes: string, extra?: any) => 
        client.patch(`/returns/${id}/verdict`, { type, verdict, notes, extra }),

    getMerchantRiskStats: (storeId: string) => client.get(`/returns/admin/merchant-risk/${storeId}`),
    
    getCustomerRiskStats: (customerId: string) => client.get(`/returns/admin/customer-risk/${customerId}`)
};
