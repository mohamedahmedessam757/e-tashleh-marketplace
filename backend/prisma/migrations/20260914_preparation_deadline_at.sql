-- Persist sticky preparation SLA deadline (48h window for PREPARATION).
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS preparation_deadline_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS orders_preparation_deadline_at_idx
  ON orders (preparation_deadline_at)
  WHERE preparation_deadline_at IS NOT NULL;
