-- Enable pgcrypto extension for UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Enums
CREATE TYPE user_role AS ENUM ('CUSTOMER', 'VENDOR', 'ADMIN', 'SUPER_ADMIN', 'SUPPORT');
CREATE TYPE store_status AS ENUM ('PENDING_DOCUMENTS', 'PENDING_REVIEW', 'ACTIVE', 'SUSPENDED', 'BLOCKED', 'LICENSE_EXPIRED');
CREATE TYPE order_status AS ENUM (
  'AWAITING_OFFERS',
  'AWAITING_PAYMENT',
  'PREPARATION',
  'SHIPPED',
  'DELIVERED',
  'COMPLETED',
  'CANCELLED',
  'RETURNED',
  'DISPUTED',
  'RETURN_REQUESTED',
  'RETURN_APPROVED',
  'REFUNDED',
  'RESOLVED'
);
CREATE TYPE actor_type AS ENUM ('SYSTEM', 'ADMIN', 'CUSTOMER', 'VENDOR');
CREATE TYPE doc_type AS ENUM ('CR', 'LICENSE', 'ID', 'IBAN', 'AUTH_LETTER');

-- Users Table
CREATE TABLE users (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email             TEXT NOT NULL UNIQUE,
  phone             TEXT,
  password_hash     TEXT NOT NULL,
  role              user_role NOT NULL DEFAULT 'CUSTOMER',
  name              TEXT,
  email_verified_at TIMESTAMPTZ,
  otp_code          TEXT,
  otp_expires_at    TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);

-- Stores Table
CREATE TABLE stores (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id        UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  name            TEXT NOT NULL,
  slug            TEXT UNIQUE,
  description     TEXT,
  category        TEXT,
  status          store_status NOT NULL DEFAULT 'PENDING_DOCUMENTS',
  license_expiry  DATE,
  balance         NUMERIC(14,2) NOT NULL DEFAULT 0,
  rating          NUMERIC(3,2) NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_stores_owner ON stores(owner_id);
CREATE INDEX idx_stores_status ON stores(status);

-- Store Documents
CREATE TABLE store_documents (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id    UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  doc_type    doc_type NOT NULL,
  file_url    TEXT,
  status      TEXT NOT NULL DEFAULT 'pending',
  rejected_reason TEXT,
  expires_at  DATE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(store_id, doc_type)
);

-- Orders Table
CREATE TABLE orders (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number    TEXT NOT NULL UNIQUE,
  customer_id     UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  store_id        UUID REFERENCES stores(id) ON DELETE SET NULL,
  status          order_status NOT NULL DEFAULT 'AWAITING_OFFERS',
  
  -- Vehicle
  vehicle_make    TEXT NOT NULL,
  vehicle_model   TEXT NOT NULL,
  vehicle_year    SMALLINT NOT NULL,
  vin             TEXT,
  
  -- Part
  part_name       TEXT NOT NULL,
  part_description TEXT,
  part_images     JSONB DEFAULT '[]',
  
  -- Preferences
  condition_pref  TEXT,
  warranty_preferred BOOLEAN DEFAULT false,
  
  -- Financial
  total_amount    NUMERIC(14,2),
  offer_id        UUID, -- Will link to offers later (circular FK handled below)
  
  -- Timestamps
  offers_deadline_at TIMESTAMPTZ,
  payment_deadline_at TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_orders_customer ON orders(customer_id);
CREATE INDEX idx_orders_store ON orders(store_id);
CREATE INDEX idx_orders_status ON orders(status);

-- Offers Table
CREATE TABLE offers (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id      UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  store_id      UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  unit_price    NUMERIC(14,2) NOT NULL,
  weight_kg     NUMERIC(8,2) NOT NULL,
  shipping_cost NUMERIC(14,2) NOT NULL DEFAULT 0,
  has_warranty  BOOLEAN NOT NULL DEFAULT false,
  delivery_days TEXT,
  condition     TEXT,
  notes         TEXT,
  status        TEXT NOT NULL DEFAULT 'pending',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_offers_order ON offers(order_id);

-- Add Circular FK for Accepted Offer
ALTER TABLE orders ADD CONSTRAINT fk_orders_accepted_offer
  FOREIGN KEY (offer_id) REFERENCES offers(id) ON DELETE SET NULL;

-- Audit Logs
CREATE TABLE audit_logs (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id       UUID REFERENCES orders(id) ON DELETE SET NULL,
  action         TEXT NOT NULL,
  entity         TEXT NOT NULL,
  actor_type     actor_type NOT NULL,
  actor_id       TEXT,
  actor_name     TEXT,
  previous_state TEXT,
  new_state      TEXT,
  reason         TEXT,
  metadata       JSONB,
  timestamp      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_audit_order ON audit_logs(order_id);
CREATE INDEX idx_audit_actor ON audit_logs(actor_id);

-- Static Pages
CREATE TABLE static_pages (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug        TEXT NOT NULL UNIQUE,
  title_ar    TEXT,
  title_en    TEXT,
  content_ar  TEXT,
  content_en  TEXT,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Initial Data for Static Pages
INSERT INTO static_pages (slug, title_ar, title_en) VALUES
  ('about', 'من نحن', 'About Us'),
  ('how-we-work', 'كيف نعمل', 'How We Work'),
  ('terms', 'الشروط والأحكام', 'Terms & Conditions'),
  ('privacy', 'سياسة الخصوصية', 'Privacy Policy'),
  ('return-policy', 'سياسة الإرجاع', 'Return Policy'),
  ('contact', 'تواصل معنا', 'Contact Us');

-- Order Number Generator Function
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS TEXT AS $$
DECLARE
  seq INT;
  yr  TEXT := to_char(now(), 'YY');
  mn  TEXT := to_char(now(), 'MM');
BEGIN
  SELECT COUNT(*)::INT + 1 INTO seq FROM orders WHERE created_at >= date_trunc('month', now());
  RETURN 'ORD-' || yr || mn || '-' || lpad(seq::TEXT, 5, '0');
END;
$$ LANGUAGE plpgsql;
