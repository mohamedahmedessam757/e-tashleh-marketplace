import { OrderStatus } from '@prisma/client';

/**
 * Order statuses whose paid, not-yet-shipped offers live in the multi-part assembly cart.
 *
 * A multi-part order's status follows its slowest part (see aggregateOrderStatusFromOffers),
 * so one delayed / non-matching / partially-paid part must NOT hide the other parts that are
 * already paid or ready. Eligibility per item is decided by the offer (payment + fulfillmentStatus).
 */
export const ASSEMBLY_CART_ORDER_STATUSES: OrderStatus[] = [
    OrderStatus.PARTIALLY_PAID,
    OrderStatus.PREPARATION,
    OrderStatus.DELAYED_PREPARATION,
    OrderStatus.PREPARED,
    OrderStatus.VERIFICATION,
    OrderStatus.VERIFICATION_SUCCESS,
    OrderStatus.NON_MATCHING,
    OrderStatus.CORRECTION_PERIOD,
    OrderStatus.CORRECTION_SUBMITTED,
    OrderStatus.READY_FOR_SHIPPING,
    OrderStatus.PARTIALLY_SHIPPED,
];
