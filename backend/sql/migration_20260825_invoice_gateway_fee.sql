CREATE SEQUENCE IF NOT EXISTS invoice_seq START 1;

-- =============================================================================
-- Add GATEWAY_FEE invoice document type (Stripe processing fee proof)
-- RUN MANUALLY in Supabase SQL Editor if CLI migrate is unavailable
-- =============================================================================

-- 1) Drop and recreate check constraint to include GATEWAY_FEE
DO $$ BEGIN
  ALTER TABLE invoices DROP CONSTRAINT IF EXISTS invoices_invoice_type_check;
EXCEPTION WHEN undefined_object THEN NULL;
END $$;

ALTER TABLE invoices
  ADD CONSTRAINT invoices_invoice_type_check
  CHECK (invoice_type IN ('MASTER', 'PART', 'SHIPPING', 'COMMISSION', 'GATEWAY_FEE'));

-- 2) Typed invoice number generator — add INV-G- prefix
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
        WHEN 'GATEWAY_FEE' THEN prefix := 'INV-G-';
        ELSE prefix := 'INV-';
    END CASE;
    SELECT nextval('invoice_seq') INTO seq;
    RETURN prefix || date_part || '-' || LPAD(seq::TEXT, 5, '0');
END;
$$ LANGUAGE plpgsql;
