-- Withdrawal balance hold + audit fields (run manually on Supabase)

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS customer_frozen_balance NUMERIC(14,2) NOT NULL DEFAULT 0;

ALTER TABLE withdrawal_requests
  ADD COLUMN IF NOT EXISTS processed_by UUID REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS admin_signature TEXT,
  ADD COLUMN IF NOT EXISTS transfer_completed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS iban_snapshot TEXT,
  ADD COLUMN IF NOT EXISTS stripe_account_snapshot TEXT,
  ADD COLUMN IF NOT EXISTS stripe_idempotency_key TEXT,
  ADD COLUMN IF NOT EXISTS balance_held_at_request NUMERIC(14,2);

CREATE INDEX IF NOT EXISTS idx_withdrawal_requests_processed_by ON withdrawal_requests(processed_by);
