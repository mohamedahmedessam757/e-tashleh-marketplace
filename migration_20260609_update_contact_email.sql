-- Run manually in Supabase SQL Editor
UPDATE platform_settings
SET setting_value = jsonb_set(
  setting_value,
  '{general,contactEmail}',
  '"shop@e-tashleh.shop"'
)
WHERE setting_key = 'system_config';
