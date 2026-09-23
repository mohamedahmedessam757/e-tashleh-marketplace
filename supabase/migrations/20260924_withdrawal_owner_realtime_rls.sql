-- Owner SELECT on withdrawal_requests so customer/vendor Supabase realtime channels receive events.
-- Admins already covered by 20260627_admin_financial_realtime_rls.sql.
-- Mutations remain NestJS-only (service role).

BEGIN;

DROP POLICY IF EXISTS "Owners read own withdrawal_requests" ON public.withdrawal_requests;
CREATE POLICY "Owners read own withdrawal_requests" ON public.withdrawal_requests
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1
      FROM public.stores s
      WHERE s.id = withdrawal_requests.store_id
        AND s.owner_id = auth.uid()
    )
  );

-- Ensure ACCOUNTANT / SUPPORT staff with admin helper still covered if role set expanded later
DROP POLICY IF EXISTS "Admins read withdrawal_requests" ON public.withdrawal_requests;
CREATE POLICY "Admins read withdrawal_requests" ON public.withdrawal_requests
  FOR SELECT
  TO authenticated
  USING (
    public.rls_auth_is_admin()
    OR public.rls_auth_is_staff()
  );

COMMIT;
