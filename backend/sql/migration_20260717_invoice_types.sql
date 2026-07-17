-- =============================================================================
-- Invoice document types (MASTER / PART / SHIPPING / COMMISSION)
-- RUN MANUALLY in Supabase SQL Editor (local DB connection may be unavailable)
-- =============================================================================

-- 1) Columns
ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS invoice_type TEXT NOT NULL DEFAULT 'MASTER',
  ADD COLUMN IF NOT EXISTS invoice_group_id UUID NULL,
  ADD COLUMN IF NOT EXISTS parent_invoice_id UUID NULL REFERENCES invoices(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS shipping_batch_key TEXT NULL,
  ADD COLUMN IF NOT EXISTS line_items JSONB NULL,
  ADD COLUMN IF NOT EXISTS part_name_snapshot TEXT NULL,
  ADD COLUMN IF NOT EXISTS carrier_name_snapshot TEXT NULL,
  ADD COLUMN IF NOT EXISTS platform_legal_name_en TEXT NULL,
  ADD COLUMN IF NOT EXISTS platform_legal_name_ar TEXT NULL;

-- 2) Check constraint
DO $$ BEGIN
  ALTER TABLE invoices
    ADD CONSTRAINT invoices_invoice_type_check
    CHECK (invoice_type IN ('MASTER', 'PART', 'SHIPPING', 'COMMISSION'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 3) Backfill existing rows as MASTER; group id = row id
UPDATE invoices
SET
  invoice_type = COALESCE(NULLIF(invoice_type, ''), 'MASTER'),
  invoice_group_id = COALESCE(invoice_group_id, id)
WHERE invoice_group_id IS NULL OR invoice_type IS NULL;

-- 4) Partial unique: one MASTER/PART/COMMISSION per payment
CREATE UNIQUE INDEX IF NOT EXISTS invoices_payment_type_unique
  ON invoices (payment_id, invoice_type)
  WHERE payment_id IS NOT NULL AND invoice_type <> 'SHIPPING';

-- 5) Partial unique: one SHIPPING per shipping_batch_key
CREATE UNIQUE INDEX IF NOT EXISTS invoices_shipping_batch_type_unique
  ON invoices (shipping_batch_key, invoice_type)
  WHERE invoice_type = 'SHIPPING' AND shipping_batch_key IS NOT NULL;

-- 6) Indexes
CREATE INDEX IF NOT EXISTS invoices_order_type_idx ON invoices (order_id, invoice_type);
CREATE INDEX IF NOT EXISTS invoices_group_id_idx ON invoices (invoice_group_id);
CREATE INDEX IF NOT EXISTS invoices_shipping_batch_key_idx ON invoices (shipping_batch_key);

-- 7) Typed invoice number generator (shares invoice_seq)
CREATE OR REPLACE FUNCTION generate_typed_invoice_number(p_type TEXT DEFAULT 'MASTER')
RETURNS TEXT AS $$
DECLARE
    prefix TEXT;
    date_part TEXT := to_char(now(), 'YYMM');
    seq INT;
BEGIN
    CASE upper(COALESCE(p_type, 'MASTER'))
        WHEN 'PART' THEN prefix := 'INV-P-';
        WHEN 'SHIPPING' THEN prefix := 'INV-S-';
        WHEN 'COMMISSION' THEN prefix := 'INV-C-';
        ELSE prefix := 'INV-';
    END CASE;
    SELECT nextval('invoice_seq') INTO seq;
    RETURN prefix || date_part || '-' || LPAD(seq::TEXT, 5, '0');
END;
$$ LANGUAGE plpgsql;

-- Keep legacy generator as MASTER-compatible wrapper
CREATE OR REPLACE FUNCTION generate_invoice_number()
RETURNS TEXT AS $$
BEGIN
    RETURN generate_typed_invoice_number('MASTER');
END;
$$ LANGUAGE plpgsql;
