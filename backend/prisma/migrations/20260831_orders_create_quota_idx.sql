-- Speed up rolling 24h create-quota lookups (exclude cancelled via query filter)
CREATE INDEX IF NOT EXISTS orders_customer_request_created_idx
  ON orders (customer_id, request_type, created_at DESC);
