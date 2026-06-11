-- Fix Storage RLS Policies for 'returns-disputes' bucket

-- 1. Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Upload" ON storage.objects;
DROP POLICY IF EXISTS "Give me access" ON storage.objects; -- Just in case

-- 2. Create more robust policies
-- Allow Public Read Access (Images are public)
CREATE POLICY "Public Access Returns Disputes"
ON storage.objects FOR SELECT
USING ( bucket_id = 'returns-disputes' );

-- Allow Authenticated Users to Upload
CREATE POLICY "Authenticated Upload Returns Disputes"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK ( bucket_id = 'returns-disputes' );

-- Allow Authenticated Users to Update/Delete their own files (Optional but good)
CREATE POLICY "Authenticated Update Returns Disputes"
ON storage.objects FOR UPDATE
TO authenticated
USING ( bucket_id = 'returns-disputes' AND owner = auth.uid() );

CREATE POLICY "Authenticated Delete Returns Disputes"
ON storage.objects FOR DELETE
TO authenticated
USING ( bucket_id = 'returns-disputes' AND owner = auth.uid() );

-- Fix Potential Table RLS Issues (Just to be safe/robust)
-- Ensure 'returns' and 'disputes' are accessible

-- Returns Table
DROP POLICY IF EXISTS "Users can view their own returns" ON returns;
DROP POLICY IF EXISTS "Users can create their own returns" ON returns;

CREATE POLICY "Users can view their own returns 2"
ON returns FOR SELECT
TO authenticated
USING (auth.uid() = customer_id);

CREATE POLICY "Users can create their own returns 2"
ON returns FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = customer_id);

-- Disputes Table
DROP POLICY IF EXISTS "Users can view their own disputes" ON disputes;
DROP POLICY IF EXISTS "Users can create their own disputes" ON disputes;

CREATE POLICY "Users can view their own disputes 2"
ON disputes FOR SELECT
TO authenticated
USING (auth.uid() = customer_id);

CREATE POLICY "Users can create their own disputes 2"
ON disputes FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = customer_id);
