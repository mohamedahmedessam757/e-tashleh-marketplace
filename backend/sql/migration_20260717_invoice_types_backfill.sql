-- =============================================================================
-- OPTIONAL backfill: create PART / COMMISSION / SHIPPING siblings for MASTER rows
-- that do not yet have typed siblings. Idempotent. RUN MANUALLY in Supabase.
-- =============================================================================

-- PART siblings
INSERT INTO invoices (
  id, invoice_number, order_id, payment_id, customer_id,
  subtotal, shipping, commission, total, currency, status, issued_at,
  invoice_type, invoice_group_id, parent_invoice_id,
  part_name_snapshot, platform_legal_name_en, platform_legal_name_ar
)
SELECT
  gen_random_uuid(),
  generate_typed_invoice_number('PART'),
  m.order_id,
  m.payment_id,
  m.customer_id,
  m.subtotal,
  0,
  0,
  m.subtotal,
  m.currency,
  m.status,
  m.issued_at,
  'PART',
  COALESCE(m.invoice_group_id, m.id),
  m.id,
  m.part_name_snapshot,
  m.platform_legal_name_en,
  m.platform_legal_name_ar
FROM invoices m
WHERE m.invoice_type = 'MASTER'
  AND NOT EXISTS (
    SELECT 1 FROM invoices s
    WHERE s.payment_id = m.payment_id AND s.invoice_type = 'PART'
  );

-- COMMISSION siblings
INSERT INTO invoices (
  id, invoice_number, order_id, payment_id, customer_id,
  subtotal, shipping, commission, total, currency, status, issued_at,
  invoice_type, invoice_group_id, parent_invoice_id,
  part_name_snapshot, platform_legal_name_en, platform_legal_name_ar
)
SELECT
  gen_random_uuid(),
  generate_typed_invoice_number('COMMISSION'),
  m.order_id,
  m.payment_id,
  m.customer_id,
  0,
  0,
  m.commission,
  m.commission,
  m.currency,
  m.status,
  m.issued_at,
  'COMMISSION',
  COALESCE(m.invoice_group_id, m.id),
  m.id,
  m.part_name_snapshot,
  m.platform_legal_name_en,
  m.platform_legal_name_ar
FROM invoices m
WHERE m.invoice_type = 'MASTER'
  AND NOT EXISTS (
    SELECT 1 FROM invoices s
    WHERE s.payment_id = m.payment_id AND s.invoice_type = 'COMMISSION'
  );

-- SHIPPING siblings (skip zero shipping; separate key = payment_id)
INSERT INTO invoices (
  id, invoice_number, order_id, payment_id, customer_id,
  subtotal, shipping, commission, total, currency, status, issued_at,
  invoice_type, invoice_group_id, parent_invoice_id,
  shipping_batch_key, line_items,
  part_name_snapshot, carrier_name_snapshot,
  platform_legal_name_en, platform_legal_name_ar
)
SELECT
  gen_random_uuid(),
  generate_typed_invoice_number('SHIPPING'),
  m.order_id,
  m.payment_id,
  m.customer_id,
  0,
  m.shipping,
  0,
  m.shipping,
  m.currency,
  m.status,
  m.issued_at,
  'SHIPPING',
  COALESCE(m.invoice_group_id, m.id),
  m.id,
  m.payment_id::text,
  jsonb_build_array(
    jsonb_build_object(
      'paymentId', m.payment_id,
      'partName', COALESCE(m.part_name_snapshot, 'Part'),
      'amount', m.shipping
    )
  ),
  m.part_name_snapshot,
  m.carrier_name_snapshot,
  m.platform_legal_name_en,
  m.platform_legal_name_ar
FROM invoices m
WHERE m.invoice_type = 'MASTER'
  AND COALESCE(m.shipping, 0) > 0
  AND NOT EXISTS (
    SELECT 1 FROM invoices s
    WHERE s.invoice_type = 'SHIPPING'
      AND s.shipping_batch_key = m.payment_id::text
  );
