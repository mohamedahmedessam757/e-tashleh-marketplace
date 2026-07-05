-- Seed / merge financial config into platform_settings (run manually on Supabase)
-- Values match the live system defaults (logistics_setup + backend financial constants).

DO $$
DECLARE
  cfg JSONB;
  fin JSONB;
  merged JSONB;
  wl JSONB;
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
      'commissionRate', COALESCE((fin->>'commissionRate')::int, 25),
      'minCommission', COALESCE((fin->>'minCommission')::int, 100),
      'gatewayFeePercent', COALESCE((fin->>'gatewayFeePercent')::numeric, 0),
      'escrowHoldHoursCustomer', COALESCE((fin->>'escrowHoldHoursCustomer')::int, 24),
      'escrowHoldHoursMerchant', COALESCE((fin->>'escrowHoldHoursMerchant')::int, 24),
      'payoutDelayDaysCustomer', COALESCE((fin->>'payoutDelayDaysCustomer')::int, 0),
      'payoutDelayDaysMerchant', COALESCE((fin->>'payoutDelayDaysMerchant')::int, 0),
      'loyaltyPointsRate', COALESCE((fin->>'loyaltyPointsRate')::numeric, 0),
      'minWithdrawalCustomer', COALESCE((fin->>'minWithdrawalCustomer')::int, 100),
      'minWithdrawalMerchant', COALESCE((fin->>'minWithdrawalMerchant')::int, 100),
      'supportedCurrencies', COALESCE(fin->'supportedCurrencies', '["AED"]'::jsonb),
      'currencyActivatedAt', COALESCE(
        fin->'currencyActivatedAt',
        jsonb_build_object('AED', to_jsonb(NOW()::timestamptz))
      ),
      'customerTierThresholds', COALESCE(
        fin->'customerTierThresholds',
        '{
          "SILVER": 1000,
          "GOLD": 3000,
          "VIP": 10000,
          "PARTNER": 20000
        }'::jsonb
      ),
      'loyaltyTiers', COALESCE(
        fin->'loyaltyTiers',
        '{
          "BASIC":   {"percent": 0.02, "monthlyCap": 2000},
          "SILVER":  {"percent": 0.03, "monthlyCap": 2000},
          "GOLD":    {"percent": 0.04, "monthlyCap": 2000},
          "VIP":     {"percent": 0.05, "monthlyCap": 5000},
          "PARTNER": {"percent": 0.06, "monthlyCap": -1},
          "ELITE":   {"percent": 0.06, "monthlyCap": 5000}
        }'::jsonb
      ),
      'storeLoyaltyTiers', COALESCE(
        fin->'storeLoyaltyTiers',
        '{
          "BASIC":  {"rate": 0.02, "pointsRequired": 0,  "minRating": 0,   "maxViolations": 999, "minOrders": 0,  "minAgeDays": 0},
          "SILVER": {"rate": 0.03, "pointsRequired": 35, "minRating": 3.5, "maxViolations": 40,  "minOrders": 0,  "minAgeDays": 0},
          "GOLD":   {"rate": 0.04, "pointsRequired": 55, "minRating": 4.0, "maxViolations": 25,  "minOrders": 10, "minAgeDays": 30},
          "VIP":    {"rate": 0.05, "pointsRequired": 70, "minRating": 4.5, "maxViolations": 10,  "minOrders": 50, "minAgeDays": 0},
          "ELITE":  {"rate": 0.05, "pointsRequired": 100,"minRating": 5.0, "maxViolations": 0,   "minOrders": 100,"minAgeDays": 90}
        }'::jsonb
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

  SELECT setting_value INTO wl
  FROM platform_settings
  WHERE setting_key = 'withdrawal_limits';

  IF wl IS NULL THEN
    wl := jsonb_build_object(
      'min', COALESCE((merged->>'minWithdrawalCustomer')::int, 100),
      'max', 10000,
      'customerMin', COALESCE((merged->>'minWithdrawalCustomer')::int, 100),
      'merchantMin', COALESCE((merged->>'minWithdrawalMerchant')::int, 100)
    );
  ELSE
    wl := wl || jsonb_build_object(
      'customerMin', COALESCE((wl->>'customerMin')::int, (merged->>'minWithdrawalCustomer')::int, 100),
      'merchantMin', COALESCE((wl->>'merchantMin')::int, (merged->>'minWithdrawalMerchant')::int, 100),
      'min', COALESCE((wl->>'min')::int, (merged->>'minWithdrawalCustomer')::int, 100)
    );
  END IF;

  INSERT INTO platform_settings (setting_key, setting_value, updated_at)
  VALUES ('withdrawal_limits', wl, NOW())
  ON CONFLICT (setting_key) DO UPDATE
  SET setting_value = wl,
      updated_at = NOW();
END $$;

CREATE INDEX IF NOT EXISTS idx_wallet_tx_type_created
  ON wallet_transactions (transaction_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_logs_entity_timestamp
  ON audit_logs (entity, timestamp DESC);
