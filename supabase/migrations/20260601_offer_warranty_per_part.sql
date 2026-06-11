-- Per-offer warranty lifecycle (Phase 2)
ALTER TABLE offers
  ADD COLUMN IF NOT EXISTS warranty_active_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS warranty_end_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_offers_warranty_end_at ON offers (warranty_end_at)
  WHERE warranty_end_at IS NOT NULL;

COMMENT ON COLUMN offers.warranty_active_at IS 'When per-offer warranty started (after offer completion with warranty)';
COMMENT ON COLUMN offers.warranty_end_at IS 'When per-offer warranty expires';
