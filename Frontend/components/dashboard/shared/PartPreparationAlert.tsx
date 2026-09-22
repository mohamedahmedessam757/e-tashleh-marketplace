import React from 'react';
import { AlertTriangle, Clock, Package } from 'lucide-react';
import { OrderStatusCountdown } from '../ui/OrderStatusCountdown';
import { normalizeOfferFulfillmentStatus } from '../../utils/offerFulfillmentHelpers';

type OrderLike = {
  status?: string | null;
  offers?: Array<{ fulfillmentStatus?: string | null; status?: string | null }> | null;
  preparationDeadlineAt?: string | Date | null;
  delayedPreparationDeadlineAt?: string | Date | null;
  activeSla?: unknown;
  id?: string;
};

/** Part is still being prepared while the order is in prep / delayed-prep SLA. */
export function isPartInActivePreparation(
  fulfillmentStatus?: string | null,
  orderStatus?: string | null,
): boolean {
  const fs = normalizeOfferFulfillmentStatus(fulfillmentStatus);
  const os = String(orderStatus || '').toUpperCase();
  return (
    fs === 'IN_PREPARATION' &&
    (os === 'PREPARATION' || os === 'DELAYED_PREPARATION')
  );
}

/** True when any accepted offer still needs the shared prep countdown on its card. */
export function orderHasPartPreparationTimer(order?: OrderLike | null): boolean {
  if (!order) return false;
  const os = String(order.status || '').toUpperCase();
  if (os !== 'PREPARATION' && os !== 'DELAYED_PREPARATION') return false;
  return (order.offers || []).some((o) => {
    const st = String(o.status || '').toLowerCase();
    if (st && st !== 'accepted') return false;
    return isPartInActivePreparation(o.fulfillmentStatus, order.status);
  });
}

function partPrepCopy(orderStatus: string | null | undefined, isAr: boolean) {
  const delayed = String(orderStatus || '').toUpperCase() === 'DELAYED_PREPARATION';
  if (delayed) {
    return {
      title: isAr ? 'تأخير التجهيز على هذه القطعة' : 'Delayed preparation on this part',
      desc: isAr
        ? 'انتهت مهلة التجهيز الأساسية. تبقّت مهلة إضافية قبل إلغاء هذه القطعة.'
        : 'Base preparation SLA ended. Extra grace remains before this part may be cancelled.',
      badgeClass: 'bg-orange-500/15 border-orange-500/35 text-orange-200',
      icon: AlertTriangle,
    };
  }
  return {
    title: isAr ? 'قيد التجهيز' : 'In preparation',
    desc: isAr
      ? 'هذه القطعة ما زالت بانتظار تجهيز المتجر ضمن المهلة المحددة.'
      : 'This part is still awaiting merchant preparation within the SLA.',
    badgeClass: 'bg-blue-500/15 border-blue-500/30 text-blue-200',
    icon: Package,
  };
}

interface PartPreparationAlertProps {
  order: OrderLike;
  fulfillmentStatus?: string | null;
  isAr: boolean;
  className?: string;
  /** When false, only status alert — timer rendered elsewhere (should stay true: one timer here). */
  showTimer?: boolean;
}

/**
 * Single shared prep/delayed-prep alert + countdown for a part card.
 * Used by customer, merchant, and admin so the clock is not duplicated at order header.
 */
export const PartPreparationAlert: React.FC<PartPreparationAlertProps> = ({
  order,
  fulfillmentStatus,
  isAr,
  className = '',
  showTimer = true,
}) => {
  if (!isPartInActivePreparation(fulfillmentStatus, order?.status)) {
    return null;
  }

  const copy = partPrepCopy(order?.status, isAr);
  const Icon = copy.icon;

  return (
    <div
      className={`rounded-xl border px-3 py-2.5 space-y-2 ${copy.badgeClass} ${className}`}
      role="status"
    >
      <div className="flex items-start gap-2">
        <Icon size={16} className="shrink-0 mt-0.5" />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-black uppercase tracking-wide flex items-center gap-1.5">
            <Clock size={12} className="opacity-80" />
            {copy.title}
          </p>
          <p className="text-[11px] font-bold opacity-80 mt-0.5 leading-snug">{copy.desc}</p>
        </div>
      </div>
      {showTimer && (
        <OrderStatusCountdown
          order={order as any}
          variant="compact"
          className="w-full border-0 bg-black/20 shadow-none"
        />
      )}
    </div>
  );
};
