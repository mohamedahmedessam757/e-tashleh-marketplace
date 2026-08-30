-- Violation type for merchant voluntary offer withdrawal (after free 15m window).
-- Idempotent: safe to re-run.

INSERT INTO violation_types (
  code,
  name_ar,
  name_en,
  description_ar,
  description_en,
  target_type,
  points,
  fine_amount,
  decay_days,
  severity,
  loyalty_impact,
  is_active
)
VALUES (
  'VOLUNTARY_OFFER_WITHDRAW',
  'انسحاب طوعي من العرض',
  'Voluntary Offer Withdrawal',
  'تسجيل مخالفة عند انسحاب التاجر من عرض بعد انتهاء مهلة التعديل المجانية (15 دقيقة). يمنع إعادة التقديم على نفس القطعة.',
  'Violation recorded when a merchant voluntarily withdraws an offer after the free 15-minute edit window. Blocks re-bidding on the same part.',
  'MERCHANT',
  5,
  0,
  30,
  'NORMAL',
  'NONE',
  true
)
ON CONFLICT (code) DO UPDATE SET
  name_ar = EXCLUDED.name_ar,
  name_en = EXCLUDED.name_en,
  description_ar = EXCLUDED.description_ar,
  description_en = EXCLUDED.description_en,
  is_active = true,
  updated_at = NOW();
