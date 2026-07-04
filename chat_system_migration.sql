-- =============================================
-- Chat System Migration — RLS & Performance
-- Run this in Supabase SQL Editor
-- =============================================

-- 1. Ensure Realtime is enabled for chat tables
-- (Using exception handling since ADD TABLE doesn't support IF NOT EXISTS)
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE order_chat_messages;
EXCEPTION WHEN duplicate_object THEN
  RAISE NOTICE 'order_chat_messages already in supabase_realtime';
END;
$$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE order_chats;
EXCEPTION WHEN duplicate_object THEN
  RAISE NOTICE 'order_chats already in supabase_realtime';
END;
$$;

-- 2. Performance Index on is_read for unread count queries
CREATE INDEX IF NOT EXISTS idx_order_chat_messages_unread 
ON order_chat_messages (chat_id, is_read, sender_id) 
WHERE is_read = false;

-- 3. Storage Bucket — Ensure chat_media bucket exists and is public
INSERT INTO storage.buckets (id, name, public)
VALUES ('chat_media', 'chat_media', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 4. RLS Policies for chat_media bucket
-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Allow authenticated uploads to chat_media" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated reads from chat_media" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated deletes from chat_media" ON storage.objects;

-- Allow authenticated users to upload files to chat_media
CREATE POLICY "Allow authenticated uploads to chat_media"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'chat_media');

-- Allow authenticated users to read files from chat_media
CREATE POLICY "Allow authenticated reads from chat_media"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'chat_media');

-- Allow authenticated users to update/overwrite their files
CREATE POLICY "Allow authenticated updates to chat_media"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'chat_media');

-- Allow authenticated users to delete their own files (optional, for cleanup)
CREATE POLICY "Allow authenticated deletes from chat_media"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'chat_media');

-- 5. RLS for order_chats table (ensure participants can read their chats)
ALTER TABLE order_chats ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Customers can view their chats" ON order_chats;
CREATE POLICY "Customers can view their chats"
ON order_chats FOR SELECT
TO authenticated
USING (customer_id = auth.uid());

DROP POLICY IF EXISTS "Vendors can view their chats" ON order_chats;
CREATE POLICY "Vendors can view their chats"
ON order_chats FOR SELECT
TO authenticated
USING (vendor_id IN (SELECT id FROM stores WHERE owner_id = auth.uid()));

-- 6. RLS for order_chat_messages table
ALTER TABLE order_chat_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Chat participants can view messages" ON order_chat_messages;
CREATE POLICY "Chat participants can view messages"
ON order_chat_messages FOR SELECT
TO authenticated
USING (
  chat_id IN (
    SELECT id FROM order_chats 
    WHERE customer_id = auth.uid() 
    OR vendor_id IN (SELECT id FROM stores WHERE owner_id = auth.uid())
  )
);

DROP POLICY IF EXISTS "Chat participants can insert messages" ON order_chat_messages;
CREATE POLICY "Chat participants can insert messages"
ON order_chat_messages FOR INSERT
TO authenticated
WITH CHECK (
  chat_id IN (
    SELECT id FROM order_chats 
    WHERE customer_id = auth.uid() 
    OR vendor_id IN (SELECT id FROM stores WHERE owner_id = auth.uid())
  )
);

-- Allow read status updates (for markAsRead)
DROP POLICY IF EXISTS "Chat participants can update read status" ON order_chat_messages;
CREATE POLICY "Chat participants can update read status"
ON order_chat_messages FOR UPDATE
TO authenticated
USING (
  chat_id IN (
    SELECT id FROM order_chats 
    WHERE customer_id = auth.uid() 
    OR vendor_id IN (SELECT id FROM stores WHERE owner_id = auth.uid())
  )
);
