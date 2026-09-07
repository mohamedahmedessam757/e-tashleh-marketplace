import {
  canSubmitOffers,
  isStripeFullyReady,
  mapStripeAccountToStoreFields,
  denyReasonForOfferGate,
} from './store-activation.policy';

describe('store-activation.policy', () => {
  it('grandfather ACTIVE without stripeActivationRequired can submit offers', () => {
    expect(
      canSubmitOffers({
        status: 'ACTIVE',
        stripeActivationRequired: false,
        stripeAccountId: null,
      }),
    ).toBe(true);
  });

  it('PENDING_STRIPE cannot submit offers', () => {
    expect(
      canSubmitOffers({
        status: 'PENDING_STRIPE',
        stripeActivationRequired: true,
        stripeChargesEnabled: true,
        stripePayoutsEnabled: true,
        stripeAccountId: 'acct_x',
      }),
    ).toBe(false);
  });

  it('STRIPE_RESTRICTED cannot submit offers', () => {
    expect(canSubmitOffers({ status: 'STRIPE_RESTRICTED', stripeActivationRequired: true })).toBe(
      false,
    );
  });

  it('ACTIVE + stripeActivationRequired requires full Stripe readiness', () => {
    expect(
      canSubmitOffers({
        status: 'ACTIVE',
        stripeActivationRequired: true,
        stripeAccountId: 'acct_x',
        stripeChargesEnabled: true,
        stripePayoutsEnabled: false,
        stripeRequirementsDue: [],
      }),
    ).toBe(false);

    expect(
      canSubmitOffers({
        status: 'ACTIVE',
        stripeActivationRequired: true,
        stripeAccountId: 'acct_x',
        stripeChargesEnabled: true,
        stripePayoutsEnabled: true,
        stripeDisabledReason: null,
        stripeRequirementsDue: [],
      }),
    ).toBe(true);
  });

  it('isStripeFullyReady rejects currently_due and disabled_reason', () => {
    expect(
      isStripeFullyReady({
        stripeAccountId: 'acct_1',
        chargesEnabled: true,
        payoutsEnabled: true,
        detailsSubmitted: true,
        disabledReason: null,
        currentlyDue: ['external_account'],
        pendingVerification: [],
      }),
    ).toBe(false);

    expect(
      isStripeFullyReady({
        stripeAccountId: 'acct_1',
        chargesEnabled: true,
        payoutsEnabled: true,
        detailsSubmitted: true,
        disabledReason: 'requirements.past_due',
        currentlyDue: [],
        pendingVerification: [],
      }),
    ).toBe(false);
  });

  it('mapStripeAccountToStoreFields sets stripeOnboarded only when ready', () => {
    const incomplete = mapStripeAccountToStoreFields({
      id: 'acct_1',
      charges_enabled: true,
      payouts_enabled: false,
      details_submitted: true,
      requirements: { currently_due: [], pending_verification: [], disabled_reason: null },
    });
    expect(incomplete.ready).toBe(false);
    expect(incomplete.stripeOnboarded).toBe(false);

    const ready = mapStripeAccountToStoreFields({
      id: 'acct_1',
      charges_enabled: true,
      payouts_enabled: true,
      details_submitted: true,
      requirements: { currently_due: [], pending_verification: [], disabled_reason: null },
    });
    expect(ready.ready).toBe(true);
    expect(ready.stripeOnboarded).toBe(true);
  });

  it('denyReasonForOfferGate explains PENDING_STRIPE', () => {
    expect(denyReasonForOfferGate({ status: 'PENDING_STRIPE' })).toMatch(/Stripe Connect/i);
  });
});
