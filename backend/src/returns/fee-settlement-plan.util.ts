import type {
    AdjudicationFaultParty,
    AdjudicationFinancialResult,
    FeeBearer,
    FinalRefundDecision,
    RefundExecutionStatus,
    ShippingBearer,
} from './adjudication-financial.util';

export type FeeSettlementFundingPath =
    | 'WALLET_DEBIT'
    | 'WITHHELD_FROM_STRIPE_REFUND'
    | 'PLATFORM_RETENTION_ONLY';

export type FeeSettlementInvoiceDocType = 'COMMISSION' | 'SHIPPING';

export type FeeSettlementLineItemKind =
    | 'GATEWAY_FEE'
    | 'REFUND_FEE'
    | 'ROUNDTRIP_SHIPPING'
    | 'PLATFORM_RETAINED_AMOUNT'
    | 'MERCHANT_WALLET_PLATFORM_FEE_DEBIT'
    | 'MERCHANT_WALLET_SHIPPING_DEBIT'
    | 'SHIPPING_COMPANY_LIABILITY';

export type FeeSettlementPayer =
    | 'CUSTOMER'
    | 'MERCHANT'
    | 'PLATFORM'
    | 'SHIPPING_COMPANY'
    | 'NONE';

export interface FeeSettlementLineItem {
    kind: FeeSettlementLineItemKind;
    amount: number;
    payer: FeeSettlementPayer;
    fundingPath: FeeSettlementFundingPath;
    /**
     * Which existing invoice docType should this line item contribute to.
     * (Phase 3 selects subsets for invoice creation.)
     */
    invoiceDocType?: FeeSettlementInvoiceDocType;
    /**
     * Stable idempotency key part for ledger + invoice dedupe.
     * Actual persistence will store this key in walletTransaction.metadata and/or invoiceGroupId.
     */
    idempotencyKey: string;
}

export interface FeeSettlementInvariants {
    /**
     * Invariant 1: expected sum of PLATFORM_FEE_RETENTION credits.
     * Later phases will check actual ledger sums against this.
     */
    expectedPlatformRetentionCreditAmount: number;

    /**
     * Invariant 2: expected wallet credit for customer REFUND.
     * (Only meaningful when refundRequired === true.)
     */
    expectedCustomerRefundCreditAmount: number;

    /**
     * Invariant 3: shipping must not be paid twice.
     * If shipping fundingPath is WITHHELD_FROM_STRIPE_REFUND, then no wallet SHIP_FEE should be created.
     */
    expectedWalletShippingDebitAmount: number;
}

export function makeReturnsFeeBatchKey(
    caseId: string,
    docType: FeeSettlementInvoiceDocType,
): string {
    return `RETURNS_FEE:${caseId}:${docType}`;
}

export interface FeeSettlementPlan {
    caseId: string;
    /** Logical grouping key (not a DB UUID). Fee invoices use shippingBatchKey instead. */
    invoiceGroupId: string;
    finalRefundDecision: FinalRefundDecision;
    refundRequired: boolean;
    refundExecutionStatus: RefundExecutionStatus;
    feeBearer: FeeBearer;
    shippingBearer: ShippingBearer;
    lineItems: FeeSettlementLineItem[];
    invariants: FeeSettlementInvariants;
    debug: {
        faultPartyHint?: AdjudicationFaultParty;
    };
}

export function makeReturnsFeeInvoiceGroupId(caseId: string): string {
    return `RETURNS_FEE_DOCS_GROUP:${caseId}`;
}

export function makeReturnsLineItemIdempotencyKey(
    caseId: string,
    kind: FeeSettlementLineItemKind,
    refundExecutionStatus: RefundExecutionStatus,
): string {
    return `RETURNS_FEE_LINE:${caseId}:${kind}:${refundExecutionStatus}`;
}

function feeBearerToInvoicePayer(feeBearer: FeeBearer): FeeSettlementPayer {
    if (feeBearer === 'MERCHANT') return 'MERCHANT';
    if (feeBearer === 'CUSTOMER') return 'CUSTOMER';
    if (feeBearer === 'MIXED_CLOSE') return 'CUSTOMER'; // fees are effectively deducted from the customer refund
    if (feeBearer === 'PLATFORM') return 'PLATFORM';
    return 'NONE';
}

function shippingBearerToInvoicePayer(shippingBearer: ShippingBearer): FeeSettlementPayer {
    if (shippingBearer === 'MERCHANT') return 'MERCHANT';
    if (shippingBearer === 'CUSTOMER') return 'CUSTOMER';
    if (shippingBearer === 'SHIPPING_COMPANY') return 'SHIPPING_COMPANY';
    return 'NONE';
}

function fundingPathForCommission(params: {
    refundRequired: boolean;
    feeBearer: FeeBearer;
}): FeeSettlementFundingPath {
    const { refundRequired, feeBearer } = params;
    if (!refundRequired) {
        // no Stripe refund => payer settles fees via wallet
        return feeBearer === 'PLATFORM' ? 'PLATFORM_RETENTION_ONLY' : 'WALLET_DEBIT';
    }

    if (feeBearer === 'MERCHANT') return 'WALLET_DEBIT';
    if (feeBearer === 'CUSTOMER' || feeBearer === 'MIXED_CLOSE') return 'WITHHELD_FROM_STRIPE_REFUND';
    if (feeBearer === 'PLATFORM') return 'PLATFORM_RETENTION_ONLY';

    return 'WALLET_DEBIT';
}

function fundingPathForShipping(params: {
    refundRequired: boolean;
    shippingBearer: ShippingBearer;
}): FeeSettlementFundingPath {
    const { refundRequired, shippingBearer } = params;

    if (!refundRequired) {
        return shippingBearer === 'SHIPPING_COMPANY'
            ? 'PLATFORM_RETENTION_ONLY'
            : shippingBearer === 'NONE'
              ? 'PLATFORM_RETENTION_ONLY'
              : 'WALLET_DEBIT';
    }

    if (shippingBearer === 'MERCHANT') return 'WALLET_DEBIT';
    if (shippingBearer === 'CUSTOMER') return 'WITHHELD_FROM_STRIPE_REFUND';
    if (shippingBearer === 'SHIPPING_COMPANY') return 'PLATFORM_RETENTION_ONLY';
    return 'PLATFORM_RETENTION_ONLY';
}

export function buildFeeSettlementPlan(params: {
    caseId: string;
    refundExecutionStatus: RefundExecutionStatus;
    shippingRoundtrip: number;
    fin: AdjudicationFinancialResult;
    faultPartyHint?: AdjudicationFaultParty;
}): FeeSettlementPlan {
    const { caseId, fin, shippingRoundtrip, faultPartyHint } = params;
    const refundExecutionStatus = params.refundExecutionStatus ?? fin.refundExecutionStatusSeed;

    const commissionFundingPath = fundingPathForCommission({
        refundRequired: fin.refundRequired,
        feeBearer: fin.feeBearer,
    });

    const shippingFundingPath = fundingPathForShipping({
        refundRequired: fin.refundRequired,
        shippingBearer: fin.shippingBearer,
    });

    const invoiceGroupId = makeReturnsFeeInvoiceGroupId(caseId);

    const lineItems: FeeSettlementLineItem[] = [];
    const commissionPayer = feeBearerToInvoicePayer(fin.feeBearer);
    const shippingPayer = shippingBearerToInvoicePayer(fin.shippingBearer);

    if (fin.gatewayFeeAmount > 0) {
        lineItems.push({
            kind: 'GATEWAY_FEE',
            amount: fin.gatewayFeeAmount,
            payer: commissionPayer,
            fundingPath: commissionFundingPath,
            invoiceDocType: 'COMMISSION',
            idempotencyKey: makeReturnsLineItemIdempotencyKey(caseId, 'GATEWAY_FEE', refundExecutionStatus),
        });
    }

    if (fin.refundFeeAmount > 0) {
        lineItems.push({
            kind: 'REFUND_FEE',
            amount: fin.refundFeeAmount,
            payer: commissionPayer,
            fundingPath: commissionFundingPath,
            invoiceDocType: 'COMMISSION',
            idempotencyKey: makeReturnsLineItemIdempotencyKey(caseId, 'REFUND_FEE', refundExecutionStatus),
        });
    }

    if (shippingRoundtrip > 0 && fin.shippingBearer !== 'NONE') {
        lineItems.push({
            kind: 'ROUNDTRIP_SHIPPING',
            amount: shippingRoundtrip,
            payer: shippingPayer,
            fundingPath: shippingFundingPath,
            invoiceDocType: 'SHIPPING',
            idempotencyKey: makeReturnsLineItemIdempotencyKey(
                caseId,
                'ROUNDTRIP_SHIPPING',
                refundExecutionStatus,
            ),
        });
    }

    if (fin.platformRetainedAmount > 0) {
        lineItems.push({
            kind: 'PLATFORM_RETAINED_AMOUNT',
            amount: fin.platformRetainedAmount,
            payer: 'PLATFORM',
            fundingPath: 'PLATFORM_RETENTION_ONLY',
            idempotencyKey: makeReturnsLineItemIdempotencyKey(
                caseId,
                'PLATFORM_RETAINED_AMOUNT',
                refundExecutionStatus,
            ),
        });
    }

    if (fin.merchantWalletDebits.platformFees > 0) {
        lineItems.push({
            kind: 'MERCHANT_WALLET_PLATFORM_FEE_DEBIT',
            amount: fin.merchantWalletDebits.platformFees,
            payer: 'MERCHANT',
            fundingPath: 'WALLET_DEBIT',
            idempotencyKey: makeReturnsLineItemIdempotencyKey(
                caseId,
                'MERCHANT_WALLET_PLATFORM_FEE_DEBIT',
                refundExecutionStatus,
            ),
        });
    }

    if (fin.merchantWalletDebits.shipping > 0) {
        lineItems.push({
            kind: 'MERCHANT_WALLET_SHIPPING_DEBIT',
            amount: fin.merchantWalletDebits.shipping,
            payer: 'MERCHANT',
            fundingPath: 'WALLET_DEBIT',
            idempotencyKey: makeReturnsLineItemIdempotencyKey(
                caseId,
                'MERCHANT_WALLET_SHIPPING_DEBIT',
                refundExecutionStatus,
            ),
        });
    }

    if (fin.shippingCompanyLiability > 0) {
        lineItems.push({
            kind: 'SHIPPING_COMPANY_LIABILITY',
            amount: fin.shippingCompanyLiability,
            payer: 'SHIPPING_COMPANY',
            fundingPath: 'PLATFORM_RETENTION_ONLY',
            idempotencyKey: makeReturnsLineItemIdempotencyKey(
                caseId,
                'SHIPPING_COMPANY_LIABILITY',
                refundExecutionStatus,
            ),
        });
    }

    const expectedWalletShippingDebitAmount =
        shippingFundingPath === 'WALLET_DEBIT' ? shippingRoundtrip : 0;

    return {
        caseId,
        invoiceGroupId,
        finalRefundDecision: fin.finalRefundDecision,
        refundRequired: fin.refundRequired,
        refundExecutionStatus,
        feeBearer: fin.feeBearer,
        shippingBearer: fin.shippingBearer,
        lineItems,
        invariants: {
            expectedPlatformRetentionCreditAmount: fin.platformRetainedAmount,
            expectedCustomerRefundCreditAmount: fin.refundRequired ? fin.finalCustomerRefundAmount : 0,
            expectedWalletShippingDebitAmount,
        },
        debug: {
            faultPartyHint,
        },
    };
}

