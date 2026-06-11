-- 🛡️ Security & Realtime Configuration Script
-- Run this in Supabase SQL Editor

-- 1️⃣ Enable Row Level Security (RLS) on All Tables
-- This blocks all access via Supabase Client (Anon/Public) unless a policy exists.
-- The Backend (Prisma) connects as 'postgres' so it BYPASSES these rules (Safe).

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE store_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE static_pages ENABLE ROW LEVEL SECURITY;

-- 2️⃣ Enable Realtime for Critical Tables
-- Allows the Frontend to listen to changes (INSERT/UPDATE) on these tables.

ALTER PUBLICATION supabase_realtime ADD TABLE orders;
ALTER PUBLICATION supabase_realtime ADD TABLE offers;
-- ALTER PUBLICATION supabase_realtime ADD TABLE notifications; (If you have this table)

-- 3️⃣ Define Access Policies (Policies)

-- ➤ USERS: Users can read their own profile. Admins can read all.
CREATE POLICY "Users can read own data" ON users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Admins can read all users" ON users
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('ADMIN', 'SUPER_ADMIN'))
  );

-- ➤ STORES: Public can view active stores (Marketplace). Owners view their own.
CREATE POLICY "Public can view active stores" ON stores
  FOR SELECT USING (status = 'ACTIVE');

CREATE POLICY "Owners can view own store" ON stores
  FOR SELECT USING (owner_id = auth.uid());

CREATE POLICY "Admins can view all stores" ON stores
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('ADMIN', 'SUPER_ADMIN'))
  );

-- ➤ ORDERS: Customers see their orders. Vendors see orders they can bid on (e.g. status AWAITING_OFFERS) or assigned.
CREATE POLICY "Customers see own orders" ON orders
  FOR SELECT USING (customer_id = auth.uid());

CREATE POLICY "Admins see all orders" ON orders
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('ADMIN', 'SUPER_ADMIN'))
  );

-- (Simple Policy for Vendors: Can see orders if they placed an offer OR order is awaiting offers)
CREATE POLICY "Vendors see open orders" ON orders
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'VENDOR') 
    AND 
    (status = 'AWAITING_OFFERS' OR store_id = auth.uid()) -- Simplying logic for M1
  );

-- ➤ OFFERS: Vendors see own offers. Customers see offers on their orders.
CREATE POLICY "Vendors see own offers" ON offers
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM stores WHERE id = offers.store_id AND owner_id = auth.uid())
  );

CREATE POLICY "Customers see offers on their orders" ON offers
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM orders WHERE id = offers.order_id AND customer_id = auth.uid())
  );

-- ➤ AUDIT LOGS: Admins only.
CREATE POLICY "Admins read audit logs" ON audit_logs
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('ADMIN', 'SUPER_ADMIN', 'SUPPORT'))
  );

-- ➤ STATIC PAGES: Public Read.
CREATE POLICY "Public read static pages" ON static_pages
  FOR SELECT USING (true);


-- 4️⃣ Storage Policies (If using Supabase Storage)
-- You must CREATE these in the Storage UI or SQL if supported.
-- Example logic for 'store_documents' bucket:
--   INSERT: auth.role() = 'authenticated'
--   SELECT: auth.uid() = owner_id OR role = admin
