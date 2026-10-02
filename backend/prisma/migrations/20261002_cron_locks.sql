-- Lease-based cron locks: acquiring a lock no longer holds a pool connection for the whole job.
CREATE TABLE IF NOT EXISTS cron_locks (
  key TEXT PRIMARY KEY,
  owner TEXT NOT NULL,
  locked_until TIMESTAMPTZ NOT NULL
);

ALTER TABLE cron_locks ENABLE ROW LEVEL SECURITY;
