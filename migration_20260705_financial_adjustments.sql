-- Credit/debit notes — financial adjustments (Phase 12)
-- Run manually on Supabase

CREATE TABLE IF NOT EXISTS financial_adjustments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  adjustment_number VARCHAR(64) NOT NULL UNIQUE,
  invoice_id UUID,
  order_id UUID,
  target_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  target_store_id UUID REFERENCES stores(id) ON DELETE SET NULL,
  type VARCHAR(16) NOT NULL CHECK (type IN ('CREDIT', 'DEBIT')),
  amount NUMERIC(14, 2) NOT NULL CHECK (amount > 0),
  currency VARCHAR(8) NOT NULL DEFAULT 'AED',
  reason TEXT NOT NULL,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_financial_adjustments_invoice_id
  ON financial_adjustments (invoice_id);

CREATE INDEX IF NOT EXISTS idx_financial_adjustments_order_id
  ON financial_adjustments (order_id);

CREATE INDEX IF NOT EXISTS idx_financial_adjustments_target_user_id
  ON financial_adjustments (target_user_id);

CREATE INDEX IF NOT EXISTS idx_financial_adjustments_target_store_id
  ON financial_adjustments (target_store_id);

CREATE INDEX IF NOT EXISTS idx_financial_adjustments_created_at
  ON financial_adjustments (created_at DESC);
