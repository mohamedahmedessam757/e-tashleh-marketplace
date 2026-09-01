import React from 'react';
import { motion } from 'framer-motion';
import { Truck, CreditCard, AlertTriangle } from 'lucide-react';
import { Button } from '../../ui/Button';
import { useLanguage } from '../../../contexts/LanguageContext';
import { ResolutionCase } from '../../../stores/useResolutionStore';

function shippingAmountDue(c: ResolutionCase): number {
    if (c.shippingPayee !== 'MERCHANT') return 0;
    const amount = Number(c.shippingRefund || c.shippingRoundtrip || 0);
    if (amount <= 0) return 0;
    if (c.shippingPaymentStatus === 'PENDING' || c.shippingPaymentStatus === 'INSUFFICIENT_FUNDS') {
        return amount;
    }
    // Legacy: PAID flag without a recorded method still blocks logistics
    if (c.shippingPaymentStatus === 'PAID' && !c.shippingPaymentMethod) return amount;
    return 0;
}

function adjudicationAmountDue(c: ResolutionCase): number {
    if (c.adjudicationFeePayee !== 'MERCHANT') return 0;
    if (c.adjudicationFeePaymentStatus !== 'PENDING') return 0;
    const amount = Number(c.adjudicationFeeAmount || 0);
    return amount > 0 ? amount : 0;
}

function merchantPaymentDue(c: ResolutionCase): number {
    return shippingAmountDue(c) + adjudicationAmountDue(c);
}

interface MerchantShippingPayAlertProps {
    cases: ResolutionCase[];
    onNavigate: (path: string, id?: string) => void;
    compact?: boolean;
}

export const MerchantShippingPayAlert: React.FC<MerchantShippingPayAlertProps> = ({
    cases,
    onNavigate,
    compact = false,
}) => {
    const { language } = useLanguage();
    const isAr = language === 'ar';

    const pending = cases.filter(
        (c) =>
            merchantPaymentDue(c) > 0 &&
            !!c.orderId &&
            !['CLOSED', 'CANCELLED'].includes(c.status),
    );

    if (pending.length === 0) return null;

    const first = pending[0];
    const totalDue = pending.reduce((sum, c) => sum + merchantPaymentDue(c), 0);

    return (
        <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className={`rounded-[28px] border-2 border-gold-500/40 bg-gradient-to-r from-gold-500/15 via-amber-500/10 to-transparent shadow-2xl shadow-gold-500/10 min-w-0 ${compact ? 'p-4' : 'p-4 sm:p-6'}`}
        >
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-start gap-3 sm:gap-4 min-w-0 flex-1">
                    <div className="w-12 h-12 rounded-2xl bg-gold-500 text-black flex items-center justify-center flex-shrink-0">
                        <AlertTriangle size={24} strokeWidth={2.5} />
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-gold-400 uppercase tracking-[0.25em] mb-1">
                            {isAr ? 'إجراء عاجل — سداد مستحقات' : 'URGENT — SETTLEMENT DUE'}
                        </p>
                        <h3 className="text-lg font-black text-white mb-1">
                            {isAr
                                ? `يجب سداد ${pending.length} طلب(طلبات) — رسوم حكم و/أو شحن مرتجع`
                                : `${pending.length} order(s) need adjudication and/or return shipping payment`}
                        </h3>
                        <p className="text-sm text-white/60 font-bold max-w-xl">
                            {isAr
                                ? `المجموع المطلوب: ${totalDue.toLocaleString()} AED. سيتم فتح تفاصيل الطلب للدفع فوراً.`
                                : `Total due: ${totalDue.toLocaleString()} AED. Opens the order details page to pay now.`}
                        </p>
                    </div>
                </div>
                <Button
                    onClick={() => onNavigate('explore-offer', first.orderId)}
                    className="h-12 sm:h-14 w-full sm:w-auto px-6 sm:px-8 bg-gold-500 hover:bg-gold-400 text-black font-black uppercase tracking-widest text-[11px] rounded-2xl min-h-[44px]"
                >
                    <div className="flex items-center gap-2">
                        <CreditCard size={16} />
                        <Truck size={16} />
                        {isAr ? 'ادفع الآن' : 'PAY NOW'}
                    </div>
                </Button>
            </div>
        </motion.div>
    );
};
