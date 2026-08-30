-- Account recovery redesign: case types, email fields, resume token, optional newPhone
ALTER TABLE "account_recovery_requests"
  ADD COLUMN IF NOT EXISTS "case_type" TEXT NOT NULL DEFAULT 'LOST_PHONE',
  ADD COLUMN IF NOT EXISTS "old_email" TEXT,
  ADD COLUMN IF NOT EXISTS "new_email" TEXT,
  ADD COLUMN IF NOT EXISTS "rejection_reason" TEXT,
  ADD COLUMN IF NOT EXISTS "resume_token_hash" TEXT,
  ADD COLUMN IF NOT EXISTS "resume_token_expires_at" TIMESTAMPTZ;

ALTER TABLE "account_recovery_requests"
  ALTER COLUMN "new_phone" DROP NOT NULL;

CREATE INDEX IF NOT EXISTS "account_recovery_requests_case_type_idx"
  ON "account_recovery_requests" ("case_type");
