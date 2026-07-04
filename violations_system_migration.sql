-- =========================================================================
-- VIOLATIONS & PENALTIES SYSTEM MIGRATION (2026 STANDARD)
-- DESCRIPTION: Implements the database structure for the automated violation system.
-- TARGET: Supabase / PostgreSQL
-- =========================================================================

BEGIN;

-- 1. ENUMS CREATION
DO $$ BEGIN
    CREATE TYPE violation_target_type AS ENUM ('CUSTOMER', 'MERCHANT');
    CREATE TYPE violation_status AS ENUM ('ACTIVE', 'DECAYED', 'APPEALED', 'DROPPED');
    CREATE TYPE appeal_status AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
    CREATE TYPE penalty_action_type AS ENUM ('WARNING', 'TEMPORARY_SUSPENSION', 'PERMANENT_BAN');
    CREATE TYPE penalty_action_status AS ENUM ('PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'DELAYED', 'EXECUTED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. TABLES CREATION

-- Violation Types (Definitions)
CREATE TABLE IF NOT EXISTS violation_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name_ar TEXT NOT NULL,
    name_en TEXT NOT NULL,
    description_ar TEXT,
    description_en TEXT,
    target_type violation_target_type NOT NULL,
    points INTEGER NOT NULL DEFAULT 0,
    fine_amount DECIMAL(14, 2) NOT NULL DEFAULT 0.00,
    decay_days INTEGER NOT NULL DEFAULT 30, -- Days before points decay
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Penalty Thresholds (Rules for automatic penalty triggering)
CREATE TABLE IF NOT EXISTS penalty_thresholds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name_ar TEXT NOT NULL,
    name_en TEXT NOT NULL,
    target_type violation_target_type NOT NULL,
    threshold_points INTEGER NOT NULL,
    action penalty_action_type NOT NULL,
    suspend_duration_days INTEGER, -- Null if permanent or warning
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Active Violations (Recorded instances)
CREATE TABLE IF NOT EXISTS violations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type_id UUID NOT NULL REFERENCES violation_types(id),
    target_user_id UUID NOT NULL REFERENCES users(id),
    target_store_id UUID REFERENCES stores(id), -- Null if target is customer
    target_type violation_target_type NOT NULL,
    points INTEGER NOT NULL,
    fine_amount DECIMAL(14, 2) NOT NULL DEFAULT 0.00,
    status violation_status NOT NULL DEFAULT 'ACTIVE',
    admin_notes TEXT,
    order_id UUID REFERENCES orders(id), -- Optional: Link to specific order
    issued_by UUID REFERENCES users(id),
    decay_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Violation Appeals (Contestations by users)
CREATE TABLE IF NOT EXISTS violation_appeals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    violation_id UUID NOT NULL REFERENCES violations(id),
    user_id UUID NOT NULL REFERENCES users(id),
    reason TEXT NOT NULL,
    description TEXT,
    evidence_urls JSONB DEFAULT '[]'::jsonb, -- Array of strings (images/videos)
    status appeal_status NOT NULL DEFAULT 'PENDING',
    admin_response TEXT,
    reviewed_by UUID REFERENCES users(id),
    reviewed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Penalty Actions (History of applied penalties)
CREATE TABLE IF NOT EXISTS penalty_actions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    target_user_id UUID NOT NULL REFERENCES users(id),
    target_store_id UUID REFERENCES stores(id),
    target_type violation_target_type NOT NULL,
    threshold_id UUID REFERENCES penalty_thresholds(id),
    action penalty_action_type NOT NULL,
    status penalty_action_status NOT NULL DEFAULT 'PENDING_APPROVAL',
    admin_notes TEXT,
    approved_by UUID REFERENCES users(id),
    approved_at TIMESTAMPTZ,
    executed_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ, -- For temporary suspensions
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Violation Score Logs (Point history for audit/visualization)
CREATE TABLE IF NOT EXISTS violation_score_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    target_user_id UUID NOT NULL REFERENCES users(id),
    target_type violation_target_type NOT NULL,
    previous_score INTEGER NOT NULL,
    new_score INTEGER NOT NULL,
    change_amount INTEGER NOT NULL,
    reason TEXT,
    violation_id UUID REFERENCES violations(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. INDEXES FOR PERFORMANCE (2026 STANDARDS)
CREATE INDEX idx_violations_target_user ON violations(target_user_id);
CREATE INDEX idx_violations_target_store ON violations(target_store_id);
CREATE INDEX idx_violations_status ON violations(status);
CREATE INDEX idx_violations_decay_at ON violations(decay_at);
CREATE INDEX idx_appeals_status ON violation_appeals(status);
CREATE INDEX idx_penalty_actions_status ON penalty_actions(status);
CREATE INDEX idx_score_logs_user ON violation_score_logs(target_user_id);

-- 4. ADD SCORE FIELD TO USERS TABLE
ALTER TABLE users ADD COLUMN IF NOT EXISTS violation_score INTEGER DEFAULT 0;

-- 5. SEED DATA (FROM USER IMAGES)

-- Violation Types
INSERT INTO violation_types (name_ar, name_en, points, fine_amount, decay_days, target_type) VALUES
('تأخير شحن', 'Shipping Delay', 5, 0.00, 30, 'MERCHANT'),
('إلغاء طلب من التاجر', 'Order Cancellation by Merchant', 10, 50.00, 45, 'MERCHANT'),
('منتج خاطئ', 'Wrong Product Sent', 25, 200.00, 60, 'MERCHANT'),
('احتيال', 'Fraud Activity', 100, 50000.00, 365, 'MERCHANT'),
('إلغاء طلب متكرر من العميل', 'Frequent Cancellation by Customer', 10, 0.00, 30, 'CUSTOMER'),
('إساءة استخدام المحادثة', 'Chat Abuse', 15, 0.00, 60, 'CUSTOMER');

-- Penalty Thresholds (Merchant Defaults)
INSERT INTO penalty_thresholds (name_ar, name_en, target_type, threshold_points, action, suspend_duration_days) VALUES
('تحذير المستوى الأول', 'Level 1 Warning', 'MERCHANT', 50, 'WARNING', NULL),
('إيقاف مؤقت للمتجر', 'Temporary Store Suspension', 'MERCHANT', 100, 'TEMPORARY_SUSPENSION', 7),
('حظر دائم للمتجر', 'Permanent Store Ban', 'MERCHANT', 200, 'PERMANENT_BAN', NULL);

-- Penalty Thresholds (Customer Defaults)
INSERT INTO penalty_thresholds (name_ar, name_en, target_type, threshold_points, action, suspend_duration_days) VALUES
('تحذير عميل', 'Customer Warning', 'CUSTOMER', 40, 'WARNING', NULL),
('إيقاف حساب العميل', 'Customer Account Suspension', 'CUSTOMER', 80, 'TEMPORARY_SUSPENSION', 3),
('حظر حساب العميل', 'Customer Permanent Ban', 'CUSTOMER', 150, 'PERMANENT_BAN', NULL);

COMMIT;
