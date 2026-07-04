-- Profile change approval workflow (merchant email/phone)
CREATE TABLE IF NOT EXISTS profile_change_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  field TEXT NOT NULL CHECK (field IN ('email', 'phone')),
  old_value TEXT,
  new_value TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING_REVIEW',
  requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES users(id),
  rejection_reason TEXT,
  metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS profile_change_requests_status_idx ON profile_change_requests(status);
CREATE INDEX IF NOT EXISTS profile_change_requests_user_id_idx ON profile_change_requests(user_id);
