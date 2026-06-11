-- Run AFTER 20260531_per_offer_resolution_lifecycle.sql (separate transaction required)
-- PostgreSQL: new enum values must be committed before use in DML.

UPDATE offers o
SET
    completed_at = COALESCE(o.completed_at, ord.updated_at),
    resolution_locked = true,
    fulfillment_status = 'COMPLETED'
FROM orders ord
WHERE o.order_id = ord.id
  AND o.fulfillment_status = 'DELIVERED'
  AND ord.status IN ('COMPLETED', 'WARRANTY_ACTIVE', 'WARRANTY_EXPIRED')
  AND o.resolution_locked = false;
