import React, { useState, useEffect } from 'react';
import { GlassCard } from '../../ui/GlassCard';
import { Package } from 'lucide-react';

import { POST_DELIVERY_RETURN_DISPUTE_HOURS } from '../../../utils/orderSla';

interface DeliveredItemSelectionCardProps {
    item: any;
    language: string;
    onSelect: (item: any) => void;
    isSelected: boolean;
    buttonLabel: string;
    buttonColorClass: string;
}

export const DeliveredItemSelectionCard: React.FC<DeliveredItemSelectionCardProps> = ({
    item,
    language,
    onSelect,
    isSelected,
    buttonLabel,
    buttonColorClass
}) => {
    const [timeLeft, setTimeLeft] = useState<{ hours: number; minutes: number } | null>(null);

    useEffect(() => {
        const calculateTimeLeft = () => {
            if (item.isReturnEligible === false) return null;

            const expiry = item.returnExpiryDate
                ? new Date(item.returnExpiryDate)
                : new Date(new Date(item.deliveredAt || item.updatedAt || item.createdAt).getTime() + POST_DELIVERY_RETURN_DISPUTE_HOURS * 60 * 60 * 1000);

            const now = new Date();
            const difference = expiry.getTime() - now.getTime();

            if (difference > 0) {
                return {
                    hours: Math.floor(difference / (1000 * 60 * 60)),
                    minutes: Math.floor((difference / 1000 / 60) % 60)
                };
            }
            return null; // Expired
        };

        setTimeLeft(calculateTimeLeft());
        const timer = setInterval(() => setTimeLeft(calculateTimeLeft()), 60000); // Check every minute
        return () => clearInterval(timer);
    }, [item]);

    const isExpired = timeLeft === null;

    const conditionMap: Record<string, string> = {
        'new': 'جديد',
        'used': 'مستعمل',
        'used_clean': 'مستعمل ونظيف',
        'refurbished': 'مجدد',
    };

    const requestTypeMap: Record<string, string> = {
        'single': 'قطعة واحدة',
        'multiple': 'عدة قطع',
    };

    const shippingTypeMap: Record<string, string> = {
        'combined': 'تجميع الشحنات',
        'separate': 'شحن منفصل',
    };

    const warrantyMap: Record<string, string> = {
        'month1': 'شهر واحد',
        'month3': '3 أشهر',
        'month6': '6 أشهر',
        'year1': 'سنة واحدة',
        'none': 'بدون ضمان'
    };

    const txtPartsRequired = language === 'ar' ? 'القطعة المعنية بالطلب' : 'Related Part';
    const txtVehicle = language === 'ar' ? 'المركبة المعنية' : 'Vehicle Area';
    const txtDeliveryPayment = language === 'ar' ? 'التسليم والدفع' : 'Delivery & Payment';
    const txtDelivered = language === 'ar' ? 'مستلم بنجاح' : 'Delivered';

    const conditionText = conditionMap[item.condition?.toLowerCase() || ''] || item.condition || 'غير محدد';
    const requestTypeText = requestTypeMap[item.requestType?.toLowerCase() || ''] || item.requestType || 'غير محدد';
    const shippingTypeText = shippingTypeMap[item.shippingType?.toLowerCase() || ''] || item.shippingType || 'غير محدد';
    const warrantyText = item.hasWarranty ? (warrantyMap[item.warrantyDuration?.toLowerCase() || ''] || item.warrantyDuration || 'ضمان متوفر') : '';

    return (
        <GlassCard className={`p-0 overflow-hidden group transition-all duration-300 relative ${isExpired ? 'opacity-60 grayscale-[0.5] pointer-events-none border-red-500/30' : isSelected ? 'border-cyan-500 shadow-cyan-500/20 shadow-lg scale-[1.01] bg-cyan-500/5' : 'border-white/10 hover:border-cyan-400/50'}`}>

            {/* Header Strip - matching CartItem style */}
            <div className={`px-5 py-3 border-b flex flex-wrap gap-2 items-center justify-between ${isSelected ? 'bg-cyan-500/10 border-cyan-500/20' : 'bg-white/5 border-white/5'}`}>
                <div className="flex items-center gap-3">
                    <span className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-400 text-xs font-mono font-medium flex items-center gap-1">
                        <Package size={12} />
                        #{item.orderNumber}
                    </span>
                    <span className="text-sm font-medium text-white/80 flex items-center gap-2">
                        <span className="text-gold-500 text-xs">●</span>
                        {item.storeName}
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    {item.hasWarranty && (
                        <span className="px-2 py-0.5 rounded bg-green-500/20 text-green-400 text-xs font-medium">
                            {warrantyText}
                        </span>
                    )}
                    <span className="text-xs text-white/40">{new Date(item.deliveredAt || item.updatedAt || item.createdAt).toLocaleDateString()}</span>
                </div>
            </div>

            {/* Content Body */}
            <div className={`p-5 flex flex-col xl:flex-row gap-6 ${isExpired ? 'pointer-events-none' : ''}`}>

                {/* 1. Image */}
                <div className="w-full xl:w-32 h-32 shrink-0 rounded-xl bg-[#0a0f1a] border border-white/10 overflow-hidden relative flex items-center justify-center">
                    {item.partImage ? (
                        <img src={item.partImage} alt={item.name} className="w-full h-full object-cover" />
                    ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-white/20">
                            <Package size={24} className="mb-2" />
                            <span className="text-xs">No Image</span>
                        </div>
                    )}
                </div>

                {/* 2. Order Details Grid */}
                <div className="flex-1 flex flex-col gap-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">

                        {/* Column 1: Parts Details */}
                        <div className="space-y-2">
                            <h5 className="text-white/50 text-xs font-bold uppercase tracking-wider">{txtPartsRequired}</h5>
                            <div className="space-y-1">
                                <p className="text-white font-medium text-sm">
                                    {(item.name || item.partName || 'Unknown Part')}
                                    {item.partsCount > 1 ? ` (ضمن عرض مجمع)` : ''}
                                </p>
                                <p className="text-white/70 text-sm">
                                    <span className="text-white/40">{language === 'ar' ? 'الحالة: ' : 'Condition: '}</span>
                                    {conditionText}
                                </p>
                            </div>
                        </div>

                        {/* Column 2: Vehicle */}
                        <div className="space-y-2">
                            <h5 className="text-white/50 text-xs font-bold uppercase tracking-wider">{txtVehicle}</h5>
                            <div className="space-y-1">
                                <p className="text-white font-medium text-sm">
                                    {item.vehicleMake || ''} {item.vehicleModel || ''} {item.vehicleYear || ''}
                                </p>
                                {item.vin && (
                                    <p className="text-white/70 text-sm font-mono text-xs mt-1">
                                        <span className="text-white/40 font-sans">VIN: </span>
                                        {item.vin}
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* Column 3: Delivery & Payment */}
                        <div className="space-y-2">
                            <h5 className="text-white/50 text-xs font-bold uppercase tracking-wider">{txtDeliveryPayment}</h5>
                            <div className="space-y-1">
                                <p className="text-white text-sm">
                                    <span className="text-white/40">{language === 'ar' ? 'الطلب: ' : 'Type: '}</span>
                                    {requestTypeText}
                                </p>
                                <p className="text-green-400 font-medium text-sm flex items-center gap-2 mt-2">
                                    <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
                                    {txtDelivered}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Shipping Address Row (If exists & required to mirror) */}
                    {item.shippingAddress && (
                        <div className="pt-4 border-t border-white/5 mt-2">
                            <h5 className="text-white/50 text-xs font-bold uppercase tracking-wider mb-2">
                                {language === 'ar' ? 'وجهة التسليم' : 'Delivery Destination'}
                            </h5>
                            <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
                                <p className="text-white/80"><span className="text-white/40">{language === 'ar' ? 'الاسم: ' : 'Name: '}</span>{item.shippingAddress.fullName || item.shippingAddress.name}</p>
                                <p className="text-white/80"><span className="text-white/40">{language === 'ar' ? 'رقم الهاتف: ' : 'Phone: '}</span><span dir="ltr">{item.shippingAddress.phone}</span></p>
                                <p className="text-white/80"><span className="text-white/40">{language === 'ar' ? 'الدولة / المدينة: ' : 'Location: '}</span>{item.shippingAddress.country} - {item.shippingAddress.city}</p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Status Column (Selection Button & Timer Layout from CartItem) */}
                <div className={`w-full xl:w-auto mt-4 xl:mt-0 pt-4 xl:pt-0 border-t xl:border-t-0 xl:border-l ${isSelected ? 'border-cyan-500/30' : 'border-white/10'} xl:pl-6 shrink-0 flex justify-between xl:justify-center items-center xl:items-end flex-row xl:flex-col min-w-[160px] gap-4`}>

                    {/* Return Timer or Expiration Notice */}
                    <div className="text-left xl:text-right flex-1">
                        <span className="text-[10px] text-white/60 uppercase tracking-widest mb-1 block">
                            {language === 'ar' ? 'حالة الإرجاع' : 'Return Status'}
                        </span>
                        {isExpired ? (
                            <div className="bg-red-500/10 px-3 py-1.5 rounded-lg border border-red-500/20 inline-block">
                                <span className="text-red-400 font-bold text-sm block">
                                    {language === 'ar'
                                        ? `تجاوز ${POST_DELIVERY_RETURN_DISPUTE_HOURS} ساعة`
                                        : `Window expired (${POST_DELIVERY_RETURN_DISPUTE_HOURS}h)`}
                                </span>
                                <span className="text-red-400/60 text-[10px] mt-0.5 block">غير متاح للإرجاع</span>
                            </div>
                        ) : (
                            <div className="bg-cyan-500/10 px-3 py-1.5 rounded-lg border border-cyan-500/20 inline-block">
                                <div className="flex items-baseline gap-1">
                                    <span className="text-lg font-bold font-mono text-cyan-400">{timeLeft?.hours}h</span>
                                    <span className="text-lg font-bold font-mono text-cyan-400">{timeLeft?.minutes}m</span>
                                </div>
                                <span className="text-cyan-400/70 text-[10px] mt-0.5 block">{language === 'ar' ? 'الوقت المتبقي' : 'Time Left'}</span>
                            </div>
                        )}
                    </div>

                    {/* Action Button */}
                    <div className="flex flex-col items-end gap-2 shrink-0">
                        {item.totalPaid && (
                            <p className="text-xl font-bold text-gold-400 hidden xl:block mb-2">{item.totalPaid?.toFixed(2)} AED</p>
                        )}
                        <button
                            onClick={() => !isExpired && onSelect(item)}
                            disabled={isExpired}
                            className={`px-6 py-2.5 rounded-xl font-bold transition-all min-w-[140px] pointer-events-auto shadow-lg 
                                ${isExpired ? 'bg-white/5 text-white/30 cursor-not-allowed border border-white/5 shadow-none'
                                    : isSelected ? 'bg-cyan-500 text-black shadow-cyan-500/30 hover:bg-cyan-400 scale-105'
                                        : 'bg-white/10 text-white hover:bg-white/20 hover:text-cyan-300'}`}
                        >
                            {isExpired
                                ? (language === 'ar' ? 'مغلق' : 'Closed')
                                : isSelected
                                    ? (language === 'ar' ? '✓ تم التحديد' : '✓ Selected')
                                    : buttonLabel}
                        </button>
                    </div>
                </div>

            </div>
        </GlassCard>
    );
};
