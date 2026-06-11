-- 🛠️ Fix Storage Permissions (Run this in Supabase SQL Editor)

-- 1. Create the bucket 'marketplace-uploads' if it doesn't exist (Public = true)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('marketplace-uploads', 'marketplace-uploads', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Drop existing policies to avoid conflicts (clean slate for this bucket)
DROP POLICY IF EXISTS "Authenticated users can upload" ON storage.objects;
DROP POLICY IF EXISTS "Public can view uploads" ON storage.objects;

-- 3. Policy: Allow Authenticated Users (Customers/Vendors) to Upload to 'marketplace-uploads'
CREATE POLICY "Authenticated users can upload" 
ON storage.objects FOR INSERT 
TO authenticated 
WITH CHECK (bucket_id = 'marketplace-uploads');

-- 4. Policy: Allow Public to View/Download files (Needed for getPublicUrl)
CREATE POLICY "Public can view uploads" 
ON storage.objects FOR SELECT 
TO public 
USING (bucket_id = 'marketplace-uploads');

-- 5. (Optional) Allow Deletion if user owns the file (owner_id is set automatically by Supabase)
CREATE POLICY "Users can delete own files" 
ON storage.objects FOR DELETE 
TO authenticated 
USING (bucket_id = 'marketplace-uploads' AND auth.uid() = owner);
