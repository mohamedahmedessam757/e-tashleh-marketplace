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

export interface StripeConnectDisplay {
  maskedAccountId: string | null;
  email: string | null;
  businessName: string | null;
  payoutsEnabled: boolean;
  chargesEnabled: boolean;
  detailsSubmitted: boolean;
}
