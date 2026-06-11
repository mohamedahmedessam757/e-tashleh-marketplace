/** Parse order.partImages / verification doc images from API (Json | string[]). */
export function asImageUrls(value: unknown): string[] {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value.filter((x): x is string => typeof x === 'string' && x.length > 0);
  }
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return asImageUrls(parsed);
    } catch {
      return value.startsWith('http') || value.startsWith('data:') ? [value] : [];
    }
  }
  return [];
}

export function formatActionLabel(action: string, isAr: boolean): string {
  const map: Record<string, { ar: string; en: string }> = {
    TASK_CREATED: { ar: 'إنشاء المهمة', en: 'Task created' },
    TASK_ASSIGNED: { ar: 'إسناد الموظف', en: 'Officer assigned' },
    LINK_GENERATED: { ar: 'إنشاء رابط', en: 'Link generated' },
    LINK_OPENED: { ar: 'فتح الرابط', en: 'Link opened' },
    LINK_ACTIVATED: { ar: 'تفعيل الرابط + OTP', en: 'Link activated' },
    VERIFICATION_STARTED: { ar: 'بدء المطابقة', en: 'Inspection started' },
    PHOTO_UPLOADED: { ar: 'رفع صور', en: 'Photos uploaded' },
    DECISION_MATCHING: { ar: 'قرار: مطابق', en: 'Decision: matching' },
    DECISION_NON_MATCHING: { ar: 'قرار: غير مطابق', en: 'Decision: non-matching' },
    REPORT_GENERATED: { ar: 'توليد التقرير', en: 'Report generated' },
  };
  const entry = map[action];
  return entry ? (isAr ? entry.ar : entry.en) : action;
}

/** طلب متعدد القطع (مجمّع) — وليس مجرد وجود سجل واحد في parts. */
export function isMultiPartOrder(order: {
  requestType?: string | null;
  parts?: unknown[] | null;
}): boolean {
  if (order.requestType === 'multiple') return true;
  return (order.parts?.length ?? 0) > 1;
}

export function resolveMerchantStore(
  order: { store?: { id?: string; name?: string; storeCode?: string; logo?: string | null } | null },
  doc?: { store?: { id?: string; name?: string; storeCode?: string; logo?: string | null } | null } | null,
) {
  if (order.store?.name || order.store?.storeCode) return order.store;
  if (doc?.store?.name || doc?.store?.storeCode) return doc.store;
  return order.store ?? doc?.store ?? null;
}

/** صور العميل للمقارنة — بدون تكرار في الطلب الفردي. */
export function getCustomerReferenceImages(order: {
  partImages?: unknown;
  parts?: { images?: unknown }[] | null;
  requestType?: string | null;
}): string[] {
  if (isMultiPartOrder(order)) {
    const fromParts = (order.parts ?? []).flatMap((p) => asImageUrls(p.images));
    const fromOrder = asImageUrls(order.partImages);
    return [...new Set([...fromOrder, ...fromParts])];
  }
  const fromOrder = asImageUrls(order.partImages);
  if (fromOrder.length > 0) return fromOrder;
  const firstPart = order.parts?.[0];
  return firstPart ? asImageUrls(firstPart.images) : [];
}

export const CUSTOMER_ORDER_STATUS_LABEL: Record<string, { ar: string; en: string }> = {
  VERIFICATION: { ar: 'قيد التوثيق / المطابقة', en: 'Under verification' },
  CORRECTION_PERIOD: { ar: 'فترة تصحيح (48 ساعة)', en: 'Correction period (48h)' },
  CORRECTION_SUBMITTED: { ar: 'تم إرسال التصحيح', en: 'Correction submitted' },
  VERIFICATION_SUCCESS: { ar: 'تم اعتماد التوثيق', en: 'Verification approved' },
};

export const VERIFICATION_TASK_STATUS_LABEL: Record<string, { ar: string; en: string }> = {
  PENDING: { ar: 'قيد الانتظار', en: 'Pending' },
  PENDING_ASSIGNMENT: { ar: 'بانتظار التعيين', en: 'Pending assignment' },
  ASSIGNED: { ar: 'تم التعيين', en: 'Assigned' },
  LINK_SENT: { ar: 'تم إرسال الرابط', en: 'Link sent' },
  IN_PROGRESS: { ar: 'قيد التنفيذ', en: 'In progress' },
  AWAITING_ADMIN_APPROVAL: { ar: 'بانتظار اعتماد الإدارة', en: 'Awaiting admin approval' },
  AWAITING_CORRECTION: { ar: 'بانتظار التصحيح من المتجر', en: 'Awaiting merchant correction' },
  ADMIN_APPROVED: { ar: 'تم اعتماد الإدارة', en: 'Admin approved' },
  ADMIN_REJECTED: { ar: 'مرفوض من الإدارة', en: 'Admin rejected' },
  COMPLETED_MATCH: { ar: 'تمت المطابقة بنجاح', en: 'Matching completed' },
  COMPLETED_NON_MATCH: { ar: 'تم إنهاء المهمة (غير مطابق)', en: 'Non-match completed' },
  EXPIRED: { ar: 'منتهي الصلاحية', en: 'Expired' },
  CANCELLED: { ar: 'ملغي', en: 'Cancelled' },
};

const PENDING_ADMIN_STATUSES = ['AWAITING_ADMIN_APPROVAL', 'AWAITING_CORRECTION'] as const;
const ACTIVE_TASK_STATUSES = ['PENDING_ASSIGNMENT', 'ASSIGNED', 'LINK_SENT', 'IN_PROGRESS', 'PENDING'] as const;
const DONE_TASK_STATUSES = [
  'ADMIN_APPROVED',
  'ADMIN_REJECTED',
  'COMPLETED_MATCH',
  'COMPLETED_NON_MATCH',
  'CANCELLED',
  'EXPIRED',
] as const;

export type AdminVerificationTasksFilter = 'all' | 'pending' | 'active' | 'done';

export function filterVerificationTasksForAdmin(tasks: { status?: string }[], filter: AdminVerificationTasksFilter) {
  if (filter === 'all') return tasks;
  if (filter === 'pending') {
    return tasks.filter((t) => PENDING_ADMIN_STATUSES.includes(t.status as (typeof PENDING_ADMIN_STATUSES)[number]));
  }
  if (filter === 'active') {
    return tasks.filter((t) => ACTIVE_TASK_STATUSES.includes(t.status as (typeof ACTIVE_TASK_STATUSES)[number]));
  }
  return tasks.filter((t) => DONE_TASK_STATUSES.includes(t.status as (typeof DONE_TASK_STATUSES)[number]));
}

export function countVerificationTasksByAdminFilter(tasks: { status?: string }[]) {
  return {
    all: tasks.length,
    pending: filterVerificationTasksForAdmin(tasks, 'pending').length,
    active: filterVerificationTasksForAdmin(tasks, 'active').length,
    done: filterVerificationTasksForAdmin(tasks, 'done').length,
  };
}

export const VERIFICATION_TASK_DECISION_LABEL: Record<string, { ar: string; en: string }> = {
  MATCHING: { ar: 'مطابق', en: 'Matching' },
  NON_MATCHING: { ar: 'غير مطابق', en: 'Non-matching' },
  PARTIAL_MATCH: { ar: 'مطابق جزئياً', en: 'Partial match' },
};

const FIELD_REPORT_TASK_STATUSES = new Set([
  'AWAITING_ADMIN_APPROVAL',
  'AWAITING_CORRECTION',
  'ADMIN_APPROVED',
  'ADMIN_REJECTED',
  'COMPLETED_MATCH',
  'COMPLETED_NON_MATCH',
]);

/** Task has a submitted field report (decision must stay visible after admin acts). */
export function taskHasFieldOfficerReport(task: {
  decision?: string | null;
  completedAt?: string | Date | null;
  status?: string | null;
} | null | undefined): boolean {
  if (!task) return false;
  if (task.decision) return true;
  if (task.completedAt) return true;
  return !!(task.status && FIELD_REPORT_TASK_STATUSES.has(task.status));
}

export function getFieldPhotoUrlsFromTask(task: {
  fieldPhotos?: { url?: string | null }[] | null;
  officerPhotos?: unknown;
} | null | undefined): string[] {
  if (!task) return [];
  const rows = task.fieldPhotos ?? [];
  const fromRows = rows.map((p) => p.url).filter((u): u is string => !!u);
  if (fromRows.length) return fromRows;
  return asImageUrls(task.officerPhotos);
}
