import React, { useState, useRef, useEffect, useCallback, memo } from 'react';
import { createPortal } from 'react-dom';
import { ShieldCheck, User, PenTool, Calendar, X, CheckCircle2, AlertCircle, FileText } from 'lucide-react';
import { useLanguage } from '../../../contexts/LanguageContext';

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

/**
 * Lightweight admin signature modal.
 * Design preserved; heavy GPU (backdrop-blur / spring / live PNG) removed for smooth open.
 */
export const AdminSignatureModal: React.FC<AdminSignatureModalProps> = memo(({
    isOpen,
    onClose,
    onConfirm,
    actionType = 'APPROVE',
    initialDetails = '',
    title,
    subtitle,
}) => {
    const { t, language } = useLanguage();
    const isAr = language === 'ar';
    const translates = (t as any).admin.orderDetails.verificationReview;

    const [employeeName, setEmployeeName] = useState('');
    const [signatureType, setSignatureType] = useState<'DRAWN' | 'TYPED'>('TYPED');
    const [signatureText, setSignatureText] = useState('');
    const [reviewDetails, setReviewDetails] = useState(initialDetails);
    const [isAcknowledged, setIsAcknowledged] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [hasDrawnStroke, setHasDrawnStroke] = useState(false);
    const [openedAtLabel, setOpenedAtLabel] = useState('');

    const canvasRef = useRef<HTMLCanvasElement>(null);
    const isDrawingRef = useRef(false);
    const hasStrokeRef = useRef(false);

    // Mount/unmount body scroll lock + reset lightweight fields only when opening
    useEffect(() => {
        if (!isOpen) return;

        setReviewDetails(initialDetails);
        setError('');
        setIsSubmitting(false);
        setHasDrawnStroke(false);
        hasStrokeRef.current = false;
        setOpenedAtLabel(
            `${new Date().toLocaleDateString(isAr ? 'ar-EG' : 'en-GB')} - ${new Date().toLocaleTimeString(
                isAr ? 'ar-EG' : 'en-GB',
                { hour: '2-digit', minute: '2-digit' },
            )}`,
        );

        const prevOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = prevOverflow;
        };
    }, [isOpen, initialDetails, isAr]);

    // Init canvas ink only when draw mode mounts
    useEffect(() => {
        if (!isOpen || signatureType !== 'DRAWN') return;
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d', { alpha: true });
        if (!ctx) return;
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.strokeStyle = actionType === 'REJECT' ? '#f87171' : '#ffffff';
    }, [isOpen, signatureType, actionType]);

    const getCanvasPoint = useCallback((e: React.MouseEvent | React.TouchEvent) => {
        const canvas = canvasRef.current;
        if (!canvas) return null;
        const rect = canvas.getBoundingClientRect();
        const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
        return {
            x: (clientX - rect.left) * (canvas.width / rect.width),
            y: (clientY - rect.top) * (canvas.height / rect.height),
        };
    }, []);

    const startDrawing = useCallback(
        (e: React.MouseEvent | React.TouchEvent) => {
            e.preventDefault();
            const canvas = canvasRef.current;
            const ctx = canvas?.getContext('2d');
            const point = getCanvasPoint(e);
            if (!canvas || !ctx || !point) return;
            isDrawingRef.current = true;
            ctx.beginPath();
            ctx.moveTo(point.x, point.y);
        },
        [getCanvasPoint],
    );

    const draw = useCallback(
        (e: React.MouseEvent | React.TouchEvent) => {
            if (!isDrawingRef.current) return;
            e.preventDefault();
            const canvas = canvasRef.current;
            const ctx = canvas?.getContext('2d');
            const point = getCanvasPoint(e);
            if (!canvas || !ctx || !point) return;
            ctx.lineTo(point.x, point.y);
            ctx.stroke();
            if (!hasStrokeRef.current) {
                hasStrokeRef.current = true;
                setHasDrawnStroke(true);
            }
        },
        [getCanvasPoint],
    );

    const stopDrawing = useCallback(() => {
        isDrawingRef.current = false;
    }, []);

    const clearSignature = useCallback(() => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (canvas && ctx) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
        hasStrokeRef.current = false;
        setHasDrawnStroke(false);
    }, []);

    const handleConfirm = async () => {
        if (!employeeName.trim()) {
            setError(translates.nameRequired);
            return;
        }
        if (signatureType === 'TYPED' && !signatureText.trim()) {
            setError(translates.signatureRequired);
            return;
        }
        if (signatureType === 'DRAWN' && !hasStrokeRef.current) {
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
            // Capture PNG only once on submit (not on every stroke end)
            let adminSignatureImage: string | undefined;
            if (signatureType === 'DRAWN' && canvasRef.current) {
                adminSignatureImage = canvasRef.current.toDataURL('image/png');
            }
            await onConfirm({
                adminSignatureName: employeeName,
                adminSignatureType: signatureType,
                adminSignatureText: signatureType === 'TYPED' ? signatureText : undefined,
                adminSignatureImage,
                adminReviewDetails: reviewDetails,
            });
        } catch (err: any) {
            setError(err?.message || 'Operation failed');
        } finally {
            setIsSubmitting(false);
        }
    };

    // Do not mount portal / DOM at all when closed — biggest win for page + open cost
    if (!isOpen || typeof document === 'undefined') return null;

    return createPortal(
        <div
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
            role="dialog"
            aria-modal="true"
        >
            {/* Backdrop: solid only — backdrop-blur was crushing GPU on open */}
            <div
                className="absolute inset-0 bg-black/90"
                onClick={onClose}
                aria-hidden
            />

            {/* Content: CSS fade (no spring / no layout thrash) */}
            <div
                className="relative w-full max-w-2xl animate-modal-snap-in"
                style={{ contain: 'layout paint' }}
            >
                <div className="p-8 rounded-2xl border border-white/10 bg-[#141210] shadow-[0_0_60px_rgba(0,0,0,0.45)] overflow-hidden">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-8">
                        <div className="flex items-center gap-4">
                            <div
                                className={`p-3 rounded-2xl ${
                                    actionType === 'APPROVE'
                                        ? 'bg-green-500/20 text-green-400'
                                        : 'bg-red-500/20 text-red-400'
                                }`}
                            >
                                <ShieldCheck size={28} />
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold text-white leading-tight">
                                    {title || translates.modalTitle}
                                </h2>
                                <p className="text-white/50 text-sm mt-1">
                                    {subtitle ||
                                        (actionType === 'APPROVE'
                                            ? isAr
                                                ? 'اعتماد مطابقة القطعة للمستندات'
                                                : 'Approving part compliance'
                                            : isAr
                                              ? 'رفض مطابقة القطعة'
                                              : 'Rejecting part compliance')}
                                </p>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={onClose}
                            className="p-2 hover:bg-white/5 rounded-xl text-white/40 transition-colors"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    {error ? (
                        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3 text-red-400 text-sm">
                            <AlertCircle size={18} />
                            {error}
                        </div>
                    ) : null}

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
                                onChange={(e) => {
                                    setEmployeeName(e.target.value);
                                    if (error) setError('');
                                }}
                                className="w-full bg-white/5 border border-white/10 focus:border-primary-500/50 rounded-xl px-4 py-3 text-white focus:outline-none transition-colors"
                                placeholder={isAr ? 'الاسم الثلاثي للموظف المراجع' : 'Full employee name'}
                                autoComplete="name"
                            />
                        </div>

                        {/* Review Details */}
                        <div>
                            <label className="flex items-center gap-2 text-sm font-bold text-white/70 mb-2">
                                <FileText size={16} className="text-primary-400" />
                                {translates.details}{' '}
                                {actionType === 'REJECT' && <span className="text-red-500">*</span>}
                            </label>
                            <textarea
                                value={reviewDetails}
                                onChange={(e) => {
                                    setReviewDetails(e.target.value);
                                    if (error) setError('');
                                }}
                                rows={4}
                                className="w-full bg-white/5 border border-white/10 focus:border-primary-500/50 rounded-xl px-4 py-3 text-white focus:outline-none transition-colors resize-none text-sm"
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
                                        type="button"
                                        onClick={() => {
                                            setSignatureType('TYPED');
                                            if (error) setError('');
                                        }}
                                        className={`px-3 py-1 text-xs font-bold rounded-md transition-colors ${
                                            signatureType === 'TYPED'
                                                ? 'bg-primary-500 text-black'
                                                : 'text-white/40 hover:text-white'
                                        }`}
                                    >
                                        {isAr ? 'كتابة' : 'Type'}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setSignatureType('DRAWN');
                                            if (error) setError('');
                                        }}
                                        className={`px-3 py-1 text-xs font-bold rounded-md transition-colors ${
                                            signatureType === 'DRAWN'
                                                ? 'bg-primary-500 text-black'
                                                : 'text-white/40 hover:text-white'
                                        }`}
                                    >
                                        {isAr ? 'رسم' : 'Draw'}
                                    </button>
                                </div>
                            </div>

                            <div className="relative min-h-[160px] bg-black/40 rounded-2xl border border-white/10 overflow-hidden">
                                {signatureType === 'TYPED' ? (
                                    <div className="absolute inset-0 flex flex-col items-center justify-center p-6">
                                        <input
                                            type="text"
                                            value={signatureText}
                                            onChange={(e) => {
                                                setSignatureText(e.target.value);
                                                if (error) setError('');
                                            }}
                                            className="w-full bg-transparent border-b border-amber-500/30 focus:border-amber-500 text-center text-4xl text-amber-400 py-2 focus:outline-none placeholder:text-white/5"
                                            placeholder={isAr ? 'التوقيع الرقمي' : 'Digital Signature'}
                                            style={{ fontFamily: '"Brush Script MT", cursive, sans-serif' }}
                                        />
                                    </div>
                                ) : (
                                    <>
                                        {/* Smaller canvas buffer — enough quality, far less memory */}
                                        <canvas
                                            ref={canvasRef}
                                            width={600}
                                            height={160}
                                            className="w-full h-40 cursor-crosshair touch-none"
                                            onMouseDown={startDrawing}
                                            onMouseMove={draw}
                                            onMouseUp={stopDrawing}
                                            onMouseLeave={stopDrawing}
                                            onTouchStart={startDrawing}
                                            onTouchMove={draw}
                                            onTouchEnd={stopDrawing}
                                        />
                                        {!hasDrawnStroke && (
                                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-white/10 text-xs font-mono tracking-widest uppercase">
                                                {isAr
                                                    ? 'ارسم توقيعك هنا بالماوس أو اللمس'
                                                    : 'Draw your signature here'}
                                            </div>
                                        )}
                                        {hasDrawnStroke && (
                                            <button
                                                type="button"
                                                onClick={clearSignature}
                                                className="absolute top-2 right-2 p-1.5 bg-red-500/20 text-red-400 hover:bg-red-500/40 rounded-lg transition-colors"
                                            >
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
                                onChange={(e) => {
                                    setIsAcknowledged(e.target.checked);
                                    if (error) setError('');
                                }}
                                className="mt-1 w-5 h-5 rounded border-white/10 bg-white/5 text-primary-500 focus:ring-primary-500/20"
                            />
                            <span className="text-sm text-white/80 leading-relaxed select-none">
                                {translates.acknowledgment}
                            </span>
                        </label>

                        <div className="flex items-center justify-between pt-4">
                            <div className="flex items-center gap-2 text-white/30 text-xs font-mono">
                                <Calendar size={12} />
                                {openedAtLabel}
                            </div>
                            <div className="flex gap-3">
                                <button
                                    type="button"
                                    onClick={onClose}
                                    disabled={isSubmitting}
                                    className="px-6 py-3 rounded-xl hover:bg-white/5 text-white/60 hover:text-white transition-colors text-sm font-bold"
                                >
                                    {translates.cancel}
                                </button>
                                <button
                                    type="button"
                                    onClick={handleConfirm}
                                    disabled={isSubmitting}
                                    className={`px-8 py-3 rounded-xl font-bold flex items-center gap-2 transition-colors shadow-lg text-sm active:scale-95 disabled:opacity-50 ${
                                        actionType === 'APPROVE'
                                            ? 'bg-green-500 hover:bg-green-600 text-white shadow-green-500/20'
                                            : 'bg-red-500 hover:bg-red-600 text-white shadow-red-500/20'
                                    }`}
                                >
                                    {isSubmitting ? (
                                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    ) : (
                                        <CheckCircle2 size={18} />
                                    )}
                                    {translates.submitReview}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>,
        document.body,
    );
});

AdminSignatureModal.displayName = 'AdminSignatureModal';
