
import { create } from 'zustand';
import { supabase } from '../services/supabase';
import { Order, OrderStatus } from '../types';
import { getCurrentUserId } from '../utils/auth';

interface OrdersState {
    orders: Order[];
    loading: boolean;
    error: string | null;

    fetchOrders: () => Promise<void>;
    cancelOrder: (orderId: string, reason?: string) => Promise<boolean>;
    deleteOrder: (orderId: string) => Promise<boolean>;
    renewOrder: (orderId: string) => Promise<boolean>;

    // Helpers
    getOrderById: (id: string) => Order | undefined;
    getCancelReason: (orderId: string) => string;
    canCancelOrder: (orderId: string) => boolean;
}

export const useOrdersStore = create<OrdersState>((set, get) => ({
    orders: [],
    loading: false,
    error: null,

    fetchOrders: async () => {
        set({ loading: true, error: null });
        try {
            const userId = getCurrentUserId();

            if (!userId) {

                set({ orders: [], loading: false });
                return;
            }

            const { data, error } = await supabase
                .from('orders')
                .select(`
                    *,
                    parts:order_parts(*),
                    offers!offers_order_id_fkey(*),
                    store:stores(*)
                `)
                .eq('customer_id', userId)
                .order('created_at', { ascending: false });

            if (error) throw error;



            // Transform data if needed to match interface strictly
            const mappedOrders = (data || []).map(order => ({
                ...order,
                // Map snake_case to camelCase
                orderNumber: order.order_number,
                vehicleMake: order.vehicle_make,
                vehicleModel: order.vehicle_model,
                vehicleYear: order.vehicle_year,
                partName: order.part_name,
                createdAt: order.created_at,
                updatedAt: order.updated_at,
                // ── Critical deadline fields ──
                offersDeadlineAt: order.offers_deadline_at,
                paymentDeadlineAt: order.payment_deadline_at,
                offerAcceptedAt: order.offer_accepted_at,
                shippedAt: order.shipped_at,
                deliveredAt: order.delivered_at,
                delayedPreparationDeadlineAt: order.delayed_preparation_deadline_at,
                // ── Warranty Logic ──
                warranty_active_at: order.warranty_active_at,
                warranty_end_at: order.warranty_end_at,
                // ─────────────────────
                offersCount: (order.offers || []).filter((off: any) => off.status !== 'rejected').length,
                // Ensure features are arrays and map offers status
                offers: (order.offers || []).map((off: any) => ({
                    ...off,
                    status: off.status || 'pending'
                })),
                store: order.store || undefined,
                parts: order.parts || []
            }));

            set({ orders: mappedOrders as Order[] });
        } catch (err: any) {
            console.error('Error fetching orders:', err);
            set({ error: err.message });
        } finally {
            set({ loading: false });
        }
    },

    cancelOrder: async (orderId: string) => {
        try {
            const { error } = await supabase
                .from('orders')
                .update({ status: 'CANCELLED' })
                .eq('id', orderId);

            if (error) throw error;

            // Optimistic update
            set(state => ({
                orders: state.orders.map(o =>
                    o.id === orderId ? { ...o, status: 'CANCELLED' } : o
                )
            }));
            return true;
        } catch (err) {
            console.error('Failed to cancel order:', err);
            return false;
        }
    },

    deleteOrder: async (orderId: string) => {
        try {
            const { error } = await supabase
                .from('orders')
                .delete()
                .eq('id', orderId);

            if (error) throw error;

            set(state => ({
                orders: state.orders.filter(o => o.id !== orderId)
            }));
            return true;
        } catch (err) {
            console.error('Failed to delete order:', err);
            return false;
        }
    },

    renewOrder: async (orderId: string) => {
        try {
            const newDeadline = new Date();
            newDeadline.setHours(newDeadline.getHours() + 24);

            const { error } = await supabase
                .from('orders')
                .update({
                    status: 'AWAITING_OFFERS',
                    offers_deadline_at: newDeadline.toISOString()
                })
                .eq('id', orderId);

            if (error) throw error;

            // Refresh orders to get latest state
            await get().fetchOrders();
            return true;
        } catch (err) {
            console.error('Failed to renew order:', err);
            return false;
        }
    },

    getOrderById: (id: string) => {
        return get().orders.find(o => o.id === id);
    },

    canCancelOrder: (orderId: string) => {
        const order = get().getOrderById(orderId);
        if (!order) return false;
        const immutableStatuses = ['SHIPPED', 'DELIVERED', 'COMPLETED', 'CANCELLED'];
        return !immutableStatuses.includes(order.status);
    },

    getCancelReason: (orderId: string) => {
        const order = get().getOrderById(orderId);
        if (!order) return '';
        if (['SHIPPED', 'DELIVERED'].includes(order.status)) return 'Order has already been shipped';
        if (order.status === 'COMPLETED') return 'Order is already completed';
        if (order.status === 'CANCELLED') return 'Order is already cancelled';
        return '';
    }
}));
