-- =====================================================================
-- Supabase: bucket + table for field verification photos (2026)
-- Run in Supabase SQL Editor AFTER Prisma/schema is aligned (or run the
-- CREATE TABLE section if you manage DB only via SQL).
-- =====================================================================

-- 1) Storage bucket (public read so img/video tags work with public URL)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'verification-field-photos',
  'verification-field-photos',
  true,
  10485760,
  ARRAY['image/jpeg', 'image/png', 'image/webp']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- 2) Anyone can read objects (bucket is public). Uploads are done via Nest
--    with SUPABASE_SERVICE_ROLE_KEY (bypasses RLS). If you ever upload from
--    the browser with the anon key, add INSERT policies for authenticated users.
DROP POLICY IF EXISTS "Public read verification field photos" ON storage.objects;
CREATE POLICY "Public read verification field photos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'verification-field-photos');

-- 3) Optional: table (also created by Prisma migrate). Safe to run if not exists.
CREATE TABLE IF NOT EXISTS verification_task_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES verification_tasks(id) ON DELETE CASCADE,
  officer_id UUID REFERENCES users(id) ON DELETE SET NULL,
  url TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  content_type TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS verification_task_photos_task_id_idx
  ON verification_task_photos(task_id);

-- 4) Realtime (optional): uncomment if you use supabase_realtime publication
-- DO $$
-- BEGIN
--   IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
--     ALTER PUBLICATION supabase_realtime ADD TABLE verification_task_photos;
--   END IF;
-- EXCEPTION WHEN duplicate_object THEN NULL;
-- END $$;
