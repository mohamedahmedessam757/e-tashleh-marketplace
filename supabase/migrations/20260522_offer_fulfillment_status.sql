-- Per-offer fulfillment pipeline for multi-part orders

-- Align with Prisma OrderStatus (skip if already present)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    WHERE t.typname = 'order_status' AND e.enumlabel = 'PARTIALLY_PAID'
  ) THEN
    ALTER TYPE order_status ADD VALUE 'PARTIALLY_PAID';
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE offer_fulfillment_status AS ENUM (
    'AWAITING_PAYMENT',
    'IN_PREPARATION',
    'PREPARED',
    'VERIFICATION',
    'VERIFICATION_SUCCESS',
    'READY_FOR_SHIPPING',
    'SHIPPED',
    'DELIVERED',
    'CANCELLED'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE offers
  ADD COLUMN IF NOT EXISTS fulfillment_status offer_fulfillment_status NOT NULL DEFAULT 'AWAITING_PAYMENT',
  ADD COLUMN IF NOT EXISTS prepared_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS verification_submitted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS ready_for_shipping_at TIMESTAMPTZ;

ALTER TABLE verification_documents
  ADD COLUMN IF NOT EXISTS offer_id UUID REFERENCES offers(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_offers_fulfillment_status ON offers(fulfillment_status);
CREATE INDEX IF NOT EXISTS idx_verification_documents_offer_id ON verification_documents(offer_id);

-- Backfill: accepted offers with successful payment -> IN_PREPARATION
UPDATE offers o
SET fulfillment_status = 'IN_PREPARATION'
WHERE o.status IN ('accepted', 'ACCEPTED')
  AND EXISTS (
    SELECT 1 FROM payment_transactions pt
    WHERE pt.offer_id = o.id AND pt.status = 'SUCCESS'
  )
  AND o.fulfillment_status = 'AWAITING_PAYMENT';

-- Sync from order status for single-merchant legacy rows (conservative)
UPDATE offers o
SET fulfillment_status = CASE ord.status::text
    WHEN 'PREPARATION' THEN 'IN_PREPARATION'::offer_fulfillment_status
    WHEN 'DELAYED_PREPARATION' THEN 'IN_PREPARATION'::offer_fulfillment_status
    WHEN 'PREPARED' THEN 'PREPARED'::offer_fulfillment_status
    WHEN 'VERIFICATION' THEN 'VERIFICATION'::offer_fulfillment_status
    WHEN 'CORRECTION_SUBMITTED' THEN 'VERIFICATION'::offer_fulfillment_status
    WHEN 'NON_MATCHING' THEN 'PREPARED'::offer_fulfillment_status
    WHEN 'VERIFICATION_SUCCESS' THEN 'VERIFICATION_SUCCESS'::offer_fulfillment_status
    WHEN 'READY_FOR_SHIPPING' THEN 'READY_FOR_SHIPPING'::offer_fulfillment_status
    WHEN 'PARTIALLY_SHIPPED' THEN
      CASE WHEN o.shipped_from_cart THEN 'SHIPPED'::offer_fulfillment_status
           ELSE 'READY_FOR_SHIPPING'::offer_fulfillment_status END
    WHEN 'SHIPPED' THEN 'SHIPPED'::offer_fulfillment_status
    WHEN 'DELIVERED' THEN 'DELIVERED'::offer_fulfillment_status
    ELSE o.fulfillment_status
  END
FROM orders ord
WHERE o.order_id = ord.id
  AND o.status IN ('accepted', 'ACCEPTED')
  AND EXISTS (
    SELECT 1 FROM payment_transactions pt
    WHERE pt.offer_id = o.id AND pt.status = 'SUCCESS'
  )
  AND ord.status::text NOT IN ('AWAITING_PAYMENT', 'AWAITING_SELECTION', 'COLLECTING_OFFERS', 'PARTIALLY_PAID');

UPDATE offers o
SET fulfillment_status = 'SHIPPED',
    ready_for_shipping_at = COALESCE(o.ready_for_shipping_at, o.shipped_from_cart_at, NOW())
WHERE o.shipped_from_cart = true
  AND o.fulfillment_status NOT IN ('SHIPPED', 'DELIVERED', 'CANCELLED');

-- Link verification docs to store's accepted offer when unambiguous
UPDATE verification_documents vd
SET offer_id = sub.offer_id
FROM (
  SELECT vd2.id AS doc_id, o.id AS offer_id
  FROM verification_documents vd2
  JOIN offers o ON o.order_id = vd2.order_id AND o.store_id = vd2.store_id
  WHERE vd2.offer_id IS NULL
    AND o.status IN ('accepted', 'ACCEPTED')
    AND (
      SELECT COUNT(*) FROM offers o2
      WHERE o2.order_id = vd2.order_id AND o2.store_id = vd2.store_id
        AND o2.status IN ('accepted', 'ACCEPTED')
    ) = 1
) sub
WHERE vd.id = sub.doc_id;
