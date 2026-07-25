import React from 'react';
import { Check, AlertTriangle } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { StatusType } from './Badge';
import {
    buildFulfillmentStepHint,
    buildShipmentDeliveryStepHint,
    getOrderTimelineStepIndex,
    type ShipmentDeliverySummary,
} from '../../utils/offerFulfillmentHelpers';

export interface FulfillmentSummaryPartHint {
  offerId: string;
  orderPartId?: string | null;
  partName: string;
  fulfillmentStatus: string;
  canSelectForShipping?: boolean;
  deliveredAt?: string | null;
  completedAt?: string | null;
  returnWindowEndsAt?: string | null;
  isReturnEligible?: boolean;
  resolutionLocked?: boolean;
  hasOpenCase?: boolean;
  warrantyEndAt?: string | null;
}

export interface FulfillmentSummaryHint {
  total: number;
  stepCounts: {
    preparation: number;
    prepared: number;
    verification: number;
    verificationSuccess: number;
    handoverPending?: number;
    readyForShipping: number;
    shipped: number;
    inCart?: number;
  };
  parts?: FulfillmentSummaryPartHint[];
}

interface StatusTimelineProps {
  currentStatus: StatusType;
  fulfillmentSummary?: FulfillmentSummaryHint | null;
  shipmentDeliverySummary?: ShipmentDeliverySummary | null;
}

export const StatusTimeline: React.FC<StatusTimelineProps> = ({
  currentStatus,
  fulfillmentSummary,
  shipmentDeliverySummary,
}) => {
  const { language } = useLanguage();
  const isAr = language === 'ar';

  const steps = [
    { id: 'request', label: { ar: 'تقديم الطلب', en: 'Request' } },
    { id: 'offers', label: { ar: 'العروض', en: 'Offers' } },
    { id: 'payment', label: { ar: 'الدفع', en: 'Payment' } },
    { id: 'preparation', label: { ar: 'التجهيز', en: 'Preparation' } },
    { id: 'verification', label: { ar: 'فحص القطعة', en: 'Part Inspection' } },
    { id: 'shipping', label: { ar: 'الشحن', en: 'Shipping' } },
    { id: 'delivery', label: { ar: 'الاستلام', en: 'Delivery' } },
  ];

  const isDelayed = currentStatus === 'DELAYED_PREPARATION';
  const isPrepared = currentStatus === 'PREPARED';
  const activeIndex = getOrderTimelineStepIndex(currentStatus);
  const isCancelled = currentStatus === 'CANCELLED';
  const progressPct = isCancelled
    ? 0
    : Math.max(0, Math.min(100, (activeIndex / (steps.length - 1)) * 100));

  return (
    <div className="w-full py-8 px-4 isolate">
      <div className="flex justify-between items-start relative">
        {/* Connection lines — no transform animations (avoids rectangular layer ghosts) */}
        <div
          className="absolute top-5 inset-x-0 h-1 bg-white/10 rounded-full pointer-events-none"
          aria-hidden
        />
        {!isCancelled && (
          <div
            className={`absolute top-5 h-1 rounded-full pointer-events-none transition-[width] duration-500 ease-out ${
              isDelayed ? 'bg-red-500' : 'bg-gold-500'
            }`}
            style={
              isAr
                ? { right: 0, width: `${progressPct}%` }
                : { left: 0, width: `${progressPct}%` }
            }
            aria-hidden
          />
        )}

        {steps.map((step, idx) => {
          const isCompleted = idx <= activeIndex && !isCancelled;
          const isCurrent = idx === activeIndex && !isCancelled;
          const isCurrentDelayed = isCurrent && isDelayed;

          return (
            <div
              key={step.id}
              className="flex flex-col items-center gap-3 relative z-[1] min-w-0 flex-1"
            >
              <div
                className={[
                  'w-10 h-10 rounded-full border-2 flex items-center justify-center shrink-0',
                  'outline-none shadow-none ring-0',
                  isCurrentDelayed
                    ? 'bg-red-900 border-red-500 text-red-300'
                    : isCompleted
                      ? 'bg-gold-500 border-gold-400 text-white'
                      : 'bg-[#1A1814] border-white/20 text-white/30',
                  isCurrent && !isCurrentDelayed ? 'border-gold-300' : '',
                ].join(' ')}
              >
                {isCurrentDelayed ? (
                  <AlertTriangle size={16} className="text-red-400" />
                ) : isCompleted ? (
                  <Check size={16} />
                ) : (
                  <div className="w-2 h-2 rounded-full bg-current" />
                )}
              </div>

              <span
                className={`text-[10px] md:text-xs font-bold whitespace-nowrap text-center px-0.5 ${
                  isCurrentDelayed
                    ? 'text-red-400'
                    : isCompleted
                      ? 'text-white'
                      : 'text-white/30'
                }`}
              >
                {isAr ? step.label.ar : step.label.en}
                {fulfillmentSummary &&
                  fulfillmentSummary.total > 1 &&
                  idx <= activeIndex &&
                  (() => {
                    const hint = buildFulfillmentStepHint(
                      fulfillmentSummary,
                      idx,
                      isAr,
                    );
                    return hint ? (
                      <span className="block text-[9px] text-gold-400/80 font-normal text-center mt-0.5">
                        {hint}
                      </span>
                    ) : null;
                  })()}
                {shipmentDeliverySummary &&
                  shipmentDeliverySummary.total > 1 &&
                  (() => {
                    const deliveryHint = buildShipmentDeliveryStepHint(
                      shipmentDeliverySummary,
                      idx,
                      isAr,
                      activeIndex,
                    );
                    return deliveryHint ? (
                      <span className="block text-[9px] text-cyan-400/90 font-normal text-center mt-0.5">
                        {deliveryHint}
                      </span>
                    ) : null;
                  })()}
                {isCurrentDelayed && idx === activeIndex && (
                  <span className="block text-[9px] text-red-400/70 font-normal text-center">
                    {isAr ? '(متأخر)' : '(Delayed)'}
                  </span>
                )}
                {isPrepared && (idx === 3 || idx === activeIndex) && (
                  <span className="block text-[9px] text-green-400/70 font-normal text-center">
                    {isAr ? '(تم)' : '(Done)'}
                  </span>
                )}
              </span>
            </div>
          );
        })}
      </div>

      {isCancelled && (
        <div className="mt-4 text-center text-red-400 text-sm font-bold bg-red-500/10 py-2 rounded-lg border border-red-500/20">
          {isAr ? 'تم إلغاء هذا الطلب' : 'This order has been cancelled'}
        </div>
      )}

      {isDelayed && (
        <div className="mt-4 text-center text-red-400 text-sm font-bold bg-red-500/10 py-2 rounded-lg border border-red-500/20">
          {isAr
            ? 'تأخر التاجر في التجهيز — مرحلة السماح الأخيرة'
            : 'Merchant preparation delayed — Final grace period active'}
        </div>
      )}
    </div>
  );
};
