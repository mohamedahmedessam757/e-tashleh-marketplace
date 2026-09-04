import { describe, it, expect } from '@jest/globals';
import {
    allPartsPrepared,
    allReadyForShipping,
    containsMultiOnlyArabic,
    isMultiItemOrder,
    offersAcceptedForPayment,
    offerAcceptedPartial,
    partPrepared,
    partReadyForShipping,
    preparationStarted,
    paymentConfirmedPrepare,
    readyForShippingCustomerLink,
    aggregateStatusBranch,
} from './order-notification-copy.util';

const SINGLE = { isMulti: false, orderNumber: 'ORD-2609-00002', partName: 'TEST-06' };
const MULTI = { isMulti: true, orderNumber: 'ORD-2609-00007', partName: 'TEST-06' };

describe('isMultiItemOrder', () => {
    it('detects multiple requestType', () => {
        expect(isMultiItemOrder({ requestType: 'multiple', parts: [] })).toBe(true);
    });
    it('detects parts.length > 1', () => {
        expect(isMultiItemOrder({ requestType: 'single', parts: [{}, {}] })).toBe(true);
    });
    it('single with one part', () => {
        expect(isMultiItemOrder({ requestType: 'single', parts: [{}] })).toBe(false);
    });
});

describe('single-order copy never uses multi-only Arabic', () => {
    const singleMessages: string[] = [
        offersAcceptedForPayment(SINGLE).messageAr,
        offerAcceptedPartial(SINGLE).messageAr,
        preparationStarted(SINGLE).messageAr,
        partPrepared(SINGLE).messageAr,
        allPartsPrepared(SINGLE).messageAr,
        partReadyForShipping(SINGLE).messageAr,
        allReadyForShipping(SINGLE).messageAr,
        paymentConfirmedPrepare(SINGLE).messageAr,
        aggregateStatusBranch(SINGLE, 'PREPARATION')!.messageAr,
        aggregateStatusBranch(SINGLE, 'PREPARED')!.messageAr,
    ];

    it('all single messages avoid multi-only phrases', () => {
        for (const messageAr of singleMessages) {
            expect(containsMultiOnlyArabic(messageAr)).toBe(false);
        }
    });
});

describe('multi-order copy keeps shipping-cart / plural where expected', () => {
    it('part ready mentions shipping cart', () => {
        expect(partReadyForShipping(MULTI).messageAr).toContain('سلة الشحن');
    });
    it('all ready mentions shipping cart', () => {
        expect(allReadyForShipping(MULTI).messageAr).toContain('سلة الشحن');
    });
    it('part prepared mentions remaining parts', () => {
        expect(partPrepared(MULTI).messageAr).toContain('باقي القطع');
    });
    it('offers accepted uses جميع القطع', () => {
        expect(offersAcceptedForPayment(MULTI).messageAr).toContain('جميع القطع');
    });
    it('preparation started uses قطع طلبك', () => {
        expect(preparationStarted(MULTI).messageAr).toContain('قطع طلبك');
    });
});

describe('user-reported scenario snapshots (AR)', () => {
    it('problem 1 — offers accepted single', () => {
        expect(offersAcceptedForPayment(SINGLE).messageAr).toBe(
            'تم قبول العرض في الطلب #ORD-2609-00002. يمكنك المتابعة للدفع.',
        );
    });
    it('problem 2 — preparation started single', () => {
        expect(preparationStarted(SINGLE).messageAr).toBe('بدأ تجهيز طلبك الآن.');
    });
    it('problem 3 — part prepared single (no remaining parts)', () => {
        expect(partPrepared(SINGLE).messageAr).toBe(
            'أنهى التاجر تجهيز «TEST-06» في الطلب #ORD-2609-00002.',
        );
    });
    it('problem 4 — all prepared single', () => {
        expect(allPartsPrepared(SINGLE).messageAr).toBe(
            'تم تجهيز القطعة في الطلب #ORD-2609-00002. سيبدأ التوثيق قريباً.',
        );
    });
    it('problem 5 — part ready single (no cart)', () => {
        expect(partReadyForShipping(SINGLE).messageAr).toBe('«TEST-06» جاهزة للشحن.');
    });
    it('problem 6 — all ready single (no cart)', () => {
        expect(allReadyForShipping(SINGLE).messageAr).toBe(
            'طلبك #ORD-2609-00002 جاهز للشحن.',
        );
    });
});

describe('readyForShippingCustomerLink', () => {
    const orderId = '3fd67bae-5ebe-4a60-a94d-f8226627dacf';
    it('single → order details', () => {
        expect(readyForShippingCustomerLink(false, orderId)).toBe(
            `/dashboard/orders/${orderId}`,
        );
    });
    it('multi → shipping cart', () => {
        expect(readyForShippingCustomerLink(true, orderId)).toBe('/dashboard/shipping-cart');
    });
});
