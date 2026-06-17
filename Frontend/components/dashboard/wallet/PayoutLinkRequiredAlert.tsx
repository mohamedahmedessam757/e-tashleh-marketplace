import React from 'react';
import { AlertCircle, CreditCard, Landmark } from 'lucide-react';
import type { PayoutMethod, PayoutReadiness } from '../../../utils/payout-readiness';

interface PayoutLinkRequiredAlertProps {
  isAr: boolean;
  readiness: PayoutReadiness;
  payoutMethod: PayoutMethod;
  onConnectStripe: () => void;
  onAddBank: () => void;
}

export const PayoutLinkRequiredAlert: React.FC<PayoutLinkRequiredAlertProps> = ({
  isAr,
  readiness,
  payoutMethod,
  onConnectStripe,
  onAddBank,
}) => {
  if (readiness.hasAny) {
    const methodReady =
      payoutMethod === 'STRIPE' ? readiness.hasStripe : readiness.hasBank;
    if (methodReady) return null;

    return (
      <div className="p-4 rounded-2xl border border-amber-500/30 bg-amber-500/10 flex flex-col gap-3">
        <div className="flex items-start gap-3">
          <AlertCircle className="text-amber-400 shrink-0 mt-0.5" size={18} />
          <p className="text-amber-100 text-xs leading-relaxed font-bold">
            {payoutMethod === 'STRIPE'
              ? isAr
                ? 'اخترت Stripe لكن الحساب غير مربوط بعد. أكمل الربط أو بدّل إلى التحويل البنكي.'
                : 'You selected Stripe but it is not connected yet. Complete onboarding or switch to bank transfer.'
              : isAr
                ? 'اخترت التحويل البنكي لكن لم تُضف بيانات الحساب بعد. أضفها أو بدّل إلى Stripe Connect (أسرع).'
                : 'You selected bank transfer but no bank account is linked. Add bank details or switch to Stripe Connect (faster).'}
          </p>
        </div>
        <div className="flex flex-wrap gap-2 pl-7">
          {payoutMethod === 'STRIPE' ? (
            <button
              type="button"
              onClick={onConnectStripe}
              className="px-3 py-2 rounded-lg bg-[#635BFF] hover:bg-[#7a73ff] text-white text-[10px] font-black uppercase tracking-wider flex items-center gap-2"
            >
              <CreditCard size={12} />
              {isAr ? 'ربط Stripe' : 'Connect Stripe'}
            </button>
          ) : (
            <button
              type="button"
              onClick={onAddBank}
              className="px-3 py-2 rounded-lg bg-gold-500/20 hover:bg-gold-500/30 text-gold-400 border border-gold-500/30 text-[10px] font-black uppercase tracking-wider flex items-center gap-2"
            >
              <Landmark size={12} />
              {isAr ? 'إضافة حساب بنكي' : 'Add Bank Account'}
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 rounded-2xl border border-red-500/30 bg-red-500/10 flex flex-col gap-3">
      <div className="flex items-start gap-3">
        <AlertCircle className="text-red-400 shrink-0 mt-0.5" size={18} />
        <div>
          <p className="text-red-300 text-xs font-black uppercase tracking-wider mb-1">
            {isAr ? 'لا يمكن السحب بدون ربط حساب' : 'Payout method required'}
          </p>
          <p className="text-white/70 text-xs leading-relaxed">
            {isAr
              ? 'لاستلام أموالك من المنصة، يجب ربط Stripe Connect (موصى به لسرعة التحويل) أو إضافة بيانات حسابك البنكي قبل تأكيد أي طلب سحب.'
              : 'To receive your funds, connect Stripe Connect (recommended for faster payouts) or add your bank account before confirming any withdrawal.'}
          </p>
        </div>
      </div>
      <div className="flex flex-wrap gap-2 pl-7">
        <button
          type="button"
          onClick={onConnectStripe}
          className="px-3 py-2 rounded-lg bg-[#635BFF] hover:bg-[#7a73ff] text-white text-[10px] font-black uppercase tracking-wider flex items-center gap-2"
        >
          <CreditCard size={12} />
          {isAr ? 'ربط Stripe Connect' : 'Connect Stripe'}
        </button>
        <button
          type="button"
          onClick={onAddBank}
          className="px-3 py-2 rounded-lg bg-gold-500/20 hover:bg-gold-500/30 text-gold-400 border border-gold-500/30 text-[10px] font-black uppercase tracking-wider flex items-center gap-2"
        >
          <Landmark size={12} />
          {isAr ? 'إضافة حساب بنكي' : 'Add Bank Account'}
        </button>
      </div>
    </div>
  );
};
