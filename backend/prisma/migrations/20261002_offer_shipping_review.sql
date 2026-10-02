-- Offers whose merchant shipping class differs from the customer's declaration are held
-- (PENDING) until an admin decides; unresolved holds expire when bidding stops (hour 23).
ALTER TABLE offers ADD COLUMN IF NOT EXISTS shipping_review_status TEXT NOT NULL DEFAULT 'NONE';
ALTER TABLE offers ADD COLUMN IF NOT EXISTS shipping_review_resolved_at TIMESTAMPTZ;

DO $$ BEGIN
  ALTER TABLE offers ADD CONSTRAINT offers_shipping_review_status_chk
    CHECK (shipping_review_status IN ('NONE', 'PENDING', 'APPROVED', 'EXPIRED'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS idx_offers_shipping_review_pending
  ON offers (order_id) WHERE shipping_review_status = 'PENDING';

COMMENT ON COLUMN offers.shipping_review_status IS 'Shipping-class review: NONE | PENDING (awaiting admin) | APPROVED | EXPIRED (auto-withdrawn)';

-- Backfill only orders still collecting offers; already revealed orders are left untouched.
UPDATE offers o
SET shipping_review_status = 'PENDING'
FROM order_parts p, orders ord
WHERE o.order_part_id = p.id
  AND o.order_id = ord.id
  AND ord.status = 'COLLECTING_OFFERS'
  AND o.is_withdrawn = false
  AND o.status = 'pending'
  AND o.shipping_review_status = 'NONE'
  AND p.shipping_class IS NOT NULL
  AND o.part_type IS NOT NULL
  AND p.shipping_class <> o.part_type;
