import { create } from 'zustand';
import { shipmentsApi, Shipment } from '../services/api/shipments.api';
import { supabase } from '../services/supabase';

interface ShipmentState {
    shipments: Shipment[];
    isLoading: boolean;
    error: string | null;
    subscription: any;

    fetchShipments: () => Promise<void>;
    silentFetchShipments: () => Promise<void>;
    startRealtime: () => void;
    stopRealtime: () => void;
    updateShipmentInList: (shipment: Shipment) => void;
}

export const useShipmentStore = create<ShipmentState>((set, get) => ({
    shipments: [],
    isLoading: false,
    error: null,
    subscription: null,

    fetchShipments: async () => {
        // Only show loading if we don't have data yet to prevent flashes
        const { shipments } = get();
        if (shipments.length === 0) set({ isLoading: true });
        
        try {
            const data = await shipmentsApi.getAll();
            set({ shipments: data, error: null });
        } catch (err: unknown) {
            const status = (err as { response?: { status?: number } })?.response?.status;
            if (status !== 403) {
                set({ error: 'Failed to fetch shipments' });
            }
            if (import.meta.env.DEV && status !== 403) {
                console.warn('[shipments] fetch failed', err);
            }
        } finally {
            set({ isLoading: false });
        }
    },

    silentFetchShipments: async () => {
        try {
            const data = await shipmentsApi.getAll();
            set({ shipments: data, error: null });
        } catch (err) {
            console.error('Silent shipment fetch failed', err);
        }
    },

    updateShipmentInList: (updatedShipment: Shipment) => {
        set((state) => ({
            shipments: state.shipments.map((s) => 
                s.id === updatedShipment.id ? { ...s, ...updatedShipment } : s
            )
        }));
    },

    startRealtime: () => {
        const { subscription } = get();
        if (subscription) return;

        // Initial fetch
        get().fetchShipments();

        const channel = supabase.channel('global-shipments-realtime')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'shipments' },
                (payload) => {
                    console.log('⚡ Realtime Shipment Update:', payload);
                    get().silentFetchShipments();
                }
            )
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'shipment_status_logs' },
                () => {
                    get().silentFetchShipments();
                }
            )
            .subscribe();

        set({ subscription: channel });
    },

    stopRealtime: () => {
        const { subscription } = get();
        if (subscription) {
            supabase.removeChannel(subscription);
            set({ subscription: null });
        }
    }
}));
