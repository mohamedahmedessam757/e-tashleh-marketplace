import { StoreStatus } from '@prisma/client';

/** Minimal store fields needed for offer / Stripe readiness checks. */
export type StoreActivationFields = {
  status: StoreStatus | string;
  stripeAccountId?: string | null;
  stripeActivationRequired?: boolean | null;
  stripeChargesEnabled?: boolean | null;
  stripePayoutsEnabled?: boolean | null;
  stripeDisabledReason?: string | null;
  stripeRequirementsDue?: unknown;
  stripeOnboarded?: boolean | null;
};

/** Snapshot derived from a Stripe Account object (or persisted DB columns). */
export type StripeAccountReadinessSnapshot = {
  stripeAccountId?: string | null;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  detailsSubmitted: boolean;
  disabledReason: string | null;
  currentlyDue: string[];
  pendingVerification: string[];
};

const BLOCKED_OFFER_STATUSES = new Set<string>([
  StoreStatus.PENDING_DOCUMENTS,
  StoreStatus.PENDING_REVIEW,
  StoreStatus.PENDING_STRIPE,
  StoreStatus.STRIPE_RESTRICTED,
  StoreStatus.REJECTED,
  StoreStatus.SUSPENDED,
  StoreStatus.BLOCKED,
  StoreStatus.LICENSE_EXPIRED,
]);

function asStringArray(value: unknown): string[] {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value.filter((v): v is string => typeof v === 'string');
  }
  return [];
}

/**
 * True when Connect Express account can receive platform transfers / operate.
 * Does NOT rely on details_submitted alone.
 */
export function isStripeFullyReady(
  input: StripeAccountReadinessSnapshot | StoreActivationFields,
): boolean {
  if ('chargesEnabled' in input && typeof (input as StripeAccountReadinessSnapshot).chargesEnabled === 'boolean') {
    const snap = input as StripeAccountReadinessSnapshot;
    if (!snap.stripeAccountId?.trim()) return false;
    if (!snap.chargesEnabled || !snap.payoutsEnabled) return false;
    if (snap.disabledReason) return false;
    if (snap.currentlyDue.length > 0) return false;
    return true;
  }

  const store = input as StoreActivationFields;
  if (!store.stripeAccountId?.trim()) return false;
  if (!store.stripeChargesEnabled || !store.stripePayoutsEnabled) return false;
  if (store.stripeDisabledReason) return false;
  if (asStringArray(store.stripeRequirementsDue).length > 0) return false;
  return true;
}

/**
 * Whether the merchant may submit NEW offers.
 * Grandfather: ACTIVE + stripeActivationRequired=false → allowed without Stripe.
 */
export function canSubmitOffers(store: StoreActivationFields): boolean {
  const status = String(store.status || '');
  if (BLOCKED_OFFER_STATUSES.has(status)) return false;
  if (status !== StoreStatus.ACTIVE && status !== 'ACTIVE') return false;

  if (!store.stripeActivationRequired) return true;
  return isStripeFullyReady(store);
}

export function mapStripeAccountToReadiness(account: Record<string, unknown> | null | undefined): StripeAccountReadinessSnapshot {
  if (!account) {
    return {
      stripeAccountId: null,
      chargesEnabled: false,
      payoutsEnabled: false,
      detailsSubmitted: false,
      disabledReason: null,
      currentlyDue: [],
      pendingVerification: [],
    };
  }

  const requirements = (account.requirements || {}) as {
    currently_due?: string[];
    pending_verification?: string[];
    disabled_reason?: string | null;
  };

  return {
    stripeAccountId: typeof account.id === 'string' ? account.id : null,
    chargesEnabled: Boolean(account.charges_enabled),
    payoutsEnabled: Boolean(account.payouts_enabled),
    detailsSubmitted: Boolean(account.details_submitted),
    disabledReason: requirements.disabled_reason || null,
    currentlyDue: asStringArray(requirements.currently_due),
    pendingVerification: asStringArray(requirements.pending_verification),
  };
}

export function mapStripeAccountToStoreFields(account: Record<string, unknown> | null | undefined) {
  const snap = mapStripeAccountToReadiness(account);
  const ready = isStripeFullyReady(snap);
  return {
    stripeChargesEnabled: snap.chargesEnabled,
    stripePayoutsEnabled: snap.payoutsEnabled,
    stripeDetailsSubmitted: snap.detailsSubmitted,
    stripeDisabledReason: snap.disabledReason,
    stripeRequirementsDue: snap.currentlyDue,
    stripeRequirementsPending: snap.pendingVerification,
    stripeOnboarded: ready,
    stripeStatusUpdatedAt: new Date(),
    readiness: snap,
    ready,
  };
}

export function denyReasonForOfferGate(store: StoreActivationFields): string {
  const status = String(store.status || '');
  if (status === StoreStatus.PENDING_STRIPE || status === 'PENDING_STRIPE') {
    return 'Store is awaiting Stripe Connect activation. Complete financial verification before submitting offers.';
  }
  if (status === StoreStatus.STRIPE_RESTRICTED || status === 'STRIPE_RESTRICTED') {
    return 'Stripe account is restricted. Resolve verification requirements before submitting new offers.';
  }
  if (status === StoreStatus.PENDING_REVIEW || status === StoreStatus.PENDING_DOCUMENTS) {
    return 'Store is not approved yet. Offers are disabled until activation is complete.';
  }
  if (status === StoreStatus.LICENSE_EXPIRED || status === 'LICENSE_EXPIRED') {
    return 'Store license has expired. Offers are disabled until documents are renewed.';
  }
  if (status === StoreStatus.SUSPENDED || status === StoreStatus.BLOCKED || status === StoreStatus.REJECTED) {
    return `Store status (${status}) does not allow submitting offers.`;
  }
  if (status === StoreStatus.ACTIVE && store.stripeActivationRequired && !isStripeFullyReady(store)) {
    return 'Stripe Connect is not fully ready. Complete verification before submitting offers.';
  }
  return 'You are not allowed to submit offers for this store.';
}
