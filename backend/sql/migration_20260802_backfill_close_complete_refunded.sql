-- Remediate CLOSE_COMPLETE_REFUND cases that were incorrectly left as COMPLETED / RESOLVED.
-- Safe to re-run: only touches rows with fault_party = CLOSE_COMPLETE_REFUND and a verdict.

-- 1) Orders linked to close-complete disputes → REFUNDED
UPDATE orders o
SET status = 'REFUNDED',
    updated_at = NOW()
FROM disputes d
WHERE d.order_id = o.id
  AND d.fault_party = 'CLOSE_COMPLETE_REFUND'
  AND d.verdict_issued_at IS NOT NULL
  AND o.status IS DISTINCT FROM 'REFUNDED';

-- 2) Orders linked to close-complete returns → REFUNDED
UPDATE orders o
SET status = 'REFUNDED',
    updated_at = NOW()
FROM returns r
WHERE r.order_id = o.id
  AND r.fault_party = 'CLOSE_COMPLETE_REFUND'
  AND r.verdict_issued_at IS NOT NULL
  AND o.status IS DISTINCT FROM 'REFUNDED';

-- 3) Case status → REFUNDED
UPDATE disputes
SET status = 'REFUNDED',
    updated_at = NOW()
WHERE fault_party = 'CLOSE_COMPLETE_REFUND'
  AND verdict_issued_at IS NOT NULL
  AND status IS DISTINCT FROM 'REFUNDED';

UPDATE returns
SET status = 'REFUNDED',
    updated_at = NOW()
WHERE fault_party = 'CLOSE_COMPLETE_REFUND'
  AND verdict_issued_at IS NOT NULL
  AND status IS DISTINCT FROM 'REFUNDED';

-- 4) Mark paid invoices on those orders as REFUNDED when a payment was already refunded
UPDATE invoices i
SET status = 'REFUNDED'
FROM orders o
JOIN payment_transactions p ON p.order_id = o.id
WHERE i.order_id = o.id
  AND i.payment_id = p.id
  AND p.status = 'REFUNDED'
  AND i.status IS DISTINCT FROM 'REFUNDED'
  AND EXISTS (
      SELECT 1 FROM disputes d
      WHERE d.order_id = o.id
        AND d.fault_party = 'CLOSE_COMPLETE_REFUND'
        AND d.verdict_issued_at IS NOT NULL
      UNION ALL
      SELECT 1 FROM returns r
      WHERE r.order_id = o.id
        AND r.fault_party = 'CLOSE_COMPLETE_REFUND'
        AND r.verdict_issued_at IS NOT NULL
  );
