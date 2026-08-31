-- Idempotency key for order create (nullable for legacy rows)
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS client_request_id TEXT;

-- Partial unique: multiple NULLs allowed; same customer cannot reuse a non-null key
CREATE UNIQUE INDEX IF NOT EXISTS orders_customer_client_request_id_key
  ON orders (customer_id, client_request_id)
  WHERE client_request_id IS NOT NULL;
