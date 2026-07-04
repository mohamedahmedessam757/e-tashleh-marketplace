-- ==========================================
-- Migration: Earn Monthly Income (Loyalty & Referrals)
-- Date: 2026-05-03
-- ==========================================

-- 1. Ensure LoyaltyTier Enum exists
DO $$ BEGIN
    CREATE TYPE loyalty_tier AS ENUM ('BASIC', 'SILVER', 'GOLD', 'VIP', 'PARTNER');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Add Loyalty & Referral columns to users table
ALTER TABLE "public"."users" 
    ADD COLUMN IF NOT EXISTS "customer_balance" NUMERIC(14,2) ,
    ADD COLUMN IF NOT EXISTS "loyalty_tier" loyalty_tier,
    ADD COLUMN IF NOT EXISTS "total_spent" NUMERIC(14,2),
    ADD COLUMN IF NOT EXISTS "loyalty_points" INTEGER,
    ADD COLUMN IF NOT EXISTS "referral_count" INTEGER,
    ADD COLUMN IF NOT EXISTS "referral_code" TEXT UNIQUE,
    ADD COLUMN IF NOT EXISTS "referred_by_id" UUID REFERENCES "public"."users"("id");

-- 3. Update WalletTransaction Table to support new transaction types
-- Ensure transaction_type column exists and has proper defaults
ALTER TABLE "public"."wallet_transactions" 
    ALTER COLUMN "transaction_type" SET DEFAULT 'payment';

-- 4. Indexes for performance (2026 Standards)
CREATE INDEX IF NOT EXISTS idx_users_referral_code ON "public"."users"("referral_code");
CREATE INDEX IF NOT EXISTS idx_users_referred_by ON "public"."users"("referred_by_id");
CREATE INDEX IF NOT EXISTS idx_wallet_tx_type ON "public"."wallet_transactions"("transaction_type");

-- 5. Trigger for Real-time Balance Protection (Optional but recommended)
-- Ensures balance never goes negative unless explicitly allowed
CREATE OR REPLACE FUNCTION check_balance_protection()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.customer_balance < 0 THEN
        RAISE EXCEPTION 'Insufficient balance in customer wallet';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_balance_protection ON "public"."users";
CREATE TRIGGER trg_balance_protection
    BEFORE UPDATE OF customer_balance ON "public"."users"
    FOR EACH ROW
    WHEN (NEW.customer_balance < 0)
    EXECUTE FUNCTION check_balance_protection();
