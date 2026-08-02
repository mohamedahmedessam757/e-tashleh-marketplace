import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Scale,
  Truck,
  CreditCard,
  Wallet,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import { Button } from '../../ui/Button';
import { GlassCard } from '../../ui/GlassCard';
import { useLanguage } from '../../../contexts/LanguageContext';
import { useNotificationStore } from '../../../stores/useNotificationStore';
import { useResolutionStore, ResolutionCase } from '../../../stores/useResolutionStore';
import { useMerchantWalletStore } from '../../../stores/useMerchantWalletStore';
import { Badge } from '../../ui/Badge';

interface MerchantSettlementPaymentCardProps {
  caseRecord: ResolutionCase;
  role: 'MERCHANT' | 'ADMIN';
  onSuccess?: () => void;
}

/** True when merchant owes both adjudication fee and return shipping. */
export function isMerchantCombinedSettlementDue(c: ResolutionCase | null | undefined): boolean {
  if (!c) return false;
  const adj =
    c.adjudicationFeePayee === 'MERCHANT' &&
    c.adjudicationFeePaymentStatus === 'PENDING' &&
    Number(c.adjudicationFeeAmount || 0) > 0;
  const shipAmount = Number(c.shippingRefund || c.shippingRoundtrip || 0);
  const ship =
    c.shippingPayee === 'MERCHANT' &&
    shipAmount > 0 &&
    (c.shippingPaymentStatus === 'PENDING' ||
      c.shippingPaymentStatus === 'INSUFFICIENT_FUNDS' ||
      (c.shippingPaymentStatus === 'PAID' && !c.shippingPaymentMethod));
  return adj && ship;
}

export function isMerchantCombinedSettlementPaid(c: ResolutionCase | null | undefined): boolean {
  if (!c) return false;
  const adjPaid =
    c.adjudicationFeePayee === 'MERCHANT' &&
    c.adjudicationFeePaymentStatus === 'PAID' &&
    Number(c.adjudicationFeeAmount || 0) > 0;
  const shipPaid =
    c.shippingPayee === 'MERCHANT' &&
    c.shippingPaymentStatus === 'PAID' &&
    Boolean(c.shippingPaymentMethod) &&
    Number(c.shippingRefund || c.shippingRoundtrip || 0) > 0;
  return adjPaid && shipPaid;
}

export const MerchantSettlementPaymentCard: React.FC<MerchantSettlementPaymentCardProps> = ({
  caseRecord,
  role,
  onSuccess,
}) => {
  const { language } = useLanguage();
  const isAr = language === 'ar';
  const { addNotification } = useNotificationStore();
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'STRIPE' | 'WALLET' | null>(null);
  const [showWalletModal, setShowWalletModal] = useState(false);
  const merchantWallet = useMerchantWalletStore();

  useEffect(() => {
    if (role === 'MERCHANT') merchantWallet.fetchWallet();
  }, [role]);

  const adjAmount = Number(caseRecord?.adjudicationFeeAmount || 0);
  const shipAmount = Number(caseRecord?.shippingRefund || caseRecord?.shippingRoundtrip || 0);
  const needsPayment = isMerchantCombinedSettlementDue(caseRecord);
  const isPaid = isMerchantCombinedSettlementPaid(caseRecord);

  if (!caseRecord || (!needsPayment && !isPaid)) return null;
  if (role === 'ADMIN' && !needsPayment && !isPaid) return null;

  const total = adjAmount + shipAmount;
  const balance = role === 'MERCHANT' ? Number(merchantWallet.stats.available || 0) : 0;
  const hasEnoughBalance = role === 'MERCHANT' && balance >= total;
  const caseType = caseRecord.type?.toLowerCase() === 'dispute' ? 'dispute' : 'return';

  const handleStripePayment = async () => {
    setIsProcessing(true);
    setPaymentMethod('STRIPE');
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'https://api.e-tashleh.net';
      const response = await fetch(`${apiUrl}/payments/merchant-settlement-checkout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('access_token')}`,
        },
        body: JSON.stringify({
          caseId: caseRecord.id,
          caseType,
          frontendUrl: window.location.origin,
        }),
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.message || 'Failed to create checkout session');
      }
      const { url } = await response.json();
      if (!url) throw new Error('No checkout URL received');
      window.location.assign(url);
    } catch (error: any) {
      addNotification({
        type: 'error',
        titleAr: 'فشل الدفع',
        titleEn: 'Payment Failed',
        messageAr: error.message,
        messageEn: error.message,
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
      const apiUrl = import.meta.env.VITE_API_URL || 'https://api.e-tashleh.net';
      const response = await fetch(`${apiUrl}/returns/pay-merchant-settlement-wallet`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('access_token')}`,
        },
        body: JSON.stringify({ caseId: caseRecord.id, caseType }),
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.message || 'Failed to pay via wallet');
      }
      addNotification({
        type: 'success',
        titleAr: 'تم السداد المجمع',
        titleEn: 'Combined settlement paid',
        messageAr: `تم خصم ${total.toFixed(2)} AED (رسوم حكم + شحن) مع تفصيل في سجل المحفظة.`,
        messageEn: `${total.toFixed(2)} AED deducted (fees + shipping) with itemized wallet ledger.`,
      });
      useResolutionStore.getState().fetchMerchantCases(true);
      merchantWallet.fetchWallet();
      onSuccess?.();
    } catch (error: any) {
      addNotification({
        type: 'error',
        titleAr: 'فشل الدفع من المحفظة',
        titleEn: 'Wallet Payment Failed',
        messageAr: error.message,
        messageEn: error.message,
      });
    } finally {
      setIsProcessing(false);
      setPaymentMethod(null);
    }
  };

  return (
    <GlassCard
      className={`relative overflow-hidden p-8 border-2 transition-all duration-700 ${
        isPaid
          ? 'border-emerald-500/40 bg-emerald-500/[0.03]'
          : 'border-gold-500/30 bg-black/40 shadow-2xl shadow-gold-500/5'
      }`}
    >
      <div
        className={`absolute -top-24 -right-24 w-64 h-64 blur-[100px] rounded-full opacity-20 pointer-events-none ${
          isPaid ? 'bg-emerald-500' : 'bg-gold-500'
        }`}
      />

      <div className="relative z-10 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start gap-5">
            <div
              className={`p-5 rounded-[24px] shadow-2xl ${
                isPaid ? 'bg-emerald-500 text-black' : 'bg-gold-500 text-black'
              }`}
            >
              {isPaid ? <ShieldCheck size={32} strokeWidth={2.5} /> : <Scale size={32} strokeWidth={2.5} />}
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center gap-3 flex-wrap">
                <h4 className="text-xl font-black text-white uppercase tracking-tighter">
                  {isAr ? 'سداد مستحقات الحكم والشحن' : 'Judgment & Shipping Settlement'}
                </h4>
                {isPaid ? (
                  <Badge className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] px-3 py-1 font-black uppercase tracking-widest rounded-full">
                    {isAr ? 'مدفوع' : 'PAID'}
                  </Badge>
                ) : (
                  <Badge className="bg-gold-500/20 text-gold-500 border border-gold-500/30 text-[10px] px-3 py-1 font-black uppercase tracking-widest rounded-full animate-pulse">
                    {isAr ? 'مطلوب السداد' : 'PAYMENT REQUIRED'}
                  </Badge>
                )}
              </div>
              <p className="text-sm text-white/50 font-bold leading-relaxed max-w-xl">
                {isPaid
                  ? isAr
                    ? 'تم سداد الرسوم والشحن دفعة واحدة مع تفصيل كل بند في السجل المالي.'
                    : 'Fees and shipping settled in one payment with itemized ledger entries.'
                  : isAr
                    ? 'ادفع رسوم الحكم وشحن المرتجع مرة واحدة. سيظهر كل مبلغ منفصلاً في سجل المعاملات.'
                    : 'Pay adjudication fees and return shipping once. Each amount appears separately in the ledger.'}
              </p>
            </div>
          </div>

          <div className="flex flex-col items-end">
            <span className="text-[10px] font-black text-white/30 uppercase tracking-[0.3em] block mb-1">
              {isAr ? 'الإجمالي المطلوب' : 'TOTAL DUE'}
            </span>
            <div className="flex items-baseline gap-2">
              <span className={`text-5xl font-black tracking-tighter ${isPaid ? 'text-emerald-400' : 'text-white'}`}>
                {total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <span className="text-lg font-black text-white/30 uppercase">AED</span>
            </div>
          </div>
        </div>

        {/* Itemized breakdown — visible to merchant and admin */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-2">
            <div className="flex items-center gap-2 text-amber-400">
              <Scale size={16} />
              <span className="text-[10px] font-black uppercase tracking-widest">
                {isAr ? 'رسوم الحكم الإداري' : 'Adjudication fees'}
              </span>
            </div>
            <p className="text-2xl font-black text-white font-mono">
              {adjAmount.toFixed(2)} <span className="text-xs text-white/40">AED</span>
            </p>
          </div>
          <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-2">
            <div className="flex items-center gap-2 text-cyan-400">
              <Truck size={16} />
              <span className="text-[10px] font-black uppercase tracking-widest">
                {isAr ? 'لوجستيات شحن المرتجعات' : 'Return shipping logistics'}
              </span>
            </div>
            <p className="text-2xl font-black text-white font-mono">
              {shipAmount.toFixed(2)} <span className="text-xs text-white/40">AED</span>
            </p>
          </div>
        </div>

        {needsPayment && role === 'MERCHANT' && (
          <>
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-5 rounded-[24px] bg-amber-500/10 border border-amber-500/20 flex items-start gap-4"
            >
              <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center flex-shrink-0">
                <AlertTriangle size={20} className="text-amber-400" />
              </div>
              <p className="text-[11px] text-white/70 font-bold leading-relaxed">
                {isAr
                  ? 'دفعة واحدة عبر Stripe أو المحفظة. بعد السداد يُسجَّل كل بند (رسوم الحكم / الشحن) منفصلاً في المحفظة وللأدمن.'
                  : 'One payment via Stripe or wallet. After payment each line (fees / shipping) is recorded separately for you and admin.'}
              </p>
            </motion.div>

            <div className="flex flex-col md:flex-row items-center gap-4 pt-2">
              <Button
                onClick={handleStripePayment}
                isLoading={isProcessing && paymentMethod === 'STRIPE'}
                className="w-full md:flex-1 h-16 bg-white text-black hover:bg-gold-500 hover:text-black font-black uppercase tracking-widest text-xs rounded-2xl shadow-2xl transition-all duration-300 group"
              >
                <div className="flex items-center justify-center gap-3">
                  <CreditCard size={18} />
                  <span>{isAr ? 'الدفع عبر STRIPE' : 'PAY VIA STRIPE'}</span>
                  <ArrowRight
                    size={16}
                    className={`transition-transform duration-300 ${isAr ? 'rotate-180' : ''} group-hover:translate-x-1`}
                  />
                </div>
              </Button>
              <Button
                onClick={() => setShowWalletModal(true)}
                disabled={!hasEnoughBalance}
                isLoading={isProcessing && paymentMethod === 'WALLET'}
                variant="outline"
                className={`w-full md:flex-1 h-16 border-white/10 font-black uppercase tracking-widest text-xs rounded-2xl transition-all duration-300 ${
                  hasEnoughBalance ? 'text-white hover:bg-white/5' : 'text-white/20 cursor-not-allowed'
                }`}
              >
                <div className="flex items-center justify-center gap-3">
                  <Wallet size={18} />
                  <span>{isAr ? 'الخصم من المحفظة' : 'DEDUCT FROM WALLET'}</span>
                </div>
              </Button>
            </div>
          </>
        )}

        {needsPayment && role === 'ADMIN' && (
          <div className="w-full p-6 bg-white/5 rounded-[24px] border border-white/10 text-center text-white/40 text-xs font-black uppercase tracking-[0.2em]">
            {isAr ? 'في انتظار سداد التاجر (دفعة مجمّعة)' : 'Awaiting merchant combined settlement'}
          </div>
        )}

        {isPaid && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="p-6 rounded-[24px] bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center gap-4 text-emerald-400"
          >
            <ShieldCheck size={24} />
            <span className="text-sm font-black uppercase tracking-widest">
              {isAr ? 'تم السداد المجمع مع التفصيل المالي' : 'COMBINED SETTLEMENT ITEMIZED & PAID'}
            </span>
          </motion.div>
        )}
      </div>

      {typeof document !== 'undefined' &&
        createPortal(
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
                    <h3 className="text-xl font-black text-white uppercase tracking-tight">
                      {isAr ? 'تأكيد الخصم المجمع' : 'Confirm combined deduction'}
                    </h3>
                    <div className="space-y-3 text-sm font-bold">
                      <div className="flex justify-between text-white/50">
                        <span>{isAr ? 'رسوم الحكم' : 'Adjudication fees'}</span>
                        <span className="text-amber-400 font-mono">{adjAmount.toFixed(2)} AED</span>
                      </div>
                      <div className="flex justify-between text-white/50">
                        <span>{isAr ? 'شحن المرتجع' : 'Return shipping'}</span>
                        <span className="text-cyan-400 font-mono">{shipAmount.toFixed(2)} AED</span>
                      </div>
                      <div className="flex justify-between text-white border-t border-white/10 pt-3">
                        <span>{isAr ? 'الإجمالي' : 'Total'}</span>
                        <span className="font-mono">{total.toFixed(2)} AED</span>
                      </div>
                      <div className="flex justify-between text-emerald-400">
                        <span>{isAr ? 'الرصيد بعد الخصم' : 'Balance after'}</span>
                        <span className="font-mono">{(balance - total).toFixed(2)} AED</span>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <Button
                        variant="ghost"
                        onClick={() => setShowWalletModal(false)}
                        disabled={isProcessing}
                        className="flex-1 h-14 rounded-2xl text-white/40 font-black uppercase tracking-widest text-[10px]"
                      >
                        {isAr ? 'إلغاء' : 'Cancel'}
                      </Button>
                      <Button
                        onClick={async () => {
                          await handleWalletPayment();
                          setShowWalletModal(false);
                        }}
                        isLoading={isProcessing}
                        className="flex-[2] h-14 bg-gold-500 text-black font-black uppercase tracking-widest text-[10px] rounded-2xl"
                      >
                        {isAr ? 'تأكيد الخصم' : 'Confirm'}
                      </Button>
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>,
          document.body,
        )}
    </GlassCard>
  );
};
