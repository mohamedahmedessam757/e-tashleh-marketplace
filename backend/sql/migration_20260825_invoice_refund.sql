CREATE SEQUENCE IF NOT EXISTS invoice_seq START 1;

-- =============================================================================
-- Add REFUND invoice document type (customer refund proof; negative total)
-- RUN MANUALLY in Supabase SQL Editor if CLI migrate is unavailable
-- =============================================================================

-- 1) Drop and recreate check constraint to include REFUND (+ keep GATEWAY_FEE)
DO $$ BEGIN
  ALTER TABLE invoices DROP CONSTRAINT IF EXISTS invoices_invoice_type_check;
EXCEPTION WHEN undefined_object THEN NULL;
END $$;

ALTER TABLE invoices
  ADD CONSTRAINT invoices_invoice_type_check
  CHECK (invoice_type IN ('MASTER', 'PART', 'SHIPPING', 'COMMISSION', 'GATEWAY_FEE', 'REFUND'));

-- 2) Typed invoice number generator — add INV-R- prefix
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
        WHEN 'REFUND' THEN prefix := 'INV-R-';
        ELSE prefix := 'INV-';
    END CASE;
    SELECT nextval('invoice_seq') INTO seq;
    RETURN prefix || date_part || '-' || LPAD(seq::TEXT, 5, '0');
END;
$$ LANGUAGE plpgsql;

-- 3) Allow multiple REFUND rows per payment (partial refunds) — like SHIPPING
DROP INDEX IF EXISTS invoices_payment_type_unique;
CREATE UNIQUE INDEX IF NOT EXISTS invoices_payment_type_unique
  ON invoices (payment_id, invoice_type)
  WHERE payment_id IS NOT NULL
    AND invoice_type <> 'SHIPPING'
    AND invoice_type <> 'REFUND';

-- 4) Partial unique: one REFUND per shipping_batch_key (REFUND:{stripeRefundId})
CREATE UNIQUE INDEX IF NOT EXISTS invoices_refund_batch_type_unique
  ON invoices (shipping_batch_key, invoice_type)
  WHERE invoice_type = 'REFUND' AND shipping_batch_key IS NOT NULL;
