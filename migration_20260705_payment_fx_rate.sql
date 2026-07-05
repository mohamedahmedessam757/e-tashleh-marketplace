-- Optional FX rate snapshot on payments (Phase 16 — display/record only)
ALTER TABLE payment_transactions
  ADD COLUMN IF NOT EXISTS fx_rate NUMERIC(12,6),
  ADD COLUMN IF NOT EXISTS display_currency TEXT DEFAULT 'AED';

CREATE INDEX IF NOT EXISTS idx_payment_transactions_display_currency
  ON payment_transactions(display_currency);
