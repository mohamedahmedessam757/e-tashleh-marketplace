-- Admin financial hub: RLS SELECT for realtime + publication (2026)
-- Required for AdminBilling Supabase channels after 20260528_security_hardening (deny-by-default).
-- Mutations remain NestJS-only (service role); admins get read-only SELECT for live ledger/KPI refresh.

BEGIN;

-- ---------------------------------------------------------------------------
-- 1) Admin read-only policies (SELECT only — no client writes)
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Admins read payment_transactions" ON public.payment_transactions;
CREATE POLICY "Admins read payment_transactions" ON public.payment_transactions
  FOR SELECT
  TO authenticated
  USING (public.rls_auth_is_admin());

DROP POLICY IF EXISTS "Admins read wallet_transactions" ON public.wallet_transactions;
CREATE POLICY "Admins read wallet_transactions" ON public.wallet_transactions
  FOR SELECT
  TO authenticated
  USING (public.rls_auth_is_admin());

DROP POLICY IF EXISTS "Admins read escrow_transactions" ON public.escrow_transactions;
CREATE POLICY "Admins read escrow_transactions" ON public.escrow_transactions
  FOR SELECT
  TO authenticated
  USING (public.rls_auth_is_admin());

DROP POLICY IF EXISTS "Admins read withdrawal_requests" ON public.withdrawal_requests;
CREATE POLICY "Admins read withdrawal_requests" ON public.withdrawal_requests
  FOR SELECT
  TO authenticated
  USING (public.rls_auth_is_admin());

-- ---------------------------------------------------------------------------
-- 2) Realtime publication (idempotent)
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  tbl text;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'payment_transactions',
    'wallet_transactions',
    'escrow_transactions',
    'withdrawal_requests'
  ]
  LOOP
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

-- ---------------------------------------------------------------------------
-- 3) Index for failed-unsettled KPI (status + refund state)
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS payment_transactions_failed_unsettled_idx
  ON public.payment_transactions (status, refunded_amount)
  WHERE status = 'FAILED';

COMMIT;
