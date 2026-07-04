-- =====================================================================
-- Seed: موظف مطابقة ميداني (اختبار) — Verification Officer Test User
-- شغّل هذا الملف يدوياً في Supabase SQL Editor
-- =====================================================================
-- بيانات الدخول (Admin Login + OTP كما في النظام):
--   Email:    verification.officer@etashleh.test
--   Password: Verification@2026!
--
-- بعد التشغيل: ادخل من /auth/admin-login بنفس الإيميل
-- ثم أكمل OTP (في التطوير يمكن تجاوز OTP من الواجهة)
-- =====================================================================

-- 1) دور VERIFICATION_OFFICER في enum
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'VERIFICATION_OFFICER'
      AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'user_role')
  ) THEN
    ALTER TYPE user_role ADD VALUE 'VERIFICATION_OFFICER';
  END IF;
END
$$;

-- 2) تأكد من وجود user_status (إن كان المشروع يستخدمه)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_status') THEN
    CREATE TYPE user_status AS ENUM ('ACTIVE', 'SUSPENDED', 'BLOCKED');
  END IF;
END
$$;

-- 3) إنشاء / تحديث المستخدم
-- bcrypt rounds=12 لكلمة المرور: Verification@2026!
INSERT INTO users (
  email,
  phone,
  password_hash,
  role,
  status,
  name,
  email_verified_at,
  country_code,
  country,
  created_at,
  updated_at
)
VALUES (
  'verification.officer@etashleh.test',
  '+971500000901',
  '$2b$12$uyHAqGZON2d12wk5wm8kmO4wWMVDkQf8S7ykf3BZgNn9xcGIoktw.',
  'VERIFICATION_OFFICER',
  'ACTIVE',
  'موظف مطابقة ميداني (اختبار)',
  NOW(),
  'AE',
  'United Arab Emirates',
  NOW(),
  NOW()
)
ON CONFLICT (email) DO UPDATE SET
  password_hash   = EXCLUDED.password_hash,
  role            = EXCLUDED.role,
  status          = EXCLUDED.status,
  name            = EXCLUDED.name,
  phone           = EXCLUDED.phone,
  email_verified_at = COALESCE(users.email_verified_at, EXCLUDED.email_verified_at),
  updated_at      = NOW();

-- 4) صلاحيات محدودة: مهام المطابقة + الملف الشخصي فقط
INSERT INTO admin_permissions (
  user_id,
  permissions,
  support_ticket_categories,
  blurred_sections,
  is_active,
  created_at,
  updated_at
)
SELECT
  u.id,
  '{
    "verification-tasks": {
      "view": true,
      "edit": true,
      "actions": {
        "start": true,
        "complete": true,
        "upload_photos": true
      }
    },
    "verification-task-details": {
      "view": true,
      "edit": true,
      "actions": {
        "start": true,
        "complete": true,
        "upload_photos": true
      }
    },
    "profile": {
      "view": true,
      "edit": false
    }
  }'::jsonb,
  '{}',
  ARRAY['financials', 'users', 'orders-control', 'access-control', 'settings', 'billing', 'financials']::text[],
  true,
  NOW(),
  NOW()
FROM users u
WHERE u.email = 'verification.officer@etashleh.test'
ON CONFLICT (user_id) DO UPDATE SET
  permissions   = EXCLUDED.permissions,
  blurred_sections = EXCLUDED.blurred_sections,
  is_active     = true,
  updated_at    = NOW();

-- 5) تحقق
SELECT
  u.id,
  u.email,
  u.role,
  u.status,
  u.name,
  ap.is_active AS permissions_active,
  ap.permissions->'verification-tasks' AS verification_tasks_perm
FROM users u
LEFT JOIN admin_permissions ap ON ap.user_id = u.id
WHERE u.email = 'verification.officer@etashleh.test';
