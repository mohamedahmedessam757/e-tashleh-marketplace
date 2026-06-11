-- Adjudication fee attribution columns (run manually if CLI connection fails)
ALTER TABLE public.returns
  ADD COLUMN IF NOT EXISTS fee_bearer text,
  ADD COLUMN IF NOT EXISTS shipping_company_liability numeric(14, 2) DEFAULT 0;

ALTER TABLE public.disputes
  ADD COLUMN IF NOT EXISTS fee_bearer text,
  ADD COLUMN IF NOT EXISTS shipping_company_liability numeric(14, 2) DEFAULT 0;

COMMENT ON COLUMN public.returns.fee_bearer IS 'CUSTOMER | MERCHANT | PLATFORM | MIXED_CLOSE';
COMMENT ON COLUMN public.disputes.fee_bearer IS 'CUSTOMER | MERCHANT | PLATFORM | MIXED_CLOSE';
