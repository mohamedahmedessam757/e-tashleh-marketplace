import React from 'react';
import { motion } from 'framer-motion';
import {
  AlertCircle,
  CheckCircle2,
  CreditCard,
  ExternalLink,
  RotateCcw,
  Settings,
  ShieldCheck,
} from 'lucide-react';
import { GlassCard } from '../../ui/GlassCard';
import type { PayoutBankDetails, StripeConnectDisplay } from '../../../types/payout-account';

interface PayoutMethodPanelProps {
  mode: 'STRIPE' | 'BANK_TRANSFER';
  isAr: boolean;
  bankDetails: PayoutBankDetails | null;
  stripeOnboarded: boolean;
  stripeDisplay?: StripeConnectDisplay | null;
  isOnboarding?: boolean;
  bankLinkSuccess?: boolean;
  onStripeConnect: () => void;
  onEditBank: () => void;
  merchantVariant?: boolean;
}

function verificationLabel(status: PayoutBankDetails['verificationStatus'], isAr: boolean) {
  if (status === 'VERIFIED') {
    return isAr ? 'معتمد من الإدارة' : 'Admin Verified';
  }
  if (status === 'PENDING_REVIEW') {
    return isAr ? 'قيد مراجعة الإدارة' : 'Pending Admin Review';
  }
  return isAr ? 'غير مرتبط' : 'Not Linked';
}

export const PayoutMethodPanel: React.FC<PayoutMethodPanelProps> = ({
  mode,
  isAr,
  bankDetails,
  stripeOnboarded,
  stripeDisplay,
  isOnboarding = false,
  bankLinkSuccess = false,
  onStripeConnect,
  onEditBank,
  merchantVariant = false,
}) => {
  const isBankLinked = Boolean(bankDetails?.isLinked ?? bankDetails?.iban);
  const maskedIban =
    bankDetails?.maskedIban ||
    (bankDetails?.iban ? `•••• ${bankDetails.iban.slice(-4)}` : null);

  if (mode === 'STRIPE') {
    return (
      <GlassCard className="p-6 border-[#635BFF]/20 bg-[#635BFF]/5 h-full flex flex-col">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 bg-[#635BFF] rounded-2xl flex items-center justify-center shadow-lg shadow-[#635BFF]/20">
            <CreditCard className="text-white" size={24} />
          </div>
          <div>
            <h4 className="text-white font-bold text-sm">
              {isAr ? 'Stripe Connect' : 'Stripe Connect'}
            </h4>
            <p className="text-white/40 text-[10px]">
              {isAr ? 'حساب سحب واحد مرتبط بالمنصة' : 'Single linked payout account'}
            </p>
          </div>
        </div>

        {stripeOnboarded ? (
          <div className="flex-1 space-y-4">
            <div className="p-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/10">
              <div className="flex items-center gap-2 text-emerald-400 text-[10px] font-black uppercase mb-3">
                <ShieldCheck size={14} />
                {isAr ? 'تم الربط بنجاح' : 'Successfully Connected'}
              </div>
              <div className="space-y-2 text-xs">
                {stripeDisplay?.businessName && (
                  <div>
                    <p className="text-white/30 text-[8px] uppercase font-black">
                      {isAr ? 'الاسم التجاري' : 'Business'}
                    </p>
                    <p className="text-white font-bold">{stripeDisplay.businessName}</p>
                  </div>
                )}
                {stripeDisplay?.email && (
                  <div>
                    <p className="text-white/30 text-[8px] uppercase font-black">
                      {isAr ? 'البريد' : 'Email'}
                    </p>
                    <p className="text-white/80 font-mono text-[11px]">{stripeDisplay.email}</p>
                  </div>
                )}
                {(stripeDisplay?.maskedAccountId || bankDetails?.stripeAccountId) && (
                  <div>
                    <p className="text-white/30 text-[8px] uppercase font-black">
                      {isAr ? 'معرف الحساب' : 'Account ID'}
                    </p>
                    <p className="text-emerald-400 font-mono text-[11px] tracking-wider">
                      {stripeDisplay?.maskedAccountId ||
                        `acct••••${(bankDetails?.stripeAccountId || '').slice(-4)}`}
                    </p>
                  </div>
                )}
              </div>
            </div>
            <p className="text-[10px] text-white/40 leading-relaxed">
              {isAr
                ? 'حساب Stripe مرتبط بالفعل. لا حاجة لإضافة حسابات إضافية — استخدم نفس الحساب للسحب.'
                : 'Your Stripe account is already linked. No need to add another — use this account for payouts.'}
            </p>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center py-4">
            <p className="text-white/50 text-[10px] mb-6 px-2 leading-relaxed">
              {isAr
                ? 'اربط حساب Stripe واحد لاستلام الأرباح بعد موافقة الإدارة.'
                : 'Connect one Stripe account to receive payouts after admin approval.'}
            </p>
            <button
              type="button"
              onClick={onStripeConnect}
              disabled={isOnboarding}
              className="px-6 py-3 bg-[#635BFF] hover:bg-[#7a73ff] text-white rounded-xl text-[10px] font-black uppercase flex items-center gap-2 transition-all disabled:opacity-50"
            >
              {isOnboarding ? (
                <RotateCcw size={14} className="animate-spin" />
              ) : (
                <ExternalLink size={14} />
              )}
              {isAr ? 'ربط حساب Stripe' : 'Connect Stripe Account'}
            </button>
          </div>
        )}
      </GlassCard>
    );
  }

  return (
    <div
      className={`h-full flex flex-col rounded-3xl p-5 border transition-all ${
        bankLinkSuccess
          ? 'border-emerald-500/40 bg-emerald-500/5'
          : isBankLinked
            ? 'border-emerald-500/20 bg-white/[0.03]'
            : 'border-white/10 bg-white/[0.03]'
      }`}
    >
      {bankLinkSuccess && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4 p-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 flex items-center gap-2 text-emerald-400 text-[10px] font-bold"
        >
          <CheckCircle2 size={14} />
          {isAr
            ? 'تم حفظ بيانات الحساب البنكي بنجاح — حساب واحد مرتبط بحسابك.'
            : 'Bank account saved successfully — one account is linked to your profile.'}
        </motion.div>
      )}

      <div className="flex justify-between items-start mb-4">
        <div>
          <h4 className="text-white font-bold text-sm">
            {merchantVariant
              ? isAr
                ? 'الحساب البنكي المعتمد'
                : 'Authorized Bank Account'
              : isAr
                ? 'الحساب البنكي'
                : 'Bank Account'}
          </h4>
          {isBankLinked ? (
            <p className="font-mono text-emerald-400 text-xs tracking-[2px] mt-1">{maskedIban}</p>
          ) : (
            <p className="text-white/30 text-[10px] uppercase font-black mt-1">
              {isAr ? 'لا يوجد حساب مرتبط' : 'No linked account'}
            </p>
          )}
        </div>
        {isBankLinked && (
          <span
            className={`text-[9px] font-black uppercase px-2 py-1 rounded-full border ${
              bankDetails?.verificationStatus === 'VERIFIED'
                ? 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10'
                : 'text-amber-400 border-amber-500/30 bg-amber-500/10'
            }`}
          >
            {verificationLabel(bankDetails?.verificationStatus, isAr)}
          </span>
        )}
      </div>

      {isBankLinked ? (
        <>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div>
              <p className="text-white/20 text-[8px] uppercase font-black">
                {isAr ? 'المصرف' : 'Bank'}
              </p>
              <p className="text-white/80 font-bold text-[11px] truncate mt-0.5">
                {bankDetails?.bankName}
              </p>
            </div>
            <div>
              <p className="text-white/20 text-[8px] uppercase font-black">
                {isAr ? 'المستفيد' : 'Holder'}
              </p>
              <p className="text-white/80 font-bold text-[11px] truncate mt-0.5">
                {bankDetails?.accountHolder}
              </p>
            </div>
            {bankDetails?.swift && (
              <div className="col-span-2">
                <p className="text-white/20 text-[8px] uppercase font-black">SWIFT</p>
                <p className="text-white/60 font-mono text-[10px] mt-0.5">{bankDetails.swift}</p>
              </div>
            )}
          </div>
          <p className="text-[10px] text-white/35 mb-3 leading-relaxed">
            {isAr
              ? 'يمكنك تحديث بيانات الحساب نفسه فقط — لا يُسمح بإضافة حسابات متعددة.'
              : 'You may update this linked account only — multiple accounts are not allowed.'}
          </p>
          <button
            type="button"
            onClick={onEditBank}
            className="w-full mt-auto py-3 bg-white/5 hover:bg-white/10 text-white/50 hover:text-gold-500 text-[10px] font-black uppercase tracking-widest rounded-2xl border border-white/5 hover:border-gold-500/20 transition-all flex items-center justify-center gap-2"
          >
            <Settings size={14} />
            {isAr ? 'تحديث بيانات الحساب' : 'Update Account Details'}
          </button>
        </>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center text-center py-4">
          <AlertCircle size={22} className="text-amber-500/30 mb-2" />
          <p className="text-[10px] text-white/30 font-bold leading-relaxed mb-4">
            {isAr
              ? 'أضف حساباً بنكياً واحداً لتمكين السحب عبر التحويل البنكي.'
              : 'Add one bank account to enable bank transfer withdrawals.'}
          </p>
          <button
            type="button"
            onClick={onEditBank}
            className="px-6 py-3 bg-gold-500 hover:bg-gold-400 text-black rounded-xl text-[10px] font-black uppercase tracking-wider transition-all"
          >
            {isAr ? 'إضافة حساب بنكي' : 'Add Bank Account'}
          </button>
        </div>
      )}
    </div>
  );
};
