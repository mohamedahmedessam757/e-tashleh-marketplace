import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  AlertTriangle, 
  Loader2, 
  ShieldAlert,
  ChevronRight, 
  ChevronLeft, 
  Scale,
  ShieldCheck,
  Package,
  Zap,
  Info,
  ArrowUpRight
} from 'lucide-react';
import { useLanguage } from '../../../contexts/LanguageContext';
import { useReturnsStore } from '../../../stores/useReturnsStore';
import { FileUploader } from '../../ui/FileUploader';
import { ResolutionPartPicker } from './ResolutionPartPicker';
import type { EligibleResolutionPart } from './resolutionTypes';
import { ordersApi } from '../../../services/api/orders';

interface DisputeModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    orderId?: string;
    orderPartId?: string;
    merchantName?: string;
    partName?: string;
    eligibleParts?: EligibleResolutionPart[];
}

export const DisputeModal: React.FC<DisputeModalProps> = ({ 
    isOpen, 
    onClose, 
    onSuccess,
    orderId: initialOrderId,
    orderPartId: initialOrderPartId,
    merchantName: initialMerchantName,
    partName: initialPartName,
    eligibleParts: initialEligibleParts,
}) => {
    const { t, language } = useLanguage();
    const isAr = language === 'ar';
    const { escalateDispute, error: storeError } = useReturnsStore();

    const [selectedPart, setSelectedPart] = useState<EligibleResolutionPart | null>(null);
    const [remoteParts, setRemoteParts] = useState<EligibleResolutionPart[]>([]);
    const [loadingParts, setLoadingParts] = useState(false);

    const [reason, setReason] = useState('');
    const [description, setDescription] = useState('');
    const [confirmations, setConfirmations] = useState({
        integrity: false,
        policy: false
    });
    const [files, setFiles] = useState<File[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [attemptedSubmit, setAttemptedSubmit] = useState(false);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    const disputeReasons = [
        { id: 'non_matching', ar: 'عدم مطابقة القطعة', en: 'Non-matching part' },
        { id: 'damaged', ar: 'قطعة تالفة', en: 'Damaged part' },
        { id: 'not_working', ar: 'قطعة لا تعمل', en: 'Non-functional part' },
        { id: 'different_item', ar: 'قطعة مختلفة عن الطلب', en: 'Item different from order' },
        { id: 'shipping_error', ar: 'خطأ من شركة الشحن', en: 'Shipping company error' },
        { id: 'other', ar: 'نزاع آخر', en: 'Other dispute' }
    ];

    const pickerParts = useMemo(() => {
        if (initialEligibleParts?.length) return initialEligibleParts;
        return remoteParts;
    }, [initialEligibleParts, remoteParts]);

    const partSelectionRequired = pickerParts.length > 1;

    const needsPartPicker =
        partSelectionRequired &&
        !initialOrderPartId &&
        !selectedPart;

    const activeOrderId = selectedPart?.orderId ?? initialOrderId;
    const activeOrderPartId = selectedPart?.orderPartId ?? initialOrderPartId;
    const activePartName = selectedPart?.partName ?? initialPartName ?? 'Part';
    const activeMerchantName = selectedPart?.merchantName ?? initialMerchantName ?? 'Store';

    useEffect(() => {
        if (!isOpen) return;
        setReason('');
        setDescription('');
        setConfirmations({ integrity: false, policy: false });
        setFiles([]);
        setAttemptedSubmit(false);
        setSuccessMessage(null);
        setSelectedPart(null);

        if (initialOrderPartId && initialOrderId) {
            setSelectedPart({
                orderId: initialOrderId,
                orderPartId: initialOrderPartId,
                partName: initialPartName ?? 'Part',
                merchantName: initialMerchantName ?? 'Store',
            });
        }
    }, [isOpen, initialOrderId, initialOrderPartId, initialPartName, initialMerchantName]);

    useEffect(() => {
        if (!isOpen || selectedPart || initialOrderPartId) return;
        if (pickerParts.length === 1) {
            setSelectedPart(pickerParts[0]);
        }
    }, [isOpen, pickerParts, selectedPart, initialOrderPartId]);

    useEffect(() => {
        if (!isOpen || initialOrderId || initialEligibleParts?.length) return;

        let cancelled = false;
        setLoadingParts(true);
        ordersApi
            .getDeliveredOrders()
            .then((items: any[]) => {
                if (cancelled) return;
                const mapped = (items || [])
                    .filter((item) => item.isReturnEligible === true)
                    .map((item) => ({
                        offerId: item.offerId,
                        orderId: item.id,
                        orderPartId: item.orderPartId,
                        partName: item.name,
                        merchantName: item.storeName,
                        orderNumber: item.orderNumber,
                        returnWindowEndsAt: item.returnExpiryDate,
                        isReturnEligible: item.isReturnEligible,
                    }))
                    .filter((p) => p.orderPartId);
                setRemoteParts(mapped);
            })
            .catch(() => setRemoteParts([]))
            .finally(() => {
                if (!cancelled) setLoadingParts(false);
            });

        return () => {
            cancelled = true;
        };
    }, [isOpen, initialOrderId, initialEligibleParts]);

    const handleSubmit = async () => {
        setAttemptedSubmit(true);
        if (!activeOrderId || !reason || !description || files.length === 0) return;
        if (partSelectionRequired && !activeOrderPartId) return;
        if (!confirmations.integrity || !confirmations.policy) return;
        
        setIsSubmitting(true);

        const success = await escalateDispute(
            String(activeOrderId),
            activeOrderPartId,
            reason,
            description,
            files,
        );
        setIsSubmitting(false);

        if (success) {
            const partLabel = activePartName || (isAr ? 'هذه القطعة' : 'This part');
            setSuccessMessage(
                isAr
                    ? `تم تصعيد النزاع لـ «${partLabel}». القطع الأخرى لم تتأثر.`
                    : `Dispute opened for "${partLabel}". Other parts were not affected.`,
            );
            setTimeout(() => {
                setSuccessMessage(null);
                onClose();
                onSuccess();
            }, 1800);
        }
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-6 overflow-hidden">
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    className="absolute inset-0 bg-black/85"
                />

                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="w-full max-w-lg relative z-10"
                >
                    <div className="p-0 border border-red-500/20 rounded-[2rem] overflow-hidden shadow-2xl bg-[#0A0A0A] relative">
                        <div className="p-6 border-b border-white/5 relative overflow-hidden">
                            <div className="flex justify-between items-start relative z-10">
                                <div>
                                    <div className="flex items-center gap-2 mb-3">
                                        <div className="px-3 py-1 bg-red-500/10 border border-red-500/20 rounded-full">
                                            <span className="text-[10px] font-black text-red-500 uppercase tracking-widest">
                                                {isAr ? 'بروتوكول النزاع الرسمي' : 'Official Dispute Protocol'}
                                            </span>
                                        </div>
                                        <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                                    </div>
                                    <h3 className="text-3xl font-black text-white uppercase tracking-tighter">
                                        {t.dashboard.resolution.newDispute}
                                    </h3>
                                </div>
                                <button 
                                    onClick={onClose}
                                    className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center hover:bg-white/10 transition-all border border-white/10 active:scale-95"
                                >
                                    <X size={20} className="text-white/40" />
                                </button>
                            </div>
                            <div className="absolute -right-20 -top-20 w-64 h-64 bg-red-500/5 blur-[80px] rounded-full pointer-events-none" />
                        </div>

                        <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
                            {loadingParts ? (
                                <div className="flex items-center justify-center py-8 text-white/40 gap-2">
                                    <Loader2 className="animate-spin" size={20} />
                                    {isAr ? 'جاري تحميل القطع المؤهلة...' : 'Loading eligible parts...'}
                                </div>
                            ) : needsPartPicker ? (
                                <ResolutionPartPicker
                                    parts={pickerParts}
                                    selectedOrderPartId={selectedPart?.orderPartId}
                                    onSelect={setSelectedPart}
                                    mode="dispute"
                                />
                            ) : !activeOrderId && pickerParts.length === 0 ? (
                                <div className="p-5 bg-white/[0.02] border border-white/10 rounded-2xl text-center text-sm text-white/50">
                                    {isAr
                                        ? 'لا توجد قطع مؤهلة للنزاع حالياً.'
                                        : 'No parts are currently eligible for dispute.'}
                                </div>
                            ) : (
                                <>
                            <div className="flex items-center gap-6 p-6 bg-white/[0.02] border border-white/5 rounded-3xl group">
                                <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center border border-white/10 group-hover:scale-105 transition-transform duration-500">
                                    <Package size={32} className="text-red-500/50" />
                                </div>
                                <div className="space-y-1">
                                    <span className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em]">#{activeOrderId}</span>
                                    <h4 className="text-xl font-black text-white uppercase tracking-tight">{activePartName}</h4>
                                    <p className="text-xs font-bold text-white/40 flex items-center gap-2 uppercase">
                                        <ShieldAlert size={14} className="text-red-500" />
                                        {activeMerchantName}
                                    </p>
                                </div>
                            </div>

                            {pickerParts.length > 1 && (
                                <button
                                    type="button"
                                    onClick={() => setSelectedPart(null)}
                                    className="text-xs text-red-400 hover:text-red-300 font-bold"
                                >
                                    {isAr ? '← تغيير القطعة' : '← Change selected part'}
                                </button>
                            )}

                            <div className="p-5 bg-red-500/[0.03] border border-red-500/10 rounded-2xl flex items-start gap-4">
                                <AlertTriangle className="text-red-500 shrink-0 mt-1" size={20} />
                                <div className="space-y-2">
                                    <p className="text-[10px] text-red-100/70 leading-relaxed font-bold uppercase tracking-widest">
                                        {t.dashboard.resolution.disputePolicy}
                                    </p>
                                    <div className="flex items-center gap-2 text-[8px] font-black uppercase text-red-500/50 tracking-[0.2em]">
                                        <Zap size={10} /> Escrow Funds Protected
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-6">
                                <div className="group">
                                    <label className="block text-[10px] font-black text-white/30 uppercase tracking-[0.2em] mb-3 ml-2">{t.dashboard.resolution.form.reason}</label>
                                    <div className="relative">
                                        <select 
                                            value={reason}
                                            onChange={(e) => setReason(e.target.value)}
                                            className={`w-full bg-[#0A0A0A] border rounded-2xl px-5 py-4 text-xs text-white outline-none transition-all appearance-none cursor-pointer ${isAr ? 'text-right' : 'text-left'} 
                                            ${attemptedSubmit && !reason ? 'border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.3)]' : 'border-white/10 focus:border-red-500/50'}`}
                                        >
                                            <option value="" className="bg-[#0A0A0A]">{isAr ? '-- اختر السبب --' : '-- Select Reason --'}</option>
                                            {disputeReasons.map(r => (
                                                <option key={r.id} value={r.id} className="bg-[#0A0A0A]">{isAr ? r.ar : r.en}</option>
                                            ))}
                                        </select>
                                        <div className={`absolute top-1/2 -translate-y-1/2 ${isAr ? 'left-6' : 'right-6'} pointer-events-none text-white/20 group-hover:text-red-500 transition-colors`}>
                                            {isAr ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-[10px] font-black text-white/30 uppercase tracking-[0.2em] mb-3 ml-2">{t.dashboard.resolution.form.desc}</label>
                                    <textarea
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                        className={`w-full bg-white/5 border rounded-3xl px-6 py-5 text-sm text-white outline-none resize-none h-32 placeholder-white/10 transition-all hover:bg-white/[0.08]
                                        ${attemptedSubmit && !description ? 'border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.3)]' : 'border-white/10 focus:border-red-500/50'}`}
                                        placeholder={isAr ? 'سجل شكواك الرسمية ليقوم المحكم الإداري بمراجعتها...' : 'Record your official complaint for administrative arbitration...'}
                                    />
                                </div>

                                <div className="space-y-3">
                                    <label className="block text-[10px] font-black text-white/30 uppercase tracking-[0.2em] ml-2">{t.dashboard.resolution.form.evidence}</label>
                                    <div className={`rounded-3xl transition-all ${attemptedSubmit && files.length === 0 ? 'ring-2 ring-red-500 shadow-[0_0_15px_rgba(239,68,68,0.3)]' : ''}`}>
                                        <FileUploader
                                            onFilesSelected={setFiles}
                                            accept={{
                                                'image/*': ['.png', '.jpg', '.jpeg', '.webp', '.heic'],
                                                'video/*': ['.mp4', '.mov', '.webm']
                                            }}
                                            maxFiles={5}
                                        />
                                    </div>
                                </div>

                                <div className="space-y-4 pt-4 border-t border-white/5">
                                    <label className="block text-[10px] font-black text-white/30 uppercase tracking-[0.2em] ml-2 mb-2">
                                        {isAr ? 'تأكيدات النزاع الإجبارية' : 'Mandatory Dispute Confirmations'}
                                    </label>
                                    {[
                                        { id: 'integrity', textAr: 'أقر بصحة الشكوى وجميع المرفقات المقدمة', textEn: 'I confirm the validity of the complaint and all attachments' },
                                        { id: 'policy', textAr: 'أدرك أن التقاضي الإداري قرار نهائي وملزم للطرفين', textEn: 'I understand that administrative arbitration is final and binding' }
                                    ].map((check) => (
                                        <label key={check.id} className="flex items-start gap-3 cursor-pointer group">
                                            <div 
                                                onClick={() => setConfirmations(prev => ({ ...prev, [check.id]: !prev[check.id as keyof typeof confirmations] }))}
                                                className={`
                                                    w-5 h-5 rounded-md border shrink-0 mt-0.5 flex items-center justify-center transition-all
                                                    ${confirmations[check.id as keyof typeof confirmations] 
                                                        ? 'bg-red-500 border-red-500 text-black' 
                                                        : 'bg-white/5 border-white/10 group-hover:border-white/30'
                                                    }
                                                    ${attemptedSubmit && !confirmations[check.id as keyof typeof confirmations] ? 'border-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]' : ''}
                                                `}
                                            >
                                                {confirmations[check.id as keyof typeof confirmations] && <X size={14} className="stroke-[4]" />}
                                            </div>
                                            <span className={`text-[11px] group-hover:text-white/60 transition-colors font-bold uppercase tracking-tight ${attemptedSubmit && !confirmations[check.id as keyof typeof confirmations] ? 'text-red-400' : 'text-white/40'}`}>
                                                {isAr ? check.textAr : check.textEn}
                                            </span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                                </>
                            )}
                        </div>

                        {!needsPartPicker && activeOrderId && (!partSelectionRequired || activeOrderPartId) && (
                        <div className="p-6 bg-white/[0.02] border-t border-white/5 flex flex-col gap-3">
                            {successMessage && (
                                <p className="text-emerald-400 text-xs flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-3 w-full">
                                    <ShieldCheck size={14} />
                                    {successMessage}
                                </p>
                            )}
                        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                            {storeError && (
                                <p className="text-red-400 text-xs flex items-center gap-2 w-full md:w-auto">
                                    <AlertTriangle size={14} />
                                    {storeError}
                                </p>
                            )}
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-red-500/10 flex items-center justify-center text-red-500 border border-red-500/20">
                                    <Scale size={16} />
                                </div>
                                <span className="text-[10px] font-black text-white/30 uppercase tracking-widest">{isAr ? 'مراجعة قانونية' : 'Legal Grade Review'}</span>
                            </div>

                            <button
                                onClick={handleSubmit}
                                disabled={isSubmitting}
                                className="w-full md:w-auto px-12 py-5 bg-red-600 text-white font-black uppercase tracking-[0.2em] text-[10px] rounded-2xl flex items-center justify-center gap-3 hover:scale-105 active:scale-95 transition-all shadow-[0_0_40px_rgba(220,38,38,0.3)] disabled:opacity-30 disabled:hover:scale-100 disabled:grayscale group"
                            >
                                {isSubmitting ? (
                                    <Loader2 className="animate-spin" size={18} />
                                ) : (
                                    <>
                                        <ArrowUpRight size={18} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                                        {t.dashboard.resolution.form.submitDispute}
                                    </>
                                )}
                            </button>
                        </div>
                        </div>
                        )}
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};
