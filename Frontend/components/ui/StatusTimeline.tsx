
import React from 'react';
import { motion } from 'framer-motion';
import { Check, Clock, Package, Truck, CheckCircle, AlertTriangle, ShieldCheck, FileText } from 'lucide-react';
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
  
  // Define steps and their icons
  const steps = [
    { id: 'request', label: { ar: 'تقديم الطلب', en: 'Request' }, icon: FileText },
    { id: 'offers', label: { ar: 'العروض', en: 'Offers' }, icon: Clock },
    { id: 'payment', label: { ar: 'الدفع', en: 'Payment' }, icon: Package },
    { id: 'preparation', label: { ar: 'التجهيز', en: 'Preparation' }, icon: Package },
    { id: 'verification', label: { ar: 'التوثيق', en: 'Verification' }, icon: ShieldCheck },
    { id: 'shipping', label: { ar: 'الشحن', en: 'Shipping' }, icon: Truck },
    { id: 'delivery', label: { ar: 'الاستلام', en: 'Delivery' }, icon: CheckCircle },
  ];

  const isDelayed = currentStatus === 'DELAYED_PREPARATION';
  const isPrepared = currentStatus === 'PREPARED';
  const activeIndex = getOrderTimelineStepIndex(currentStatus);
  const isCancelled = currentStatus === 'CANCELLED';

  return (
    <div className="w-full py-8 px-4">
      <div className="flex justify-between items-center relative">
        
        {/* Connection Line Background */}
        <div className="absolute top-5 left-0 w-full h-1 bg-white/10 -z-10 rounded-full" />
        
        {/* Active Progress Line */}
        {!isCancelled && (
            <motion.div 
                className={`absolute top-5 left-0 h-1 -z-0 rounded-full ${isDelayed ? 'bg-red-500' : 'bg-gold-500'}`}
                initial={{ width: 0 }}
                animate={{ width: `${(activeIndex / (steps.length - 1)) * 100}%` }}
                transition={{ duration: 0.8, ease: "easeInOut" }}
                style={language === 'ar' ? { right: 0, left: 'auto', transformOrigin: 'right' } : { left: 0, right: 'auto', transformOrigin: 'left' }}
            />
        )}

        {/* Steps */}
        {steps.map((step, idx) => {
          const isCompleted = idx <= activeIndex && !isCancelled;
          const isCurrent = idx === activeIndex && !isCancelled;
          const isCurrentDelayed = isCurrent && isDelayed;

          return (
            <div key={step.id} className="flex flex-col items-center gap-3 relative group">
              <motion.div 
                initial={false}
                animate={{ 
                  backgroundColor: isCurrentDelayed ? '#7f1d1d' : isCompleted ? '#A88B3E' : '#1A1814',
                  borderColor: isCurrentDelayed ? '#ef4444' : isCompleted ? '#C4A95C' : '#ffffff20',
                  scale: isCurrent ? 1.2 : 1,
                  boxShadow: isCurrentDelayed 
                    ? '0 0 15px rgba(239,68,68,0.7)' 
                    : isCurrent 
                      ? '0 0 15px rgba(168,139,62,0.6)' 
                      : 'none'
                }}
                className={`w-10 h-10 rounded-full border-2 flex items-center justify-center transition-colors duration-300 z-10 ${isCompleted ? 'text-white' : 'text-white/30'}`}
              >
                {isCurrentDelayed 
                  ? <AlertTriangle size={16} className="text-red-400" /> 
                  : isCompleted 
                    ? <Check size={16} /> 
                    : <div className="w-2 h-2 rounded-full bg-current" />
                }
              </motion.div>
              
              <span className={`text-[10px] md:text-xs font-bold whitespace-nowrap transition-colors duration-300 ${
                isCurrentDelayed ? 'text-red-400' : isCompleted ? 'text-white' : 'text-white/30'
              }`}>
                {language === 'ar' ? step.label.ar : step.label.en}
                {fulfillmentSummary && fulfillmentSummary.total > 1 && idx <= activeIndex && (() => {
                  const hint = buildFulfillmentStepHint(fulfillmentSummary, idx, language === 'ar');
                  return hint ? (
                    <span className="block text-[9px] text-gold-400/80 font-normal text-center mt-0.5">
                      {hint}
                    </span>
                  ) : null;
                })()}
                {shipmentDeliverySummary && shipmentDeliverySummary.total > 1 && (() => {
                  const deliveryHint = buildShipmentDeliveryStepHint(
                    shipmentDeliverySummary,
                    idx,
                    language === 'ar',
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
                    {language === 'ar' ? '(متأخر)' : '(Delayed)'}
                  </span>
                )}
                {isPrepared && (idx === 3 || idx === activeIndex) && (
                  <span className="block text-[9px] text-green-400/70 font-normal text-center">
                    {language === 'ar' ? '(تم)' : '(Done)'}
                  </span>
                )}
              </span>
            </div>
          );
        })}
      </div>
      
      {isCancelled && (
        <div className="mt-4 text-center text-red-400 text-sm font-bold bg-red-500/10 py-2 rounded-lg border border-red-500/20">
            {language === 'ar' ? 'تم إلغاء هذا الطلب' : 'This order has been cancelled'}
        </div>
      )}

      {isDelayed && (
        <div className="mt-4 text-center text-red-400 text-sm font-bold bg-red-500/10 py-2 rounded-lg border border-red-500/20 animate-pulse">
            {language === 'ar' ? '⚠️ تأخر التاجر في التجهيز — مرحلة السماح الأخيرة' : '⚠️ Merchant preparation delayed — Final grace period active'}
        </div>
      )}
    </div>
  );
};

// Simple icon wrapper
const FileTextIcon = (props: any) => (
    <svg 
      {...props} 
      xmlns="http://www.w3.org/2000/svg" 
      width="24" 
      height="24" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    >
        <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/>
        <polyline points="14 2 14 8 20 8"/>
    </svg>
);
