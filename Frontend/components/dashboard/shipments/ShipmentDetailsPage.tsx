import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Truck, ArrowLeft, ArrowRight, Box, Package, MapPin, Calendar, FileText, Receipt, ShieldCheck, UserCheck, Store, Building2, ClipboardList, Info, Clock, ExternalLink } from 'lucide-react';
import { useLanguage } from '../../../contexts/LanguageContext';
import { useShipmentsStore } from '../../../stores/useShipmentsStore';
import { GlassCard } from '../../ui/GlassCard';
import { Badge } from '../../ui/Badge';
import { ShipmentTracker, statusTranslations } from './ShipmentTracker';
import { OrderInvoicesPanel } from '../shared/OrderInvoicesPanel';
import { OrderWaybillsPanel } from '../shared/OrderWaybillsPanel';

interface ShipmentDetailsPageProps {
    shipmentId: string | null;
    onBack: () => void;
    role: 'customer' | 'merchant';
}

export const ShipmentDetailsPage: React.FC<ShipmentDetailsPageProps> = ({ shipmentId, onBack, role }) => {
    const { language } = useLanguage();
    const isAr = language === 'ar';
    const { shipments, fetchShipments } = useShipmentsStore();
    const [activeTab, setActiveTab] = useState<'overview' | 'invoices' | 'waybills'>('overview');

    // Find shipment from store
    const shipment = shipments.find(s => s.id === shipmentId);

    useEffect(() => {
        if (shipments.length === 0) {
            fetchShipments();
        }
    }, [shipments.length, fetchShipments]);

    if (!shipment) {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-center px-4">
                <div className="w-16 h-16 border-4 border-gold-500/20 border-t-gold-500 rounded-full animate-spin mb-6" />
                <p className="text-white/50">{isAr ? 'جاري جلب بيانات الشحنة...' : 'Fetching shipment data...'}</p>
            </div>
        );
    }

    const BackIcon = isAr ? ArrowRight : ArrowLeft;

    const metaRow = (
        label: string,
        value: React.ReactNode,
        icon: React.ReactNode,
        valueClass = 'text-white',
    ) => (
        <div className="flex items-start sm:items-center justify-between gap-3 p-3 sm:p-3.5 bg-white/5 rounded-xl border border-white/5 min-w-0">
            <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 shrink-0">
                {icon}
                <span className="text-xs sm:text-sm font-medium text-white/60 whitespace-nowrap">{label}</span>
            </div>
            <span className={`font-mono font-bold text-sm sm:text-base break-all text-end min-w-0 ${valueClass}`}>
                {value}
            </span>
        </div>
    );

    return (
        <div className="space-y-5 sm:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20 min-w-0 overflow-x-clip">
            {/* Header / Breadcrumb */}
            <div className="flex flex-wrap items-center justify-between gap-3">
                <button
                    onClick={onBack}
                    className="flex items-center gap-2 text-white/50 hover:text-white transition-all group px-3 sm:px-4 py-2.5 min-h-[44px] rounded-xl hover:bg-white/5"
                >
                    <BackIcon size={20} className="group-hover:-translate-x-1 rtl:group-hover:translate-x-1 transition-transform shrink-0" />
                    <span className="font-medium text-sm sm:text-base">{isAr ? 'العودة للقائمة' : 'Back to List'}</span>
                </button>

                <div className="flex items-center gap-2 sm:gap-3 bg-gold-500/5 border border-gold-500/20 px-3 sm:px-4 py-2 rounded-2xl">
                   <div className="w-2 h-2 rounded-full bg-gold-500 animate-pulse shrink-0" />
                   <span className="text-[10px] sm:text-xs font-bold text-gold-400 uppercase tracking-widest">Pulse Live Sync</span>
                </div>
            </div>

            {/* Main Stage: Status Banner */}
            <GlassCard className="p-0 overflow-hidden border-white/5 bg-gradient-to-br from-[#1A1814] to-[#0F0E0C] min-w-0">
                <div className="p-4 sm:p-6 md:p-8 pb-4">
                    <div className="flex flex-col gap-5 sm:gap-6 mb-6 sm:mb-8">
                        <div className="flex items-start gap-3 sm:gap-5 min-w-0">
                            <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gold-500/10 rounded-2xl flex items-center justify-center border border-gold-500/20 shrink-0">
                                <Box className="text-gold-500 w-6 h-6 sm:w-8 sm:h-8" />
                            </div>
                            <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-2">
                                    <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-white font-mono tracking-tight break-all leading-tight">
                                        {shipment.trackingNumber.toUpperCase()}
                                    </h1>
                                    <Badge status={shipment.status} />
                                </div>
                                <p className="text-white/50 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs sm:text-sm">
                                    <span className="inline-flex items-center gap-1.5">
                                        <Truck size={14} className="text-gold-500/60 shrink-0" />
                                        {shipment.carrier || 'Tashleh Express'}
                                    </span>
                                    <span className="opacity-30 hidden sm:inline">|</span>
                                    <span className="inline-flex items-center gap-1.5">
                                        <Calendar size={14} className="text-gold-500/60 shrink-0" />
                                        {isAr ? 'آخر تحديث:' : 'Last Update:'} {new Date(shipment.updatedAt).toLocaleDateString(isAr ? 'ar-EG' : 'en-US')}
                                    </span>
                                </p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3 w-full max-w-xl sm:max-w-none sm:ms-auto sm:w-auto sm:flex sm:flex-wrap">
                            {shipment.trackingLink && (
                                <a
                                    href={shipment.trackingLink}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center justify-center gap-2 min-h-[48px] px-4 sm:px-6 py-3 bg-gold-500 text-black rounded-2xl font-bold text-sm transition-all hover:bg-gold-400 shadow-[0_0_20px_rgba(212,175,55,0.3)]"
                                >
                                    <ExternalLink size={18} className="shrink-0" />
                                    <span className="truncate">{isAr ? 'تتبع الشحنة مباشرة' : 'Track Directly'}</span>
                                </a>
                            )}
                            <button
                                type="button"
                                className="flex items-center justify-center gap-2 min-h-[48px] px-4 sm:px-6 py-3 bg-gold-500/10 hover:bg-gold-500 text-gold-500 hover:text-black border border-gold-500/20 rounded-2xl font-bold text-sm transition-all"
                                onClick={() => {/* Support logic */}}
                            >
                                <Info size={18} className="shrink-0" />
                                <span className="truncate">{isAr ? 'تحتاج مساعدة؟' : 'Need Help?'}</span>
                            </button>
                        </div>
                    </div>

                    {/* 12-Step Progress Bar (Premium Tracker) */}
                    <div className="mt-4 sm:mt-8 pt-4 sm:pt-8 border-t border-white/5 min-w-0">
                         <ShipmentTracker status={shipment.status} variant="customer" />
                    </div>
                </div>
            </GlassCard>

            {/* Grid for Details, Billing, etc. */}
            <div className="grid lg:grid-cols-3 gap-5 sm:gap-8 min-w-0">
                
                {/* Left Col: Metadata (2 cols on desktop) */}
                <div className="lg:col-span-2 space-y-5 sm:space-y-8 min-w-0">
                    
                    {/* Tab Selection (Integrated Billing) */}
                    <div className="flex p-1.5 bg-white/5 rounded-2xl border border-white/10 w-full sm:w-fit overflow-x-auto scrollbar-thin gap-1">
                        {[
                            { id: 'overview', icon: ClipboardList, label: isAr ? 'نظرة عامة' : 'Overview' },
                            { id: 'invoices', icon: Receipt, label: isAr ? 'الفواتير' : 'Invoices' },
                            { id: 'waybills', icon: FileText, label: isAr ? 'البوليصة' : 'Waybills' }
                        ].map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as any)}
                                className={`flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-6 py-2.5 min-h-[44px] rounded-xl font-bold text-xs sm:text-sm transition-all shrink-0 flex-1 sm:flex-none ${
                                    activeTab === tab.id 
                                    ? 'bg-gold-500 text-black shadow-lg shadow-gold-500/20' 
                                    : 'text-white/40 hover:text-white hover:bg-white/5'
                                }`}
                            >
                                <tab.icon size={16} className="shrink-0" />
                                <span className="whitespace-nowrap">{tab.label}</span>
                            </button>
                        ))}
                    </div>

                    <AnimatePresence mode="wait">
                        <motion.div
                            key={activeTab}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 10 }}
                            transition={{ duration: 0.2 }}
                            className="min-w-0"
                        >
                            {/* Overview Panel */}
                            {activeTab === 'overview' && (
                                <div className="space-y-4 sm:space-y-6">
                                    <div className="grid md:grid-cols-2 gap-4 sm:gap-6">
                                        {/* Order Info */}
                                        <GlassCard className="bg-[#151310] border-white/5 group hover:border-gold-500/20 transition-all p-4 sm:p-6 min-w-0">
                                            <div className="flex items-center gap-3 sm:gap-4 mb-4 sm:mb-6">
                                                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-purple-500/10 rounded-xl flex items-center justify-center border border-purple-500/20 shrink-0">
                                                    <Package className="text-purple-400" size={22} />
                                                </div>
                                                <div className="min-w-0">
                                                    <h3 className="font-bold text-white text-sm sm:text-base">{isAr ? 'بيانات الشحنة' : 'Shipment Items'}</h3>
                                                    <p className="text-[11px] sm:text-xs text-white/40">{isAr ? 'المركبة والقطع المطلوبة' : 'Vehicle & Parts Context'}</p>
                                                </div>
                                            </div>
                                            
                                            <div className="space-y-3 sm:space-y-4">
                                                <div className="p-3 sm:p-4 bg-white/5 rounded-xl border border-white/5 min-w-0">
                                                    <div className="flex flex-wrap justify-between items-center gap-2 mb-1">
                                                        <span className="text-[10px] sm:text-xs text-white/30 uppercase font-bold tracking-wider">{isAr ? 'المركبة' : 'Vehicle'}</span>
                                                        <span className="px-2 py-0.5 bg-gold-500/10 text-gold-500 text-[10px] font-bold rounded truncate max-w-full">REF: {shipment.orderNumber}</span>
                                                    </div>
                                                    <p className="font-bold text-white text-base sm:text-lg break-words">{shipment.vehicleMake} {shipment.vehicleModel}</p>
                                                </div>

                                                <div className="p-3 sm:p-4 bg-white/5 rounded-xl border border-white/5 min-w-0">
                                                    {(shipment as any).cartBatchSize > 1 && (
                                                        <p className="text-[10px] font-bold text-blue-300/90 mb-2 px-2 py-1 rounded-lg bg-blue-500/10 border border-blue-500/20 inline-block">
                                                            {isAr
                                                                ? `شحنة مجمعة — ${(shipment as any).cartBatchSize} قطع`
                                                                : `Grouped batch — ${(shipment as any).cartBatchSize} parts`}
                                                        </p>
                                                    )}
                                                    <span className="text-[10px] sm:text-xs text-white/30 uppercase font-bold tracking-wider mb-1 block">{isAr ? 'القطع وتفاصيلها' : 'Parts & Details'}</span>
                                                    <div className="space-y-2">
                                                        {shipment.items.map((item, i) => (
                                                            <div key={i} className="flex flex-col gap-2 bg-white/5 p-3 rounded-lg border border-white/5 min-w-0">
                                                                <div className="flex justify-between items-start gap-2">
                                                                    <span className="text-white font-bold text-sm break-words min-w-0">{item.name}</span>
                                                                    <span className="text-gold-500 font-bold px-2 py-0.5 bg-gold-500/10 rounded shrink-0 text-xs">x{item.quantity}</span>
                                                                </div>
                                                                {shipment.partDescription && (
                                                                    <p className="text-xs text-white/40 bg-black/20 p-2 rounded leading-relaxed break-words">
                                                                        {shipment.partDescription}
                                                                    </p>
                                                                )}
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>

                                                {/* Real Media Gallery (Request & Offer) */}
                                                {(shipment.partImages?.length > 0 || shipment.offerImage) && (
                                                    <div className="p-3 sm:p-4 bg-white/5 rounded-xl border border-white/5">
                                                        <span className="text-[10px] sm:text-xs text-white/30 uppercase font-bold tracking-wider mb-3 block">{isAr ? 'صور الفحص والطلب' : 'Request & Offer Visuals'}</span>
                                                        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                                                            {shipment.partImages?.map((img: string, idx: number) => (
                                                                <div key={idx} className="relative w-20 h-20 rounded-lg overflow-hidden border border-white/10 shrink-0">
                                                                    <img src={img} alt="Request" className="w-full h-full object-cover" />
                                                                    <div className="absolute top-0 left-0 bg-gold-500 text-black text-[8px] font-bold px-1">{isAr ? 'طلب' : 'REQ'}</div>
                                                                </div>
                                                            ))}
                                                            {shipment.offerImage && (
                                                                <div className="relative w-20 h-20 rounded-lg overflow-hidden border border-gold-500/30 shrink-0">
                                                                    <img src={shipment.offerImage} alt="Offer" className="w-full h-full object-cover" />
                                                                    <div className="absolute top-0 left-0 bg-cyan-500 text-black text-[8px] font-bold px-1">{isAr ? 'عرض' : 'OFFER'}</div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </GlassCard>

                                        {/* Codes Card (Anonymized + Detailed Location) */}
                                        <GlassCard className="bg-[#151310] border-white/5 group hover:border-gold-500/20 transition-all p-4 sm:p-6 min-w-0">
                                            <div className="flex items-center gap-3 sm:gap-4 mb-4 sm:mb-6">
                                                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-cyan-500/10 rounded-xl flex items-center justify-center border border-cyan-500/20 shrink-0">
                                                    <Building2 className="text-cyan-400" size={22} />
                                                </div>
                                                <div className="min-w-0">
                                                    <h3 className="font-bold text-white text-sm sm:text-base">{isAr ? 'أطراف الشحنة والموقع' : 'Parties & Location'}</h3>
                                                    <p className="text-[11px] sm:text-xs text-white/40">{isAr ? 'تأمين الهوية وتفاصيل الوصول' : 'Secure Identity & Delivery'}</p>
                                                </div>
                                            </div>

                                            <div className="space-y-2.5 sm:space-y-3">
                                                {metaRow(
                                                    isAr ? 'كود المتجر' : 'Store Code',
                                                    shipment.storeCode,
                                                    <Store size={18} className="text-cyan-500 shrink-0" />,
                                                    'text-cyan-400',
                                                )}
                                                {metaRow(
                                                    isAr ? 'كود العميل' : 'Customer Code',
                                                    shipment.customerCode,
                                                    <UserCheck size={18} className="text-green-500 shrink-0" />,
                                                    'text-green-400',
                                                )}

                                                {/* Detailed Customer Location */}
                                                <div className="p-3 sm:p-3.5 bg-white/5 rounded-xl border border-white/5 space-y-3 min-w-0">
                                                    <div className="flex items-start sm:items-center justify-between gap-3 border-b border-white/5 pb-2">
                                                        <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
                                                            <MapPin size={18} className="text-gold-500 shrink-0" />
                                                            <span className="text-xs sm:text-sm font-medium text-white/60">{isAr ? 'الدولة' : 'Country'}</span>
                                                        </div>
                                                        <span className="font-bold text-white text-xs sm:text-sm text-end break-words min-w-0">{shipment.customerCountry}</span>
                                                    </div>
                                                    <div className="flex items-start sm:items-center justify-between gap-3 border-b border-white/5 pb-2">
                                                        <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
                                                            <Building2 size={18} className="text-gold-500 shrink-0" />
                                                            <span className="text-xs sm:text-sm font-medium text-white/60">{isAr ? 'المدينة' : 'City'}</span>
                                                        </div>
                                                        <span className="font-bold text-white text-xs sm:text-sm text-end break-words min-w-0">{shipment.customerCity}</span>
                                                    </div>
                                                    <div className="space-y-1">
                                                        <span className="text-[10px] text-white/30 uppercase font-bold">{isAr ? 'العنوان التفصيلي' : 'Full Address'}</span>
                                                        <p className="text-xs text-white/60 leading-relaxed bg-black/20 p-2 rounded break-words">
                                                            {role === 'merchant' 
                                                                ? (isAr ? 'بيانات مخفية للخصوصية' : 'Hidden for Privacy') 
                                                                : (shipment.customerDetails || shipment.shippingAddress)}
                                                        </p>
                                                    </div>
                                                </div>

                                                <div className="flex gap-2 items-start sm:items-center text-[10px] text-white/30 bg-white/5 px-2.5 py-2 rounded leading-snug">
                                                    <ShieldCheck size={12} className="shrink-0 mt-0.5 sm:mt-0" />
                                                    <span>{isAr ? 'نظام خصوصية 2026: الهويات مشفرة.' : '2026 Privacy: Identities masked.'}</span>
                                                </div>
                                            </div>
                                        </GlassCard>
                                    </div>
                                    
                                    {/* Logistics Banner */}
                                    <GlassCard className="p-4 sm:p-6 bg-[#151310] border-[#151310] flex flex-col gap-5 sm:gap-8 min-w-0">
                                        <div className="flex-1 space-y-4 min-w-0">
                                             <div className="flex items-center gap-2 text-gold-500 font-bold text-xs sm:text-sm uppercase tracking-widest">
                                                 <Truck size={18} className="shrink-0" />
                                                 {isAr ? 'مسار الشحنة' : 'Shipment Journey'}
                                             </div>
                                             
                                             <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6">
                                                 <div className="flex-1 min-w-0">
                                                     <p className="text-xs text-white/30 mb-1">{isAr ? 'المصدر' : 'Origin'}</p>
                                                     <p className="font-bold text-white text-sm sm:text-base break-words">{isAr && shipment.origin === 'Tashleh Hub' ? 'مستودع التشليح' : shipment.origin}</p>
                                                 </div>
                                                 <div className="hidden sm:flex items-center gap-2 overflow-hidden px-4 shrink-0">
                                                     {[1,2,3].map(i => <div key={i} className="w-4 h-0.5 bg-gold-500/20" />)}
                                                     <Truck className="text-gold-500 shrink-0 mx-2" size={20} />
                                                     {[1,2,3].map(i => <div key={i} className="w-4 h-0.5 bg-gold-500/20" />)}
                                                 </div>
                                                 <div className="sm:hidden flex items-center justify-center py-1">
                                                     <Truck className="text-gold-500" size={18} />
                                                 </div>
                                                 <div className="flex-1 min-w-0 sm:text-end">
                                                     <p className="text-xs text-white/30 mb-1">{isAr ? 'الوجهة' : 'Destination'}</p>
                                                     <p className="font-bold text-white text-sm sm:text-base break-words">{shipment.destination === 'Your Address' && isAr ? 'عنوانك الخاص' : shipment.destination}</p>
                                                 </div>
                                             </div>

                                             <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-white/5 rounded-xl border border-white/10 min-w-0">
                                                 <div className="flex items-start gap-3 text-xs min-w-0">
                                                     <MapPin size={14} className="text-gold-500 shrink-0 mt-0.5" />
                                                     <span className="text-white/50 break-words">
                                                         {role === 'merchant' ? (isAr ? 'العنوان محمي من قبل المنصة' : 'Protected by Platform') : shipment.shippingAddress}
                                                     </span>
                                                 </div>
                                                 <div className="flex items-center gap-2 px-3 py-1.5 bg-white/5 rounded-lg border border-white/5 shrink-0 self-start sm:self-auto">
                                                     <Package size={12} className="text-gold-500" />
                                                     <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest whitespace-nowrap">
                                                         {isAr ? `الوزن: ${shipment.weightKg || '5.2'} كجم` : `Weight: ${shipment.weightKg || '5.2'}kg`}
                                                     </span>
                                                 </div>
                                             </div>
                                        </div>
                                    </GlassCard>
                                </div>
                            )}

                            {/* Billing & Documents Panels */}
                            {activeTab === 'invoices' && <OrderInvoicesPanel orderId={shipment.orderId} role={role.toUpperCase() as any} />}
                            {activeTab === 'waybills' && <OrderWaybillsPanel orderId={shipment.orderId} orderStatus={shipment.status as any} role={role.toUpperCase() as any} />}
                        </motion.div>
                    </AnimatePresence>
                </div>

                {/* Right Col: Timeline & Actions (1 col on desktop) */}
                <div className="space-y-6 min-w-0">
                    <GlassCard className="bg-[#151310] border-white/5 h-full p-4 sm:p-6">
                         <h3 className="font-bold text-white mb-4 sm:mb-6 flex items-center gap-2 text-sm sm:text-base">
                             <Clock className="text-gold-500 shrink-0" size={20} />
                             {isAr ? 'سجل العمليات المباشر' : 'Live Activity Logs'}
                         </h3>
                         
                         <div className="space-y-5 sm:space-y-6 relative ms-2">
                             <div className="absolute top-0 bottom-0 start-0 w-px bg-white/10" />

                             {[shipment.status, 'PACKAGED_FOR_SHIPPING', 'QUALITY_CHECK_PASSED'].map((st, i) => (
                                 <div key={i} className="relative ps-6">
                                     <div className={`absolute start-[-4.5px] top-1.5 w-2.5 h-2.5 rounded-full border-2 border-[#151310] ${i === 0 ? 'bg-gold-500 shadow-[0_0_10px_rgba(212,175,55,0.5)]' : 'bg-white/20'}`} />
                                     <div className="space-y-1 min-w-0">
                                         <p className={`text-sm font-bold break-words ${i === 0 ? 'text-white' : 'text-white/40'}`}>
                                             {statusTranslations[st]?.[isAr ? 'ar' : 'en'] || st}
                                         </p>
                                         <p className="text-[10px] text-white/20 flex items-center gap-2">
                                             <Calendar size={10} />
                                             {new Date(new Date(shipment.updatedAt).getTime() - i * 3600000).toLocaleString(isAr ? 'ar-EG' : 'en-US', { hour: 'numeric', minute: 'numeric' })}
                                         </p>
                                         {i === 0 && (
                                              <div className="bg-white/5 p-2 rounded-lg text-[10px] text-gold-500/60 mt-2 border border-gold-500/10 leading-relaxed">
                                                  {isAr ? 'تم تحديث الحالة تلقائياً عبر نظام التشليح' : 'Status auto-updated via Tashleh Pulse'}
                                              </div>
                                         )}
                                     </div>
                                 </div>
                             ))}
                         </div>
                    </GlassCard>
                </div>
            </div>
        </div>
    );
};
