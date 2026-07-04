-- =====================================================================
-- Realtime Replication Verification (Rewards Page)
-- Run in Supabase Dashboard → SQL Editor
-- Purpose: ensure RewardsPage Supabase channels receive live INSERT events
-- Date: 2026-05-10
-- =====================================================================

-- 1) Check current state of the supabase_realtime publication
SELECT schemaname, tablename
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime'
  AND tablename IN ('wallet_transactions', 'users')
ORDER BY tablename;

-- Expected: two rows. If a table is missing, run the matching ALTER below.

-- 2) Enable replication for wallet_transactions (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'wallet_transactions'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.wallet_transactions';
  END IF;
END $$;

-- 3) Enable replication for users (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'users'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.users';
  END IF;
END $$;

-- 4) Re-check (should now return both rows)
SELECT schemaname, tablename
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime'
  AND tablename IN ('wallet_transactions', 'users')
ORDER BY tablename;
