import { BadRequestException } from '@nestjs/common';

export type PayoutVerificationStatus = 'NOT_LINKED' | 'PENDING_REVIEW' | 'VERIFIED';

export interface PayoutBankDetailsDto {
    bankName: string | null;
    accountHolder: string | null;
    iban: string | null;
    maskedIban: string | null;
    swift: string | null;
    verified: boolean;
    isLinked: boolean;
    verificationStatus: PayoutVerificationStatus;
    stripeOnboarded: boolean;
    stripeAccountId: string | null;
}

export function maskIban(iban: string | null | undefined): string | null {
    if (!iban?.trim()) return null;
    const clean = iban.replace(/\s/g, '').toUpperCase();
    if (clean.length < 8) return '****';
    return `${clean.slice(0, 4)} •••• •••• ${clean.slice(-4)}`;
}

export function maskStripeAccountId(accountId: string | null | undefined): string | null {
    if (!accountId?.trim()) return null;
    const id = accountId.trim();
    if (id.length <= 10) return id;
    return `${id.slice(0, 5)}••••${id.slice(-4)}`;
}

export function buildPayoutBankDetailsResponse(input: {
    bankName?: string | null;
    bankAccountHolder?: string | null;
    bankIban?: string | null;
    bankSwift?: string | null;
    bankDetailsVerified?: boolean;
    stripeOnboarded?: boolean;
    stripeAccountId?: string | null;
}): PayoutBankDetailsDto {
    const iban = input.bankIban?.trim() || null;
    const verified = Boolean(input.bankDetailsVerified);
    const isLinked = Boolean(iban);
    const verificationStatus: PayoutVerificationStatus = verified
        ? 'VERIFIED'
        : isLinked
          ? 'PENDING_REVIEW'
          : 'NOT_LINKED';

    return {
        bankName: input.bankName ?? null,
        accountHolder: input.bankAccountHolder ?? null,
        iban,
        maskedIban: maskIban(iban),
        swift: input.bankSwift ?? null,
        verified,
        isLinked,
        verificationStatus,
        stripeOnboarded: Boolean(input.stripeOnboarded),
        stripeAccountId: input.stripeAccountId ?? null,
    };
}

export interface PayoutReadiness {
    hasBank: boolean;
    hasStripe: boolean;
    /** Stripe account exists and is onboarded (may still lack charges/payouts). */
    hasStripeAccount: boolean;
    stripeReadyForTransfer: boolean;
    hasAny: boolean;
}

export function isStripeConnectReadyForTransfer(input: {
    stripeAccountId?: string | null;
    stripeOnboarded?: boolean;
    stripeChargesEnabled?: boolean;
    stripePayoutsEnabled?: boolean;
}): boolean {
    return Boolean(
        input.stripeAccountId?.trim() &&
            input.stripeOnboarded &&
            input.stripePayoutsEnabled,
    );
}

export function getPayoutReadiness(input: {
    bankIban?: string | null;
    stripeOnboarded?: boolean;
    stripeAccountId?: string | null;
    stripeChargesEnabled?: boolean;
    stripePayoutsEnabled?: boolean;
}): PayoutReadiness {
    const hasBank = Boolean(input.bankIban?.trim());
    const hasStripeAccount = Boolean(input.stripeAccountId?.trim() && input.stripeOnboarded);
    const stripeReadyForTransfer = isStripeConnectReadyForTransfer(input);
    // Prefer fully ready Connect; fall back to onboarded for accounts still syncing capabilities.
    const hasStripe = stripeReadyForTransfer || hasStripeAccount;
    return {
        hasBank,
        hasStripe,
        hasStripeAccount,
        stripeReadyForTransfer,
        hasAny: hasBank || hasStripe,
    };
}

export function assertWithdrawalPayoutMethodReady(
    payoutMethod: string,
    readiness: PayoutReadiness,
): void {
    if (!readiness.hasAny) {
        throw new BadRequestException(
            'You must link a payout method before withdrawing. Stripe Connect is recommended for faster payouts, or add your bank account details.',
        );
    }

    if (payoutMethod === 'STRIPE' && !readiness.hasStripe) {
        throw new BadRequestException(
            'Complete Stripe Connect onboarding first (charges and payouts must be enabled), or switch to bank transfer.',
        );
    }

    if (payoutMethod === 'STRIPE' && readiness.hasStripeAccount && !readiness.stripeReadyForTransfer) {
        throw new BadRequestException(
            'Stripe Connect account is not ready for transfers yet. Finish verification in Stripe, or use bank transfer.',
        );
    }

    if (payoutMethod === 'BANK_TRANSFER' && !readiness.hasBank) {
        throw new BadRequestException(
            'Add your bank account details first, or switch to Stripe Connect (recommended for faster payouts).',
        );
    }
}

export interface AdminPayoutMethodsDto {
    bank: {
        isLinked: boolean;
        bankName: string | null;
        accountHolder: string | null;
        iban: string | null;
        maskedIban: string | null;
        swift: string | null;
        verificationStatus: PayoutVerificationStatus;
    };
    stripe: {
        isConnected: boolean;
        onboarded: boolean;
        maskedAccountId: string | null;
        chargesEnabled: boolean | null;
        payoutsEnabled: boolean | null;
        detailsSubmitted: boolean | null;
        requirementsDueCount: number | null;
        disabledReason: string | null;
        statusUpdatedAt: string | null;
    };
    readiness: { hasBank: boolean; hasStripe: boolean; hasAny: boolean };
}

/** Admin payout summary: the Stripe account id is always masked. */
export function buildAdminPayoutMethods(input: {
    bankName?: string | null;
    bankAccountHolder?: string | null;
    bankIban?: string | null;
    bankSwift?: string | null;
    bankDetailsVerified?: boolean | null;
    stripeAccountId?: string | null;
    stripeOnboarded?: boolean | null;
    stripeChargesEnabled?: boolean | null;
    stripePayoutsEnabled?: boolean | null;
    stripeDetailsSubmitted?: boolean | null;
    stripeDisabledReason?: string | null;
    stripeRequirementsDue?: unknown;
    stripeStatusUpdatedAt?: Date | string | null;
}): AdminPayoutMethodsDto {
    const bank = buildPayoutBankDetailsResponse({
        bankName: input.bankName,
        bankAccountHolder: input.bankAccountHolder,
        bankIban: input.bankIban,
        bankSwift: input.bankSwift,
        bankDetailsVerified: Boolean(input.bankDetailsVerified),
    });
    const readiness = getPayoutReadiness({
        bankIban: input.bankIban,
        stripeAccountId: input.stripeAccountId,
        stripeOnboarded: Boolean(input.stripeOnboarded),
        stripeChargesEnabled: Boolean(input.stripeChargesEnabled),
        stripePayoutsEnabled: Boolean(input.stripePayoutsEnabled),
    });
    const requirementsDueCount = Array.isArray(input.stripeRequirementsDue)
        ? input.stripeRequirementsDue.length
        : null;
    const statusUpdatedAt = input.stripeStatusUpdatedAt
        ? new Date(input.stripeStatusUpdatedAt).toISOString()
        : null;

    return {
        bank: {
            isLinked: bank.isLinked,
            bankName: bank.bankName,
            accountHolder: bank.accountHolder,
            iban: bank.iban,
            maskedIban: bank.maskedIban,
            swift: bank.swift,
            verificationStatus: bank.verificationStatus,
        },
        stripe: {
            isConnected: Boolean(input.stripeAccountId?.trim()),
            onboarded: Boolean(input.stripeOnboarded),
            maskedAccountId: maskStripeAccountId(input.stripeAccountId),
            chargesEnabled: input.stripeChargesEnabled ?? null,
            payoutsEnabled: input.stripePayoutsEnabled ?? null,
            detailsSubmitted: input.stripeDetailsSubmitted ?? null,
            requirementsDueCount,
            disabledReason: input.stripeDisabledReason ?? null,
            statusUpdatedAt,
        },
        readiness: {
            hasBank: readiness.hasBank,
            hasStripe: readiness.hasStripe,
            hasAny: readiness.hasAny,
        },
    };
}
