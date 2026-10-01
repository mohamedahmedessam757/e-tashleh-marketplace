import React from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, Car } from 'lucide-react';
import { GlassCard } from '../../ui/GlassCard';
import { Badge, StatusType } from '../../ui/Badge';
import { formatOrderDisplayId } from '../../../utils/orderDisplayId';
import { getMerchantOrderProgress } from '../../../utils/merchantOrderBuckets';

interface MerchantActiveOrderCardProps {
    order: any;
    isAr: boolean;
    onNavigate: (path: string, id?: string | number) => void;
    t: any;
}

export const MerchantActiveOrderCard: React.FC<MerchantActiveOrderCardProps> = ({ order, isAr, onNavigate, t }) => {
    const ArrowIcon = isAr ? ArrowLeft : ArrowRight;

    return (
        <GlassCard 
            onClick={() => onNavigate('explore-offer', order.id)}
            className="p-0 overflow-hidden bg-[#151310] border-gold-500/10 hover:border-gold-500/30 transition-all duration-500 group shadow-xl cursor-pointer"
        >
            <div className="p-4 sm:p-6 md:p-8 min-w-0">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 md:gap-6 mb-6 md:mb-8 min-w-0">
                    <div className="flex items-center gap-3 sm:gap-5 min-w-0 w-full md:w-auto">
                        <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-gold-500 group-hover:scale-110 transition-transform duration-500 shrink-0">
                            <Car size={28} />
                        </div>
                        <div className="min-w-0 flex-1">
                            <h4 className="text-xl sm:text-2xl font-bold text-white mb-1 truncate">{order.car}</h4>
                            <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-sm min-w-0">
                                <span className="text-white/60 truncate max-w-[10rem] sm:max-w-[14rem]">{order.part}</span>
                                <span className="w-1 h-1 rounded-full bg-white/20 shrink-0" />
                                <span className="text-gold-500/80 font-mono text-xs truncate max-w-[9rem] sm:max-w-[12rem]">
                                    #{formatOrderDisplayId(order)}
                                </span>
                            </div>
                        </div>
                    </div>
                    <Badge status={order.status as StatusType} className="shrink-0" />
                </div>

                <div className="space-y-6 min-w-0">
                    <div className="min-w-0">
                        <div className="flex items-center justify-between gap-3 text-xs font-bold mb-3 min-w-0">
                            <span className="text-white/40 uppercase tracking-widest shrink-0">{t.dashboard.orders.status}</span>
                            <span className="text-gold-500 tabular-nums shrink-0">{getMerchantOrderProgress(order.status)}%</span>
                        </div>
                        <div className="h-2.5 w-full bg-white/5 rounded-full overflow-hidden p-[1px]">
                            <motion.div 
                                initial={{ width: 0 }}
                                animate={{ width: `${getMerchantOrderProgress(order.status)}%` }}
                                className="h-full bg-gradient-to-r from-gold-600 to-gold-400 rounded-full shadow-[0_0_15px_rgba(212,175,55,0.3)]"
                            />
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-xs min-w-0">
                        <div className="px-3 py-1.5 rounded-lg bg-gold-500/5 border border-gold-500/10 text-gold-500/80 font-bold">
                            {order.offersCount} {t.dashboard.merchant.marketplace.competingOffers}
                        </div>
                        <div className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white/40">
                            {t.dashboard.merchant.marketplace.lastUpdate} {order.date}
                        </div>
                    </div>
                </div>
            </div>

            <button 
                onClick={(e) => { e.stopPropagation(); onNavigate('explore-offer', order.id); }}
                className="w-full py-4 border-t border-white/5 bg-white/[0.02] hover:bg-white/[0.05] transition-all flex items-center justify-center gap-2 group/btn"
            >
                <span className="text-sm font-bold text-white/60 group-hover/btn:text-white transition-colors">{t.dashboard.merchant.marketplace.viewDetails}</span>
                <ArrowIcon size={16} className="text-white/20 group-hover/btn:text-gold-500 transition-all" />
            </button>
        </GlassCard>
    );
};
