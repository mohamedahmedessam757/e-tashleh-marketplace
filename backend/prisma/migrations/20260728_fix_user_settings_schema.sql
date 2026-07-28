-- Align user_settings with Prisma UserSettings (WhatsApp language + chat prefs)
-- Root cause of WA failures: Prisma expected user_settings.id which never existed;
-- PK is user_id. Add missing columns used by Nest/Frontend.

ALTER TABLE user_settings
  ADD COLUMN IF NOT EXISTS auto_translate_chat BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE user_settings
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- Backfill preferred_language from legacy language when needed
UPDATE user_settings
SET preferred_language = CASE
  WHEN lower(coalesce(language, '')) IN ('en', 'english') THEN 'en'
  ELSE coalesce(nullif(preferred_language, ''), 'ar')
END
WHERE preferred_language IS NULL
   OR preferred_language = '';
