-- Adjudication platform-fee payment tracking (wallet or Stripe when balance insufficient)
-- Safe to re-run: IF NOT EXISTS guards

ALTER TABLE returns
  ADD COLUMN IF NOT EXISTS adjudication_fee_amount NUMERIC(14, 2),
  ADD COLUMN IF NOT EXISTS adjudication_fee_payee VARCHAR(32),
  ADD COLUMN IF NOT EXISTS adjudication_fee_payment_status VARCHAR(32) NOT NULL DEFAULT 'NONE',
  ADD COLUMN IF NOT EXISTS adjudication_fee_payment_method VARCHAR(32),
  ADD COLUMN IF NOT EXISTS adjudication_fee_stripe_id TEXT;

ALTER TABLE disputes
  ADD COLUMN IF NOT EXISTS adjudication_fee_amount NUMERIC(14, 2),
  ADD COLUMN IF NOT EXISTS adjudication_fee_payee VARCHAR(32),
  ADD COLUMN IF NOT EXISTS adjudication_fee_payment_status VARCHAR(32) NOT NULL DEFAULT 'NONE',
  ADD COLUMN IF NOT EXISTS adjudication_fee_payment_method VARCHAR(32),
  ADD COLUMN IF NOT EXISTS adjudication_fee_stripe_id TEXT;

UPDATE returns SET adjudication_fee_payment_status = 'NONE' WHERE adjudication_fee_payment_status IS NULL;
UPDATE disputes SET adjudication_fee_payment_status = 'NONE' WHERE adjudication_fee_payment_status IS NULL;
