import { filterOrderInvoicesForViewer, isReturnsFeeInvoice, isRefundProofInvoice, isSaleRefundStampableInvoice, FEE_INVOICE_ATTACHABLE_PAYMENT_STATUSES } from './invoice-visibility.util';

const issued = new Date('2026-01-01T00:00:00Z');

describe('invoice visibility — payer-only fee docs', () => {
    const invoices = [
        {
            paymentId: 'pay-1',
            invoiceType: 'MASTER',
            customerId: 'cust-1',
            shippingBatchKey: null,
            issuedAt: issued,
        },
        {
            paymentId: 'pay-1',
            invoiceType: 'COMMISSION',
            customerId: 'cust-1',
            shippingBatchKey: 'pay-1',
            issuedAt: issued,
        },
        {
            paymentId: 'pay-1',
            invoiceType: 'COMMISSION',
            customerId: 'cust-1',
            shippingBatchKey: 'RETURNS_FEE:case-1:COMMISSION',
            issuedAt: issued,
        },
        {
            paymentId: 'pay-1',
            invoiceType: 'SHIPPING',
            customerId: 'merchant-1',
            shippingBatchKey: 'RETURNS_FEE:case-1:SHIPPING',
            issuedAt: issued,
        },
        {
            paymentId: 'pay-1',
            invoiceType: 'REFUND',
            customerId: 'cust-1',
            shippingBatchKey: 'REFUND:re_1',
            issuedAt: issued,
        },
    ];

    it('detects returns fee docs by batch key prefix', () => {
        expect(isReturnsFeeInvoice(invoices[2])).toBe(true);
        expect(isReturnsFeeInvoice(invoices[1])).toBe(false);
    });

    it('detects REFUND proof invoices', () => {
        expect(isRefundProofInvoice(invoices[4])).toBe(true);
        expect(isRefundProofInvoice(invoices[0])).toBe(false);
    });

    it('admin sees every invoice', () => {
        expect(filterOrderInvoicesForViewer(invoices, { isAdmin: true, viewerUserId: 'admin' })).toHaveLength(5);
    });

    it('customer sees MASTER + own fee docs + REFUND', () => {
        const visible = filterOrderInvoicesForViewer(invoices, {
            isAdmin: false,
            viewerUserId: 'cust-1',
        });
        expect(visible.map((i) => `${i.invoiceType}:${i.shippingBatchKey}`)).toEqual([
            'MASTER:null',
            'COMMISSION:RETURNS_FEE:case-1:COMMISSION',
            'REFUND:REFUND:re_1',
        ]);
        expect(visible.some((i) => i.customerId === 'merchant-1')).toBe(false);
    });

    it('merchant sees MASTER + own shipping fee doc + REFUND, not customer fee doc', () => {
        const visible = filterOrderInvoicesForViewer(invoices, {
            isAdmin: false,
            viewerUserId: 'merchant-1',
        });
        expect(visible.map((i) => i.invoiceType)).toEqual(['MASTER', 'SHIPPING', 'REFUND']);
    });

    it('unrelated party sees MASTER + REFUND on same payment', () => {
        const visible = filterOrderInvoicesForViewer(invoices, {
            isAdmin: false,
            viewerUserId: 'other',
        });
        expect(visible.map((i) => i.invoiceType)).toEqual(['MASTER', 'REFUND']);
    });
});

describe('isSaleRefundStampableInvoice', () => {
    it('keeps RETURNS_FEE and REFUND proof out of sale refund stamp', () => {
        expect(
            isSaleRefundStampableInvoice({ shippingBatchKey: 'RETURNS_FEE:case-1:COMMISSION' }),
        ).toBe(false);
        expect(
            isSaleRefundStampableInvoice({ shippingBatchKey: 'REFUND:re_1' }),
        ).toBe(false);
        expect(isSaleRefundStampableInvoice({ shippingBatchKey: null })).toBe(true);
        expect(isSaleRefundStampableInvoice({ shippingBatchKey: 'pay-1' })).toBe(true);
    });
});

describe('FEE_INVOICE_ATTACHABLE_PAYMENT_STATUSES', () => {
    it('includes REFUNDED so persist still resolves paymentId after a full refund', () => {
        expect(FEE_INVOICE_ATTACHABLE_PAYMENT_STATUSES).toEqual(['SUCCESS', 'REFUNDED']);
    });
});
