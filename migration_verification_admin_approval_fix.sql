-- =====================================================================
-- إصلاح بيانات المطابقة الميدانية (بعد تحديث 2026-05-16)
-- شغّل يدوياً في Supabase إذا سبق أن انتقل طلب لـ CORRECTION_PERIOD بدون اعتماد أدمن
-- =====================================================================

-- 1) توحيد حالة المهام القديمة «بانتظار التصحيح» → «بانتظار اعتماد الإدارة»
UPDATE verification_tasks
SET status = 'AWAITING_ADMIN_APPROVAL', updated_at = NOW()
WHERE status = 'AWAITING_CORRECTION';

-- 2) إرجاع الطلبات التي قفزت لفترة التصحيح بينما المهمة ما زالت بانتظار الإدارة
UPDATE orders o
SET
  status = 'VERIFICATION',
  correction_deadline_at = NULL,
  updated_at = NOW()
FROM verification_tasks vt
WHERE vt.order_id = o.id
  AND vt.status = 'AWAITING_ADMIN_APPROVAL'
  AND vt.decision = 'NON_MATCHING'
  AND o.status IN ('CORRECTION_PERIOD', 'NON_MATCHING');

SELECT vt.id, vt.status, vt.decision, o.order_number, o.status AS order_status
FROM verification_tasks vt
JOIN orders o ON o.id = vt.order_id
WHERE vt.status = 'AWAITING_ADMIN_APPROVAL'
ORDER BY vt.updated_at DESC
LIMIT 20;
