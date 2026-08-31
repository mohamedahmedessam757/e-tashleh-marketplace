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
    { id: 'request', label: { ar: 'تقديم الطلب', en: 'Request' }, short: { ar: 'طلب', en: 'Req' } },
    { id: 'offers', label: { ar: 'العروض', en: 'Offers' }, short: { ar: 'عروض', en: 'Offers' } },
    { id: 'payment', label: { ar: 'الدفع', en: 'Payment' }, short: { ar: 'دفع', en: 'Pay' } },
    { id: 'preparation', label: { ar: 'التجهيز', en: 'Preparation' }, short: { ar: 'تجهيز', en: 'Prep' } },
    { id: 'verification', label: { ar: 'فحص القطعة', en: 'Part Inspection' }, short: { ar: 'فحص', en: 'Check' } },
    { id: 'shipping', label: { ar: 'الشحن', en: 'Shipping' }, short: { ar: 'شحن', en: 'Ship' } },
    { id: 'delivery', label: { ar: 'الاستلام', en: 'Delivery' }, short: { ar: 'استلام', en: 'Recv' } },
  ];

  const n = steps.length;
  const isDelayed = currentStatus === 'DELAYED_PREPARATION';
  const isPrepared = currentStatus === 'PREPARED';
  const statusUpper = String(currentStatus || '').toUpperCase();
  const isRematching = [
    'NON_MATCHING',
    'CORRECTION_PERIOD',
    'CORRECTION_SUBMITTED',
  ].includes(statusUpper);
  const activeIndex = getOrderTimelineStepIndex(currentStatus);
  const isCancelled = currentStatus === 'CANCELLED';
  const statusKey = String(currentStatus || '').toUpperCase();
  const isTerminalDeliveryDone = [
    'DELIVERED',
    'DELIVERED_TO_CUSTOMER',
    'COMPLETED',
    'WARRANTY_ACTIVE',
    'WARRANTY_EXPIRED',
    'RETURNED',
    'REFUNDED',
    'RESOLVED',
    // Delivery already happened — keep الاستلام checked during return/dispute
    'RETURN_REQUESTED',
    'RETURN_APPROVED',
    'DISPUTED',
    'RETURN_LABEL_ISSUED',
    'RETURN_STARTED',
    'RECEIVED_FROM_CUSTOMER',
    'DELIVERED_TO_VENDOR',
    'EXCHANGE_COMPLETED',
    'IN_TRANSIT_TO_CUSTOMER',
    'RETURN_COMPLETED_TO_CUSTOMER',
  ].includes(statusKey);
  // In-transit: shipping step is done; delivery is current (activeIndex === 6) but not terminal
  const isEnRouteToCustomer =
    activeIndex >= 6 &&
    !isTerminalDeliveryDone &&
    [
      'SHIPPED',
      'PICKED_UP_BY_CARRIER',
      'IN_TRANSIT_TO_DESTINATION',
      'ARRIVED_AT_LOCAL_FACILITY',
      'CUSTOMS_CLEARANCE',
      'CUSTOMS_DELAY',
      'AT_LOCAL_WAREHOUSE',
      'OUT_FOR_DELIVERY',
      'DELIVERY_ATTEMPTED',
      'PARTIALLY_DELIVERED',
    ].includes(statusKey);

  // Line runs center→center of first/last circles (not container edges)
  const sideInset = `calc(100% / ${n} / 2)`;
  const trackSpan = `calc(100% - 100% / ${n})`;
  // En-route fills through shipping (step 5) — not 100% — so delivery stays visually pending
  const filledWidth =
    isCancelled || activeIndex <= 0
      ? '0px'
      : isTerminalDeliveryDone
        ? trackSpan
        : isEnRouteToCustomer
          ? `calc(5 / ${n - 1} * (100% - 100% / ${n}))`
          : `calc(${activeIndex} / ${n - 1} * (100% - 100% / ${n}))`;

  return (
    <div className="w-full py-4 sm:py-8 px-0 sm:px-2 md:px-4 isolate overflow-x-auto" dir={isAr ? 'rtl' : 'ltr'}>
      <div className="min-w-[300px] sm:min-w-0">
      {/* Circles + connector line (line aligned to circle centers) */}
      <div className="relative h-8 sm:h-10 w-full">
        <div
          className="absolute top-1/2 h-0.5 sm:h-1 -translate-y-1/2 bg-white/10 rounded-full pointer-events-none"
          style={{ left: sideInset, width: trackSpan }}
          aria-hidden
        />
        {!isCancelled && (
          <div
            className={`absolute top-1/2 h-0.5 sm:h-1 -translate-y-1/2 rounded-full pointer-events-none transition-[width] duration-500 ease-out ${
              isDelayed ? 'bg-red-500' : 'bg-gold-500'
            }`}
            style={
              isAr
                ? { right: sideInset, width: filledWidth }
                : { left: sideInset, width: filledWidth }
            }
            aria-hidden
          />
        )}

        <div className="relative z-[1] flex h-8 sm:h-10 w-full">
          {steps.map((step, idx) => {
            const isCompleted =
              !isCancelled &&
              (idx < activeIndex ||
                (isTerminalDeliveryDone && idx === activeIndex));
            // Gold current border only while delivery is still in progress (e.g. DELIVERED)
            const isCurrent =
              idx === activeIndex && !isCancelled && !isTerminalDeliveryDone;
            const isCurrentDelayed = isCurrent && isDelayed;

            return (
              <div
                key={step.id}
                className="flex flex-1 items-center justify-center min-w-0"
              >
                <div
                  className={[
                    'w-7 h-7 sm:w-10 sm:h-10 rounded-full border-2 flex items-center justify-center shrink-0',
                    'outline-none shadow-none ring-0 bg-clip-padding',
                    isCurrentDelayed
                      ? 'bg-red-900 border-red-500 text-red-300'
                      : isCompleted
                        ? 'bg-gold-500 border-gold-400 text-white'
                        : 'bg-[#1A1814] border-white/20 text-white/30',
                    isCurrent && !isCurrentDelayed ? 'border-gold-300' : '',
                  ].join(' ')}
                >
                  {isCurrentDelayed ? (
                    <AlertTriangle size={14} className="text-red-400 sm:w-4 sm:h-4" />
                  ) : isCompleted ? (
                    <Check size={14} className="sm:w-4 sm:h-4" />
                  ) : (
                    <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-current" />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Labels under matching columns */}
      <div className="mt-2 sm:mt-3 flex w-full">
        {steps.map((step, idx) => {
          const isCompleted = idx <= activeIndex && !isCancelled;
          const isCurrent = idx === activeIndex && !isCancelled;
          const isCurrentDelayed = isCurrent && isDelayed;

          return (
            <div
              key={`${step.id}-label`}
              className="flex flex-1 flex-col items-center min-w-0 px-0.5"
            >
              <span
                className={`text-[8px] sm:text-[10px] md:text-xs font-bold text-center leading-tight break-words hyphens-auto ${
                  isCurrentDelayed
                    ? 'text-red-400'
                    : isCompleted
                      ? 'text-white'
                      : 'text-white/30'
                }`}
              >
                <span className="sm:hidden">{isAr ? step.short.ar : step.short.en}</span>
                <span className="hidden sm:inline">{isAr ? step.label.ar : step.label.en}</span>
              </span>
              {fulfillmentSummary &&
                fulfillmentSummary.total > 1 &&
                idx <= activeIndex &&
                (() => {
                  const hint = buildFulfillmentStepHint(
                    fulfillmentSummary,
                    idx,
                    isAr,
                    currentStatus,
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
                <span className="block text-[9px] text-red-400/70 font-normal text-center mt-0.5">
                  {isAr ? '(متأخر)' : '(Delayed)'}
                </span>
              )}
              {isRematching && idx === 4 && (
                <span className="block text-[9px] text-orange-400 font-bold text-center mt-0.5">
                  {isAr ? 'إعادة المطابقة' : 'Re-matching'}
                </span>
              )}
              {isPrepared && !isRematching && (idx === 3 || idx === activeIndex) && (
                <span className="block text-[9px] text-green-400/70 font-normal text-center mt-0.5">
                  {isAr ? '(تم)' : '(Done)'}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {isCancelled && (
        <div className="mt-4 text-center text-red-400 text-sm font-bold bg-red-500/10 py-2 rounded-lg border border-red-500/20">
          {isAr ? 'تم إلغاء هذا الطلب' : 'This order has been cancelled'}
        </div>
      )}

      {isRematching && (
        <div className="mt-4 text-center text-orange-300 text-sm font-bold bg-orange-500/10 py-2 rounded-lg border border-orange-500/25">
          {statusUpper === 'CORRECTION_SUBMITTED'
            ? (isAr ? 'تم إرسال التصحيح — بانتظار مراجعة الإدارة' : 'Correction submitted — awaiting admin review')
            : (isAr ? 'مطلوب إعادة المطابقة — التاجر في فترة التصحيح' : 'Re-matching required — merchant is in the correction window')}
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
    </div>
  );
};
