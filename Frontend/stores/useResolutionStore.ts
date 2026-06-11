
import { create } from 'zustand';
import { useAuditStore } from './useAuditStore';
import { returnsApi } from '../services/api/returns';
import { supabase } from '../services/supabase';

export type CaseType = 'return' | 'dispute';
export type CaseStatus = 'OPEN' | 'AWAITING_MERCHANT' | 'AWAITING_ADMIN' | 'APPROVED' | 'RESOLVED' | 'CLOSED' | 'REFUNDED' | 'ESCALATED' | 'UNDER_REVIEW' | 'PENDING' | 'MERCHANT_REJECTED' | 'RETURN_STARTED';

// New Detailed Return Lifecycle Phases (The 7 Steps)
export type ReturnPhase =
    | 'REQUESTED'
    | 'NEGOTIATION'
    | 'APPROVED_BY_STORE'
    | 'WAYBILL_ISSUED'
    | 'CUSTOMER_HANDOVER'
    | 'STORE_RECEIVED'
    | 'REFUND_PROCESSED';

export interface CaseMessage {
    id: string;
    caseId: string;
    caseType: CaseType;
    senderId: string;
    senderRole: 'CUSTOMER' | 'MERCHANT' | 'ADMIN';
    text: string;
    attachments: string[];
    createdAt: string;
    sender?: {
        name: string;
        avatar: string;
    };
}

export interface ResolutionCase {
    id: string;
    orderId: string;
    type: CaseType;
    status: CaseStatus;
    returnPhase?: ReturnPhase;
    reason: string;
    description: string;
    customerId: string;
    customerName: string;
    customerEvidence?: string[]; // URLs
    createdAt: string;
    deadline: string; // ISO String (For 72h Merchant Response)
    merchantName: string;
    merchantStoreId?: string; // Phase 4
    partName: string;
    updatedAt: string;
    handoverDeadline?: string; // Phase 4

    // Phase 4 Governance
    usageCondition?: string;
    faultParty?: string;
    feeBearer?: string;
    shippingCompanyLiability?: number;
    refundAmount?: number;
    shippingRefund?: number;
    verdictNotes?: string;
    verdictIssuedAt?: string;
    verdictLocked?: boolean;
    invoiceId?: string; // Phase 4 Traceability
    shipmentId?: string; // Phase 4 Traceability
    stripeFee?: number; // Phase 4 Governance

    // 2026 Financial Fee Enforcement (Phase 5)
    gatewayFeePct?: number;
    refundFeePct?: number;
    gatewayFeeAmount?: number;
    refundFeeAmount?: number;
    shippingRoundtrip?: number;
    penaltyAmount?: number;
    penaltyType?: string;
    netRefundAmount?: number;
    /** Actual Stripe/captured payment total (AED) — use for adjudication math */
    paidTotal?: number | null;
    maxRefundable?: number | null;
    escrowStatus?: string | null;
    
    // Phase 4 Shipping Payment (New 2026 Logistics)
    shippingPayee?: 'MERCHANT' | 'CUSTOMER' | 'SHIPPING_COMPANY';
    shippingPaymentStatus?: 'PENDING' | 'PAID' | 'FAILED' | 'INSUFFICIENT_FUNDS' | 'PENDING_SETTLEMENT';
    shippingPaymentMethod?: 'STRIPE' | 'WALLET';
    shippingStripeId?: string;

    customerRisk?: {
        totalReturns: number;
        totalDisputes: number;
        riskScore: number;
        riskLevel: 'NORMAL' | 'HIGH' | 'CRITICAL';
    };

    // Merchant Response Data
    merchantResponse?: {
        text: string;
        acceptedReturn: boolean;
        evidence: string[];
        submittedAt: string;
    };

    // Tracking
    orderNumber: string;
    storeCode?: string;
    chatId?: string;
    auditLogs?: any[]; // For Case Traceability
    customerAvatar?: string;
    merchantLogo?: string;
    
    // Admin Verdict Signatures (Phase 4)
    adminApproval?: 'APPROVED' | 'REJECTED';
    adminApprovalReason?: string;
    adminEvidence?: string[];
    adminName?: string;
    adminEmail?: string;
    adminSignature?: string;
}

interface ResolutionState {
    cases: ResolutionCase[];
    caseMessages: CaseMessage[];
    merchantRisk: any | null;
    isLoading: boolean;
    error: string | null;

    fetchMerchantCases: (silent?: boolean) => Promise<void>;
    fetchAdminCases: (silent?: boolean) => Promise<void>;
    fetchUserRequests: (silent?: boolean) => Promise<void>;
    fetchCases: (role: 'merchant' | 'admin' | 'customer', silent?: boolean) => Promise<void>;
    
    respondToCase: (caseId: string, type: 'return' | 'dispute', response: { text: string, acceptedReturn: boolean, evidence: string[] | File[] }) => Promise<void>;
    adminVerdict: (caseId: string, type: 'return' | 'dispute', verdict: 'REFUND' | 'RELEASE_FUNDS' | 'DENY', notes: string, extra?: any) => Promise<any>;
    updateAdminVerdict: (caseId: string, type: 'return' | 'dispute', verdict: 'REFUND' | 'RELEASE_FUNDS' | 'DENY', notes: string, extra?: any) => Promise<any>;
    
    // Phase 4 Actions
    fetchCaseMessages: (caseId: string) => Promise<void>;
    sendCaseMessage: (caseId: string, type: CaseType, text: string, attachments?: string[]) => Promise<void>;
    fetchMerchantRisk: (storeId: string) => Promise<void>;
    fetchCustomerRisk: (customerId: string) => Promise<void>;

    updateCaseStatus: (caseId: string, status: CaseStatus) => void;
    updateReturnPhase: (caseId: string, phase: ReturnPhase) => void;
    checkEscalations: () => void;

    subscribeToCases: (role: 'merchant' | 'admin' | 'customer') => void;
    unsubscribeFromCases: () => void;

    getCaseById: (id: string) => ResolutionCase | undefined;
    escalateCase: (id: string) => Promise<void>;
}

export const useResolutionStore = create<ResolutionState>((set, get) => ({
    cases: [],
    caseMessages: [],
    merchantRisk: null,
    isLoading: false,
    error: null,

    fetchMerchantCases: async (silent = false) => {
        if (!silent) set({ isLoading: true, error: null });
        try {
            const response = await returnsApi.getMerchantCases();
            const { returns, disputes } = response.data;

            const mappedReturns: ResolutionCase[] = returns.map(r => ({
                id: r.id,
                orderId: String(r.orderId),
                type: 'return',
                status: r.status === 'PENDING' ? 'AWAITING_MERCHANT' : r.status,
                reason: r.reason,
                description: r.description || '',
                customerId: r.customerId,
                customerName: r.customer?.name || 'Customer',
                customerEvidence: Array.isArray(r.evidenceFiles) ? r.evidenceFiles : [],
                createdAt: r.createdAt,
                deadline: new Date(new Date(r.createdAt).getTime() + (48 * 60 * 60 * 1000)).toISOString(),
                merchantName: 'Your Store',
                merchantLogo: (r as any).merchantStore?.logo || r.order?.acceptedOffer?.store?.logo || r.order?.store?.logo,
                merchantStoreId: (r as any).merchantStore?.id || r.order?.acceptedOffer?.storeId,
                partName: (r.order as any)?.parts?.[0]?.name || 'Parts',
                updatedAt: r.updatedAt,
                usageCondition: r.usageCondition,
                handoverDeadline: r.handoverDeadline,
                invoiceId: r.invoiceId,
                shipmentId: r.shipmentId,
                orderNumber: (r.order as any)?.orderNumber || String(r.orderId),
                storeCode: (r.order as any)?.acceptedOffer?.store?.storeCode || (r as any).merchantStore?.storeCode,
                auditLogs: (r.order as any)?.auditLogs,
                customerAvatar: r.customer?.avatar,
                merchantResponse: r.merchantResponseText ? {
                    text: r.merchantResponseText,
                    acceptedReturn: String((r as any).merchantDecision || '')
                        .toUpperCase()
                        .startsWith('APPROV'),
                    evidence: Array.isArray(r.merchantEvidence) ? r.merchantEvidence : [],
                    submittedAt: r.updatedAt
                } : undefined,
                // Governance data (Spec §15)
                faultParty: (r as any).faultParty,
                feeBearer: (r as any).feeBearer,
                shippingCompanyLiability: (r as any).shippingCompanyLiability
                    ? Number((r as any).shippingCompanyLiability)
                    : undefined,
                refundAmount: (r as any).refundAmount,
                shippingRefund: (r as any).shippingRefund,
                verdictNotes: (r as any).verdictNotes,
                verdictIssuedAt: (r as any).verdictIssuedAt,
                adminApproval: (r as any).adminApproval,
                adminApprovalReason: (r as any).adminApprovalReason,
                adminEvidence: Array.isArray((r as any).adminEvidence) ? (r as any).adminEvidence : [],
                adminName: (r as any).adminName,
                adminEmail: (r as any).adminEmail,
                adminSignature: (r as any).adminSignature,
                // 2026 Financial Fee Fields
                gatewayFeePct: (r as any).gatewayFeePct ? Number((r as any).gatewayFeePct) : undefined,
                refundFeePct: (r as any).refundFeePct ? Number((r as any).refundFeePct) : undefined,
                gatewayFeeAmount: (r as any).gatewayFeeAmount ? Number((r as any).gatewayFeeAmount) : undefined,
                refundFeeAmount: (r as any).refundFeeAmount ? Number((r as any).refundFeeAmount) : undefined,
                shippingRoundtrip: (r as any).shippingRoundtrip ? Number((r as any).shippingRoundtrip) : undefined,
                penaltyAmount: (r as any).penaltyAmount ? Number((r as any).penaltyAmount) : undefined,
                penaltyType: (r as any).penaltyType,
                netRefundAmount: (r as any).netRefundAmount ? Number((r as any).netRefundAmount) : undefined,
                // Shipping Payment Flow (Phase 4)
                shippingPayee: (r as any).shippingPayee,
                shippingPaymentStatus: (r as any).shippingPaymentStatus,
                shippingPaymentMethod: (r as any).shippingPaymentMethod,
                shippingStripeId: (r as any).shippingStripeId
            }));

            const mappedDisputes: ResolutionCase[] = disputes.map(d => ({
                id: d.id,
                orderId: String(d.orderId),
                type: 'dispute',
                status: d.status === 'OPEN' ? 'AWAITING_MERCHANT' : d.status,
                reason: d.reason,
                description: d.description || '',
                customerId: d.customerId,
                customerName: d.customer?.name || 'Customer',
                customerEvidence: Array.isArray(d.evidenceFiles) ? d.evidenceFiles : [],
                createdAt: d.createdAt,
                deadline: new Date(new Date(d.createdAt).getTime() + (48 * 60 * 60 * 1000)).toISOString(),
                merchantName: 'Your Store',
                merchantLogo: (d as any).merchantStore?.logo || d.order?.acceptedOffer?.store?.logo || d.order?.store?.logo,
                merchantStoreId: (d as any).merchantStore?.id || d.order?.acceptedOffer?.storeId,
                partName: (d.order as any)?.parts?.[0]?.name || 'Parts',
                updatedAt: d.updatedAt,
                usageCondition: (d as any).usageCondition,
                handoverDeadline: d.handoverDeadline,
                invoiceId: (d as any).invoiceId,
                shipmentId: (d as any).shipmentId,
                orderNumber: (d.order as any)?.orderNumber || String(d.orderId),
                storeCode: (d.order as any)?.acceptedOffer?.store?.storeCode || (d as any).merchantStore?.storeCode,
                auditLogs: (d.order as any)?.auditLogs,
                customerAvatar: d.customer?.avatar,
                merchantResponse: (d as any).merchantResponseText ? {
                    text: (d as any).merchantResponseText,
                    acceptedReturn: String((d as any).merchantDecision || '')
                        .toUpperCase()
                        .startsWith('APPROV'),
                    evidence: Array.isArray((d as any).merchantEvidence) ? (d as any).merchantEvidence : [],
                    submittedAt: d.updatedAt
                } : undefined,
                // Governance data (Spec §15)
                faultParty: (d as any).faultParty,
                feeBearer: (d as any).feeBearer,
                shippingCompanyLiability: (d as any).shippingCompanyLiability
                    ? Number((d as any).shippingCompanyLiability)
                    : undefined,
                refundAmount: (d as any).refundAmount,
                shippingRefund: (d as any).shippingRefund,
                verdictNotes: (d as any).verdictNotes,
                verdictIssuedAt: (d as any).verdictIssuedAt,
                adminApproval: (d as any).adminApproval,
                adminApprovalReason: (d as any).adminApprovalReason,
                adminEvidence: Array.isArray((d as any).adminEvidence) ? (d as any).adminEvidence : [],
                adminName: (d as any).adminName,
                adminEmail: (d as any).adminEmail,
                adminSignature: (d as any).adminSignature,
                // 2026 Financial Fee Fields
                gatewayFeePct: (d as any).gatewayFeePct ? Number((d as any).gatewayFeePct) : undefined,
                refundFeePct: (d as any).refundFeePct ? Number((d as any).refundFeePct) : undefined,
                gatewayFeeAmount: (d as any).gatewayFeeAmount ? Number((d as any).gatewayFeeAmount) : undefined,
                refundFeeAmount: (d as any).refundFeeAmount ? Number((d as any).refundFeeAmount) : undefined,
                shippingRoundtrip: (d as any).shippingRoundtrip ? Number((d as any).shippingRoundtrip) : undefined,
                penaltyAmount: (d as any).penaltyAmount ? Number((d as any).penaltyAmount) : undefined,
                penaltyType: (d as any).penaltyType,
                netRefundAmount: (d as any).netRefundAmount ? Number((d as any).netRefundAmount) : undefined,
                // Shipping Payment Flow (Phase 4)
                shippingPayee: (d as any).shippingPayee,
                shippingPaymentStatus: (d as any).shippingPaymentStatus,
                shippingPaymentMethod: (d as any).shippingPaymentMethod,
                shippingStripeId: (d as any).shippingStripeId
            }));

            set({ cases: [...mappedReturns, ...mappedDisputes], isLoading: false });
        } catch (error: any) {
            set({ error: error.message, isLoading: false });
        }
    },

    fetchAdminCases: async (silent = false) => {
        if (!silent) set({ isLoading: true, error: null });
        try {
            const response = await returnsApi.getAdminCases();
            const { returns, disputes } = response.data;

            const mapPaymentFields = (item: any) => ({
                paidTotal: item.paidTotal != null ? Number(item.paidTotal) : null,
                maxRefundable: item.maxRefundable != null ? Number(item.maxRefundable) : null,
                escrowStatus: item.escrowStatus ?? null,
            });

            const mappedReturns: ResolutionCase[] = returns.map(r => ({
                id: r.id,
                orderId: String(r.orderId),
                type: 'return',
                status: r.status === 'PENDING' ? 'AWAITING_MERCHANT' : r.status,
                reason: r.reason,
                description: r.description || '',
                customerId: r.customerId,
                customerName: r.customer?.name || 'Customer',
                customerEvidence: Array.isArray(r.evidenceFiles) ? r.evidenceFiles : [],
                createdAt: r.createdAt,
                deadline: new Date(new Date(r.createdAt).getTime() + (48 * 60 * 60 * 1000)).toISOString(),
                merchantName: (r as any).merchantStore?.name || r.order?.acceptedOffer?.store?.name || r.order?.store?.name || 'Store',
                merchantLogo: (r as any).merchantStore?.logo || r.order?.acceptedOffer?.store?.logo || r.order?.store?.logo,
                merchantStoreId: (r as any).merchantStore?.id || r.order?.acceptedOffer?.storeId,
                partName: r.order?.parts?.[0]?.name || 'Parts',
                updatedAt: r.updatedAt,
                usageCondition: r.usageCondition,
                handoverDeadline: r.handoverDeadline,
                invoiceId: r.invoiceId,
                shipmentId: r.shipmentId,
                orderNumber: r.order?.orderNumber || String(r.orderId),
                storeCode: r.order?.acceptedOffer?.store?.storeCode || (r as any).merchantStore?.storeCode,
                auditLogs: r.order?.auditLogs,
                customerAvatar: r.customer?.avatar,
                merchantResponse: r.merchantResponseText ? {
                    text: r.merchantResponseText,
                    acceptedReturn: String((r as any).merchantDecision || '')
                        .toUpperCase()
                        .startsWith('APPROV'),
                    evidence: Array.isArray(r.merchantEvidence) ? r.merchantEvidence : [],
                    submittedAt: r.updatedAt
                } : undefined,
                // Governance data
                faultParty: (r as any).faultParty,
                feeBearer: (r as any).feeBearer,
                shippingCompanyLiability: (r as any).shippingCompanyLiability
                    ? Number((r as any).shippingCompanyLiability)
                    : undefined,
                refundAmount: (r as any).refundAmount,
                shippingRefund: (r as any).shippingRefund,
                verdictNotes: (r as any).verdictNotes,
                verdictIssuedAt: (r as any).verdictIssuedAt,
                adminApproval: (r as any).adminApproval,
                adminApprovalReason: (r as any).adminApprovalReason,
                adminEvidence: Array.isArray((r as any).adminEvidence) ? (r as any).adminEvidence : [],
                adminName: (r as any).adminName,
                adminEmail: (r as any).adminEmail,
                adminSignature: (r as any).adminSignature,
                // 2026 Financial Fee Fields
                gatewayFeePct: (r as any).gatewayFeePct ? Number((r as any).gatewayFeePct) : undefined,
                refundFeePct: (r as any).refundFeePct ? Number((r as any).refundFeePct) : undefined,
                gatewayFeeAmount: (r as any).gatewayFeeAmount ? Number((r as any).gatewayFeeAmount) : undefined,
                refundFeeAmount: (r as any).refundFeeAmount ? Number((r as any).refundFeeAmount) : undefined,
                shippingRoundtrip: (r as any).shippingRoundtrip ? Number((r as any).shippingRoundtrip) : undefined,
                penaltyAmount: (r as any).penaltyAmount ? Number((r as any).penaltyAmount) : undefined,
                penaltyType: (r as any).penaltyType,
                netRefundAmount: (r as any).netRefundAmount ? Number((r as any).netRefundAmount) : undefined,
                // Shipping Payment Flow (Phase 4)
                shippingPayee: (r as any).shippingPayee,
                shippingPaymentStatus: (r as any).shippingPaymentStatus,
                shippingPaymentMethod: (r as any).shippingPaymentMethod,
                shippingStripeId: (r as any).shippingStripeId,
                ...mapPaymentFields(r),
            }));

            const mappedDisputes: ResolutionCase[] = disputes.map(d => ({
                id: d.id,
                orderId: String(d.orderId),
                type: 'dispute',
                status: d.status === 'OPEN' ? 'AWAITING_MERCHANT' : d.status,
                reason: d.reason,
                description: d.description || '',
                customerId: d.customerId,
                customerName: d.customer?.name || 'Customer',
                customerEvidence: Array.isArray(d.evidenceFiles) ? d.evidenceFiles : [],
                createdAt: d.createdAt,
                deadline: new Date(new Date(d.createdAt).getTime() + (48 * 60 * 60 * 1000)).toISOString(),
                merchantName: (d as any).merchantStore?.name || d.order?.acceptedOffer?.store?.name || d.order?.store?.name || 'Store',
                merchantLogo: (d as any).merchantStore?.logo || d.order?.acceptedOffer?.store?.logo || d.order?.store?.logo,
                merchantStoreId: (d as any).merchantStore?.id || d.order?.acceptedOffer?.storeId,
                partName: d.order?.parts?.[0]?.name || 'Parts',
                updatedAt: d.updatedAt,
                usageCondition: d.usageCondition,
                handoverDeadline: d.handoverDeadline,
                // Governance data
                faultParty: d.faultParty,
                refundAmount: d.refundAmount,
                shippingRefund: d.shippingRefund,
                verdictNotes: d.verdictNotes,
                verdictIssuedAt: d.verdictIssuedAt,
                verdictLocked: d.verdictLocked,
                invoiceId: d.invoiceId,
                shipmentId: d.shipmentId,
                stripeFee: d.stripeFee ? Number(d.stripeFee) : undefined,
                orderNumber: d.order?.orderNumber || String(d.orderId),
                storeCode: d.order?.acceptedOffer?.store?.storeCode || (d as any).merchantStore?.storeCode,
                auditLogs: d.order?.auditLogs,
                customerAvatar: d.customer?.avatar,
                adminApproval: (d as any).adminApproval,
                adminApprovalReason: (d as any).adminApprovalReason,
                adminEvidence: Array.isArray((d as any).adminEvidence) ? (d as any).adminEvidence : [],
                adminName: (d as any).adminName,
                adminEmail: (d as any).adminEmail,
                adminSignature: (d as any).adminSignature,
                // 2026 Financial Fee Fields
                gatewayFeePct: d.gatewayFeePct ? Number(d.gatewayFeePct) : undefined,
                refundFeePct: d.refundFeePct ? Number(d.refundFeePct) : undefined,
                gatewayFeeAmount: d.gatewayFeeAmount ? Number(d.gatewayFeeAmount) : undefined,
                refundFeeAmount: d.refundFeeAmount ? Number(d.refundFeeAmount) : undefined,
                shippingRoundtrip: d.shippingRoundtrip ? Number(d.shippingRoundtrip) : undefined,
                penaltyAmount: d.penaltyAmount ? Number(d.penaltyAmount) : undefined,
                penaltyType: (d as any).penaltyType,
                netRefundAmount: d.netRefundAmount ? Number(d.netRefundAmount) : undefined,
                // Shipping Payment Flow (Phase 4)
                shippingPayee: (d as any).shippingPayee,
                shippingPaymentStatus: (d as any).shippingPaymentStatus,
                shippingPaymentMethod: (d as any).shippingPaymentMethod,
                shippingStripeId: (d as any).shippingStripeId,
                ...mapPaymentFields(d),
                merchantResponse: d.merchantResponseText ? {
                    text: d.merchantResponseText,
                    acceptedReturn: String((d as any).merchantDecision || '')
                        .toUpperCase()
                        .startsWith('APPROV'),
                    evidence: Array.isArray(d.merchantEvidence) ? d.merchantEvidence : [],
                    submittedAt: d.updatedAt
                } : undefined
            }));

            set({ cases: [...mappedReturns, ...mappedDisputes], isLoading: false });
        } catch (error: any) {
            set({ error: error.message, isLoading: false });
        }
    },

    fetchUserRequests: async (silent = false) => {
        if (!silent) set({ isLoading: true, error: null });
        try {
            const response = await returnsApi.getUserReturns();
            const { returns, disputes } = response.data;

            const mappedReturns: ResolutionCase[] = returns.map(r => ({
                id: r.id,
                orderId: parseInt(r.orderId) || 0,
                type: 'return',
                status: r.status === 'PENDING' ? 'AWAITING_MERCHANT' : r.status,
                reason: r.reason,
                description: r.description || '',
                customerId: r.customerId,
                customerName: 'You',
                customerEvidence: Array.isArray(r.evidenceFiles) ? r.evidenceFiles : [],
                createdAt: r.createdAt,
                deadline: new Date(new Date(r.createdAt).getTime() + (48 * 60 * 60 * 1000)).toISOString(),
                merchantName: (r as any).store?.name || r.order?.acceptedOffer?.store?.name || r.order?.store?.name || 'Store',
                merchantLogo: (r as any).store?.logo || r.order?.acceptedOffer?.store?.logo || r.order?.store?.logo,
                merchantStoreId: r.order?.acceptedOffer?.storeId || r.fallbackStore?.id,
                partName: r.order?.parts?.[0]?.name || 'Parts',
                updatedAt: r.updatedAt,
                usageCondition: (r as any).usageCondition,
                handoverDeadline: r.handoverDeadline,
                invoiceId: (r as any).invoiceId,
                shipmentId: (r as any).shipmentId,
                orderNumber: r.order?.orderNumber || String(r.orderId),
                storeCode: r.order?.acceptedOffer?.store?.storeCode || r.fallbackStore?.storeCode,
                chatId: (r as any).chatId,
                auditLogs: r.order?.auditLogs,
                // Governance data (Spec §15)
                faultParty: (r as any).faultParty,
                feeBearer: (r as any).feeBearer,
                shippingCompanyLiability: (r as any).shippingCompanyLiability
                    ? Number((r as any).shippingCompanyLiability)
                    : undefined,
                refundAmount: (r as any).refundAmount,
                shippingRefund: (r as any).shippingRefund,
                verdictNotes: (r as any).verdictNotes,
                verdictIssuedAt: (r as any).verdictIssuedAt,
                adminApproval: (r as any).adminApproval,
                adminApprovalReason: (r as any).adminApprovalReason,
                adminEvidence: Array.isArray((r as any).adminEvidence) ? (r as any).adminEvidence : [],
                adminName: (r as any).adminName,
                adminEmail: (r as any).adminEmail,
                adminSignature: (r as any).adminSignature,
                // 2026 Financial Fee Fields
                gatewayFeePct: (r as any).gatewayFeePct ? Number((r as any).gatewayFeePct) : undefined,
                refundFeePct: (r as any).refundFeePct ? Number((r as any).refundFeePct) : undefined,
                gatewayFeeAmount: (r as any).gatewayFeeAmount ? Number((r as any).gatewayFeeAmount) : undefined,
                refundFeeAmount: (r as any).refundFeeAmount ? Number((r as any).refundFeeAmount) : undefined,
                shippingRoundtrip: (r as any).shippingRoundtrip ? Number((r as any).shippingRoundtrip) : undefined,
                penaltyAmount: (r as any).penaltyAmount ? Number((r as any).penaltyAmount) : undefined,
                penaltyType: (r as any).penaltyType,
                netRefundAmount: (r as any).netRefundAmount ? Number((r as any).netRefundAmount) : undefined,
                // Shipping Payment Flow (Phase 4)
                shippingPayee: (r as any).shippingPayee,
                shippingPaymentStatus: (r as any).shippingPaymentStatus,
                shippingPaymentMethod: (r as any).shippingPaymentMethod,
                shippingStripeId: (r as any).shippingStripeId,
                merchantResponse: r.merchantResponseText ? {
                    text: r.merchantResponseText,
                    acceptedReturn: String((r as any).merchantDecision || '')
                        .toUpperCase()
                        .startsWith('APPROV'),
                    evidence: Array.isArray(r.merchantEvidence) ? r.merchantEvidence : [],
                    submittedAt: r.updatedAt
                } : undefined
            }));

            const mappedDisputes: ResolutionCase[] = disputes.map(d => ({
                id: d.id,
                orderId: parseInt(d.orderId) || 0,
                type: 'dispute',
                status: d.status === 'OPEN' ? 'AWAITING_MERCHANT' : d.status,
                reason: d.reason,
                description: d.description || '',
                customerId: d.customerId,
                customerName: 'You',
                customerEvidence: Array.isArray(d.evidenceFiles) ? d.evidenceFiles : [],
                createdAt: d.createdAt,
                deadline: new Date(new Date(d.createdAt).getTime() + (48 * 60 * 60 * 1000)).toISOString(),
                merchantName: (d as any).store?.name || d.order?.acceptedOffer?.store?.name || d.order?.store?.name || 'Store',
                merchantLogo: (d as any).store?.logo || d.order?.acceptedOffer?.store?.logo || d.order?.store?.logo,
                merchantStoreId: d.order?.acceptedOffer?.storeId || d.fallbackStore?.id,
                partName: d.order?.parts?.[0]?.name || 'Parts',
                updatedAt: d.updatedAt,
                usageCondition: (d as any).usageCondition,
                handoverDeadline: d.handoverDeadline,
                invoiceId: (d as any).invoiceId,
                shipmentId: (d as any).shipmentId,
                orderNumber: d.order?.orderNumber || String(d.orderId),
                storeCode: d.order?.acceptedOffer?.store?.storeCode || d.fallbackStore?.storeCode,
                chatId: (d as any).chatId,
                auditLogs: d.order?.auditLogs,
                // Governance data (Spec §15)
                faultParty: (d as any).faultParty,
                feeBearer: (d as any).feeBearer,
                shippingCompanyLiability: (d as any).shippingCompanyLiability
                    ? Number((d as any).shippingCompanyLiability)
                    : undefined,
                refundAmount: (d as any).refundAmount,
                shippingRefund: (d as any).shippingRefund,
                verdictNotes: (d as any).verdictNotes,
                verdictIssuedAt: (d as any).verdictIssuedAt,
                adminApproval: (d as any).adminApproval,
                adminApprovalReason: (d as any).adminApprovalReason,
                adminEvidence: Array.isArray((d as any).adminEvidence) ? (d as any).adminEvidence : [],
                adminName: (d as any).adminName,
                adminEmail: (d as any).adminEmail,
                adminSignature: (d as any).adminSignature,
                // 2026 Financial Fee Fields
                gatewayFeePct: (d as any).gatewayFeePct ? Number((d as any).gatewayFeePct) : undefined,
                refundFeePct: (d as any).refundFeePct ? Number((d as any).refundFeePct) : undefined,
                gatewayFeeAmount: (d as any).gatewayFeeAmount ? Number((d as any).gatewayFeeAmount) : undefined,
                refundFeeAmount: (d as any).refundFeeAmount ? Number((d as any).refundFeeAmount) : undefined,
                shippingRoundtrip: (d as any).shippingRoundtrip ? Number((d as any).shippingRoundtrip) : undefined,
                penaltyAmount: (d as any).penaltyAmount ? Number((d as any).penaltyAmount) : undefined,
                penaltyType: (d as any).penaltyType,
                netRefundAmount: (d as any).netRefundAmount ? Number((d as any).netRefundAmount) : undefined,
                // Shipping Payment Flow (Phase 4)
                shippingPayee: (d as any).shippingPayee,
                shippingPaymentStatus: (d as any).shippingPaymentStatus,
                shippingPaymentMethod: (d as any).shippingPaymentMethod,
                shippingStripeId: (d as any).shippingStripeId,
                merchantResponse: d.merchantResponseText ? {
                    text: d.merchantResponseText,
                    acceptedReturn: String((d as any).merchantDecision || '')
                        .toUpperCase()
                        .startsWith('APPROV'),
                    evidence: Array.isArray(d.merchantEvidence) ? d.merchantEvidence : [],
                    submittedAt: d.updatedAt
                } : undefined
            }));

            set({ cases: [...mappedReturns, ...mappedDisputes], isLoading: false });
        } catch (error: any) {
            set({ error: error.message, isLoading: false });
        }
    },

    fetchCases: async (role, silent = false) => {
        if (role === 'admin') return get().fetchAdminCases(silent);
        if (role === 'customer') return get().fetchUserRequests(silent);
        return get().fetchMerchantCases(silent);
    },

    respondToCase: async (caseId, type, response) => {
        set({ isLoading: true });
        try {
            if (type === 'return') {
                await returnsApi.respondToReturn(
                    caseId, 
                    response.acceptedReturn ? 'APPROVE' : 'REJECT', 
                    response.text, 
                    response.evidence
                );
            } else {
                await returnsApi.respondToDispute(
                    caseId,
                    response.acceptedReturn ? 'APPROVE' : 'REJECT',
                    response.text,
                    response.evidence,
                );
            }
            
            // Reload local state based on current view
            const role = (window as any).currentViewRole || 'merchant';
            if (role === 'admin') await get().fetchAdminCases();
            else if (role === 'customer') await get().fetchUserRequests();
            else await get().fetchMerchantCases();

        } catch (error: any) {
            set({ error: error.message, isLoading: false });
            throw error;
        }
    },

    adminVerdict: async (caseId, type, verdict, notes, extra) => {
        set({ isLoading: true, error: null });
        try {
            const { data } = await returnsApi.issueVerdict(caseId, type, verdict, notes, extra);

            set(state => ({
                cases: state.cases.map(c =>
                    c.id === caseId
                        ? {
                              ...c,
                              status: data?.status === 'REFUNDED' ? 'REFUNDED' : 'RESOLVED',
                              verdictNotes: notes,
                              verdictIssuedAt: data?.verdictIssuedAt || new Date().toISOString(),
                              adminApproval: extra?.adminApproval,
                              adminApprovalReason: extra?.adminApprovalReason || notes,
                              faultParty: extra?.faultParty,
                              netRefundAmount:
                                  data?.netRefundAmount != null
                                      ? Number(data.netRefundAmount)
                                      : extra?.calculatedNetRefund ?? extra?.netRefundAmount,
                              feeBearer: data?.feeBearer ?? extra?.feeBearer,
                              shippingCompanyLiability:
                                  data?.shippingCompanyLiability != null
                                      ? Number(data.shippingCompanyLiability)
                                      : extra?.shippingCompanyLiability,
                              ...extra,
                              updatedAt: new Date().toISOString(),
                          }
                        : c,
                ),
            }));

            await get().fetchAdminCases(true);
            return data;
        } catch (error: any) {
            const message =
                error?.response?.data?.message ||
                (Array.isArray(error?.response?.data?.message) ? error.response.data.message.join(', ') : null) ||
                error?.message ||
                'فشل تنفيذ الحكم الإداري';
            set({ error: message });
            throw new Error(message);
        } finally {
            set({ isLoading: false });
        }
    },

    updateAdminVerdict: async (caseId, type, verdict, notes, extra) => {
        set({ isLoading: true, error: null });
        try {
            const { data } = await returnsApi.updateAdminVerdict(caseId, type, verdict, notes, extra);

            set(state => ({
                cases: state.cases.map(c =>
                    c.id === caseId
                        ? {
                              ...c,
                              status: data?.status === 'REFUNDED' ? 'REFUNDED' : 'RESOLVED',
                              verdictNotes: notes,
                              verdictIssuedAt: data?.verdictIssuedAt || new Date().toISOString(),
                              adminApproval: extra?.adminApproval,
                              faultParty: extra?.faultParty,
                              ...extra,
                              updatedAt: new Date().toISOString(),
                          }
                        : c,
                ),
            }));

            await get().fetchAdminCases(true);
            return data;
        } catch (error: any) {
            const message =
                error?.response?.data?.message ||
                error?.message ||
                'فشل تحديث الحكم الإداري';
            set({ error: message });
            throw new Error(message);
        } finally {
            set({ isLoading: false });
        }
    },

    fetchCaseMessages: async (caseId) => {
        try {
            const response = await returnsApi.getCaseMessages(caseId);
            set({ caseMessages: response.data });
        } catch (error: any) {
            console.error('Failed to fetch case messages', error);
        }
    },

    sendCaseMessage: async (caseId, type, text, attachments) => {
        try {
            // Optimistic update
            const tempMsg: CaseMessage = {
                id: Math.random().toString(),
                caseId,
                caseType: type,
                senderId: 'me',
                senderRole: 'ADMIN', // Will be corrected by server
                text,
                attachments: attachments || [],
                createdAt: new Date().toISOString()
            };
            set(state => ({ caseMessages: [...state.caseMessages, tempMsg] }));

            await returnsApi.sendCaseMessage(caseId, type, text, attachments);
            // We don't need to re-fetch if RT subscription is active
        } catch (error: any) {
            set({ error: error.message });
        }
    },

    fetchMerchantRisk: async (storeId) => {
        try {
            const response = await returnsApi.getMerchantRiskStats(storeId);
            set({ merchantRisk: response.data });
        } catch (error: any) {
            console.error('Failed to fetch merchant risk', error);
        }
    },

    fetchCustomerRisk: async (customerId) => {
        try {
            const response = await returnsApi.getCustomerRiskStats(customerId);
            set(state => ({
                cases: state.cases.map(c => 
                    c.customerId === customerId ? { ...c, customerRisk: response.data } : c
                )
            }));
        } catch (error: any) {
            console.error('Failed to fetch customer risk', error);
        }
    },

    updateCaseStatus: (caseId, status, partialCase?: Partial<ResolutionCase>) => {
        set(state => ({
            cases: state.cases.map(c => 
                c.id === caseId ? { 
                    ...c, 
                    status, 
                    ...partialCase,
                    updatedAt: new Date().toISOString() 
                } : c
            )
        }));
    },

    updateReturnPhase: (caseId, phase) => {
        set(state => ({
            cases: state.cases.map(c => 
                c.id === caseId ? { ...c, returnPhase: phase, updatedAt: new Date().toISOString() } : c
            )
        }));
    },

    checkEscalations: () => {
        const now = new Date();
        set(state => ({
            cases: state.cases.map(c => {
                if (c.status === 'AWAITING_MERCHANT' && new Date(c.deadline) < now) {
                    return { ...c, status: 'ESCALATED' as CaseStatus };
                }
                return c;
            })
        }));
    },

    escalateCase: async (id) => {
        set({ isLoading: true });
        try {
            await returnsApi.escalateCase(id);
            // Refresh cases based on current view
            const role = (window as any).currentViewRole || 'merchant';
            if (role === 'admin') await get().fetchAdminCases();
            else if (role === 'customer') await get().fetchUserRequests();
            else await get().fetchMerchantCases();
        } catch (error: any) {
            set({ error: error.message, isLoading: false });
        }
    },

    subscribeToCases: (role: 'merchant' | 'admin' | 'customer') => {
        // Prevent duplicate subscriptions
        if ((window as any).resolutionSub) {
            supabase.removeChannel((window as any).resolutionSub);
        }

        const sub = supabase.channel(`resolution-changes-${role}-${Math.random().toString(36).substring(7)}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'returns' }, (payload) => {
                console.log('[RT] Return updated:', payload);
                if (role === 'admin') get().fetchAdminCases(true);
                else if (role === 'customer') get().fetchUserRequests(true);
                else get().fetchMerchantCases(true);
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'disputes' }, (payload) => {
                console.log('[RT] Dispute updated:', payload);
                if (role === 'admin') get().fetchAdminCases(true);
                else if (role === 'customer') get().fetchUserRequests(true);
                else get().fetchMerchantCases(true);
            })
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'case_messages' }, (payload) => {
                const newMsg = payload.new as CaseMessage;
                // Only add if it's not already there (avoid double from optimistic)
                set(state => {
                    const exists = state.caseMessages.some(m => m.id === newMsg.id || (m.senderId === 'me' && m.text === newMsg.text));
                    if (exists) {
                        return { caseMessages: state.caseMessages.map(m => (m.senderId === 'me' && m.text === newMsg.text) ? newMsg : m) };
                    }
                    return { caseMessages: [...state.caseMessages, newMsg] };
                });
            })
            .subscribe((status) => {
                console.log(`[RT] Subscription status for ${role}:`, status);
            });

        (window as any).resolutionSub = sub;
    },

    unsubscribeFromCases: () => {
        const sub = (window as any).resolutionSub;
        if (sub) {
            supabase.removeChannel(sub);
        }
    },

    getCaseById: (id) => {
        return get().cases.find(c => c.id === id);
    }
}));
