-- Storage hardening (2026)
-- Problem: earlier hotfixes granted the anonymous `public` role INSERT/UPDATE on
-- storage.objects for `marketplace-uploads`. That lets ANYONE (unauthenticated) upload and
-- overwrite files. All legitimate writes go through the NestJS backend using the service-role
-- key (which bypasses RLS), so anonymous write access is never required.
--
-- This migration removes anonymous write access while keeping public reads intact so no
-- existing download URL breaks.

-- 1. Drop the dangerous permissive WRITE policies (anonymous insert/update).
DROP POLICY IF EXISTS "Allow Public Uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow Public Update" ON storage.objects;

-- 2. Restrict inserts to authenticated users (backend service-role bypasses RLS regardless).
DROP POLICY IF EXISTS "Authenticated users can upload" ON storage.objects;
CREATE POLICY "Authenticated users can upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'marketplace-uploads');

-- 3. Keep public read for the public-asset bucket (logos/avatars/order-draft media).
DROP POLICY IF EXISTS "Public can view uploads" ON storage.objects;
CREATE POLICY "Public can view marketplace-uploads"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'marketplace-uploads');

-- 4. Owner-scoped delete only.
DROP POLICY IF EXISTS "Users can delete own files" ON storage.objects;
CREATE POLICY "Users can delete own files"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'marketplace-uploads' AND auth.uid() = owner);

-- ---------------------------------------------------------------------------
-- FOLLOW-UP (requires coordinated frontend + read-path changes, apply during a
-- maintenance window): move sensitive KYC / verification / appeals / support documents
-- into PRIVATE buckets and serve them via short-lived signed URLs
-- (UploadsService.createSignedUrl). Until the read paths are migrated to signed URLs,
-- flipping these buckets to `public = false` WILL break document viewing, so it is
-- intentionally NOT done here:
--
--   UPDATE storage.buckets SET public = false
--   WHERE id IN ('vendor-documents','verification-docs','verification-field-photos',
--                'returns-disputes','support-files','appeals','profile');
-- ---------------------------------------------------------------------------
