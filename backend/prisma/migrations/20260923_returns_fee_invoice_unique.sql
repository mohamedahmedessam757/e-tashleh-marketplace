-- Allow RETURNS_FEE case invoices alongside the sale COMMISSION/GATEWAY_FEE docs
-- for the same payment_id. Sale uniqueness still holds for non-returns-fee rows.

DROP INDEX IF EXISTS invoices_payment_type_unique;

CREATE UNIQUE INDEX IF NOT EXISTS invoices_payment_type_unique
  ON invoices (payment_id, invoice_type)
  WHERE payment_id IS NOT NULL
    AND invoice_type <> 'SHIPPING'
    AND invoice_type <> 'REFUND'
    AND (shipping_batch_key IS NULL OR shipping_batch_key NOT LIKE 'RETURNS_FEE:%');

-- One returns-fee doc per batch key (RETURNS_FEE:{caseId}:COMMISSION|SHIPPING)
CREATE UNIQUE INDEX IF NOT EXISTS invoices_returns_fee_batch_unique
  ON invoices (shipping_batch_key)
  WHERE shipping_batch_key IS NOT NULL
    AND shipping_batch_key LIKE 'RETURNS_FEE:%';
