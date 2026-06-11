import React from 'react';
import { motion } from 'framer-motion';
import { Truck, CreditCard, AlertTriangle } from 'lucide-react';
import { Button } from '../../ui/Button';
import { useLanguage } from '../../../contexts/LanguageContext';
import { ResolutionCase } from '../../../stores/useResolutionStore';

function isShippingUnpaid(c: ResolutionCase): boolean {
    const amount = Number(c.shippingRefund || c.shippingRoundtrip || 0);
    if (amount <= 0 || c.shippingPayee !== 'MERCHANT') return false;
    if (c.shippingPaymentStatus === 'PENDING' || c.shippingPaymentStatus === 'INSUFFICIENT_FUNDS') {
        return true;
    }
    return c.shippingPaymentStatus === 'PAID' && !c.shippingPaymentMethod;
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
            isShippingUnpaid(c) &&
            !['CLOSED', 'CANCELLED'].includes(c.status),
    );

    if (pending.length === 0) return null;

    const first = pending[0];
    const totalDue = pending.reduce(
        (sum, c) => sum + Number(c.shippingRefund || c.shippingRoundtrip || 0),
        0,
    );

    return (
        <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className={`rounded-[28px] border-2 border-gold-500/40 bg-gradient-to-r from-gold-500/15 via-amber-500/10 to-transparent shadow-2xl shadow-gold-500/10 ${compact ? 'p-4' : 'p-6'}`}
        >
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-gold-500 text-black flex items-center justify-center flex-shrink-0">
                        <AlertTriangle size={24} strokeWidth={2.5} />
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-gold-400 uppercase tracking-[0.25em] mb-1">
                            {isAr ? 'إجراء عاجل — شحن المرتجع' : 'URGENT — RETURN SHIPPING'}
                        </p>
                        <h3 className="text-lg font-black text-white mb-1">
                            {isAr
                                ? `يجب سداد ${pending.length} تكلفة شحن ذهاباً وإياباً`
                                : `${pending.length} round-trip shipping payment(s) required`}
                        </h3>
                        <p className="text-sm text-white/60 font-bold max-w-xl">
                            {isAr
                                ? `المجموع المطلوب: ${totalDue.toLocaleString()} AED. افتح القضية واضغط «الدفع عبر STRIPE» أو خصم من المحفظة.`
                                : `Total due: ${totalDue.toLocaleString()} AED. Open the case and use Pay via card or wallet.`}
                        </p>
                    </div>
                </div>
                <Button
                    onClick={() =>
                        onNavigate(
                            first.type === 'dispute' ? 'dispute-details' : 'resolution',
                            first.type === 'dispute' ? first.id : undefined,
                        )
                    }
                    className="h-14 px-8 bg-gold-500 hover:bg-gold-400 text-black font-black uppercase tracking-widest text-[11px] rounded-2xl whitespace-nowrap"
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
