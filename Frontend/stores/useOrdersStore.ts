
import { create } from 'zustand';
import { Order } from '../types';
import { ordersApi } from '../services/api/orders';

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
            // Route through the NestJS backend, which authenticates the caller (JWT) and
            // returns ONLY the orders that user is allowed to see. Never query the DB
            // directly with the anonymous Supabase client (bypasses server-side authz/RLS).
            const result = await ordersApi.getAll({ limit: 100 });
            const items = Array.isArray(result) ? result : (result?.items ?? []);
            set({ orders: items as Order[] });
        } catch (err: any) {
            console.error('Error fetching orders:', err);
            set({ error: err?.response?.data?.message || err?.message || 'Failed to load orders' });
        } finally {
            set({ loading: false });
        }
    },

    cancelOrder: async (orderId: string, reason?: string) => {
        try {
            // Goes through the FSM-guarded, authorized backend transition endpoint.
            await ordersApi.cancel(orderId, reason);
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
            await ordersApi.delete(orderId);
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
            await ordersApi.renew(orderId);
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
