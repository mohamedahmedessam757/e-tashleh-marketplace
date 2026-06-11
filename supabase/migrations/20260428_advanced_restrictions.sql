-- Migration: Advanced Administrative Restrictions (2026 Standard)
-- Target: users and stores tables

-- 1. Extend Users Table
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS withdrawals_frozen BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS withdrawal_freeze_note TEXT,
ADD COLUMN IF NOT EXISTS withdrawal_freeze_signature TEXT,
ADD COLUMN IF NOT EXISTS order_limit INTEGER DEFAULT -1, -- -1 means unlimited
ADD COLUMN IF NOT EXISTS daily_order_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS restriction_alert_message TEXT;

-- 2. Extend Stores Table
ALTER TABLE public.stores
ADD COLUMN IF NOT EXISTS offer_limit INTEGER DEFAULT -1, -- -1 means unlimited
ADD COLUMN IF NOT EXISTS daily_offer_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS visibility_restricted BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS visibility_note TEXT,
ADD COLUMN IF NOT EXISTS visibility_signature TEXT,
ADD COLUMN IF NOT EXISTS visibility_rate INTEGER DEFAULT 100; -- 0 to 100 percentage

-- 3. Comments for Documentation
COMMENT ON COLUMN public.users.withdrawals_frozen IS 'If true, all withdrawal requests from this user are blocked.';
COMMENT ON COLUMN public.users.order_limit IS 'Maximum number of orders this customer can create per day. -1 for unlimited.';
COMMENT ON COLUMN public.stores.visibility_rate IS 'Percentage of total orders visible to this merchant (0-100).';

-- 4. Enable Realtime for these tables (if not already enabled)
-- Note: This is usually done via the Supabase UI or specific extensions, 
-- but ensuring the tables are in the publication is good practice.
ALTER PUBLICATION supabase_realtime ADD TABLE public.users;
ALTER PUBLICATION supabase_realtime ADD TABLE public.stores;
