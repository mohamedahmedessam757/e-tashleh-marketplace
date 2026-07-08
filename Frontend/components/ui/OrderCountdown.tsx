
import React from 'react';
import { OrderStatusCountdown } from './OrderStatusCountdown';

interface OrderCountdownProps {
    updatedAt: string | Date;
    status: string;
    variant?: 'badge' | 'full';
    order?: Record<string, unknown>;
    deliveredAt?: string | Date;
    compact?: boolean;
}

/** @deprecated Prefer OrderStatusCountdown — kept for backward compatibility */
export const OrderCountdown: React.FC<OrderCountdownProps> = ({
    status,
    variant = 'badge',
    order,
    updatedAt,
    deliveredAt,
    compact,
}) => {
    const mergedOrder = {
        ...(order ?? {}),
        status,
        updatedAt,
        deliveredAt: deliveredAt ?? updatedAt,
    };

    const uiVariant =
        variant === 'full' ? 'card' : compact ? 'compact' : 'compact';

    return (
        <OrderStatusCountdown
            order={mergedOrder as any}
            variant={uiVariant}
        />
    );
};
