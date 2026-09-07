-- Store activation gated by admin approval + Stripe Connect readiness
-- Safe: adds enum values + columns only; does NOT alter existing store statuses.
-- Existing ACTIVE stores keep stripe_activation_required = false (grandfather).

ALTER TYPE store_status ADD VALUE IF NOT EXISTS 'PENDING_STRIPE';
ALTER TYPE store_status ADD VALUE IF NOT EXISTS 'STRIPE_RESTRICTED';

ALTER TABLE stores
  ADD COLUMN IF NOT EXISTS admin_approved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS stripe_activation_required BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS stripe_charges_enabled BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS stripe_payouts_enabled BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS stripe_details_submitted BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS stripe_disabled_reason TEXT,
  ADD COLUMN IF NOT EXISTS stripe_requirements_due JSONB,
  ADD COLUMN IF NOT EXISTS stripe_requirements_pending JSONB,
  ADD COLUMN IF NOT EXISTS stripe_status_updated_at TIMESTAMPTZ;
