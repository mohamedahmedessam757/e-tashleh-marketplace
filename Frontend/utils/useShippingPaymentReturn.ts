import { useEffect, useRef } from 'react';
import { useNotificationStore } from '../stores/useNotificationStore';
import { useResolutionStore } from '../stores/useResolutionStore';

/**
 * Handles Stripe Checkout return (?payment=success|cancel) for return/dispute shipping fees.
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
        if (!payment) return;

        const caseId = params.get('caseId');
        const caseType = params.get('caseType') || 'dispute';
        handled.current = true;

        const cleanUrl = () => {
            const url = new URL(window.location.href);
            url.searchParams.delete('payment');
            url.searchParams.delete('caseId');
            url.searchParams.delete('caseType');
            window.history.replaceState(window.history.state, '', url.pathname + url.search);
        };

        const refresh = async () => {
            if (role === 'merchant') {
                await useResolutionStore.getState().fetchMerchantCases(true);
            }
        };

        void (async () => {
            await refresh();

            if (payment === 'success') {
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
