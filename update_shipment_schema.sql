-- 1. إضافة الحالة الجديدة "تأخير جمركي" إلى الـ Enum الخاص بحالات الشحن
ALTER TYPE "shipment_status" ADD VALUE 'CUSTOMS_DELAY';

-- 2. إضافة حقل "رابط التتبع" إلى جدول الشحنات
ALTER TABLE "shipments" ADD COLUMN "tracking_link" TEXT;

-- 3. إضافة حقل "رابط التتبع" لسجل الحالات (اختياري للتدقيق ولكن يفضل للـ Logic)
-- ALTER TABLE "shipment_status_logs" ADD COLUMN "tracking_link" TEXT; -- غير مطلوب حالياً بناءً على الطلب
