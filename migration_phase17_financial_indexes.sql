-- ============================================================
-- Phase 17: Admin Financial Intelligence Hub — Performance Indexes
-- ============================================================
-- Purpose: Optimize query performance for the Admin Financial Dashboard.
-- These indexes target the most common query patterns:
--   • Filtering wallet_transactions by role (VENDOR, CUSTOMER, ADMIN)
--   • Filtering wallet_transactions by transaction_type (payment, commission, referral, etc.)
--   • Date-range queries on wallet_transactions and payment_transactions
--
-- HOW TO RUN:
--   1. Open Supabase Dashboard → SQL Editor
--   2. Paste this entire file and click "Run"
--   3. All statements use IF NOT EXISTS — safe to run multiple times
--
-- Author : Senior FullStack / Phase 5 Migration
-- Date   : 2026-04-27
-- Schema : public
-- ============================================================

-- ─────────────────────────────────────────
-- 1. wallet_transactions — role filter
-- ─────────────────────────────────────────
-- Used by: getAdminFinancials() when filtering by VENDOR / CUSTOMER / ADMIN role
CREATE INDEX IF NOT EXISTS idx_wallet_tx_role
  ON public.wallet_transactions (role);

-- ─────────────────────────────────────────
-- 2. wallet_transactions — transaction_type filter
-- ─────────────────────────────────────────
-- Used by: getAdminFinancials() when filtering by type (payment, commission, referral_profit, withdrawal, etc.)
CREATE INDEX IF NOT EXISTS idx_wallet_tx_transaction_type
  ON public.wallet_transactions (transaction_type);

-- ─────────────────────────────────────────
-- 3. wallet_transactions — date range filter
-- ─────────────────────────────────────────
-- Used by: every date-filtered ledger query in getAdminFinancials()
CREATE INDEX IF NOT EXISTS idx_wallet_tx_created_at
  ON public.wallet_transactions (created_at DESC);

-- ─────────────────────────────────────────
-- 4. wallet_transactions — composite: role + created_at
-- ─────────────────────────────────────────
-- Used by: combined role + date filters (most common dashboard query pattern)
CREATE INDEX IF NOT EXISTS idx_wallet_tx_role_created
  ON public.wallet_transactions (role, created_at DESC);

-- ─────────────────────────────────────────
-- 5. wallet_transactions — composite: transaction_type + created_at
-- ─────────────────────────────────────────
-- Used by: referral earnings aggregation filtered by date
CREATE INDEX IF NOT EXISTS idx_wallet_tx_type_created
  ON public.wallet_transactions (transaction_type, created_at DESC);

-- ─────────────────────────────────────────
-- 6. payment_transactions — composite: status + created_at
-- ─────────────────────────────────────────
-- Used by: getAdminFinancials() KPI aggregations (totalSales, netCommission, shippingProfit)
-- Note: @@index([status]) exists in Prisma schema (single-column), this adds the composite
CREATE INDEX IF NOT EXISTS idx_payment_tx_status_created
  ON public.payment_transactions (status, created_at DESC);

-- ─────────────────────────────────────────
-- 7. payment_transactions — created_at for date queries
-- ─────────────────────────────────────────
-- Used by: date-range filtering on the financial dashboard
CREATE INDEX IF NOT EXISTS idx_payment_tx_created_at
  ON public.payment_transactions (created_at DESC);

-- ─────────────────────────────────────────
-- 8. withdrawal_requests — composite: status + created_at
-- ─────────────────────────────────────────
-- Used by: pending withdrawals aggregation with date filter
-- Note: @@index([status]) exists in Prisma schema (single-column), this adds the composite
CREATE INDEX IF NOT EXISTS idx_withdrawal_status_created
  ON public.withdrawal_requests (status, created_at DESC);

-- ─────────────────────────────────────────
-- 9. escrow_transactions — composite: status + created_at
-- ─────────────────────────────────────────
-- Used by: frozen funds aggregation with date filter
-- Note: @@index([status]) exists in Prisma schema (single-column), this adds the composite
CREATE INDEX IF NOT EXISTS idx_escrow_status_created
  ON public.escrow_transactions (status, created_at DESC);

-- ─────────────────────────────────────────
-- Verification Query (run after applying indexes)
-- ─────────────────────────────────────────
-- Uncomment to verify all indexes were created:
/*
SELECT
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN (
    'wallet_transactions',
    'payment_transactions',
    'withdrawal_requests',
    'escrow_transactions'
  )
ORDER BY tablename, indexname;
*/
