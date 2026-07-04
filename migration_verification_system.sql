-- =====================================================================
-- Migration: Advanced Verification (Matching) System - 2026
-- Run this file MANUALLY in Supabase SQL Editor
-- =====================================================================

-- 1. Add VERIFICATION_OFFICER role to the UserRole enum
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum 
    WHERE enumlabel = 'VERIFICATION_OFFICER' 
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'user_role')
  ) THEN
    ALTER TYPE user_role ADD VALUE 'VERIFICATION_OFFICER';
  END IF;
END
$$;

-- 2. Verification Tasks table
CREATE TABLE IF NOT EXISTS verification_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  officer_id UUID REFERENCES users(id) ON DELETE SET NULL,
  assigned_by UUID REFERENCES users(id) ON DELETE SET NULL,

  status TEXT NOT NULL DEFAULT 'PENDING_ASSIGNMENT'
    CHECK (status IN (
      'PENDING_ASSIGNMENT',
      'ASSIGNED',
      'LINK_SENT',
      'IN_PROGRESS',
      'COMPLETED_MATCH',
      'COMPLETED_NON_MATCH',
      'AWAITING_ADMIN_APPROVAL',
      'ADMIN_APPROVED',
      'ADMIN_REJECTED',
      'AWAITING_CORRECTION',
      'CANCELLED'
    )),

  -- Timing
  assigned_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,

  -- GPS & Device (Start of verification)
  start_lat DECIMAL(10,8),
  start_lng DECIMAL(11,8),
  start_device_info JSONB DEFAULT '{}',

  -- GPS & Device (End of verification)
  end_lat DECIMAL(10,8),
  end_lng DECIMAL(11,8),
  end_device_info JSONB DEFAULT '{}',

  -- Officer Decision
  decision TEXT CHECK (decision IN ('MATCHING', 'NON_MATCHING')),
  decision_reason TEXT,
  officer_photos JSONB DEFAULT '[]',
  officer_notes TEXT,

  -- PDF Report
  report_url TEXT,

  -- Cycle tracking (for re-verification after correction)
  cycle_number INT NOT NULL DEFAULT 1,
  previous_task_id UUID REFERENCES verification_tasks(id) ON DELETE SET NULL,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Verification Secure Links table (QR / temporary URL)
CREATE TABLE IF NOT EXISTS verification_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES verification_tasks(id) ON DELETE CASCADE,

  -- Security token (used in the URL)
  token TEXT NOT NULL UNIQUE,
  qr_code_data TEXT,

  -- Expiry control
  expires_at TIMESTAMPTZ NOT NULL,
  max_duration_hours INT NOT NULL DEFAULT 24,

  -- Usage tracking
  is_used BOOLEAN NOT NULL DEFAULT FALSE,
  used_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,

  -- Access audit
  opened_at TIMESTAMPTZ,
  otp_verified_at TIMESTAMPTZ,
  device_info JSONB DEFAULT '{}',
  ip_address TEXT,
  gps_lat DECIMAL(10,8),
  gps_lng DECIMAL(11,8),

  -- Creator
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Verification Activity Logs table (full audit trail)
CREATE TABLE IF NOT EXISTS verification_activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES verification_tasks(id) ON DELETE CASCADE,
  officer_id UUID REFERENCES users(id) ON DELETE SET NULL,

  action TEXT NOT NULL CHECK (action IN (
    'TASK_CREATED',
    'TASK_ASSIGNED',
    'LINK_GENERATED',
    'LINK_OPENED',
    'OTP_VERIFIED',
    'VERIFICATION_STARTED',
    'PHOTO_UPLOADED',
    'DECISION_MATCHING',
    'DECISION_NON_MATCHING',
    'REPORT_GENERATED',
    'ADMIN_APPROVED',
    'ADMIN_REJECTED',
    'TASK_CANCELLED',
    'CORRECTION_REQUESTED',
    'CORRECTION_RECEIVED',
    'LINK_EXPIRED',
    'LINK_REVOKED'
  )),

  -- Location & Device snapshot
  gps_lat DECIMAL(10,8),
  gps_lng DECIMAL(11,8),
  device_info JSONB DEFAULT '{}',
  ip_address TEXT,

  -- Extra data
  metadata JSONB DEFAULT '{}',

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Add columns to existing orders table
ALTER TABLE orders ADD COLUMN IF NOT EXISTS verification_task_id UUID;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS rejection_count INT NOT NULL DEFAULT 0;

-- 6. Indexes for performance
CREATE INDEX IF NOT EXISTS idx_vtasks_order_id ON verification_tasks(order_id);
CREATE INDEX IF NOT EXISTS idx_vtasks_officer_id ON verification_tasks(officer_id);
CREATE INDEX IF NOT EXISTS idx_vtasks_status ON verification_tasks(status);
CREATE INDEX IF NOT EXISTS idx_vtasks_cycle ON verification_tasks(order_id, cycle_number);

CREATE INDEX IF NOT EXISTS idx_vlinks_token ON verification_links(token);
CREATE INDEX IF NOT EXISTS idx_vlinks_task_id ON verification_links(task_id);
CREATE INDEX IF NOT EXISTS idx_vlinks_active ON verification_links(is_active, expires_at);

CREATE INDEX IF NOT EXISTS idx_vactivity_task_id ON verification_activity_logs(task_id);
CREATE INDEX IF NOT EXISTS idx_vactivity_officer ON verification_activity_logs(officer_id);
CREATE INDEX IF NOT EXISTS idx_vactivity_action ON verification_activity_logs(action);

-- 7. Enable Realtime for verification_tasks
ALTER PUBLICATION supabase_realtime ADD TABLE verification_tasks;

-- =====================================================================
-- END OF MIGRATION
-- =====================================================================
