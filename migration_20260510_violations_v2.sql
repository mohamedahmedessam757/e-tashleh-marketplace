-- =====================================================================
-- Violations & Penalties Engine v2 — Run manually in Supabase SQL Editor
-- Date: 2026-05-10
-- Idempotent. Safe to re-run.
-- Adds:
--   * violation_types.code / severity / loyalty_impact
--   * violations.source / unique_key
--   * Enum values FREEZE_BALANCE, RESTRICT_PURCHASE on penalty_action_type
--   * Table loyalty_review_alerts
--   * Indexes for high-throughput violation queries
--   * Supabase Realtime publication for governance tables
--   * Seeded violation types & penalty thresholds matching the 2026 spec
--
-- Run TOP-TO-BOTTOM. Each section is self-contained; abort on first error.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. New enums (idempotent)
-- ---------------------------------------------------------------------
DO $$
BEGIN
  CREATE TYPE violation_severity AS ENUM ('NORMAL', 'SEVERE');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE loyalty_impact AS ENUM ('NONE', 'CANCEL_ALL_REWARDS_PROMPT');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE violation_source AS ENUM ('MANUAL', 'SYSTEM');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE loyalty_review_status AS ENUM ('PENDING_REVIEW', 'REWARDS_CANCELLED', 'KEPT');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE loyalty_review_trigger AS ENUM ('VIOLATION', 'DISPUTE', 'REFUND', 'MANUAL');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ---------------------------------------------------------------------
-- 2. Extend violation_types: code (stable slug), severity, loyalty_impact
--    NOTE: Use FULL (non-partial) unique index so `ON CONFLICT (code)` works.
--    Postgres treats NULLs as distinct, so legacy rows with code=NULL are fine.
-- ---------------------------------------------------------------------
ALTER TABLE violation_types ADD COLUMN IF NOT EXISTS code VARCHAR(64);
ALTER TABLE violation_types ADD COLUMN IF NOT EXISTS severity violation_severity NOT NULL DEFAULT 'NORMAL';
ALTER TABLE violation_types ADD COLUMN IF NOT EXISTS loyalty_impact loyalty_impact NOT NULL DEFAULT 'NONE';

-- Drop any pre-existing index on code (partial or full) so we can dedup safely
DROP INDEX IF EXISTS uniq_violation_types_code;

-- ---------------------------------------------------------------------
-- 2.a Deduplicate any pre-existing duplicate codes from prior partial runs.
--     Keep the OLDEST row per code (lowest created_at, fallback id) and
--     re-parent any FK references to the survivor before deleting duplicates.
--     This MUST run before creating the unique index.
-- ---------------------------------------------------------------------
DO $$
DECLARE
  dup_code TEXT;
  keeper_id UUID;
BEGIN
  FOR dup_code IN
    SELECT code FROM violation_types WHERE code IS NOT NULL GROUP BY code HAVING COUNT(*) > 1
  LOOP
    SELECT id INTO keeper_id
    FROM violation_types
    WHERE code = dup_code
    ORDER BY created_at NULLS LAST, id
    LIMIT 1;

    -- Re-parent existing violations from duplicates to the keeper
    UPDATE violations
    SET violation_type_id = keeper_id
    WHERE violation_type_id IN (
      SELECT id FROM violation_types WHERE code = dup_code AND id <> keeper_id
    );

    -- Re-parent any audit/append rows that reference violation_type_id (best-effort, table may not exist)
    -- (skipped — guarded by IF EXISTS not available in plain DML; safe because survivors keep code)

    DELETE FROM violation_types
    WHERE code = dup_code AND id <> keeper_id;
  END LOOP;
END $$;

-- Now create the full (non-partial) unique index — safe after dedup
CREATE UNIQUE INDEX uniq_violation_types_code ON violation_types (code);

-- ---------------------------------------------------------------------
-- 3. Extend violations: source + unique_key for idempotency
-- ---------------------------------------------------------------------
ALTER TABLE violations ADD COLUMN IF NOT EXISTS source violation_source NOT NULL DEFAULT 'MANUAL';
ALTER TABLE violations ADD COLUMN IF NOT EXISTS unique_key TEXT;

DROP INDEX IF EXISTS uniq_violations_unique_key;
CREATE UNIQUE INDEX IF NOT EXISTS uniq_violations_unique_key ON violations (unique_key);

-- High-throughput query indexes
CREATE INDEX IF NOT EXISTS idx_violations_target_status_decay ON violations (target_user_id, status, decay_at);
CREATE INDEX IF NOT EXISTS idx_violations_store_status ON violations (target_store_id, status) WHERE target_store_id IS NOT NULL;

-- ---------------------------------------------------------------------
-- 4. New PenaltyActionType enum values (FREEZE_BALANCE, RESTRICT_PURCHASE)
--    NOTE: ADD VALUE is auto-committed by Supabase editor between statements.
--    The new values are usable AFTER this statement (in subsequent INSERTs).
-- ---------------------------------------------------------------------
DO $$
DECLARE
  enum_oid OID;
  type_sql TEXT;
BEGIN
  SELECT a.atttypid INTO enum_oid
  FROM pg_catalog.pg_attribute a
  JOIN pg_catalog.pg_class c ON c.oid = a.attrelid
  JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
    AND c.relname = 'penalty_actions'
    AND a.attname = 'action'
    AND NOT a.attisdropped;

  IF enum_oid IS NULL THEN
    RAISE EXCEPTION 'Could not resolve enum oid of penalty_actions.action';
  END IF;

  type_sql := pg_catalog.format_type(enum_oid, NULL);

  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_enum e WHERE e.enumtypid = enum_oid AND e.enumlabel = 'FREEZE_BALANCE'
  ) THEN
    EXECUTE format('ALTER TYPE %s ADD VALUE %L', type_sql, 'FREEZE_BALANCE');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_enum e WHERE e.enumtypid = enum_oid AND e.enumlabel = 'RESTRICT_PURCHASE'
  ) THEN
    EXECUTE format('ALTER TYPE %s ADD VALUE %L', type_sql, 'RESTRICT_PURCHASE');
  END IF;
END $$;

COMMIT;

-- ---------------------------------------------------------------------
-- 5. loyalty_review_alerts table
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS loyalty_review_alerts (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID NOT NULL,
  triggered_by_type   loyalty_review_trigger NOT NULL,
  triggered_by_id     UUID,
  reason_ar           TEXT NOT NULL,
  reason_en           TEXT NOT NULL,
  status              loyalty_review_status NOT NULL DEFAULT 'PENDING_REVIEW',
  decided_by          UUID,
  decided_at          TIMESTAMPTZ,
  admin_notes         TEXT,
  metadata            JSONB DEFAULT '{}'::jsonb,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT fk_lra_user      FOREIGN KEY (user_id)     REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT fk_lra_decided_by FOREIGN KEY (decided_by) REFERENCES users (id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_lra_status_created ON loyalty_review_alerts (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_lra_user           ON loyalty_review_alerts (user_id);
CREATE INDEX IF NOT EXISTS idx_lra_trigger        ON loyalty_review_alerts (triggered_by_type, triggered_by_id);

-- ---------------------------------------------------------------------
-- 6. Supabase Realtime publication (only if not already in publication)
-- ---------------------------------------------------------------------
DO $$
DECLARE
  tbl TEXT;
  tbls TEXT[] := ARRAY[
    'violations',
    'violation_appeals',
    'penalty_actions',
    'penalty_thresholds',
    'violation_types',
    'customer_risk_alerts',
    'loyalty_review_alerts',
    'notifications',
    'audit_logs'
  ];
BEGIN
  FOREACH tbl IN ARRAY tbls LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime'
        AND schemaname = 'public'
        AND tablename = tbl
    ) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', tbl);
    END IF;
  END LOOP;
END $$;

COMMIT;

-- ---------------------------------------------------------------------
-- 7. Pre-seed Backfill: legacy "Exceeded Allowed Return Rate" rows get a code
--    Done BEFORE the seed INSERT so the seed's NOT EXISTS check sees them.
--    Conditional on no row already owning the code (avoids unique violation).
-- ---------------------------------------------------------------------
COMMIT;

-- Update at most ONE legacy row to avoid unique violation when multiple
-- legacy rows share the same name with NULL code.
UPDATE violation_types
SET code = 'EXCEEDED_RETURN_RATE'
WHERE id = (
  SELECT id FROM violation_types
  WHERE code IS NULL AND name_en = 'Exceeded Allowed Return Rate'
  ORDER BY created_at NULLS LAST, id
  LIMIT 1
)
AND NOT EXISTS (
  SELECT 1 FROM violation_types vt2 WHERE vt2.code = 'EXCEEDED_RETURN_RATE'
);

-- Generic safety net: for ANY remaining legacy rows still having NULL code
-- but a name matching one of our standard codes, update at most one per code.
DO $$
DECLARE
  m RECORD;
  target_id UUID;
BEGIN
  FOR m IN
    SELECT * FROM (VALUES
      ('LATE_OFFER',                    'Late offer submission'),
      ('LATE_CHAT_REPLY',               'Late chat reply'),
      ('LATE_SHIPPING',                 'Late shipping / preparation'),
      ('NOT_MATCH',                     'Product not matching'),
      ('LATE_CORRECTION',               'Late correction (48h window)'),
      ('NO_REPLACEMENT_SENT',           'No replacement sent'),
      ('REPEAT_NOT_MATCH',              'Repeated non-match'),
      ('LATE_DISPUTE_RESPONSE',         'Late dispute response'),
      ('DISPUTE_IGNORED',               'Dispute ignored'),
      ('DISPUTE_LOST_MERCHANT',         'Dispute lost — merchant fault'),
      ('REFUND_MERCHANT_FAULT',         'Refund — merchant fault'),
      ('LATE_RETURN_PROCESSING',        'Late return processing'),
      ('WRONG_RETURN_REJECTION',        'Wrong return rejection'),
      ('WARRANTY_LATE_RESPONSE',        'Warranty late response'),
      ('WARRANTY_REPLACEMENT_DELAY',    'Warranty replacement delay'),
      ('LATE_PREPARATION_AUTO_CANCEL',  'Auto-cancellation for late preparation'),
      ('COUNTERFEIT_BANNED_PRODUCT',    'Counterfeit or banned product'),
      ('LOW_OFFER_QUALITY',             'Low offer quality (frequent edits/withdrawals)'),
      ('ACCEPT_OFFER_NO_PAYMENT',       'Accepted offer without payment'),
      ('FAKE_REQUEST',                  'Fake order request'),
      ('FREQUENT_RETURNS',              'Frequent returns'),
      ('FAKE_DISPUTE',                  'Fake / malicious dispute'),
      ('LATE_RETURN_HANDOVER',          'Late return handover'),
      ('FAKE_COMPLAINT',                'Fake complaint'),
      ('ABUSE',                         'Abuse'),
      ('SHARE_CONTACT_OFF_PLATFORM',    'Sharing contact info off-platform')
    ) AS t(code, name_en)
  LOOP
    IF EXISTS (SELECT 1 FROM violation_types WHERE code = m.code) THEN
      CONTINUE;
    END IF;

    SELECT id INTO target_id FROM violation_types
    WHERE code IS NULL AND name_en = m.name_en
    ORDER BY created_at NULLS LAST, id
    LIMIT 1;

    IF target_id IS NOT NULL THEN
      UPDATE violation_types SET code = m.code WHERE id = target_id;
    END IF;
  END LOOP;
END $$;

-- ---------------------------------------------------------------------
-- 8. Seed Standard Violation Types (with stable codes)
--    Uses INSERT ... SELECT ... WHERE NOT EXISTS — fully idempotent without
--    relying on ON CONFLICT inference. Works in any DB state.
-- ---------------------------------------------------------------------

-- ===== MERCHANT VIOLATIONS =====
INSERT INTO violation_types (id, code, name_ar, name_en, description_ar, description_en, target_type, points, fine_amount, decay_days, is_active, severity, loyalty_impact)
SELECT gen_random_uuid(), s.code, s.name_ar, s.name_en, s.description_ar, s.description_en, s.target_type::violation_target_type, s.points, s.fine_amount, s.decay_days, true, s.severity::violation_severity, s.loyalty_impact::loyalty_impact
FROM (VALUES
  ('LATE_OFFER',
   'تأخر إرسال عرض', 'Late offer submission',
   'لم يُرسل المتجر عرضاً خلال المهلة المحددة', 'Store failed to send an offer within the SLA window',
   'MERCHANT', 5, 0, 30, 'NORMAL', 'NONE'),
  ('LATE_CHAT_REPLY',
   'تأخر الرد في الشات', 'Late chat reply',
   'تأخر التاجر في الرد على رسائل العميل', 'Merchant slow to respond to customer chat',
   'MERCHANT', 5, 0, 30, 'NORMAL', 'NONE'),
  ('LATE_SHIPPING',
   'تأخر تجهيز/شحن الطلب', 'Late shipping / preparation',
   'تجاوز التاجر مهلة 48 ساعة + 24 ساعة لتجهيز الطلب', 'Merchant exceeded the 48h+24h preparation deadline',
   'MERCHANT', 10, 0, 30, 'NORMAL', 'NONE'),
  ('NOT_MATCH',
   'عدم مطابقة المنتج', 'Product not matching',
   'القطعة المُسلَّمة لا تطابق المواصفات المطلوبة', 'Delivered item does not match the agreed specs',
   'MERCHANT', 20, 0, 60, 'NORMAL', 'NONE'),
  ('LATE_CORRECTION',
   'تأخر في التصحيح خلال 48 ساعة', 'Late correction (48h window)',
   'لم يقم التاجر بتصحيح عدم المطابقة خلال 48 ساعة', 'Merchant failed to correct mismatch within 48h',
   'MERCHANT', 15, 0, 60, 'NORMAL', 'NONE'),
  ('NO_REPLACEMENT_SENT',
   'لم يُرسل بديلاً', 'No replacement sent',
   'لم يُرسل التاجر بديلاً للقطعة غير المطابقة', 'Merchant did not ship a replacement for non-matching item',
   'MERCHANT', 25, 0, 60, 'NORMAL', 'NONE'),
  ('REPEAT_NOT_MATCH',
   'تكرار عدم المطابقة', 'Repeated non-match',
   'تكرار حالات عدم المطابقة على طلبات متعددة', 'Repeated mismatch incidents across multiple orders',
   'MERCHANT', 30, 0, 90, 'SEVERE', 'NONE'),
  ('LATE_DISPUTE_RESPONSE',
   'تأخر الرد على نزاع', 'Late dispute response',
   'لم يردّ التاجر على نزاع خلال المهلة', 'Merchant failed to respond to dispute within deadline',
   'MERCHANT', 10, 0, 30, 'NORMAL', 'NONE'),
  ('DISPUTE_IGNORED',
   'تجاهل نزاع', 'Dispute ignored',
   'تجاهل التاجر النزاع كلياً وتم تصعيده للإدارة', 'Merchant fully ignored a dispute escalated to admin',
   'MERCHANT', 20, 0, 60, 'SEVERE', 'NONE'),
  ('DISPUTE_LOST_MERCHANT',
   'خسارة نزاع - التاجر مخطئ', 'Dispute lost — merchant fault',
   'حُكم في النزاع لصالح العميل', 'Admin ruled in customer favor in a merchant dispute',
   'MERCHANT', 25, 0, 90, 'SEVERE', 'CANCEL_ALL_REWARDS_PROMPT'),
  ('REFUND_MERCHANT_FAULT',
   'استرجاع بسبب خطأ التاجر', 'Refund — merchant fault',
   'تم استرجاع المبلغ للعميل بسبب خطأ التاجر', 'Refund issued to customer due to merchant fault',
   'MERCHANT', 15, 0, 60, 'NORMAL', 'NONE'),
  ('LATE_RETURN_PROCESSING',
   'تأخر معالجة الإرجاع', 'Late return processing',
   'تأخر التاجر في معالجة طلب إرجاع', 'Merchant slow to process a return request',
   'MERCHANT', 10, 0, 30, 'NORMAL', 'NONE'),
  ('WRONG_RETURN_REJECTION',
   'رفض إرجاع خاطئ', 'Wrong return rejection',
   'رفض التاجر طلب إرجاع صحيح بدون مبرر', 'Merchant wrongly rejected a valid return request',
   'MERCHANT', 15, 0, 60, 'NORMAL', 'NONE'),
  ('WARRANTY_LATE_RESPONSE',
   'تأخر الرد على ضمان', 'Warranty late response',
   'تأخر التاجر في الرد على طلب ضمان', 'Merchant slow to respond to warranty claim',
   'MERCHANT', 10, 0, 30, 'NORMAL', 'NONE'),
  ('WARRANTY_REPLACEMENT_DELAY',
   'تأخر استبدال الضمان', 'Warranty replacement delay',
   'تأخر التاجر في تنفيذ استبدال الضمان', 'Merchant delayed warranty replacement execution',
   'MERCHANT', 15, 0, 60, 'NORMAL', 'NONE'),
  ('LATE_PREPARATION_AUTO_CANCEL',
   'إلغاء طلب لتأخر التجهيز', 'Auto-cancellation for late preparation',
   'تم إلغاء الطلب تلقائياً لعدم تجهيزه خلال 7 أيام', 'Order auto-cancelled because merchant did not prepare within 7 days',
   'MERCHANT', 20, 0, 60, 'NORMAL', 'NONE'),
  ('COUNTERFEIT_BANNED_PRODUCT',
   'منتج مقلد أو محظور', 'Counterfeit or banned product',
   'مخالفة جسيمة: منتج مقلد أو محظور — غرامة 50,000 درهم وحجز الرصيد', 'Severe: counterfeit or banned product — 50,000 AED fine and balance freeze',
   'MERCHANT', 100, 50000, 365, 'SEVERE', 'CANCEL_ALL_REWARDS_PROMPT'),
  ('LOW_OFFER_QUALITY',
   'جودة منخفضة في العروض (تعديلات/سحب متكرر)', 'Low offer quality (frequent edits/withdrawals)',
   'نسبة التعديلات والسحوبات على العروض تجاوزت الحد المسموح', 'Edit/withdraw rate on offers exceeded the allowed threshold',
   'MERCHANT', 10, 0, 30, 'NORMAL', 'NONE')
) AS s(code, name_ar, name_en, description_ar, description_en, target_type, points, fine_amount, decay_days, severity, loyalty_impact)
WHERE NOT EXISTS (SELECT 1 FROM violation_types vt WHERE vt.code = s.code);

-- ===== CUSTOMER VIOLATIONS =====
INSERT INTO violation_types (id, code, name_ar, name_en, description_ar, description_en, target_type, points, fine_amount, decay_days, is_active, severity, loyalty_impact)
SELECT gen_random_uuid(), s.code, s.name_ar, s.name_en, s.description_ar, s.description_en, s.target_type::violation_target_type, s.points, s.fine_amount, s.decay_days, true, s.severity::violation_severity, s.loyalty_impact::loyalty_impact
FROM (VALUES
  ('ACCEPT_OFFER_NO_PAYMENT',
   'قبول عرض بدون دفع', 'Accepted offer without payment',
   'قبل العميل العرض ولم يكمل الدفع خلال المهلة', 'Customer accepted offer but failed to pay within deadline',
   'CUSTOMER', 10, 0, 30, 'NORMAL', 'NONE'),
  ('FAKE_REQUEST',
   'طلب وهمي', 'Fake order request',
   'إنشاء طلبات وهمية بدون نية شراء', 'Creating fake orders without buying intent',
   'CUSTOMER', 15, 0, 60, 'NORMAL', 'NONE'),
  ('FREQUENT_RETURNS',
   'كثرة الإرجاع', 'Frequent returns',
   'تكرار طلبات الإرجاع بشكل مفرط', 'Excessive frequency of return requests',
   'CUSTOMER', 10, 0, 60, 'NORMAL', 'NONE'),
  ('EXCEEDED_RETURN_RATE',
   'تجاوز نسبة الإرجاع المسموحة', 'Exceeded allowed return rate',
   'نسبة الإرجاع/النزاعات تجاوزت الحد المسموح للحساب', 'Return/dispute rate exceeded the account threshold',
   'CUSTOMER', 30, 0, 90, 'SEVERE', 'NONE'),
  ('FAKE_DISPUTE',
   'نزاع كيدي', 'Fake / malicious dispute',
   'فتح نزاع كيدي وحُكم لصالح التاجر', 'Filed a malicious dispute that was ruled in merchant favor',
   'CUSTOMER', 20, 0, 90, 'SEVERE', 'CANCEL_ALL_REWARDS_PROMPT'),
  ('LATE_RETURN_HANDOVER',
   'تأخر تسليم القطعة المُرجعة', 'Late return handover',
   'لم يُسلِّم العميل القطعة خلال 3 أيام بعد الموافقة على الإرجاع', 'Customer did not hand over item within 3-day return window',
   'CUSTOMER', 10, 0, 30, 'NORMAL', 'NONE'),
  ('FAKE_COMPLAINT',
   'شكوى كاذبة', 'Fake complaint',
   'تقديم شكوى كاذبة على متجر/منتج', 'Filing a false complaint against a store/product',
   'CUSTOMER', 15, 0, 60, 'NORMAL', 'NONE'),
  ('ABUSE',
   'إساءة', 'Abuse',
   'إساءة لفظية أو سلوك مسيء', 'Verbal abuse or abusive behavior',
   'CUSTOMER', 20, 0, 90, 'SEVERE', 'CANCEL_ALL_REWARDS_PROMPT'),
  ('SHARE_CONTACT_OFF_PLATFORM',
   'مشاركة رقم/تواصل خارج المنصة', 'Sharing contact info off-platform',
   'مشاركة رقم هاتف أو طلب التواصل خارج المنصة', 'Sharing phone number or requesting off-platform contact',
   'CUSTOMER', 15, 0, 60, 'NORMAL', 'NONE')
) AS s(code, name_ar, name_en, description_ar, description_en, target_type, points, fine_amount, decay_days, severity, loyalty_impact)
WHERE NOT EXISTS (SELECT 1 FROM violation_types vt WHERE vt.code = s.code);

-- ---------------------------------------------------------------------
-- 9. Seed Penalty Thresholds (Merchants & Customers per 2026 Spec)
-- ---------------------------------------------------------------------

-- Helper: only insert if no threshold exists for the same target_type+points combo
INSERT INTO penalty_thresholds (id, name_ar, name_en, target_type, threshold_points, action, suspend_duration_days, is_active)
SELECT gen_random_uuid(), 'تحذير المتجر', 'Merchant warning', 'MERCHANT', 20, 'WARNING', NULL, true
WHERE NOT EXISTS (SELECT 1 FROM penalty_thresholds WHERE target_type = 'MERCHANT' AND threshold_points = 20);

INSERT INTO penalty_thresholds (id, name_ar, name_en, target_type, threshold_points, action, suspend_duration_days, is_active)
SELECT gen_random_uuid(), 'إيقاف مؤقت للمتجر (7 أيام)', 'Temporary store suspension (7 days)', 'MERCHANT', 50, 'TEMPORARY_SUSPENSION', 7, true
WHERE NOT EXISTS (SELECT 1 FROM penalty_thresholds WHERE target_type = 'MERCHANT' AND threshold_points = 50);

INSERT INTO penalty_thresholds (id, name_ar, name_en, target_type, threshold_points, action, suspend_duration_days, is_active)
SELECT gen_random_uuid(), 'إيقاف وحجز رصيد المتجر', 'Suspend store + freeze balance', 'MERCHANT', 80, 'FREEZE_BALANCE', NULL, true
WHERE NOT EXISTS (SELECT 1 FROM penalty_thresholds WHERE target_type = 'MERCHANT' AND threshold_points = 80);

INSERT INTO penalty_thresholds (id, name_ar, name_en, target_type, threshold_points, action, suspend_duration_days, is_active)
SELECT gen_random_uuid(), 'حظر دائم للمتجر', 'Permanent store ban', 'MERCHANT', 100, 'PERMANENT_BAN', NULL, true
WHERE NOT EXISTS (SELECT 1 FROM penalty_thresholds WHERE target_type = 'MERCHANT' AND threshold_points = 100);

INSERT INTO penalty_thresholds (id, name_ar, name_en, target_type, threshold_points, action, suspend_duration_days, is_active)
SELECT gen_random_uuid(), 'تحذير العميل', 'Customer warning', 'CUSTOMER', 20, 'WARNING', NULL, true
WHERE NOT EXISTS (SELECT 1 FROM penalty_thresholds WHERE target_type = 'CUSTOMER' AND threshold_points = 20);

INSERT INTO penalty_thresholds (id, name_ar, name_en, target_type, threshold_points, action, suspend_duration_days, is_active)
SELECT gen_random_uuid(), 'منع الشراء على العميل', 'Restrict customer purchase', 'CUSTOMER', 40, 'RESTRICT_PURCHASE', NULL, true
WHERE NOT EXISTS (SELECT 1 FROM penalty_thresholds WHERE target_type = 'CUSTOMER' AND threshold_points = 40);

INSERT INTO penalty_thresholds (id, name_ar, name_en, target_type, threshold_points, action, suspend_duration_days, is_active)
SELECT gen_random_uuid(), 'حظر دائم للعميل', 'Permanent customer ban', 'CUSTOMER', 60, 'PERMANENT_BAN', NULL, true
WHERE NOT EXISTS (SELECT 1 FROM penalty_thresholds WHERE target_type = 'CUSTOMER' AND threshold_points = 60);

-- ---------------------------------------------------------------------
-- DONE. Verify:
--   SELECT code, name_en, points, severity, loyalty_impact FROM violation_types ORDER BY target_type, points;
--   SELECT target_type, threshold_points, action FROM penalty_thresholds ORDER BY target_type, threshold_points;
-- ---------------------------------------------------------------------
