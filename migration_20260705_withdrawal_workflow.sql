-- Withdrawal workflow 2026 (run manually on Supabase)
-- Statuses: PENDING | PROCESSING | COMPLETED | REJECTED | CANCELLED

ALTER TABLE withdrawal_requests ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
ALTER TABLE withdrawal_requests ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;
ALTER TABLE withdrawal_requests ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;
ALTER TABLE withdrawal_requests ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ;
ALTER TABLE withdrawal_requests ADD COLUMN IF NOT EXISTS cancelled_by UUID;

CREATE INDEX IF NOT EXISTS idx_withdrawal_active_user
  ON withdrawal_requests (user_id, status)
  WHERE status IN ('PENDING', 'PROCESSING');

CREATE INDEX IF NOT EXISTS idx_withdrawal_active_store
  ON withdrawal_requests (store_id, status)
  WHERE status IN ('PENDING', 'PROCESSING');

-- Migrate legacy statuses
UPDATE withdrawal_requests SET status = 'COMPLETED' WHERE status IN ('TRANSFERRED', 'APPROVED');
UPDATE withdrawal_requests SET status = 'PROCESSING' WHERE status = 'UNDER_REVIEW';
UPDATE withdrawal_requests SET completed_at = transfer_completed_at
  WHERE status = 'COMPLETED' AND completed_at IS NULL AND transfer_completed_at IS NOT NULL;

-- Merge stripeConnectEnabled + tier withdrawal limits into system_config.financial
DO $$
DECLARE
  cfg JSONB;
  fin JSONB;
  merged JSONB;
BEGIN
  SELECT setting_value INTO cfg
  FROM platform_settings
  WHERE setting_key = 'system_config';

  IF cfg IS NULL THEN
    cfg := '{}'::jsonb;
  END IF;

  fin := COALESCE(cfg->'financial', '{}'::jsonb);

  merged := fin
    || jsonb_build_object(
      'stripeConnectEnabled', COALESCE((fin->>'stripeConnectEnabled')::boolean, false)
    )
    || jsonb_build_object(
      'loyaltyTiers',
      COALESCE(fin->'loyaltyTiers', '{}'::jsonb)
        || jsonb_build_object(
          'BASIC',   COALESCE(fin->'loyaltyTiers'->'BASIC', '{}'::jsonb)   || '{"withdrawalMin": 100, "withdrawalMax": 2000}'::jsonb,
          'SILVER',  COALESCE(fin->'loyaltyTiers'->'SILVER', '{}'::jsonb)  || '{"withdrawalMin": 100, "withdrawalMax": 3000}'::jsonb,
          'GOLD',    COALESCE(fin->'loyaltyTiers'->'GOLD', '{}'::jsonb)    || '{"withdrawalMin": 100, "withdrawalMax": 5000}'::jsonb,
          'VIP',     COALESCE(fin->'loyaltyTiers'->'VIP', '{}'::jsonb)     || '{"withdrawalMin": 100, "withdrawalMax": 8000}'::jsonb,
          'PARTNER', COALESCE(fin->'loyaltyTiers'->'PARTNER', '{}'::jsonb) || '{"withdrawalMin": 100, "withdrawalMax": 10000}'::jsonb,
          'ELITE',   COALESCE(fin->'loyaltyTiers'->'ELITE', '{}'::jsonb)   || '{"withdrawalMin": 100, "withdrawalMax": 10000}'::jsonb
        )
    )
    || jsonb_build_object(
      'storeLoyaltyTiers',
      COALESCE(fin->'storeLoyaltyTiers', '{}'::jsonb)
        || jsonb_build_object(
          'BASIC',  COALESCE(fin->'storeLoyaltyTiers'->'BASIC', '{}'::jsonb)  || '{"withdrawalMin": 100, "withdrawalMax": 2000}'::jsonb,
          'SILVER', COALESCE(fin->'storeLoyaltyTiers'->'SILVER', '{}'::jsonb) || '{"withdrawalMin": 100, "withdrawalMax": 3000}'::jsonb,
          'GOLD',   COALESCE(fin->'storeLoyaltyTiers'->'GOLD', '{}'::jsonb)   || '{"withdrawalMin": 100, "withdrawalMax": 5000}'::jsonb,
          'VIP',    COALESCE(fin->'storeLoyaltyTiers'->'VIP', '{}'::jsonb)    || '{"withdrawalMin": 100, "withdrawalMax": 8000}'::jsonb,
          'ELITE',  COALESCE(fin->'storeLoyaltyTiers'->'ELITE', '{}'::jsonb)  || '{"withdrawalMin": 100, "withdrawalMax": 10000}'::jsonb
        )
    );

  INSERT INTO platform_settings (setting_key, setting_value, updated_at)
  VALUES ('system_config', jsonb_set(cfg, '{financial}', merged, true), NOW())
  ON CONFLICT (setting_key) DO UPDATE
  SET setting_value = jsonb_set(
        COALESCE(platform_settings.setting_value, '{}'::jsonb),
        '{financial}',
        merged,
        true
      ),
      updated_at = NOW();
END $$;

-- Realtime (skip if already added)
-- ALTER PUBLICATION supabase_realtime ADD TABLE withdrawal_requests;
