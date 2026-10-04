-- Per-part (offer) preparation SLA + carrier part-price liability. Additive only.
ALTER TABLE public.offers ADD COLUMN IF NOT EXISTS preparation_deadline_at timestamptz;
ALTER TABLE public.offers ADD COLUMN IF NOT EXISTS delayed_prep_deadline_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_offers_inprep_prep_deadline
  ON public.offers (preparation_deadline_at)
  WHERE fulfillment_status = 'IN_PREPARATION';
CREATE INDEX IF NOT EXISTS idx_offers_inprep_delayed_deadline
  ON public.offers (delayed_prep_deadline_at)
  WHERE fulfillment_status = 'IN_PREPARATION';

ALTER TABLE public.shipping_company_obligations
  ADD COLUMN IF NOT EXISTS part_price_amount numeric(14,2) NOT NULL DEFAULT 0;

-- Backfill in-preparation offers from their order-level deadlines.
UPDATE public.offers f
   SET preparation_deadline_at = o.preparation_deadline_at
  FROM public.orders o
 WHERE f.order_id = o.id
   AND lower(f.status) = 'accepted'
   AND f.fulfillment_status = 'IN_PREPARATION'
   AND f.preparation_deadline_at IS NULL
   AND o.preparation_deadline_at IS NOT NULL;

UPDATE public.offers f
   SET delayed_prep_deadline_at = o.delayed_prep_deadline_at
  FROM public.orders o
 WHERE f.order_id = o.id
   AND lower(f.status) = 'accepted'
   AND f.fulfillment_status = 'IN_PREPARATION'
   AND f.delayed_prep_deadline_at IS NULL
   AND o.delayed_prep_deadline_at IS NOT NULL;
