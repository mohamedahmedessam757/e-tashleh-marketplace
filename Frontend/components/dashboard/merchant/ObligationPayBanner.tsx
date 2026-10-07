import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { CreditCard, AlertOctagon, Loader2, Wallet } from 'lucide-react';
import { Button } from '../../ui/Button';
import { useLanguage } from '../../../contexts/LanguageContext';
import { useNotificationStore } from '../../../stores/useNotificationStore';
import { useMerchantWalletStore } from '../../../stores/useMerchantWalletStore';
import { formatApiErrorMessage } from '../../../utils/formatApiErrorMessage';

interface ObligationPayBannerProps {
  amount: number;
  onPaid?: () => void;
}

const fmt = (n: number) =>
  n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

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
  const payObligationsFromWallet = useMerchantWalletStore((s) => s.payObligationsFromWallet);
  const available = Number(useMerchantWalletStore((s) => s.stats.available) || 0);
  const walletLoaded = useMerchantWalletStore((s) => s.walletLoadedFor !== null);
  const fetchWallet = useMerchantWalletStore((s) => s.fetchWallet);
  const [busy, setBusy] = useState(false);
  const [walletBusy, setWalletBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const due = Number(amount || 0);

  useEffect(() => {
    if (due > 0 && !walletLoaded) void fetchWallet();
  }, [due, walletLoaded, fetchWallet]);

  if (!(due > 0)) return null;

  const canPayFromWallet = walletLoaded && available + 0.001 >= due;

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

  const handleWalletPay = async () => {
    if (!canPayFromWallet) return;
    setWalletBusy(true);
    try {
      const res = await payObligationsFromWallet(Number(due.toFixed(2)));
      addNotification({
        type: 'success',
        titleAr: w.obligationWalletPaySuccessTitle,
        titleEn: w.obligationWalletPaySuccessTitle,
        messageAr: `${w.obligationWalletPaySuccessMsg} (${fmt(res.charged)} AED)`,
        messageEn: `${w.obligationWalletPaySuccessMsg} (${fmt(res.charged)} AED)`,
      });
      onPaid?.();
    } catch (error) {
      const msg = formatApiErrorMessage(error, w.obligationWalletPayFailedMsg);
      addNotification({
        type: 'error',
        titleAr: w.obligationWalletPayFailedTitle,
        titleEn: w.obligationWalletPayFailedTitle,
        messageAr: msg,
        messageEn: msg,
      });
    } finally {
      setWalletBusy(false);
      setConfirming(false);
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
            {fmt(due)} <span className="text-sm font-bold text-white/50">AED</span>
          </p>
          {walletLoaded && (
            <p className={`text-[11px] font-bold ${canPayFromWallet ? 'text-emerald-300/80' : 'text-white/40'}`}>
              {canPayFromWallet ? w.obligationWalletPayAvailable : w.obligationWalletPayInsufficient}{' '}
              <span className="tabular-nums">({fmt(available)} AED)</span>
            </p>
          )}
        </div>
      </div>
      <div className="relative z-10 flex flex-col sm:flex-row items-stretch sm:items-center gap-2 shrink-0">
        {confirming ? (
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <span className="text-xs font-bold text-white/70 max-w-[16rem]">
              {w.obligationWalletPayConfirm} {fmt(due)} AED
            </span>
            <Button
              type="button"
              disabled={walletBusy}
              onClick={() => void handleWalletPay()}
              className="bg-emerald-500 hover:bg-emerald-400 text-black font-black text-xs px-4 py-2.5 rounded-xl flex items-center justify-center gap-2"
            >
              {walletBusy ? <Loader2 size={14} className="animate-spin" /> : <Wallet size={14} />}
              {w.obligationWalletPayConfirmYes}
            </Button>
            <Button
              type="button"
              disabled={walletBusy}
              onClick={() => setConfirming(false)}
              className="bg-white/5 hover:bg-white/10 text-white font-bold text-xs px-4 py-2.5 rounded-xl border border-white/10"
            >
              {w.obligationWalletPayConfirmNo}
            </Button>
          </div>
        ) : (
          <>
            <Button
              type="button"
              disabled={!canPayFromWallet || busy || walletBusy}
              onClick={() => setConfirming(true)}
              title={canPayFromWallet ? undefined : w.obligationWalletPayInsufficient}
              className="bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 font-black text-xs sm:text-sm px-5 py-3 rounded-xl flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Wallet size={16} />
              {w.obligationWalletPayCta}
            </Button>
            <Button
              type="button"
              disabled={busy || walletBusy}
              onClick={() => void handlePay()}
              className="bg-gold-500 hover:bg-gold-400 text-black font-black text-xs sm:text-sm px-5 py-3 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-gold-500/20"
            >
              {busy ? <Loader2 size={16} className="animate-spin" /> : <CreditCard size={16} />}
              {busy ? w.obligationPayRedirecting : w.obligationPayCta}
            </Button>
          </>
        )}
      </div>
    </motion.div>
  );
};
