import React, { useState, useEffect } from 'react';
import { GlassCard } from '../../ui/GlassCard';
import { useLanguage } from '../../../contexts/LanguageContext';
import { Truck, Search, MapPin, Package, ExternalLink, AlertTriangle, CheckCircle2, Factory, ShieldCheck, Box, RefreshCcw, XCircle, FileText, ChevronRight, Save, Settings2, History } from 'lucide-react';
import { Badge, StatusType } from '../../ui/Badge';
import { shipmentsApi, Shipment, ShipmentStatusLog } from '../../../services/api/shipments.api';
import { motion, AnimatePresence } from 'framer-motion';
import { StatusTimeline } from '../../ui/StatusTimeline';
import { ShipmentTracker } from '../shipments/ShipmentTracker';
import { useShipmentStore } from '../../../stores/useShipmentStore';
import { useAdminStore } from '../../../stores/useAdminStore';
import { OrderCountdown } from '../../ui/OrderCountdown';
import { ShipmentBatchCard } from '../shared/ShipmentBatchCard';

function shipmentMatchesQuery(s: Shipment, query: string): boolean {
    const q = query.toLowerCase().trim();
    if (!q) return true;
    const orderNumber = ((s.order as any)?.orderNumber || '').toLowerCase();
    const partNames = (s.batchPartNames || s.items?.map((i) => i.name) || []).join(' ').toLowerCase();
    const waybill = (s.waybillNumber || '').toLowerCase();
    return (
        s.orderId.toLowerCase() === q ||
        s.orderId.toLowerCase().includes(q) ||
        s.id.toLowerCase() === q ||
        orderNumber.includes(q) ||
        (s.trackingNumber || '').toLowerCase().includes(q) ||
        (s.carrierName || '').toLowerCase().includes(q) ||
        partNames.includes(q) ||
        waybill.includes(q)
    );
}

function toBatchSummary(s: Shipment) {
    const partNames =
        s.batchPartNames?.length
            ? s.batchPartNames
            : s.items?.map((i) => i.name) || [];
    return {
        shipmentId: s.id,
        waybillId: s.waybillId ?? null,
        waybillNumber: s.waybillNumber ?? null,
        offerIds: [],
        partNames,
        batchSize: s.cartBatchSize || partNames.length || 1,
        shippedAt: s.updatedAt,
        trigger: s.issueMode ?? null,
        status: s.status,
    };
}

// These MUST match the Prisma ShipmentStatus enum exactly
const shipmentStatuses = [
    'RECEIVED_AT_HUB',
    'QUALITY_CHECK_PASSED',
    'PACKAGED_FOR_SHIPPING',
    'AWAITING_CARRIER_PICKUP',
    'PICKED_UP_BY_CARRIER',
    'IN_TRANSIT_TO_DESTINATION',
    'ARRIVED_AT_LOCAL_FACILITY',
    'CUSTOMS_CLEARANCE',
    'CUSTOMS_DELAY',
    'AT_LOCAL_WAREHOUSE',
    'OUT_FOR_DELIVERY',
    'DELIVERY_ATTEMPTED',
    'DELIVERED_TO_CUSTOMER',
    // 2026 Return & Warranty Journey
    'RETURN_LABEL_ISSUED',
    'RETURN_STARTED',
    'RECEIVED_FROM_CUSTOMER',
    'DELIVERED_TO_VENDOR',
    'EXCHANGE_COMPLETED',
    'IN_TRANSIT_TO_CUSTOMER',
    'RETURN_COMPLETED_TO_CUSTOMER',
];

// Combined for history and tracking
const allStatuses = [...shipmentStatuses];

const statusTranslations: Record<string, { ar: string, en: string }> = {
    'RECEIVED_AT_HUB':           { ar: '1️⃣ تم استلام الطلب', en: '1️⃣ Order Received' },
    'QUALITY_CHECK_PASSED':      { ar: '2️⃣ قيد تجهيز المتجر', en: '2️⃣ Store Preparing' },
    'PACKAGED_FOR_SHIPPING':     { ar: '3️⃣ تم توثيق القطعة', en: '3️⃣ Part Verified' },
    'AWAITING_CARRIER_PICKUP':   { ar: '4️⃣ جاهز للتسليم', en: '4️⃣ Ready for Pickup' },
    'PICKED_UP_BY_CARRIER':      { ar: '5️⃣ تم التسليم لشركة الشحن', en: '5️⃣ Handed to Carrier' },
    'IN_TRANSIT_TO_DESTINATION': { ar: '6️⃣ قيد الشحن الدولي', en: '6️⃣ International Transit' },
    'ARRIVED_AT_LOCAL_FACILITY': { ar: '7️⃣ في منطقة العبور (Transit)', en: '7️⃣ In Transit Zone' },
    'CUSTOMS_CLEARANCE':         { ar: '8️⃣ وصل إلى دولة العميل / الجمارك', en: '8️⃣ Arrived / Customs' },
    'CUSTOMS_DELAY':             { ar: '⚠️ نعتذر، الشحنة لدى الجمارك', en: '⚠️ Delayed at Customs' },
    'AT_LOCAL_WAREHOUSE':        { ar: '9️⃣ وصل لمستودع مدينتك', en: '9️⃣ At Local Warehouse' },
    'OUT_FOR_DELIVERY':          { ar: '🔟 خرج للتوصيل', en: '🔟 Out for Delivery' },
    'DELIVERY_ATTEMPTED':        { ar: '📍 محاولة توصيل', en: '📍 Delivery Attempt' },
    'DELIVERED_TO_CUSTOMER':     { ar: '✅ تم التسليم', en: '✅ Delivered' },
    // 2026 Return & Warranty Journey - Exact User Phrases with Icons
    'RETURN_LABEL_ISSUED':       { ar: '📄 يتم أصدار بوليصة أرجاع للمنتج', en: '📄 Return Label Issued' },
    'RETURN_STARTED':            { ar: '🔄 بدء الارجاع', en: '🔄 Return Started' },
    'RECEIVED_FROM_CUSTOMER':    { ar: '📥 تم أستلام الشحنه من العميل', en: '📥 Received from Customer' },
    'DELIVERED_TO_VENDOR':       { ar: '📦 تم تسليم الشحنه للتاجر', en: '📦 Delivered to Vendor' },
    'EXCHANGE_COMPLETED':        { ar: '✨ تم أستبدال الشحنه بنجاح', en: '✨ Exchange Completed' },
    'IN_TRANSIT_TO_CUSTOMER':    { ar: '🚚 الشحنه فى طريقها للعميل', en: '🚚 In Transit to Customer' },
    'RETURN_COMPLETED_TO_CUSTOMER': { ar: '✅ تم أرجاع الشحنه للعميل بنجاح', en: '✅ Return Completed to Customer' },
    
    'RETURN_TO_SENDER_INITIATED':{ ar: '↩️ بدء الإرجاع', en: '↩️ Return Initiated' },
    'RETURNED_TO_SENDER':        { ar: '🔄 تم الإرجاع للمرسل', en: '🔄 Returned to Sender' },
};

interface AdminShippingProps {
    initialSearch?: string;
}

export const AdminShipping: React.FC<AdminShippingProps> = ({ initialSearch }) => {
    const { t, language } = useLanguage();
    const isAr = language === 'ar';
    const { shipments, isLoading: storeLoading, silentFetchShipments, updateShipmentInList } = useShipmentStore();
    const { currentAdmin } = useAdminStore();
    const [search, setSearch] = useState(initialSearch || '');
    const [selectedShipment, setSelectedShipment] = useState<Shipment | null>(null);
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

    // Sync search state when initialSearch changes from navigation
    useEffect(() => {
        setSearch(initialSearch || '');
    }, [initialSearch]);

    // Form inputs
    const [formCarrierType, setFormCarrierType] = useState('EXTERNAL');
    const [formCarrierName, setFormCarrierName] = useState('');
    const [formTrackingNumber, setFormTrackingNumber] = useState('');
    const [formStatus, setFormStatus] = useState('');
    const [formNotes, setFormNotes] = useState('');
    const [formTrackingLink, setFormTrackingLink] = useState('');
    const [formCustomsDelayNote, setFormCustomsDelayNote] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [logs, setLogs] = useState<ShipmentStatusLog[]>([]);
    const [view, setView] = useState<'list' | 'detail'>('list');

    useEffect(() => {
        if (shipments.length === 0 || initialSearch) {
            useShipmentStore.getState().fetchShipments();
        }
    }, [shipments.length, initialSearch]);

    // Sync effect: If the selected shipment is updated in the store (via realtime), update the local details view
    useEffect(() => {
        if (selectedShipment) {
            const updated = shipments.find(s => s.id === selectedShipment.id);
            if (updated && JSON.stringify(updated) !== JSON.stringify(selectedShipment)) {
                setSelectedShipment(updated);
            }
        }
    }, [shipments, selectedShipment]);

    // Deep-link from order details: filter by order id / number; open detail only if one batch
    useEffect(() => {
        if (!initialSearch || shipments.length === 0) return;

        const matches = shipments.filter((s) => shipmentMatchesQuery(s, initialSearch));
        setSearch(initialSearch);

        if (matches.length === 1) {
            const only = matches[0];
            setSelectedShipment(only);
            setView('detail');
            setFormCarrierType(only.carrierType);
            setFormCarrierName(only.carrierName || '');
            setFormTrackingNumber(only.trackingNumber || '');
            setFormTrackingLink(only.trackingLink || '');
            setFormStatus(only.status);
            setFormCustomsDelayNote(only.customsDelayNote || '');
            shipmentsApi.getLogs(only.id).then(setLogs).catch(() => setLogs([]));
        } else {
            setView('list');
        }
    }, [initialSearch, shipments]);

    const loadShipments = async () => {
        await silentFetchShipments();
    };

    const navigate = (path: string, id?: any) => {
        window.dispatchEvent(new CustomEvent('admin-nav', { detail: { path, id } }));
    };

    const handleSelectShipment = async (s: Shipment) => {
        // Update URL state via bubbling event
        navigate('shipping', s.id);
        
        setSelectedShipment(s);
        setView('detail');
        setFormCarrierType(s.carrierType);
        setFormCarrierName(s.carrierName || '');
        setFormTrackingNumber(s.trackingNumber || '');
        setFormTrackingLink(s.trackingLink || '');
        setFormStatus(s.status);
        setFormCustomsDelayNote(s.customsDelayNote || '');
        setFormNotes('');
        try {
            const history = await shipmentsApi.getLogs(s.id);
            setLogs(history || []);
        } catch (e) {
            console.error("Failed to fetch logs", e);
            setLogs([]);
        }
    };

    const handleBackToList = () => {
        navigate('shipping');
        setView('list');
        setSelectedShipment(null);
    };

    const handleSaveChanges = async () => {
        if (!selectedShipment) return;
        
        const previousShipment = { ...selectedShipment };
        const previousLogs = [...logs];
        
        // 1. Prepare Optimistic Data
        const optimisticUpdate: Partial<Shipment> = {
            status: formStatus,
            carrierName: formCarrierName,
            trackingNumber: formTrackingNumber,
            trackingLink: formTrackingLink,
            customsDelayNote: formCustomsDelayNote,
            updatedAt: new Date().toISOString()
        };

        const optimisticLog: ShipmentStatusLog = {
            id: 'temp-' + Date.now(),
            shipmentId: selectedShipment.id,
            fromStatus: selectedShipment.status,
            toStatus: formStatus,
            notes: formNotes || (isAr ? 'تحديث يدوي من الإدارة' : 'Manual update by admin'),
            source: currentAdmin?.name || 'Admin',
            createdAt: new Date().toISOString()
        };

        // 2. Apply Optimistically (Zero Latency)
        const updatedLocal = { ...selectedShipment, ...optimisticUpdate };
        setSelectedShipment(updatedLocal);
        updateShipmentInList(updatedLocal);
        setLogs([optimisticLog, ...logs]);
        setFormNotes('');
        
        setToast({
            message: isAr ? 'تم تحديث حالة الشحنة فورياً وإشعار العميل.' : 'Shipment updated immediately and customer notified.',
            type: 'success'
        });
        setTimeout(() => setToast(null), 4000);

        setIsSaving(true);
        try {
            const updated = await shipmentsApi.updateStatus(selectedShipment.id, {
                status: formStatus,
                notes: formNotes,
                customsDelayNote: formCustomsDelayNote,
                carrierName: formCarrierName,
                trackingNumber: formTrackingNumber,
                trackingLink: formTrackingLink
            });
            
            // Sync with server result (actual timestamps, IDs)
            setSelectedShipment(updated);
            updateShipmentInList(updated);
            const history = await shipmentsApi.getLogs(updated.id);
            setLogs(history || []);
        } catch (error: any) {
            console.error('Save error', error);
            // Rollback on failure
            setSelectedShipment(previousShipment);
            updateShipmentInList(previousShipment);
            setLogs(previousLogs);
            
            setToast({
                message: isAr ? 'فشل الاتصال، يرجى المحاولة لاحقاً.' : 'Connection failed, please try again later.',
                type: 'error'
            });
        } finally {
            setIsSaving(false);
        }
    };

    const filteredShipments = shipments.filter((s) => shipmentMatchesQuery(s, search));

    const getStatusIndex = (st: string) => shipmentStatuses.indexOf(st);

    if (view === 'detail' && selectedShipment) {
        return (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 relative">
                {/* Toast Notification System */}
                <AnimatePresence>
                    {toast && (
                        <motion.div
                            initial={{ opacity: 0, x: -50, scale: 0.9 }}
                            animate={{ opacity: 1, x: 0, scale: 1 }}
                            exit={{ opacity: 0, x: -20, scale: 0.9 }}
                            className="fixed bottom-6 left-6 z-[100] min-w-[320px]"
                        >
                            <GlassCard className={`p-4 border shadow-2xl flex items-center gap-4 ${
                                toast.type === 'success' 
                                    ? 'border-green-500/30 bg-green-500/10' 
                                    : 'border-red-500/30 bg-red-500/10'
                            }`}>
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                                    toast.type === 'success' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                                }`}>
                                    {toast.type === 'success' ? <CheckCircle2 size={20} /> : <XCircle size={20} />}
                                </div>
                                <div className="flex-1">
                                    <h4 className="text-white font-bold text-sm tracking-tight">
                                        {toast.type === 'success' ? (isAr ? 'تم بنجاح' : 'Success') : (isAr ? 'خطأ' : 'Error')}
                                    </h4>
                                    <p className="text-white/60 text-xs mt-0.5">{toast.message}</p>
                                </div>
                                <button onClick={() => setToast(null)} className="text-white/20 hover:text-white transition-colors">
                                    <XCircle size={16} />
                                </button>
                            </GlassCard>
                        </motion.div>
                    )}
                </AnimatePresence>
                <div className="flex items-center justify-between bg-[#1A1814] p-6 rounded-2xl border border-white/5 sticky top-0 z-30 shadow-xl">
                    <div className="flex items-center gap-4">
                        <button 
                            onClick={handleBackToList}
                            className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/50 hover:text-white transition-all group"
                        >
                            <ChevronRight size={20} className="rtl:rotate-0 rotate-180 group-hover:-translate-x-1 rtl:group-hover:translate-x-1 transition-transform" />
                        </button>
                        <div>
                            <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                <Truck className="text-purple-400" />
                                {isAr ? 'إدارة الشحنة التفصيلية' : 'Detailed Shipment Management'}
                            </h2>
                            <p className="text-white/50 text-sm flex flex-wrap items-center gap-2">
                                <Badge status={selectedShipment.status} />
                                <OrderCountdown updatedAt={selectedShipment.updatedAt} status={selectedShipment.status} />
                                <span className="font-mono">
                                    {(selectedShipment.order as any)?.orderNumber
                                        ? `#${(selectedShipment.order as any).orderNumber}`
                                        : selectedShipment.orderId.substring(0, 8)}
                                </span>
                                {selectedShipment.waybillNumber && (
                                    <span className="text-amber-400/90 text-xs font-mono">
                                        {selectedShipment.waybillNumber}
                                    </span>
                                )}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            onClick={() => navigate('admin-order-details', selectedShipment.orderId)}
                            className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/80 text-sm font-bold border border-white/10"
                        >
                            {isAr ? 'فتح الطلب' : 'Open Order'}
                        </button>
                        <button 
                             onClick={handleSaveChanges} 
                             disabled={isSaving}
                             className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-500 hover:to-purple-400 text-white font-bold transition-all shadow-lg flex items-center gap-2"
                        >
                             {isSaving ? <RefreshCcw className="animate-spin w-5 h-5"/> : <Save className="w-5 h-5"/>}
                             {isAr ? 'حفظ التغييرات' : 'Save Changes'}
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-3">
                        <GlassCard className="p-6 bg-[#1A1814] border-blue-500/20">
                            <h3 className="text-white font-bold mb-4 flex items-center gap-2">
                                <Package size={18} className="text-blue-400" />
                                {isAr ? 'محتوى هذه الشحنة' : 'This shipment contains'}
                            </h3>
                            <ShipmentBatchCard
                                batch={toBatchSummary(selectedShipment)}
                                orderNumber={(selectedShipment.order as any)?.orderNumber}
                                isAr={isAr}
                            />
                            {(selectedShipment.vehicleMake || selectedShipment.partDescription) && (
                                <div className="mt-4 pt-4 border-t border-white/10 grid md:grid-cols-2 gap-4 text-sm">
                                    {(selectedShipment.vehicleMake || selectedShipment.vehicleModel) && (
                                        <div>
                                            <span className="text-white/40 text-xs block mb-1">
                                                {isAr ? 'المركبة' : 'Vehicle'}
                                            </span>
                                            <span className="text-white font-bold">
                                                {selectedShipment.vehicleMake} {selectedShipment.vehicleModel}
                                            </span>
                                        </div>
                                    )}
                                    {selectedShipment.partDescription && (
                                        <div>
                                            <span className="text-white/40 text-xs block mb-1">
                                                {isAr ? 'وصف الدفعة' : 'Batch description'}
                                            </span>
                                            <span className="text-white/80">{selectedShipment.partDescription}</span>
                                        </div>
                                    )}
                                    {selectedShipment.waybillValue != null && (
                                        <div>
                                            <span className="text-white/40 text-xs block mb-1">
                                                {isAr ? 'قيمة البوليصة' : 'Waybill value'}
                                            </span>
                                            <span className="text-amber-400 font-mono font-bold">
                                                {selectedShipment.waybillValue.toLocaleString()} AED
                                            </span>
                                        </div>
                                    )}
                                </div>
                            )}
                        </GlassCard>
                    </div>

                    {/* Progress Column */}
                    <div className="lg:col-span-3">
                        <GlassCard className="p-0 overflow-hidden bg-[#1A1814]">
                            <div className="p-8 border-b border-white/5">
                                <h3 className="text-white font-black text-xs uppercase tracking-widest mb-8 flex items-center gap-2">
                                    <MapPin size={18} className="text-purple-400"/> 
                                    {isAr ? 'نظرة عامة على حالة الطلب' : 'Order Status Overview'}
                                </h3>
                                <StatusTimeline currentStatus={selectedShipment.status as any} />
                            </div>
                            
                            <div className="p-8 bg-black/20">
                                <ShipmentTracker status={selectedShipment.status} variant="admin" />
                            </div>
                        </GlassCard>
                    </div>

                    {/* Controls */}
                    <div className="lg:col-span-2 space-y-6">
                        <GlassCard className="p-6 bg-[#1A1814]">
                            <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2"><Settings2 size={18} className="text-blue-400"/> {isAr ? 'تحديث الحالة والخدمات' : 'Update Status & Services'}</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-xs text-white/40 font-bold uppercase mb-2 tracking-widest">{isAr ? 'الحالة المستهدفة' : 'Target Status'}</label>
                                        <select 
                                            value={formStatus} 
                                            onChange={(e) => setFormStatus(e.target.value)}
                                            className="w-full bg-[#151310] border border-white/10 rounded-xl px-4 py-4 text-white focus:border-purple-500 outline-none transition-all font-bold"
                                        >
                                            {shipmentStatuses.map(st => (
                                                <option key={st} value={st}>{statusTranslations[st]?.[isAr ? 'ar' : 'en'] || st}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs text-white/40 font-bold uppercase mb-2 tracking-widest">{isAr ? 'ملاحظة التحديث' : 'Update Note'}</label>
                                        <textarea 
                                            value={formNotes}
                                            onChange={e => setFormNotes(e.target.value)}
                                            placeholder={isAr ? 'اكتب ملاحظات للشحنة هنا...' : 'Write shipment notes here...'}
                                            className="w-full bg-[#151310] border border-white/10 rounded-xl px-4 py-4 text-white focus:border-purple-500 outline-none h-32 resize-none transition-all"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-4">
                                     <div>
                                        <label className="block text-xs text-white/40 font-bold uppercase mb-2 tracking-widest">{isAr ? 'رقم التتبع' : 'Tracking Number'}</label>
                                        <div className="relative">
                                            <FileText size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" />
                                            <input 
                                                type="text" 
                                                value={formTrackingNumber}
                                                onChange={e => setFormTrackingNumber(e.target.value)}
                                                placeholder="569619619"
                                                className="w-full bg-[#151310] border border-white/10 rounded-xl pl-11 pr-4 py-4 text-white font-mono focus:border-purple-500 outline-none transition-all"
                                            />
                                        </div>
                                    </div>
                                    
                                    <div>
                                        <label className="block text-xs text-white/40 font-bold uppercase mb-2 tracking-widest">{isAr ? 'رابط التتبع (اختياري)' : 'Tracking Link (Optional)'}</label>
                                        <div className="relative">
                                            <ExternalLink size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" />
                                            <input 
                                                type="text" 
                                                value={formTrackingLink}
                                                onChange={e => setFormTrackingLink(e.target.value)}
                                                placeholder="https://tracker.com/..."
                                                className="w-full bg-[#151310] border border-white/10 rounded-xl pl-11 pr-4 py-4 text-white font-mono text-xs focus:border-purple-500 outline-none transition-all"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs text-white/40 font-bold uppercase mb-2 tracking-widest">{isAr ? 'شركة الشحن' : 'Carrier'}</label>
                                        <div className="grid grid-cols-3 gap-2">
                                            {['ARAMEX', 'SMSA', 'SPL', 'DHL', 'FEDEX', 'OTHER'].map(c => (
                                                <button 
                                                    key={c}
                                                    onClick={() => setFormCarrierName(c === 'OTHER' ? '' : c)}
                                                    className={`py-2 px-1 rounded-lg text-[10px] font-bold border transition-all ${formCarrierName === c ? 'bg-purple-500/20 border-purple-500 text-purple-400 shadow-[0_0_15px_rgba(168,85,247,0.3)]' : 'bg-black/40 border-white/5 text-white/20 hover:text-white-40'}`}
                                                >
                                                    {c}
                                                </button>
                                            ))}
                                        </div>
                                        <input 
                                            type="text" 
                                            placeholder={isAr ? 'اسم شركة الشحن...' : 'Carrier name...'}
                                            value={formCarrierName}
                                            onChange={e => setFormCarrierName(e.target.value)}
                                            className="w-full bg-[#151310] border border-white/10 rounded-xl px-4 py-3 mt-3 text-white text-sm"
                                        />
                                    </div>
                                </div>
                            </div>
                        </GlassCard>

                        {/* Logs in Detail View */}
                        <GlassCard className="p-6 bg-[#1A1814]">
                            <h3 className="text-white font-bold mb-6 flex items-center gap-2">
                                <History size={18} className="text-orange-400"/> 
                                {isAr ? 'سجل تتبع الشحنة المفصل' : 'Detailed Shipment Audit Log'}
                            </h3>
                            <div className="overflow-x-auto rounded-xl border border-white/5">
                                <table className="w-full text-right text-sm">
                                    <thead className="bg-black/20 text-white/40 uppercase text-[10px] font-bold">
                                        <tr>
                                            <th className="p-4">{isAr ? 'التاريخ' : 'Date'}</th>
                                            <th className="p-4">{isAr ? 'من' : 'From'}</th>
                                            <th className="p-4">{isAr ? 'إلى' : 'To'}</th>
                                            <th className="p-4">{isAr ? 'بواسطة' : 'By'}</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {logs.map(log => (
                                            <tr key={log.id} className="hover:bg-white/5">
                                                <td className="p-4 text-white/60 font-mono text-xs">{new Date(log.createdAt).toLocaleString()}</td>
                                                <td className="p-4 text-white/40">{statusTranslations[log.fromStatus || '']?.[isAr?'ar':'en'] || '-'}</td>
                                                <td className="p-4 text-purple-400 font-bold">{statusTranslations[log.toStatus]?.[isAr?'ar':'en'] || log.toStatus}</td>
                                                <td className="p-4 text-white/60 font-bold">{log.source}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </GlassCard>
                    </div>

                    {/* Order Meta Column */}
                    <div className="space-y-6">
                        <GlassCard className="p-6 bg-gradient-to-b from-purple-500/10 to-transparent border-purple-500/20">
                            <h4 className="text-white font-bold mb-4 flex items-center gap-2"><Box size={16}/> {isAr ? 'ملخص الطلب' : 'Order Summary'}</h4>
                            <div className="space-y-4">
                                <div className="flex justify-between items-center py-2 border-b border-white/5">
                                    <span className="text-white/40 text-xs">{isAr ? 'رقم الطلب' : 'Order ID'}</span>
                                    <span className="text-white font-mono text-xs">#{(selectedShipment.order as any)?.orderNumber || selectedShipment.orderId.substring(0,8)}</span>
                                </div>
                                <div className="flex justify-between items-center py-2 border-b border-white/5">
                                    <span className="text-white/40 text-xs">{isAr ? 'العميل' : 'Customer'}</span>
                                    <span className="text-white font-bold text-xs">{(selectedShipment.order as any)?.customer?.name || 'Customer'}</span>
                                </div>
                                <div className="flex justify-between items-center py-2">
                                    <span className="text-white/40 text-xs">{isAr ? 'آخر تحديث' : 'Last Sync'}</span>
                                    <span className="text-white/40 text-[10px]">{new Date(selectedShipment.updatedAt).toLocaleTimeString()}</span>
                                </div>
                            </div>
                        </GlassCard>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 relative">
             {/* Toast Notification System */}
             <AnimatePresence>
                {toast && (
                    <motion.div
                        initial={{ opacity: 0, x: -50, scale: 0.9 }}
                        animate={{ opacity: 1, x: 0, scale: 1 }}
                        exit={{ opacity: 0, x: -20, scale: 0.9 }}
                        className="fixed bottom-6 left-6 z-[100] min-w-[320px]"
                    >
                        <GlassCard className={`p-4 border shadow-2xl flex items-center gap-4 ${
                            toast.type === 'success' 
                                ? 'border-green-500/30 bg-green-500/10' 
                                : 'border-red-500/30 bg-red-500/10'
                        }`}>
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                                toast.type === 'success' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                            }`}>
                                {toast.type === 'success' ? <CheckCircle2 size={20} /> : <XCircle size={20} />}
                            </div>
                            <div className="flex-1">
                                <h4 className="text-white font-bold text-sm tracking-tight">
                                    {toast.type === 'success' ? (isAr ? 'تم بنجاح' : 'Success') : (isAr ? 'خطأ' : 'Error')}
                                </h4>
                                <p className="text-white/60 text-xs mt-0.5">{toast.message}</p>
                            </div>
                            <button onClick={() => setToast(null)} className="text-white/20 hover:text-white transition-colors">
                                <XCircle size={16} />
                            </button>
                        </GlassCard>
                    </motion.div>
                )}
            </AnimatePresence>
            



            {/* Main Screen Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                        <Truck className="text-purple-500" />
                        {isAr ? 'إدارة التوصيل وشركات الشحن' : 'Shipping & Logistics Management'}
                    </h1>
                    <p className="text-white/50 text-sm mt-1">{isAr ? 'التحكم في حركة الشحنات للطلبات وإشعارات شركات الشحن' : 'Manage order operations and logistics tracking'}</p>
                </div>
                <div className="relative w-full md:w-auto">
                    <Search size={16} className="absolute top-1/2 -translate-y-1/2 left-3 text-white/30" />
                    <input 
                        type="text" 
                        placeholder={isAr ? "رقم الطلب، رقم التتبع..." : "Order ID, Tracking..."}
                        className="w-full bg-[#151310] border border-white/10 rounded-lg pl-9 pr-4 py-2.5 text-sm text-white focus:border-purple-500 outline-none md:w-64 transition-all"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
            </div>

            {initialSearch && filteredShipments.length > 1 && (
                <GlassCard className="p-4 border-blue-500/25 bg-blue-500/10">
                    <p className="text-sm text-blue-100 font-bold">
                        {isAr
                            ? `هذا الطلب له ${filteredShipments.length} دفعات شحن منفصلة — اختر الدفعة التي تريد إدارتها:`
                            : `This order has ${filteredShipments.length} separate shipment batches — select one to manage:`}
                    </p>
                </GlassCard>
            )}

            <GlassCard className="p-0 overflow-hidden bg-[#1A1814] border-white/5">
                <table className="w-full text-right" dir="rtl">
                    <thead className="bg-[#151310] text-xs text-white/40 uppercase font-bold tracking-wider border-b border-white/5">
                        <tr>
                            <th className="p-4 text-right w-[18%]">{isAr ? 'الشحنة / الطلب' : 'Shipment / Order'}</th>
                            <th className="p-4 text-right w-[22%]">{isAr ? 'القطع في الشحنة' : 'Batch contents'}</th>
                            <th className="p-4 text-right w-[15%]">{isAr ? 'شركة الشحن' : 'Carrier'}</th>
                            <th className="p-4 text-right w-[15%]">{isAr ? 'الحالة الحالية' : 'Current Status'}</th>
                            <th className="p-4 text-right w-[15%]">{isAr ? 'تاريخ التحديث' : 'Last Updated'}</th>
                            <th className="p-4 text-center w-[15%]">{isAr ? 'الإجراءات' : 'Actions'}</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 text-sm">
                        {filteredShipments.map(shipment => (
                            <tr key={shipment.id} className="hover:bg-white/[0.02] transition-colors group">
                                    <td className="p-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                                                <Package size={20} className="text-purple-400" />
                                            </div>
                                            <div>
                                                <div className="font-bold text-white mb-1">
                                                    {(shipment.order as any)?.orderNumber ? `#${(shipment.order as any).orderNumber}` : `Order #${shipment.orderId.substring(0,8)}`}
                                                </div>
                                                <div className="text-[10px] text-white/30 font-mono tracking-wider">
                                                    {shipment.waybillNumber || shipment.id.substring(0, 8).toUpperCase()}
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        {shipment.cartBatchSize && shipment.cartBatchSize > 1 ? (
                                            <span className="text-[10px] font-bold text-blue-300 block mb-1">
                                                {isAr
                                                    ? `مجمعة — ${shipment.cartBatchSize} قطع`
                                                    : `Grouped — ${shipment.cartBatchSize} parts`}
                                            </span>
                                        ) : null}
                                        <ul className="space-y-0.5">
                                            {(shipment.batchPartNames?.length
                                                ? shipment.batchPartNames
                                                : shipment.items?.map((i) => i.name) || []
                                            ).map((name) => (
                                                <li key={`${shipment.id}-${name}`} className="text-xs text-white/70 flex items-center gap-1">
                                                    <Box size={10} className="text-purple-400 shrink-0" />
                                                    {name}
                                                </li>
                                            ))}
                                        </ul>
                                        {!shipment.batchPartNames?.length && !shipment.items?.length && (
                                            <span className="text-white/30 text-xs">{isAr ? '—' : '—'}</span>
                                        )}
                                    </td>
                                <td className="p-4">
                                    <div className="font-bold text-white/90">{shipment.carrierName || '-'}</div>
                                    <div className="text-xs text-white/30 font-mono mt-0.5">{shipment.trackingNumber || '-'}</div>
                                </td>
                                <td className="p-4">
                                    <div className="flex flex-col gap-2 items-start shrink-0">
                                        <Badge status={shipment.status as StatusType} />
                                        <OrderCountdown updatedAt={shipment.updatedAt} status={shipment.status} />
                                    </div>
                                </td>
                                <td className="p-4 text-white/50 text-xs font-mono">
                                    {new Date(shipment.updatedAt).toLocaleString(isAr ? 'ar-EG' : 'en-US')}
                                </td>
                                <td className="p-4 text-center">
                                    <button 
                                        onClick={() => handleSelectShipment(shipment)}
                                        className="py-2 px-4 bg-purple-500/10 hover:bg-purple-600 text-purple-400 hover:text-white rounded-xl transition-all border border-purple-500/20 inline-flex items-center gap-2 text-[11px] font-bold shadow-lg shadow-purple-500/0 hover:shadow-purple-500/20"
                                    >
                                        <ExternalLink size={14} />
                                        {isAr ? 'إدارة الشحنة' : 'Manage'}
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {filteredShipments.length === 0 && (
                    <div className="p-16 text-center flex flex-col items-center">
                        <Truck size={48} className="text-white/10 mb-4" />
                        <h3 className="text-lg font-bold text-white mb-2">{isAr ? 'لا توجد شحنات نشطة' : 'No active shipments'}</h3>
                        <p className="text-white/40">{isAr ? 'لم يتم العثور على بيانات شحن حالياً.' : 'No shipping data found at the moment.'}</p>
                    </div>
                )}
            </GlassCard>
        </div>
    );
};
