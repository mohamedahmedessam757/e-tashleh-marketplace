
import { create } from 'zustand';
import { supabase } from '../services/supabase';
import { shipmentsApi } from '../services/api/shipments.api';
import { useAdminStore } from './useAdminStore';

export interface ShipmentItem {
    name: string;
    quantity: number;
}

export interface Shipment {
    id: string; 
    orderId: string;
    orderNumber: string; // Added
    trackingNumber: string;
    trackingLink?: string;
    carrier: string;
    status: string; 
    estimatedDelivery: string;
    origin: string;
    destination: string;
    items: ShipmentItem[];
    // New metadata for detail view
    storeCode: string;
    customerCode: string;
    shippingAddress: string;
    customerCountry?: string;
    customerCity?: string;
    customerDetails?: string;
    vehicleMake?: string;
    vehicleModel?: string;
    partName?: string;
    partDescription?: string;
    partImages?: string[];
    offerImage?: string;
    weightKg?: number;
    updatedAt: string | Date;
}

interface ShipmentsState {
    shipments: Shipment[];
    loading: boolean;
    error: string | null;
    subscription: any;
    fetchShipments: () => Promise<void>;
    startRealtime: () => void;
    stopRealtime: () => void;
}

export const useShipmentsStore = create<ShipmentsState>((set, get) => ({
    shipments: [],
    loading: false,
    error: null,
    subscription: null,

    startRealtime: () => {
        const { subscription, fetchShipments } = get();
        if (subscription) return;
        
        // Real-time subscriptions don't hit RLS policies - safe to use Supabase directly
        const channel = supabase.channel('shipments-realtime-global')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'shipments' }, () => {
                fetchShipments();
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
                fetchShipments();
            })
            .subscribe();
            
        set({ subscription: channel });
    },

    stopRealtime: () => {
        const { subscription } = get();
        if (subscription) {
            supabase.removeChannel(subscription);
            set({ subscription: null });
        }
    },

    fetchShipments: async () => {
        // MAINTENANCE GUARD (2026 Silencer)
        if (useAdminStore.getState().publicSystemStatus?.maintenanceMode) return;

        set({ loading: true, error: null });
        try {
            // Use the NestJS API (Prisma) to bypass Supabase RLS recursion
            const data = await shipmentsApi.getMyShipments();

            const finalShipments: Shipment[] = (data || []).map((item: any) => ({
                id: item.id,
                orderId: item.orderId,
                orderNumber: item.orderNumber,
                trackingNumber: item.trackingNumber || item.orderNumber || item.orderId.substring(0, 8),
                trackingLink: item.trackingLink,
                carrier: item.carrier || 'Tashleh Carrier',
                status: item.status || 'RECEIVED_AT_HUB',
                estimatedDelivery: item.estimatedDelivery 
                    ? new Date(item.estimatedDelivery).toLocaleDateString() 
                    : new Date(new Date(item.updatedAt).getTime() + 3 * 24 * 60 * 60 * 1000).toLocaleDateString(),
                origin: item.origin || 'Central Hub',
                destination: item.destination || 'Your Address',
                items: item.items || [],
                storeCode: item.storeCode,
                customerCode: item.customerCode,
                shippingAddress: item.shippingAddress,
                customerCountry: item.customerCountry,
                customerCity: item.customerCity,
                customerDetails: item.customerDetails,
                vehicleMake: item.vehicleMake,
                vehicleModel: item.vehicleModel,
                partName: item.partName,
                partDescription: item.partDescription,
                partImages: item.partImages,
                offerImage: item.offerImage,
                weightKg: item.weightKg,
                updatedAt: item.updatedAt
            }));

            set({ shipments: finalShipments, loading: false });
        } catch (err: any) {
            console.error('[useShipmentsStore] Fetch error:', err);
            set({ error: err?.response?.data?.message || err.message || 'Unknown error', loading: false });
        }
    }
}));
