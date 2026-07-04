-- ============================================================
-- Migration: Add PARTIALLY_SHIPPED Status
-- Date: 2026-05-08
-- Description: Adds the PARTIALLY_SHIPPED state to the 
--              order_status enum for granular tracking.
-- ============================================================

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type t 
                   JOIN pg_enum e ON t.oid = e.enumtypid 
                   WHERE t.typname = 'order_status' AND e.enumlabel = 'PARTIALLY_SHIPPED') THEN
        ALTER TYPE order_status ADD VALUE 'PARTIALLY_SHIPPED' BEFORE 'SHIPPED';
    END IF;
END $$;

-- Verification
SELECT enumlabel FROM pg_enum WHERE enumtypid = 'order_status'::regtype;
