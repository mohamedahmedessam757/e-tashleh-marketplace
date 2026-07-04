-- ============================================================
-- Migration: Partial Shipping (الشحن الجزئي) for Assembly Cart
-- Date: 2026-05-08
-- Description: Adds per-offer shipping tracking columns to 
--              support partial shipping from the assembly cart.
-- ============================================================

-- 1. Add shipped_from_cart flag to offers table
ALTER TABLE offers ADD COLUMN IF NOT EXISTS shipped_from_cart BOOLEAN DEFAULT false;

-- 2. Add timestamp for when the offer was shipped from cart
ALTER TABLE offers ADD COLUMN IF NOT EXISTS shipped_from_cart_at TIMESTAMPTZ DEFAULT NULL;

-- 3. Add reference to the shipment created for this cart batch
ALTER TABLE offers ADD COLUMN IF NOT EXISTS cart_shipment_id UUID DEFAULT NULL;

-- 4. Performance index: fast filtering of unshipped offers in cart queries
CREATE INDEX IF NOT EXISTS idx_offers_shipped_from_cart 
  ON offers(shipped_from_cart) WHERE shipped_from_cart = false;

-- 5. Foreign key: link cart_shipment_id to shipments table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'fk_offers_cart_shipment'
  ) THEN
    ALTER TABLE offers ADD CONSTRAINT fk_offers_cart_shipment 
      FOREIGN KEY (cart_shipment_id) REFERENCES shipments(id) ON DELETE SET NULL;
  END IF;
END $$;

-- ============================================================
-- Verification: Run this to confirm columns exist
-- SELECT column_name, data_type, column_default 
--   FROM information_schema.columns 
--   WHERE table_name = 'offers' 
--   AND column_name IN ('shipped_from_cart', 'shipped_from_cart_at', 'cart_shipment_id');
-- ============================================================
