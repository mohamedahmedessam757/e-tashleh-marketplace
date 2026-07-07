-- Platform Error Events (2026) — RUN MANUALLY in Supabase SQL Editor
-- Phase 0: Error monitoring table + indexes + RLS

DO $$ BEGIN
  CREATE TYPE platform_error_source AS ENUM ('CLIENT', 'API', 'UNHANDLED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE platform_error_severity AS ENUM ('INFO', 'WARN', 'ERROR', 'FATAL');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS platform_error_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source platform_error_source NOT NULL,
  severity platform_error_severity NOT NULL DEFAULT 'ERROR',
  error_code TEXT,
  error_name TEXT,
  message TEXT NOT NULL,
  stack_fingerprint TEXT,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  user_role TEXT NOT NULL DEFAULT 'GUEST'
    CHECK (user_role IN ('GUEST', 'CUSTOMER', 'MERCHANT', 'ADMIN')),
  user_email TEXT,
  user_phone TEXT,
  page_path TEXT,
  page_label TEXT,
  http_method TEXT,
  http_status INT,
  request_path TEXT,
  user_agent TEXT,
  device_class TEXT NOT NULL DEFAULT 'unknown'
    CHECK (device_class IN ('mobile', 'tablet', 'desktop', 'unknown')),
  locale TEXT,
  correlation_id UUID NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  occurrence_count INT NOT NULL DEFAULT 1,
  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_platform_error_events_last_seen
  ON platform_error_events (last_seen_at DESC);

CREATE INDEX IF NOT EXISTS idx_platform_error_events_correlation
  ON platform_error_events (correlation_id);

CREATE INDEX IF NOT EXISTS idx_platform_error_events_fingerprint_seen
  ON platform_error_events (stack_fingerprint, last_seen_at DESC);

CREATE INDEX IF NOT EXISTS idx_platform_error_events_user_email
  ON platform_error_events (user_email) WHERE user_email IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_platform_error_events_user_phone
  ON platform_error_events (user_phone) WHERE user_phone IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_platform_error_events_page_path
  ON platform_error_events (page_path) WHERE page_path IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_platform_error_events_error_name
  ON platform_error_events (error_name) WHERE error_name IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_platform_error_events_source_severity
  ON platform_error_events (source, severity);

CREATE INDEX IF NOT EXISTS idx_platform_error_events_message_gin
  ON platform_error_events USING gin (to_tsvector('simple', coalesce(message, '')));

ALTER TABLE platform_error_events ENABLE ROW LEVEL SECURITY;

-- No direct client access; NestJS uses service role
DROP POLICY IF EXISTS platform_error_events_deny_all ON platform_error_events;
CREATE POLICY platform_error_events_deny_all ON platform_error_events
  FOR ALL TO anon, authenticated
  USING (false);

-- Enable realtime (optional — run if publication exists)
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE platform_error_events;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;
