import React from 'react';
import { CheckCircle2, Clock, Lock, AlertTriangle } from 'lucide-react';
import { useLanguage } from '../../../contexts/LanguageContext';
import type { FulfillmentSummaryHint } from '../../ui/StatusTimeline';

interface MultiItemResolutionProgressProps {
    fulfillmentSummary: FulfillmentSummaryHint | null;
    className?: string;
}

export const MultiItemResolutionProgress: React.FC<MultiItemResolutionProgressProps> = ({
    fulfillmentSummary,
    className = '',
}) => {
    const { language } = useLanguage();
    const isAr = language === 'ar';

    const parts = fulfillmentSummary?.parts ?? [];
    if (parts.length <= 1) return null;

    const completedCount = parts.filter((p) => p.fulfillmentStatus === 'COMPLETED').length;

    return (
        <div className={`rounded-2xl border border-white/10 bg-white/[0.03] p-5 ${className}`}>
            <div className="flex items-center justify-between mb-4">
                <h4 className="text-xs font-black text-white/50 uppercase tracking-widest">
                    {isAr ? 'تقدم حل القطع' : 'Part Resolution Progress'}
                </h4>
                <span className="text-[10px] font-bold text-gold-400">
                    {completedCount}/{parts.length}
                </span>
            </div>
            <div className="space-y-3">
                {parts.map((part) => {
                    const isCompleted = part.fulfillmentStatus === 'COMPLETED';
                    const hasCase = part.hasOpenCase;
                    const locked = part.resolutionLocked && !isCompleted;

                    let icon = <Clock size={14} className="text-amber-400" />;
                    let statusLabel = isAr ? 'نافذة 24 ساعة' : '24h window';
                    let barColor = 'bg-amber-500';

                    if (isCompleted) {
                        icon = <CheckCircle2 size={14} className="text-green-400" />;
                        statusLabel = isAr ? 'مكتمل' : 'Completed';
                        barColor = 'bg-green-500';
                    } else if (hasCase) {
                        icon = <AlertTriangle size={14} className="text-red-400" />;
                        statusLabel = isAr ? 'نزاع/إرجاع' : 'Case open';
                        barColor = 'bg-red-500';
                    } else if (locked) {
                        icon = <Lock size={14} className="text-white/40" />;
                        statusLabel = isAr ? 'مقفل' : 'Locked';
                        barColor = 'bg-white/30';
                    }

                    return (
                        <div key={part.offerId} className="space-y-1.5">
                            <div className="flex items-center justify-between gap-2">
                                <span className="text-xs text-white/80 truncate font-medium">
                                    {part.partName}
                                </span>
                                <span className="flex items-center gap-1 text-[10px] text-white/50 shrink-0">
                                    {icon}
                                    {statusLabel}
                                </span>
                            </div>
                            <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                                <div
                                    className={`h-full rounded-full transition-all ${barColor}`}
                                    style={{ width: isCompleted ? '100%' : hasCase ? '60%' : '35%' }}
                                />
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
