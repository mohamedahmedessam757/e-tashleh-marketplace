import React from 'react';
import { Landmark, CreditCard, CheckCircle2, Clock, XCircle, AlertTriangle } from 'lucide-react';
import { GlassCard } from '../../ui/GlassCard';
import { useLanguage } from '../../../contexts/LanguageContext';
import type { AdminPayoutMethods } from '../../../types/payout-account';

interface AdminPayoutMethodsCardProps {
    payoutMethods?: AdminPayoutMethods | null;
}

const StatusPill: React.FC<{ tone: 'ok' | 'pending' | 'off' | 'warn'; label: string }> = ({ tone, label }) => {
    const styles = {
        ok: 'bg-green-500/10 text-green-400 border-green-500/20',
        pending: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
        warn: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
        off: 'bg-white/5 text-white/40 border-white/10',
    }[tone];
    const Icon = { ok: CheckCircle2, pending: Clock, warn: AlertTriangle, off: XCircle }[tone];
    return (
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-black uppercase tracking-wider ${styles}`}>
            <Icon size={11} />
            {label}
        </span>
    );
};

const InfoRow: React.FC<{ label: string; value: React.ReactNode; mono?: boolean }> = ({ label, value, mono }) => (
    <div className="flex items-start justify-between gap-3 py-2 border-b border-white/5 last:border-b-0">
        <span className="text-[10px] text-white/30 uppercase font-black tracking-widest shrink-0">{label}</span>
        <span className={`text-xs text-white text-end break-all ${mono ? 'font-mono' : 'font-bold'}`} dir={mono ? 'ltr' : undefined}>
            {value}
        </span>
    </div>
);

export const AdminPayoutMethodsCard: React.FC<AdminPayoutMethodsCardProps> = React.memo(({ payoutMethods }) => {
    const { language } = useLanguage();
    const isAr = language === 'ar';

    if (!payoutMethods) return null;
    const { bank, stripe } = payoutMethods;

    const bankTone = bank.verificationStatus === 'VERIFIED' ? 'ok' : bank.verificationStatus === 'PENDING_REVIEW' ? 'pending' : 'off';
    const bankLabel =
        bank.verificationStatus === 'VERIFIED'
            ? (isAr ? 'موثّق' : 'Verified')
            : bank.verificationStatus === 'PENDING_REVIEW'
                ? (isAr ? 'قيد المراجعة' : 'Pending review')
                : (isAr ? 'غير مربوط' : 'Not linked');

    const stripeReady = stripe.isConnected && stripe.onboarded && stripe.payoutsEnabled !== false;
    const stripeTone = !stripe.isConnected ? 'off' : stripeReady ? 'ok' : (stripe.requirementsDueCount ?? 0) > 0 || stripe.disabledReason ? 'warn' : 'pending';
    const stripeLabel = !stripe.isConnected
        ? (isAr ? 'غير مربوط' : 'Not connected')
        : stripeReady
            ? (isAr ? 'جاهز للتحويل' : 'Ready for payouts')
            : stripeTone === 'warn'
                ? (isAr ? 'يحتاج إجراء' : 'Action required')
                : (isAr ? 'قيد التفعيل' : 'Onboarding');

    const yesNo = (v: boolean | null) => (v === null ? '—' : v ? (isAr ? 'نعم' : 'Yes') : (isAr ? 'لا' : 'No'));

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <GlassCard className="p-5 bg-blue-500/5 border-blue-500/10">
                <div className="flex items-center justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400">
                            <Landmark size={18} />
                        </div>
                        <span className="text-sm font-black text-white">{isAr ? 'الحساب البنكي' : 'Bank Account'}</span>
                    </div>
                    <StatusPill tone={bankTone} label={bankLabel} />
                </div>
                {bank.isLinked ? (
                    <div>
                        <InfoRow label={isAr ? 'البنك' : 'Bank'} value={bank.bankName || '—'} />
                        <InfoRow label={isAr ? 'صاحب الحساب' : 'Account holder'} value={bank.accountHolder || '—'} />
                        <InfoRow label="IBAN" value={bank.iban || bank.maskedIban || '—'} mono />
                        <InfoRow label="SWIFT" value={bank.swift || '—'} mono />
                    </div>
                ) : (
                    <p className="text-xs text-white/40">{isAr ? 'لم يتم إضافة حساب بنكي بعد.' : 'No bank account added yet.'}</p>
                )}
            </GlassCard>

            <GlassCard className="p-5 bg-purple-500/5 border-purple-500/10">
                <div className="flex items-center justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-400">
                            <CreditCard size={18} />
                        </div>
                        <span className="text-sm font-black text-white">Stripe Connect</span>
                    </div>
                    <StatusPill tone={stripeTone} label={stripeLabel} />
                </div>
                {stripe.isConnected ? (
                    <div>
                        <InfoRow label={isAr ? 'رقم الحساب' : 'Account'} value={stripe.maskedAccountId || '—'} mono />
                        <InfoRow label={isAr ? 'التحويلات مفعّلة' : 'Payouts enabled'} value={yesNo(stripe.payoutsEnabled)} />
                        <InfoRow label={isAr ? 'المدفوعات مفعّلة' : 'Charges enabled'} value={yesNo(stripe.chargesEnabled)} />
                        <InfoRow label={isAr ? 'البيانات مكتملة' : 'Details submitted'} value={yesNo(stripe.detailsSubmitted)} />
                        {(stripe.requirementsDueCount ?? 0) > 0 && (
                            <InfoRow label={isAr ? 'متطلبات ناقصة' : 'Requirements due'} value={stripe.requirementsDueCount} />
                        )}
                        {stripe.disabledReason && (
                            <InfoRow label={isAr ? 'سبب الإيقاف' : 'Disabled reason'} value={stripe.disabledReason} mono />
                        )}
                        {stripe.statusUpdatedAt && (
                            <InfoRow
                                label={isAr ? 'آخر تحديث' : 'Last update'}
                                value={new Date(stripe.statusUpdatedAt).toLocaleString(isAr ? 'ar-AE' : 'en-AE')}
                            />
                        )}
                    </div>
                ) : (
                    <p className="text-xs text-white/40">{isAr ? 'لم يتم ربط حساب Stripe بعد.' : 'No Stripe account connected yet.'}</p>
                )}
            </GlassCard>
        </div>
    );
});

AdminPayoutMethodsCard.displayName = 'AdminPayoutMethodsCard';
