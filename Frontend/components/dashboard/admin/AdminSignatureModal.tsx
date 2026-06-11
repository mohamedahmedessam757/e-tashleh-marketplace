
import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldCheck, User, PenTool, Calendar, X, CheckCircle2, AlertCircle, FileText } from 'lucide-react';
import { useLanguage } from '../../../contexts/LanguageContext';
import { GlassCard } from '../../ui/GlassCard';

interface AdminSignatureModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (signatureData: {
        adminSignatureName: string;
        adminSignatureType: 'DRAWN' | 'TYPED';
        adminSignatureText?: string;
        adminSignatureImage?: string;
        adminReviewDetails?: string; 
    }) => Promise<void>;
    actionType?: 'APPROVE' | 'REJECT';
    initialDetails?: string;
    title?: string;
    subtitle?: string;
}

export const AdminSignatureModal: React.FC<AdminSignatureModalProps> = ({
    isOpen, onClose, onConfirm, actionType = 'APPROVE', initialDetails = '', title, subtitle
}) => {
    const { t, language } = useLanguage();
    const isAr = language === 'ar';
    const translates = (t as any).admin.orderDetails.verificationReview;

    const [employeeName, setEmployeeName] = useState('');
    const [signatureType, setSignatureType] = useState<'DRAWN' | 'TYPED'>('TYPED');
    const [signatureText, setSignatureText] = useState('');
    const [signatureImage, setSignatureImage] = useState<string | null>(null);
    const [reviewDetails, setReviewDetails] = useState(initialDetails);
    const [isAcknowledged, setIsAcknowledged] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (isOpen) {
            setReviewDetails(initialDetails);
            // Lock body scroll
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => { document.body.style.overflow = 'unset'; };
    }, [isOpen, initialDetails]);

    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isDrawing, setIsDrawing] = useState(false);

    // Canvas Logic
    useEffect(() => {
        if (isOpen && signatureType === 'DRAWN' && canvasRef.current) {
            const canvas = canvasRef.current;
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.lineWidth = 3;
                ctx.lineCap = 'round';
                ctx.lineJoin = 'round';
                ctx.strokeStyle = '#ffffff'; // Explicit White for visibility on dark bg
                if (actionType === 'REJECT') ctx.strokeStyle = '#f87171'; // Brighter red
            }
        }
    }, [isOpen, signatureType, actionType]);

    const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
        setIsDrawing(true);
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (!canvas || !ctx) return;

        const rect = canvas.getBoundingClientRect();
        const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
        const x = (clientX - rect.left) * (canvas.width / rect.width);
        const y = (clientY - rect.top) * (canvas.height / rect.height);

        ctx.beginPath();
        ctx.moveTo(x, y);
    };

    const draw = (e: React.MouseEvent | React.TouchEvent) => {
        if (!isDrawing) return;
        const canvas = canvasRef.current;
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
        const canvas = canvasRef.current;
        if (canvas) {
            setSignatureImage(canvas.toDataURL('image/png'));
        }
    };

    const clearSignature = () => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (canvas && ctx) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            setSignatureImage(null);
        }
    };

    const handleConfirm = async () => {
        if (!employeeName.trim()) {
            setError(translates.nameRequired);
            return;
        }
        if (signatureType === 'TYPED' && !signatureText.trim()) {
            setError(translates.signatureRequired);
            return;
        }
        if (signatureType === 'DRAWN' && !signatureImage) {
            setError(translates.signatureRequired);
            return;
        }
        if (actionType === 'REJECT' && !reviewDetails.trim()) {
            setError(translates.detailsRequired);
            return;
        }
        if (!isAcknowledged) {
            setError(translates.ackRequired);
            return;
        }

        setIsSubmitting(true);
        setError('');
        try {
            await onConfirm({
                adminSignatureName: employeeName,
                adminSignatureType: signatureType,
                adminSignatureText: signatureType === 'TYPED' ? signatureText : undefined,
                adminSignatureImage: signatureType === 'DRAWN' ? signatureImage! : undefined,
                adminReviewDetails: reviewDetails,
            });
        } catch (err: any) {
            setError(err.message || 'Operation failed');
        } finally {
            setIsSubmitting(false);
        }
    };

    // Use Portal for absolute viewport centering (resilience against parent transforms)
    return createPortal(
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-black/90 backdrop-blur-md"
                    />

                    {/* Modal Content */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 50 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 50 }}
                        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                        className="relative w-full max-w-2xl"
                    >
                        <GlassCard className="p-8 border-white/10 shadow-[0_0_100px_rgba(0,0,0,0.5)] overflow-hidden">
                            {/* Header */}
                            <div className="flex items-center justify-between mb-8">
                                <div className="flex items-center gap-4">
                                    <div className={`p-3 rounded-2xl ${actionType === 'APPROVE' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                                        <ShieldCheck size={28} />
                                    </div>
                                    <div>
                                        <h2 className="text-2xl font-bold text-white leading-tight">
                                            {title || translates.modalTitle}
                                        </h2>
                                        <p className="text-white/50 text-sm mt-1">
                                            {subtitle || (actionType === 'APPROVE' ? (isAr ? 'اعتماد مطابقة القطعة للمستندات' : 'Approving part compliance') : (isAr ? 'رفض مطابقة القطعة' : 'Rejecting part compliance'))}
                                        </p>
                                    </div>
                                </div>
                                <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-xl text-white/40 transition-colors">
                                    <X size={20} />
                                </button>
                            </div>

                            {error && (
                                <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3 text-red-400 text-sm">
                                    <AlertCircle size={18} />
                                    {error}
                                </motion.div>
                            )}

                            <div className="space-y-6">
                                {/* Employee Name */}
                                <div>
                                    <label className="flex items-center gap-2 text-sm font-bold text-white/70 mb-2">
                                        <User size={16} className="text-primary-400" />
                                        {translates.employeeName} <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={employeeName}
                                        onChange={(e) => { setEmployeeName(e.target.value); setError(''); }}
                                        className="w-full bg-white/5 border border-white/10 focus:border-primary-500/50 rounded-xl px-4 py-3 text-white focus:outline-none transition-all"
                                        placeholder={isAr ? 'الاسم الثلاثي للموظف المراجع' : 'Full employee name'}
                                    />
                                </div>

                                {/* Review Details */}
                                <div>
                                    <label className="flex items-center gap-2 text-sm font-bold text-white/70 mb-2">
                                        <FileText size={16} className="text-primary-400" />
                                        {translates.details} {actionType === 'REJECT' && <span className="text-red-500">*</span>}
                                    </label>
                                    <textarea
                                        value={reviewDetails}
                                        onChange={(e) => { setReviewDetails(e.target.value); setError(''); }}
                                        rows={4}
                                        className="w-full bg-white/5 border border-white/10 focus:border-primary-500/50 rounded-xl px-4 py-3 text-white focus:outline-none transition-all resize-none text-sm"
                                        placeholder={translates.detailsPlaceholder}
                                    />
                                </div>

                                {/* Signature Section */}
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <label className="flex items-center gap-2 text-sm font-bold text-white/70">
                                            <PenTool size={16} className="text-primary-400" />
                                            {translates.signatureTitle} <span className="text-red-500">*</span>
                                        </label>
                                        <div className="flex bg-white/5 p-1 rounded-lg border border-white/5">
                                            <button
                                                onClick={() => { setSignatureType('TYPED'); setError(''); }}
                                                className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${signatureType === 'TYPED' ? 'bg-primary-500 text-black' : 'text-white/40 hover:text-white'}`}
                                            >
                                                {isAr ? 'كتابة' : 'Type'}
                                            </button>
                                            <button
                                                onClick={() => { setSignatureType('DRAWN'); setError(''); }}
                                                className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${signatureType === 'DRAWN' ? 'bg-primary-500 text-black' : 'text-white/40 hover:text-white'}`}
                                            >
                                                {isAr ? 'رسم' : 'Draw'}
                                            </button>
                                        </div>
                                    </div>

                                    <div className="relative min-h-[160px] bg-black/40 rounded-2xl border border-white/10 overflow-hidden group">
                                        {signatureType === 'TYPED' ? (
                                            <div className="absolute inset-0 flex flex-col items-center justify-center p-6">
                                                <input
                                                    type="text"
                                                    value={signatureText}
                                                    onChange={(e) => { setSignatureText(e.target.value); setError(''); }}
                                                    className="w-full bg-transparent border-b border-amber-500/30 focus:border-amber-500 text-center text-4xl text-amber-400 py-2 focus:outline-none placeholder:text-white/5"
                                                    placeholder={isAr ? 'التوقيع الرقمي' : 'Digital Signature'}
                                                    style={{ fontFamily: '"Brush Script MT", cursive, sans-serif' }}
                                                />
                                            </div>
                                        ) : (
                                            <>
                                                <canvas
                                                    ref={canvasRef}
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
                                                    style={{ display: signatureImage && !isDrawing ? 'none' : 'block' }}
                                                />
                                                {signatureImage && !isDrawing && (
                                                    <div className="w-full h-40 flex items-center justify-center p-4">
                                                        <img src={signatureImage} alt="Captured Signature" className="h-full object-contain pointer-events-none" />
                                                    </div>
                                                )}
                                                {!signatureImage && !isDrawing && (
                                                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-white/10 text-xs font-mono tracking-widest uppercase">
                                                        {isAr ? 'ارسم توقيعك هنا بالماوس أو اللمس' : 'Draw your signature here'}
                                                    </div>
                                                )}
                                                {signatureImage && !isDrawing && (
                                                    <button onClick={clearSignature} className="absolute top-2 right-2 p-1.5 bg-red-500/20 text-red-400 hover:bg-red-500/40 rounded-lg transition-colors">
                                                        <X size={14} />
                                                    </button>
                                                )}
                                            </>
                                        )}
                                    </div>
                                </div>

                                {/* Acknowledgment */}
                                <label className="flex gap-3 p-4 bg-primary-500/5 border border-primary-500/10 rounded-xl cursor-pointer hover:bg-primary-500/10 transition-colors">
                                    <input
                                        type="checkbox"
                                        checked={isAcknowledged}
                                        onChange={(e) => { setIsAcknowledged(e.target.checked); setError(''); }}
                                        className="mt-1 w-5 h-5 rounded border-white/10 bg-white/5 text-primary-500 focus:ring-primary-500/20"
                                    />
                                    <span className="text-sm text-white/80 leading-relaxed select-none">
                                        {translates.acknowledgment}
                                    </span>
                                </label>

                                <div className="flex items-center justify-between pt-4">
                                    <div className="flex items-center gap-2 text-white/30 text-xs font-mono">
                                        <Calendar size={12} />
                                        {new Date().toLocaleDateString(isAr ? 'ar-EG' : 'en-GB')} - {new Date().toLocaleTimeString(isAr ? 'ar-EG' : 'en-GB', { hour: '2-digit', minute: '2-digit' })}
                                    </div>
                                    <div className="flex gap-3">
                                        <button
                                            onClick={onClose}
                                            disabled={isSubmitting}
                                            className="px-6 py-3 rounded-xl hover:bg-white/5 text-white/60 hover:text-white transition-all text-sm font-bold"
                                        >
                                            {translates.cancel}
                                        </button>
                                        <button
                                            onClick={handleConfirm}
                                            disabled={isSubmitting}
                                            className={`px-8 py-3 rounded-xl font-bold flex items-center gap-2 transition-all shadow-lg text-sm active:scale-95 disabled:opacity-50 ${actionType === 'APPROVE' ? 'bg-green-500 hover:bg-green-600 text-white shadow-green-500/20' : 'bg-red-500 hover:bg-red-600 text-white shadow-red-500/20'}`}
                                        >
                                            {isSubmitting ? (
                                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                            ) : <CheckCircle2 size={18} />}
                                            {translates.submitReview}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </GlassCard>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>,
        document.body
    );
};
