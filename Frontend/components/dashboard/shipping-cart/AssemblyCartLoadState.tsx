import React from 'react';
import { ShoppingBag, RefreshCw, AlertTriangle } from 'lucide-react';
import { useLanguage } from '../../../contexts/LanguageContext';
import { GlassCard } from '../../ui/GlassCard';

interface Props {
    itemsCount: number;
    loading: boolean;
    loaded: boolean;
    error: string | null;
    emptyTitle: string;
    emptyDesc: string;
    onRetry: () => void;
}

/** Skeleton (first load) / load error with retry / empty state for the assembly cart pages. */
export const AssemblyCartLoadState: React.FC<Props> = ({
    itemsCount,
    loading,
    loaded,
    error,
    emptyTitle,
    emptyDesc,
    onRetry,
}) => {
    const { language } = useLanguage();
    const isAr = language === 'ar';

    if (itemsCount > 0) return null;

    if (loading && !loaded) {
        return (
            <div className="space-y-4" aria-busy="true" aria-live="polite">
                {[0, 1, 2].map((i) => (
                    <div
                        key={i}
                        className="h-32 sm:h-36 rounded-2xl border border-white/10 bg-white/[0.03] animate-pulse"
                    />
                ))}
            </div>
        );
    }

    if (!loaded && error) {
        return (
            <GlassCard className="text-center py-14 border border-red-500/20">
                <AlertTriangle className="mx-auto mb-3 text-red-400/80" size={40} />
                <p className="text-white/70 font-medium mb-4">
                    {isAr ? 'تعذّر تحميل سلة التجميع، حاول مرة أخرى.' : 'Could not load the assembly cart. Please try again.'}
                </p>
                <button
                    type="button"
                    onClick={onRetry}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gold-500 text-black font-bold hover:bg-gold-400 transition-colors"
                >
                    <RefreshCw size={16} />
                    {isAr ? 'إعادة المحاولة' : 'Retry'}
                </button>
            </GlassCard>
        );
    }

    if (!loaded) return null;

    return (
        <GlassCard className="text-center py-20 border border-dashed border-white/10">
            <ShoppingBag className="mx-auto mb-4 text-white/20" size={48} />
            <p className="text-white/50 font-medium mb-2">{emptyTitle}</p>
            <p className="text-white/30 text-sm max-w-md mx-auto">{emptyDesc}</p>
        </GlassCard>
    );
};
