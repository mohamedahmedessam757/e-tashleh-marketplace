-- Per-part field verification tasks
ALTER TABLE verification_tasks
  ADD COLUMN IF NOT EXISTS offer_id UUID REFERENCES offers(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_verification_tasks_offer_id ON verification_tasks(offer_id);
CREATE INDEX IF NOT EXISTS idx_verification_tasks_order_offer ON verification_tasks(order_id, offer_id);
