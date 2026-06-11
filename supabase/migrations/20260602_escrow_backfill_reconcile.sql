-- Reconcile escrow backfill rows (Phase 3 M3)
-- Run on staging first; idempotent.

-- RELEASING is a valid transient status during Stripe transfer (no enum migration required).

-- Reset incorrectly backfilled RELEASED rows where no Stripe transfer occurred
UPDATE escrow_transactions et
SET status = 'HELD',
    updated_at = NOW()
FROM payment_transactions pt
WHERE et.payment_id = pt.id
  AND et.status = 'RELEASED'
  AND pt.stripe_transfer_id IS NULL;

-- Align merchant_amount with holdFunds formula (unit_price = merchant net; shipping separate)
UPDATE escrow_transactions et
SET merchant_amount = pt.unit_price,
    shipping_amount = COALESCE(NULLIF(et.shipping_amount, 0), pt.shipping_cost, 0),
    updated_at = NOW()
FROM payment_transactions pt
WHERE et.payment_id = pt.id
  AND et.merchant_amount IS DISTINCT FROM pt.unit_price;
