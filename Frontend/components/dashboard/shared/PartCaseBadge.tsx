import React from 'react';
import { RotateCcw, Scale } from 'lucide-react';

type PartCase = {
  id: string;
  type: 'return' | 'dispute';
  offerId?: string | null;
  orderPartId?: string | null;
  status: string;
  caseReference?: string | null;
};

const OPEN_RETURN_EXCLUDED = new Set(['CANCELLED', 'REJECTED', 'REFUNDED', 'RESOLVED', 'CLOSED']);
const OPEN_DISPUTE_EXCLUDED = new Set(['CLOSED', 'RESOLVED', 'REFUNDED', 'CANCELLED', 'REJECTED']);

function caseStatusLabel(status: string, isAr: boolean): string {
  const s = String(status || '').toUpperCase();
  const map: Record<string, [string, string]> = {
    PENDING: ['قيد المراجعة', 'Pending'],
    OPEN: ['مفتوح', 'Open'],
    AWAITING_ADMIN: ['بانتظار الإدارة', 'Awaiting admin'],
    UNDER_REVIEW: ['قيد المراجعة', 'Under review'],
    APPROVED: ['مقبول', 'Approved'],
    RETURN_STARTED: ['بدأ الإرجاع', 'Return started'],
    REJECTED: ['مرفوض', 'Rejected'],
    REFUNDED: ['تم الاسترداد', 'Refunded'],
    RESOLVED: ['تم الحل', 'Resolved'],
    CLOSED: ['مغلق', 'Closed'],
    CANCELLED: ['ملغي', 'Cancelled'],
  };
  const pair = map[s];
  return pair ? (isAr ? pair[0] : pair[1]) : s;
}

/** Per-part return/dispute status chips (admin part cards on multi-part orders). */
export const PartCaseBadges: React.FC<{
  cases?: PartCase[] | null;
  offerId?: string | null;
  orderPartId?: string | null;
  isAr: boolean;
}> = ({ cases, offerId, orderPartId, isAr }) => {
  const mine = (cases || []).filter(
    (c) =>
      (offerId && c.offerId && String(c.offerId) === String(offerId)) ||
      (orderPartId && c.orderPartId && String(c.orderPartId) === String(orderPartId)),
  );
  if (!mine.length) return null;
  return (
    <>
      {mine.map((c) => {
        const isReturn = c.type === 'return';
        const st = String(c.status || '').toUpperCase();
        const open = isReturn ? !OPEN_RETURN_EXCLUDED.has(st) : !OPEN_DISPUTE_EXCLUDED.has(st);
        const Icon = isReturn ? RotateCcw : Scale;
        return (
          <span
            key={`${c.type}-${c.id}`}
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[10px] font-black ${
              open
                ? 'border-orange-500/40 bg-orange-500/15 text-orange-200'
                : 'border-white/15 bg-white/5 text-white/60'
            }`}
            title={c.caseReference || undefined}
          >
            <Icon size={10} />
            {isReturn ? (isAr ? 'إرجاع' : 'Return') : isAr ? 'نزاع' : 'Dispute'}
            {' · '}
            {caseStatusLabel(c.status, isAr)}
            {c.caseReference ? <span className="font-mono opacity-70">#{c.caseReference}</span> : null}
          </span>
        );
      })}
    </>
  );
};
