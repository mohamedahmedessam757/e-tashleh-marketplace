import { useOrderStore, Order } from '../stores/useOrderStore';

/** Subscribes to the orders array so components re-render when this order updates. */
export function useOrderById(orderId: string | undefined): Order | undefined {
    return useOrderStore((state) =>
        orderId
            ? state.orders.find((o) => String(o.id) === String(orderId))
            : undefined,
    );
}
