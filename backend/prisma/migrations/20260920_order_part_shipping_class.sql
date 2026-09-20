-- Per-part customer shipping class (engine | gearbox | standard)
ALTER TABLE order_parts
  ADD COLUMN IF NOT EXISTS shipping_class TEXT;

COMMENT ON COLUMN order_parts.shipping_class IS 'Customer-declared logistics class: engine | gearbox | standard';
