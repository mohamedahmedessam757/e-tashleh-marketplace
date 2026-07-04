-- =========================================================================
-- CUSTOMER RETURN RATE RISK SYSTEM MIGRATION (2026 STANDARD)
-- DESCRIPTION: Adds tracking for customer return rates and risk alerts.
-- =========================================================================

BEGIN;

-- 1. EXTEND USERS TABLE FOR PERFORMANCE TRACKING
ALTER TABLE users ADD COLUMN IF NOT EXISTS total_delivered_orders INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS total_return_dispute_orders INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS cached_return_rate DECIMAL(5, 4) DEFAULT 0.0000;

-- 2. CREATE RISK ALERTS TABLE (System detection before violation)
CREATE TABLE IF NOT EXISTS customer_risk_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    return_rate DECIMAL(5, 4) NOT NULL,
    delivered_count INTEGER NOT NULL,
    negative_count INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'PENDING_REVIEW', -- PENDING_REVIEW, DISMISSED, VIOLATION_ISSUED
    admin_notes TEXT,
    reviewed_by UUID REFERENCES users(id),
    reviewed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. INDEX FOR FAST ADMIN SEARCH
CREATE INDEX IF NOT EXISTS idx_risk_alerts_status ON customer_risk_alerts(status);
CREATE INDEX IF NOT EXISTS idx_risk_alerts_user ON customer_risk_alerts(user_id);

-- 4. SEED NEW VIOLATION TYPE
INSERT INTO violation_types (name_ar, name_en, description_ar, description_en, points, fine_amount, decay_days, target_type)
VALUES (
    'تجاوز نسبة المرتجعات المسموحة', 
    'Exceeded Allowed Return Rate',
    'يتم احتساب هذه المخالفة عند تجاوز نسبة المرتجعات أو النزاعات 15% من إجمالي الطلبات المستلمة.',
    'This violation is issued when returns or disputes exceed 15% of total delivered orders.',
    20, 
    0.00, 
    90, 
    'CUSTOMER'
) ON CONFLICT DO NOTHING;

COMMIT;
