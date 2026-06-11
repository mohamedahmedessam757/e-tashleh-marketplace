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

// Combined for index calculation
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

interface ShipmentTrackerProps {
    status: string;
    /** If true, use gold/yellow color scheme (customer/merchant). Default false (admin purple) */
    variant?: 'customer' | 'admin';
}

export const ShipmentTracker: React.FC<ShipmentTrackerProps> = ({ status, variant = 'customer' }) => {
    const { language } = useLanguage();
    const isAr = language === 'ar';

    const getStatusIndex = (st: string) => allShipmentStatuses.indexOf(st);
    const currentIndex = getStatusIndex(status);

    const isCustomsDelay = status === 'CUSTOMS_CLEARANCE' || status === 'CUSTOMS_DELAY';

    const dotActiveClass = variant === 'admin'
        ? 'bg-purple-500/20 border-purple-400 text-purple-400'
        : 'bg-gold-500/20 border-gold-400 text-gold-400';

    const dotCurrentClass = variant === 'admin'
        ? 'scale-125 shadow-[0_0_20px_rgba(168,85,247,0.5)] border-purple-300'
        : 'scale-125 shadow-[0_0_20px_rgba(234,179,8,0.5)] border-gold-300';

    const lineActiveClass = variant === 'admin' ? 'bg-purple-400 shadow-[0_0_8px_rgba(168,85,247,0.3)]' : 'bg-gold-400 shadow-[0_0_8px_rgba(234,179,8,0.3)]';

    return (
        <div className="w-full">
            {/* Customs Delay Banner */}
            {isCustomsDelay && (
                <div className="flex items-start gap-3 bg-orange-500/10 border border-orange-500/30 text-orange-400 rounded-xl px-4 py-3 mb-6 text-sm">
                    <AlertTriangle size={18} className="shrink-0 mt-0.5" />
                    <p>
                        {isAr
                            ? 'نعتذر عن التأخير، الشحنة حالياً لدى الجمارك في دولة العميل.'
                            : 'We apologize for the delay. The shipment is currently at Customs in the destination country.'}
                    </p>
                </div>
            )}

            <h3 className="text-white/50 text-[10px] uppercase font-black tracking-[0.2em] mb-6 flex items-center gap-2">
                <div className={`w-1 h-3 rounded-full ${variant === 'admin' ? 'bg-purple-500' : 'bg-gold-500'}`} />
                {isAr ? 'التتبع التفصيلي لرحلة الشحنة' : 'Detailed Shipment Journey Tracking'}
            </h3>

            <div className="bg-[#151310]/50 backdrop-blur-sm p-8 rounded-2xl border border-white/5 overflow-x-auto custom-scrollbar">
                <div className="flex items-center min-w-max px-4">
                    {allShipmentStatuses.map((st, idx) => {
                        const isActive = currentIndex >= idx;
                        const isCurrent = status === st;
                        const isCompleted = currentIndex > idx;

                        return (
                            <div key={st} className="flex items-center">
                                <div className="flex flex-col items-center gap-4 w-32 px-1 text-center group cursor-default">
                                    {/* Stage Circle */}
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center border-2 z-10 transition-all duration-500
                                        ${isActive ? dotActiveClass : 'bg-white/5 border-white/10 text-white/10'}
                                        ${isCurrent ? dotCurrentClass : ''}`}>
                                        {isCompleted ? (
                                            <CheckCircle2 size={18} className="text-current" />
                                        ) : isCurrent ? (
                                            <div className={`w-2.5 h-2.5 rounded-full animate-pulse ${variant === 'admin' ? 'bg-purple-400' : 'bg-gold-400'}`} />
                                        ) : (
                                            <div className="w-1.5 h-1.5 rounded-full bg-current opacity-40" />
                                        )}
                                    </div>

                                    {/* Label */}
                                    <div className="flex flex-col gap-1 px-2">
                                        <span className={`text-[10px] font-black leading-tight uppercase tracking-wide transition-colors duration-300 ${isActive ? 'text-white' : 'text-white/20'}`}>
                                            {statusTranslations[st]?.[isAr ? 'ar' : 'en'] || st}
                                        </span>
                                        {isCurrent && (
                                            <span className={`text-[8px] font-bold uppercase tracking-widest animate-pulse ${variant === 'admin' ? 'text-purple-400' : 'text-gold-400'}`}>
                                                {isAr ? 'المرحلة الحالية' : 'Current Phase'}
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {/* Connection Line */}
                                {idx < allShipmentStatuses.length - 1 && (
                                    <div className="w-12 h-px relative flex-shrink-0 -translate-y-4">
                                        <div className="absolute inset-x-0 h-px bg-white/5" />
                                        {isCompleted && (
                                            <div className={`absolute inset-y-0 h-px ${lineActiveClass}`} style={{ width: '100%' }} />
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
