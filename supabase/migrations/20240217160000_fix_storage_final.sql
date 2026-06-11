-- FINAL FIX for Storage RLS Policies
-- This migration MUST be run in the Supabase SQL Editor.

-- 1. Ensure the bucket exists and is public
INSERT INTO storage.buckets (id, name, public) 
VALUES ('returns-disputes', 'returns-disputes', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 2. Drop ALL existing policies for this bucket on storage.objects to ensure a clean slate
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Upload" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Select" ON storage.objects;
DROP POLICY IF EXISTS "Public Access Returns Disputes" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Upload Returns Disputes" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Update Returns Disputes" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Delete Returns Disputes" ON storage.objects;
DROP POLICY IF EXISTS "Give me access" ON storage.objects; 
DROP POLICY IF EXISTS "Individual User Access" ON storage.objects;

-- 3. Create Simplified, Permissive Policies

-- Policy 1: allow EVERYONE (Public) to VIEW files in this bucket
-- This is necessary for displaying images in the admin panel or client without signing URLs every time
CREATE POLICY "Public Select Policy"
ON storage.objects FOR SELECT
USING ( bucket_id = 'returns-disputes' );

-- Policy 2: Allow Authenticated Users to UPLOAD files
-- We trust any logged-in user to upload an evidence file
CREATE POLICY "Authenticated Insert Policy"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK ( bucket_id = 'returns-disputes' );

-- Policy 3: Allow Authenticated Users to UPDATE/DELETE *their own* files
-- This relies on Supabase automatically setting the 'owner' column to auth.uid()
CREATE POLICY "Authenticated Update Policy"
ON storage.objects FOR UPDATE
TO authenticated
USING ( bucket_id = 'returns-disputes' AND owner = auth.uid() );

CREATE POLICY "Authenticated Delete Policy"
ON storage.objects FOR DELETE
TO authenticated
USING ( bucket_id = 'returns-disputes' AND owner = auth.uid() );

-- 4. Verify/Fix Table RLS (Just in case)
ALTER TABLE returns ENABLE ROW LEVEL SECURITY;
ALTER TABLE disputes ENABLE ROW LEVEL SECURITY;

-- Returns
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON returns;
CREATE POLICY "Returns Insert Policy" ON returns FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Enable select for users based on user_id" ON returns;
CREATE POLICY "Returns Select Policy" ON returns FOR SELECT TO authenticated USING (auth.uid() = customer_id);

-- Disputes
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON disputes;
CREATE POLICY "Disputes Insert Policy" ON disputes FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Enable select for users based on user_id" ON disputes;
CREATE POLICY "Disputes Select Policy" ON disputes FOR SELECT TO authenticated USING (auth.uid() = customer_id);
