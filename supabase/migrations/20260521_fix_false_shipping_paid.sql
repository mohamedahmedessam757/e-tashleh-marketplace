-- Reset false "PAID" shipping on cases where no Stripe/wallet payment was recorded.
-- Run manually on Supabase after merchant-reported false positives.

UPDATE returns
SET shipping_payment_status = 'PENDING',
    shipping_payment_method = NULL,
    updated_at = NOW()
WHERE shipping_payee = 'MERCHANT'
  AND COALESCE(shipping_refund, 0) > 0
  AND shipping_payment_status = 'PAID'
  AND (shipping_payment_method IS NULL OR shipping_payment_method = '');

UPDATE disputes
SET shipping_payment_status = 'PENDING',
    shipping_payment_method = NULL,
    updated_at = NOW()
WHERE shipping_payee = 'MERCHANT'
  AND COALESCE(shipping_refund, 0) > 0
  AND shipping_payment_status = 'PAID'
  AND (shipping_payment_method IS NULL OR shipping_payment_method = '');
