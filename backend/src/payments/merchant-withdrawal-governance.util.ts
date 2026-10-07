import type { PrismaService } from '../prisma/prisma.service';

const OPEN_RETURN_STATUSES = ['CANCELLED', 'REJECTED', 'REFUNDED', 'RESOLVED'] as const;
const OPEN_DISPUTE_STATUSES = ['CLOSED', 'RESOLVED'] as const;

export interface MerchantOpenCasesSummary {
    hasOpenReturnOrDispute: boolean;
    openCasesCount: number;
    openReturnsCount: number;
    openDisputesCount: number;
}

export interface MerchantWithdrawalGovernance {
    withdrawalCapPercent: number;
    maxWithdrawableAmount: number;
    hasOpenReturnOrDispute: boolean;
    openCasesCount: number;
    withdrawalRestrictionMessageAr: string | null;
    withdrawalRestrictionMessageEn: string | null;
}

export async function countOpenMerchantCases(
    prisma: PrismaService,
    storeId: string,
): Promise<MerchantOpenCasesSummary> {
    const storeScope = {
        OR: [{ storeId }, { offer: { storeId } }],
    };

    const [openReturnsCount, openDisputesCount] = await Promise.all([
        prisma.returnRequest.count({
            where: {
                ...storeScope,
                status: { notIn: [...OPEN_RETURN_STATUSES] },
            },
        }),
        prisma.dispute.count({
            where: {
                ...storeScope,
                status: { notIn: [...OPEN_DISPUTE_STATUSES] },
            },
        }),
    ]);

    const openCasesCount = openReturnsCount + openDisputesCount;
    return {
        hasOpenReturnOrDispute: openCasesCount > 0,
        openCasesCount,
        openReturnsCount,
        openDisputesCount,
    };
}

export interface DisputeHoldPolicy {
    enabled: boolean;
    /** Percent of the net available balance held while cases are open (0–90). */
    holdPercent: number;
}

export function normalizeDisputeHoldPercent(raw: unknown): number {
    const n = Number(raw);
    if (!Number.isFinite(n)) return 25;
    return Math.min(90, Math.max(0, Math.round(n)));
}

export function computeMaxWithdrawable(
    availableBalance: number,
    hasOpenCases: boolean,
    policy: DisputeHoldPolicy = { enabled: false, holdPercent: 0 },
): number {
    const available = Math.max(0, Number(availableBalance) || 0);
    if (!hasOpenCases || !policy.enabled) {
        return Number(available.toFixed(2));
    }
    const holdPercent = normalizeDisputeHoldPercent(policy.holdPercent);
    return Number((available * (1 - holdPercent / 100)).toFixed(2));
}

export function buildWithdrawalGovernance(
    availableBalance: number,
    cases: MerchantOpenCasesSummary,
    policy: DisputeHoldPolicy = { enabled: false, holdPercent: 0 },
): MerchantWithdrawalGovernance & {
    disputeHoldEnabled: boolean;
    disputeHoldPercent: number;
    disputeHoldAmount: number;
} {
    const hasOpen = cases.hasOpenReturnOrDispute;
    const holdActive = hasOpen && policy.enabled;
    const holdPercent = holdActive ? normalizeDisputeHoldPercent(policy.holdPercent) : 0;
    const maxWithdrawableAmount = computeMaxWithdrawable(availableBalance, hasOpen, policy);
    const capPercent = 100 - holdPercent;

    const available = Math.max(0, Number(availableBalance) || 0);
    const disputeHoldAmount = Number(Math.max(0, available - maxWithdrawableAmount).toFixed(2));
    const restricted = holdActive && holdPercent > 0;

    return {
        withdrawalCapPercent: capPercent,
        maxWithdrawableAmount,
        hasOpenReturnOrDispute: hasOpen,
        openCasesCount: cases.openCasesCount,
        disputeHoldEnabled: Boolean(policy.enabled),
        disputeHoldPercent: holdPercent,
        disputeHoldAmount,
        withdrawalRestrictionMessageAr: restricted
            ? `بسبب وجود ${cases.openCasesCount} مرتجع/نزاع مفتوح، يتم حجز ${holdPercent}% من الرصيد القابل للسحب مؤقتًا (${disputeHoldAmount.toLocaleString('en-US')} AED) حتى إغلاق الحالات.`
            : null,
        withdrawalRestrictionMessageEn: restricted
            ? `Due to ${cases.openCasesCount} open return(s)/dispute(s), ${holdPercent}% of your withdrawable balance (${disputeHoldAmount.toLocaleString('en-US')} AED) is temporarily held until the cases close.`
            : null,
    };
}
