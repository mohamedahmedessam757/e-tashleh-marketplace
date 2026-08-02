-- CLOSE_COMPLETE_REFUND is 21 chars; fault_party was VARCHAR(20) → Prisma P2000 on verdict.
-- Widen on both case tables to match adjudication fault codes (2026).

ALTER TABLE "disputes"
  ALTER COLUMN "fault_party" TYPE VARCHAR(40);

ALTER TABLE "returns"
  ALTER COLUMN "fault_party" TYPE VARCHAR(40);
