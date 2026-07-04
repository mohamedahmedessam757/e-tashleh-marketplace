-- ========================================================
-- Phase 1: Admin Resolution Center - Data Layer Enrichment
-- ========================================================

-- Ensure columns and indices exist for performance at high scale (2026 Ready)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='disputes' AND column_name='usage_condition') THEN
        ALTER TABLE "public"."disputes" ADD COLUMN "usage_condition" TEXT;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_returns_usage_condition ON "public"."returns"("usage_condition");
CREATE INDEX IF NOT EXISTS idx_disputes_usage_condition ON "public"."disputes"("usage_condition");
CREATE INDEX IF NOT EXISTS idx_returns_merchant_resp ON "public"."returns"("merchant_response_text");
CREATE INDEX IF NOT EXISTS idx_disputes_merchant_resp ON "public"."disputes"("merchant_response_text");

-- Add comments for audit transparency
COMMENT ON COLUMN "public"."returns"."usage_condition" IS 'Snapshot of item condition provided by customer during return request';
COMMENT ON COLUMN "public"."disputes"."usage_condition" IS 'Snapshot of item condition provided by customer during dispute escalation';
COMMENT ON COLUMN "public"."returns"."merchant_evidence" IS 'Visual evidence uploaded by merchant in response to return/dispute';
