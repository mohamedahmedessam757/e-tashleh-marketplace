import type { PrismaService } from '../prisma/prisma.service';

export const WITHDRAWAL_CAP_WHEN_OPEN_CASES = 0.75;

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

export function computeMaxWithdrawable(
    availableBalance: number,
    hasOpenCases: boolean,
): number {
    const available = Math.max(0, Number(availableBalance) || 0);
    if (!hasOpenCases) {
        return Number(available.toFixed(2));
    }
    return Number((available * WITHDRAWAL_CAP_WHEN_OPEN_CASES).toFixed(2));
}

export function buildWithdrawalGovernance(
    availableBalance: number,
    cases: MerchantOpenCasesSummary,
): MerchantWithdrawalGovernance {
    const hasOpen = cases.hasOpenReturnOrDispute;
    const maxWithdrawableAmount = computeMaxWithdrawable(availableBalance, hasOpen);
    const capPercent = hasOpen ? Math.round(WITHDRAWAL_CAP_WHEN_OPEN_CASES * 100) : 100;

    const available = Math.max(0, Number(availableBalance) || 0);

    return {
        withdrawalCapPercent: capPercent,
        maxWithdrawableAmount,
        hasOpenReturnOrDispute: hasOpen,
        openCasesCount: cases.openCasesCount,
        withdrawalRestrictionMessageAr: hasOpen
            ? `بسبب وجود ${cases.openCasesCount} مرتجع/نزاع مفتوح، يمكنك سحب ${capPercent}% فقط من الرصيد المستحق (${maxWithdrawableAmount.toLocaleString('en-US')} AED من ${available.toLocaleString('en-US')} AED).`
            : null,
        withdrawalRestrictionMessageEn: hasOpen
            ? `Due to ${cases.openCasesCount} open return(s)/dispute(s), you may withdraw only ${capPercent}% of your due balance (${maxWithdrawableAmount.toLocaleString('en-US')} AED of ${available.toLocaleString('en-US')} AED).`
            : null,
    };
}
