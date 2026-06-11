import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Camera, Video, Upload, X, Save, AlertCircle, FileText, User, Calendar, Clock, PenTool, ShieldCheck } from 'lucide-react';
import { useLanguage } from '../../../contexts/LanguageContext';
import { GlassCard } from '../../ui/GlassCard';
import { supabase } from '../../../services/supabase';
import { client } from '../../../services/api/client';

interface VerificationFormProps {
    orderId: string;
    isCorrection?: boolean;
    existingData?: any; // If viewing read-only or pre-filling some
    /** Changes when switching parts — clears the form for a fresh submission */
    resetKey?: string;
    isReadOnly?: boolean;
    onSubmit: (data: any) => Promise<void>;
    onCancel: () => void;
}

function buildInitialFormState(existingData?: any) {
    return {
        images: [] as File[],
        imageUrls: (existingData?.images as string[]) || [],
        video: null as File | null,
        videoUrl: (existingData?.videoUrl as string) || null,
        description: existingData?.description || '',
        recipientName: existingData?.recipientName || '',
        handoverDate: existingData?.handoverDate
            ? new Date(existingData.handoverDate).toISOString().split('T')[0]
            : '',
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
    const { language } = useLanguage();
    const isAr = language === 'ar';

    const [images, setImages] = useState<File[]>([]);
    const [imageUrls, setImageUrls] = useState<string[]>(existingData?.images || []);
    const [video, setVideo] = useState<File | null>(null);
    const [videoUrl, setVideoUrl] = useState<string | null>(existingData?.videoUrl || null);
    
    const [description, setDescription] = useState(existingData?.description || '');
    const [recipientName, setRecipientName] = useState(existingData?.recipientName || '');
    const [handoverDate, setHandoverDate] = useState(existingData?.handoverDate ? new Date(existingData.handoverDate).toISOString().split('T')[0] : '');
    const [handoverTime, setHandoverTime] = useState(existingData?.handoverTime || '');
    const [recipientSignature, setRecipientSignature] = useState<string | null>(existingData?.recipientSignature || null);
    const [signatureType, setSignatureType] = useState<'DRAWN' | 'TYPED'>(existingData?.signatureType || 'DRAWN');
    const [signatureText, setSignatureText] = useState(existingData?.signatureText || '');

    const [errors, setErrors] = useState<Record<string, string>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);

    const signatureRef = useRef<HTMLCanvasElement>(null);
    const [isDrawing, setIsDrawing] = useState(false);

    useEffect(() => {
        const initial = buildInitialFormState(existingData);
        setImages(initial.images);
        setImageUrls(initial.imageUrls);
        setVideo(initial.video);
        setVideoUrl(initial.videoUrl);
        setDescription(initial.description);
        setRecipientName(initial.recipientName);
        setHandoverDate(initial.handoverDate);
        setHandoverTime(initial.handoverTime);
        setRecipientSignature(initial.recipientSignature);
        setSignatureType(initial.signatureType);
        setSignatureText(initial.signatureText);
        setErrors({});
        const canvas = signatureRef.current;
        const ctx = canvas?.getContext('2d');
        if (canvas && ctx) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
    }, [resetKey]);

    // Canvas Signature Logic
    useEffect(() => {
        const canvas = signatureRef.current;
        if (canvas) {
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.lineWidth = 3;
                ctx.lineCap = 'round';
                ctx.lineJoin = 'round';
                ctx.strokeStyle = '#f59e0b'; // Gold signature ink for extremely premium feel
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
        
        // Re-enforce styles to avoid edge cases
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.strokeStyle = '#f59e0b';
        
        const rect = canvas.getBoundingClientRect();
        const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
        
        // Scale coordinate matching
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
        
        // Scale coordinate matching
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

    // File Handlers
    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const newFiles = Array.from(e.target.files) as File[];
            setImages(prev => [...prev, ...newFiles]);
            const newUrls = newFiles.map((file: File) => URL.createObjectURL(file));
            setImageUrls(prev => [...prev, ...newUrls]);
            if (errors.images) setErrors(prev => ({ ...prev, images: '' }));
        }
    };

    const removeImage = (index: number) => {
        if (isReadOnly) return;
        setImages(prev => prev.filter((_, i) => i !== index));
        setImageUrls(prev => prev.filter((_, i) => i !== index));
    };

    const handleVideoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file: File = e.target.files[0];
            const MAX_VIDEO_MB = 50;
            if (file.size > MAX_VIDEO_MB * 1024 * 1024) {
                setErrors(prev => ({ ...prev, video: isAr ? `الحد الأقصى لحجم الفيديو ${MAX_VIDEO_MB} ميجابايت` : `Max video size is ${MAX_VIDEO_MB}MB` }));
                return;
            }
            setVideo(file);
            setVideoUrl(URL.createObjectURL(file));
            if (errors.video) setErrors(prev => ({ ...prev, video: '' }));
        }
    };

    const uploadFile = async (file: File, folder: string): Promise<string> => {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('orderId', orderId.toString());
        formData.append('folder', folder);

        const { data } = await client.post('/uploads/verification', formData);
        if (!data?.url) {
            throw new Error('Upload did not return a URL');
        }
        return data.url;
    };

    const validate = () => {
        const newErrors: Record<string, string> = {};
        if (imageUrls.length === 0) newErrors.images = isAr ? 'يجب إرفاق صورة واحدة على الأقل' : 'At least one image is required';
        if (!videoUrl) newErrors.video = isAr ? 'يجب إرفاق فيديو يوضح حالة القطعة' : 'A video showing the part condition is required';
        if (!recipientName.trim()) newErrors.recipientName = isAr ? 'اسم المندوب مطلوب' : 'Courier name is required';
        if (!handoverDate) newErrors.handoverDate = isAr ? 'تاريخ التسليم مطلوب' : 'Handover date is required';
        if (!handoverTime) newErrors.handoverTime = isAr ? 'وقت التسليم مطلوب' : 'Handover time is required';
        const isSignatureInvalid = signatureType === 'DRAWN' ? !recipientSignature : !signatureText.trim();
        if (isSignatureInvalid) newErrors.signature = isAr ? 'توقيع المندوب مطلوب' : 'Courier signature is required';

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (isReadOnly) return;
        if (!validate()) {
            // Scroll to top to see errors
            window.scrollTo({ top: 0, behavior: 'smooth' });
            return;
        }

        setIsSubmitting(true);
        setUploadProgress(10);
        try {
            // Upload new images
            const finalImageUrls = [...imageUrls.filter(url => url.startsWith('http'))]; // Keep existing uploaded URLs
            
            for (let i = 0; i < images.length; i++) {
                const url = await uploadFile(images[i], 'images');
                finalImageUrls.push(url);
                setUploadProgress(10 + Math.floor((40 / images.length) * (i + 1)));
            }

            if (!finalImageUrls.every((url) => url.startsWith('http'))) {
                throw new Error(isAr ? 'يجب رفع جميع الصور قبل الإرسال' : 'All images must be uploaded before submitting');
            }

            // Upload new video if exists
            let finalVideoUrl = videoUrl;
            if (video) {
                finalVideoUrl = await uploadFile(video, 'videos');
            } else if (finalVideoUrl && !finalVideoUrl.startsWith('http')) {
                throw new Error(isAr ? 'يجب رفع الفيديو قبل الإرسال' : 'Video must be uploaded before submitting');
            }
            setUploadProgress(80);

            // Upload Signature if it's a data URL
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
                videoUrl: finalVideoUrl,
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
            const apiMsg =
                error?.response?.data?.message ||
                (Array.isArray(error?.response?.data?.message)
                    ? error.response.data.message.join(', ')
                    : null);
            setErrors({
                submit:
                    apiMsg ||
                    error?.message ||
                    (isAr ? 'حدث خطأ أثناء رفع الملفات، يرجى المحاولة مرة أخرى.' : 'Error uploading files, please try again.'),
            });
        } finally {
            setIsSubmitting(false);
            setUploadProgress(0);
        }
    };

    const inputClasses = (errorField: string) => `
        w-full bg-[#0D0B07]/40 backdrop-blur-md border rounded-xl px-4 py-3 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 transition-all duration-300
        ${errors[errorField] ? 'border-red-500/50 focus:ring-red-500/20 shadow-[0_0_20px_rgba(239,68,68,0.25)]' : 'border-white/10 focus:border-amber-500/40 focus:ring-amber-500/10 shadow-[0_4px_25px_rgba(0,0,0,0.3)]'}
        ${isReadOnly ? 'opacity-70 cursor-not-allowed' : ''}
    `;

    return (
        <GlassCard className="p-8 border border-white/10 shadow-2xl relative overflow-hidden">
            {/* Decorative Top Glow */}
            <div className={`absolute top-0 right-0 w-64 h-64 blur-[80px] rounded-full pointer-events-none ${isCorrection ? 'bg-amber-500/10' : 'bg-primary-500/10'}`} />

            <form onSubmit={handleSubmit} className="space-y-8 relative z-10" dir={isAr ? 'rtl' : 'ltr'}>
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h2 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-3">
                            <ShieldCheck className={`w-8 h-8 ${isCorrection ? 'text-amber-500 animate-pulse' : 'text-primary-400'}`} />
                            {isCorrection 
                                ? (isAr ? 'إعادة توثيق حالة القطعة' : 'Re-Submit Part Verification')
                                : (isAr ? 'توثيق وتسليم القطعة' : 'Part Handover Verification')}
                        </h2>
                        <p className="text-white/60 mt-2 text-sm md:text-base">
                            {isAr 
                                ? 'يرجى تقديم أدلة واضحة توضح حالة القطعة قبل تسليمها للمندوب لضمان حقوقك.'
                                : 'Please provide clear evidence of the part condition before handover.'}
                        </p>
                    </div>
                </div>

                {errors.submit && (
                    <div className="bg-red-500/10 border border-red-500/30 text-red-500 p-4 rounded-xl flex items-center gap-3 shadow-[0_0_15px_rgba(239,68,68,0.1)]">
                        <AlertCircle className="w-5 h-5 flex-shrink-0" />
                        <p className="text-sm font-bold">{errors.submit}</p>
                    </div>
                )}

                {/* Media Upload Section */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Images */}
                    <div className={`bg-[#0A0906]/30 backdrop-blur-md rounded-2xl p-6 border transition-all duration-300 ${errors.images ? 'border-red-500/50 shadow-[0_0_20px_rgba(239,68,68,0.2)]' : 'border-white/5 hover:border-white/10 shadow-[0_10px_30px_rgba(0,0,0,0.4)]'}`}>
                        <label className="flex items-center gap-2 text-sm font-bold text-white/80 mb-4">
                            <Camera className="w-5 h-5 text-amber-500" />
                            {isAr ? 'صور واضحة للقطعة (مطلوب صورة واحدة على الأقل)' : 'Clear part images (Min 1 required)'} <span className="text-red-500">*</span>
                        </label>
                        
                        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
                            {imageUrls.map((url, index) => (
                                <div key={index} className="relative aspect-square rounded-xl overflow-hidden group border border-white/10 hover:border-amber-500/40 transition-colors">
                                    <img src={url} alt={`Part ${index + 1}`} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
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
                            
                            {!isReadOnly && (
                                <label className="relative aspect-square rounded-xl border-2 border-dashed border-white/20 hover:border-amber-500/40 bg-white/5 hover:bg-white/10 transition-all flex flex-col items-center justify-center cursor-pointer group">
                                    <Camera className="w-6 h-6 text-white/40 group-hover:text-amber-500 group-hover:scale-110 transition-all mb-2" />
                                    <span className="text-xs text-white/50 group-hover:text-amber-400/80">{isAr ? 'إضافة صورة' : 'Add Image'}</span>
                                    <input type="file" multiple accept="image/*" onChange={handleImageChange} className="hidden" />
                                </label>
                            )}
                        </div>
                        {errors.images && <p className="text-red-500 text-xs mt-1">{errors.images}</p>}
                    </div>

                    {/* Video */}
                    <div className={`bg-[#0A0906]/30 backdrop-blur-md rounded-2xl p-6 border transition-all duration-300 ${errors.video ? 'border-red-500/50 shadow-[0_0_20px_rgba(239,68,68,0.2)]' : 'border-white/5 hover:border-white/10 shadow-[0_10px_30px_rgba(0,0,0,0.4)]'}`}>
                        <label className="flex items-center gap-2 text-sm font-bold text-white/80 mb-4">
                            <Video className="w-5 h-5 text-purple-400" />
                            {isAr ? 'فيديو يوضح القطعة من جميع الاتجاهات' : 'Video showing all part angles'} <span className="text-red-500">*</span>
                        </label>

                        {videoUrl ? (
                            <div className="relative aspect-video rounded-xl overflow-hidden border border-white/10 group">
                                <video src={videoUrl} controls className="w-full h-full object-cover bg-black/50" />
                                {!isReadOnly && (
                                    <button 
                                        type="button" 
                                        onClick={() => { setVideo(null); setVideoUrl(null); }}
                                        className="absolute top-2 right-2 bg-red-500/90 hover:bg-red-600 text-white p-2 rounded-full z-10 opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                )}
                            </div>
                        ) : (
                            <label className="relative flex flex-col items-center justify-center aspect-video rounded-xl border-2 border-dashed border-white/20 hover:border-purple-500/40 bg-white/5 hover:bg-white/10 transition-all cursor-pointer text-center p-6 group">
                                <Upload className="w-8 h-8 text-white/40 group-hover:text-purple-400 group-hover:scale-110 transition-all mb-3" />
                                <p className="text-sm text-white/80 group-hover:text-purple-300">{isAr ? 'اضغط لرفع فيديو (MP4, WebM)' : 'Click to upload video (MP4, WebM)'}</p>
                                <p className="text-xs text-white/40 mt-1">{isAr ? 'الحد الأقصى 50 ميجابايت' : 'Max size 50MB'}</p>
                                <input type="file" accept="video/*" onChange={handleVideoChange} className="hidden" />
                            </label>
                        )}
                        {errors.video && <p className="text-red-500 text-xs mt-2">{errors.video}</p>}
                    </div>
                </div>

                {/* Description */}
                <div className="bg-[#0A0906]/30 backdrop-blur-md rounded-2xl p-6 border border-white/5 shadow-[0_10px_30px_rgba(0,0,0,0.3)]">
                    <label className="flex items-center gap-2 text-sm font-bold text-white/80 mb-3">
                        <FileText className="w-5 h-5 text-blue-400" />
                        {isAr ? 'وصف أو ملاحظات إضافية (اختياري)' : 'Additional description/notes (Optional)'}
                    </label>
                    <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        disabled={isReadOnly}
                        rows={3}
                        className={inputClasses('description')}
                        placeholder={isAr ? 'أضف أي ملاحظات حول حالة القطعة، أي خدوش طفيفة...' : 'Add any notes regarding part condition...'}
                    />
                </div>

                {/* Handover Receipt Form */}
                <div className="bg-[#0A0906]/30 backdrop-blur-md rounded-2xl p-6 border border-white/5 shadow-[0_10px_30px_rgba(0,0,0,0.3)]">
                    <h3 className="text-lg font-bold text-white mb-6 border-b border-white/5 pb-4 flex items-center gap-2">
                        <FileText className="text-amber-500" />
                        {isAr ? 'وصل إستلام المندوب' : 'Courier Handover Receipt'}
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
                        <div>
                            <label className="flex items-center gap-2 text-sm text-white/60 mb-2">
                                <User className="w-4 h-4" /> {isAr ? 'اسم المندوب المستلم' : 'Courier Name'} <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                value={recipientName}
                                onChange={(e) => setRecipientName(e.target.value)}
                                disabled={isReadOnly}
                                className={inputClasses('recipientName')}
                                placeholder={isAr ? 'الاسم الثلاثي' : 'Full Name'}
                            />
                            {errors.recipientName && <p className="text-red-500 text-xs mt-1">{errors.recipientName}</p>}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
                        <div>
                            <label className="flex items-center gap-2 text-sm text-white/60 mb-2">
                                <Calendar className="w-4 h-4" /> {isAr ? 'تاريخ التسليم' : 'Handover Date'} <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="date"
                                value={handoverDate}
                                onChange={(e) => setHandoverDate(e.target.value)}
                                disabled={isReadOnly}
                                className={`${inputClasses('handoverDate')} [&::-webkit-calendar-picker-indicator]:filter [&::-webkit-calendar-picker-indicator]:invert`}
                            />
                            {errors.handoverDate && <p className="text-red-500 text-xs mt-1">{errors.handoverDate}</p>}
                        </div>
                        <div>
                            <label className="flex items-center gap-2 text-sm text-white/60 mb-2">
                                <Clock className="w-4 h-4" /> {isAr ? 'وقت التسليم' : 'Handover Time'} <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="time"
                                value={handoverTime}
                                onChange={(e) => setHandoverTime(e.target.value)}
                                disabled={isReadOnly}
                                className={`${inputClasses('handoverTime')} [&::-webkit-calendar-picker-indicator]:filter [&::-webkit-calendar-picker-indicator]:invert`}
                            />
                            {errors.handoverTime && <p className="text-red-500 text-xs mt-1">{errors.handoverTime}</p>}
                        </div>
                    </div>

                    {/* Signature Pad */}
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <label className="flex items-center gap-2 text-sm text-white/60">
                                <PenTool className="w-4 h-4 text-amber-500" /> {isAr ? 'توقيع المندوب' : 'Courier Signature'} <span className="text-red-500">*</span>
                            </label>
                            {!isReadOnly && signatureType === 'DRAWN' && recipientSignature && (
                                <button type="button" onClick={clearSignature} className="text-xs text-red-400 hover:text-red-300 transition-colors">
                                    {isAr ? 'مسح التوقيع' : 'Clear'}
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
                                    {isAr ? 'رسم التوقيع' : 'Draw Signature'}
                                </button>
                                <button 
                                    type="button" 
                                    onClick={() => setSignatureType('TYPED')} 
                                    className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${signatureType === 'TYPED' ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/20' : 'text-white/60 hover:text-white hover:bg-white/5'}`}
                                >
                                    {isAr ? 'كتابة التوقيع' : 'Type Signature'}
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
                                            placeholder={isAr ? 'اكتب اسمك للمصادقة' : 'Type name for authentication'}
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
                                                {isAr ? 'ارسم التوقيع الرقمي هنا' : 'Draw Digital Signature Here'}
                                            </div>
                                        )}
                                    </>
                                )
                            )}
                        </div>
                        {errors.signature && <p className="text-red-500 text-xs mt-1">{errors.signature}</p>}
                    </div>
                </div>

                {/* Actions */}
                {!isReadOnly && (
                    <div className="flex items-center justify-end gap-3 pt-4">
                        <button
                            type="button"
                            onClick={onCancel}
                            disabled={isSubmitting}
                            className="px-6 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white transition-colors text-sm font-medium"
                        >
                            {isAr ? 'إلغاء' : 'Cancel'}
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
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
                                    {isAr ? 'حفظ وإرسال للتأكيد' : 'Submit & Confirm'}
                                </>
                            )}
                        </button>
                    </div>
                )}
            </form>
        </GlassCard>
    );
};
