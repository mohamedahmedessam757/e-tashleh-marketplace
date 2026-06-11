-- Security hardening: enable RLS on sensitive tables (deny-by-default when no policy matches)
-- Apply via Supabase SQL editor or CLI. Review existing policies before production deploy.

ALTER TABLE IF EXISTS public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.wallet_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.payment_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.escrow_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.withdrawal_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.verification_tasks ENABLE ROW LEVEL SECURITY;

-- Revoke overly permissive storage policies (run only if these policy names exist)
DROP POLICY IF EXISTS "Allow public uploads" ON storage.objects;
DROP POLICY IF EXISTS "Public Upload" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can upload" ON storage.objects;

-- Service role (backend) bypasses RLS; anon/authenticated clients need explicit policies.
-- Prefer all mutations through NestJS API with service role.

COMMENT ON TABLE public.user_settings IS 'Mutations should go through NestJS API; RLS blocks direct anon writes by default.';

-- Stripe webhook idempotency (processed event IDs)
CREATE TABLE IF NOT EXISTS public.stripe_webhook_events (
  id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'PROCESSING',
  processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Backward compatibility: if table existed before `status` field was introduced.
ALTER TABLE IF EXISTS public.stripe_webhook_events
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'PROCESSING';

ALTER TABLE IF EXISTS public.stripe_webhook_events
  ADD COLUMN IF NOT EXISTS event_type TEXT NOT NULL DEFAULT 'unknown';

ALTER TABLE IF EXISTS public.stripe_webhook_events
  ADD COLUMN IF NOT EXISTS processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

ALTER TABLE IF EXISTS public.stripe_webhook_events ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS stripe_webhook_events_status_idx
ON public.stripe_webhook_events(status);
