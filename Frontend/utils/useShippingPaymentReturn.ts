import { useEffect, useRef } from 'react';
import { useNotificationStore } from '../stores/useNotificationStore';
import { useResolutionStore } from '../stores/useResolutionStore';

/**
 * Handles Stripe Checkout return for shipping (?payment=) and adjudication fees (?adjFeePayment=).
 */
export function useShippingPaymentReturn(
    enabled: boolean,
    role: 'merchant' | 'customer',
    onNavigate?: (path: string, id?: string) => void,
) {
    const handled = useRef(false);
    const { addNotification } = useNotificationStore();

    useEffect(() => {
        if (!enabled || handled.current) return;

        const params = new URLSearchParams(window.location.search);
        const payment = params.get('payment');
        const adjFeePayment = params.get('adjFeePayment');
        const settlementPayment = params.get('settlementPayment');
        if (!payment && !adjFeePayment && !settlementPayment) return;

        const caseId = params.get('caseId');
        const caseType = params.get('caseType') || 'dispute';
        handled.current = true;

        const cleanUrl = () => {
            const url = new URL(window.location.href);
            url.searchParams.delete('payment');
            url.searchParams.delete('adjFeePayment');
            url.searchParams.delete('settlementPayment');
            url.searchParams.delete('caseId');
            url.searchParams.delete('caseType');
            window.history.replaceState(window.history.state, '', url.pathname + url.search);
        };

        const refresh = async () => {
            if (role === 'merchant') {
                await useResolutionStore.getState().fetchMerchantCases(true);
            } else {
                await useResolutionStore.getState().fetchUserRequests(true);
            }
        };

        void (async () => {
            await refresh();

            if (settlementPayment === 'success') {
                addNotification({
                    type: 'success',
                    titleAr: 'تم السداد المجمع',
                    titleEn: 'Combined settlement paid',
                    messageAr: 'تم تأكيد دفع رسوم الحكم وشحن المرتجع. سيظهر كل بند منفصلاً في السجل المالي.',
                    messageEn: 'Judgment fees and return shipping confirmed. Each line is itemized in the ledger.',
                });
                if (caseId && onNavigate) {
                    onNavigate('dispute-details', caseId);
                }
            } else if (settlementPayment === 'cancel') {
                addNotification({
                    type: 'warning',
                    titleAr: 'تم إلغاء السداد المجمع',
                    titleEn: 'Combined settlement cancelled',
                    messageAr: 'لم يتم خصم أي مبلغ. يمكنك إعادة المحاولة من بطاقة السداد.',
                    messageEn: 'No charge was made. You can retry from the settlement card.',
                });
            } else if (adjFeePayment === 'success') {
                addNotification({
                    type: 'success',
                    titleAr: 'تم سداد رسوم الحكم',
                    titleEn: 'Adjudication fee paid',
                    messageAr: 'تم تأكيد دفع رسوم الحكم عبر Stripe.',
                    messageEn: 'Adjudication fee payment confirmed via Stripe.',
                });
                if (caseId && onNavigate) {
                    onNavigate('dispute-details', caseId);
                }
            } else if (adjFeePayment === 'cancel') {
                addNotification({
                    type: 'warning',
                    titleAr: 'تم إلغاء دفع رسوم الحكم',
                    titleEn: 'Adjudication fee payment cancelled',
                    messageAr: 'لم يتم خصم أي مبلغ. يمكنك إعادة المحاولة من بطاقة رسوم الحكم.',
                    messageEn: 'No charge was made. You can retry from the adjudication fee card.',
                });
            } else if (payment === 'success') {
                addNotification({
                    type: 'success',
                    titleAr: 'تم سداد شحن المرتجع',
                    titleEn: 'Return shipping paid',
                    messageAr: 'تم تأكيد الدفع. سيتم تفعيل بوليصة الإرجاع قريباً.',
                    messageEn: 'Payment confirmed. The return waybill will be activated shortly.',
                });
                if (caseId && onNavigate) {
                    const path =
                        caseType === 'dispute' ? 'dispute-details' : 'resolution';
                    if (path === 'dispute-details') {
                        onNavigate(path, caseId);
                    }
                }
            } else if (payment === 'cancel') {
                addNotification({
                    type: 'warning',
                    titleAr: 'تم إلغاء الدفع',
                    titleEn: 'Payment cancelled',
                    messageAr: 'لم يتم خصم أي مبلغ. يمكنك إعادة المحاولة من بطاقة الشحن.',
                    messageEn: 'No charge was made. You can retry from the shipping payment card.',
                });
            }

            cleanUrl();
        })();
    }, [enabled, role, onNavigate, addNotification]);
}
