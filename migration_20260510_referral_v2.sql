-- ==========================================
-- Migration: Referral System v2 (1% rate + 6-month window)
-- Date: 2026-05-10
-- Run manually in Supabase SQL Editor
-- ==========================================

BEGIN;

-- 1. Add referral_starts_at column (when referral relationship began)
ALTER TABLE "public"."users"
    ADD COLUMN IF NOT EXISTS "referral_starts_at" TIMESTAMPTZ;

-- 2. Backfill: existing referred users get their original signup date
UPDATE "public"."users"
SET "referral_starts_at" = "created_at"
WHERE "referred_by_id" IS NOT NULL
  AND "referral_starts_at" IS NULL;

-- 3. Performance indexes (2026 standards for millions of rows)
CREATE INDEX IF NOT EXISTS idx_users_referred_by_starts_at
    ON "public"."users"("referred_by_id", "referral_starts_at")
    WHERE "referred_by_id" IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_wallet_tx_user_type_created
    ON "public"."wallet_transactions"("user_id", "transaction_type", "created_at");

-- 4. Optional: a CHECK constraint to prevent retroactive tampering
-- (skipped to allow admin manual fixes if needed)

COMMIT;

-- ==========================================
-- Verification queries (run separately to confirm)
-- ==========================================
-- 1) Should return 0 (no orphan referred users without start date):
-- SELECT COUNT(*) FROM users WHERE referred_by_id IS NOT NULL AND referral_starts_at IS NULL;

-- 2) Inspect the new index existence:
-- SELECT indexname FROM pg_indexes
-- WHERE tablename IN ('users','wallet_transactions')
--   AND indexname IN ('idx_users_referred_by_starts_at','idx_wallet_tx_user_type_created');
