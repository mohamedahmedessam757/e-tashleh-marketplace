-- Add ACCOUNTANT role to user_role enum (Phase 13)
-- Run manually on Supabase

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'user_role'
      AND e.enumlabel = 'ACCOUNTANT'
  ) THEN
    ALTER TYPE user_role ADD VALUE 'ACCOUNTANT';
  END IF;
END $$;
