-- Align violation type description with re-bid-allowed cancel policy.
-- Safe if 20260902_rename_offer_cancel_violation.sql already ran with older text.

UPDATE violation_types SET
  description_ar = 'تسجيل مخالفة عند إلغاء وحذف التاجر لعرضه أثناء فترة جمع العروض (حتى ساعة قبل كشف العروض). يمكن للتاجر تقديم عرض جديد على نفس القطعة طالما النافذة ما زالت مفتوحة.',
  description_en = 'Violation when a merchant cancels and deletes their offer during the collection window (until 1 hour before reveal). The merchant may submit a new offer on the same part while the window remains open.',
  updated_at = NOW()
WHERE code = 'VOLUNTARY_OFFER_WITHDRAW';
