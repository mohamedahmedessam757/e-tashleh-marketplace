export type PayoutVerificationStatus = 'NOT_LINKED' | 'PENDING_REVIEW' | 'VERIFIED';

export interface PayoutBankDetails {
  bankName: string | null;
  accountHolder: string | null;
  iban: string | null;
  maskedIban?: string | null;
  swift?: string | null;
  verified: boolean;
  isLinked?: boolean;
  verificationStatus?: PayoutVerificationStatus;
  stripeOnboarded: boolean;
  stripeAccountId: string | null;
}

export interface AdminPayoutMethods {
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

export interface StripeConnectDisplay {
  maskedAccountId: string | null;
  email: string | null;
  businessName: string | null;
  payoutsEnabled: boolean;
  chargesEnabled: boolean;
  detailsSubmitted: boolean;
}
