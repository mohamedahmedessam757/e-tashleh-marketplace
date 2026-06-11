import { client as api } from './client';
import { supabase } from '../supabase';
export type CarrierType = 'EXTERNAL' | 'INTERNAL' | 'NO_TRACKING';

export interface ShipmentItemRow {
    name: string;
    quantity: number;
}

export interface Shipment {
    id: string;
    orderId: string;
    waybillId?: string;
    carrierType: CarrierType;
    carrierName?: string;
    trackingNumber?: string;
    trackingLink?: string;
    carrierApiUrl?: string;
    status: string; // ShipmentStatus
    statusNotes?: string;
    customsDelayNote?: string;
    estimatedDelivery?: string;
    actualDelivery?: string;
    createdAt: string;
    updatedAt: string;
    order?: any;
    statusLogs?: ShipmentStatusLog[];
    /** Admin enrichment — cart batch parts */
    items?: ShipmentItemRow[];
    batchPartNames?: string[];
    cartBatchSize?: number;
    cartBatchType?: 'group' | 'solo' | null;
    partDescription?: string | null;
    waybillNumber?: string | null;
    waybillValue?: number | null;
    issueMode?: string | null;
    vehicleMake?: string | null;
    vehicleModel?: string | null;
}

export interface ShipmentStatusLog {
    id: string;
    shipmentId: string;
    fromStatus?: string;
    toStatus: string;
    notes?: string;
    source: string;
    createdAt: string;
    changer?: { id: string; name: string; role: string };
}

export const shipmentsApi = {
    getAll: async (): Promise<Shipment[]> => {
        const response = await api.get('/shipments');
        return response.data;
    },

    getMyShipments: async (): Promise<any[]> => {
        const response = await api.get('/shipments/my');
        return response.data;
    },

    getByOrderId: async (orderId: string): Promise<Shipment> => {
        const response = await api.get(`/shipments/order/${orderId}`);
        return response.data;
    },

    getLogs: async (id: string): Promise<ShipmentStatusLog[]> => {
        const response = await api.get(`/shipments/${id}/logs`);
        return response.data;
    },

    createStoreShipment: async (orderId: string): Promise<any> => {
        // Now handled via the merchant-request-shipping endpoint in orders
        const response = await api.patch(`/orders/${orderId}/merchant-request-shipping`);
        return response.data;
    },

    updateStatus: async (
        id: string, 
        data: { 
            status: string; 
            notes?: string; 
            customsDelayNote?: string; 
            carrierName?: string; 
            trackingNumber?: string;
            trackingLink?: string;
        }
    ): Promise<Shipment> => {
        const response = await api.patch(`/shipments/${id}/status`, data);
        return response.data;
    },

    // 2026 Pulse Sync: Real-time subscription helper
    subscribeToChanges: (callback: () => void) => {
        const channel = supabase.channel('admin-shipments-realtime')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'shipments' }, () => {
                callback();
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'shipment_status_logs' }, () => {
                callback();
            })
            .subscribe();
        return channel;
    }
};
