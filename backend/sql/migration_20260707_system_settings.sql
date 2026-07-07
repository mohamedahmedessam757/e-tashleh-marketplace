-- System Settings Expansion (2026) — RUN MANUALLY in Supabase SQL Editor
-- Phase 0: Schema + seed defaults

-- 1. Extend static_pages
ALTER TABLE static_pages
  ADD COLUMN IF NOT EXISTS is_published BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS meta_json JSONB DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_static_pages_published ON static_pages (is_published) WHERE is_published = true;

-- 2. Platform announcements (policy change banners)
CREATE TABLE IF NOT EXISTS platform_announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  title_ar TEXT,
  title_en TEXT,
  body_ar TEXT,
  body_en TEXT,
  effective_from TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  audience TEXT NOT NULL DEFAULT 'ALL' CHECK (audience IN ('ALL', 'CUSTOMER', 'VENDOR', 'ADMIN')),
  setting_key TEXT,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  audit_metadata JSONB DEFAULT '{}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_platform_announcements_active
  ON platform_announcements (is_active, effective_from, expires_at);

CREATE INDEX IF NOT EXISTS idx_platform_announcements_audience
  ON platform_announcements (audience) WHERE is_active = true;

-- 3. Seed missing static pages
INSERT INTO static_pages (slug, title_ar, title_en, content_ar, content_en, is_published)
VALUES
  ('payment-policy', 'سياسة الدفع', 'Payment Policy', 'سياسة الدفع الافتراضية...', 'Default payment policy...', true),
  ('shipping-policy', 'سياسة الشحن', 'Shipping Policy', 'سياسة الشحن الافتراضية...', 'Default shipping policy...', true),
  ('loyalty-policy', 'سياسة برنامج الولاء', 'Loyalty Program Policy', 'سياسة الولاء الافتراضية...', 'Default loyalty policy...', true),
  ('economic-registry', 'السجل الاقتصادي الوطني', 'National Economic Registry', 'محتوى السجل الاقتصادي...', 'Economic registry content...', true)
ON CONFLICT (slug) DO NOTHING;

-- 4. Merge new system_config sections (preserve existing keys)
UPDATE platform_settings
SET setting_value = setting_value
  || jsonb_build_object(
    'company', COALESCE(setting_value->'company', '{}'::jsonb) || jsonb_build_object(
      'legalNameAr', 'شركة إليب ش.م.ح-ذ.م.م',
      'legalNameEn', 'ELLIPP FZ-LLC',
      'crNumber', '4036902',
      'taxNumber', '',
      'licenseNumber', '45000927',
      'licenseExpiry', '2026-06-19',
      'hqAddressAr', 'إمارة رأس الخيمة بدولة الامارات العربية المتحدة',
      'hqAddressEn', 'Ras Al Khaimah, United Arab Emirates',
      'economicRegistryNumber', '',
      'economicRegistryContentAr', '',
      'economicRegistryContentEn', '',
      'nomoDocumentUrl', '',
      'nomoDocumentUpdatedAt', null
    ),
    'orderDurations', COALESCE(setting_value->'orderDurations', '{}'::jsonb) || jsonb_build_object(
      'assemblyCartDays', 7,
      'returnWindowHours', 24,
      'disputeWindowHours', 24,
      'paymentTimeoutHours', 24,
      'reminderDaysBeforeAssemblyExpiry', jsonb_build_array(5, 6)
    ),
    'general', COALESCE(setting_value->'general', '{}'::jsonb) || jsonb_build_object(
      'contacts', COALESCE(setting_value->'general'->'contacts', '{}'::jsonb) || jsonb_build_object(
        'customer', 'cs@e-tashleh.shop',
        'merchant', 'sl@e-tashleh.shop',
        'wholesale', 'wh@e-tashleh.shop',
        'company', 'shop@e-tashleh.shop'
      ),
      'earnIncome', COALESCE(setting_value->'general'->'earnIncome', '{}'::jsonb) || jsonb_build_object(
        'enabled', true,
        'heroTitleAr', 'اكسب دخل معنا',
        'heroTitleEn', 'Earn Income With Us',
        'heroSubtitleAr', 'انضم لبرنامج الولاء واكسب مع كل عملية',
        'heroSubtitleEn', 'Join our loyalty program and earn on every transaction',
        'sections', '[]'::jsonb
      )
    ),
    'logistics', COALESCE(setting_value->'logistics', '{}'::jsonb) || jsonb_build_object(
      'globalMinWeightKg', 0,
      'globalMaxWeightKg', 50
    )
  ),
  updated_at = NOW()
WHERE setting_key = 'system_config';

-- 5. RLS (read-only for anon on published static pages)
ALTER TABLE static_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_announcements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS static_pages_public_read ON static_pages;
CREATE POLICY static_pages_public_read ON static_pages
  FOR SELECT TO anon, authenticated
  USING (is_published = true);

DROP POLICY IF EXISTS platform_announcements_public_read ON platform_announcements;
CREATE POLICY platform_announcements_public_read ON platform_announcements
  FOR SELECT TO anon, authenticated
  USING (
    is_active = true
    AND effective_from <= NOW()
    AND (expires_at IS NULL OR expires_at > NOW())
  );
