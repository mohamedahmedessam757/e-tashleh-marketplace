-- Records when an order first became DELIVERED (return/dispute countdown + cron auto-complete).
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ NULL;

COMMENT ON COLUMN orders.delivered_at IS 'First DELIVERED transition; used for 24h return/dispute and auto-complete.';

-- Best-effort backfill so existing DELIVERED rows use a stable baseline (cron/UI).
UPDATE orders
SET delivered_at = updated_at
WHERE status = 'DELIVERED' AND delivered_at IS NULL;
