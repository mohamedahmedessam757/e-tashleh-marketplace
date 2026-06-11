import React from 'react';
import { Package, Clock, CheckCircle2 } from 'lucide-react';
import { useLanguage } from '../../../contexts/LanguageContext';
import type { EligibleResolutionPart } from './resolutionTypes';

interface ResolutionPartPickerProps {
    parts: EligibleResolutionPart[];
    selectedOrderPartId?: string;
    onSelect: (part: EligibleResolutionPart) => void;
    mode: 'return' | 'dispute';
}

export const ResolutionPartPicker: React.FC<ResolutionPartPickerProps> = ({
    parts,
    selectedOrderPartId,
    onSelect,
    mode,
}) => {
    const { language } = useLanguage();
    const isAr = language === 'ar';
    const accent = mode === 'dispute' ? 'red' : 'cyan';

    if (parts.length === 0) {
        return (
            <div className="p-5 bg-white/[0.02] border border-white/10 rounded-2xl text-center">
                <p className="text-sm text-white/50">
                    {isAr
                        ? 'لا توجد قطع مؤهلة للإرجاع أو النزاع حالياً.'
                        : 'No parts are currently eligible for return or dispute.'}
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-3">
            <label className="block text-[10px] font-black text-white/30 uppercase tracking-[0.2em] ml-2">
                {isAr ? 'اختر القطعة' : 'Select the part'}
            </label>
            <p className="text-[11px] text-white/40 px-2">
                {isAr
                    ? 'سيتم تطبيق الطلب على القطعة المحددة فقط — باقي القطع لن تتأثر.'
                    : 'This request applies only to the selected part — other parts will not be affected.'}
            </p>
            <div className="space-y-2">
                {parts.map((part) => {
                    const selected = selectedOrderPartId === part.orderPartId;
                    return (
                        <button
                            key={part.orderPartId}
                            type="button"
                            onClick={() => onSelect(part)}
                            className={`w-full flex items-center gap-4 p-4 rounded-2xl border transition-all text-left rtl:text-right ${
                                selected
                                    ? accent === 'red'
                                        ? 'bg-red-500/10 border-red-500/40'
                                        : 'bg-cyan-500/10 border-cyan-500/40'
                                    : 'bg-white/[0.02] border-white/10 hover:border-white/20'
                            }`}
                        >
                            <div
                                className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                                    selected
                                        ? accent === 'red'
                                            ? 'bg-red-500/20 text-red-400'
                                            : 'bg-cyan-500/20 text-cyan-400'
                                        : 'bg-white/5 text-white/30'
                                }`}
                            >
                                {selected ? <CheckCircle2 size={22} /> : <Package size={22} />}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="font-bold text-white truncate">{part.partName}</div>
                                <div className="text-xs text-white/40 truncate">{part.merchantName}</div>
                                {part.orderNumber && (
                                    <div className="text-[10px] text-white/25 font-mono mt-0.5">
                                        #{part.orderNumber}
                                    </div>
                                )}
                            </div>
                            {part.returnWindowEndsAt && (
                                <div className="flex items-center gap-1 text-[10px] text-white/30 shrink-0">
                                    <Clock size={12} />
                                    <span>{new Date(part.returnWindowEndsAt).toLocaleTimeString()}</span>
                                </div>
                            )}
                        </button>
                    );
                })}
            </div>
        </div>
    );
};
