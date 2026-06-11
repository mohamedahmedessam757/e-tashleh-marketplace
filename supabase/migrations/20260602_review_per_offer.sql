-- Per-offer reviews for multi-part orders (Phase 3C)

ALTER TABLE reviews
  ADD COLUMN IF NOT EXISTS offer_id UUID REFERENCES offers(id) ON DELETE SET NULL;

UPDATE reviews r
SET offer_id = sub.id
FROM (
  SELECT DISTINCT ON (o.order_id) o.order_id, o.id
  FROM offers o
  WHERE o.status IN ('accepted', 'ACCEPTED')
  ORDER BY o.order_id, o.created_at ASC
) sub
WHERE r.order_id = sub.order_id
  AND r.offer_id IS NULL;

ALTER TABLE reviews DROP CONSTRAINT IF EXISTS reviews_order_id_key;

CREATE UNIQUE INDEX IF NOT EXISTS reviews_order_offer_unique
  ON reviews (order_id, COALESCE(offer_id, '00000000-0000-0000-0000-000000000000'::uuid));

CREATE INDEX IF NOT EXISTS reviews_offer_id_idx ON reviews (offer_id);
