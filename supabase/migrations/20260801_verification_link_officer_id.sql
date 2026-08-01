-- Bind verification access links to the assigned officer at mint time.
-- Also expand activity-log action CHECK for field-admin review + rematch flow.

ALTER TABLE verification_links
  ADD COLUMN IF NOT EXISTS assigned_officer_id UUID REFERENCES users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_vlinks_assigned_officer
  ON verification_links(assigned_officer_id);

-- Expand allowed activity actions (Postgres: drop + recreate CHECK).
ALTER TABLE verification_activity_logs
  DROP CONSTRAINT IF EXISTS verification_activity_logs_action_check;

ALTER TABLE verification_activity_logs
  ADD CONSTRAINT verification_activity_logs_action_check CHECK (action IN (
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
    'ADMIN_FIELD_APPROVED',
    'ADMIN_FIELD_REJECTED',
    'TASK_CANCELLED',
    'CORRECTION_REQUESTED',
    'CORRECTION_RECEIVED',
    'LINK_EXPIRED',
    'LINK_REVOKED'
  ));
