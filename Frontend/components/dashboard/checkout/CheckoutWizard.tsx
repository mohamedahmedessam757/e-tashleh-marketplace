
import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCheckoutStore } from '../../../stores/useCheckoutStore';
import { useLanguage } from '../../../contexts/LanguageContext';
import { GlassCard } from '../../ui/GlassCard';
import { CheckCircle2, ChevronLeft, ChevronRight, Loader2, X } from 'lucide-react';
import { AddressStep } from './steps/AddressStep';
import { OrderSummaryStep } from './steps/OrderSummaryStep';
import { PaymentStep } from './steps/PaymentStep';
import { useOrderStore } from '../../../stores/useOrderStore';
import { useNotificationStore } from '../../../stores/useNotificationStore';
import { OffersReviewStep } from './steps/OffersReviewStep';
import { useOrderRealtimeSync } from '../../../hooks/useOrderRealtimeSync';
import { isAcceptedOfferStatus, isActiveOfferStatus } from '../../../utils/offerStatusHelpers';
import {
    areAllAcceptedOffersPaid,
    getAcceptedOffersFromList,
} from '../../../utils/checkoutPaymentHelpers';
import { hasMeaningfulAddress } from '../../../utils/checkoutSessionStorage';

interface CheckoutWizardProps {
    onComplete: () => void;
    onNavigate: (path: string, id?: any) => void;
}

export const CheckoutWizard: React.FC<CheckoutWizardProps> = ({ onComplete, onNavigate }) => {
    const {
        step,
        address,
        termsAccepted,
        returnPolicyAccepted,
        setStep,
        selectedOffer,
        submitPayment,
        isProcessing,
        setOpenDrawerForPartId,
        setIsEditingShipping,
        saveOrderData,
        orderId,
        paidOfferIds,
        syncPaidOffersForOrder,
        hydrateShippingFromOrder,
        persistCheckoutSession,
        clearCheckoutForOrder,
    } = useCheckoutStore();
    const { updateOrderStatus, orders } = useOrderStore();
    const { addNotification } = useNotificationStore();

    const { t, language } = useLanguage();
    const [showValidationErrors, setShowValidationErrors] = useState(false);
    const [showPaymentError, setShowPaymentError] = useState(false);
    const [isVerifyingPayments, setIsVerifyingPayments] = useState(false);

    const NextIcon = language === 'ar' ? ChevronLeft : ChevronRight;
    const PrevIcon = language === 'ar' ? ChevronRight : ChevronLeft;

    const order = React.useMemo(() => orders.find(o => String(o.id) === String(orderId)), [orders, orderId]);

    useOrderRealtimeSync(orderId ?? undefined);

    useEffect(() => {
        if (!orderId) return;
        void useOrderStore.getState().fetchOrder(orderId);
    }, [orderId]);

    useEffect(() => {
        if (!order || !orderId) return;
        hydrateShippingFromOrder(order);
        const s = useCheckoutStore.getState();
        if (hasMeaningfulAddress(s.address) && s.step === 1 && s.termsAccepted) {
            setStep(2);
        }
    }, [order?.id, order?.shippingAddresses, orderId, hydrateShippingFromOrder, setStep]);

    useEffect(() => {
        if (!orderId) return;
        const onLeave = () => persistCheckoutSession();
        window.addEventListener('beforeunload', onLeave);
        return () => window.removeEventListener('beforeunload', onLeave);
    }, [orderId, persistCheckoutSession]);

    const acceptedOffers = React.useMemo(
        () => getAcceptedOffersFromList(order?.offers),
        [order?.offers],
    );

    const allOffersPaid = React.useMemo(
        () => areAllAcceptedOffersPaid(acceptedOffers, paidOfferIds),
        [acceptedOffers, paidOfferIds],
    );

    useEffect(() => {
        if (step !== 3 || !orderId || acceptedOffers.length === 0) return;
        void syncPaidOffersForOrder(acceptedOffers.map((o) => String(o.id)));
    }, [step, orderId, acceptedOffers, syncPaidOffersForOrder]);

    // Determines if any part still needs an offer selection (for validation blocking)
    const hasPendingToReview = React.useMemo(() => {
        if (!order || !order.parts || order.parts.length <= 1) return false;

        let pending = false;
        for (const part of order.parts) {
            const partOffers =
                order.offers?.filter(
                    (o) =>
                        String(o.orderPartId) === String(part.id) &&
                        isActiveOfferStatus(o.status),
                ) || [];
            const hasAccepted = partOffers.some((o) => isAcceptedOfferStatus(o.status));
            if (partOffers.length > 0 && !hasAccepted) {
                pending = true;
                break;
            }
        }
        return pending;
    }, [order]);

    // Multi-part orders ALWAYS show Step 0 as a summary checkout step
    const requiresOfferReview = order && order.parts && order.parts.length > 1;

    // Default start at step 0 if it's a multi-part order
    useEffect(() => {
        if (requiresOfferReview && step === 1 && hasPendingToReview) {
            setStep(0);
        }
    }, [requiresOfferReview, step, hasPendingToReview]);

    const steps = [
        ...(requiresOfferReview ? [{ id: 0, title: language === 'ar' ? 'مراجعة العروض' : 'Review Offers' }] : []),
        { id: 1, title: t.dashboard.checkout.steps.address },
        { id: 2, title: t.dashboard.checkout.steps.finalReview },
        { id: 3, title: t.dashboard.checkout.steps.payment },
    ];

    const currentStepIndex = steps.findIndex(s => s.id === step);
    const isFirstStep = currentStepIndex === 0;
    const isLastStep = currentStepIndex === steps.length - 1;

    const handleNext = async () => {
        if (step === 0) {
            // Block navigation if still needs review
            if (hasPendingToReview) {
                setShowValidationErrors(true);
                addNotification({
                    recipientRole: 'CUSTOMER',
                    type: 'system',
                    titleKey: 'error',
                    message: language === 'ar' ? 'يجب اختيار عرض لكل قطعة متاح لها عروض قبل المتابعة' : 'Must select an offer for each part with active offers before proceeding',
                    priority: 'high'
                });
                return;
            }
            setShowValidationErrors(false);
            setStep(1);
        } else if (step === 1) {
            const isAddressInvalid = !address.fullName || !address.phone || !address.email || !address.city || !address.details;
            if (isAddressInvalid || !termsAccepted || !returnPolicyAccepted) {
                setShowValidationErrors(true);
                addNotification({
                    recipientRole: 'CUSTOMER',
                    type: 'system',
                    titleKey: 'error',
                    message: language === 'ar' ? 'يجب تعبئة جميع البيانات والموافقة على الشروط والأحكام وسياسة الإرجاع أولاً' : 'You must fill all data and agree to the Terms and Return Policy first',
                    priority: 'high'
                });
                return;
            }
            setShowValidationErrors(false);
            setIsEditingShipping(false); // Lock it
            const saved = await saveOrderData();
            if (!saved) {
                addNotification({
                    recipientRole: 'CUSTOMER',
                    type: 'system',
                    titleKey: 'error',
                    message:
                        language === 'ar'
                            ? 'تعذّر حفظ بيانات الشحن. تحقق من الاتصال وحاول مرة أخرى.'
                            : 'Could not save shipping details. Check your connection and try again.',
                    priority: 'high',
                });
                return;
            }
            setStep(2);
        } else if (step === 2) {
            const success = await saveOrderData();
            if (success) {
                setStep(3);
            } else {
                addNotification({
                    recipientRole: 'CUSTOMER',
                    type: 'system',
                    titleKey: 'error',
                    message: language === 'ar' ? 'حدث خطأ أثناء حفظ بيانات الشحن. يرجى المحاولة مرة أخرى.' : 'Failed to save shipping data. Please try again.',
                    priority: 'high'
                });
            }
        } else if (step === 3) {
            if (acceptedOffers.length === 0) {
                addNotification({
                    recipientRole: 'CUSTOMER',
                    type: 'system',
                    titleKey: 'error',
                    message: language === 'ar'
                        ? 'لا توجد عروض مقبولة للدفع.'
                        : 'No accepted offers to pay for.',
                    priority: 'high',
                });
                return;
            }

            setIsVerifyingPayments(true);
            try {
                await syncPaidOffersForOrder(acceptedOffers.map((o) => String(o.id)));
                const latestPaid = useCheckoutStore.getState().paidOfferIds;
                const allPaid = areAllAcceptedOffersPaid(acceptedOffers, latestPaid);

                if (!allPaid) {
                    setShowPaymentError(true);
                    setTimeout(() => setShowPaymentError(false), 2000);

                    const paidSet = new Set(latestPaid.map(String));
                    const remaining = acceptedOffers.filter(
                        (o) => !paidSet.has(String(o.id)),
                    ).length;
                    addNotification({
                        recipientRole: 'CUSTOMER',
                        type: 'system',
                        titleKey: 'error',
                        message: language === 'ar'
                            ? `لا يزال هناك ${remaining} قطعة/عروض لم يتم الدفع لها بنجاح. يرجى إكمال الدفع لجميع القطع أولاً.`
                            : `There are still ${remaining} unpaid part(s). Please complete payment for all parts first.`,
                        priority: 'high',
                    });
                    return;
                }

                if (orderId) {
                    clearCheckoutForOrder(orderId);
                }
                onNavigate('order-details', orderId);
            } finally {
                setIsVerifyingPayments(false);
            }
        } else {
            setStep(step + 1);
        }
    };

    const handlePrev = () => {
        if (currentStepIndex > 0) {
            setStep(steps[currentStepIndex - 1].id);
        } else {
            onComplete(); // Go back to order details
        }
    };

    return (
        <>
            <div className="max-w-3xl mx-auto space-y-8">
                <div className="text-center">
                    <h1 className="text-3xl font-bold text-white mb-2">{t.dashboard.checkout.title}</h1>
                </div>

                {/* Stepper */}
                <div className="flex justify-between items-center px-4 relative mb-12">
                    <div className="absolute top-5 left-0 w-full h-1 bg-white/10 -z-10 rounded-full">
                        <motion.div
                            className="h-full bg-gold-500"
                            initial={{ width: 0 }}
                            animate={{ width: `${(currentStepIndex / (steps.length - 1)) * 100}%` }}
                        />
                    </div>
                    {steps.map((s, index) => {
                        const isActive = step >= s.id;
                        return (
                            <div key={s.id} className="flex flex-col items-center gap-2 z-10">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-colors ${isActive ? 'bg-[#1A1814] border-gold-500 text-gold-500' : 'bg-[#1A1814] border-white/20 text-white/20'}`}>
                                    {isActive ? <CheckCircle2 size={20} /> : (index + 1)}
                                </div>
                                <span className={`text-xs font-bold ${isActive ? 'text-gold-500' : 'text-white/20'}`}>{s.title}</span>
                            </div>
                        );
                    })}
                </div>

                <GlassCard
                    className={`flex flex-col p-8 border-gold-500/20 ${
                        step === 1 ? 'min-h-0' : 'min-h-[400px] justify-between'
                    }`}
                >
                    <div className={step === 1 ? '' : 'flex-1'}>
                        {step === 0 && <OffersReviewStep
                            showValidationErrors={showValidationErrors}
                            onBackToOffers={(partId) => {
                                if (partId) setOpenDrawerForPartId(partId);
                                onNavigate('order-details', orderId);
                            }}
                        />}
                        {step === 1 && <AddressStep showValidationErrors={showValidationErrors} order={order} onNavigate={onNavigate} />}
                        {step === 2 && <OrderSummaryStep />}
                        {step === 3 && <PaymentStep />}
                    </div>

                    {step === 2 ? (
                        <div className="flex justify-center items-center gap-4 mt-8 pt-6 border-t border-white/5">
                            <button
                                onClick={handleNext}
                                disabled={isProcessing}
                                className="px-12 py-3 rounded-xl bg-green-500 hover:bg-green-600 text-white font-bold shadow-lg shadow-green-500/20 transition-all flex items-center gap-2"
                            >
                                {isProcessing ? (
                                    <Loader2 size={18} className="animate-spin" />
                                ) : (
                                    <>
                                        <CheckCircle2 size={18} />
                                        <span>{t.dashboard.checkout.finalReview.approve}</span>
                                    </>
                                )}
                            </button>
                            <button
                                onClick={handlePrev}
                                disabled={isProcessing}
                                className="px-8 py-3 flex items-center gap-2 rounded-xl border border-red-500/20 text-red-500 bg-red-500/5 hover:bg-red-500/10 hover:border-red-500/40 font-bold transition-colors disabled:opacity-50"
                            >
                                <span>{t.dashboard.checkout.finalReview.cancel}</span>
                                <X size={18} />
                            </button>
                        </div>
                    ) : (
                        <div className="flex justify-between items-center mt-12 pt-8 border-t border-white/5">
                            <button
                                onClick={handlePrev}
                                className="flex items-center gap-2 px-6 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white font-bold transition-colors"
                            >
                                <PrevIcon size={18} />
                                <span>{isFirstStep ? (language === 'ar' ? 'رجوع للطلب' : 'Back to Order') : t.dashboard.checkout.common.back}</span>
                            </button>
                            <motion.button
                                type="button"
                                onClick={handleNext}
                                disabled={
                                    isProcessing ||
                                    isVerifyingPayments ||
                                    (step === 3 && !allOffersPaid)
                                }
                                animate={showPaymentError ? { x: [-10, 10, -10, 10, 0], scale: [1, 1.02, 1] } : {}}
                                transition={{ duration: 0.4 }}
                                className={`flex items-center gap-2 px-8 py-3 rounded-xl font-bold transition-all relative ${showPaymentError
                                    ? 'bg-red-500 text-white shadow-[0_0_15px_rgba(239,68,68,0.5)]'
                                    : step === 3 && !allOffersPaid
                                        ? 'bg-white/10 text-white/40 cursor-not-allowed opacity-60'
                                        : 'bg-gold-500 hover:bg-gold-600 text-white shadow-lg shadow-gold-500/20'
                                    }`}
                            >
                                {isProcessing || isVerifyingPayments ? (
                                    <Loader2 size={18} className="animate-spin" />
                                ) : (
                                    <>
                                        {step === 3 ? (
                                            allOffersPaid
                                                ? <><CheckCircle2 size={18} /><span>{language === 'ar' ? 'الذهاب للطلب' : 'Go to Order'}</span></>
                                                : <div className="flex flex-col items-center">
                                                    <span className="text-xs opacity-60 mb-0.5">{language === 'ar' ? 'تنبيه' : 'Alert'}</span>
                                                    <span>{language === 'ar' ? 'يجب الدفع أولاً' : 'Pay First'}</span>
                                                </div>
                                        ) : (
                                            <><span>{t.dashboard.checkout.common.continue}</span><NextIcon size={18} /></>
                                        )}
                                    </>
                                )}
                            </motion.button>
                        </div>
                    )}
                </GlassCard>
            </div>
        </>
    );
};
