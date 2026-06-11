import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  AlertCircle, 
  Loader2, 
  FileText, 
  ChevronRight, 
  ChevronLeft, 
  UploadCloud, 
  ShieldCheck,
  Package,
  RotateCcw,
  BadgeDollarSign,
  ArrowUpRight,
  Info
} from 'lucide-react';
import { useLanguage } from '../../../contexts/LanguageContext';
import { useReturnsStore } from '../../../stores/useReturnsStore';
import { FileUploader } from '../../ui/FileUploader';
import { ResolutionPartPicker } from './ResolutionPartPicker';
import type { EligibleResolutionPart } from './resolutionTypes';
import { ordersApi } from '../../../services/api/orders';

interface ReturnRequestModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    orderId?: string;
    orderPartId?: string;
    merchantName?: string;
    partName?: string;
    eligibleParts?: EligibleResolutionPart[];
    initialReason?: string;
}

export const ReturnRequestModal: React.FC<ReturnRequestModalProps> = ({ 
    isOpen, 
    onClose, 
    onSuccess,
    orderId: initialOrderId,
    orderPartId: initialOrderPartId,
    merchantName: initialMerchantName,
    partName: initialPartName,
    eligibleParts: initialEligibleParts,
    initialReason
}) => {
    const { t, language } = useLanguage();
    const isAr = language === 'ar';
    const { requestReturn, error: storeError } = useReturnsStore();

    const [selectedPart, setSelectedPart] = useState<EligibleResolutionPart | null>(null);
    const [remoteParts, setRemoteParts] = useState<EligibleResolutionPart[]>([]);
    const [loadingParts, setLoadingParts] = useState(false);

    const [reason, setReason] = useState(initialReason || '');
    const [description, setDescription] = useState('');
    const [usageCondition, setUsageCondition] = useState<'UNUSED' | 'OPENED' | 'INSTALLED' | ''>('');
    const [confirmations, setConfirmations] = useState({
        integrity: false,
        packaging: false,
        policy: false
    });
    const [files, setFiles] = useState<File[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [attemptedSubmit, setAttemptedSubmit] = useState(false);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

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
        setReason(initialReason || '');
        setDescription('');
        setUsageCondition('');
        setConfirmations({ integrity: false, packaging: false, policy: false });
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
    }, [isOpen, initialOrderId, initialOrderPartId, initialPartName, initialMerchantName, initialReason]);

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
        if (!activeOrderId || !reason || !description || !usageCondition || files.length === 0) return;
        if (partSelectionRequired && !activeOrderPartId) return;
        if (!confirmations.integrity || !confirmations.packaging || !confirmations.policy) return;
        
        setIsSubmitting(true);

        const success = await requestReturn(
            String(activeOrderId),
            activeOrderPartId,
            reason,
            description,
            usageCondition,
            files,
        );
        setIsSubmitting(false);

        if (success) {
            const partLabel = activePartName || (isAr ? 'هذه القطعة' : 'This part');
            setSuccessMessage(
                isAr
                    ? `تم تقديم طلب الإرجاع لـ «${partLabel}». القطع الأخرى لم تتأثر.`
                    : `Return submitted for "${partLabel}". Other parts were not affected.`,
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
                    <div className="p-0 border border-white/10 rounded-[2rem] overflow-hidden shadow-2xl bg-[#0A0A0A] relative">
                        <div className="p-6 border-b border-white/5 relative overflow-hidden">
                            <div className="flex justify-between items-start relative z-10">
                                <div>
                                    <div className="flex items-center gap-2 mb-3">
                                        <div className="px-3 py-1 bg-cyan-500/10 border border-cyan-500/20 rounded-full">
                                            <span className="text-[10px] font-black text-cyan-400 uppercase tracking-widest">
                                                {isAr ? 'بروتوكول الإرجاع' : 'Return Protocol'}
                                            </span>
                                        </div>
                                        <div className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-pulse" />
                                    </div>
                                    <h3 className="text-3xl font-black text-white uppercase tracking-tighter">
                                        {t.dashboard.resolution.newReturn}
                                    </h3>
                                </div>
                                <button 
                                    onClick={onClose}
                                    className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center hover:bg-white/10 transition-all border border-white/10 active:scale-95"
                                >
                                    <X size={20} className="text-white/40" />
                                </button>
                            </div>
                            <div className="absolute -right-20 -top-20 w-64 h-64 bg-cyan-500/5 blur-[80px] rounded-full pointer-events-none" />
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
                                    mode="return"
                                />
                            ) : !activeOrderId && pickerParts.length === 0 ? (
                                <div className="p-5 bg-white/[0.02] border border-white/10 rounded-2xl text-center text-sm text-white/50">
                                    {isAr
                                        ? 'لا توجد قطع مؤهلة للإرجاع حالياً.'
                                        : 'No parts are currently eligible for return.'}
                                </div>
                            ) : (
                                <>
                            <div className="flex items-center gap-6 p-6 bg-white/[0.02] border border-white/5 rounded-3xl group">
                                <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center border border-white/10 group-hover:scale-105 transition-transform duration-500">
                                    <Package size={32} className="text-cyan-500/50" />
                                </div>
                                <div className="space-y-1">
                                    <span className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em]">#{activeOrderId}</span>
                                    <h4 className="text-xl font-black text-white uppercase tracking-tight">{activePartName}</h4>
                                    <p className="text-xs font-bold text-white/40 flex items-center gap-2 uppercase">
                                        <ShieldCheck size={14} className="text-cyan-500" />
                                        {activeMerchantName}
                                    </p>
                                </div>
                            </div>

                            {pickerParts.length > 1 && (
                                <button
                                    type="button"
                                    onClick={() => setSelectedPart(null)}
                                    className="text-xs text-cyan-400 hover:text-cyan-300 font-bold"
                                >
                                    {isAr ? '← تغيير القطعة' : '← Change selected part'}
                                </button>
                            )}

                            <div className="p-5 bg-cyan-500/[0.03] border border-cyan-500/10 rounded-2xl flex items-start gap-4">
                                <Info className="text-cyan-400 shrink-0 mt-1" size={20} />
                                <p className="text-[11px] text-cyan-100/50 leading-relaxed font-bold uppercase tracking-widest">
                                    {isAr
                                        ? 'يرجى إرفاق صور واضحة توضح سبب الإرجاع. سيتم مراجعة هذه البيانات من قبل الإدارة لضمان حماية حقوق الطرفين.'
                                        : 'Please attach clear evidence justifying the return. This data will be audited to ensure the protection of both parties\' rights.'}
                                </p>
                            </div>

                            <div className="space-y-6">
                                <div className="group">
                                    <label className="block text-[10px] font-black text-white/30 uppercase tracking-[0.2em] mb-3 ml-2">{t.dashboard.resolution.form.reason}</label>
                                    <div className="relative">
                                        <select 
                                            value={reason}
                                            onChange={(e) => setReason(e.target.value)}
                                            className={`w-full bg-[#0A0A0A] border rounded-2xl px-5 py-4 text-xs text-white outline-none transition-all appearance-none cursor-pointer ${isAr ? 'text-right' : 'text-left'}
                                            ${attemptedSubmit && !reason ? 'border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.3)]' : 'border-white/10 focus:border-cyan-500/50'}`}
                                        >
                                            <option value="" className="bg-[#0A0A0A]">{t.dashboard.common?.select || (isAr ? 'اختر السبب...' : 'Select Reason...')}</option>
                                            <option value="not_matching" className="bg-[#0A0A0A]">{t.dashboard.resolution.reasons.not_matching}</option>
                                            <option value="defective" className="bg-[#0A0A0A]">{t.dashboard.resolution.reasons.defective}</option>
                                            <option value="not_working" className="bg-[#0A0A0A]">{t.dashboard.resolution.reasons.not_working}</option>
                                            <option value="wrong_item" className="bg-[#0A0A0A]">{t.dashboard.resolution.reasons.wrong_item}</option>
                                            <option value="wrong_size" className="bg-[#0A0A0A]">{t.dashboard.resolution.reasons.wrong_size}</option>
                                            <option value="warranty_claim" className="bg-[#0A0A0A]">{t.dashboard.resolution.reasons.warranty_claim}</option>
                                            <option value="replacement" className="bg-[#0A0A0A]">{t.dashboard.resolution.reasons.replacement}</option>
                                            <option value="other" className="bg-[#0A0A0A]">{isAr ? 'أخرى - توضيح إضافي' : 'Other - Additional Context'}</option>
                                        </select>
                                        <div className={`absolute top-1/2 -translate-y-1/2 ${isAr ? 'left-6' : 'right-6'} pointer-events-none text-white/20 group-hover:text-cyan-500 transition-colors`}>
                                            {isAr ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-[10px] font-black text-white/30 uppercase tracking-[0.2em] mb-4 ml-2">
                                        {isAr ? 'حالة استخدام القطعة' : 'Item Usage Condition'}
                                    </label>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        {[
                                            { id: 'UNUSED', labelAr: 'لم يتم الاستخدام', labelEn: 'Unused' },
                                            { id: 'OPENED', labelAr: 'مفتوح الغلاف', labelEn: 'Packaging Opened' },
                                            { id: 'INSTALLED', labelAr: 'تم تركيب القطعة', labelEn: 'Item Installed' }
                                        ].map((cond) => (
                                            <button
                                                key={cond.id}
                                                type="button"
                                                onClick={() => setUsageCondition(cond.id as any)}
                                                className={`
                                                    p-4 rounded-2xl border transition-all text-center group
                                                    ${usageCondition === cond.id 
                                                        ? 'bg-cyan-500/10 border-cyan-500 text-cyan-400' 
                                                        : attemptedSubmit && !usageCondition 
                                                            ? 'bg-red-500/5 border-red-500 shadow-[0_0_10px_rgba(239,68,68,0.3)]'
                                                            : 'bg-white/5 border-white/10 text-white/40 hover:bg-white/10 hover:border-white/20'
                                                    }
                                                `}
                                            >
                                                <span className="text-[10px] font-black uppercase tracking-widest">
                                                    {isAr ? cond.labelAr : cond.labelEn}
                                                </span>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-[10px] font-black text-white/30 uppercase tracking-[0.2em] mb-3 ml-2">{t.dashboard.resolution.form.description}</label>
                                    <textarea
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                        rows={4}
                                        placeholder={isAr ? 'اشرح سبب الإرجاع بالتفصيل...' : 'Describe the reason in detail...'}
                                        className={`w-full bg-[#0A0A0A] border rounded-2xl px-5 py-4 text-xs text-white outline-none transition-all resize-none ${isAr ? 'text-right' : 'text-left'}
                                        ${attemptedSubmit && !description ? 'border-red-500' : 'border-white/10 focus:border-cyan-500/50'}`}
                                    />
                                </div>

                                <div>
                                    <label className="block text-[10px] font-black text-white/30 uppercase tracking-[0.2em] mb-3 ml-2">
                                        {isAr ? 'المرفقات (إلزامي)' : 'Evidence (Required)'}
                                    </label>
                                    <FileUploader onFilesSelected={setFiles} maxFiles={5} />
                                    {attemptedSubmit && files.length === 0 && (
                                        <p className="text-red-400 text-xs mt-2 flex items-center gap-1">
                                            <AlertCircle size={12} />
                                            {isAr ? 'يجب إرفاق صورة واحدة على الأقل' : 'At least one image is required'}
                                        </p>
                                    )}
                                </div>

                                <div className="space-y-3 pt-2">
                                    {[
                                        { key: 'integrity' as const, ar: 'أقر بصحة البيانات المقدمة', en: 'I confirm the accuracy of submitted data' },
                                        { key: 'packaging' as const, ar: 'سأعيد القطعة في تغليفها الأصلي', en: 'I will return the item in original packaging' },
                                        { key: 'policy' as const, ar: 'أوافق على سياسة الإرجاع', en: 'I agree to the return policy' },
                                    ].map((item) => (
                                        <label key={item.key} className="flex items-start gap-3 cursor-pointer group">
                                            <input
                                                type="checkbox"
                                                checked={confirmations[item.key]}
                                                onChange={(e) => setConfirmations((prev) => ({ ...prev, [item.key]: e.target.checked }))}
                                                className="mt-1 accent-cyan-500"
                                            />
                                            <span className="text-xs text-white/60 group-hover:text-white/80 transition-colors">
                                                {isAr ? item.ar : item.en}
                                            </span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                                </>
                            )}
                        </div>

                        {!needsPartPicker && activeOrderId && (!partSelectionRequired || activeOrderPartId) && (
                        <div className="p-6 border-t border-white/5 bg-black/40 space-y-3">
                            {successMessage && (
                                <p className="text-emerald-400 text-xs flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-3">
                                    <ShieldCheck size={14} />
                                    {successMessage}
                                </p>
                            )}
                            {storeError && (
                                <p className="text-red-400 text-xs flex items-center gap-2">
                                    <AlertCircle size={14} />
                                    {storeError}
                                </p>
                            )}
                            <button
                                onClick={handleSubmit}
                                disabled={isSubmitting}
                                className="w-full py-4 bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-cyan-400 text-white rounded-2xl font-black uppercase tracking-widest text-sm transition-all flex items-center justify-center gap-3 disabled:opacity-50 shadow-lg shadow-cyan-600/20"
                            >
                                {isSubmitting ? (
                                    <Loader2 className="animate-spin" size={20} />
                                ) : (
                                    <>
                                        <RotateCcw size={18} />
                                        {isAr ? 'تقديم طلب الإرجاع' : 'Submit Return Request'}
                                        <ArrowUpRight size={16} />
                                    </>
                                )}
                            </button>
                        </div>
                        )}
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};
