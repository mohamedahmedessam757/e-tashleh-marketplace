-- Monthly offer deletion governance + bidding restriction on stores
ALTER TABLE "stores"
  ADD COLUMN IF NOT EXISTS "monthly_offer_deletion_count" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "monthly_offer_deletion_month" TEXT,
  ADD COLUMN IF NOT EXISTS "offer_bidding_restricted_until" TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS "offer_bidding_restriction_reason" TEXT;

CREATE INDEX IF NOT EXISTS "stores_offer_bidding_restricted_until_idx"
  ON "stores" ("offer_bidding_restricted_until");
