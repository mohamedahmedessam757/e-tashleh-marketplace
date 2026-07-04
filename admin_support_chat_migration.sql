-- ========================================================
-- Schema Migration: Admin Support Chat Enhancements
-- Created: 2026-04-19
-- Description: Adds adminInitReason to store the reason for opening a chat
--              without injecting it as a system message.
-- ========================================================

-- 1. Add adminInitReason to order_chats table
-- This field stores the administrative reason/justification for opening the ticket
-- It will be used for the UI Info Banner and Audit purposes.
ALTER TABLE order_chats ADD COLUMN IF NOT EXISTS "adminInitReason" TEXT;

-- 2. Optional: Add an index if we plan to search by this field (recommended for performance)
-- CREATE INDEX IF NOT EXISTS "idx_order_chats_admin_init_reason" ON order_chats("adminInitReason");

-- Note: Run this script manually in Supabase SQL Editor or via CLI.
