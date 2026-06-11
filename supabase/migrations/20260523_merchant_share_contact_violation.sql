-- Merchant off-platform contact sharing (chat filter)
INSERT INTO violation_types (id, code, name_ar, name_en, description_ar, description_en, target_type, points, fine_amount, decay_days, is_active, severity, loyalty_impact)
SELECT gen_random_uuid(),
  'MERCHANT_SHARE_CONTACT',
  'مشاركة تواصل خارج المنصة (تاجر)',
  'Merchant off-platform contact sharing',
  'مشاركة رقم هاتف أو طلب التواصل خارج المنصة في الشات',
  'Sharing phone number or requesting off-platform contact in chat',
  'MERCHANT',
  15,
  0,
  60,
  true,
  'NORMAL',
  'NONE'
WHERE NOT EXISTS (SELECT 1 FROM violation_types vt WHERE vt.code = 'MERCHANT_SHARE_CONTACT');
