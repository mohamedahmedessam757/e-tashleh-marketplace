-- Waybill batch fields for grouped-order shipping (one waybill per customer selection batch)
ALTER TABLE shipping_waybills
  ADD COLUMN IF NOT EXISTS bundled_offer_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS shipment_id UUID REFERENCES shipments(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS issue_mode TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_shipping_waybills_shipment_id_unique ON shipping_waybills(shipment_id) WHERE shipment_id IS NOT NULL;
