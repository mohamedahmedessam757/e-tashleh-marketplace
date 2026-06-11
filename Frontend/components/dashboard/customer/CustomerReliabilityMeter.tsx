
import React from 'react';
import { motion } from 'framer-motion';
import { GlassCard } from '../../ui/GlassCard';
import { useLanguage } from '../../../contexts/LanguageContext';
import { useProfileStore } from '../../../stores/useProfileStore';
import { ShieldCheck, ShieldAlert, TrendingDown, Info, CheckCircle2, AlertCircle } from 'lucide-react';

export const CustomerReliabilityMeter: React.FC = () => {
    const { t, language } = useLanguage();
    const { user } = useProfileStore();
    const isAr = language === 'ar';

    const returnRate = user?.cachedReturnRate || 0;
    const reliability = Math.max(0, 100 - (returnRate * 100));
    const score = user?.violationScore || 0;
    
    // Determine status level
    let statusKey: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR' = 'EXCELLENT';
    let statusColor = 'text-green-400';
    let strokeColor = '#4ADE80';

    if (returnRate > 0.15 || score >= 50) {
        statusKey = 'POOR';
        statusColor = 'text-red-500';
        strokeColor = '#EF4444';
    } else if (returnRate > 0.10 || score >= 30) {
        statusKey = 'FAIR';
        statusColor = 'text-orange-400';
        strokeColor = '#FB923C';
    } else if (returnRate > 0.05 || score >= 10) {
        statusKey = 'GOOD';
        statusColor = 'text-blue-400';
        strokeColor = '#60A5FA';
    }

    const loc = (t.dashboard as any).dashboardHome.reliability;

    return (
        <GlassCard className="p-6 md:p-8 border-white/5 relative overflow-hidden h-full flex flex-col group">
            {/* Background Decorative Gradient */}
            <div className={`absolute -right-20 -bottom-20 w-64 h-64 opacity-10 blur-[80px] rounded-full pointer-events-none transition-colors duration-1000 ${
                statusKey === 'POOR' ? 'bg-red-500' : statusKey === 'FAIR' ? 'bg-orange-500' : 'bg-green-500'
            }`} />

            <div className="flex justify-between items-start mb-8 relative z-10">
                <div>
                    <h3 className="text-xl font-black text-white uppercase italic tracking-tight flex items-center gap-2">
                        <ShieldCheck className={statusColor} size={24} />
                        {loc.title}
                    </h3>
                    <p className="text-[10px] text-white/40 font-bold tracking-widest uppercase mt-1">2026 Trust Protocol v2.4</p>
                </div>
                <div className={`px-4 py-1.5 rounded-xl border ${statusColor.replace('text-', 'bg-').replace('400', '500/10')} ${statusColor.replace('text-', 'border-').replace('400', '500/20')} transition-all`}>
                    <span className={`text-[10px] font-black uppercase tracking-widest ${statusColor}`}>{loc.status[statusKey]}</span>
                </div>
            </div>

            <div className="flex-1 flex flex-col md:flex-row items-center gap-10 relative z-10">
                {/* SVG Gauge */}
                <div className="relative w-40 h-40 shrink-0">
                    <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                        {/* Background Track */}
                        <circle
                            cx="50" cy="50" r="45"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="8"
                            className="text-white/5"
                        />
                        {/* Progress Bar */}
                        <motion.circle
                            cx="50" cy="50" r="45"
                            fill="none"
                            stroke={strokeColor}
                            strokeWidth="8"
                            strokeLinecap="round"
                            strokeDasharray="283"
                            initial={{ strokeDashoffset: 283 }}
                            animate={{ strokeDashoffset: 283 - (283 * reliability) / 100 }}
                            transition={{ duration: 1.5, ease: "easeOut" }}
                            style={{ filter: `drop-shadow(0 0 8px ${strokeColor}40)` }}
                        />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <motion.span 
                            initial={{ opacity: 0, scale: 0.5 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="text-3xl font-black text-white font-mono"
                        >
                            {Math.round(reliability)}%
                        </motion.span>
                        <span className="text-[8px] text-white/30 font-black uppercase tracking-widest">{loc.score}</span>
                    </div>
                </div>

                {/* Stats & Details */}
                <div className="w-full space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 bg-white/5 rounded-2xl border border-white/5 hover:border-white/10 transition-colors">
                            <div className="text-[9px] text-white/30 font-black uppercase tracking-widest mb-1">{loc.deliveredOrders}</div>
                            <div className="text-xl font-black text-white font-mono">{user?.totalDeliveredOrders || 0}</div>
                        </div>
                        <div className="p-4 bg-white/5 rounded-2xl border border-white/5 hover:border-white/10 transition-colors">
                            <div className="text-[9px] text-white/30 font-black uppercase tracking-widest mb-1">{loc.returns}</div>
                            <div className="text-xl font-black text-red-500 font-mono">{user?.totalReturnDisputeOrders || 0}</div>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="flex items-center gap-3 p-3 bg-blue-500/5 border border-blue-500/10 rounded-xl">
                            <Info size={16} className="text-blue-400 shrink-0" />
                            <p className="text-[10px] text-white/70 leading-relaxed italic">
                                {isAr ? 'يتم احتساب الموثوقية بناءً على نسبة المرتجعات مقارنة بالطلبات الناجحة.' : 'Reliability is calculated based on the ratio of returns to successful orders.'}
                            </p>
                        </div>
                        
                        <div className="space-y-2">
                            <div className="text-[9px] text-gold-500 font-black uppercase tracking-widest flex items-center gap-2">
                                <Activity size={12} />
                                {loc.tips.title}
                            </div>
                            <ul className="space-y-1.5">
                                {[loc.tips.tip1, loc.tips.tip2, loc.tips.tip3].map((tip, i) => (
                                    <li key={i} className="flex items-center gap-2 text-[9px] text-white/50 font-medium">
                                        <div className="w-1 h-1 rounded-full bg-gold-500/40" />
                                        {tip}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        </GlassCard>
    );
};

const Activity: React.FC<{size?: number, className?: string}> = ({ size = 16, className }) => (
    <svg 
        width={size} height={size} 
        viewBox="0 0 24 24" fill="none" stroke="currentColor" 
        strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" 
        className={className}
    >
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </svg>
);
