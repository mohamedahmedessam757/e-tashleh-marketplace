-- Earn Income CMS schema patch — RUN MANUALLY after migration_20260707
-- Merges full earnIncome structure without overwriting existing hero fields

UPDATE platform_settings
SET setting_value = jsonb_set(
  setting_value,
  '{general,earnIncome}',
  COALESCE(setting_value->'general'->'earnIncome', '{}'::jsonb) || jsonb_build_object(
    'enabled', COALESCE((setting_value->'general'->'earnIncome'->>'enabled')::boolean, true),
    'navBadgeAr', COALESCE(setting_value->'general'->'earnIncome'->>'navBadgeAr', 'نظام الأرباح الذكي 2026'),
    'navBadgeEn', COALESCE(setting_value->'general'->'earnIncome'->>'navBadgeEn', 'SMART PROFIT ENGINE 2026'),
    'ctaAr', COALESCE(setting_value->'general'->'earnIncome'->>'ctaAr', 'ابدأ الربح الآن'),
    'ctaEn', COALESCE(setting_value->'general'->'earnIncome'->>'ctaEn', 'Start Earning Now'),
    'intro', COALESCE(setting_value->'general'->'earnIncome'->'intro', '{}'::jsonb),
    'howToStart', COALESCE(setting_value->'general'->'earnIncome'->'howToStart', jsonb_build_object('steps', '[]'::jsonb)),
    'first', COALESCE(setting_value->'general'->'earnIncome'->'first', '{}'::jsonb),
    'second', COALESCE(setting_value->'general'->'earnIncome'->'second', '{}'::jsonb),
    'timing', COALESCE(setting_value->'general'->'earnIncome'->'timing', '{}'::jsonb),
    'whyDifferent', COALESCE(setting_value->'general'->'earnIncome'->'whyDifferent', '{}'::jsonb),
    'imagine', COALESCE(setting_value->'general'->'earnIncome'->'imagine', '{}'::jsonb),
    'statsLabels', COALESCE(setting_value->'general'->'earnIncome'->'statsLabels', '{}'::jsonb)
  ),
  true
),
updated_at = NOW()
WHERE setting_key = 'system_config';
