import React from 'react';
import { GlassCard } from '../../ui/GlassCard';
import { AlertCircle, Hash, Store, ShieldCheck, Info } from 'lucide-react';
import { CountdownTimer } from '../shipping-cart/CountdownTimer';
import { useLanguage } from '../../../contexts/LanguageContext';
import { CartItemType } from '../../../stores/useCartStore';

const conditionMap: Record<string, string> = {
    'new': 'جديد',
    'used': 'مستعمل',
    'used_clean': 'مستعمل (أصلي)',
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

interface MerchantCartItemProps {
    item: CartItemType;
}

export const MerchantCartItem: React.FC<MerchantCartItemProps> = ({ item }) => {
    const { t, language } = useLanguage();
    const isAr = language === 'ar';

    const txtPartsRequired = 'القطع المطلوبة';
    const txtVehicle = 'المركبة المعنية';
    const txtDeliveryPayment = 'التسليم والدفع';
    const txtPaidSuccessfully = 'تم الدفع بنجاح';
    const txtYourOffer = 'عرضك الخاص';
    const txtOtherStore = 'متجر آخر';
    const txtHidden = 'مخفي للخصوصية';

    const conditionText = item.isMyOffer ? (conditionMap[item.condition?.toLowerCase() || ''] || item.condition || 'غير محدد') : txtHidden;
    const requestTypeText = requestTypeMap[item.requestType?.toLowerCase() || ''] || item.requestType || 'غير محدد';
    const shippingTypeText = shippingTypeMap[item.shippingType?.toLowerCase() || ''] || item.shippingType || 'غير محدد';
    const warrantyText = (item.isMyOffer && item.hasWarranty) ? (warrantyMap[item.warrantyDuration?.toLowerCase() || ''] || item.warrantyDuration || 'ضمان متوفر') : '';

    return (
        <GlassCard 
            className={`p-0 overflow-hidden transition-all duration-500 ${
                item.isMyOffer 
                ? 'border-gold-500/50 shadow-[0_0_20px_rgba(168,139,62,0.15)] bg-gold-500/[0.03]' 
                : 'opacity-80'
            }`}
        >
            {/* Header Strip */}
            <div className={`px-5 py-3 border-b flex items-center justify-between ${
                item.isMyOffer ? 'bg-gold-500/10 border-gold-500/20' : 'bg-white/5 border-white/5'
            }`}>
                <div className="flex items-center gap-3">
                    <span className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-400 text-xs font-mono font-medium flex items-center gap-1">
                        <Hash size={12} />
                        {item.orderNumber}
                    </span>
                    <span className={`text-sm font-bold flex items-center gap-2 ${item.isMyOffer ? 'text-gold-400' : 'text-white/60'}`}>
                        <Store size={14} className={item.isMyOffer ? 'text-gold-500' : 'text-white/40'} />
                        {item.isMyOffer ? txtYourOffer : txtOtherStore}
                    </span>
                </div>
                {item.isMyOffer && item.hasWarranty && (
                    <span className="px-2 py-0.5 rounded bg-green-500/20 text-green-400 text-xs font-medium flex items-center gap-1">
                        <ShieldCheck size={12} />
                        {warrantyText}
                    </span>
                )}
                {!item.isMyOffer && (
                    <span className="text-[10px] text-white/30 italic flex items-center gap-1">
                        <Info size={10} />
                        {txtHidden}
                    </span>
                )}
            </div>

            {/* Content Body */}
            <div className="p-5 flex flex-col md:flex-row gap-6">

                {/* 1. Image */}
                <div className="w-full md:w-32 h-32 shrink-0 rounded-xl bg-[#0a0f1a] border border-white/10 overflow-hidden relative">
                    {item.partImage && item.isMyOffer ? (
                        <img src={item.partImage} alt={item.name} className="w-full h-full object-cover" />
                    ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-white/10">
                            <AlertCircle size={24} className="mb-2" />
                            <span className="text-[10px] uppercase font-bold tracking-tighter">No Image</span>
                        </div>
                    )}
                    {item.isMyOffer && (
                        <div className="absolute inset-0 bg-gold-500/10 pointer-events-none" />
                    )}
                </div>

                {/* 2. Order Details Grid */}
                <div className="flex-1 flex flex-col gap-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">

                        {/* Column 1: Parts Details */}
                        <div className="space-y-2">
                            <h5 className="text-white/50 text-xs font-bold uppercase tracking-wider">{txtPartsRequired}</h5>
                            <div className="space-y-1">
                                <p className={`font-bold text-sm ${item.isMyOffer ? 'text-white' : 'text-white/60'}`}>
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
                                <p className="text-white/80 font-medium text-sm">
                                    {item.vehicleMake} {item.vehicleModel} {item.vehicleYear}
                                </p>
                                {item.vin && item.isMyOffer && (
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
                                <p className="text-white/60 text-sm">
                                    <span className="text-white/40">الطلب: </span>
                                    {requestTypeText}
                                </p>
                                <p className="text-white/60 text-sm">
                                    <span className="text-white/40">الشحن: </span>
                                    {shippingTypeText}
                                </p>
                                <p className="text-green-400/70 font-medium text-xs flex items-center gap-2 mt-2">
                                    <span className="w-1 h-1 rounded-full bg-green-400" />
                                    {txtPaidSuccessfully}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Shipping Address Row (Only for own offer) */}
                    {item.shippingAddress && item.isMyOffer && (
                        <div className="pt-4 border-t border-white/5 mt-2">
                            <h5 className="text-gold-500/50 text-[10px] font-bold uppercase tracking-widest mb-2">
                                {isAr ? 'وجهة الشحن للعميل' : 'CUSTOMER SHIPPING DESTINATION'}
                            </h5>
                            <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs">
                                <p className="text-white/80"><span className="text-white/40">الاسم: </span>{isAr ? 'عميل منصة إي-تشليح' : 'E-Tashleh Customer'}</p>
                                <p className="text-white/80"><span className="text-white/40">المدينة: </span>{item.shippingAddress.city}</p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Timer & Pricing */}
                <div className={`w-full md:w-auto mt-4 md:mt-0 pt-4 md:pt-0 border-t md:border-t-0 md:border-l border-white/10 md:pl-6 shrink-0 flex justify-center md:items-end flex-col min-w-[140px] gap-4`}>
                    <div className="text-center md:text-right w-full">
                        {item.isMyOffer ? (
                            <p className="text-2xl font-bold text-gold-400">{item.totalPaid?.toFixed(2)} AED</p>
                        ) : (
                            <div className="py-2 px-3 bg-white/5 rounded border border-white/10">
                                <span className="text-[10px] text-white/20 italic">{txtHidden}</span>
                            </div>
                        )}
                    </div>
                    <div className="w-full text-center md:text-right">
                        <p className="text-[10px] text-white/30 mb-2 truncate w-full uppercase tracking-tighter">وقت التجميع المتبقي</p>
                        <CountdownTimer targetDate={item.expiryDate} />
                    </div>
                </div>

            </div>
        </GlassCard>
    );
};
