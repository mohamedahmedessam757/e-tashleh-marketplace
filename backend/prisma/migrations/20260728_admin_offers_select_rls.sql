-- Admin/Support SELECT on offers so postgres_changes realtime reaches admin JWTs.
DROP POLICY IF EXISTS "Admins see all offers" ON public.offers;
CREATE POLICY "Admins see all offers" ON public.offers
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
        AND role IN ('ADMIN', 'SUPER_ADMIN', 'SUPPORT')
    )
  );
