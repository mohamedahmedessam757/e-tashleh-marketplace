import React from 'react';
import { CheckCircle2 } from 'lucide-react';
import { useLanguage } from '../../../contexts/LanguageContext';

interface MultiItemCompletionBadgeProps {
    completedCount: number;
    totalCount: number;
    className?: string;
}

export const MultiItemCompletionBadge: React.FC<MultiItemCompletionBadgeProps> = ({
    completedCount,
    totalCount,
    className = '',
}) => {
    const { language } = useLanguage();
    const isAr = language === 'ar';

    if (totalCount <= 1) return null;

    const allDone = completedCount >= totalCount;

    return (
        <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                allDone
                    ? 'bg-green-500/10 text-green-400 border-green-500/30'
                    : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
            } ${className}`}
        >
            <CheckCircle2 size={12} />
            {isAr
                ? `${completedCount}/${totalCount} قطع مكتملة`
                : `${completedCount}/${totalCount} parts completed`}
        </span>
    );
};
