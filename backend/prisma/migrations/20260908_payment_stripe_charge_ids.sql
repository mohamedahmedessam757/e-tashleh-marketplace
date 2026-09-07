-- SCT: persist Charge + Balance Transaction ids for Order financial grouping
ALTER TABLE payment_transactions
  ADD COLUMN IF NOT EXISTS stripe_charge_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_balance_txn_id TEXT;

CREATE INDEX IF NOT EXISTS idx_payment_transactions_stripe_charge_id
  ON payment_transactions (stripe_charge_id);
