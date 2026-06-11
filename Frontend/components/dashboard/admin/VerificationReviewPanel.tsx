import React, { useState, useRef, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ShieldCheck, CheckCircle2, XCircle, AlertTriangle, User, Calendar,
    Clock, FileText, Camera, Video, MessageCircle, Upload, X, Eye
} from 'lucide-react';
import { useLanguage } from '../../../contexts/LanguageContext';
import { GlassCard } from '../../ui/GlassCard';
import { AdminSignatureModal } from './AdminSignatureModal';
import { isVerificationFlowStatus } from '../../../utils/orderVerificationVisibility';

interface VerificationReviewPanelProps {
    orderId: string;
    status: string;
    documents: any[];
    offers?: Array<{ id: string; orderPartId?: string; partName?: string; storeId?: string }>;
    parts?: Array<{ id: string; name: string }>;
    onReviewSubmit: (action: 'APPROVE' | 'REJECT', payload?: {
        documentId?: string;
        offerId?: string;
        reason?: string;
        rejectionImages?: string[];
        rejectionVideo?: string;
        adminSignatureName?: string;
        adminSignatureImage?: string;
        adminSignatureType?: string;
        adminSignatureText?: string;
    }) => Promise<void>;
}

function resolvePartLabel(
    doc: { offerId?: string | null },
    offers?: VerificationReviewPanelProps['offers'],
    parts?: VerificationReviewPanelProps['parts'],
    fallbackIndex = 0,
): string {
    if (!doc.offerId) return `Part ${fallbackIndex + 1}`;
    const offer = offers?.find((o) => o.id === doc.offerId);
    const partId = offer?.orderPartId;
    const part = parts?.find((p) => p.id === partId);
    return part?.name || offer?.partName || `Part ${fallbackIndex + 1}`;
}

export const VerificationReviewPanel: React.FC<VerificationReviewPanelProps> = ({
    orderId, status, documents, offers, parts, onReviewSubmit
}) => {
    const { language } = useLanguage();
    const isAr = language === 'ar';
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [actionType, setActionType] = useState<'APPROVE' | 'REJECT' | null>(null);
    const [showSignatureModal, setShowSignatureModal] = useState(false);
    const [pendingAction, setPendingAction] = useState<'APPROVE' | 'REJECT' | null>(null);
    
    const [rejectionReason, setRejectionReason] = useState('');
    const [rejectionImages, setRejectionImages] = useState<File[]>([]);
    const [rejectionImageUrls, setRejectionImageUrls] = useState<string[]>([]);
    const [rejectionVideo, setRejectionVideo] = useState<File | null>(null);
    const [rejectionVideoUrl, setRejectionVideoUrl] = useState<string | null>(null);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [error, setError] = useState('');
    const imgInputRef = useRef<HTMLInputElement>(null);
    const vidInputRef = useRef<HTMLInputElement>(null);

    const allDocs = documents || [];
    const pendingDocs = useMemo(
        () =>
            allDocs.filter(
                (d) => !d.adminStatus || String(d.adminStatus).toUpperCase() === 'PENDING',
            ),
        [allDocs],
    );

    const [activeDocId, setActiveDocId] = useState<string | null>(null);
    useEffect(() => {
        if (!allDocs.length) {
            setActiveDocId(null);
            return;
        }
        if (!activeDocId || !allDocs.some((d) => d.id === activeDocId)) {
            setActiveDocId(pendingDocs[0]?.id ?? allDocs[0].id);
        }
    }, [allDocs, pendingDocs, activeDocId]);

    useEffect(() => {
        setActionType(null);
        setRejectionReason('');
        setRejectionImages([]);
        setRejectionImageUrls([]);
        setRejectionVideo(null);
        setRejectionVideoUrl(null);
        setError('');
    }, [activeDocId]);

    const activeDoc =
        allDocs.find((d) => d.id === activeDocId) || allDocs[0];
    const hasDocuments = allDocs.length > 0;
    const activeDocStatus = String(activeDoc?.adminStatus || 'PENDING').toUpperCase();
    const isActiveDocPending = activeDocStatus === 'PENDING';
    const isPending = isActiveDocPending;
    const isHistoricalRecord = hasDocuments && !isVerificationFlowStatus(status) && pendingDocs.length === 0;
    const showPanel = hasDocuments || isVerificationFlowStatus(status);
    const isApprovedRecord = activeDocStatus === 'APPROVED';
    const isRejectedRecord = activeDocStatus === 'REJECTED';

    if (!hasDocuments) {
        if (!showPanel) return null;
        return (
            <GlassCard className="p-6 border-l-4 border-l-amber-500/50 bg-amber-500/5 mb-6 animate-pulse">
                <motion.div className="space-y-4">
                    <motion.div className="h-6 w-2/3 bg-white/10 rounded-lg" />
                    <motion.div className="h-4 w-1/2 bg-white/5 rounded-lg" />
                    <motion.div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-6">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="aspect-square rounded-xl bg-white/5 border border-white/10" />
                        ))}
                    </motion.div>
                    <p className="text-xs text-white/40 text-center pt-2">
                        {isAr ? 'جاري تحميل وثائق التوثيق...' : 'Loading verification documents...'}
                    </p>
                </motion.div>
            </GlassCard>
        );
    }

    const isListOnlyStub =
        activeDoc &&
        activeDoc.images === undefined &&
        activeDoc.videoUrl === undefined &&
        activeDoc.description === undefined &&
        activeDoc.recipientName === undefined;

    if (isListOnlyStub) {
        return (
            <GlassCard className="p-6 border-l-4 border-l-amber-500/50 bg-amber-500/5 mb-6 animate-pulse">
                <motion.div className="space-y-4">
                    <div className="h-6 w-2/3 bg-white/10 rounded-lg" />
                    <motion.div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="aspect-square rounded-xl bg-white/5 border border-white/10" />
                        ))}
                    </motion.div>
                    <p className="text-xs text-white/40 text-center">
                        {isAr ? 'جاري تحميل تفاصيل الوثائق...' : 'Loading document details...'}
                    </p>
                </motion.div>
            </GlassCard>
        );
    }

    const uploadFile = async (file: File | Blob, folder: string): Promise<string> => {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('orderId', orderId);
        formData.append('folder', `admin-review/${folder}`);

        const token = localStorage.getItem('access_token');
        const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
        
        const response = await fetch(`${API_URL}/uploads/verification`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: formData
        });

        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.message || 'File upload failed');
        }

        const data = await response.json();
        return data.url;
    };

    const handleAddRejectionImages = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files) return;
        const newFiles = Array.from(e.target.files) as File[];
        setRejectionImages(prev => [...prev, ...newFiles]);
        setRejectionImageUrls(prev => [...prev, ...newFiles.map((f: File) => URL.createObjectURL(f))]);
    };

    const handleRejectionVideo = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files?.[0]) return;
        const file: File = e.target.files[0];
        if (file.size > 50 * 1024 * 1024) {
            setError(isAr ? 'حجم الفيديو يتجاوز 50 ميجابايت' : 'Video exceeds 50MB limit');
            return;
        }
        setRejectionVideo(file);
        setRejectionVideoUrl(URL.createObjectURL(file));
    };

    const handleActionClick = (action: 'APPROVE' | 'REJECT') => {
        if (action === 'REJECT' && !rejectionReason.trim()) {
            setError(isAr ? 'سبب الرفض مطلوب' : 'Rejection reason is required');
            return;
        }
        setPendingAction(action);
        setShowSignatureModal(true);
    };

    const handleSignatureConfirm = async (sigData: {
        adminSignatureName: string;
        adminSignatureType: 'DRAWN' | 'TYPED';
        adminSignatureText?: string;
        adminSignatureImage?: string;
        adminReviewDetails?: string;
    }) => {
        if (!pendingAction) return;

        setIsSubmitting(true);
        setError('');
        setShowSignatureModal(false);
        setUploadProgress(5);

        try {
            let uploadedImages: string[] = [];
            let uploadedVideoUrl: string | undefined;
            let finalSignatureUrl = sigData.adminSignatureImage;

            // 1. Upload rejection media if any
            if (pendingAction === 'REJECT') {
                for (let i = 0; i < rejectionImages.length; i++) {
                    const url = await uploadFile(rejectionImages[i], 'rejection-images');
                    uploadedImages.push(url);
                    setUploadProgress(5 + Math.floor((40 / Math.max(rejectionImages.length, 1)) * (i + 1)));
                }
                if (rejectionVideo) {
                    uploadedVideoUrl = await uploadFile(rejectionVideo, 'rejection-video');
                    setUploadProgress(60);
                }
            }

            // 2. Upload signature if it's a drawing (data URL)
            if (sigData.adminSignatureType === 'DRAWN' && sigData.adminSignatureImage?.startsWith('data:image')) {
                const res = await fetch(sigData.adminSignatureImage);
                const blob = await res.blob();
                finalSignatureUrl = await uploadFile(blob, 'signatures');
                setUploadProgress(80);
            }

            setUploadProgress(90);
            await onReviewSubmit(pendingAction, {
                documentId: activeDoc?.id,
                offerId: activeDoc?.offerId,
                reason: sigData.adminReviewDetails || rejectionReason || undefined,
                rejectionImages: uploadedImages.length > 0 ? uploadedImages : undefined,
                rejectionVideo: uploadedVideoUrl,
                adminSignatureName: sigData.adminSignatureName,
                adminSignatureType: sigData.adminSignatureType,
                adminSignatureText: sigData.adminSignatureText,
                adminSignatureImage: finalSignatureUrl
            });
            
            setUploadProgress(100);
            setPendingAction(null);
            setActionType(null);
        } catch (err: any) {
            const raw = err?.response?.data?.message ?? err?.response?.data?.error;
            const apiMsg = Array.isArray(raw)
                ? raw.join(' · ')
                : typeof raw === 'string'
                  ? raw
                  : null;
            setError(apiMsg || err.message || (isAr ? 'حدث خطأ غير متوقع' : 'An unexpected error occurred'));
            setShowSignatureModal(true);
        } finally {
            setIsSubmitting(false);
            setUploadProgress(0);
        }
    };

    return (
        <GlassCard className={`p-6 border-l-4 mb-6 ${
            isRejectedRecord ? 'border-l-red-500 bg-red-500/5' :
            isApprovedRecord ? 'border-l-green-500 bg-green-500/5' :
            'border-l-amber-500 bg-amber-500/5'
        }`}>
            {allDocs.length > 1 && (
                <div className="flex flex-wrap gap-2 mb-6">
                    {allDocs.map((doc, idx) => {
                        const label = resolvePartLabel(doc, offers, parts, idx);
                        const isActive = doc.id === activeDoc?.id;
                        const docStatus = String(doc.adminStatus || 'PENDING').toUpperCase();
                        const isDocPending = docStatus === 'PENDING';
                        const isDocApproved = docStatus === 'APPROVED';
                        const isDocRejected = docStatus === 'REJECTED';
                        return (
                            <button
                                key={doc.id}
                                type="button"
                                onClick={() => setActiveDocId(doc.id)}
                                className={`px-3 py-2 rounded-lg text-xs font-bold border transition-colors ${
                                    isActive
                                        ? isDocApproved
                                            ? 'bg-green-500/20 border-green-500/40 text-green-200'
                                            : isDocRejected
                                              ? 'bg-red-500/20 border-red-500/40 text-red-200'
                                              : 'bg-amber-500/20 border-amber-500/40 text-amber-200'
                                        : 'bg-white/5 border-white/10 text-white/50 hover:text-white'
                                }`}
                            >
                                <span className="flex items-center gap-1.5">
                                    {isDocApproved && <CheckCircle2 size={12} className="text-green-400" />}
                                    {isDocRejected && <XCircle size={12} className="text-red-400" />}
                                    {label}
                                </span>
                                {isDocPending && (
                                    <span className="block text-[9px] text-amber-400/80 font-normal mt-0.5">
                                        {isAr ? 'قيد المراجعة' : 'Pending'}
                                    </span>
                                )}
                                {isDocApproved && (
                                    <span className="block text-[9px] text-green-400/80 font-normal mt-0.5">
                                        {isAr ? 'معتمد' : 'Approved'}
                                    </span>
                                )}
                                {isDocRejected && (
                                    <span className="block text-[9px] text-red-400/80 font-normal mt-0.5">
                                        {isAr ? 'مرفوض' : 'Rejected'}
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </div>
            )}

            {activeDoc?.offerId && (
                <p className="text-sm text-amber-400/90 mb-4 font-bold">
                    {isAr ? 'توثيق القطعة:' : 'Part verification:'}{' '}
                    {resolvePartLabel(activeDoc, offers, parts, 0)}
                </p>
            )}

            {/* Header */}
            <div className="flex items-start justify-between mb-6">
                <div>
                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                        <ShieldCheck className={
                            isRejectedRecord ? 'text-red-400' :
                            isApprovedRecord ? 'text-green-400' : 'text-amber-400'
                        } size={24} />
                        {isHistoricalRecord
                            ? (isAr ? 'سجل المطابقة والتوثيق' : 'Verification & Matching Record')
                            : (isAr ? 'المراجعة والوثائق الإلزامية قبل التسليم' : 'Mandatory Handover Verification Review')}
                    </h3>
                    <p className="text-sm text-white/50 mt-1">
                        {isHistoricalRecord
                            ? isApprovedRecord
                                ? (isAr ? 'سجل المطابقة المعتمد — محفوظ للمراجعة والتدقيق' : 'Approved verification record — kept for audit review')
                                : isRejectedRecord
                                    ? (isAr ? 'سجل رفض المطابقة — محفوظ للمراجعة والتدقيق' : 'Rejection record — kept for audit review')
                                    : (isAr ? 'سجل توثيق المطابقة — محفوظ للمراجعة والتدقيق' : 'Verification record — kept for audit review')
                            : isRejectedRecord
                            ? (isAr ? 'تم رفض توثيق هذه القطعة — بانتظار إعادة التوثيق من التاجر' : 'This part verification was rejected — awaiting merchant correction')
                            : isApprovedRecord
                            ? (isAr ? 'تم اعتماد توثيق هذه القطعة' : 'This part verification was approved')
                            : isActiveDocPending
                            ? (isAr ? 'قام البائع برفع توثيق هذه القطعة — بانتظار مراجعتك' : 'Merchant submitted this part for your review')
                            : (isAr ? 'مراجعة وثائق التوثيق لكل قطعة على حدة' : 'Review verification documents per part')}
                    </p>
                </div>
                <div className={`px-3 py-1 border rounded-lg text-xs font-bold shrink-0 ${
                    isRejectedRecord ? 'bg-red-500/10 border-red-500/20 text-red-500' :
                    isApprovedRecord ? 'bg-green-500/10 border-green-500/20 text-green-500' :
                    'bg-amber-500/10 border-amber-500/20 text-amber-500'
                }`}>
                    {isHistoricalRecord
                        ? (isAr ? 'سجل محفوظ' : 'Archived Record')
                        : isApprovedRecord
                        ? (isAr ? 'معتمد' : 'Approved')
                        : isRejectedRecord
                        ? (isAr ? 'مرفوض' : 'Rejected')
                        : isActiveDocPending
                        ? (isAr ? 'قيد المراجعة' : 'Pending review')
                        : activeDocStatus}
                </div>
            </div>

            {/* Evidence Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                {/* Photos & Video */}
                <div className="space-y-4">
                    <h4 className="text-sm font-bold text-white/70 flex items-center gap-2">
                        <Camera size={16} /> {isAr ? 'الصور والفيديو المرفق' : 'Attached Photos & Video'}
                    </h4>
                    <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                        {activeDoc.images?.map((img: string, i: number) => (
                            <a href={img} target="_blank" rel="noopener noreferrer" key={i}
                                className="aspect-square rounded-xl overflow-hidden border border-white/10 hover:border-gold-500/50 block group relative">
                                <img src={img} alt={`Part ${i}`} className="w-full h-full object-cover group-hover:scale-110 transition-transform" />
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                    <Eye size={18} className="text-white" />
                                </div>
                            </a>
                        ))}
                    </div>
                    {activeDoc.videoUrl && (
                        <div>
                            <h4 className="text-sm font-bold text-white/70 flex items-center gap-2 mb-2 mt-4">
                                <Video size={16} /> {isAr ? 'الفيديو المرفق' : 'Attached Video'}
                            </h4>
                            <div className="aspect-video w-full rounded-xl overflow-hidden border border-white/10">
                                <video src={activeDoc.videoUrl} controls className="w-full h-full object-contain bg-black/50" />
                            </div>
                        </div>
                    )}
                </div>

                {/* Handover Receipt Info */}
                <div className="space-y-6">
                    <div>
                        <h4 className="text-sm font-bold text-white/70 flex items-center gap-2 mb-3">
                            <FileText size={16} /> {isAr ? 'ملاحظات المعاينة' : 'Condition Notes'}
                        </h4>
                        <div className="bg-white/5 rounded-xl p-4 border border-white/10 text-sm text-white/80 min-h-[60px]">
                            {activeDoc.description || <span className="text-white/30 italic">{isAr ? 'لا توجد ملاحظات إضافية' : 'No additional notes'}</span>}
                        </div>
                    </div>

                    <div>
                        <h4 className="text-sm font-bold text-white/70 flex items-center gap-2 mb-3">
                            <User size={16} /> {isAr ? 'وصل تفويض الاستلام (المندوب)' : 'Courier Handover Receipt'}
                        </h4>
                        <div className="bg-white/5 p-4 rounded-xl border border-white/10 space-y-3 font-mono text-sm">
                            <div className="flex justify-between items-center border-b border-white/5 pb-2">
                                <span className="text-white/40">{isAr ? 'الاسم' : 'Name'}</span>
                                <span className="text-white font-bold">{activeDoc.recipientName || 'N/A'}</span>
                            </div>
                            <div className="flex justify-between items-center border-b border-white/5 pb-2">
                                <span className="text-white/40">{isAr ? 'تاريخ التسليم' : 'Handover Date'}</span>
                                <span className="text-white flex items-center gap-2">
                                    <Calendar size={14} className="text-white/40" />
                                    {activeDoc.handoverDate ? new Date(activeDoc.handoverDate).toLocaleDateString('en-GB') : 'N/A'}
                                </span>
                            </div>
                            <div className="flex justify-between items-center border-b border-white/5 pb-2">
                                <span className="text-white/40">{isAr ? 'وقت التسليم' : 'Handover Time'}</span>
                                <span className="text-white flex items-center gap-2">
                                    <Clock size={14} className="text-white/40" />
                                    {activeDoc.handoverTime || 'N/A'}
                                </span>
                            </div>
                            <div>
                                <span className="text-white/40 block mb-2">
                                    {isAr ? 'التوقيع الرقمي' : 'Digital Signature'} 
                                    {activeDoc.signatureType === 'TYPED' && <span className="text-amber-400/80 text-xs ms-1">({isAr ? 'مكتوب' : 'Typed'})</span>}
                                </span>
                                {activeDoc.signatureType === 'TYPED' && activeDoc.signatureText ? (
                                    <div className="bg-white/10 p-4 rounded-lg text-center flex items-center justify-center min-h-[60px] border border-white/10">
                                        <p className="text-2xl text-amber-500 font-bold tracking-wider" style={{ fontFamily: '"Brush Script MT", cursive, sans-serif' }}>
                                            {activeDoc.signatureText}
                                        </p>
                                    </div>
                                ) : activeDoc.recipientSignature ? (
                                    <div className="bg-white/10 p-2 rounded-lg text-center h-24 overflow-hidden border border-white/10">
                                        <img src={activeDoc.recipientSignature} alt="Signature" className="h-full mx-auto object-contain" />
                                    </div>
                                ) : (
                                    <div className="bg-white/5 p-4 rounded-lg text-center text-red-400 italic text-xs">
                                        {isAr ? 'لا يوجد توقيع' : 'No Signature'}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Admin Rejection Evidence (if already rejected and docs exist) */}
            {activeDoc.adminStatus === 'REJECTED' && activeDoc.adminRejectionReason && (
                <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl space-y-4">
                    <div className="flex justify-between items-start">
                        <div className="space-y-1">
                            <h4 className="text-sm font-bold text-red-400 flex items-center gap-2">
                                <XCircle size={16} /> {isAr ? 'سبب الرفض المسجّل من الإدارة' : 'Admin Rejection Reason on Record'}
                            </h4>
                            <p className="text-white/80 text-sm">{activeDoc.adminRejectionReason}</p>
                        </div>
                        {activeDoc.adminReviewedAt && (
                            <div className="text-[10px] text-white/30 font-mono">
                                {new Date(activeDoc.adminReviewedAt).toLocaleString(isAr ? 'ar-EG' : 'en-GB')}
                            </div>
                        )}
                    </div>

                    {/* Admin Signature Display */}
                    {activeDoc.adminSignatureName && (
                        <div className="pt-3 border-t border-red-500/10 flex flex-wrap gap-4 items-end">
                            <div className="space-y-1">
                                <span className="text-[10px] text-white/40 block">{isAr ? 'الموظف المراجع' : 'Reviewing Officer'}</span>
                                <span className="text-xs font-bold text-white">{activeDoc.adminSignatureName}</span>
                            </div>
                            <div className="space-y-1">
                                <span className="text-[10px] text-white/40 block">{isAr ? 'التوقيع الإداري' : 'Admin Signature'}</span>
                                {activeDoc.adminSignatureType === 'TYPED' ? (
                                    <span className="text-xl text-red-400 font-bold" style={{ fontFamily: '"Brush Script MT", cursive, sans-serif' }}>
                                        {activeDoc.adminSignatureText}
                                    </span>
                                ) : activeDoc.adminSignatureImage ? (
                                    <img src={activeDoc.adminSignatureImage} alt="Admin Sig" className="h-8 object-contain brightness-125" />
                                ) : null}
                            </div>
                        </div>
                    )}

                    {activeDoc.adminRejectionImages?.length > 0 && (
                        <div className="grid grid-cols-3 gap-2 mt-2">
                            {activeDoc.adminRejectionImages.map((img: string, i: number) => (
                                <a key={i} href={img} target="_blank" rel="noopener noreferrer"
                                    className="aspect-square rounded-xl overflow-hidden border border-red-500/20">
                                    <img src={img} alt="" className="w-full h-full object-cover" />
                                </a>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Approval Info & Signature if Approved */}
            {activeDoc.adminStatus === 'APPROVED' && activeDoc.adminSignatureName && (
                <div className="mb-6 p-4 bg-green-500/10 border border-green-500/20 rounded-xl space-y-4">
                    <div className="flex justify-between items-start">
                        <div className="space-y-1">
                            <h4 className="text-sm font-bold text-green-400 flex items-center gap-2">
                                <CheckCircle2 size={16} /> {isAr ? 'تم اعتماد مطابقة القطعة' : 'Part Compliance Approved'}
                            </h4>
                            <p className="text-white/80 text-sm">{isAr ? 'تمت مراجعة القطعة وتوثيق مطابقتها للمستندات والطلب.' : 'The part has been reviewed and verified against documents and order.'}</p>
                        </div>
                        {activeDoc.adminReviewedAt && (
                            <div className="text-[10px] text-white/30 font-mono">
                                {new Date(activeDoc.adminReviewedAt).toLocaleString(isAr ? 'ar-EG' : 'en-GB')}
                            </div>
                        )}
                    </div>

                    <div className="pt-3 border-t border-green-500/10 flex flex-wrap gap-6 items-end">
                        <div className="space-y-1">
                            <span className="text-[10px] text-white/40 block">{isAr ? 'الموظف المراجع' : 'Reviewing Officer'}</span>
                            <span className="text-xs font-bold text-white">{activeDoc.adminSignatureName}</span>
                        </div>
                        <div className="space-y-1">
                            <span className="text-[10px] text-white/40 block">{isAr ? 'التوقيع الإداري' : 'Admin Signature'}</span>
                            {activeDoc.adminSignatureType === 'TYPED' ? (
                                <span className="text-xl text-green-400 font-bold" style={{ fontFamily: '"Brush Script MT", cursive, sans-serif' }}>
                                    {activeDoc.adminSignatureText}
                                </span>
                            ) : activeDoc.adminSignatureImage ? (
                                <img src={activeDoc.adminSignatureImage} alt="Admin Sig" className="h-8 object-contain brightness-125 saturate-150" />
                            ) : null}
                        </div>
                    </div>
                </div>
            )}

            {/* Error Display */}
            {error && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-4 rounded-xl flex items-center gap-3 mb-6">
                    <AlertTriangle size={20} />
                    <p className="text-sm font-bold">{error}</p>
                </div>
            )}

            {/* Upload Progress */}
            {isSubmitting && uploadProgress > 0 && (
                <div className="mb-4">
                    <div className="flex justify-between text-xs text-white/50 mb-1">
                        <span>{isAr ? 'جارٍ الرفع...' : 'Uploading...'}</span>
                        <span>{uploadProgress}%</span>
                    </div>
                    <div className="w-full bg-white/10 rounded-full h-1.5">
                        <motion.div
                            className="bg-primary-500 h-1.5 rounded-full"
                            initial={{ width: 0 }}
                            animate={{ width: `${uploadProgress}%` }}
                            transition={{ duration: 0.3 }}
                        />
                    </div>
                </div>
            )}

            {/* Action Buttons */}
            {isPending && (
                <div className="pt-6 border-t border-white/10">
                    <AnimatePresence>
                        {actionType === 'REJECT' ? (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="space-y-4"
                            >
                                {/* Rejection Reason */}
                                <div>
                                    <label className="text-sm font-bold text-white flex items-center gap-2 mb-2">
                                        <MessageCircle size={16} /> {isAr ? 'سبب عدم المطابقة / الرفض' : 'Reason for Non-Matching / Rejection'} <span className="text-red-500">*</span>
                                    </label>
                                    <textarea
                                        value={rejectionReason}
                                        onChange={(e) => { setRejectionReason(e.target.value); if (error) setError(''); }}
                                        placeholder={isAr
                                            ? 'اكتب ملاحظاتك بوضوح وتوضيح سبب رفض التوثيق للتاجر ليقوم بالتصحيح...'
                                            : 'Write clear notes explaining the rejection for the merchant to correct...'}
                                        className="w-full bg-white/5 border border-red-500/30 focus:border-red-500 rounded-xl p-4 text-white focus:outline-none transition-colors resize-none"
                                        rows={3}
                                    />
                                </div>

                                {/* Rejection Evidence - Images */}
                                <div>
                                    <label className="text-sm font-bold text-white/70 flex items-center gap-2 mb-2">
                                        <Camera size={16} /> {isAr ? 'صور دليل الرفض (اختياري)' : 'Rejection Evidence Photos (Optional)'}
                                    </label>
                                    <div className="grid grid-cols-3 gap-2">
                                        {rejectionImageUrls.map((url, i) => (
                                            <div key={i} className="relative aspect-square rounded-xl overflow-hidden border border-white/10 group">
                                                <img src={url} alt="" className="w-full h-full object-cover" />
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setRejectionImages(p => p.filter((_, idx) => idx !== i));
                                                        setRejectionImageUrls(p => p.filter((_, idx) => idx !== i));
                                                    }}
                                                    className="absolute top-1 right-1 bg-red-500/80 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                                >
                                                    <X size={12} />
                                                </button>
                                            </div>
                                        ))}
                                        <label className="aspect-square rounded-xl border-2 border-dashed border-white/20 hover:border-red-500/40 flex flex-col items-center justify-center cursor-pointer bg-white/5 hover:bg-white/10 transition-colors">
                                            <Camera size={18} className="text-white/40 mb-1" />
                                            <span className="text-[10px] text-white/40">{isAr ? 'إضافة' : 'Add'}</span>
                                            <input ref={imgInputRef} type="file" multiple accept="image/*" onChange={handleAddRejectionImages} className="hidden" />
                                        </label>
                                    </div>
                                </div>

                                {/* Rejection Evidence - Video */}
                                <div>
                                    <label className="text-sm font-bold text-white/70 flex items-center gap-2 mb-2">
                                        <Video size={16} /> {isAr ? 'فيديو دليل الرفض (اختياري، حد 50MB)' : 'Rejection Evidence Video (Optional, max 50MB)'}
                                    </label>
                                    {rejectionVideoUrl ? (
                                        <div className="relative aspect-video rounded-xl overflow-hidden border border-white/10">
                                            <video src={rejectionVideoUrl} controls className="w-full h-full object-contain bg-black/50" />
                                            <button
                                                type="button"
                                                onClick={() => { setRejectionVideo(null); setRejectionVideoUrl(null); }}
                                                className="absolute top-2 right-2 bg-red-500/90 text-white p-1.5 rounded-full hover:bg-red-600 transition-colors z-10"
                                            >
                                                <X size={14} />
                                            </button>
                                        </div>
                                    ) : (
                                        <label className="flex flex-col items-center justify-center py-6 rounded-xl border-2 border-dashed border-white/20 hover:border-red-500/40 bg-white/5 hover:bg-white/10 transition-colors cursor-pointer">
                                            <Upload size={20} className="text-white/40 mb-2" />
                                            <span className="text-sm text-white/50">{isAr ? 'اضغط لرفع فيديو' : 'Click to upload video'}</span>
                                            <input ref={vidInputRef} type="file" accept="video/*" onChange={handleRejectionVideo} className="hidden" />
                                        </label>
                                    )}
                                </div>

                                {/* Submit / Cancel */}
                                <div className="flex justify-end gap-3">
                                    <button
                                        onClick={() => { setActionType(null); setError(''); }}
                                        disabled={isSubmitting}
                                        className="px-6 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-white disabled:opacity-50 transition-colors"
                                    >
                                        {isAr ? 'تراجع' : 'Cancel'}
                                    </button>
                                    <button
                                        onClick={() => handleActionClick('REJECT')}
                                        disabled={isSubmitting || !rejectionReason.trim()}
                                        className="px-6 py-2 rounded-lg bg-red-500 hover:bg-red-600 text-white font-bold disabled:opacity-50 flex items-center gap-2 transition-colors shadow-lg shadow-red-500/20"
                                    >
                                        {isSubmitting ? (
                                            <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                                        ) : <XCircle size={18} />}
                                        {isAr ? 'رفض وإرسال إشعار التصحيح' : 'Reject & Issue Correction Notice'}
                                    </button>
                                </div>
                            </motion.div>
                        ) : (
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
                                <button
                                    onClick={() => setActionType('REJECT')}
                                    className="w-full py-4 rounded-xl border-2 border-red-500/20 bg-red-500/5 hover:bg-red-500/10 text-red-500 font-bold transition-colors flex items-center justify-center gap-2"
                                >
                                    <XCircle size={20} />
                                    {isAr ? 'رفض لعدم المطابقة' : 'Reject - Non Matching'}
                                </button>
                                <button
                                    onClick={() => handleActionClick('APPROVE')}
                                    disabled={isSubmitting}
                                    className="w-full py-4 rounded-xl bg-green-500 hover:bg-green-600 text-white font-bold transition-colors shadow-[0_0_20px_rgba(34,197,94,0.3)] flex items-center justify-center gap-2 disabled:opacity-50"
                                >
                                    {isSubmitting
                                        ? <span className="w-5 h-5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                                        : <CheckCircle2 size={20} />}
                                    {isAr ? 'اعتماد التوثيق - مطابق' : 'Approve Verification - Matching'}
                                </button>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            )}

            {/* Signature Modal */}
            <AdminSignatureModal
                isOpen={showSignatureModal}
                onClose={() => setShowSignatureModal(false)}
                onConfirm={handleSignatureConfirm}
                actionType={pendingAction || 'APPROVE'}
                initialDetails={rejectionReason}
            />
        </GlassCard>
    );
};
