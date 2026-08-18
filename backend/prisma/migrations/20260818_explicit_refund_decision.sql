ALTER TABLE "returns"
  ADD COLUMN IF NOT EXISTS "final_refund_decision" VARCHAR(40),
  ADD COLUMN IF NOT EXISTS "final_customer_refund_amount" DECIMAL(14,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "refund_execution_status" VARCHAR(32) NOT NULL DEFAULT 'NOT_REQUIRED';

ALTER TABLE "disputes"
  ADD COLUMN IF NOT EXISTS "final_refund_decision" VARCHAR(40),
  ADD COLUMN IF NOT EXISTS "final_customer_refund_amount" DECIMAL(14,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "refund_execution_status" VARCHAR(32) NOT NULL DEFAULT 'NOT_REQUIRED';

UPDATE "returns"
SET
  "final_refund_decision" = CASE
    WHEN COALESCE("refund_amount", 0) > 0 OR COALESCE("net_refund_amount", 0) > 0 THEN 'REFUND_CUSTOMER'
    ELSE 'NO_CUSTOMER_REFUND'
  END,
  "final_customer_refund_amount" = COALESCE("refund_amount", "net_refund_amount", 0),
  "refund_execution_status" = CASE
    WHEN COALESCE("refund_amount", 0) > 0 OR COALESCE("net_refund_amount", 0) > 0 THEN
      CASE
        WHEN "status" = 'REFUNDED' THEN 'SUCCEEDED'
        WHEN "verdict_issued_at" IS NOT NULL THEN 'PENDING'
        ELSE 'NOT_REQUIRED'
      END
    ELSE 'NOT_REQUIRED'
  END
WHERE "final_refund_decision" IS NULL;

UPDATE "disputes"
SET
  "final_refund_decision" = CASE
    WHEN COALESCE("refund_amount", 0) > 0 OR COALESCE("net_refund_amount", 0) > 0 THEN 'REFUND_CUSTOMER'
    ELSE 'NO_CUSTOMER_REFUND'
  END,
  "final_customer_refund_amount" = COALESCE("refund_amount", "net_refund_amount", 0),
  "refund_execution_status" = CASE
    WHEN COALESCE("refund_amount", 0) > 0 OR COALESCE("net_refund_amount", 0) > 0 THEN
      CASE
        WHEN "status" = 'REFUNDED' THEN 'SUCCEEDED'
        WHEN "verdict_issued_at" IS NOT NULL THEN 'PENDING'
        ELSE 'NOT_REQUIRED'
      END
    ELSE 'NOT_REQUIRED'
  END
WHERE "final_refund_decision" IS NULL;
