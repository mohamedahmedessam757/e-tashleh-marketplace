-- Fix PostgreSQL 42P17 "infinite recursion detected in policy for relation users"
-- Cause: policies that SELECT from public.users while evaluating RLS on public.users (e.g. "Admins can read all users" with EXISTS (SELECT ... FROM users)).
-- Also replace the same anti-pattern on orders, stores, audit_logs so any query (including notifications) does not re-enter users RLS.
--
-- Run once in Supabase SQL Editor (or psql). Idempotent where possible.

BEGIN;

-- ---------------------------------------------------------------------------
-- 1) SECURITY DEFINER helpers (bypass RLS on users when checking current JWT)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.rls_auth_is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.users u
    WHERE u.id = auth.uid()
      AND u.role::text IN ('ADMIN', 'SUPER_ADMIN')
  );
$$;

CREATE OR REPLACE FUNCTION public.rls_auth_is_staff()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.users u
    WHERE u.id = auth.uid()
      AND u.role::text IN ('ADMIN', 'SUPER_ADMIN', 'SUPPORT')
  );
$$;

CREATE OR REPLACE FUNCTION public.rls_auth_is_vendor()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.users u
    WHERE u.id = auth.uid() AND u.role::text = 'VENDOR'
  );
$$;

REVOKE ALL ON FUNCTION public.rls_auth_is_admin() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.rls_auth_is_staff() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.rls_auth_is_vendor() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rls_auth_is_admin() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.rls_auth_is_staff() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.rls_auth_is_vendor() TO authenticated, anon;

-- ---------------------------------------------------------------------------
-- 2) users: replace admin read policy (removes self-referential subquery)
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Admins can read all users" ON public.users;
CREATE POLICY "Admins can read all users" ON public.users
  FOR SELECT
  USING (public.rls_auth_is_admin());

-- "Users can read own data" unchanged in spirit; drop/recreate if present for idempotency
DROP POLICY IF EXISTS "Users can read own data" ON public.users;
CREATE POLICY "Users can read own data" ON public.users
  FOR SELECT
  USING (auth.uid() = id);

-- ---------------------------------------------------------------------------
-- 3) stores / orders / audit_logs: same pattern as legacy security.sql
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Admins can view all stores" ON public.stores;
CREATE POLICY "Admins can view all stores" ON public.stores
  FOR SELECT
  USING (public.rls_auth_is_admin());

DROP POLICY IF EXISTS "Admins see all orders" ON public.orders;
CREATE POLICY "Admins see all orders" ON public.orders
  FOR SELECT
  USING (public.rls_auth_is_admin());

DROP POLICY IF EXISTS "Vendors see open orders" ON public.orders;
CREATE POLICY "Vendors see open orders" ON public.orders
  FOR SELECT
  USING (
    public.rls_auth_is_vendor()
    AND (status::text = 'AWAITING_OFFERS' OR store_id = auth.uid())
  );

DROP POLICY IF EXISTS "Admins read audit logs" ON public.audit_logs;
CREATE POLICY "Admins read audit logs" ON public.audit_logs
  FOR SELECT
  USING (public.rls_auth_is_staff());

-- ---------------------------------------------------------------------------
-- 4) notifications: remove any stray policies that subquery users, then apply minimal set
-- ---------------------------------------------------------------------------
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'notifications'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.notifications', r.policyname);
  END LOOP;
END $$;

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own notifications" ON public.notifications
  FOR SELECT
  USING (auth.uid() = recipient_id);

CREATE POLICY "Users can update their own notifications" ON public.notifications
  FOR UPDATE
  USING (auth.uid() = recipient_id);

CREATE POLICY "Users can insert notifications" ON public.notifications
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

COMMIT;
