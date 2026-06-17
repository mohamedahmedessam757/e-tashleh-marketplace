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
