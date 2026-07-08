import { useMemo } from 'react';
import type { OrderActiveSla } from '../types/orderSla';
import { resolveOrderActiveSla } from '../utils/resolveOrderActiveSla';

type OrderLike = {
  status?: string | null;
  activeSla?: OrderActiveSla | null;
  createdAt?: string | Date | null;
  updatedAt?: string | Date | null;
  revealOffersAt?: string | Date | null;
  selectionDeadlineAt?: string | Date | null;
  paymentDeadlineAt?: string | Date | null;
  delayedPreparationDeadlineAt?: string | Date | null;
  correctionDeadlineAt?: string | Date | null;
  shippedAt?: string | Date | null;
  deliveredAt?: string | Date | null;
  offerAcceptedAt?: string | Date | null;
  payments?: Array<{ createdAt?: string | Date | null; status?: string | null }> | null;
};

export function useOrderActiveSla(order: OrderLike | null | undefined): OrderActiveSla | null {
  return useMemo(() => resolveOrderActiveSla(order), [
    order?.activeSla?.endsAt,
    order?.activeSla?.urgency,
    order?.status,
    order?.createdAt,
    order?.updatedAt,
    order?.revealOffersAt,
    order?.selectionDeadlineAt,
    order?.paymentDeadlineAt,
    order?.delayedPreparationDeadlineAt,
    order?.correctionDeadlineAt,
    order?.shippedAt,
    order?.deliveredAt,
    order?.offerAcceptedAt,
    order?.payments,
  ]);
}
