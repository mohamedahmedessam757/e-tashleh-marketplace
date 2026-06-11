
import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { Truck, RefreshCcw, AlertCircle } from 'lucide-react';
import { ShipmentCard } from './ShipmentCard';
import { useLanguage } from '../../../contexts/LanguageContext';
import { useShipmentsStore } from '../../../stores/useShipmentsStore';

export const ShipmentsPage: React.FC<{ onNavigate?: (path: string, id?: any) => void }> = ({ onNavigate }) => {
    const { t, language } = useLanguage();
    const isAr = language === 'ar';

    const { shipments, loading, error, fetchShipments, startRealtime, stopRealtime } = useShipmentsStore();

    useEffect(() => {
        fetchShipments();
        startRealtime();
        return () => {
            stopRealtime();
        };
    }, [fetchShipments, startRealtime, stopRealtime]);

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                        <Truck className="text-purple-400" size={32} />
                        {t.dashboard.menu.shipments}
                    </h1>
                    <p className="text-white/50 mt-2">{t.dashboard.shipments?.subtitle || (isAr ? 'تتبع شحناتك ومعرفة موقعها الحالي' : 'Track your shipments and their current status')}</p>
                </div>
                <button 
                    onClick={fetchShipments} 
                    disabled={loading}
                    className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/50 hover:text-white transition-all"
                    title={isAr ? 'تحديث' : 'Refresh'}
                >
                    <RefreshCcw size={18} className={loading ? 'animate-spin text-purple-400' : ''} />
                </button>
            </div>

            {/* Error State */}
            {error && (
                <div className="flex items-center gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400">
                    <AlertCircle size={20} />
                    <span className="text-sm">{isAr ? 'حدث خطأ في تحميل البيانات' : 'Error loading shipment data'}</span>
                </div>
            )}

            {/* Loading State */}
            {loading && (
                <div className="space-y-4">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="h-32 rounded-2xl bg-white/5 border border-white/5 animate-pulse" />
                    ))}
                </div>
            )}

            {/* List */}
            {!loading && (
                <div className="space-y-4">
                    {shipments.map((shipment, index) => (
                        <motion.div
                            key={shipment.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.1 }}
                        >
                            <ShipmentCard shipment={shipment} onNavigate={onNavigate} />
                        </motion.div>
                    ))}

                    {shipments.length === 0 && !error && (
                        <div className="text-center py-20 bg-white/5 rounded-2xl border border-white/5">
                            <Truck className="mx-auto text-white/20 mb-4" size={48} />
                            <h3 className="text-xl font-bold text-white/50 mb-2">{t.dashboard.shipments?.noShipments || (isAr ? 'لا توجد شحنات' : 'No Shipments Yet')}</h3>
                            <p className="text-white/30 text-sm">{isAr ? 'ستظهر شحناتك هنا بعد اكتمال الطلب ومراجعة الأدمن.' : 'Your shipments will appear here after order processing is complete.'}</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};
