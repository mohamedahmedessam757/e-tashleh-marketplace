-- ====================================================================
-- MODERN RETURN LOGISTICS & GOVERNANCE MIGRATION (2026.4)
-- Purpose: Add governance fields to returns and detailed logistics to waybills
-- Target: Supabase / PostgreSQL
-- ====================================================================

-- 1. ENHANCE RETURNS TABLE WITH GOVERNANCE FIELDS
-- Matching Dispute model for consistent adjudication records
ALTER TABLE "returns" ADD COLUMN IF NOT EXISTS "fault_party" TEXT;
ALTER TABLE "returns" ADD COLUMN IF NOT EXISTS "refund_amount" DECIMAL(14,2);
ALTER TABLE "returns" ADD COLUMN IF NOT EXISTS "shipping_refund" DECIMAL(14,2);
ALTER TABLE "returns" ADD COLUMN IF NOT EXISTS "stripe_fee" DECIMAL(14,2);

-- 2. ENHANCE SHIPPING_WAYBILLS WITH FULL LOGISTICS METADATA
-- Supports detailed sender info and round-trip shipping transparency
ALTER TABLE "shipping_waybills" ADD COLUMN IF NOT EXISTS "sender_name" TEXT;
ALTER TABLE "shipping_waybills" ADD COLUMN IF NOT EXISTS "sender_phone" TEXT;
ALTER TABLE "shipping_waybills" ADD COLUMN IF NOT EXISTS "sender_address" TEXT;
ALTER TABLE "shipping_waybills" ADD COLUMN IF NOT EXISTS "sender_city" TEXT;
ALTER TABLE "shipping_waybills" ADD COLUMN IF NOT EXISTS "sender_country" TEXT;
ALTER TABLE "shipping_waybills" ADD COLUMN IF NOT EXISTS "shipping_refund" DECIMAL(14,2);

-- 3. AUDIT TRAIL (OPTIONAL BUT RECOMMENDED)
COMMENT ON COLUMN "returns"."shipping_refund" IS 'Stores the round-trip shipping cost determined during admin adjudication';
COMMENT ON COLUMN "shipping_waybills"."shipping_refund" IS 'Mirror of the return case shipping refund for waybill rendering';
