import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, ShieldCheck, Lock } from 'lucide-react';
import { EntitySearchInput } from '../../ui/EntitySearchInput';

interface ManualPayoutModalProps {
    show: boolean;
    onClose: () => void;
    currentAdmin: any;
    t: any;
    isAr: boolean;
    sendManualPayout: (dto: any) => Promise<{ success: boolean; message: string }>;
    processWithdrawal?: (id: string, action: 'approve' | 'reject', notes?: string, method?: string, signature?: string, adminName?: string, adminEmail?: string) => Promise<{ success: boolean; message: string }>;
    selectedRequest?: any;
}

export const ManualPayoutModal: React.FC<ManualPayoutModalProps> = ({ show, onClose, currentAdmin, t, isAr, sendManualPayout, processWithdrawal, selectedRequest }) => {
    const [isProcessing, setIsProcessing] = useState(false);
    const [payoutForm, setPayoutForm] = useState({
        userId: '',
        amount: '',
        method: 'STRIPE_CONNECT',
        note: '',
        adminSignature: ''
    });

    const [balances, setBalances] = useState({ available: 0, requested: 0, remaining: 0 });

    useEffect(() => {
        if (!show) {
            setPayoutForm({ userId: '', amount: '', method: 'STRIPE_CONNECT', note: '', adminSignature: '' });
            setBalances({ available: 0, requested: 0, remaining: 0 });
        } else if (selectedRequest) {
            const available = selectedRequest.role === 'CUSTOMER' 
                ? Number(selectedRequest.user?.customerBalance || 0) 
                : Number(selectedRequest.store?.balance || 0);
            const requested = Number(selectedRequest.amount || 0);
            
            setPayoutForm({
                userId: selectedRequest.role === 'CUSTOMER' ? selectedRequest.userId : selectedRequest.storeId,
                amount: String(requested),
                method: selectedRequest.payoutMethod === 'STRIPE' ? 'STRIPE_CONNECT' : 'MANUAL',
                note: selectedRequest.adminNotes || '',
                adminSignature: ''
            });

            setBalances({
                available,
                requested,
                remaining: available - requested
            });
        }
    }, [show, selectedRequest]);

    const submitManualPayout = async () => {
        if (!payoutForm.userId || !payoutForm.amount || !payoutForm.adminSignature) {
            alert(t.admin.billing.alerts.fillRequired);
            return;
        }
        setIsProcessing(true);
        let res;
        
        if (selectedRequest && processWithdrawal) {
            // Approval flow for existing request
            const backendMethod = payoutForm.method === 'STRIPE_CONNECT' ? 'STRIPE' : 'BANK_TRANSFER';
            res = await processWithdrawal(
                selectedRequest.id,
                'approve',
                payoutForm.note,
                backendMethod,
                payoutForm.adminSignature,
                currentAdmin?.name || 'Admin',
                currentAdmin?.email || 'admin@etashleh.com'
            );
        } else {
            // Manual payout flow
            const dto = {
                userId: payoutForm.userId,
                amount: Number(payoutForm.amount),
                method: payoutForm.method,
                note: payoutForm.note,
                adminName: currentAdmin?.name || 'Admin',
                adminEmail: currentAdmin?.email || 'admin@etashleh.com',
                adminSignature: payoutForm.adminSignature
            };
            res = await sendManualPayout(dto);
        }

        setIsProcessing(false);
        if (res.success) {
            onClose();
        }
        alert(res.message);
    };

    return (
        <AnimatePresence>
            {show && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl">
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.95, y: 20 }} 
                        animate={{ opacity: 1, scale: 1, y: 0 }} 
                        exit={{ opacity: 0, scale: 0.95, y: 20 }} 
                        className="relative bg-[#1A1814] border border-gold-500/20 rounded-[3rem] w-full max-w-xl shadow-[0_0_100px_rgba(212,175,55,0.15)] overflow-hidden max-h-[90vh] flex flex-col"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="overflow-y-auto no-scrollbar">
                        {/* Modal Header */}
                        <div className="p-10 border-b border-white/5 bg-gradient-to-r from-gold-500/[0.05] to-transparent">
                            <div className="flex items-center gap-6">
                                <div className="w-16 h-16 bg-gold-500 rounded-[1.5rem] flex items-center justify-center shadow-2xl shadow-gold-500/30">
                                    <Send className="text-black" size={28} />
                                </div>
                                <div>
                                    <h3 className="text-2xl font-black text-white uppercase tracking-tight">{t.admin.billing.manualPayout.title}</h3>
                                    <p className="text-white/40 text-[10px] font-bold uppercase  mt-1">{t.admin.billing.manualPayout.subtitle}</p>
                                </div>
                            </div>
                        </div>
                        
                        <div className="p-10 space-y-8">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-white/30 uppercase  ml-1">{t.admin.billing.manualPayout.targetNode}</label>
                                    {selectedRequest ? (
                                        <div className="w-full bg-black/40 border border-white/10 rounded-2xl p-5 text-sm text-white font-mono font-bold opacity-80 cursor-not-allowed">
                                            {selectedRequest.store?.name || selectedRequest.user?.name || payoutForm.userId}
                                        </div>
                                    ) : (
                                        <EntitySearchInput 
                                            onSelect={(res) => setPayoutForm({ ...payoutForm, userId: res?.id || '' })}
                                            placeholder="XXXX-XXXX-XXXX"
                                        />
                                    )}
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-white/30 uppercase  ml-1">{t.admin.billing.manualPayout.volume}</label>
                                    <input 
                                        type="number" 
                                        value={payoutForm.amount} 
                                        onChange={e => setPayoutForm({...payoutForm, amount: e.target.value})} 
                                        className="w-full bg-black/40 border border-white/10 rounded-2xl p-5 text-lg text-white font-mono font-black outline-none focus:border-gold-500/50 transition-all" 
                                        placeholder="0.00" 
                                        disabled={!!selectedRequest}
                                    />
                                </div>
                            </div>

                            {selectedRequest && (
                                <div className="p-6 bg-white/[0.02] border border-white/5 rounded-2xl flex flex-col sm:flex-row justify-between items-center gap-4 text-center sm:text-left">
                                    <div className="flex-1">
                                        <div className="text-[10px] font-black text-white/30 uppercase mb-1">{isAr ? 'الرصيد المتاح' : 'Available Balance'}</div>
                                        <div className="text-xl font-mono font-black text-emerald-400">{balances.available.toLocaleString()} <span className="text-[10px] text-emerald-400/50">AED</span></div>
                                    </div>
                                    <div className="text-white/20 font-black text-2xl">-</div>
                                    <div className="flex-1">
                                        <div className="text-[10px] font-black text-white/30 uppercase mb-1">{isAr ? 'المراد سحبه' : 'Requested'}</div>
                                        <div className="text-xl font-mono font-black text-rose-400">{balances.requested.toLocaleString()} <span className="text-[10px] text-rose-400/50">AED</span></div>
                                    </div>
                                    <div className="text-white/20 font-black text-2xl">=</div>
                                    <div className="flex-1">
                                        <div className="text-[10px] font-black text-white/30 uppercase mb-1">{isAr ? 'الرصيد المتبقي' : 'Remaining'}</div>
                                        <div className={`text-2xl font-mono font-black ${balances.remaining < 0 ? 'text-rose-500' : 'text-white'}`}>{balances.remaining.toLocaleString()} <span className="text-[10px] text-white/20">AED</span></div>
                                    </div>
                                </div>
                            )}

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-white/30 uppercase  ml-1">{t.admin.billing.manualPayout.protocol}</label>
                                <select 
                                    value={payoutForm.method} 
                                    onChange={e => setPayoutForm({...payoutForm, method: e.target.value})} 
                                    className="w-full bg-black/40 border border-white/10 rounded-2xl p-5 text-sm text-white font-black uppercase  outline-none focus:border-gold-500/50 transition-all"
                                >
                                    <option value="STRIPE_CONNECT">{isAr ? 'بوابة الدفع الآلية (Stripe Connect)' : 'Automated Gateway (Stripe Connect)'}</option>
                                    <option value="MANUAL">{isAr ? 'تسوية خارجية (تحويل بنكي يدوي)' : 'Offline Settlement (Manual Bank)'}</option>
                                </select>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-white/30 uppercase  ml-1">
                                    {isAr ? 'سبب السحب (ملاحظة داخلية + ستُرسل للمستفيد)' : 'Payout Reason (Internal Note + Sent to Beneficiary)'}
                                </label>
                                <textarea 
                                    value={payoutForm.note} 
                                    onChange={e => setPayoutForm({...payoutForm, note: e.target.value})} 
                                    className="w-full bg-black/40 border border-white/10 rounded-2xl p-5 text-sm text-white outline-none focus:border-gold-500/50 transition-all font-medium min-h-[120px] resize-y" 
                                    placeholder={isAr ? '...أدخل سبب هذا السحب اليدوي' : 'Enter reason for manual payout...'} 
                                />
                            </div>

                            <div className="p-8 bg-rose-500/[0.03] border border-rose-500/20 rounded-[2rem] relative overflow-hidden group">
                                <div className="absolute top-0 right-0 p-4 opacity-[0.05] group-hover:opacity-10 transition-opacity">
                                    <ShieldCheck size={60} className="text-rose-500" />
                                </div>
                                <label className="text-[10px] font-black text-rose-500 uppercase  mb-4 block flex items-center gap-2">
                                    <Lock size={14}/> {t.admin.billing.manualPayout.cryptoSignature}
                                </label>
                                <input 
                                    type="text" 
                                    value={payoutForm.adminSignature} 
                                    onChange={e => setPayoutForm({...payoutForm, adminSignature: e.target.value})} 
                                    className="w-full bg-black/60 border border-rose-500/30 rounded-xl p-5 text-sm text-white font-mono font-black outline-none focus:border-rose-500 transition-all text-center " 
                                    placeholder={t.admin.billing.manualPayout.signPrompt} 
                                    autoComplete="off"
                                />
                                <p className="text-[9px] text-rose-500/40 font-bold mt-4 text-center uppercase  leading-relaxed">
                                    {t.admin.billing.manualPayout.auditCommit}
                                </p>
                            </div>
                        </div>
                        
                        <div className="p-10 border-t border-white/5 bg-black/20 flex gap-4">
                            <button 
                                onClick={onClose} 
                                className="flex-1 py-5 bg-white/5 hover:bg-white/10 text-white font-black uppercase  rounded-2xl transition-all text-[10px] border border-white/5"
                            >
                                {t.common.cancel}
                            </button>
                            <button 
                                disabled={isProcessing}
                                onClick={submitManualPayout} 
                                className={`flex-1 py-5 rounded-2xl shadow-2xl transition-all flex items-center justify-center gap-3 text-[10px] font-black uppercase ${
                                    isProcessing ? 'bg-gold-500/50 text-black/50 cursor-not-allowed shadow-none' : 'bg-gold-500 hover:bg-gold-400 text-black shadow-gold-500/20'
                                }`}
                            >
                                {isProcessing ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full animate-spin" />
                                        {isAr ? 'جاري المعالجة...' : 'PROCESSING...'}
                                    </>
                                ) : (
                                    <>
                                        <Send size={18} /> 
                                        {t.admin.billing.manualPayout.execute}
                                    </>
                                )}
                            </button>
                        </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};
