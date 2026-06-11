
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Clock, Package, AlertCircle, ExternalLink, ChevronDown } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { Order, OrderOffer } from '../../stores/useOrderStore';

interface WarrantyProtectionCardProps {
    order: Order;
    onClaim?: (partId?: string) => void;
    variant?: 'full' | 'compact';
    role?: 'customer' | 'admin' | 'merchant';
}

// Optimized with React.memo for 2026 performance standards
export const WarrantyProtectionCard: React.FC<WarrantyProtectionCardProps> = React.memo(({ order, onClaim, variant = 'full', role = 'customer' }) => {
    const { t, language } = useLanguage();
    const isAr = language === 'ar';
    const wt = t.warranty; // New warranty translations added in Phase 2
    
    const [timeLeft, setTimeLeft] = useState<{ d: number, h: number, m: number, s: number } | null>(null);
    const [isExpired, setIsExpired] = useState(false);
    
    // Find parts with warranty - Robust detection (Phase 3 Polish)
    const warrantyParts = React.useMemo(() => {
        const partsFromOffers = order.offers?.filter(o => 
            o.status === 'accepted' && (o.hasWarranty || o.has_warranty || o.warranty)
        ) || [];
        
        // Fallback to order.parts if offers are empty or missing warranty info
        if (partsFromOffers.length === 0 && order.parts) {
            return order.parts.map(p => ({
                id: p.id,
                merchantName: p.merchantName || order.merchantName || 'Vendor',
                warranty: p.warrantyDuration || p.warranty || order.acceptedOffer?.warranty,
                hasWarranty: true,
                status: 'accepted'
            }));
        }
        return partsFromOffers;
    }, [order.offers, order.parts]);
    
    // Auto-expand if parts exist
    const [isExpanded, setIsExpanded] = useState(warrantyParts.length > 0);

    useEffect(() => {
        if (!order.warranty_end_at) return;

        const target = new Date(order.warranty_end_at!).getTime();

        const calculate = () => {
            const now = Date.now();
            const diff = target - now;

            if (diff <= 0) {
                setTimeLeft(null);
                setIsExpired(true);
            } else {
                const d = Math.floor(diff / (1000 * 60 * 60 * 24));
                const h = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
                const s = Math.floor((diff % (1000 * 60)) / 1000);
                
                // Only update if time parts changed to save CPU
                setTimeLeft(prev => {
                    if (prev?.s === s && prev?.m === m && prev?.h === h && prev?.d === d) return prev;
                    return { d, h, m, s };
                });
                setIsExpired(false);
            }
        };

        calculate();
        const interval = setInterval(calculate, 1000);
        return () => clearInterval(interval);
    }, [order.warranty_end_at]);

    // Helper to calculate expiration for individual parts - Master Sync Logic 2026
    const calculatePartExpiry = (durationStr: string) => {
        if (!order.warranty_end_at || !durationStr) return null;
        
        const mainExpiry = new Date(order.warranty_end_at).getTime();
        
        const parseToMs = (str: string) => {
            const d = str.toLowerCase().trim();
            const n = parseInt(d.match(/\d+/)?.[0] || '0');
            if (n === 0) return 0;
            if (d.includes('year')) return n * 365 * 24 * 60 * 60 * 1000;
            if (d.includes('month')) return n * 30 * 24 * 60 * 60 * 1000;
            return n * 24 * 60 * 60 * 1000;
        };

        const thisDurationMs = parseToMs(durationStr);
        if (thisDurationMs === 0) return mainExpiry;

        // Find the maximum duration among all parts to identify the "Master" parts
        const durations = (order.offers?.filter(o => o.status === 'accepted' && o.hasWarranty) || [])
            .map(o => parseToMs(o.warranty || ''));
        const maxDurationMs = Math.max(...durations, 0);

        // If this part is the one (or one of the ones) defining the order's warranty,
        // force it to match the main expiry perfectly.
        if (thisDurationMs >= maxDurationMs) {
            return mainExpiry;
        }

        // For shorter warranties, calculate them relative to the main expiry
        // (This is a safety fallback, but most often they will match)
        const activeAt = order.warranty_active_at ? new Date(order.warranty_active_at).getTime() : (mainExpiry - maxDurationMs);
        return activeAt + thisDurationMs;
    };

    const isPartExpired = (durationStr: string) => {
        const expiry = calculatePartExpiry(durationStr);
        if (!expiry) return false;
        return new Date().getTime() > expiry;
    };

    if (variant === 'compact') {
        return (
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border backdrop-blur-md transition-all ${
                isExpired 
                ? 'bg-white/5 border-white/10 text-white/30' 
                : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.1)]'
            }`}>
                <Shield size={12} className={!isExpired ? 'animate-pulse' : ''} />
                <span className="text-[10px] font-black font-mono tracking-tighter">
                    {isExpired 
                        ? (isAr ? 'منتهي' : 'EXPIRED') 
                        : timeLeft ? `${timeLeft.d}d ${timeLeft.h}h ${timeLeft.m}m` : '...'
                    }
                </span>
            </div>
        );
    }

    return (
        <GlassCard className={`p-0 overflow-hidden relative border-white/5 transition-all duration-500 ${isExpired ? 'opacity-70' : 'shadow-[0_0_40px_rgba(16,185,129,0.05)]'}`}>
            {/* Background Glow */}
            {!isExpired && <div className="absolute -top-24 -right-24 w-48 h-48 bg-emerald-500/20 blur-[80px] rounded-full pointer-events-none" />}
            {!isExpired && <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-gold-500/10 blur-[80px] rounded-full pointer-events-none" />}

            <div className="p-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex items-center gap-5">
                        <div className={`w-16 h-16 rounded-2xl flex items-center justify-center relative group ${
                            isExpired ? 'bg-white/5 border border-white/10' : 'bg-emerald-500/10 border border-emerald-500/20'
                        }`}>
                            <Shield size={32} className={`${isExpired ? 'text-white/20' : 'text-emerald-400 animate-pulse'}`} />
                            {!isExpired && <div className="absolute inset-0 bg-emerald-400 blur-xl opacity-20 animate-pulse" />}
                        </div>
                        <div>
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 mb-1 block">
                                {isAr ? 'حماية الضمان النشطة' : 'ACTIVE WARRANTY PROTECTION'}
                            </span>
                            <h3 className={`text-xl font-black ${isExpired ? 'text-white/40' : 'text-white'}`}>
                                {isAr ? 'ضمان إتـشـلـيـح 2026' : 'E-TASHLEH WARRANTY 2026'}
                            </h3>
                            <div className="flex items-center gap-2 mt-1">
                                <span className={`text-xs font-bold ${isExpired ? 'text-red-400' : 'text-emerald-400'}`}>
                                    {isExpired ? (isAr ? 'فترة الضمان انتهت' : 'Warranty period has ended') : (isAr ? 'طلبك محمي بالكامل' : 'Your order is fully protected')}
                                </span>
                                <div className={`w-1 h-1 rounded-full ${isExpired ? 'bg-red-500' : 'bg-emerald-500 animate-ping'}`} />
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col items-center md:items-end gap-2">
                        {timeLeft && !isExpired ? (
                            <div className="flex items-center gap-3">
                                <div className="flex flex-col items-center min-w-[40px]">
                                    <span className="text-2xl font-black text-white leading-none">{timeLeft.d}</span>
                                    <span className="text-[8px] font-black text-white/40 uppercase mt-1">{isAr ? 'يوم' : 'DAYS'}</span>
                                </div>
                                <span className="text-xl font-black text-white/20">:</span>
                                <div className="flex flex-col items-center min-w-[40px]">
                                    <span className="text-2xl font-black text-white leading-none">{timeLeft.h}</span>
                                    <span className="text-[8px] font-black text-white/40 uppercase mt-1">{isAr ? 'ساعة' : 'HRS'}</span>
                                </div>
                                <span className="text-xl font-black text-white/20">:</span>
                                <div className="flex flex-col items-center min-w-[40px]">
                                    <span className="text-2xl font-black text-white leading-none">{timeLeft.m}</span>
                                    <span className="text-[8px] font-black text-white/40 uppercase mt-1">{isAr ? 'دقيقة' : 'MIN'}</span>
                                </div>
                                <span className="text-xl font-black text-white/20">:</span>
                                <div className="flex flex-col items-center min-w-[40px]">
                                    <span className="text-2xl font-black text-emerald-400 leading-none animate-pulse">{timeLeft.s}</span>
                                    <span className="text-[8px] font-black text-white/40 uppercase mt-1">{isAr ? 'ثانية' : 'SEC'}</span>
                                </div>
                            </div>
                        ) : (
                            <div className="px-4 py-2 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-2 text-red-500">
                                <AlertCircle size={16} />
                                <span className="text-sm font-black uppercase tracking-wider">{isAr ? 'الضمان منتهي' : 'WARRANTY EXPIRED'}</span>
                            </div>
                        )}
                        <span className="text-[10px] font-bold text-white/30 uppercase tracking-widest">
                            {isAr ? 'متبقي على انتهاء الحماية' : 'REMAINING UNTIL EXPIRATION'}
                        </span>
                    </div>
                </div>

                {/* Parts under warranty section */}
                {warrantyParts.length > 0 && (
                    <div className="mt-8 pt-6 border-t border-white/5">
                        <button 
                            onClick={() => setIsExpanded(!isExpanded)}
                            className="flex items-center justify-between w-full group"
                        >
                            <div className="flex items-center gap-2 text-white/60 group-hover:text-white transition-colors">
                                <Package size={16} />
                                <span className="text-xs font-bold uppercase tracking-widest">
                                    {isAr ? `القطع المشمولة بالضمان (${warrantyParts.length})` : `PARTS UNDER WARRANTY (${warrantyParts.length})`}
                                </span>
                            </div>
                            <ChevronDown size={18} className={`text-white/20 group-hover:text-white transition-all duration-300 ${isExpanded ? 'rotate-180' : ''}`} />
                        </button>

                        <AnimatePresence>
                            {isExpanded && (
                                <motion.div 
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    className="overflow-hidden"
                                >
                                    <div className="grid gap-3 mt-4">
                                        {warrantyParts.map((o, idx) => {
                                            const partExpiry = calculatePartExpiry(o.warranty || '');
                                            const expired = partExpiry ? new Date().getTime() > partExpiry : isExpired;
                                            
                                            // Precise day calculation synchronized with main counter using Floor to match big timer
                                            const timeLeftDays = partExpiry 
                                                ? Math.max(0, Math.floor((partExpiry - new Date().getTime()) / (1000 * 60 * 60 * 24))) 
                                                : 0;

                                            return (
                                                <div key={idx} className={`p-4 bg-white/[0.03] border rounded-xl flex items-center justify-between group transition-all ${
                                                    expired ? 'border-white/5 opacity-50' : 'border-emerald-500/10 hover:bg-white/[0.05] hover:border-emerald-500/30'
                                                }`}>
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 rounded-lg bg-black/40 flex items-center justify-center border border-white/5 group-hover:border-emerald-500/30 transition-colors">
                                                            {o.offerImage ? (
                                                                <img src={o.offerImage} className="w-full h-full object-cover rounded-lg" alt={o.merchantName} />
                                                            ) : (
                                                                <Package size={18} className="text-white/20" />
                                                            )}
                                                        </div>
                                                        <div>
                                                            <p className="text-sm font-bold text-white group-hover:text-emerald-400 transition-colors">{o.merchantName}</p>
                                                            <div className="flex items-center gap-2">
                                                                <p className="text-[10px] text-white/40 uppercase font-black">{o.warranty || (isAr ? 'ضمان المتجر' : 'STORE WARRANTY')}</p>
                                                                <span className="text-white/20 text-[10px]">•</span>
                                                                <span className={`text-[10px] font-black uppercase tracking-wider ${expired ? 'text-red-400' : 'text-emerald-400'}`}>
                                                                    {expired 
                                                                        ? (isAr ? 'حماية منتهية' : 'PROTECTION EXPIRED') 
                                                                        : (isAr ? `متبقي ${timeLeftDays} يوم حماية` : `${timeLeftDays}D PROTECTION LEFT`)
                                                                    }
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    {role === 'customer' && !expired && (
                                                        <button 
                                                            onClick={(e) => { 
                                                                e.stopPropagation(); 
                                                                onClaim?.(o.id); // Pass the specific part/offer ID
                                                            }}
                                                            className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-black text-[10px] font-black rounded-lg transition-all active:scale-95 shadow-lg shadow-emerald-500/20 will-change-transform"
                                                        >
                                                            {isAr ? 'طلب استبدال' : 'REPLACE PART'}
                                                        </button>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                )}
            </div>

            {/* Bottom Disclaimer */}
            <div className="px-6 py-3 bg-black/20 border-t border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-2 text-[9px] text-white/30 uppercase font-black tracking-widest">
                    <AlertCircle size={10} />
                    {isAr ? 'تطبق الشروط والأحكام الخاصة بحماية 2026' : 'TERMS & CONDITIONS OF 2026 PROTECTION APPLY'}
                </div>
                <a href="#" className="text-[9px] text-emerald-400 font-black flex items-center gap-1 hover:underline">
                    {isAr ? 'سياسة الضمان' : 'WARRANTY POLICY'}
                    <ExternalLink size={10} />
                </a>
            </div>
        </GlassCard>
    );
});

const GlassCard: React.FC<{ children: React.ReactNode, className?: string }> = ({ children, className = '' }) => (
    <div className={`bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl ${className}`}>
        {children}
    </div>
);
