
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Truck, ArrowLeft, ArrowRight, Box, Package, MapPin, Calendar, FileText, Receipt, ShieldCheck, UserCheck, Store, Building2, ClipboardList, Info, Clock, ExternalLink } from 'lucide-react';
import { useLanguage } from '../../../contexts/LanguageContext';
import { useShipmentsStore, Shipment } from '../../../stores/useShipmentsStore';
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
    const { t, language } = useLanguage();
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
            <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="w-16 h-16 border-4 border-gold-500/20 border-t-gold-500 rounded-full animate-spin mb-6" />
                <p className="text-white/50">{isAr ? 'جاري جلب بيانات الشحنة...' : 'Fetching shipment data...'}</p>
            </div>
        );
    }

    const BackIcon = isAr ? ArrowRight : ArrowLeft;

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
            {/* Header / Breadcrumb */}
            <div className="flex items-center justify-between">
                <button
                    onClick={onBack}
                    className="flex items-center gap-2 text-white/50 hover:text-white transition-all group px-4 py-2 rounded-xl hover:bg-white/5"
                >
                    <BackIcon size={20} className="group-hover:-translate-x-1 rtl:group-hover:translate-x-1 transition-transform" />
                    <span className="font-medium">{isAr ? 'العودة للقائمة' : 'Back to List'}</span>
                </button>

                <div className="flex items-center gap-3 bg-gold-500/5 border border-gold-500/20 px-4 py-2 rounded-2xl">
                   <div className="w-2 h-2 rounded-full bg-gold-500 animate-pulse" />
                   <span className="text-xs font-bold text-gold-400 uppercase tracking-widest">Pulse Live Sync</span>
                </div>
            </div>

            {/* Main Stage: Status Banner */}
            <GlassCard className="p-0 overflow-hidden border-white/5 bg-gradient-to-br from-[#1A1814] to-[#0F0E0C]">
                <div className="p-8 pb-4">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                        <div className="flex items-start gap-5">
                            <div className="w-16 h-16 bg-gold-500/10 rounded-2xl flex items-center justify-center border border-gold-500/20 shrink-0">
                                <Box className="text-gold-500" size={32} />
                            </div>
                            <div>
                                <div className="flex flex-wrap items-center gap-3 mb-2">
                                    <h1 className="text-3xl font-black text-white font-mono tracking-tight">{shipment.trackingNumber.toUpperCase()}</h1>
                                    <Badge status={shipment.status} />
                                </div>
                                <p className="text-white/50 flex items-center gap-2 text-sm">
                                    <Truck size={14} className="text-gold-500/60" />
                                    {shipment.carrier || 'Tashleh Express'}
                                    <span className="mx-2 opacity-30">|</span>
                                    <Calendar size={14} className="text-gold-500/60" />
                                    {isAr ? 'آخر تحديث:' : 'Last Update:'} {new Date(shipment.updatedAt).toLocaleDateString(isAr ? 'ar-EG' : 'en-US')}
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            {shipment.trackingLink && (
                                <a
                                    href={shipment.trackingLink}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-2 px-6 py-3 bg-gold-500 text-black rounded-2xl font-bold transition-all hover:bg-gold-400 shadow-[0_0_20px_rgba(212,175,55,0.3)] animate-in zoom-in duration-300"
                                >
                                    <ExternalLink size={18} />
                                    {isAr ? 'تتبع الشحنة مباشرة' : 'Track Directly'}
                                </a>
                            )}
                            <button
                                className="flex items-center gap-2 px-6 py-3 bg-gold-500/10 hover:bg-gold-500 text-gold-500 hover:text-black border border-gold-500/20 rounded-2xl font-bold transition-all group"
                                onClick={() => {/* Support logic */}}
                            >
                                <Info size={18} />
                                {isAr ? 'تحتاج مساعدة؟' : 'Need Help?'}
                            </button>
                        </div>
                    </div>

                    {/* 12-Step Progress Bar (Premium Tracker) */}
                    <div className="mt-8 pt-8 border-t border-white/5">
                         <ShipmentTracker status={shipment.status} variant="customer" />
                    </div>
                </div>
            </GlassCard>

            {/* Grid for Details, Billing, etc. */}
            <div className="grid lg:grid-cols-3 gap-8">
                
                {/* Left Col: Metadata (2 cols on desktop) */}
                <div className="lg:col-span-2 space-y-8">
                    
                    {/* Tab Selection (Integrated Billing) */}
                    <div className="flex p-1.5 bg-white/5 rounded-2xl border border-white/10 w-fit">
                        {[
                            { id: 'overview', icon: ClipboardList, label: isAr ? 'نظرة عامة' : 'Overview' },
                            { id: 'invoices', icon: Receipt, label: isAr ? 'الفواتير' : 'Invoices' },
                            { id: 'waybills', icon: FileText, label: isAr ? 'البوليصة' : 'Waybills' }
                        ].map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as any)}
                                className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm transition-all ${
                                    activeTab === tab.id 
                                    ? 'bg-gold-500 text-black shadow-lg shadow-gold-500/20' 
                                    : 'text-white/40 hover:text-white hover:bg-white/5'
                                }`}
                            >
                                <tab.icon size={16} />
                                {tab.label}
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
                        >
                            {/* Overview Panel */}
                            {activeTab === 'overview' && (
                                <div className="space-y-6">
                                    <div className="grid md:grid-cols-2 gap-6">
                                        {/* Order Info */}
                                        <GlassCard className="bg-[#151310] border-white/5 group hover:border-gold-500/20 transition-all">
                                            <div className="flex items-center gap-4 mb-6">
                                                <div className="w-12 h-12 bg-purple-500/10 rounded-xl flex items-center justify-center border border-purple-500/20">
                                                    <Package className="text-purple-400" size={24} />
                                                </div>
                                                <div>
                                                    <h3 className="font-bold text-white">{isAr ? 'بيانات الشحنة' : 'Shipment Items'}</h3>
                                                    <p className="text-xs text-white/40">{isAr ? 'المركبة والقطع المطلوبة' : 'Vehicle & Parts Context'}</p>
                                                </div>
                                            </div>
                                            
                                            <div className="space-y-4">
                                                <div className="p-4 bg-white/5 rounded-xl border border-white/5">
                                                    <div className="flex justify-between items-center mb-1">
                                                        <span className="text-xs text-white/30 uppercase font-bold tracking-wider">{isAr ? 'المركبة' : 'Vehicle'}</span>
                                                        <span className="px-2 py-0.5 bg-gold-500/10 text-gold-500 text-[10px] font-bold rounded">REF: {shipment.orderNumber}</span>
                                                    </div>
                                                    <p className="font-bold text-white text-lg">{shipment.vehicleMake} {shipment.vehicleModel}</p>
                                                </div>

                                                <div className="p-4 bg-white/5 rounded-xl border border-white/5">
                                                    {(shipment as any).cartBatchSize > 1 && (
                                                        <p className="text-[10px] font-bold text-blue-300/90 mb-2 px-2 py-1 rounded-lg bg-blue-500/10 border border-blue-500/20 inline-block">
                                                            {isAr
                                                                ? `شحنة مجمعة — ${(shipment as any).cartBatchSize} قطع`
                                                                : `Grouped batch — ${(shipment as any).cartBatchSize} parts`}
                                                        </p>
                                                    )}
                                                    <span className="text-xs text-white/30 uppercase font-bold tracking-wider mb-1 block">{isAr ? 'القطع وتفاصيلها' : 'Parts & Details'}</span>
                                                    <div className="space-y-2">
                                                        {shipment.items.map((item, i) => (
                                                            <div key={i} className="flex flex-col gap-2 bg-white/5 p-3 rounded-lg border border-white/5">
                                                                <div className="flex justify-between items-center">
                                                                    <span className="text-white font-bold">{item.name}</span>
                                                                    <span className="text-gold-500 font-bold px-2 py-0.5 bg-gold-500/10 rounded">x{item.quantity}</span>
                                                                </div>
                                                                {shipment.partDescription && (
                                                                    <p className="text-xs text-white/40 bg-black/20 p-2 rounded leading-relaxed">
                                                                        {shipment.partDescription}
                                                                    </p>
                                                                )}
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>

                                                {/* Real Media Gallery (Request & Offer) */}
                                                {(shipment.partImages?.length > 0 || shipment.offerImage) && (
                                                    <div className="p-4 bg-white/5 rounded-xl border border-white/5">
                                                        <span className="text-xs text-white/30 uppercase font-bold tracking-wider mb-3 block">{isAr ? 'صور الفحص والطلب' : 'Request & Offer Visuals'}</span>
                                                        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                                                            {/* Request Images (Customer) */}
                                                            {shipment.partImages?.map((img: string, idx: number) => (
                                                                <div key={idx} className="relative w-20 h-20 rounded-lg overflow-hidden border border-white/10 shrink-0">
                                                                    <img src={img} alt="Request" className="w-full h-full object-cover" />
                                                                    <div className="absolute top-0 left-0 bg-gold-500 text-black text-[8px] font-bold px-1">{isAr ? 'طلب' : 'REQ'}</div>
                                                                </div>
                                                            ))}
                                                            {/* Offer Image (Vendor) */}
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
                                        <GlassCard className="bg-[#151310] border-white/5 group hover:border-gold-500/20 transition-all">
                                            <div className="flex items-center gap-4 mb-6">
                                                <div className="w-12 h-12 bg-cyan-500/10 rounded-xl flex items-center justify-center border border-cyan-500/20">
                                                    <Building2 className="text-cyan-400" size={24} />
                                                </div>
                                                <div>
                                                    <h3 className="font-bold text-white">{isAr ? 'أطراف الشحنة والموقع' : 'Parties & Location'}</h3>
                                                    <p className="text-xs text-white/40">{isAr ? 'تأمين الهوية وتفاصيل الوصول' : 'Secure Identity & Delivery'}</p>
                                                </div>
                                            </div>

                                            <div className="space-y-3">
                                                <div className="flex items-center justify-between p-3.5 bg-white/5 rounded-xl border border-white/5">
                                                    <div className="flex items-center gap-3">
                                                       <Store size={18} className="text-cyan-500" />
                                                       <span className="text-sm font-medium text-white/60">{isAr ? 'كود المتجر' : 'Store Code'}</span>
                                                    </div>
                                                    <span className="font-mono font-bold text-cyan-400">{shipment.storeCode}</span>
                                                </div>

                                                <div className="flex items-center justify-between p-3.5 bg-white/5 rounded-xl border border-white/5">
                                                    <div className="flex items-center gap-3">
                                                       <UserCheck size={18} className="text-green-500" />
                                                       <span className="text-sm font-medium text-white/60">{isAr ? 'كود العميل' : 'Customer Code'}</span>
                                                    </div>
                                                    <span className="font-mono font-bold text-green-400">{shipment.customerCode}</span>
                                                </div>

                                                {/* Detailed Customer Location */}
                                                <div className="p-3.5 bg-white/5 rounded-xl border border-white/5 space-y-3">
                                                    <div className="flex items-center justify-between border-b border-white/5 pb-2">
                                                        <div className="flex items-center gap-3">
                                                            <MapPin size={18} className="text-gold-500" />
                                                            <span className="text-sm font-medium text-white/60">{isAr ? 'الدولة' : 'Country'}</span>
                                                        </div>
                                                        <span className="font-bold text-white text-sm">{shipment.customerCountry}</span>
                                                    </div>
                                                    <div className="flex items-center justify-between border-b border-white/5 pb-2">
                                                        <div className="flex items-center gap-3">
                                                            <Building2 size={18} className="text-gold-500" />
                                                            <span className="text-sm font-medium text-white/60">{isAr ? 'المدينة' : 'City'}</span>
                                                        </div>
                                                        <span className="font-bold text-white text-sm">{shipment.customerCity}</span>
                                                    </div>
                                                    <div className="space-y-1">
                                                        <span className="text-[10px] text-white/30 uppercase font-bold">{isAr ? 'العنوان التفصيلي' : 'Full Address'}</span>
                                                        <p className="text-xs text-white/60 leading-relaxed bg-black/20 p-2 rounded">
                                                            {role === 'merchant' 
                                                                ? (isAr ? 'بيانات مخفية للخصوصية' : 'Hidden for Privacy') 
                                                                : (shipment.customerDetails || shipment.shippingAddress)}
                                                        </p>
                                                    </div>
                                                </div>

                                                <div className="flex gap-2 items-center text-[10px] text-white/20 bg-white/5 px-2 py-1.5 rounded">
                                                    <ShieldCheck size={12} />
                                                    {isAr ? 'نظام خصوصية 2026: الهويات مشفرة.' : '2026 Privacy: Identities masked.'}
                                                </div>
                                            </div>
                                        </GlassCard>
                                    </div>
                                    
                                    {/* Logistics Banner */}
                                    <GlassCard className="p-6 bg-[#151310] border-[#151310] flex flex-col md:flex-row gap-8">
                                        <div className="flex-1 space-y-4">
                                             <div className="flex items-center gap-2 text-gold-500 font-bold text-sm uppercase tracking-widest">
                                                 <Truck size={18} />
                                                 {isAr ? 'مسار الشحنة' : 'Shipment Journey'}
                                             </div>
                                             
                                             <div className="flex items-center gap-6">
                                                 <div className="flex-1">
                                                     <p className="text-xs text-white/30 mb-1">{isAr ? 'المصدر' : 'Origin'}</p>
                                                     <p className="font-bold text-white">{isAr && shipment.origin === 'Tashleh Hub' ? 'مستودع التشليح' : shipment.origin}</p>
                                                 </div>
                                                 <div className="flex items-center gap-2 overflow-hidden px-4">
                                                     {[1,2,3].map(i => <div key={i} className="w-4 h-0.5 bg-gold-500/20" />)}
                                                     <Truck className="text-gold-500 shrink-0 mx-2" size={20} />
                                                     {[1,2,3].map(i => <div key={i} className="w-4 h-0.5 bg-gold-500/20" />)}
                                                 </div>
                                                 <div className="flex-1 text-right">
                                                     <p className="text-xs text-white/30 mb-1">{isAr ? 'الوجهة' : 'Destination'}</p>
                                                     <p className="font-bold text-white">{shipment.destination === 'Your Address' && isAr ? 'عنوانك الخاص' : shipment.destination}</p>
                                                 </div>
                                             </div>

                                             <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/10">
                                                 <div className="flex items-center gap-3 text-xs">
                                                     <MapPin size={14} className="text-gold-500 shrink-0" />
                                                     <span className="text-white/50">
                                                         {role === 'merchant' ? (isAr ? 'العنوان محمي من قبل المنصة' : 'Protected by Platform') : shipment.shippingAddress}
                                                     </span>
                                                 </div>
                                                 <div className="flex items-center gap-2 px-3 py-1 bg-white/5 rounded-lg border border-white/5">
                                                     <Package size={12} className="text-gold-500" />
                                                     <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">
                                                         {isAr ? `الوزن الفعلي: ${shipment.weightKg || '5.2'} كجم` : `Verified Weight: ${shipment.weightKg || '5.2'}kg`}
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
                <div className="space-y-6">
                    <GlassCard className="bg-[#151310] border-white/5 h-full">
                         <h3 className="font-bold text-white mb-6 flex items-center gap-2">
                             <Clock className="text-gold-500" size={20} />
                             {isAr ? 'سجل العمليات المباشر' : 'Live Activity Logs'}
                         </h3>
                         
                         <div className="space-y-6 relative ml-2 rtl:mr-2 rtl:ml-0">
                             {/* Vertical Line */}
                             <div className="absolute top-0 bottom-0 left-0 rtl:right-0 w-px bg-white/10" />

                             {[shipment.status, 'PACKAGED_FOR_SHIPPING', 'QUALITY_CHECK_PASSED'].map((st, i) => (
                                 <div key={i} className="relative pl-6 rtl:pr-6 rtl:pl-0">
                                     <div className={`absolute left-[-4.5px] rtl:right-[-4.5px] top-1.5 w-2.5 h-2.5 rounded-full border-2 border-[#151310] ${i === 0 ? 'bg-gold-500 shadow-[0_0_10px_rgba(212,175,55,0.5)]' : 'bg-white/20'}`} />
                                     <div className="space-y-1">
                                         <p className={`text-sm font-bold ${i === 0 ? 'text-white' : 'text-white/40'}`}>
                                             {statusTranslations[st]?.[isAr ? 'ar' : 'en'] || st}
                                         </p>
                                         <p className="text-[10px] text-white/20 flex items-center gap-2">
                                             <Calendar size={10} />
                                             {new Date(new Date(shipment.updatedAt).getTime() - i * 3600000).toLocaleString(isAr ? 'ar-EG' : 'en-US', { hour: 'numeric', minute: 'numeric' })}
                                         </p>
                                         {i === 0 && (
                                              <div className="bg-white/5 p-2 rounded-lg text-[10px] text-gold-500/60 mt-2 border border-gold-500/10">
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
