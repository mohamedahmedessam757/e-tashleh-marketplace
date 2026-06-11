-- 🛠️ HOTFIX: Allow Public Uploads (For M1 NestJS Auth Compatibility)
-- Since we use NestJS for Auth, the Supabase Client is 'Anonymous'.
-- We must allow 'public' role to upload to 'marketplace-uploads'.

-- 1. Create Bucket (Ensure it exists)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('marketplace-uploads', 'marketplace-uploads', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Drop Strict Policies (if any)
DROP POLICY IF EXISTS "Authenticated users can upload" ON storage.objects;
DROP POLICY IF EXISTS "Public can view uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow Public Uploads" ON storage.objects;

-- 3. CREATE PERMISSIVE POLICY (For M1)
-- Allows ANYONE (Anonymous or Logged In) to upload to this specific bucket.
CREATE POLICY "Allow Public Uploads" 
ON storage.objects FOR INSERT 
TO public 
WITH CHECK (bucket_id = 'marketplace-uploads');

-- 4. Allow Public View
CREATE POLICY "Public can view uploads" 
ON storage.objects FOR SELECT 
TO public 
USING (bucket_id = 'marketplace-uploads');

-- 5. Allow Public Update/Delete (Optional - useful for replacing files)
CREATE POLICY "Allow Public Update" 
ON storage.objects FOR UPDATE
TO public 
USING (bucket_id = 'marketplace-uploads');
