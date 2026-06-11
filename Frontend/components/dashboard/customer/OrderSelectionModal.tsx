import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Package, Clock, ShieldAlert, ChevronDown, CheckCircle2, AlertTriangle, Zap } from 'lucide-react';
import { GlassCard } from '../../ui/GlassCard';
import { Button } from '../../ui/Button';
import { useOrderStore, Order } from '../../../stores/useOrderStore';
import { useLanguage } from '../../../contexts/LanguageContext';
import { OrderCountdown } from '../../ui/OrderCountdown';
import { POST_DELIVERY_RETURN_DISPUTE_HOURS } from '../../../utils/orderSla';

interface OrderSelectionModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (order: Order, type: 'return' | 'dispute', partId?: string) => void;
    mode: 'return' | 'dispute';
}

export const OrderSelectionModal: React.FC<OrderSelectionModalProps> = ({ isOpen, onClose, onSelect, mode }) => {
    const { orders, isLoading } = useOrderStore();
    const { t, language } = useLanguage();
    const isAr = language === 'ar';
    const [selectedParts, setSelectedParts] = useState<Record<string, string>>({});

    // Post-delivery return/dispute SLA (aligned with backend + countdown)
    const ELIGIBILITY_WINDOW_HOURS = POST_DELIVERY_RETURN_DISPUTE_HOURS;

    const eligibleOrders = orders.filter(order => {
        // Requirement: ONLY DELIVERED
        if (order.status !== 'DELIVERED' && order.status !== 'DELIVERED_TO_CUSTOMER') return false;
        
        const deliveredDate = order.deliveredAt ? new Date(order.deliveredAt) : new Date(order.updatedAt);
        const now = new Date();
        const diffHours = (now.getTime() - deliveredDate.getTime()) / (1000 * 60 * 60);
        
        return diffHours <= ELIGIBILITY_WINDOW_HOURS;
    });

    const handlePartSelect = (orderId: string, partId: string) => {
        setSelectedParts(prev => ({ ...prev, [orderId]: partId }));
    };

    const isActionDisabled = (order: Order) => {
        // If order has multiple parts, a selection is MANDATORY
        if (order.parts && order.parts.length > 1) {
            return !selectedParts[order.id];
        }
        return false;
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-6 overflow-hidden">
                    <motion.div 
                        initial={{ opacity: 0 }} 
                        animate={{ opacity: 1 }} 
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-[#050505]/95 backdrop-blur-sm"
                    />

                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="w-full max-w-2xl relative z-10"
                    >
                        <div className="bg-[#0A0A0A] border border-white/10 rounded-[40px] overflow-hidden shadow-[0_0_80px_rgba(0,0,0,0.9)]">
                            {/* Header */}
                            <div className="p-8 border-b border-white/5 flex items-center justify-between bg-white/[0.01]">
                                <div>
                                    <div className="flex items-center gap-3 mb-2">
                                        <div className={`px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-[0.2em] border
                                            ${mode === 'return' ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>
                                            <ShieldAlert size={12} className="inline mr-2" />
                                            {mode === 'return' ? (isAr ? 'بروتوكول الإرجاع' : 'Return Protocol') : (isAr ? 'بروتوكول النزاع' : 'Dispute Protocol')}
                                        </div>
                                    </div>
                                    <h2 className="text-3xl md:text-4xl font-black text-white uppercase tracking-tighter leading-none">
                                        {isAr ? 'اختيار الطلب المعني' : 'Select Target Order'}
                                    </h2>
                                </div>
                                <button 
                                    onClick={onClose}
                                    className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center hover:bg-white/10 hover:rotate-90 transition-all duration-500 border border-white/5"
                                >
                                    <X size={24} className="text-white/40" />
                                </button>
                            </div>

                            {/* List Content */}
                            <div className="max-h-[60vh] overflow-y-auto p-8 space-y-6 no-scrollbar">
                                {isLoading ? (
                                    <div className="py-20 flex flex-col items-center justify-center space-y-4">
                                        <div className="w-16 h-16 border-2 border-white/5 border-t-gold-500 rounded-full animate-spin shadow-[0_0_20px_rgba(212,175,55,0.2)]" />
                                        <span className="text-[10px] font-black uppercase tracking-[0.4em] text-white/20">Syncing Node...</span>
                                    </div>
                                ) : eligibleOrders.length === 0 ? (
                                    <div className="py-20 text-center space-y-10">
                                        <div className="w-24 h-24 bg-white/5 rounded-[35px] flex items-center justify-center mx-auto border border-white/10 relative group">
                                            <ShieldAlert size={48} className="text-white/10 group-hover:text-gold-500 transition-colors duration-700" />
                                            <div className="absolute inset-0 bg-gold-500/5 blur-3xl opacity-50" />
                                        </div>
                                        <div>
                                            <h3 className="text-2xl font-black text-white uppercase tracking-widest">{isAr ? 'لا توجد طلبات مؤهلة' : 'No Eligible Orders'}</h3>
                                            <p className="text-white/30 text-xs max-w-sm mx-auto mt-4 leading-relaxed font-bold uppercase tracking-widest">
                                                {isAr 
                                                    ? `تظهر هنا فقط الطلبات بحالة تم التسليم ضمن آخر ${ELIGIBILITY_WINDOW_HOURS} ساعة (نافذة الإرجاع/النزاع). للطلبات الأقدم يرجى التواصل مع الدعم.` 
                                                    : `Only orders in Delivered status within the last ${ELIGIBILITY_WINDOW_HOURS} hours are eligible for return or dispute. For older orders, contact support.`}
                                            </p>
                                        </div>
                                        <button 
                                            onClick={onClose}
                                            className="px-8 py-4 bg-white/5 border border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest text-white/40 hover:text-white hover:bg-white/10 transition-all"
                                        >
                                            {isAr ? 'فهمت، إغلاق' : 'Understood, Close'}
                                        </button>
                                    </div>
                                ) : (
                                    eligibleOrders.map((order, idx) => (
                                        <motion.div
                                            key={order.id}
                                            initial={{ opacity: 0, x: -20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: idx * 0.1 }}
                                            className="group bg-[#0D0D0C] border border-white/5 rounded-[32px] p-8 hover:border-gold-500/20 transition-all relative overflow-hidden"
                                        >
                                            <div className="flex flex-col gap-8 relative z-10">
                                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                                                    <div className="flex gap-6 items-center">
                                                        <div className="w-20 h-20 bg-white/5 rounded-[24px] flex items-center justify-center border border-white/10 text-white/20 group-hover:text-gold-500 group-hover:scale-110 transition-all duration-700 shadow-2xl shrink-0">
                                                            <Package size={40} strokeWidth={1} />
                                                        </div>
                                                        <div className="space-y-2">
                                                            <div className="flex items-center gap-3">
                                                                <span className="text-[11px] font-black text-gold-500/80 uppercase tracking-widest">#{order.orderNumber}</span>
                                                                <div className="px-3 py-1 bg-green-500/10 text-green-400 text-[9px] font-black rounded-full border border-green-500/20 uppercase tracking-tighter">Status: Delivered</div>
                                                            </div>
                                                            <h4 className="text-2xl font-black text-white group-hover:text-gold-400 transition-colors uppercase leading-none truncate max-w-[200px]">{order.part}</h4>
                                                            <div className="flex items-center gap-2">
                                                                <Clock size={12} className="text-white/20" />
                                                                <span className="text-[9px] font-black text-white/20 uppercase tracking-widest">
                                                                    {new Date(order.deliveredAt || order.updatedAt).toLocaleString(isAr ? 'ar-EG' : 'en-GB')}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="flex flex-col items-end gap-3 self-center">
                                                        <OrderCountdown 
                                                            deliveredAt={order.deliveredAt || order.updatedAt} 
                                                            compact
                                                        />
                                                    </div>
                                                </div>

                                                {/* Multi-Part Selection Logic: MANDATORY */}
                                                {order.parts && order.parts.length > 1 && (
                                                    <div className="pt-6 border-t border-white/5 space-y-4">
                                                        <div className="flex items-center gap-3 text-[10px] font-black text-white/40 uppercase tracking-widest">
                                                            <Zap size={14} className="text-gold-500 animate-pulse" />
                                                            {isAr ? 'اختر القطعة المتضررة (إلزامي):' : 'Select Target Part (Mandatory):'}
                                                        </div>
                                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                            {order.parts.map(p => (
                                                                <button
                                                                    key={p.id}
                                                                    onClick={() => handlePartSelect(order.id, p.id)}
                                                                    className={`px-5 py-4 rounded-2xl text-[11px] font-black text-left transition-all border relative overflow-hidden group/part
                                                                        ${selectedParts[order.id] === p.id 
                                                                            ? 'bg-gold-500/10 text-gold-500 border-gold-500 shadow-[0_0_20px_rgba(212,175,55,0.2)]' 
                                                                            : 'bg-white/5 text-white/40 border-white/5 hover:bg-white/10 hover:text-white/60'}`}
                                                                >
                                                                    <div className="flex items-center justify-between relative z-10">
                                                                        <span className="truncate pr-4">{p.name}</span>
                                                                        {selectedParts[order.id] === p.id && <CheckCircle2 size={16} />}
                                                                    </div>
                                                                    {selectedParts[order.id] === p.id && (
                                                                        <motion.div 
                                                                            layoutId={`glow-${order.id}`}
                                                                            className="absolute inset-0 bg-gold-500/5 blur-xl pointer-events-none"
                                                                        />
                                                                    )}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}

                                                <div className="flex flex-col sm:flex-row items-center justify-between gap-6 pt-6 border-t border-white/5">
                                                    <div className="flex items-center gap-2 text-[10px] font-black text-white/20 uppercase tracking-[0.2em]">
                                                        <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]" />
                                                        Escrow Safe Protocol
                                                    </div>
                                                    
                                                    <button 
                                                        onClick={() => onSelect(order, mode, selectedParts[order.id])}
                                                        disabled={isActionDisabled(order)}
                                                        className={`w-full sm:w-auto px-10 py-4 rounded-2xl text-[12px] font-black uppercase tracking-widest transition-all active:scale-95 disabled:opacity-20 disabled:cursor-not-allowed disabled:grayscale
                                                            ${mode === 'return' 
                                                                ? 'bg-cyan-500 text-black hover:shadow-[0_0_30px_rgba(6,182,212,0.4)]' 
                                                                : 'bg-red-500 text-white hover:shadow-[0_0_30px_rgba(239,68,68,0.4)]'}`}
                                                    >
                                                        {mode === 'return' 
                                                            ? (isAr ? 'فتح بروتوكول الإرجاع' : 'Open Return Protocol') 
                                                            : (isAr ? 'فتح نزاع رسمي' : 'Open Formal Dispute')}
                                                    </button>
                                                </div>
                                            </div>
                                            
                                            {/* Luxury Grid Decoration */}
                                            <div className="absolute top-0 right-0 w-64 h-64 bg-white/[0.01] -translate-y-1/2 translate-x-1/2 rounded-full blur-3xl pointer-events-none transition-all group-hover:bg-gold-500/[0.03]" />
                                        </motion.div>
                                    ))
                                )}
                            </div>

                            {/* Safety Footer */}
                            <div className="p-8 bg-white/[0.01] border-t border-white/5">
                                <div className="flex gap-6 items-start">
                                    <div className="w-14 h-14 bg-gold-500/10 rounded-[20px] flex items-center justify-center border border-gold-500/20 shrink-0">
                                        <CheckCircle2 size={28} className="text-gold-500" />
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-[11px] text-white font-black uppercase tracking-widest leading-none">Escrow Asset Security</p>
                                        <p className="text-[10px] text-white/30 font-bold uppercase leading-relaxed tracking-wider">
                                            {isAr 
                                                ? 'عند بدء الطلب، يتم تجميد أموالك في خزانة آمنة تماماً. يمنع المتجر من سحب التسييل حتى يتم حل القضية بشكل نهائي وعادل.' 
                                                : 'Upon initiation, your funds are frozen in a high-security vault. The merchant is blocked from withdrawal until a final/fair resolution is reached.'}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
            <style>{`
                .no-scrollbar::-webkit-scrollbar { display: none; }
                .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
            `}</style>
        </AnimatePresence>
    );
};
