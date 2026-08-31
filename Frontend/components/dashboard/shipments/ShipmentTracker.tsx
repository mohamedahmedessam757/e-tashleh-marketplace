import React from 'react';
import { CheckCircle2, AlertTriangle } from 'lucide-react';
import { useLanguage } from '../../../contexts/LanguageContext';

// These enum values MUST match the Prisma ShipmentStatus enum exactly
export const shipmentStatuses = [
    'PREPARATION',
    'PREPARED',
    'RECEIVED_AT_HUB',
    'QUALITY_CHECK_PASSED',
    'PACKAGED_FOR_SHIPPING',
    'AWAITING_CARRIER_PICKUP',
    'PICKED_UP_BY_CARRIER',
    'IN_TRANSIT_TO_DESTINATION',
    'ARRIVED_AT_LOCAL_FACILITY',
    'CUSTOMS_CLEARANCE',
    'AT_LOCAL_WAREHOUSE',
    'OUT_FOR_DELIVERY',
    'DELIVERY_ATTEMPTED',
    'DELIVERED_TO_CUSTOMER',
];

export const returnStatuses = [
    'RETURN_LABEL_ISSUED',
    'RETURN_STARTED',
    'RECEIVED_FROM_CUSTOMER',
    'DELIVERED_TO_VENDOR',
    'EXCHANGE_COMPLETED',
    'IN_TRANSIT_TO_CUSTOMER',
    'RETURN_COMPLETED_TO_CUSTOMER',
];

// Combined for return-journey index calculation
export const allShipmentStatuses = [...shipmentStatuses, ...returnStatuses];

export const statusTranslations: Record<string, { ar: string, en: string }> = {
    'PREPARATION':               { ar: '⏳ قيد التجهيز', en: '⏳ Preparing' },
    'PREPARED':                  { ar: '📦 جاهز للشحن', en: '📦 Ready' },
    'RECEIVED_AT_HUB':           { ar: '1️⃣ استلام بالمركز', en: '1️⃣ Hub Received' },
    'QUALITY_CHECK_PASSED':      { ar: '2️⃣ تم فحص الجودة', en: '2️⃣ Quality Passed' },
    'PACKAGED_FOR_SHIPPING':     { ar: '3️⃣ تم التغليف', en: '3️⃣ Packaged' },
    'AWAITING_CARRIER_PICKUP':   { ar: '4️⃣ بانتظار المندوب', en: '4️⃣ Awaiting Carrier' },
    'PICKED_UP_BY_CARRIER':      { ar: '5️⃣ تم الاستلام من المندوب', en: '5️⃣ Picked Up' },
    'IN_TRANSIT_TO_DESTINATION': { ar: '6️⃣ في الطريق', en: '6️⃣ In Transit' },
    'ARRIVED_AT_LOCAL_FACILITY': { ar: '7️⃣ المرفق المحلي', en: '7️⃣ Local Hub' },
    'CUSTOMS_CLEARANCE':         { ar: '8️⃣ التخليص الجمركي', en: '8️⃣ Customs' },
    'AT_LOCAL_WAREHOUSE':        { ar: '9️⃣ المستودع المحلي', en: '9️⃣ Local Warehouse' },
    'OUT_FOR_DELIVERY':          { ar: '🔟 جاري التوصيل', en: '🔟 Out for Delivery' },
    'DELIVERY_ATTEMPTED':        { ar: '📍 محاولة توصيل', en: '📍 Delivery Attempt' },
    'DELIVERED_TO_CUSTOMER':     { ar: '✅ تم التسليم', en: '✅ Delivered' },
    
    // Return & Warranty Journey 2026
    'RETURN_LABEL_ISSUED':       { ar: '📄 إصدار بوليصة الإرجاع', en: '📄 Label Issued' },
    'RETURN_STARTED':            { ar: '🔄 بدء الإرجاع', en: '🔄 Return Started' },
    'RECEIVED_FROM_CUSTOMER':    { ar: '📥 استلام من العميل', en: '📥 Received from User' },
    'DELIVERED_TO_VENDOR':       { ar: '📦 تسليم للتاجر', en: '📦 Delivered to Vendor' },
    'EXCHANGE_COMPLETED':        { ar: '✨ تم الاستبدال', en: '✨ Exchange Done' },
    'IN_TRANSIT_TO_CUSTOMER':    { ar: '🚚 في الطريق إليك', en: '🚚 Heading Back' },
    'RETURN_COMPLETED_TO_CUSTOMER': { ar: '✅ إتمام الإرجاع', en: '✅ Return Completed' },

    // Legacy Support (Safety)
    'CUSTOMS_DELAY':             { ar: '⚠️ تأخير جمركي', en: '⚠️ Customs Delay' },
    'RETURN_TO_SENDER_INITIATED':{ ar: '↩️ بدء الإرجاع', en: '↩️ Return Initiated' },
    'RETURNED_TO_SENDER':        { ar: '🔄 تم الإرجاع للمرسل', en: '🔄 Returned to Sender' },
};

/** Compact mobile labels (no emoji clutter on narrow screens) */
const statusShort: Record<string, { ar: string; en: string }> = {
    PREPARATION: { ar: 'تجهيز', en: 'Prep' },
    PREPARED: { ar: 'جاهز', en: 'Ready' },
    RECEIVED_AT_HUB: { ar: 'المركز', en: 'Hub' },
    QUALITY_CHECK_PASSED: { ar: 'فحص', en: 'QC' },
    PACKAGED_FOR_SHIPPING: { ar: 'تغليف', en: 'Pack' },
    AWAITING_CARRIER_PICKUP: { ar: 'بانتظار', en: 'Wait' },
    PICKED_UP_BY_CARRIER: { ar: 'استلام', en: 'Pickup' },
    IN_TRANSIT_TO_DESTINATION: { ar: 'طريق', en: 'Transit' },
    ARRIVED_AT_LOCAL_FACILITY: { ar: 'مرفق', en: 'Local' },
    CUSTOMS_CLEARANCE: { ar: 'جمارك', en: 'Customs' },
    AT_LOCAL_WAREHOUSE: { ar: 'مستودع', en: 'Warehouse' },
    OUT_FOR_DELIVERY: { ar: 'توصيل', en: 'Out' },
    DELIVERY_ATTEMPTED: { ar: 'محاولة', en: 'Attempt' },
    DELIVERED_TO_CUSTOMER: { ar: 'تسليم', en: 'Done' },
    RETURN_LABEL_ISSUED: { ar: 'بوليصة', en: 'Label' },
    RETURN_STARTED: { ar: 'إرجاع', en: 'Return' },
    RECEIVED_FROM_CUSTOMER: { ar: 'استلام', en: 'Recv' },
    DELIVERED_TO_VENDOR: { ar: 'تاجر', en: 'Vendor' },
    EXCHANGE_COMPLETED: { ar: 'استبدال', en: 'Swap' },
    IN_TRANSIT_TO_CUSTOMER: { ar: 'إليك', en: 'Back' },
    RETURN_COMPLETED_TO_CUSTOMER: { ar: 'تم', en: 'Done' },
};

interface ShipmentTrackerProps {
    status: string;
    /** If true, use gold/yellow color scheme (customer/merchant). Default false (admin purple) */
    variant?: 'customer' | 'admin';
}

export const ShipmentTracker: React.FC<ShipmentTrackerProps> = ({ status, variant = 'admin' }) => {
    const { language } = useLanguage();
    const isAr = language === 'ar';

    const isReturnJourney = returnStatuses.includes(status);
    const displayStatuses = isReturnJourney ? allShipmentStatuses : shipmentStatuses;
    const currentIndex = displayStatuses.indexOf(status);
    const isForwardDelivered =
        !isReturnJourney && status === 'DELIVERED_TO_CUSTOMER';

    const isCustomsDelay = status === 'CUSTOMS_CLEARANCE' || status === 'CUSTOMS_DELAY';

    const dotActiveClass = variant === 'admin'
        ? 'bg-purple-500/20 border-purple-400 text-purple-400'
        : 'bg-gold-500/20 border-gold-400 text-gold-400';

    const dotCurrentClass = variant === 'admin'
        ? 'scale-110 sm:scale-125 shadow-[0_0_20px_rgba(168,85,247,0.5)] border-purple-300'
        : 'scale-110 sm:scale-125 shadow-[0_0_20px_rgba(234,179,8,0.5)] border-gold-300';

    const lineActiveClass = variant === 'admin' ? 'bg-purple-400 shadow-[0_0_8px_rgba(168,85,247,0.3)]' : 'bg-gold-400 shadow-[0_0_8px_rgba(234,179,8,0.3)]';

    const labelFor = (st: string, compact: boolean) => {
        if (compact && statusShort[st]) {
            return isAr ? statusShort[st].ar : statusShort[st].en;
        }
        return statusTranslations[st]?.[isAr ? 'ar' : 'en'] || st;
    };

    return (
        <div className="w-full min-w-0">
            {/* Customs Delay Banner */}
            {isCustomsDelay && (
                <div className="flex items-start gap-3 bg-orange-500/10 border border-orange-500/30 text-orange-400 rounded-xl px-3 sm:px-4 py-3 mb-4 sm:mb-6 text-xs sm:text-sm">
                    <AlertTriangle size={18} className="shrink-0 mt-0.5" />
                    <p className="leading-relaxed">
                        {isAr
                            ? 'نعتذر عن التأخير، الشحنة حالياً لدى الجمارك في دولة العميل.'
                            : 'We apologize for the delay. The shipment is currently at Customs in the destination country.'}
                    </p>
                </div>
            )}

            <h3 className="text-white/50 text-[10px] uppercase font-black tracking-[0.15em] sm:tracking-[0.2em] mb-4 sm:mb-6 flex items-center gap-2 leading-snug">
                <div className={`w-1 h-3 rounded-full shrink-0 ${variant === 'admin' ? 'bg-purple-500' : 'bg-gold-500'}`} />
                <span>{isAr ? 'التتبع التفصيلي لرحلة الشحنة' : 'Detailed Shipment Journey Tracking'}</span>
            </h3>

            {/* Mobile: vertical compact timeline */}
            <div className="md:hidden bg-[#151310]/50 backdrop-blur-sm p-3 rounded-2xl border border-white/5">
                <div className="space-y-0 relative max-h-[320px] overflow-y-auto custom-scrollbar pe-1">
                    {displayStatuses.map((st, idx) => {
                        const isActive = currentIndex >= idx;
                        const isCurrent = status === st && !isForwardDelivered;
                        const isCompleted =
                            currentIndex > idx ||
                            (isForwardDelivered && idx <= currentIndex);

                        return (
                            <div key={st} className="flex gap-3 relative pb-3 last:pb-0">
                                <div className="flex flex-col items-center shrink-0">
                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center border-2 z-10
                                        ${isActive ? dotActiveClass : 'bg-white/5 border-white/10 text-white/10'}
                                        ${isCurrent ? dotCurrentClass : ''}`}>
                                        {isCompleted || (isForwardDelivered && isActive) ? (
                                            <CheckCircle2 size={14} className="text-current" />
                                        ) : isCurrent ? (
                                            <div className={`w-2 h-2 rounded-full animate-pulse ${variant === 'admin' ? 'bg-purple-400' : 'bg-gold-400'}`} />
                                        ) : (
                                            <div className="w-1 h-1 rounded-full bg-current opacity-40" />
                                        )}
                                    </div>
                                    {idx < displayStatuses.length - 1 && (
                                        <div className={`w-px flex-1 min-h-[10px] mt-1 ${isCompleted || isForwardDelivered ? lineActiveClass : 'bg-white/10'}`} />
                                    )}
                                </div>
                                <div className="pt-1.5 min-w-0 flex-1">
                                    <p className={`text-xs font-bold leading-snug ${isActive ? 'text-white' : 'text-white/25'}`}>
                                        {labelFor(st, false)}
                                    </p>
                                    {isCurrent && (
                                        <span className={`text-[9px] font-bold uppercase tracking-widest animate-pulse ${variant === 'admin' ? 'text-purple-400' : 'text-gold-400'}`}>
                                            {isAr ? 'المرحلة الحالية' : 'Current Phase'}
                                        </span>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Tablet / Desktop: horizontal scroll tracker */}
            <div className="hidden md:block bg-[#151310]/50 backdrop-blur-sm p-4 lg:p-8 rounded-2xl border border-white/5 overflow-x-auto custom-scrollbar">
                <div className="flex items-center min-w-max px-2 lg:px-4">
                    {displayStatuses.map((st, idx) => {
                        const isActive = currentIndex >= idx;
                        const isCurrent = status === st && !isForwardDelivered;
                        const isCompleted =
                            currentIndex > idx ||
                            (isForwardDelivered && idx <= currentIndex);

                        return (
                            <div key={st} className="flex items-center">
                                <div className="flex flex-col items-center gap-3 lg:gap-4 w-24 lg:w-32 px-1 text-center group cursor-default">
                                    <div className={`w-9 h-9 lg:w-10 lg:h-10 rounded-xl flex items-center justify-center border-2 z-10 transition-all duration-500
                                        ${isActive ? dotActiveClass : 'bg-white/5 border-white/10 text-white/10'}
                                        ${isCurrent ? dotCurrentClass : ''}`}>
                                        {isCompleted || (isForwardDelivered && isActive) ? (
                                            <CheckCircle2 size={16} className="text-current lg:w-[18px] lg:h-[18px]" />
                                        ) : isCurrent ? (
                                            <div className={`w-2.5 h-2.5 rounded-full animate-pulse ${variant === 'admin' ? 'bg-purple-400' : 'bg-gold-400'}`} />
                                        ) : (
                                            <div className="w-1.5 h-1.5 rounded-full bg-current opacity-40" />
                                        )}
                                    </div>

                                    <div className="flex flex-col gap-1 px-1">
                                        <span className={`text-[9px] lg:text-[10px] font-black leading-tight uppercase tracking-wide transition-colors duration-300 ${isActive ? 'text-white' : 'text-white/20'}`}>
                                            <span className="lg:hidden">{labelFor(st, true)}</span>
                                            <span className="hidden lg:inline">{labelFor(st, false)}</span>
                                        </span>
                                        {isCurrent && (
                                            <span className={`text-[8px] font-bold uppercase tracking-widest animate-pulse ${variant === 'admin' ? 'text-purple-400' : 'text-gold-400'}`}>
                                                {isAr ? 'الحالية' : 'Current'}
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {idx < displayStatuses.length - 1 && (
                                    <div className="w-8 lg:w-12 h-px relative flex-shrink-0 -translate-y-3 lg:-translate-y-4">
                                        <div className="absolute inset-x-0 h-px bg-white/5" />
                                        {(currentIndex > idx || isForwardDelivered) && (
                                            <div className={`absolute inset-y-0 h-px ${lineActiveClass}`} style={{ width: '100%' }} />
                                        )}
                                        {currentIndex === idx && !isForwardDelivered && (
                                            <div className={`absolute inset-y-0 h-px ${lineActiveClass}`} style={{ width: '50%' }} />
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};
