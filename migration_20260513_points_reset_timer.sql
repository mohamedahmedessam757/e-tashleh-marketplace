-- Phase 7: Points Reset Timer Column
-- Adds a timestamp column to track when loyalty points were last reset.
-- The customer's TIER is NOT affected, only loyaltyPoints reset to 0.

ALTER TABLE "users" 
ADD COLUMN IF NOT EXISTS "points_last_reset_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Backfill existing users: set their reset point to NOW so the 6-month countdown starts fresh
UPDATE "users" SET "points_last_reset_at" = NOW() WHERE "points_last_reset_at" IS NULL;

-- Optional: Postgres index for future CRON-based reset queries
CREATE INDEX IF NOT EXISTS "idx_users_points_reset" ON "users" ("points_last_reset_at") WHERE "loyalty_points" > 0;
