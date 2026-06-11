import React, { useState } from 'react';
import { GlassCard } from '../../ui/GlassCard';
import { Box, MapPin, Package, ChevronDown, ChevronUp, ArrowRight, Eye } from 'lucide-react';
import { useLanguage } from '../../../contexts/LanguageContext';
import { ShipmentTracker, statusTranslations } from './ShipmentTracker';
import { AnimatePresence, motion } from 'framer-motion';
import { Shipment } from '../../../stores/useShipmentsStore';
import { Badge, StatusType } from '../../ui/Badge';

interface ShipmentCardProps {
    shipment: Shipment;
    onNavigate?: (path: string, id?: any) => void;
}

export const ShipmentCard: React.FC<ShipmentCardProps> = ({ shipment, onNavigate }) => {
    const { t, language } = useLanguage();
    const isAr = language === 'ar';
    const [expanded, setExpanded] = useState(false);

    return (
        <GlassCard className="relative overflow-hidden group">
            {/* Header Row */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                {/* Info & Status Group */}
                <div className="flex flex-col md:flex-row md:items-center gap-4 min-w-0 flex-1">
                    {/* ID & Carrier */}
                    <div className="flex items-center gap-4 min-w-0">
                        <div className="w-12 h-12 bg-white/5 rounded-xl flex items-center justify-center border border-white/10 shrink-0">
                            <Box className="text-gold-500" />
                        </div>
                        <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                                <h3 className="text-lg font-bold text-white font-mono">{shipment.trackingNumber?.toUpperCase()}</h3>
                                <span className="px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-[10px] font-bold text-gold-500/80 uppercase tracking-wider">
                                    {t.dashboard.shipments.orderNo} #{shipment.orderNumber}
                                </span>
                            </div>
                            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 mt-0.5">
                                <p className="text-sm text-white/50 font-medium">{shipment.carrier || 'Tashleh Carrier'}</p>
                                <span className="hidden sm:block w-1 h-1 rounded-full bg-white/20" />
                                <p className="text-xs text-gold-500/60 font-medium truncate max-w-[250px]">
                                    {shipment.vehicleMake} {shipment.vehicleModel} — {shipment.partName}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Status Badge - Now using the enhanced Badge component */}
                    <div className="flex items-center shrink-0">
                        <Badge status={shipment.status as StatusType} />
                    </div>
                </div>

                {/* Actions Group */}
                <div className="flex items-center justify-end gap-2 shrink-0">

                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => onNavigate?.('shipment-details', shipment.id)}
                            className="p-2.5 rounded-xl bg-white/5 hover:bg-gold-500/10 text-white/50 hover:text-gold-400 border border-white/5 hover:border-gold-500/20 transition-all flex items-center gap-2 group/eye"
                            title={isAr ? 'عرض التفاصيل' : 'View Details'}
                        >
                            <Eye size={18} className="group-hover/eye:scale-110 transition-transform" />
                        </button>

                        <button
                            onClick={() => setExpanded(!expanded)}
                            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-gold-400 hover:text-gold-300 transition-all text-sm font-bold border border-white/5"
                        >
                            {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </button>
                    </div>
                </div>
            </div>

            {/* Expanded Details */}
            <AnimatePresence>
                {expanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                    >
                        <div className="pt-6 mt-6 border-t border-white/5 space-y-8">

                            {/* Visual 12-Step Tracker */}
                            <ShipmentTracker status={shipment.status} />

                            {/* Info Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 bg-white/5 rounded-xl border border-white/5">
                                <div className="space-y-4">
                                    <h4 className="text-sm font-medium text-white/70 flex items-center gap-2">
                                        <MapPin size={16} className="text-gold-500" />
                                        {t.dashboard.shipments.routeDetails}
                                    </h4>
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-white/40">{shipment.origin}</span>
                                        <ArrowRight size={14} className="text-white/20" />
                                        <span className="text-white/40">{shipment.destination}</span>
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    <h4 className="text-sm font-medium text-white/70 flex items-center gap-2">
                                        <Package size={16} className="text-gold-500" />
                                        {t.dashboard.shipments.items}
                                    </h4>
                                    <div className="space-y-2">
                                        {shipment.items.map((item, idx) => (
                                            <div key={idx} className="flex justify-between text-sm">
                                                <span className="text-white/60 text-left">{item.name}</span>
                                                <span className="text-white/30 whitespace-nowrap ml-4">x{item.quantity}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </GlassCard>
    );
};
