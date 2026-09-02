-- Rename display labels for merchant offer cancel/delete violation.
-- Code VOLUNTARY_OFFER_WITHDRAW kept for historical records / autoIssue compatibility.
-- Idempotent: safe to re-run.

UPDATE violation_types SET
  name_ar = 'إلغاء وحذف العرض',
  name_en = 'Offer Cancellation & Deletion',
  description_ar = 'تسجيل مخالفة عند إلغاء وحذف التاجر لعرضه أثناء فترة جمع العروض. يمنع إعادة التقديم على نفس القطعة حتى انتهاء الفترة.',
  description_en = 'Violation when a merchant cancels and deletes their offer during the collection window. Blocks re-bidding on the same part until the window ends.',
  updated_at = NOW()
WHERE code = 'VOLUNTARY_OFFER_WITHDRAW';
