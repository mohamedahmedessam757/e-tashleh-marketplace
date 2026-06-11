
import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, User, PenTool, X, CheckCircle2, AlertCircle, FileText, Shield } from 'lucide-react';
import { useLanguage } from '../../../contexts/LanguageContext';
import { GlassCard } from '../../ui/GlassCard';

interface AdminInitiateChatModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (data: {
        reason: string;
        employeeName: string;
        signature: string;
        signatureType: 'DRAWN' | 'TYPED';
    }) => Promise<void>;
    targetName: string;
    targetRole: 'CUSTOMER' | 'VENDOR';
}

export const AdminInitiateChatModal: React.FC<AdminInitiateChatModalProps> = ({
    isOpen, onClose, onConfirm, targetName, targetRole
}) => {
    const { t, language } = useLanguage();
    const isAr = language === 'ar';

    const [employeeName, setEmployeeName] = useState('');
    const [signatureType, setSignatureType] = useState<'DRAWN' | 'TYPED'>('TYPED');
    const [signatureText, setSignatureText] = useState('');
    const [signatureImage, setSignatureImage] = useState<string | null>(null);
    const [reason, setReason] = useState('');
    const [isAcknowledged, setIsAcknowledged] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => { document.body.style.overflow = 'unset'; };
    }, [isOpen]);

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
                ctx.strokeStyle = '#ffffff';
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
            setError(isAr ? 'اسم الموظف مطلوب' : 'Employee name is required');
            return;
        }
        if (!reason.trim()) {
            setError(isAr ? 'سبب فتح المحادثة مطلوب' : 'Reason for opening chat is required');
            return;
        }
        if (signatureType === 'TYPED' && !signatureText.trim()) {
            setError(isAr ? 'التوقيع مطلوب' : 'Signature is required');
            return;
        }
        if (signatureType === 'DRAWN' && !signatureImage) {
            setError(isAr ? 'التوقيع مطلوب' : 'Signature is required');
            return;
        }
        if (!isAcknowledged) {
            setError(isAr ? 'يجب الإقرار بمسؤولية فتح المحادثة' : 'You must acknowledge the responsibility');
            return;
        }

        setIsSubmitting(true);
        setError('');
        try {
            await onConfirm({
                employeeName,
                reason,
                signature: signatureType === 'TYPED' ? signatureText : signatureImage!,
                signatureType
            });
            onClose();
        } catch (err: any) {
            setError(err.message || 'Failed to initiate chat');
        } finally {
            setIsSubmitting(false);
        }
    };

    return createPortal(
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-black/80 backdrop-blur-xl" />
                    
                    <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="relative w-full max-w-lg">
                        <GlassCard className="p-8 border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.5)] overflow-hidden bg-[#111111]/90">
                            <div className="flex items-center justify-between mb-8 border-b border-white/5 pb-6">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 rounded-2xl bg-white/5 text-white">
                                        <MessageSquare size={24} />
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-black !text-white leading-tight uppercase tracking-widest">
                                            {isAr ? 'بدء محادثة إدارية' : 'Initiate Admin Chat'}
                                        </h2>
                                        <p className="text-white/40 text-[10px] font-bold uppercase tracking-wider mt-1">
                                            {isAr ? `تواصل مباشر مع: ${targetName}` : `Direct session: ${targetName}`}
                                        </p>
                                    </div>
                                </div>
                                <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-xl text-white/20 hover:text-white transition-colors">
                                    <X size={20} />
                                </button>
                            </div>

                            {error && (
                                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3 text-red-400 text-xs font-bold">
                                    <AlertCircle size={16} />
                                    {error}
                                </motion.div>
                            )}

                            <div className="space-y-6">
                                <div className="space-y-2">
                                    <label className="flex items-center gap-2 text-[10px] font-black !text-white uppercase tracking-[0.2em]">
                                        <User size={12} className="text-white/30" />
                                        {isAr ? 'اسم الموظف المسؤول' : 'Responsible Employee'} <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={employeeName}
                                        onChange={(e) => setEmployeeName(e.target.value)}
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 text-white text-sm font-bold placeholder:text-white/10 focus:border-white/20 focus:bg-white/10 outline-none transition-all"
                                        placeholder={isAr ? 'أدخل اسمك بالكامل...' : 'Enter full name...'}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="flex items-center gap-2 text-[10px] font-black !text-white uppercase tracking-[0.2em]">
                                        <FileText size={12} className="text-white/30" />
                                        {isAr ? 'سبب فتح المحادثة' : 'Reason for Initiation'} <span className="text-red-500">*</span>
                                    </label>
                                    <textarea
                                        value={reason}
                                        onChange={(e) => setReason(e.target.value)}
                                        rows={3}
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 text-white text-sm font-bold placeholder:text-white/10 focus:border-white/20 focus:bg-white/10 outline-none transition-all resize-none"
                                        placeholder={isAr ? 'اشرح سبب التواصل بالتفصيل...' : 'Explain the reason in detail...'}
                                    />
                                </div>

                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <label className="flex items-center gap-2 text-[10px] font-black !text-white uppercase tracking-[0.2em]">
                                            <PenTool size={12} className="text-white/30" />
                                            {isAr ? 'التوقيع الإداري' : 'Administrative Signature'} <span className="text-red-500">*</span>
                                        </label>
                                        <div className="flex bg-white/5 p-1 rounded-xl border border-white/5">
                                            <button onClick={() => setSignatureType('TYPED')} className={`px-4 py-1.5 text-[9px] font-black uppercase tracking-widest rounded-lg transition-all ${signatureType === 'TYPED' ? 'bg-white text-black shadow-lg' : 'text-white/30 hover:text-white'}`}>
                                                {isAr ? 'كتابة' : 'Type'}
                                            </button>
                                            <button onClick={() => setSignatureType('DRAWN')} className={`px-4 py-1.5 text-[9px] font-black uppercase tracking-widest rounded-lg transition-all ${signatureType === 'DRAWN' ? 'bg-white text-black shadow-lg' : 'text-white/30 hover:text-white'}`}>
                                                {isAr ? 'رسم' : 'Draw'}
                                            </button>
                                        </div>
                                    </div>

                                    <div className="relative min-h-[140px] bg-black/40 rounded-2xl border border-white/5 overflow-hidden group hover:border-white/10 transition-colors">
                                        {signatureType === 'TYPED' ? (
                                            <div className="absolute inset-0 flex items-center justify-center p-6">
                                                <input
                                                    type="text"
                                                    value={signatureText}
                                                    onChange={(e) => setSignatureText(e.target.value)}
                                                    className="w-full bg-transparent border-b border-white/10 text-center text-4xl text-white py-2 focus:outline-none focus:border-white/30 transition-all"
                                                    placeholder={isAr ? 'الاسم كاملاً' : 'Full Signature'}
                                                    style={{ fontFamily: '"Brush Script MT", cursive, sans-serif' }}
                                                />
                                            </div>
                                        ) : (
                                            <>
                                                <canvas
                                                    ref={canvasRef}
                                                    width={800}
                                                    height={200}
                                                    className="w-full h-32 cursor-crosshair touch-none"
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
                                                    <div className="w-full h-32 flex items-center justify-center p-4">
                                                        <img src={signatureImage} alt="Signature" className="h-full object-contain filter invert" />
                                                    </div>
                                                )}
                                                {signatureImage && !isDrawing && (
                                                    <button onClick={clearSignature} className="absolute top-2 right-2 p-1.5 bg-white/5 hover:bg-white/10 text-white/40 hover:text-white rounded-lg transition-all">
                                                        <X size={14} />
                                                    </button>
                                                )}
                                            </>
                                        )}
                                    </div>
                                </div>

                                <label className="flex gap-4 p-4 bg-white/5 border border-white/5 rounded-2xl cursor-pointer hover:bg-white/[0.07] transition-all group">
                                    <div className="mt-0.5">
                                        <input 
                                            type="checkbox" 
                                            checked={isAcknowledged} 
                                            onChange={(e) => setIsAcknowledged(e.target.checked)} 
                                            className="w-4 h-4 rounded border-white/20 bg-transparent text-white focus:ring-0 focus:ring-offset-0 transition-all" 
                                        />
                                    </div>
                                    <span className="text-[10px] font-bold text-white/40 group-hover:text-white/60 leading-relaxed uppercase tracking-wider">
                                        {isAr 
                                            ? 'أقر بأنني مسؤول عن فتح هذه الجلسة وأن جميع البيانات المدخلة صحيحة وتخضع لرقابة حوكمة المنصة.' 
                                            : 'I acknowledge full responsibility for this session and confirm all data is accurate and subject to platform governance.'}
                                    </span>
                                </label>

                                <div className="flex gap-4 pt-4">
                                    <button 
                                        onClick={onClose} 
                                        className="flex-1 py-4 text-[10px] font-black uppercase tracking-widest text-white/20 hover:text-white transition-all"
                                    >
                                        {isAr ? 'إلغاء' : 'Cancel'}
                                    </button>
                                    <button
                                        onClick={handleConfirm}
                                        disabled={isSubmitting}
                                        className="flex-[2] py-4 bg-white text-black font-black text-[10px] uppercase tracking-[0.2em] rounded-xl shadow-[0_0_20px_rgba(255,255,255,0.1)] hover:scale-[1.02] hover:shadow-[0_0_30px_rgba(255,255,255,0.2)] disabled:opacity-50 disabled:scale-100 transition-all flex items-center justify-center gap-3"
                                    >
                                        {isSubmitting ? (
                                            <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                                        ) : (
                                            <CheckCircle2 size={16} />
                                        )}
                                        {isAr ? 'بدء الجلسة الآن' : 'Initiate Session'}
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
