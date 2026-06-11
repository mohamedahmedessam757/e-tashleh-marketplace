import React, { useState } from 'react';
import { X, ShieldAlert, FileSignature } from 'lucide-react';
import { useLanguage } from '../../../contexts/LanguageContext';
import { useAdminStore } from '../../../stores/useAdminStore';

interface RejectWithdrawalModalProps {
    isOpen: boolean;
    onClose: () => void;
    request: any;
}

export const RejectWithdrawalModal: React.FC<RejectWithdrawalModalProps> = ({ isOpen, onClose, request }) => {
    const { t, isAr } = useLanguage();
    const processWithdrawal = useAdminStore(s => s.processWithdrawal);
    const currentAdmin = useAdminStore(s => s.currentAdmin);

    const [reason, setReason] = useState('');
    const [signature, setSignature] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    if (!isOpen || !request) return null;

    const targetName = request.role === 'CUSTOMER' ? (request.user?.name || request.user?.email) : request.store?.name;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (!reason.trim()) {
            setError(isAr ? 'يجب إدخال سبب الرفض' : 'Rejection reason is required');
            return;
        }

        if (!signature.trim()) {
            setError(isAr ? 'التوقيع الإلكتروني مطلوب' : 'Digital signature is required');
            return;
        }

        setIsProcessing(true);
        try {
            const res = await processWithdrawal(
                request.id, 
                'reject', 
                reason, 
                undefined, // method
                signature, 
                currentAdmin?.name, 
                currentAdmin?.email
            );
            
            if (res.success) {
                onClose();
            } else {
                setError(res.message);
            }
        } catch (err: any) {
            setError(err.message || 'An error occurred');
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
            
            <div className="relative w-full max-w-lg bg-[#0F1014] rounded-2xl border border-rose-500/20 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                <div className="flex items-center justify-between px-6 py-4 border-b border-rose-500/10 bg-rose-500/5">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center">
                            <ShieldAlert size={20} className="text-rose-500" />
                        </div>
                        <div>
                            <h2 className="text-lg font-black text-rose-500 uppercase tracking-wider">
                                {isAr ? 'رفض طلب السحب' : 'Reject Withdrawal'}
                            </h2>
                            <p className="text-xs text-white/40">
                                {isAr ? 'إجراء مالي حساس' : 'Sensitive Financial Action'}
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-xl transition-colors">
                        <X size={20} className="text-white/40 hover:text-white" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                    {error && (
                        <div className="mb-6 p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-500 text-sm flex items-center gap-2">
                            <ShieldAlert size={16} />
                            {error}
                        </div>
                    )}

                    <div className="mb-6 p-4 bg-[#14151A] rounded-xl border border-white/5 flex flex-col gap-2">
                        <div className="flex justify-between text-sm">
                            <span className="text-white/40">{isAr ? 'المستفيد' : 'Beneficiary'}:</span>
                            <span className="font-bold text-white">{targetName}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-white/40">{isAr ? 'المبلغ المطلوب' : 'Requested Amount'}:</span>
                            <span className="font-mono font-bold text-gold-500">{Number(request.amount).toLocaleString()} AED</span>
                        </div>
                    </div>

                    <form id="reject-form" onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-white/40 uppercase tracking-wider">
                                {isAr ? 'سبب الرفض (سيُرسل للعميل/التاجر)' : 'Reason (Will be sent to user/merchant)'} <span className="text-rose-500">*</span>
                            </label>
                            <textarea
                                required
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                                className="w-full h-24 bg-[#1A1B23] border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/20 focus:border-rose-500/50 focus:ring-1 focus:ring-rose-500/50 outline-none transition-all resize-none text-sm"
                                placeholder={isAr ? 'يرجى كتابة سبب الرفض بوضوح...' : 'Please enter clear rejection reason...'}
                            />
                        </div>

                        <div className="p-5 bg-rose-500/5 border border-rose-500/20 rounded-xl space-y-4">
                            <div className="flex items-center gap-2 text-rose-500">
                                <FileSignature size={18} />
                                <span className="font-bold text-sm uppercase tracking-wider">{isAr ? 'التوقيع الإداري' : 'Admin Signature'}</span>
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs text-rose-400/60 uppercase tracking-wider">
                                    {isAr ? 'اسمك بالكامل (للتدقيق)' : 'Full Name (For Audit)'} <span className="text-rose-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={signature}
                                    onChange={(e) => setSignature(e.target.value)}
                                    className="w-full bg-[#14151A] border border-rose-500/20 rounded-lg px-4 py-2.5 text-rose-400 placeholder-rose-500/20 focus:border-rose-500 focus:ring-1 focus:ring-rose-500 outline-none transition-all font-mono text-sm"
                                    placeholder={isAr ? 'اكتب اسمك الكامل هنا...' : 'Type your full name here...'}
                                />
                            </div>
                        </div>
                    </form>
                </div>

                <div className="p-6 border-t border-white/5 bg-[#14151A] flex gap-3">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={isProcessing}
                        className="flex-1 py-3 px-4 rounded-xl border border-white/10 text-white/60 hover:text-white hover:bg-white/5 transition-all text-sm font-bold disabled:opacity-50"
                    >
                        {isAr ? 'إلغاء' : 'Cancel'}
                    </button>
                    <button
                        type="submit"
                        form="reject-form"
                        disabled={isProcessing}
                        className="flex-[2] py-3 px-4 rounded-xl bg-rose-500/10 hover:bg-rose-500 border border-rose-500/20 text-rose-500 hover:text-white transition-all text-sm font-black tracking-wider uppercase disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {isProcessing ? (
                            <span className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                        ) : (
                            <ShieldAlert size={18} />
                        )}
                        {isAr ? 'تأكيد الرفض' : 'Confirm Rejection'}
                    </button>
                </div>
            </div>
        </div>
    );
};
