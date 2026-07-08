-- Extend orderDurations in system_config with SLA fields for all order phases.
-- Run manually in Supabase SQL Editor (safe merge — does not overwrite existing values).

UPDATE platform_settings
SET setting_value = jsonb_set(
  setting_value,
  '{orderDurations}',
  COALESCE(setting_value->'orderDurations', '{}'::jsonb) || '{
    "offerCollectionHours": 24,
    "offerSelectionHours": 24,
    "preparationHours": 48,
    "delayedPreparationGraceHours": 24,
    "shippingSlaHours": 72,
    "correctionPeriodHours": 48,
    "nonMatchingGraceMinutes": 48
  }'::jsonb,
  true
),
updated_at = NOW()
WHERE setting_key = 'system_config';
