import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { CreditCard, AlertOctagon, Wallet } from 'lucide-react';
import { Button } from '../../ui/Button';
import { useLanguage } from '../../../contexts/LanguageContext';
import { useMerchantWalletStore } from '../../../stores/useMerchantWalletStore';
import { ObligationPayPicker } from './ObligationPayPicker';

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
  const available = Number(useMerchantWalletStore((s) => s.stats.available) || 0);
  const walletLoaded = useMerchantWalletStore((s) => s.walletLoadedFor !== null);
  const fetchWallet = useMerchantWalletStore((s) => s.fetchWallet);
  const [method, setMethod] = useState<'STRIPE' | 'WALLET' | null>(null);

  const due = Number(amount || 0);

  useEffect(() => {
    if (due > 0 && !walletLoaded) void fetchWallet();
  }, [due, walletLoaded, fetchWallet]);

  if (!(due > 0)) return null;

  const canPayFromWallet = walletLoaded && available + 0.001 >= due;

  return (
    <>
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
          <Button
            type="button"
            onClick={() => setMethod('WALLET')}
            className="bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 font-black text-xs sm:text-sm px-5 py-3 rounded-xl flex items-center justify-center gap-2"
          >
            <Wallet size={16} />
            {w.obligationWalletPayCta}
          </Button>
          <Button
            type="button"
            onClick={() => setMethod('STRIPE')}
            className="bg-gold-500 hover:bg-gold-400 text-black font-black text-xs sm:text-sm px-5 py-3 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-gold-500/20"
          >
            <CreditCard size={16} />
            {w.obligationPayCta}
          </Button>
        </div>
      </motion.div>
      {method && (
        <ObligationPayPicker
          method={method}
          onClose={() => setMethod(null)}
          onPaid={onPaid}
        />
      )}
    </>
  );
};
