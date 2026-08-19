import { ReturnsFeeInvoiceService } from './returns-fee-invoice.service';
import { computeAdjudicationFinancials } from '../returns/adjudication-financial.util';
import { buildFeeSettlementPlan } from '../returns/fee-settlement-plan.util';

function merchantFaultPlan() {
    const fin = computeAdjudicationFinancials({
        orderPaidTotal: 100,
        gatewayFeePct: 3,
        refundFeePct: 1.5,
        shippingRoundtrip: 20,
        faultParty: 'MERCHANT',
        finalRefundDecision: 'REFUND_CUSTOMER',
    });
    return buildFeeSettlementPlan({
        caseId: 'case_1',
        shippingRoundtrip: 20,
        refundExecutionStatus: fin.refundExecutionStatusSeed,
        fin,
        faultPartyHint: 'MERCHANT',
    });
}

function logisticsPlan() {
    const fin = computeAdjudicationFinancials({
        orderPaidTotal: 100,
        gatewayFeePct: 3,
        refundFeePct: 1.5,
        shippingRoundtrip: 20,
        faultParty: 'SHIPPING_COMPANY',
        finalRefundDecision: 'REFUND_CUSTOMER',
    });
    return buildFeeSettlementPlan({
        caseId: 'case_logistics',
        shippingRoundtrip: 20,
        refundExecutionStatus: fin.refundExecutionStatusSeed,
        fin,
        faultPartyHint: 'SHIPPING_COMPANY',
    });
}

const paidCtx = {
    orderId: 'ord-1',
    paymentId: 'pay-refunded',
    customerId: 'cust-1',
    merchantOwnerId: 'merchant-1',
    adjudicationFeePaid: true,
    shippingPaid: true,
};

describe('ReturnsFeeInvoiceService.ensureFromPlan', () => {
    it('does not create a second COMMISSION or SHIPPING when batch keys already exist', async () => {
        const create = jest.fn();
        const findFirst = jest.fn().mockResolvedValue({ id: 'existing' });
        const prisma = {
            invoice: { findFirst, create },
        };
        const svc = new ReturnsFeeInvoiceService(prisma as any);

        await svc.ensureFromPlan(merchantFaultPlan(), paidCtx);
        await svc.ensureFromPlan(merchantFaultPlan(), paidCtx);

        expect(create).not.toHaveBeenCalled();
        expect(findFirst).toHaveBeenCalled();
    });

    it('does not assign platform / shipping-company fee docs to merchant or customer', async () => {
        const create = jest.fn();
        const prisma = {
            invoice: { findFirst: jest.fn().mockResolvedValue(null), create },
        };
        const svc = new ReturnsFeeInvoiceService(prisma as any);

        await svc.ensureFromPlan(logisticsPlan(), { ...paidCtx, adminId: null });

        expect(create).not.toHaveBeenCalled();
    });

    it('issues platform-borne docs to the admin actor only', async () => {
        const create = jest.fn().mockResolvedValue({ id: 'new' });
        const prisma = {
            invoice: { findFirst: jest.fn().mockResolvedValue(null), create },
            $queryRaw: jest.fn().mockResolvedValue([{ generate_typed_invoice_number: 'INV-C-1' }]),
        };
        const svc = new ReturnsFeeInvoiceService(prisma as any);

        await svc.ensureFromPlan(logisticsPlan(), { ...paidCtx, adminId: 'admin-1' });

        expect(create).toHaveBeenCalled();
        for (const call of create.mock.calls) {
            expect(call[0].data.customerId).toBe('admin-1');
            expect(call[0].data.customerId).not.toBe('cust-1');
            expect(call[0].data.customerId).not.toBe('merchant-1');
        }
    });

    it('issueFromCaseRow still looks up REFUNDED sale payments', async () => {
        const findFirst = jest.fn().mockResolvedValue({ id: 'pay-refunded', totalAmount: 100 });
        const prisma = {
            paymentTransaction: { findFirst },
            invoice: {
                findFirst: jest.fn().mockResolvedValue({
                    id: 'master',
                    invoiceGroupId: 'g1',
                    currency: 'AED',
                    partNameSnapshot: 'Part',
                }),
            },
            store: { findUnique: jest.fn().mockResolvedValue({ ownerId: 'merchant-1' }) },
        };
        const svc = new ReturnsFeeInvoiceService(prisma as any);
        jest.spyOn(svc, 'ensureFromPlan').mockResolvedValue(undefined);

        await svc.issueFromCaseRow({
            id: 'case_1',
            orderId: 'ord-1',
            storeId: 'store-1',
            faultParty: 'MERCHANT',
            finalRefundDecision: 'REFUND_CUSTOMER',
            customerId: 'cust-1',
        });

        expect(findFirst).toHaveBeenCalledWith(
            expect.objectContaining({
                where: expect.objectContaining({
                    orderId: 'ord-1',
                    status: { in: ['SUCCESS', 'REFUNDED'] },
                }),
            }),
        );
        expect(svc.ensureFromPlan).toHaveBeenCalled();
    });
});
