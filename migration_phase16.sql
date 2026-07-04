-- ==========================================
-- Phase 16: Chat Media Storage & RLS Setup
-- ==========================================

-- 1. Create the `chat_media` Storage Bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('chat_media', 'chat_media', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Setup Row Level Security (RLS) for chat_media
-- Drop existing policies if running multiple times
DROP POLICY IF EXISTS "Allow authenticated uploads to chat_media" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated reads from chat_media" ON storage.objects;
DROP POLICY IF EXISTS "Allow users to update their own chat_media" ON storage.objects;
DROP POLICY IF EXISTS "Allow users to delete their own chat_media" ON storage.objects;

-- Allow authenticated users to upload files to chat_media
CREATE POLICY "Allow authenticated uploads to chat_media"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK ( bucket_id = 'chat_media' );

-- Allow public read access to chat_media (since they are chat files, they can be read by anyone with the URL, or restricted to authenticated)
-- To be secure:
CREATE POLICY "Allow authenticated reads from chat_media"
ON storage.objects FOR SELECT
TO authenticated
USING ( bucket_id = 'chat_media' );

-- Allow users to update their own files
CREATE POLICY "Allow users to update their own chat_media"
ON storage.objects FOR UPDATE
TO authenticated
USING ( bucket_id = 'chat_media' AND auth.uid() = owner )
WITH CHECK ( bucket_id = 'chat_media' AND auth.uid() = owner );

-- Allow users to delete their own files
CREATE POLICY "Allow users to delete their own chat_media"
ON storage.objects FOR DELETE
TO authenticated
USING ( bucket_id = 'chat_media' AND auth.uid() = owner );

-- ==========================================
-- 3. Database Schema Modifications (Tables & Columns)
-- ==========================================

-- A. Altering 'order_chats' to support Unification & Real-Time Translations
ALTER TABLE "public"."order_chats" 
  ALTER COLUMN "order_id" DROP NOT NULL,   -- Make order target optional for generic support tickets
  ALTER COLUMN "vendor_id" DROP NOT NULL, -- Make vendor target optional for raw support tickets
  ALTER COLUMN "expiry_at" DROP NOT NULL, -- Allow support tickets to have no expiry
  ADD COLUMN IF NOT EXISTS "type" TEXT NOT NULL DEFAULT 'order',
  ADD COLUMN IF NOT EXISTS "expiry_at" TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS "customer_translation_enabled_at" TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS "vendor_translation_enabled_at" TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS "admin_translation_enabled_at" TIMESTAMPTZ;

-- Drop old unique constraint safely
ALTER TABLE "public"."order_chats" 
  DROP CONSTRAINT IF EXISTS "order_chats_order_id_vendor_id_key";

-- Add unified unique constraint
ALTER TABLE "public"."order_chats" 
  DROP CONSTRAINT IF EXISTS "order_chats_order_id_vendor_id_type_key";

ALTER TABLE "public"."order_chats" 
  ADD CONSTRAINT "order_chats_order_id_vendor_id_type_key" UNIQUE ("order_id", "vendor_id", "type");
  
-- B. Altering 'order_chat_messages' to support Media Buckets and Gemini Translation
ALTER TABLE "public"."order_chat_messages"
  ADD COLUMN IF NOT EXISTS "translated_text" TEXT,
  ADD COLUMN IF NOT EXISTS "media_url" TEXT,
  ADD COLUMN IF NOT EXISTS "media_type" TEXT,
  ADD COLUMN IF NOT EXISTS "media_name" TEXT;

-- ==========================================
-- 4. Legacy Data Migration (Support Tickets -> Order Chats)
-- ==========================================
-- This rescues old support tickets that were disconnected when the isolated support_tickets schema was dropped.
-- Using safely mapped fields for generic support inquiries.

INSERT INTO "public"."order_chats" (id, order_id, vendor_id, customer_id, status, type, expiry_at, created_at, updated_at)
SELECT 
  id::uuid, 
  NULL as order_id, 
  NULL as vendor_id, 
  user_id as customer_id, 
  status, 
  'support' as type, 
  NULL as expiry_at, 
  created_at, 
  updated_at 
FROM "public"."support_tickets"
ON CONFLICT DO NOTHING;

INSERT INTO "public"."order_chat_messages" (id, chat_id, sender_id, text, is_read, created_at)
SELECT 
  id::uuid, 
  ticket_id::uuid as chat_id, 
  sender_id::uuid,  
  text, 
  false as is_read, 
  created_at 
FROM "public"."ticket_messages"
ON CONFLICT DO NOTHING;
