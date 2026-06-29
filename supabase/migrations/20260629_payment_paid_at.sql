-- Add paid_at to payment_transactions (schema had it; production was missing the column).
-- Safe to run multiple times.

ALTER TABLE public.payment_transactions
  ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ;

UPDATE public.payment_transactions
SET paid_at = created_at
WHERE paid_at IS NULL
  AND status = 'SUCCESS';

CREATE INDEX IF NOT EXISTS idx_payment_tx_paid_at
  ON public.payment_transactions (paid_at DESC)
  WHERE paid_at IS NOT NULL;
