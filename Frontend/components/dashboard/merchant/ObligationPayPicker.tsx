import React, { useMemo, useState } from 'react';
import { Check, CreditCard, Loader2, Wallet, X } from 'lucide-react';
import { Button } from '../../ui/Button';
import { useLanguage } from '../../../contexts/LanguageContext';
import { useNotificationStore } from '../../../stores/useNotificationStore';
import { useMerchantWalletStore } from '../../../stores/useMerchantWalletStore';
import { formatApiErrorMessage } from '../../../utils/formatApiErrorMessage';

interface ObligationPayPickerProps {
  method: 'STRIPE' | 'WALLET';
  onClose: () => void;
  onPaid?: () => void;
}

const fmt = (n: number) =>
  n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const STRIPE_MIN = 0.5;

export const ObligationPayPicker: React.FC<ObligationPayPickerProps> = ({
  method,
  onClose,
  onPaid,
}) => {
  const { language, t } = useLanguage();
  const isAr = language === 'ar';
  const w = t.dashboard.merchant.wallet;
  const { addNotification } = useNotificationStore();
  const lines = useMerchantWalletStore((s) => s.obligations.lines);
  const available = Number(useMerchantWalletStore((s) => s.stats.available) || 0);
  const createObligationCheckout = useMerchantWalletStore((s) => s.createObligationCheckout);
  const payObligationsFromWallet = useMerchantWalletStore((s) => s.payObligationsFromWallet);
  const openLines = useMemo(() => lines.filter((l) => l.status === 'OPEN' && l.amount > 0), [lines]);
  const [selected, setSelected] = useState<string[]>([]);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);

  const chosen = openLines.filter((l) => selected.includes(l.id));
  const sum = Number(chosen.reduce((s, l) => s + Number(l.amount || 0), 0).toFixed(2));
  const allSelected = openLines.length > 0 && selected.length === openLines.length;
  const walletOk = method !== 'WALLET' || available + 0.001 >= sum;
  const stripeOk = method !== 'STRIPE' || sum + 0.001 >= STRIPE_MIN;
  const canPay = sum > 0 && walletOk && stripeOk && !busy;

  const kindLabel = (kind: string) => {
    const map: Record<string, string> = {
      GATEWAY_CANCEL_FEE: w.obligationKinds?.GATEWAY_CANCEL_FEE || kind,
      ADJUDICATION_FEE: w.transactionTypes?.ADJUDICATION_FEE || kind,
      SHIPPING_FEE: w.transactionTypes?.SHIPPING_FEE || kind,
    };
    return map[kind] || kind;
  };

  const toggle = (id: string) => {
    setConfirming(false);
    setSelected((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));
  };

  const pay = async () => {
    if (!canPay) return;
    setBusy(true);
    try {
      const ids = chosen.map((l) => l.id);
      if (method === 'STRIPE') {
        const { url } = await createObligationCheckout(ids);
        if (!url) throw new Error(isAr ? 'لم يُرجع رابط الدفع' : 'No checkout URL');
        window.location.assign(url);
        return;
      }
      const res = await payObligationsFromWallet(ids, sum);
      addNotification({
        type: 'success',
        titleAr: w.obligationWalletPaySuccessTitle,
        titleEn: w.obligationWalletPaySuccessTitle,
        messageAr: `${w.obligationWalletPaySuccessMsg} (${fmt(res.charged)} AED)`,
        messageEn: `${w.obligationWalletPaySuccessMsg} (${fmt(res.charged)} AED)`,
      });
      onPaid?.();
      onClose();
    } catch (error) {
      const fallback = method === 'STRIPE' ? w.obligationPayFailedMsg : w.obligationWalletPayFailedMsg;
      const msg = formatApiErrorMessage(error, fallback);
      addNotification({
        type: 'error',
        titleAr: method === 'STRIPE' ? w.obligationPayFailedTitle : w.obligationWalletPayFailedTitle,
        titleEn: method === 'STRIPE' ? w.obligationPayFailedTitleEn : w.obligationWalletPayFailedTitle,
        messageAr: msg,
        messageEn: msg,
      });
      setBusy(false);
      setConfirming(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-sm"
      dir={isAr ? 'rtl' : 'ltr'}
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-lg max-h-[92vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl bg-[#12110f] border border-amber-500/25 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between gap-3 px-5 py-4 bg-[#12110f]/95 border-b border-white/5">
          <div>
            <h3 className="text-base sm:text-lg font-black text-white">{w.obligationPickerTitle}</h3>
            <p className="text-[11px] text-white/45 mt-0.5">
              {method === 'STRIPE' ? w.obligationPayCta : w.obligationWalletPayCta}
            </p>
          </div>
          <button type="button" onClick={onClose} className="p-2 rounded-xl text-white/50 hover:text-white hover:bg-white/5" aria-label={w.obligationWalletPayConfirmNo}>
            <X size={18} />
          </button>
        </div>

        <div className="px-5 py-3 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => {
              setConfirming(false);
              setSelected(allSelected ? [] : openLines.map((l) => l.id));
            }}
            className="text-xs font-bold text-gold-400 hover:text-gold-300"
          >
            {allSelected ? w.obligationPickerClear : w.obligationPickerSelectAll}
          </button>
          <span className="text-sm font-black text-amber-300 tabular-nums">
            {w.obligationPickerTotal} {fmt(sum)} AED
          </span>
        </div>

        <div className="px-5 pb-4 space-y-2">
          {openLines.map((line) => {
            const on = selected.includes(line.id);
            return (
              <button
                key={line.id}
                type="button"
                onClick={() => toggle(line.id)}
                className={`w-full text-start rounded-2xl border px-4 py-3 flex items-start gap-3 transition-colors ${
                  on ? 'border-gold-500/50 bg-gold-500/10' : 'border-white/10 bg-white/[0.03] hover:bg-white/[0.06]'
                }`}
              >
                <span className={`mt-0.5 w-5 h-5 shrink-0 rounded-md border flex items-center justify-center ${on ? 'bg-gold-500 border-gold-500 text-black' : 'border-white/20'}`}>
                  {on ? <Check size={13} /> : null}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-bold text-white truncate">
                    {line.partName || kindLabel(line.kind)}
                  </span>
                  <span className="block text-[11px] text-white/40 mt-0.5 line-clamp-2">
                    {isAr ? line.descriptionAr : line.descriptionEn}
                    {line.orderId ? ` · ${String(line.orderId).slice(0, 8)}` : ''}
                  </span>
                  <span className="block text-[10px] text-white/30 mt-1">
                    {new Date(line.createdAt).toLocaleString(isAr ? 'ar-AE' : 'en-AE')}
                  </span>
                </span>
                <span className="text-sm font-black text-rose-300 tabular-nums shrink-0">
                  −{fmt(line.amount)}
                </span>
              </button>
            );
          })}
          {!openLines.length && (
            <p className="text-sm text-white/40 text-center py-8">{w.obligationsEmpty}</p>
          )}
        </div>

        <div className="sticky bottom-0 px-5 py-4 bg-[#12110f]/95 border-t border-white/5 space-y-2">
          {sum > 0 && method === 'WALLET' && !walletOk && (
            <p className="text-[11px] font-bold text-white/45">
              {w.obligationWalletPayInsufficient} ({fmt(available)} AED)
            </p>
          )}
          {sum > 0 && method === 'STRIPE' && !stripeOk && (
            <p className="text-[11px] font-bold text-white/45">{w.obligationPickerStripeMin}</p>
          )}
          {sum <= 0 && <p className="text-[11px] font-bold text-white/45">{w.obligationPickerNone}</p>}
          {confirming ? (
            <div className="flex flex-col sm:flex-row gap-2">
              <Button
                type="button"
                disabled={!canPay}
                onClick={() => void pay()}
                className="flex-1 bg-gold-500 hover:bg-gold-400 text-black font-black text-xs sm:text-sm px-4 py-3 rounded-xl flex items-center justify-center gap-2"
              >
                {busy ? <Loader2 size={15} className="animate-spin" /> : method === 'STRIPE' ? <CreditCard size={15} /> : <Wallet size={15} />}
                {method === 'STRIPE' ? w.obligationPickerConfirmStripe : w.obligationPickerConfirmWallet} {fmt(sum)} AED
              </Button>
              <Button
                type="button"
                disabled={busy}
                onClick={() => setConfirming(false)}
                className="bg-white/5 hover:bg-white/10 text-white font-bold text-xs px-4 py-3 rounded-xl border border-white/10"
              >
                {w.obligationWalletPayConfirmNo}
              </Button>
            </div>
          ) : (
            <Button
              type="button"
              disabled={!canPay}
              onClick={() => setConfirming(true)}
              className="w-full bg-gold-500 hover:bg-gold-400 disabled:opacity-40 text-black font-black text-sm px-4 py-3 rounded-xl"
            >
              {w.obligationPickerReview}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
