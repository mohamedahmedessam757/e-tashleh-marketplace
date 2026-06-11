import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Truck, 
  CreditCard, 
  Wallet, 
  CheckCircle2, 
  AlertTriangle, 
  Clock,
  Loader2,
  ArrowRight,
  ShieldCheck,
  PackageCheck,
  XCircle
} from 'lucide-react';
import { Button } from '../../ui/Button';
import { GlassCard } from '../../ui/GlassCard';
import { useLanguage } from '../../../contexts/LanguageContext';
import { useNotificationStore } from '../../../stores/useNotificationStore';
import { useResolutionStore, ResolutionCase } from '../../../stores/useResolutionStore';
import { useMerchantWalletStore } from '../../../stores/useMerchantWalletStore';
import { useCustomerWalletStore } from '../../../stores/useCustomerWalletStore';
import { Badge } from '../../ui/Badge';
import { loadStripe } from '@stripe/stripe-js';

interface ShippingPaymentCardProps {
    caseRecord: ResolutionCase;
    role: 'CUSTOMER' | 'MERCHANT' | 'ADMIN';
    onSuccess?: () => void;
}

export const ShippingPaymentCard: React.FC<ShippingPaymentCardProps> = ({ caseRecord, role, onSuccess }) => {
    const { t, language } = useLanguage();
    const isAr = language === 'ar';
    const { addNotification } = useNotificationStore();
    const [isProcessing, setIsProcessing] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState<'STRIPE' | 'WALLET' | null>(null);
    const [showWalletModal, setShowWalletModal] = useState(false);

    // Wallet States
    const merchantWallet = useMerchantWalletStore();
    const customerWallet = useCustomerWalletStore();

    useEffect(() => {
        if (role === 'MERCHANT') merchantWallet.fetchWallet();
        if (role === 'CUSTOMER') customerWallet.fetchWalletData(true);
    }, [role]);

    // 2026 Defensive Rendering: Prevent unmounting during rapid state transitions (Spec §15)
    // If we have a case that is resolved/approved but metadata is temporarily missing, wait instead of returning null
    const isTransitional = (caseRecord?.status === 'RESOLVED' || caseRecord?.status === 'APPROVED') && !caseRecord?.shippingPayee;

    const shippingAmount = Number(
        caseRecord?.shippingRefund || (caseRecord as any)?.shippingRoundtrip || 0,
    );

    if (!caseRecord || (!caseRecord.shippingPayee && !isTransitional) || shippingAmount <= 0) {
        // If we are ADMIN, and it's not a shipping payment case, don't show anything.
        // But if it IS a shipping payment case (has shippingPayee), show it even if not paid.
        if (role !== 'ADMIN') return null;
        if (!caseRecord?.shippingPayee) return null;
    }

    if (isTransitional) {
        return (
            <GlassCard className="p-8 border-cyan-500/20 animate-pulse">
                <div className="flex items-center gap-4">
                    <Loader2 className="w-6 h-6 text-cyan-500 animate-spin" />
                    <span className="text-sm font-bold text-white/60">
                        {isAr ? 'جاري تحديث بيانات السداد...' : 'Syncing payment data...'}
                    </span>
                </div>
            </GlassCard>
        );
    }

    const isPayee = role === 'ADMIN' ? false : caseRecord.shippingPayee === role;
    /** PAID only when Stripe/wallet payment was recorded (not legacy auto-marked at verdict). */
    const isPaid =
        caseRecord.shippingPaymentStatus === 'PAID' &&
        Boolean(caseRecord.shippingPaymentMethod);
    const needsPayment =
        isPayee &&
        !isPaid &&
        (caseRecord.shippingPaymentStatus === 'PENDING' ||
            caseRecord.shippingPaymentStatus === 'INSUFFICIENT_FUNDS' ||
            (caseRecord.shippingPaymentStatus === 'PAID' && !caseRecord.shippingPaymentMethod));
    const amount = shippingAmount;

    const balance = role === 'ADMIN' ? 0 : 
                   (role === 'MERCHANT' 
                    ? Number(merchantWallet.stats.available || 0) 
                    : Number(customerWallet.stats?.customerBalance || 0));

    const hasEnoughBalance = role === 'ADMIN' ? false : balance >= amount;

    // 2026 Resilient Translation Mapping
    const resT = (role === 'MERCHANT' 
        ? (t as any).dashboard?.merchant?.resolution 
        : (t as any).dashboard?.resolution) || {};

    const handleStripePayment = async () => {
        setIsProcessing(true);
        setPaymentMethod('STRIPE');
        try {
            const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
            const response = await fetch(`${apiUrl}/payments/shipping-checkout`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('access_token')}`
                },
                body: JSON.stringify({
                    caseId: caseRecord.id,
                    caseType: caseRecord.type?.toLowerCase() === 'dispute' ? 'dispute' : 'return',
                    frontendUrl: window.location.origin
                })
            });

            if (!response.ok) throw new Error('Failed to create checkout session');
            const { url } = await response.json();

            if (url) {
                sessionStorage.setItem(
                    'shipping_checkout_return',
                    JSON.stringify({
                        caseId: caseRecord.id,
                        caseType: caseRecord.type,
                    }),
                );
                window.location.assign(url);
                return;
            } else {
                throw new Error('No checkout URL received');
            }
        } catch (error: any) {
            addNotification({
                type: 'error',
                titleAr: isAr ? 'فشل الدفع' : 'Payment Failed',
                titleEn: 'Payment Failed',
                messageAr: error.message,
                messageEn: error.message
            });
        } finally {
            setIsProcessing(false);
            setPaymentMethod(null);
        }
    };

    const handleWalletPayment = async () => {
        if (!hasEnoughBalance) return;
        setIsProcessing(true);
        setPaymentMethod('WALLET');
        try {
            const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
            const response = await fetch(`${apiUrl}/returns/pay-shipping-wallet`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('access_token')}`
                },
                body: JSON.stringify({
                    caseId: caseRecord.id,
                    caseType: caseRecord.type?.toLowerCase() === 'dispute' ? 'dispute' : 'return'
                })
            });

            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.message || 'Failed to pay via wallet');
            }

            addNotification({
                type: 'success',
                titleAr: resT.shipping_success || 'تم الدفع بنجاح! 💰',
                titleEn: resT.shipping_success || 'Payment Successful! 💰',
                messageAr: resT.shipping_success_msg || 'تم خصم التكلفة من محفظتك وبدء عملية الإرجاع.',
                messageEn: resT.shipping_success_msg || 'Shipping cost deducted from your wallet. Return process started.'
            });
            
            // Trigger local refresh
            useResolutionStore.getState().fetchCases(role.toLowerCase() as any);
            if (role === 'MERCHANT') merchantWallet.fetchWallet();
            else customerWallet.fetchWalletData(true);
            
            onSuccess?.();
        } catch (error: any) {
            addNotification({
                type: 'error',
                titleAr: isAr ? 'فشل الدفع من المحفظة' : 'Wallet Payment Failed',
                titleEn: 'Wallet Payment Failed',
                messageAr: error.message,
                messageEn: error.message
            });
        } finally {
            setIsProcessing(false);
            setPaymentMethod(null);
        }
    };

    return (
        <GlassCard className={`relative overflow-hidden p-8 border-2 transition-all duration-700 ${isPaid ? 'border-emerald-500/40 bg-emerald-500/[0.03]' : isPayee ? 'border-gold-500/30 bg-black/40 shadow-2xl shadow-gold-500/5' : 'border-white/5 bg-white/[0.01]'}`}>
            {/* Background Decorative Gradient */}
            <div className={`absolute -top-24 -right-24 w-64 h-64 blur-[100px] rounded-full opacity-20 pointer-events-none ${isPaid ? 'bg-emerald-500' : isPayee ? 'bg-gold-500' : 'bg-white'}`} />

            <div className="relative z-10 space-y-8">
                {/* Header Section */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex items-start gap-5">
                        <div className={`p-5 rounded-[24px] shadow-2xl transition-transform duration-500 group-hover:scale-110 ${isPaid ? 'bg-emerald-500 text-black' : isPayee ? 'bg-gold-500 text-black' : 'bg-white/10 text-white/40'}`}>
                            {isPaid ? <PackageCheck size={32} strokeWidth={2.5} /> : <Truck size={32} strokeWidth={2.5} />}
                        </div>
                        <div className="space-y-1.5">
                            <div className="flex items-center gap-3">
                                <h4 className="text-xl font-black text-white uppercase tracking-tighter">
                                    {resT.shipping_logistics}
                                </h4>
                                {isPaid && (
                                    <Badge className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] px-3 py-1 font-black uppercase tracking-widest rounded-full">
                                        {resT.shipping_paid}
                                    </Badge>
                                )}
                                {needsPayment && (
                                    <Badge className="bg-gold-500/20 text-gold-500 border border-gold-500/30 text-[10px] px-3 py-1 font-black uppercase tracking-widest rounded-full animate-pulse">
                                        {isAr ? 'مطلوب السداد' : 'PAYMENT REQUIRED'}
                                    </Badge>
                                )}
                            </div>
                            <p className="text-sm text-white/50 font-bold leading-relaxed max-w-xl">
                                {isPaid 
                                    ? resT.shipping_paid_msg
                                    : isPayee 
                                        ? resT.shipping_responsibility_payee
                                        : resT.shipping_responsibility_other
                                }
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-col items-end">
                        <span className="text-[10px] font-black text-white/30 uppercase tracking-[0.3em] block mb-1">
                            {resT.amount_due}
                        </span>
                        <div className="flex items-baseline gap-2">
                            <span className={`text-5xl font-black tracking-tighter ${isPaid ? 'text-emerald-400' : 'text-white'}`}>
                                {amount.toLocaleString()}
                            </span>
                            <span className="text-lg font-black text-white/30 uppercase">AED</span>
                        </div>
                    </div>
                </div>

                {/* Warning Banner Section (Role-Specific) */}
                {needsPayment && (
                    <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="p-5 rounded-[24px] bg-red-500/10 border border-red-500/20 flex items-start gap-4"
                    >
                        <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center flex-shrink-0">
                            <AlertTriangle size={20} className="text-red-500" />
                        </div>
                        <div className="space-y-1">
                            <p className="text-sm font-black text-red-500 uppercase tracking-wide">
                                {isAr ? 'إشعار قانوني هام' : 'CRITICAL LEGAL NOTICE'}
                            </p>
                            <p className="text-[11px] text-white/70 font-bold leading-relaxed">
                                {resT.shipping_warning} {resT.shipping_payment_note}
                            </p>
                        </div>
                    </motion.div>
                )}

                {/* Actions Section */}
                {(needsPayment || (!isPaid && !isPayee)) && (
                    <motion.div className="flex flex-col md:flex-row items-center gap-4 pt-2">
                        {needsPayment ? (
                            <>
                                <Button 
                                    onClick={handleStripePayment}
                                    isLoading={isProcessing && paymentMethod === 'STRIPE'}
                                    className="w-full md:flex-1 h-16 bg-white text-black hover:bg-gold-500 hover:text-black font-black uppercase tracking-widest text-xs rounded-2xl shadow-2xl transition-all duration-300 group"
                                >
                                    <div className="flex items-center justify-center gap-3">
                                        <CreditCard size={18} />
                                        <span>{resT.pay_via_card}</span>
                                        <ArrowRight size={16} className={`transition-transform duration-300 ${isAr ? 'rotate-180' : ''} group-hover:translate-x-1`} />
                                    </div>
                                </Button>
                                
                                {role === 'MERCHANT' && (
                                    <Button 
                                        onClick={() => setShowWalletModal(true)}
                                        disabled={!hasEnoughBalance}
                                        isLoading={isProcessing && paymentMethod === 'WALLET'}
                                        variant="outline"
                                        className={`w-full md:flex-1 h-16 border-white/10 font-black uppercase tracking-widest text-xs rounded-2xl transition-all duration-300 ${hasEnoughBalance ? 'text-white hover:bg-white/5' : 'text-white/20 cursor-not-allowed'}`}
                                    >
                                        <div className="flex items-center justify-center gap-3">
                                            <Wallet size={18} />
                                            <span>{resT.deduct_from_wallet}</span>
                                        </div>
                                    </Button>
                                )}

                                {role === 'CUSTOMER' && hasEnoughBalance && (
                                    <Button 
                                        onClick={() => setShowWalletModal(true)}
                                        isLoading={isProcessing && paymentMethod === 'WALLET'}
                                        variant="outline"
                                        className="w-full md:flex-1 h-16 border-white/10 text-white hover:bg-white/5 font-black uppercase tracking-widest text-xs rounded-2xl transition-all duration-300"
                                    >
                                        <div className="flex items-center justify-center gap-3">
                                            <Wallet size={18} />
                                            <span>{resT.deduct_from_wallet}</span>
                                        </div>
                                    </Button>
                                )}
                            </>
                        ) : (
                            <div className="w-full p-6 bg-white/5 rounded-[24px] border border-white/10 flex items-center justify-center gap-4 text-white/40">
                                <Clock size={20} className="animate-spin-slow" />
                                <span className="text-xs font-black uppercase tracking-[0.2em]">
                                    {resT.awaiting_other_party}
                                </span>
                            </div>
                        )}
                    </motion.div>
                )}

                {/* Success Indicator */}
                {isPaid && (
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="p-6 rounded-[24px] bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center gap-4 text-emerald-400"
                    >
                        <ShieldCheck size={24} />
                        <span className="text-sm font-black uppercase tracking-widest">
                            {isAr ? 'تم تأمين الشحنة وبدء الإرجاع' : 'SHIPMENT SECURED & RETURN STARTED'}
                        </span>
                    </motion.div>
                )}
            </div>

            {/* Real-time Indicator Bar */}
            <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-white/5 overflow-hidden">
                {needsPayment && (
                    <motion.div 
                        initial={{ x: '-100%' }}
                        animate={{ x: '100%' }}
                        transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
                        className="h-full w-1/2 bg-gradient-to-r from-transparent via-gold-500 to-transparent"
                    />
                )}
                {isPaid && (
                    <div className="h-full w-full bg-emerald-500/50" />
                )}
            </div>

            {/* Wallet Confirmation Modal (Phase 3 - Fixed with Portal) */}
            {typeof document !== 'undefined' && createPortal(
                <AnimatePresence>
                    {showWalletModal && (
                        <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
                            onClick={() => !isProcessing && setShowWalletModal(false)}
                        >
                            <motion.div 
                                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                                animate={{ scale: 1, opacity: 1, y: 0 }}
                                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                                className="w-full max-w-md bg-[#0A0A0A] border border-white/10 rounded-[32px] overflow-hidden shadow-2xl"
                                onClick={(e) => e.stopPropagation()}
                            >
                                <div className="p-8 space-y-6">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-2xl bg-gold-500/20 flex items-center justify-center text-gold-500">
                                            <Wallet size={24} />
                                        </div>
                                        <h3 className="text-xl font-black text-white uppercase tracking-tight">
                                            {resT.wallet_confirm_title}
                                        </h3>
                                    </div>

                                    <div className="space-y-4">
                                        <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/5 flex justify-between items-center">
                                            <span className="text-sm text-white/40 font-bold">{resT.wallet_balance}</span>
                                            <span className="text-lg font-black text-white">{balance.toLocaleString()} AED</span>
                                        </div>
                                        <div className="p-4 rounded-2xl bg-red-500/5 border border-red-500/10 flex justify-between items-center">
                                            <span className="text-sm text-red-400 font-bold">{resT.wallet_deduction}</span>
                                            <span className="text-lg font-black text-red-400">-{amount.toLocaleString()} AED</span>
                                        </div>
                                        <div className="p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/10 flex justify-between items-center">
                                            <span className="text-sm text-emerald-400 font-bold">{resT.wallet_remaining}</span>
                                            <span className="text-xl font-black text-emerald-400">{(balance - amount).toLocaleString()} AED</span>
                                        </div>
                                    </div>

                                    <div className="flex gap-3 pt-2">
                                        <Button 
                                            variant="ghost"
                                            onClick={() => setShowWalletModal(false)}
                                            disabled={isProcessing}
                                            className="flex-1 h-14 rounded-2xl text-white/40 hover:text-white hover:bg-white/5 font-black uppercase tracking-widest text-[10px]"
                                        >
                                            {resT.cancel}
                                        </Button>
                                        <Button 
                                            onClick={async () => {
                                                await handleWalletPayment();
                                                setShowWalletModal(false);
                                            }}
                                            isLoading={isProcessing}
                                            className="flex-[2] h-14 bg-gold-500 text-black hover:bg-gold-600 font-black uppercase tracking-widest text-[10px] rounded-2xl shadow-xl shadow-gold-500/20"
                                        >
                                            {resT.confirm_deduction}
                                        </Button>
                                    </div>
                                </div>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>,
                document.body
            )}
        </GlassCard>
    );
};
