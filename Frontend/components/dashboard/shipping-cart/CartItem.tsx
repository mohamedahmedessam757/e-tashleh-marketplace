import React from 'react';
import { GlassCard } from '../../ui/GlassCard';
import { AlertCircle, Hash, Store, ShieldCheck, Truck } from 'lucide-react';
import { CountdownTimer } from './CountdownTimer';
import { useLanguage } from '../../../contexts/LanguageContext';
import { CartItemType } from '../../../stores/useCartStore';
import { getFulfillmentLabel } from '../../../utils/offerFulfillmentHelpers';
import { CartShipmentBadge } from '../shared/CartShipmentBadge';

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

interface CartItemProps {
    item: CartItemType;
    isSelected: boolean;
    onSelect: (offerId: string) => void;
}

export const CartItem: React.FC<CartItemProps> = ({ item, isSelected, onSelect }) => {
    const { t, language } = useLanguage();
    const isAr = language === 'ar';
    const canSelect = item.canSelectForShipping !== false;
    const lockReason = isAr ? item.lockReasonAr : item.lockReasonEn;
    const statusLabel = getFulfillmentLabel(item.fulfillmentStatus, isAr);

    // Arabic literals as requested by the user
    const txtPartsRequired = 'القطع المطلوبة';
    const txtVehicle = 'المركبة المعنية';
    const txtDeliveryPayment = 'التسليم والدفع';
    const txtPaidSuccessfully = 'تم الدفع بنجاح';

    const conditionText = conditionMap[item.condition?.toLowerCase() || ''] || item.condition || 'غير محدد';
    const requestTypeText = requestTypeMap[item.requestType?.toLowerCase() || ''] || item.requestType || 'غير محدد';
    const shippingTypeText = shippingTypeMap[item.shippingType?.toLowerCase() || ''] || item.shippingType || 'غير محدد';
    const warrantyText = item.hasWarranty ? (warrantyMap[item.warrantyDuration?.toLowerCase() || ''] || item.warrantyDuration || 'ضمان متوفر') : '';


    return (
        <GlassCard className={`p-0 overflow-hidden group transition-all duration-300 ${!canSelect ? 'opacity-80' : ''} ${isSelected ? 'border-gold-500 ring-1 ring-gold-500/20 bg-gold-500/5' : 'hover:border-gold-500/30'}`}>
            {/* Header Strip */}
            <div className={`px-5 py-3 border-b transition-colors flex items-center justify-between ${isSelected ? 'bg-gold-500/10 border-gold-500/20' : 'bg-white/5 border-white/5'}`}>
                <div className="flex items-center gap-4">
                    {/* Selection Checkbox */}
                    <div
                        onClick={() => canSelect && onSelect(item.offerId)}
                        role="checkbox"
                        aria-checked={isSelected}
                        aria-disabled={!canSelect}
                        className={`w-5 h-5 rounded border flex items-center justify-center transition-all ${
                            !canSelect
                            ? 'border-white/10 bg-white/5 cursor-not-allowed opacity-40'
                            : isSelected 
                            ? 'bg-gold-500 border-gold-500 text-black cursor-pointer' 
                            : 'border-white/20 hover:border-gold-500/50 bg-black/20 cursor-pointer'
                        }`}
                    >
                        {isSelected && (
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                        )}
                    </div>

                    <div className="flex items-center gap-3">
                        <span className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-400 text-xs font-mono font-medium flex items-center gap-1">
                            <Hash size={12} />
                            {item.orderNumber}
                        </span>
                        <span className="text-sm font-medium text-white/80 flex items-center gap-2">
                            <Store size={14} className="text-gold-500" />
                            {item.storeName}
                        </span>
                    </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap justify-end">
                    <CartShipmentBadge
                        offer={{
                            fulfillmentStatus: item.fulfillmentStatus,
                            shippedFromCart: false,
                            handoverPending: item.handoverPending,
                        }}
                        order={{ requestType: item.requestType, shippingType: item.shippingType }}
                        inAssemblyCart
                        isAr={isAr}
                    />
                    {item.fulfillmentStatus && (
                        <span className={`px-2 py-0.5 rounded text-xs font-medium border ${
                            canSelect
                            ? 'bg-green-500/20 text-green-400 border-green-500/30'
                            : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                        }`}>
                            {statusLabel}
                        </span>
                    )}
                    {item.hasWarranty && (
                        <span className="px-2 py-0.5 rounded bg-green-500/20 text-green-400 text-xs font-medium flex items-center gap-1">
                            <ShieldCheck size={12} />
                            {warrantyText}
                        </span>
                    )}
                </div>
            </div>

            {!canSelect && lockReason && (
                <div className="px-5 py-2 bg-amber-500/5 border-b border-amber-500/10 text-amber-300/90 text-xs flex items-center gap-2">
                    <Truck size={14} className="shrink-0 opacity-70" />
                    {lockReason}
                </div>
            )}

            {/* Content Body */}
            <div className="p-5 flex flex-col md:flex-row gap-6">

                {/* 1. Image */}
                <div className="w-full md:w-32 h-32 shrink-0 rounded-xl bg-[#0a0f1a] border border-white/10 overflow-hidden relative">
                    {item.partImage ? (
                        <img src={item.partImage} alt={item.name} className="w-full h-full object-cover" />
                    ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-white/20">
                            <AlertCircle size={24} className="mb-2" />
                            <span className="text-xs">No Image</span>
                        </div>
                    )}
                </div>

                {/* 2. Order Details Grid (Exactly as requested) */}
                <div className="flex-1 flex flex-col gap-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">

                        {/* Column 1: Parts Details */}
                        <div className="space-y-2">
                            <h5 className="text-white/50 text-xs font-bold uppercase tracking-wider">{txtPartsRequired}</h5>
                            <div className="space-y-1">
                                <p className="text-white font-medium text-sm">
                                    {item.name}
                                </p>
                                <p className="text-white/70 text-sm">
                                    <span className="text-white/40">الحالة: </span>
                                    {conditionText}
                                </p>
                            </div>
                        </div>

                        {/* Column 2: Vehicle */}
                        <div className="space-y-2">
                            <h5 className="text-white/50 text-xs font-bold uppercase tracking-wider">{txtVehicle}</h5>
                            <div className="space-y-1">
                                <p className="text-white font-medium text-sm">
                                    {item.vehicleMake} {item.vehicleModel} {item.vehicleYear}
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
                                    <span className="text-white/40">الطلب: </span>
                                    {requestTypeText}
                                </p>
                                <p className="text-white text-sm">
                                    <span className="text-white/40">الشحن: </span>
                                    {shippingTypeText}
                                </p>
                                <p className="text-green-400 font-medium text-sm flex items-center gap-2 mt-2">
                                    <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
                                    {txtPaidSuccessfully}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Shipping Address Row */}
                    {item.shippingAddress && (
                        <div className="pt-4 border-t border-white/5 mt-2">
                            <h5 className="text-white/50 text-xs font-bold uppercase tracking-wider mb-2">تفاصيل الشحن للوجهة</h5>
                            <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
                                <p className="text-white/80"><span className="text-white/40">الاسم: </span>{item.shippingAddress.fullName}</p>
                                <p className="text-white/80"><span className="text-white/40">رقم الهاتف: </span><span dir="ltr">{item.shippingAddress.phone}</span></p>
                                <p className="text-white/80"><span className="text-white/40">البريد: </span>{item.shippingAddress.email || '-'}</p>
                                <p className="text-white/80"><span className="text-white/40">الدولة / المدينة: </span>{item.shippingAddress.country} - {item.shippingAddress.city}</p>
                                <p className="text-white/80 w-full mt-1 border border-white/5 p-2 rounded bg-black/20"><span className="text-white/40 block mb-1">العنوان بالتفصيل: </span>{item.shippingAddress.details}</p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Timer & Pricing */}
                <div className="w-full md:w-auto mt-4 md:mt-0 pt-4 md:pt-0 border-t md:border-t-0 md:border-l border-white/10 md:pl-6 shrink-0 flex justify-center md:items-end flex-col min-w-[140px] gap-4">
                    <div className="text-center md:text-right w-full">
                        <p className="text-2xl font-bold text-gold-400">{item.totalPaid?.toFixed(2)} AED</p>
                    </div>
                    <div className="w-full text-center md:text-right">
                        <p className="text-xs text-white/50 mb-2 truncate w-full">{t.dashboard.shippingCart.daysRemaining}</p>
                        <CountdownTimer targetDate={item.expiryDate} />
                    </div>
                </div>

            </div>
        </GlassCard>
    );
};
