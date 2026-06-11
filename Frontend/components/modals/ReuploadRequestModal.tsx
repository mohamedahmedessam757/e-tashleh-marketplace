
import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, PenTool, User, X, CheckCircle2, ShieldAlert, FileText, Info } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { GlassCard } from '../ui/GlassCard';

interface ReuploadRequestModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (data: {
        reason: string;
        adminName: string;
        adminSignature: string;
    }) => Promise<void>;
    docType: string;
    docTitle: string;
}

export const ReuploadRequestModal: React.FC<ReuploadRequestModalProps> = ({
    isOpen, onClose, onConfirm, docType, docTitle
}) => {
    const { language } = useLanguage();
    const isAr = language === 'ar';

    const [adminName, setAdminName] = useState('');
    const [reason, setReason] = useState('');
    const [signatureType, setSignatureType] = useState<'DRAWN' | 'TYPED'>('TYPED');
    const [signatureText, setSignatureText] = useState('');
    const [signatureImage, setSignatureImage] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');

    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isDrawing, setIsDrawing] = useState(false);

    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
            setReason('');
            setAdminName('');
            setSignatureText('');
            setSignatureImage(null);
            setError('');
        }
        return () => { document.body.style.overflow = 'unset'; };
    }, [isOpen]);

    // Canvas Signature Logic
    useEffect(() => {
        if (isOpen && signatureType === 'DRAWN' && canvasRef.current) {
            const canvas = canvasRef.current;
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.lineWidth = 3;
                ctx.lineCap = 'round';
                ctx.lineJoin = 'round';
                ctx.strokeStyle = '#f87171'; // Red for warning/re-upload
            }
        }
    }, [isOpen, signatureType]);

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
        if (canvasRef.current) setSignatureImage(canvasRef.current.toDataURL());
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
        if (!adminName.trim()) {
            setError(isAr ? 'يجب إدخال اسم المسؤول' : 'Admin name is required');
            return;
        }
        if (!reason.trim()) {
            setError(isAr ? 'يجب إدخال سبب طلب إعادة الرفع' : 'Reason is required');
            return;
        }
        const signature = signatureType === 'TYPED' ? signatureText : signatureImage;
        if (!signature) {
            setError(isAr ? 'يجب التوقيع للمتابعة' : 'Signature is required');
            return;
        }

        setIsSubmitting(true);
        try {
            await onConfirm({
                reason,
                adminName,
                adminSignature: signature
            });
            onClose();
        } catch (err: any) {
            setError(err.message || 'Operation failed');
        } finally {
            setIsSubmitting(false);
        }
    };

    return createPortal(
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-black/95 backdrop-blur-xl"
                    />

                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 30 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 30 }}
                        className="relative w-full max-w-xl"
                    >
                        <GlassCard className="p-8 border-red-500/20 shadow-[0_0_100px_rgba(239,68,68,0.15)] overflow-hidden">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/5 blur-3xl -mr-16 -mt-16" />
                            
                            <div className="flex items-center justify-between mb-8 border-b border-white/5 pb-6">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 bg-red-500/20 text-red-500 rounded-2xl shadow-[0_0_20px_rgba(239,68,68,0.2)]">
                                        <ShieldAlert size={28} />
                                    </div>
                                    <div>
                                        <h2 className="text-2xl font-black text-white uppercase tracking-tight">
                                            {isAr ? 'طلب إعادة رفع مستند' : 'Document Re-upload Request'}
                                        </h2>
                                        <p className="text-red-400/60 text-[10px] font-black uppercase tracking-widest mt-1">
                                            {docTitle} ({docType})
                                        </p>
                                    </div>
                                </div>
                                <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-xl text-white/40 hover:text-white transition-all">
                                    <X size={20} />
                                </button>
                            </div>

                            {error && (
                                <motion.div initial={{ x: -10, opacity: 0 }} animate={{ x: 0, opacity: 1 }} className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3 text-red-400 text-xs font-bold">
                                    <AlertCircle size={18} />
                                    {error}
                                </motion.div>
                            )}

                            <div className="space-y-6">
                                <div>
                                    <label className="flex items-center gap-2 text-xs font-black text-white/40 uppercase tracking-[0.2em] mb-3">
                                        <User size={14} className="text-red-500" />
                                        {isAr ? 'اسم المسؤول المراجع' : 'Responsible Administrator'}
                                    </label>
                                    <input
                                        type="text"
                                        value={adminName}
                                        onChange={(e) => { setAdminName(e.target.value); setError(''); }}
                                        className="w-full bg-white/5 border border-white/10 focus:border-red-500/50 rounded-2xl px-5 py-4 text-white font-medium focus:outline-none transition-all placeholder:text-white/10"
                                        placeholder={isAr ? 'أدخل اسمك الثلاثي' : 'Enter full name'}
                                    />
                                </div>

                                <div>
                                    <label className="flex items-center gap-2 text-xs font-black text-white/40 uppercase tracking-[0.2em] mb-3">
                                        <Info size={14} className="text-red-500" />
                                        {isAr ? 'سبب طلب إعادة الرفع / النقص' : 'Reason for Re-upload Request'}
                                    </label>
                                    <textarea
                                        value={reason}
                                        onChange={(e) => { setReason(e.target.value); setError(''); }}
                                        rows={4}
                                        className="w-full bg-white/5 border border-white/10 focus:border-red-500/50 rounded-2xl px-5 py-4 text-white font-medium focus:outline-none transition-all resize-none placeholder:text-white/10"
                                        placeholder={isAr ? 'اشرح للتاجر ماهي المشكلة في هذا المستند...' : 'Explain the issue with this document...'}
                                    />
                                </div>

                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <label className="flex items-center gap-2 text-xs font-black text-white/40 uppercase tracking-[0.2em]">
                                            <PenTool size={14} className="text-red-500" />
                                            {isAr ? 'التوقيع الرقمي' : 'Digital Signature'}
                                        </label>
                                        <div className="flex bg-white/5 p-1 rounded-xl border border-white/5">
                                            <button
                                                onClick={() => { setSignatureType('TYPED'); setError(''); }}
                                                className={`px-4 py-1.5 text-[10px] font-black uppercase rounded-lg transition-all ${signatureType === 'TYPED' ? 'bg-red-500 text-white shadow-lg shadow-red-500/20' : 'text-white/30 hover:text-white'}`}
                                            >
                                                {isAr ? 'كتابة' : 'Type'}
                                            </button>
                                            <button
                                                onClick={() => { setSignatureType('DRAWN'); setError(''); }}
                                                className={`px-4 py-1.5 text-[10px] font-black uppercase rounded-lg transition-all ${signatureType === 'DRAWN' ? 'bg-red-500 text-white shadow-lg shadow-red-500/20' : 'text-white/30 hover:text-white'}`}
                                            >
                                                {isAr ? 'رسم' : 'Draw'}
                                            </button>
                                        </div>
                                    </div>

                                    <div className="relative min-h-[160px] bg-black/40 rounded-3xl border border-white/5 overflow-hidden group shadow-inner">
                                        {signatureType === 'TYPED' ? (
                                            <div className="absolute inset-0 flex flex-col items-center justify-center p-6">
                                                <input
                                                    type="text"
                                                    value={signatureText}
                                                    onChange={(e) => { setSignatureText(e.target.value); setError(''); }}
                                                    className="w-full bg-transparent border-b border-red-500/20 focus:border-red-500 text-center text-4xl text-red-500 py-4 focus:outline-none placeholder:text-white/5"
                                                    placeholder="Digital Authorization"
                                                    style={{ fontFamily: '"Brush Script MT", cursive, sans-serif' }}
                                                />
                                            </div>
                                        ) : (
                                            <>
                                                <canvas
                                                    ref={canvasRef}
                                                    width={600}
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
                                                        <img src={signatureImage} alt="Signature" className="h-full object-contain pointer-events-none filter drop-shadow-[0_0_5px_rgba(239,68,68,0.5)]" />
                                                    </div>
                                                )}
                                                {!signatureImage && !isDrawing && (
                                                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-white/5 text-[10px] font-black uppercase tracking-[0.3em]">
                                                        <PenTool size={24} className="mb-2 opacity-5" />
                                                        {isAr ? 'وقع هنا بالماوس أو اللمس' : 'Sign here to authorize'}
                                                    </div>
                                                )}
                                                {signatureImage && !isDrawing && (
                                                    <button onClick={clearSignature} className="absolute top-4 right-4 p-2 bg-red-500/10 text-red-400 hover:bg-red-500/20 rounded-xl transition-all">
                                                        <X size={14} />
                                                    </button>
                                                )}
                                            </>
                                        )}
                                    </div>
                                </div>

                                <div className="pt-4 flex gap-3">
                                    <button
                                        onClick={onClose}
                                        disabled={isSubmitting}
                                        className="flex-1 py-4 rounded-2xl bg-white/5 hover:bg-white/10 text-white/40 hover:text-white font-black text-[10px] uppercase tracking-widest transition-all"
                                    >
                                        {isAr ? 'إلغاء' : 'Cancel'}
                                    </button>
                                    <button
                                        onClick={handleConfirm}
                                        disabled={isSubmitting}
                                        className="flex-[2] py-4 rounded-2xl bg-red-500 hover:bg-red-600 text-white font-black text-[10px] uppercase tracking-widest transition-all shadow-xl shadow-red-500/20 flex items-center justify-center gap-2"
                                    >
                                        {isSubmitting ? (
                                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        ) : (
                                            <>
                                                <CheckCircle2 size={16} />
                                                {isAr ? 'إرسال الطلب واعتماده' : 'Authorize & Send Request'}
                                            </>
                                        )}
                                    </button>
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
