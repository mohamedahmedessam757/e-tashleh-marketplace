-- =====================================================================
-- Merchant performance levels v1 — run manually in Supabase SQL Editor
-- Date: 2026-05-10
-- - Renames store tier enum: BRONZE→BASIC, PLATINUM→VIP, adds ELITE
-- - Adds subscription + performance columns on stores
-- - Backfills completed_orders_count from COMPLETED orders
-- - Enables supabase_realtime on public.stores
-- =====================================================================
-- Resolve the loyalty enum type from the actual column (avoids mixing
-- store_loyalty_tier vs StoreLoyaltyTier when both names exist in pg_type).

DO $$
DECLARE
  tier_oid OID;
  typ_sql TEXT;
BEGIN
  SELECT a.atttypid INTO tier_oid
  FROM pg_catalog.pg_attribute a
  JOIN pg_catalog.pg_class c ON c.oid = a.attrelid
  JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
    AND c.relname = 'stores'
    AND a.attname = 'loyalty_tier'
    AND NOT a.attisdropped;

  IF tier_oid IS NULL THEN
    RAISE EXCEPTION 'Could not resolve oid of stores.loyalty_tier';
  END IF;

  typ_sql := pg_catalog.format_type(tier_oid, NULL);

  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_enum e
    WHERE e.enumtypid = tier_oid AND e.enumlabel = 'ELITE'
  ) THEN
    EXECUTE format('ALTER TYPE %s ADD VALUE ''ELITE''', typ_sql);
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_catalog.pg_enum e
    WHERE e.enumtypid = tier_oid AND e.enumlabel = 'BRONZE'
  ) THEN
    EXECUTE format('ALTER TYPE %s RENAME VALUE ''BRONZE'' TO ''BASIC''', typ_sql);
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_catalog.pg_enum e
    WHERE e.enumtypid = tier_oid AND e.enumlabel = 'PLATINUM'
  ) THEN
    EXECUTE format('ALTER TYPE %s RENAME VALUE ''PLATINUM'' TO ''VIP''', typ_sql);
  END IF;

  EXECUTE format(
    'ALTER TABLE stores ALTER COLUMN loyalty_tier SET DEFAULT %L::%s',
    'BASIC',
    typ_sql
  );
END $$;

DO $$
BEGIN
  CREATE TYPE store_subscription_tier AS ENUM ('NONE', 'STANDARD', 'PREMIUM');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE stores ADD COLUMN IF NOT EXISTS subscription_tier store_subscription_tier NOT NULL DEFAULT 'NONE';
ALTER TABLE stores ADD COLUMN IF NOT EXISTS subscription_active BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE stores ADD COLUMN IF NOT EXISTS subscription_expires_at TIMESTAMPTZ;
ALTER TABLE stores ADD COLUMN IF NOT EXISTS completed_orders_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE stores ADD COLUMN IF NOT EXISTS avg_response_score NUMERIC(3, 2) NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_stores_loyalty_tier_rating ON stores (loyalty_tier, rating);

UPDATE stores s
SET completed_orders_count = sub.cnt
FROM (
  SELECT store_id, COUNT(*)::INT AS cnt
  FROM orders
  WHERE status = 'COMPLETED' AND store_id IS NOT NULL
  GROUP BY store_id
) sub
WHERE s.id = sub.store_id;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'stores'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.stores;
  END IF;
END $$;
