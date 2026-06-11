-- Backfill missing escrow_transactions for successful per-offer payments (Phase 2)
INSERT INTO escrow_transactions (
  payment_id,
  order_id,
  merchant_amount,
  commission_amount,
  shipping_amount,
  gateway_fee,
  status,
  created_at,
  updated_at
)
SELECT
  pt.id,
  pt.order_id,
  pt.unit_price,
  pt.commission,
  pt.shipping_cost,
  0,
  CASE
    WHEN o.fulfillment_status IN ('COMPLETED') AND o.resolution_locked = true THEN 'RELEASED'
    WHEN EXISTS (
      SELECT 1 FROM returns rr
      WHERE rr.offer_id = pt.offer_id AND rr.status NOT IN ('CANCELLED', 'REJECTED', 'CLOSED')
    ) OR EXISTS (
      SELECT 1 FROM disputes d
      WHERE d.offer_id = pt.offer_id AND d.status NOT IN ('RESOLVED', 'CLOSED', 'CANCELLED')
    ) THEN 'FROZEN'
    ELSE 'HELD'
  END,
  COALESCE(pt.paid_at, pt.created_at),
  NOW()
FROM payment_transactions pt
JOIN offers o ON o.id = pt.offer_id
LEFT JOIN escrow_transactions et ON et.payment_id = pt.id
WHERE pt.status = 'SUCCESS'
  AND et.id IS NULL;
