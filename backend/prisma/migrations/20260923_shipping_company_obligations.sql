-- Shipping company obligations ledger (carrier liability after adjudication)

ALTER TABLE "platform_wallet"
  ADD COLUMN IF NOT EXISTS "shipping_company_liability_balance" DECIMAL(14, 2) NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS "shipping_company_obligations" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "case_id" uuid NOT NULL UNIQUE,
  "case_type" text NOT NULL,
  "order_id" uuid NOT NULL,
  "order_number" text,
  "amount_original" DECIMAL(14, 2) NOT NULL,
  "amount_remaining" DECIMAL(14, 2) NOT NULL,
  "amount_settled" DECIMAL(14, 2) NOT NULL DEFAULT 0,
  "currency" text NOT NULL DEFAULT 'AED',
  "status" text NOT NULL DEFAULT 'OPEN',
  "shipping_amount" DECIMAL(14, 2) NOT NULL DEFAULT 0,
  "stripe_fees_amount" DECIMAL(14, 2) NOT NULL DEFAULT 0,
  "refund_amount" DECIMAL(14, 2) NOT NULL DEFAULT 0,
  "notes" text,
  "metadata" jsonb DEFAULT '{}',
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "shipping_company_obligations_status_idx"
  ON "shipping_company_obligations" ("status");
CREATE INDEX IF NOT EXISTS "shipping_company_obligations_order_id_idx"
  ON "shipping_company_obligations" ("order_id");
CREATE INDEX IF NOT EXISTS "shipping_company_obligations_created_at_idx"
  ON "shipping_company_obligations" ("created_at");

CREATE TABLE IF NOT EXISTS "shipping_company_settlements" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "obligation_id" uuid NOT NULL REFERENCES "shipping_company_obligations"("id") ON DELETE CASCADE,
  "amount" DECIMAL(14, 2) NOT NULL,
  "currency" text NOT NULL DEFAULT 'AED',
  "admin_id" uuid NOT NULL REFERENCES "users"("id"),
  "note" text,
  "invoice_id" uuid,
  "wallet_transaction_id" uuid,
  "metadata" jsonb DEFAULT '{}',
  "created_at" timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "shipping_company_settlements_obligation_id_idx"
  ON "shipping_company_settlements" ("obligation_id");
CREATE INDEX IF NOT EXISTS "shipping_company_settlements_admin_id_idx"
  ON "shipping_company_settlements" ("admin_id");
CREATE INDEX IF NOT EXISTS "shipping_company_settlements_created_at_idx"
  ON "shipping_company_settlements" ("created_at");
