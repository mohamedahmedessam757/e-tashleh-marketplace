-- Per-offer resolution lifecycle for multi-item orders (2026)

-- 1. Add PARTIALLY_DELIVERED to order_status enum
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum e
        JOIN pg_type t ON e.enumtypid = t.oid
        WHERE t.typname = 'order_status' AND e.enumlabel = 'PARTIALLY_DELIVERED'
    ) THEN
        ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'PARTIALLY_DELIVERED' AFTER 'SHIPPED';
    END IF;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- 2. Add COMPLETED to offer_fulfillment_status enum
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum e
        JOIN pg_type t ON e.enumtypid = t.oid
        WHERE t.typname = 'offer_fulfillment_status' AND e.enumlabel = 'COMPLETED'
    ) THEN
        ALTER TYPE offer_fulfillment_status ADD VALUE IF NOT EXISTS 'COMPLETED' AFTER 'DELIVERED';
    END IF;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- 3. Per-offer delivery/completion timestamps
ALTER TABLE offers
    ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS resolution_locked BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_offers_delivered_at ON offers (delivered_at)
    WHERE delivered_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_offers_resolution_locked ON offers (resolution_locked)
    WHERE resolution_locked = false;

-- 4. Remove unique constraint on escrow_transactions.order_id (allow per-offer escrow)
ALTER TABLE escrow_transactions
    DROP CONSTRAINT IF EXISTS escrow_transactions_order_id_key;

-- Keep index for lookups
CREATE INDEX IF NOT EXISTS idx_escrow_transactions_order_id ON escrow_transactions (order_id);

-- 5. Backfill delivered_at from order delivered_at for already-delivered offers
UPDATE offers o
SET delivered_at = ord.delivered_at
FROM orders ord
WHERE o.order_id = ord.id
  AND o.fulfillment_status = 'DELIVERED'
  AND o.delivered_at IS NULL
  AND ord.delivered_at IS NOT NULL;

-- NOTE: Backfill to fulfillment_status = 'COMPLETED' is in the NEXT migration file
-- (20260531b_per_offer_backfill_completed.sql) because PostgreSQL requires enum
-- values to be committed before they can be used in UPDATE statements.
