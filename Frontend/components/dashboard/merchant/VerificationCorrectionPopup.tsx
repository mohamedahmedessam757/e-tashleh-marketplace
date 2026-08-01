import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Clock, Package, X, RotateCcw } from 'lucide-react';
import { GlassCard } from '../../ui/GlassCard';
import { useNotificationStore, Notification } from '../../../stores/useNotificationStore';
import { useLanguage } from '../../../contexts/LanguageContext';

interface VerificationCorrectionPopupProps {
    onNavigate?: (path: string, id?: any) => void;
}

function isVerificationCorrection(n: Notification): boolean {
    const meta = n.metadata || {};
    if (meta.verificationCorrection === true) return true;
    const type = String(n.type || '').toUpperCase();
    return (
        meta.verification === true &&
        (type === 'SYSTEM' || type === 'SYSTEM_ALERT') &&
        String(n.recipientRole || '').toUpperCase() === 'MERCHANT'
    );
}

function formatDeadline(iso: string | null | undefined, isAr: boolean): string | null {
    if (!iso) return null;
    const t = new Date(iso).getTime();
    if (!Number.isFinite(t)) return null;
    const diff = t - Date.now();
    if (diff <= 0) return isAr ? 'انتهت المهلة' : 'Deadline passed';
    const h = Math.floor(diff / (1000 * 60 * 60));
    const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    if (h >= 24) {
        const d = Math.floor(h / 24);
        const rh = h % 24;
        return isAr ? `${d}ي ${rh}س متبقية` : `${d}d ${rh}h left`;
    }
    return isAr ? `${h}س ${m}د متبقية` : `${h}h ${m}m left`;
}

/**
 * Merchant-only detailed popup when admin rejects verification.
 * Mounted beside VerdictPopUp; only handles verificationCorrection notifications.
 */
export const VerificationCorrectionPopup: React.FC<VerificationCorrectionPopupProps> = ({
    onNavigate,
}) => {
    const { notifications, dismissNotification, shouldShowAsPopup } = useNotificationStore();
    const { language } = useLanguage();
    const isAr = language === 'ar';

    const [current, setCurrent] = useState<Notification | null>(null);
    const [dismissing, setDismissing] = useState(false);
    const [, setTick] = useState(0);

    const next = useMemo(
        () =>
            notifications.find(
                (n) => shouldShowAsPopup(n) && isVerificationCorrection(n),
            ) ?? null,
        [notifications, shouldShowAsPopup],
    );

    useEffect(() => {
        if (current || dismissing) return;
        if (next) setCurrent(next);
    }, [next, current, dismissing]);

    useEffect(() => {
        if (!current?.metadata?.correctionDeadlineAt) return;
        const id = window.setInterval(() => setTick((t) => t + 1), 30_000);
        return () => window.clearInterval(id);
    }, [current?.id, current?.metadata?.correctionDeadlineAt]);

    const handleDismiss = useCallback(async () => {
        if (!current || dismissing) return;
        setDismissing(true);
        const id = current.id;
        setCurrent(null);
        try {
            await dismissNotification(id);
        } finally {
            setDismissing(false);
        }
    }, [current, dismissing, dismissNotification]);

    const handleReVerify = useCallback(async () => {
        if (!current || dismissing) return;
        const orderId = current.metadata?.orderId;
        if (orderId && onNavigate) {
            onNavigate('explore-offer', orderId);
        }
        setDismissing(true);
        const id = current.id;
        setCurrent(null);
        try {
            await dismissNotification(id);
        } finally {
            setDismissing(false);
        }
    }, [current, dismissing, dismissNotification, onNavigate]);

    if (!current) return null;

    const meta = current.metadata || {};
    const partName = meta.partName || (isAr ? 'القطعة' : 'Part');
    const orderNumber = meta.orderNumber || String(meta.orderId || '').slice(0, 8);
    const reason =
        meta.rejectionReason ||
        (isAr ? current.messageAr : current.messageEn) ||
        '';
    const deadlineLabel = formatDeadline(meta.correctionDeadlineAt, isAr);

    return (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <div className="w-full max-w-lg" role="dialog" aria-modal="true">
                <GlassCard className="relative overflow-hidden border-2 border-orange-500/40 p-6 md:p-8 shadow-[0_0_50px_-12px_rgba(249,115,22,0.35)]">
                    <div className="absolute top-0 end-0 p-10 opacity-10 text-orange-500 pointer-events-none">
                        <AlertTriangle size={140} />
                    </div>

                    <div className="relative z-10 space-y-5">
                        <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-orange-500/15 border border-orange-500/30 text-orange-300 text-[10px] font-black uppercase tracking-widest">
                                <AlertTriangle size={12} />
                                {isAr ? 'مطلوب تصحيح التوثيق' : 'Verification correction required'}
                            </div>
                            <button
                                type="button"
                                onClick={() => void handleDismiss()}
                                disabled={dismissing}
                                className="text-white/30 hover:text-white transition-colors disabled:opacity-40"
                                aria-label={isAr ? 'إغلاق' : 'Close'}
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div>
                            <h2 className="text-xl md:text-2xl font-black text-white tracking-tight">
                                {isAr ? current.titleAr : current.titleEn}
                            </h2>
                            <p className="mt-2 text-sm text-white/50 flex flex-wrap items-center gap-2">
                                <span className="inline-flex items-center gap-1.5 font-mono text-gold-400/90">
                                    #{orderNumber}
                                </span>
                                <span className="text-white/20">•</span>
                                <span className="inline-flex items-center gap-1.5">
                                    <Package size={14} className="text-orange-400/80" />
                                    {partName}
                                </span>
                            </p>
                        </div>

                        {reason && (
                            <div className="rounded-2xl bg-red-500/10 border border-red-500/25 p-4">
                                <p className="text-[10px] font-black uppercase tracking-widest text-red-400/80 mb-2">
                                    {isAr ? 'سبب الرفض' : 'Rejection reason'}
                                </p>
                                <p className="text-sm text-white/80 leading-relaxed whitespace-pre-wrap">
                                    {reason}
                                </p>
                            </div>
                        )}

                        {deadlineLabel && (
                            <div className="flex items-center gap-3 rounded-2xl bg-white/5 border border-white/10 px-4 py-3">
                                <Clock size={18} className="text-gold-400 shrink-0" />
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-white/40">
                                        {isAr ? 'مهلة التصحيح' : 'Correction deadline'}
                                    </p>
                                    <p className="text-sm font-bold text-gold-300 font-mono tabular-nums">
                                        {deadlineLabel}
                                    </p>
                                </div>
                            </div>
                        )}

                        <p className="text-xs text-white/40 leading-relaxed">
                            {isAr
                                ? 'يرجى تصحيح القطعة وإعادة التوثيق قبل انتهاء المهلة لتجنب إلغاء الطلب.'
                                : 'Please correct the part and resubmit verification before the deadline to avoid cancellation.'}
                        </p>

                        <div className="flex flex-col sm:flex-row gap-3 pt-1">
                            <button
                                type="button"
                                onClick={() => void handleReVerify()}
                                disabled={dismissing || !meta.orderId}
                                className="flex-1 py-3.5 rounded-2xl bg-gradient-to-r from-orange-600 to-amber-500 hover:from-orange-500 hover:to-amber-400 text-white font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 disabled:opacity-50 transition-colors"
                            >
                                <RotateCcw size={16} />
                                {isAr ? 'إعادة التوثيق' : 'Re-verify part'}
                            </button>
                            <button
                                type="button"
                                onClick={() => void handleDismiss()}
                                disabled={dismissing}
                                className="sm:w-auto px-6 py-3.5 rounded-2xl bg-white/5 border border-white/10 text-white/60 hover:text-white hover:bg-white/10 font-bold text-sm transition-colors disabled:opacity-40"
                            >
                                {isAr ? 'لاحقاً' : 'Later'}
                            </button>
                        </div>
                    </div>
                </GlassCard>
            </div>
        </div>
    );
};
