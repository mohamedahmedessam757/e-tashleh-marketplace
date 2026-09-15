import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Camera, Video, Upload, X, Save, AlertCircle, FileText, User, Calendar, Clock, PenTool, ShieldCheck, ImagePlus } from 'lucide-react';
import { useLanguage } from '../../../contexts/LanguageContext';
import { GlassCard } from '../../ui/GlassCard';
import { client } from '../../../services/api/client';
import { compressImageForUpload } from '../../../utils/compressImage';
import { getServerNowMs, syncServerClock } from '../../../utils/serverClock';

interface VerificationFormProps {
    orderId: string;
    isCorrection?: boolean;
    existingData?: any;
    /** Changes when switching parts — clears the form for a fresh submission */
    resetKey?: string;
    isReadOnly?: boolean;
    onSubmit: (data: any) => Promise<void>;
    onCancel: () => void;
}

/** Local calendar date from epoch ms — never use toISOString().split (UTC day shift). */
function formatLocalDate(ms: number): string {
    const d = new Date(ms);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

function formatLocalTime(ms: number): string {
    const d = new Date(ms);
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function parseHandoverMs(dateStr: string, timeStr: string): number {
    const [y, mo, da] = dateStr.split('-').map(Number);
    const [hh, mm] = timeStr.split(':').map(Number);
    if (![y, mo, da, hh, mm].every((n) => Number.isFinite(n))) return NaN;
    return new Date(y, mo - 1, da, hh, mm, 0, 0).getTime();
}

function buildInitialFormState(existingData?: any) {
    let handoverDate = '';
    if (existingData?.handoverDate) {
        const raw = existingData.handoverDate;
        if (typeof raw === 'string' && /^\d{4}-\d{2}-\d{2}/.test(raw)) {
            handoverDate = raw.slice(0, 10);
        } else {
            handoverDate = formatLocalDate(new Date(raw).getTime());
        }
    }
    return {
        images: [] as File[],
        imageUrls: (existingData?.images as string[]) || [],
        video: null as File | null,
        videoUrl: (existingData?.videoUrl as string) || null,
        description: existingData?.description || '',
        recipientName: existingData?.recipientName || '',
        handoverDate,
        handoverTime: existingData?.handoverTime || '',
        recipientSignature: (existingData?.recipientSignature as string) || null,
        signatureType: (existingData?.signatureType as 'DRAWN' | 'TYPED') || 'DRAWN',
        signatureText: existingData?.signatureText || '',
    };
}

export const VerificationForm: React.FC<VerificationFormProps> = ({
    orderId,
    isCorrection = false,
    existingData = null,
    resetKey = 'default',
    isReadOnly = false,
    onSubmit,
    onCancel
}) => {
    const { t, language } = useLanguage();
    const isAr = language === 'ar';
    const vt = (t.dashboard as any)?.merchant?.verificationForm;

    const [imageUrls, setImageUrls] = useState<string[]>(existingData?.images || []);
    const [videoUrl, setVideoUrl] = useState<string | null>(existingData?.videoUrl || null);
    
    const [description, setDescription] = useState(existingData?.description || '');
    const [recipientName, setRecipientName] = useState(existingData?.recipientName || '');
    const [handoverDate, setHandoverDate] = useState(() => buildInitialFormState(existingData).handoverDate);
    const [handoverTime, setHandoverTime] = useState(existingData?.handoverTime || '');
    const [recipientSignature, setRecipientSignature] = useState<string | null>(existingData?.recipientSignature || null);
    const [signatureType, setSignatureType] = useState<'DRAWN' | 'TYPED'>(existingData?.signatureType || 'DRAWN');
    const [signatureText, setSignatureText] = useState(existingData?.signatureText || '');

    const [errors, setErrors] = useState<Record<string, string>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [mediaUploading, setMediaUploading] = useState(0);
    const [minDate, setMinDate] = useState(() => formatLocalDate(getServerNowMs()));
    const [minTime, setMinTime] = useState(() => formatLocalTime(getServerNowMs()));

    const signatureRef = useRef<HTMLCanvasElement>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const galleryImageRef = useRef<HTMLInputElement>(null);
    const cameraImageRef = useRef<HTMLInputElement>(null);
    const galleryVideoRef = useRef<HTMLInputElement>(null);
    const cameraVideoRef = useRef<HTMLInputElement>(null);

    const refreshServerMin = useCallback(async () => {
        await syncServerClock(true);
        const now = getServerNowMs();
        setMinDate(formatLocalDate(now));
        setMinTime(formatLocalTime(now));
    }, []);

    useEffect(() => {
        void refreshServerMin();
    }, [refreshServerMin, resetKey]);

    useEffect(() => {
        const initial = buildInitialFormState(existingData);
        setImageUrls(initial.imageUrls);
        setVideoUrl(initial.videoUrl);
        setDescription(initial.description);
        setRecipientName(initial.recipientName);
        setHandoverDate(initial.handoverDate);
        setHandoverTime(initial.handoverTime);
        setRecipientSignature(initial.recipientSignature);
        setSignatureType(initial.signatureType);
        setSignatureText(initial.signatureText);
        setErrors({});
        setMediaUploading(0);
        const canvas = signatureRef.current;
        const ctx = canvas?.getContext('2d');
        if (canvas && ctx) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
    }, [resetKey]);

    useEffect(() => {
        const canvas = signatureRef.current;
        if (canvas) {
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.lineWidth = 3;
                ctx.lineCap = 'round';
                ctx.lineJoin = 'round';
                ctx.strokeStyle = '#f59e0b';
                ctx.shadowColor = 'rgba(245, 158, 11, 0.4)';
                ctx.shadowBlur = 4;
            }
        }
    }, [isReadOnly, recipientSignature]);

    const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
        if (isReadOnly) return;
        setIsDrawing(true);
        const canvas = signatureRef.current;
        const ctx = canvas?.getContext('2d');
        if (!canvas || !ctx) return;
        
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.strokeStyle = '#f59e0b';
        
        const rect = canvas.getBoundingClientRect();
        const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
        
        const x = (clientX - rect.left) * (canvas.width / rect.width);
        const y = (clientY - rect.top) * (canvas.height / rect.height);
        
        ctx.beginPath();
        ctx.moveTo(x, y);
    };

    const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
        if (!isDrawing || isReadOnly) return;
        const canvas = signatureRef.current;
        const ctx = canvas?.getContext('2d');
        if (!canvas || !ctx) return;

        const rect = canvas.getBoundingClientRect();
        const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
        
        const x = (clientX - rect.left) * (canvas.width / rect.width);
        const y = (clientY - rect.top) * (canvas.height / rect.height);
        
        ctx.lineTo(x, y);
        ctx.stroke();
    };

    const stopDrawing = () => {
        if (!isDrawing) return;
        setIsDrawing(false);
        const canvas = signatureRef.current;
        if (canvas) {
            setRecipientSignature(canvas.toDataURL('image/png'));
        }
        if (errors.signature) {
            setErrors(prev => ({ ...prev, signature: '' }));
        }
    };

    const clearSignature = () => {
        if (isReadOnly) return;
        const canvas = signatureRef.current;
        const ctx = canvas?.getContext('2d');
        if (canvas && ctx) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            setRecipientSignature(null);
        }
    };

    const uploadFile = async (file: File, folder: string): Promise<string> => {
        const payload =
            file.type.startsWith('image/') && folder === 'images'
                ? await compressImageForUpload(file)
                : file;
        const formData = new FormData();
        formData.append('file', payload);
        formData.append('orderId', orderId.toString());
        formData.append('folder', folder);

        const { data } = await client.post('/uploads/verification', formData);
        if (!data?.url) {
            throw new Error('Upload did not return a URL');
        }
        return data.url;
    };

    const beginMediaUpload = () => setMediaUploading((n) => n + 1);
    const endMediaUpload = () => setMediaUploading((n) => Math.max(0, n - 1));

    const handleImageFiles = async (fileList: FileList | null) => {
        if (!fileList?.length || isReadOnly) return;
        const newFiles = Array.from(fileList);
        const placeholders = newFiles.map((file) => URL.createObjectURL(file));
        setImageUrls((prev) => [...prev, ...placeholders]);
        if (errors.images) setErrors((prev) => ({ ...prev, images: '' }));

        await Promise.all(
            newFiles.map(async (file, i) => {
                const placeholder = placeholders[i];
                beginMediaUpload();
                try {
                    const url = await uploadFile(file, 'images');
                    setImageUrls((prev) =>
                        prev.map((u) => (u === placeholder ? url : u)),
                    );
                    URL.revokeObjectURL(placeholder);
                } catch (err: any) {
                    setImageUrls((prev) => prev.filter((u) => u !== placeholder));
                    URL.revokeObjectURL(placeholder);
                    setErrors((prev) => ({
                        ...prev,
                        images:
                            err?.response?.data?.message ||
                            err?.message ||
                            (vt?.uploadFailed ||
                                (isAr ? 'فشل رفع الصورة' : 'Image upload failed')),
                    }));
                } finally {
                    endMediaUpload();
                }
            }),
        );
    };

    const removeImage = (index: number) => {
        if (isReadOnly) return;
        setImageUrls((prev) => {
            const url = prev[index];
            if (url?.startsWith('blob:')) URL.revokeObjectURL(url);
            return prev.filter((_, i) => i !== index);
        });
    };

    const handleVideoFile = async (fileList: FileList | null) => {
        if (!fileList?.[0] || isReadOnly) return;
        const file = fileList[0];
        const MAX_VIDEO_MB = 50;
        if (file.size > MAX_VIDEO_MB * 1024 * 1024) {
            setErrors((prev) => ({
                ...prev,
                video:
                    vt?.videoTooLarge ||
                    (isAr
                        ? `الحد الأقصى لحجم الفيديو ${MAX_VIDEO_MB} ميجابايت`
                        : `Max video size is ${MAX_VIDEO_MB}MB`),
            }));
            return;
        }
        const preview = URL.createObjectURL(file);
        setVideoUrl(preview);
        if (errors.video) setErrors((prev) => ({ ...prev, video: '' }));

        beginMediaUpload();
        try {
            const url = await uploadFile(file, 'videos');
            setVideoUrl((current) => {
                if (current === preview) URL.revokeObjectURL(preview);
                return url;
            });
        } catch (err: any) {
            setVideoUrl(null);
            URL.revokeObjectURL(preview);
            setErrors((prev) => ({
                ...prev,
                video:
                    err?.response?.data?.message ||
                    err?.message ||
                    (vt?.uploadFailed || (isAr ? 'فشل رفع الفيديو' : 'Video upload failed')),
            }));
        } finally {
            endMediaUpload();
        }
    };

    const validate = () => {
        const newErrors: Record<string, string> = {};
        const httpImages = imageUrls.filter((u) => u.startsWith('http'));
        if (mediaUploading > 0) {
            newErrors.submit =
                vt?.waitUploads ||
                (isAr ? 'انتظر اكتمال رفع الملفات أولاً' : 'Wait for uploads to finish first');
        }
        if (httpImages.length === 0) {
            newErrors.images =
                vt?.imagesRequired ||
                (isAr ? 'يجب إرفاق صورة واحدة على الأقل' : 'At least one image is required');
        }
        if (!videoUrl || !videoUrl.startsWith('http')) {
            newErrors.video =
                vt?.videoRequired ||
                (isAr ? 'يجب إرفاق فيديو يوضح حالة القطعة' : 'A video showing the part condition is required');
        }
        if (!recipientName.trim()) {
            newErrors.recipientName =
                vt?.courierRequired || (isAr ? 'اسم المندوب مطلوب' : 'Courier name is required');
        }
        if (!handoverDate) {
            newErrors.handoverDate =
                vt?.dateRequired || (isAr ? 'تاريخ التسليم مطلوب' : 'Handover date is required');
        }
        if (!handoverTime) {
            newErrors.handoverTime =
                vt?.timeRequired || (isAr ? 'وقت التسليم مطلوب' : 'Handover time is required');
        }
        if (handoverDate && handoverTime) {
            const handoverMs = parseHandoverMs(handoverDate, handoverTime);
            const serverNow = getServerNowMs();
            if (!Number.isFinite(handoverMs) || handoverMs < serverNow - 60_000) {
                newErrors.handoverDate =
                    vt?.pastDatetime ||
                    (isAr
                        ? 'لا يمكن اختيار تاريخ أو وقت في الماضي'
                        : 'Handover date/time cannot be in the past');
                newErrors.handoverTime = newErrors.handoverDate;
            }
        }
        const isSignatureInvalid = signatureType === 'DRAWN' ? !recipientSignature : !signatureText.trim();
        if (isSignatureInvalid) {
            newErrors.signature =
                vt?.signatureRequired ||
                (isAr ? 'توقيع المندوب مطلوب' : 'Courier signature is required');
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (isReadOnly) return;
        await refreshServerMin();
        if (!validate()) {
            window.scrollTo({ top: 0, behavior: 'smooth' });
            return;
        }

        setIsSubmitting(true);
        setUploadProgress(20);
        try {
            const finalImageUrls = imageUrls.filter((url) => url.startsWith('http'));
            if (!finalImageUrls.length) {
                throw new Error(
                    vt?.imagesRequired ||
                        (isAr ? 'يجب رفع جميع الصور قبل الإرسال' : 'All images must be uploaded before submitting'),
                );
            }
            if (!videoUrl?.startsWith('http')) {
                throw new Error(
                    vt?.videoRequired ||
                        (isAr ? 'يجب رفع الفيديو قبل الإرسال' : 'Video must be uploaded before submitting'),
                );
            }
            setUploadProgress(70);

            let finalSignatureUrl = recipientSignature;
            if (recipientSignature && recipientSignature.startsWith('data:image')) {
                const res = await fetch(recipientSignature);
                const blob = await res.blob();
                const sigFile = new File([blob], 'signature.png', { type: 'image/png' });
                finalSignatureUrl = await uploadFile(sigFile, 'signatures');
            }
            
            setUploadProgress(90);

            const payload = {
                images: finalImageUrls,
                videoUrl,
                description,
                recipientName,
                handoverDate,
                handoverTime,
                recipientSignature: signatureType === 'DRAWN' ? finalSignatureUrl : null,
                signatureType,
                signatureText: signatureType === 'TYPED' ? signatureText : null
            };

            await onSubmit(payload);
            setUploadProgress(100);
        } catch (error: any) {
            console.error('Submission error:', error);
            const data = error?.response?.data;
            const apiMsg =
                (isAr && data?.messageAr) ||
                (!isAr && data?.messageEn) ||
                (typeof data?.message === 'string' ? data.message : null) ||
                (Array.isArray(data?.message) ? data.message.join(', ') : null);
            setErrors({
                submit:
                    apiMsg ||
                    error?.message ||
                    (vt?.submitFailed ||
                        (isAr
                            ? 'حدث خطأ أثناء رفع الملفات، يرجى المحاولة مرة أخرى.'
                            : 'Error uploading files, please try again.')),
            });
        } finally {
            setIsSubmitting(false);
            setUploadProgress(0);
        }
    };

    const timeMinAttr = handoverDate && handoverDate === minDate ? minTime : undefined;

    const inputClasses = (errorField: string) => `
        w-full bg-[#0D0B07]/40 backdrop-blur-md border rounded-xl px-4 py-3 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 transition-all duration-300
        ${errors[errorField] ? 'border-red-500/50 focus:ring-red-500/20 shadow-[0_0_20px_rgba(239,68,68,0.25)]' : 'border-white/10 focus:border-amber-500/40 focus:ring-amber-500/10 shadow-[0_4px_25px_rgba(0,0,0,0.3)]'}
        ${isReadOnly ? 'opacity-70 cursor-not-allowed' : ''}
    `;

    const mediaChoiceBtn =
        'flex-1 min-w-[120px] flex flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed border-white/20 hover:border-amber-500/40 bg-white/5 hover:bg-white/10 transition-all cursor-pointer py-4 px-3 text-center group';

    return (
        <GlassCard className="p-4 sm:p-6 md:p-8 border border-white/10 shadow-2xl relative overflow-hidden min-w-0">
            <div className={`absolute top-0 right-0 w-64 h-64 blur-[80px] rounded-full pointer-events-none ${isCorrection ? 'bg-amber-500/10' : 'bg-primary-500/10'}`} />

            <form onSubmit={handleSubmit} className="space-y-5 sm:space-y-8 relative z-10" dir={isAr ? 'rtl' : 'ltr'}>
                <div className="flex flex-wrap items-start justify-between gap-2 sm:gap-3 mb-6 min-w-0">
                    <div className="min-w-0">
                        <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-white flex flex-wrap items-center gap-2 sm:gap-3">
                            <ShieldCheck className={`w-8 h-8 ${isCorrection ? 'text-amber-500 animate-pulse' : 'text-primary-400'}`} />
                            {isCorrection 
                                ? (vt?.titleCorrection || (isAr ? 'إعادة توثيق حالة القطعة' : 'Re-Submit Part Verification'))
                                : (vt?.title || (isAr ? 'توثيق وتسليم القطعة' : 'Part Handover Verification'))}
                        </h2>
                        <p className="text-white/60 mt-2 text-sm md:text-base">
                            {vt?.subtitle ||
                                (isAr 
                                    ? 'يرجى تقديم أدلة واضحة توضح حالة القطعة قبل تسليمها للمندوب لضمان حقوقك.'
                                    : 'Please provide clear evidence of the part condition before handover.')}
                        </p>
                    </div>
                </div>

                {errors.submit && (
                    <div className="bg-red-500/10 border border-red-500/30 text-red-500 p-4 rounded-xl flex items-center gap-3 shadow-[0_0_15px_rgba(239,68,68,0.1)]">
                        <AlertCircle className="w-5 h-5 flex-shrink-0" />
                        <p className="text-sm font-bold">{errors.submit}</p>
                    </div>
                )}

                {mediaUploading > 0 && (
                    <div className="bg-amber-500/10 border border-amber-500/30 text-amber-300 p-3 rounded-xl text-sm font-medium">
                        {vt?.uploading || (isAr ? 'جاري رفع الملفات…' : 'Uploading media…')}
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className={`bg-[#0A0906]/30 backdrop-blur-md rounded-2xl p-6 border transition-all duration-300 ${errors.images ? 'border-red-500/50 shadow-[0_0_20px_rgba(239,68,68,0.2)]' : 'border-white/5 hover:border-white/10 shadow-[0_10px_30px_rgba(0,0,0,0.4)]'}`}>
                        <label className="flex items-center gap-2 text-sm font-bold text-white/80 mb-4">
                            <Camera className="w-5 h-5 text-amber-500" />
                            {vt?.imagesLabel || (isAr ? 'صور واضحة للقطعة (مطلوب صورة واحدة على الأقل)' : 'Clear part images (Min 1 required)')} <span className="text-red-500">*</span>
                        </label>
                        
                        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
                            {imageUrls.map((url, index) => (
                                <div key={`${url}-${index}`} className="relative aspect-square rounded-xl overflow-hidden group border border-white/10 hover:border-amber-500/40 transition-colors">
                                    <img src={url} alt={`Part ${index + 1}`} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                    {!url.startsWith('http') && (
                                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                                            <div className="w-5 h-5 border-2 border-amber-400/40 border-t-amber-400 rounded-full animate-spin" />
                                        </div>
                                    )}
                                    {!isReadOnly && (
                                        <button 
                                            type="button" 
                                            onClick={() => removeImage(index)}
                                            className="absolute top-2 right-2 bg-red-500/80 hover:bg-red-600 text-white p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>

                        {!isReadOnly && (
                            <div className="flex flex-wrap gap-2">
                                <button
                                    type="button"
                                    className={mediaChoiceBtn}
                                    onClick={() => galleryImageRef.current?.click()}
                                >
                                    <ImagePlus className="w-5 h-5 text-white/40 group-hover:text-amber-500" />
                                    <span className="text-xs text-white/60 group-hover:text-amber-400">
                                        {vt?.uploadImage || (isAr ? 'رفع صورة' : 'Upload image')}
                                    </span>
                                </button>
                                <button
                                    type="button"
                                    className={mediaChoiceBtn}
                                    onClick={() => cameraImageRef.current?.click()}
                                >
                                    <Camera className="w-5 h-5 text-white/40 group-hover:text-amber-500" />
                                    <span className="text-xs text-white/60 group-hover:text-amber-400">
                                        {vt?.captureImage || (isAr ? 'التقاط بالكاميرا' : 'Take photo')}
                                    </span>
                                </button>
                                <input
                                    ref={galleryImageRef}
                                    type="file"
                                    multiple
                                    accept="image/*"
                                    className="hidden"
                                    onChange={(e) => {
                                        void handleImageFiles(e.target.files);
                                        e.target.value = '';
                                    }}
                                />
                                <input
                                    ref={cameraImageRef}
                                    type="file"
                                    accept="image/*"
                                    capture="environment"
                                    className="hidden"
                                    onChange={(e) => {
                                        void handleImageFiles(e.target.files);
                                        e.target.value = '';
                                    }}
                                />
                            </div>
                        )}
                        {errors.images && <p className="text-red-500 text-xs mt-2">{errors.images}</p>}
                    </div>

                    <div className={`bg-[#0A0906]/30 backdrop-blur-md rounded-2xl p-6 border transition-all duration-300 ${errors.video ? 'border-red-500/50 shadow-[0_0_20px_rgba(239,68,68,0.2)]' : 'border-white/5 hover:border-white/10 shadow-[0_10px_30px_rgba(0,0,0,0.4)]'}`}>
                        <label className="flex items-center gap-2 text-sm font-bold text-white/80 mb-4">
                            <Video className="w-5 h-5 text-purple-400" />
                            {vt?.videoLabel || (isAr ? 'فيديو يوضح القطعة من جميع الاتجاهات' : 'Video showing all part angles')} <span className="text-red-500">*</span>
                        </label>

                        {videoUrl ? (
                            <div className="relative aspect-video rounded-xl overflow-hidden border border-white/10 group">
                                <video src={videoUrl} controls className="w-full h-full object-cover bg-black/50" />
                                {!videoUrl.startsWith('http') && (
                                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                                        <div className="w-6 h-6 border-2 border-purple-400/40 border-t-purple-400 rounded-full animate-spin" />
                                    </div>
                                )}
                                {!isReadOnly && (
                                    <button 
                                        type="button" 
                                        onClick={() => {
                                            if (videoUrl.startsWith('blob:')) URL.revokeObjectURL(videoUrl);
                                            setVideoUrl(null);
                                        }}
                                        className="absolute top-2 right-2 bg-red-500/90 hover:bg-red-600 text-white p-2 rounded-full z-10 opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                )}
                            </div>
                        ) : !isReadOnly ? (
                            <div className="flex flex-wrap gap-2">
                                <button
                                    type="button"
                                    className={`${mediaChoiceBtn} aspect-video hover:border-purple-500/40`}
                                    onClick={() => galleryVideoRef.current?.click()}
                                >
                                    <Upload className="w-6 h-6 text-white/40 group-hover:text-purple-400" />
                                    <span className="text-xs text-white/70 group-hover:text-purple-300">
                                        {vt?.uploadVideo || (isAr ? 'رفع فيديو' : 'Upload video')}
                                    </span>
                                    <span className="text-[10px] text-white/40">
                                        {vt?.videoMaxSize || (isAr ? 'الحد الأقصى 50 ميجابايت' : 'Max 50MB')}
                                    </span>
                                </button>
                                <button
                                    type="button"
                                    className={`${mediaChoiceBtn} aspect-video hover:border-purple-500/40`}
                                    onClick={() => cameraVideoRef.current?.click()}
                                >
                                    <Video className="w-6 h-6 text-white/40 group-hover:text-purple-400" />
                                    <span className="text-xs text-white/70 group-hover:text-purple-300">
                                        {vt?.captureVideo || (isAr ? 'تسجيل بالكاميرا' : 'Record video')}
                                    </span>
                                </button>
                                <input
                                    ref={galleryVideoRef}
                                    type="file"
                                    accept="video/*"
                                    className="hidden"
                                    onChange={(e) => {
                                        void handleVideoFile(e.target.files);
                                        e.target.value = '';
                                    }}
                                />
                                <input
                                    ref={cameraVideoRef}
                                    type="file"
                                    accept="video/*"
                                    capture="environment"
                                    className="hidden"
                                    onChange={(e) => {
                                        void handleVideoFile(e.target.files);
                                        e.target.value = '';
                                    }}
                                />
                            </div>
                        ) : null}
                        {errors.video && <p className="text-red-500 text-xs mt-2">{errors.video}</p>}
                    </div>
                </div>

                <div className="bg-[#0A0906]/30 backdrop-blur-md rounded-2xl p-6 border border-white/5 shadow-[0_10px_30px_rgba(0,0,0,0.3)]">
                    <label className="flex items-center gap-2 text-sm font-bold text-white/80 mb-3">
                        <FileText className="w-5 h-5 text-blue-400" />
                        {vt?.notesLabel || (isAr ? 'وصف أو ملاحظات إضافية (اختياري)' : 'Additional description/notes (Optional)')}
                    </label>
                    <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        disabled={isReadOnly}
                        rows={3}
                        className={inputClasses('description')}
                        placeholder={vt?.notesPlaceholder || (isAr ? 'أضف أي ملاحظات حول حالة القطعة، أي خدوش طفيفة...' : 'Add any notes regarding part condition...')}
                    />
                </div>

                <div className="bg-[#0A0906]/30 backdrop-blur-md rounded-2xl p-6 border border-white/5 shadow-[0_10px_30px_rgba(0,0,0,0.3)]">
                    <h3 className="text-lg font-bold text-white mb-6 border-b border-white/5 pb-4 flex items-center gap-2">
                        <FileText className="text-amber-500" />
                        {vt?.receiptTitle || (isAr ? 'وصل إستلام المندوب' : 'Courier Handover Receipt')}
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
                        <div>
                            <label className="flex items-center gap-2 text-sm text-white/60 mb-2">
                                <User className="w-4 h-4" /> {vt?.courierName || (isAr ? 'اسم المندوب المستلم' : 'Courier Name')} <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                value={recipientName}
                                onChange={(e) => setRecipientName(e.target.value)}
                                disabled={isReadOnly}
                                className={inputClasses('recipientName')}
                                placeholder={vt?.courierPlaceholder || (isAr ? 'الاسم الثلاثي' : 'Full Name')}
                            />
                            {errors.recipientName && <p className="text-red-500 text-xs mt-1">{errors.recipientName}</p>}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
                        <div>
                            <label className="flex items-center gap-2 text-sm text-white/60 mb-2">
                                <Calendar className="w-4 h-4" /> {vt?.handoverDate || (isAr ? 'تاريخ التسليم' : 'Handover Date')} <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="date"
                                value={handoverDate}
                                min={minDate}
                                onChange={(e) => setHandoverDate(e.target.value)}
                                disabled={isReadOnly}
                                className={`${inputClasses('handoverDate')} [&::-webkit-calendar-picker-indicator]:filter [&::-webkit-calendar-picker-indicator]:invert`}
                            />
                            {errors.handoverDate && <p className="text-red-500 text-xs mt-1">{errors.handoverDate}</p>}
                        </div>
                        <div>
                            <label className="flex items-center gap-2 text-sm text-white/60 mb-2">
                                <Clock className="w-4 h-4" /> {vt?.handoverTime || (isAr ? 'وقت التسليم' : 'Handover Time')} <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="time"
                                value={handoverTime}
                                min={timeMinAttr}
                                onChange={(e) => setHandoverTime(e.target.value)}
                                disabled={isReadOnly}
                                className={`${inputClasses('handoverTime')} [&::-webkit-calendar-picker-indicator]:filter [&::-webkit-calendar-picker-indicator]:invert`}
                            />
                            {errors.handoverTime && <p className="text-red-500 text-xs mt-1">{errors.handoverTime}</p>}
                        </div>
                    </div>

                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <label className="flex items-center gap-2 text-sm text-white/60">
                                <PenTool className="w-4 h-4 text-amber-500" /> {vt?.signature || (isAr ? 'توقيع المندوب' : 'Courier Signature')} <span className="text-red-500">*</span>
                            </label>
                            {!isReadOnly && signatureType === 'DRAWN' && recipientSignature && (
                                <button type="button" onClick={clearSignature} className="text-xs text-red-400 hover:text-red-300 transition-colors">
                                    {vt?.clearSignature || (isAr ? 'مسح التوقيع' : 'Clear')}
                                </button>
                            )}
                        </div>

                        {!isReadOnly && (
                            <div className="flex gap-2 mb-4 bg-white/5 p-1 rounded-xl border border-white/10 w-fit">
                                <button 
                                    type="button" 
                                    onClick={() => setSignatureType('DRAWN')} 
                                    className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${signatureType === 'DRAWN' ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/20' : 'text-white/60 hover:text-white hover:bg-white/5'}`}
                                >
                                    {vt?.drawSignature || (isAr ? 'رسم التوقيع' : 'Draw Signature')}
                                </button>
                                <button 
                                    type="button" 
                                    onClick={() => setSignatureType('TYPED')} 
                                    className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${signatureType === 'TYPED' ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/20' : 'text-white/60 hover:text-white hover:bg-white/5'}`}
                                >
                                    {vt?.typeSignature || (isAr ? 'كتابة التوقيع' : 'Type Signature')}
                                </button>
                            </div>
                        )}
                        <div className={`relative bg-[#050503] rounded-xl border overflow-hidden ${errors.signature ? 'border-red-500/50 shadow-[0_0_20px_rgba(239,68,68,0.2)]' : 'border-white/5 hover:border-amber-500/20 shadow-[0_4px_30px_rgba(0,0,0,0.5)]'} transition-all`}>
                            {signatureType === 'TYPED' ? (
                                <div className="p-4 flex flex-col items-center justify-center min-h-40">
                                    {isReadOnly ? (
                                        <p className="text-3xl text-amber-500 font-bold tracking-wider" style={{ fontFamily: '"Brush Script MT", cursive, sans-serif' }}>
                                            {signatureText}
                                        </p>
                                    ) : (
                                        <input
                                            type="text"
                                            value={signatureText}
                                            onChange={(e) => setSignatureText(e.target.value)}
                                            className="w-full max-w-md bg-transparent border-b-2 border-amber-500/40 focus:border-amber-500 focus:outline-none text-center text-3xl text-amber-500 py-2 placeholder:text-white/10"
                                            placeholder={vt?.typeSignaturePlaceholder || (isAr ? 'اكتب اسمك للمصادقة' : 'Type name for authentication')}
                                            style={{ fontFamily: '"Brush Script MT", cursive, sans-serif' }}
                                        />
                                    )}
                                </div>
                            ) : (
                                isReadOnly && recipientSignature ? (
                                    <img src={recipientSignature} alt="Signature" className="w-full h-40 object-contain p-4 bg-black/60" />
                                ) : (
                                    <>
                                        <canvas
                                            ref={signatureRef}
                                            width={800} 
                                            height={200}
                                            className="w-full h-40 cursor-crosshair touch-none"
                                            onMouseDown={startDrawing}
                                            onMouseMove={draw}
                                            onMouseUp={stopDrawing}
                                            onMouseLeave={stopDrawing}
                                            onTouchStart={startDrawing}
                                            onTouchMove={draw}
                                            onTouchEnd={stopDrawing}
                                            style={{ display: recipientSignature && !isDrawing ? 'none' : 'block' }}
                                        />
                                        {recipientSignature && !isDrawing && (
                                            <div className="w-full h-40 flex items-center justify-center p-4">
                                                <img src={recipientSignature} alt="Captured Signature" className="h-full object-contain pointer-events-none" />
                                            </div>
                                        )}
                                        {!recipientSignature && !isDrawing && !isReadOnly && (
                                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-white/10 select-none text-xs md:text-sm font-mono tracking-wider">
                                                {vt?.drawHint || (isAr ? 'ارسم التوقيع الرقمي هنا' : 'Draw Digital Signature Here')}
                                            </div>
                                        )}
                                    </>
                                )
                            )}
                        </div>
                        {errors.signature && <p className="text-red-500 text-xs mt-1">{errors.signature}</p>}
                    </div>
                </div>

                {!isReadOnly && (
                    <div className="flex items-center justify-end gap-3 pt-4">
                        <button
                            type="button"
                            onClick={onCancel}
                            disabled={isSubmitting}
                            className="px-6 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white transition-colors text-sm font-medium"
                        >
                            {vt?.cancel || (isAr ? 'إلغاء' : 'Cancel')}
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting || mediaUploading > 0}
                            className="px-8 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-black font-bold flex items-center gap-2 transition-all shadow-lg shadow-amber-500/20 disabled:opacity-50 active:scale-98 text-sm"
                        >
                            {isSubmitting ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                                    <span>{uploadProgress}%</span>
                                </>
                            ) : (
                                <>
                                    <Save className="w-4 h-4" />
                                    {vt?.submit || (isAr ? 'حفظ وإرسال للتأكيد' : 'Submit & Confirm')}
                                </>
                            )}
                        </button>
                    </div>
                )}
            </form>
        </GlassCard>
    );
};
