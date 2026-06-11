-- FORCE FIX for Storage RLS Policies
-- Run this in Supabase SQL Editor

-- 1. Reset Bucket (Make it Public)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('returns-disputes', 'returns-disputes', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 2. Drop ALL policies for this specific bucket
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Upload" ON storage.objects;
DROP POLICY IF EXISTS "Public Select Policy" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Insert Policy" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Update Policy" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Delete Policy" ON storage.objects;
-- Drop potentially conflicting global policies (Be careful, but necessary for debug)
-- DROP POLICY IF EXISTS "Give me access" ON storage.objects; 

-- 3. Create "Allow All" Policy for Authenticated Users
-- This is the most permissive policy possible for logged-in users
CREATE POLICY "Allow All Authenticated Returns Disputes"
ON storage.objects
FOR ALL
TO authenticated
USING ( bucket_id = 'returns-disputes' )
WITH CHECK ( bucket_id = 'returns-disputes' );

-- 4. Create Public Select Policy
CREATE POLICY "Allow Public Select Returns Disputes"
ON storage.objects
FOR SELECT
TO public
USING ( bucket_id = 'returns-disputes' );
