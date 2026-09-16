import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { CreditCard, AlertOctagon, Loader2 } from 'lucide-react';
import { Button } from '../../ui/Button';
import { useLanguage } from '../../../contexts/LanguageContext';
import { useNotificationStore } from '../../../stores/useNotificationStore';
import { useMerchantWalletStore } from '../../../stores/useMerchantWalletStore';

interface ObligationPayBannerProps {
  amount: number;
  onPaid?: () => void;
}

export const ObligationPayBanner: React.FC<ObligationPayBannerProps> = ({
  amount,
  onPaid,
}) => {
  const { language, t } = useLanguage();
  const isAr = language === 'ar';
  const w = t.dashboard.merchant.wallet;
  const { addNotification } = useNotificationStore();
  const createObligationCheckout = useMerchantWalletStore(
    (s) => s.createObligationCheckout,
  );
  const [busy, setBusy] = useState(false);

  const due = Number(amount || 0);
  if (!(due > 0)) return null;

  const handlePay = async () => {
    setBusy(true);
    try {
      const { url } = await createObligationCheckout();
      if (!url) throw new Error(isAr ? 'لم يُرجع رابط الدفع' : 'No checkout URL');
      window.location.assign(url);
    } catch (error: any) {
      addNotification({
        type: 'error',
        titleAr: w.obligationPayFailedTitle || 'فشل بدء الدفع',
        titleEn: w.obligationPayFailedTitleEn || 'Payment start failed',
        messageAr: error?.message || w.obligationPayFailedMsg || 'تعذر فتح Stripe',
        messageEn: error?.message || w.obligationPayFailedMsgEn || 'Could not open Stripe',
      });
      setBusy(false);
      onPaid?.();
    }
  };

  return (
    <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: 'auto', opacity: 1 }}
      className="mb-2 p-5 sm:p-6 rounded-[1.75rem] bg-amber-500/10 border border-amber-500/25 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-5 overflow-hidden relative"
    >
      <div className="absolute top-0 right-0 w-36 h-36 bg-amber-500/10 blur-3xl rounded-full -mr-16 -mt-16 pointer-events-none" />
      <div className="flex items-start gap-4 relative z-10 min-w-0">
        <div className="w-12 h-12 sm:w-14 sm:h-14 shrink-0 bg-amber-500/20 rounded-2xl flex items-center justify-center text-amber-400">
          <AlertOctagon size={26} />
        </div>
        <div className="min-w-0 space-y-1.5">
          <h4 className="text-base sm:text-lg font-black text-white tracking-tight">
            {w.obligationPayBannerTitle}
          </h4>
          <p className="text-amber-100/70 text-xs sm:text-sm leading-relaxed max-w-2xl">
            {w.obligationPayBannerBody}
          </p>
          <p className="text-amber-300 font-black text-lg sm:text-xl tabular-nums">
            {due.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}{' '}
            <span className="text-sm font-bold text-white/50">AED</span>
          </p>
        </div>
      </div>
      <div className="relative z-10 flex flex-col sm:flex-row items-stretch sm:items-center gap-2 shrink-0">
        <Button
          type="button"
          disabled={busy}
          onClick={() => void handlePay()}
          className="bg-gold-500 hover:bg-gold-400 text-black font-black text-xs sm:text-sm px-5 py-3 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-gold-500/20"
        >
          {busy ? <Loader2 size={16} className="animate-spin" /> : <CreditCard size={16} />}
          {busy ? w.obligationPayRedirecting : w.obligationPayCta}
        </Button>
      </div>
    </motion.div>
  );
};
