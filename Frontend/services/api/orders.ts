import { client } from './client';

export const ordersApi = {
    // Get all orders with pagination and search
    getAll: async (params: { page?: number; limit?: number; status?: string; search?: string } = {}) => {
        const response = await client.get('/orders', { params });
        const data = response.data;
        
        // Handle result structure (items, total, hasMore from backend)
        if (data && data.items) {
            return data;
        }

        // For vendor responses or legacy arrays
        if (data?.requestingStoreId) {
            localStorage.setItem('merchant_store_id', data.requestingStoreId);
            return { items: data.orders, total: data.orders.length, hasMore: false };
        }
        
        return { items: data || [], total: (data || []).length, hasMore: false };
    },

    // Get single order
    getById: async (id: string) => {
        const response = await client.get(`/orders/${id}`);
        return response.data;
    },

    // Get assembly cart items
    getAssemblyCart: async () => {
        const response = await client.get('/orders/assembly-cart');
        return response.data;
    },

    // Get merchant assembly cart (mirror)
    getMerchantAssemblyCart: async () => {
        const response = await client.get('/orders/merchant-assembly-cart');
        return response.data;
    },

    // Request shipping for specific orders or specific offers (partial shipping)
    requestShipping: async (orderIds?: string[], offerIds?: string[], customerId?: string) => {
        const response = await client.post('/orders/request-shipping', { orderIds, offerIds, customerId });
        return response.data;
    },

    // Admin: Get all active shipping carts
    getAdminShippingCarts: async () => {
        const response = await client.get('/orders/admin/shipping-carts');
        return response.data;
    },

    // Create a new order
    // Using simple Record type here, can be stricter with shared DTO if shared
    create: async (data: any) => {
        try {
            const response = await client.post('/orders', data);
            return response.data;
        } catch (error: any) {
            console.error('Order Creation API Error:', error.response?.data || error.message);
            throw error;
        }
    },

    // Transition order state
    transition: async (id: string, newStatus: string, reason?: string, metadata?: any) => {
        const response = await client.patch(`/orders/${id}/transition`, {
            newStatus,
            reason: reason || 'State transition via Frontend',
            metadata
        });
        return response.data;
    },

    // Mark order/offer as Prepared (offerId required for multi-part)
    markPrepared: async (id: string, offerId?: string) => {
        const response = await client.patch(`/orders/${id}/prepare`, offerId ? { offerId } : {});
        return response.data;
    },

    markOfferPrepared: async (orderId: string, offerId: string) => {
        const response = await client.patch(`/orders/${orderId}/offers/${offerId}/prepared`);
        return response.data;
    },

    submitOfferVerification: async (orderId: string, offerId: string, payload: any) => {
        const response = await client.post(`/orders/${orderId}/offers/${offerId}/verification`, payload);
        return response.data;
    },

    markOfferReadyForShipping: async (orderId: string, offerId: string) => {
        const response = await client.patch(`/orders/${orderId}/offers/${offerId}/ready-for-shipping`);
        return response.data;
    },

    getFulfillmentSummary: async (orderId: string) => {
        const response = await client.get(`/orders/${orderId}/fulfillment-summary`);
        return response.data;
    },

    rejectOffer: async (orderId: string, offerId: string, payload: { reason: string, customReason?: string }) => {
        const response = await client.post(`/orders/${orderId}/offer/${offerId}/reject`, payload);
        return response.data;
    },

    acceptOffer: async (orderId: string, offerId: string) => {
        const response = await client.post(`/orders/${orderId}/offer/${offerId}/accept`);
        return response.data;
    },

    acceptOfferForPart: async (orderId: string, partId: string, offerId: string) => {
        const response = await client.post(`/orders/${orderId}/part/${partId}/offer/${offerId}/accept`);
        return response.data;
    },

    // Get Order timeline
    getTimeline: async (id: string) => {
        // Assuming endpoint exists based on M1 docs
        const response = await client.get(`/orders/${id}/timeline`);
        // If not exists in Controller yet, this might fail, but adding for completeness
        return response.data;
    },

    // Verification Endpoints
    submitVerification: async (id: string, payload: any) => {
        const response = await client.post(`/orders/${id}/verification`, payload);
        return response.data;
    },

    adminReviewVerification: async (id: string, payload: any) => {
        const response = await client.patch(`/orders/${id}/verification/review`, payload);
        return response.data;
    },

    submitCorrectionVerification: async (id: string, payload: any) => {
        const response = await client.post(`/orders/${id}/verification/correction`, payload);
        return response.data;
    },

    confirmDelivery: async (id: string, customerNote?: string) => {
        const response = await client.post(`/orders/${id}/deliver`, { customerNote });
        return response.data;
    },

    getDeliveredOrders: async () => {
        const response = await client.get('/orders/delivered');
        return response.data;
    },
    
    delete: async (id: string) => {
        const response = await client.delete(`/orders/${id}`);
        return response.data;
    },

    renew: async (id: string) => {
        const response = await client.patch(`/orders/${id}/renew`);
        return response.data;
    },

    cancel: async (id: string, reason?: string) => {
        const response = await client.patch(`/orders/${id}/transition`, {
            newStatus: 'CANCELLED',
            reason: reason || 'Cancelled by customer'
        });
        return response.data;
    }
};
