-- Financial settlement snapshots (Phase 8)
-- Run manually on Supabase

CREATE TABLE IF NOT EXISTS financial_settlements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_balance NUMERIC(14, 2) NOT NULL DEFAULT 0,
  escrow_held NUMERIC(14, 2) NOT NULL DEFAULT 0,
  transferable_amount NUMERIC(14, 2) NOT NULL DEFAULT 0,
  transferred_amount NUMERIC(14, 2) NOT NULL DEFAULT 0,
  reconciliation_delta NUMERIC(14, 2) NOT NULL DEFAULT 0,
  db_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  run_by UUID REFERENCES users(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_financial_settlements_created_at
  ON financial_settlements (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_financial_settlements_run_by
  ON financial_settlements (run_by);
