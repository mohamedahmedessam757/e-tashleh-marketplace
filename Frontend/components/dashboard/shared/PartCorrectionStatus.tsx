import React, { useEffect, useState } from 'react';
import { AlertTriangle, Clock } from 'lucide-react';
import { getServerNowMs } from '../../../utils/serverClock';
import {
  getVerificationDocForOffer,
  isOfferFulfillmentCancelled,
  merchantOfferCorrectionExpiredPendingCancel,
  merchantOfferNeedsCorrection,
  type VerificationDocSummary,
} from '../../../utils/offerFulfillmentHelpers';

function splitRemaining(ms: number): { h: number; m: number; s: number } {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  return {
    h: Math.floor(totalSec / 3600),
    m: Math.floor((totalSec % 3600) / 60),
    s: totalSec % 60,
  };
}

function formatHms(ms: number): string {
  const { h, m, s } = splitRemaining(ms);
  return [h, m, s].map((n) => String(n).padStart(2, '0')).join(':');
}

function formatLabeled(ms: number, isAr: boolean): string {
  const { h, m, s } = splitRemaining(ms);
  if (isAr) {
    if (h > 0) return `${h} س · ${m} د · ${s} ث`;
    if (m > 0) return `${m} د · ${s} ث`;
    return `${s} ث`;
  }
  if (h > 0) return `${h}h · ${m}m · ${s}s`;
  if (m > 0) return `${m}m · ${s}s`;
  return `${s}s`;
}

export function resolvePartCorrectionDeadline(
  doc?: Pick<VerificationDocSummary, 'correctionDeadlineAt'> | null,
  orderCorrectionDeadlineAt?: string | Date | null,
): string | null {
  const raw = doc?.correctionDeadlineAt || orderCorrectionDeadlineAt;
  if (!raw) return null;
  const ms = new Date(raw).getTime();
  return Number.isFinite(ms) ? new Date(ms).toISOString() : null;
}

/** Live countdown using server-synced clock (HH:MM:SS + labeled remainder). */
export const CorrectionCountdown: React.FC<{
  deadlineAt: string;
  className?: string;
  isAr?: boolean;
  /** Show human-readable units under/beside the mono clock */
  labeled?: boolean;
}> = ({ deadlineAt, className = '', isAr = false, labeled = false }) => {
  const [remainingMs, setRemainingMs] = useState(() => {
    return new Date(deadlineAt).getTime() - getServerNowMs();
  });

  useEffect(() => {
    const tick = () => setRemainingMs(new Date(deadlineAt).getTime() - getServerNowMs());
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [deadlineAt]);

  const expired = remainingMs <= 0;

  return (
    <span
      className={`inline-flex flex-col sm:flex-row sm:items-center gap-0.5 sm:gap-2 font-bold ${
        expired ? 'text-red-300' : 'text-amber-200'
      } ${className}`}
    >
      <span dir="ltr" className="inline-flex items-center gap-1.5 font-mono tabular-nums">
        <Clock size={12} className="shrink-0 opacity-80" />
        {expired ? '00:00:00' : formatHms(remainingMs)}
      </span>
      {labeled && !expired && (
        <span className="text-[10px] sm:text-xs font-semibold opacity-80 tabular-nums">
          {formatLabeled(remainingMs, isAr)}
        </span>
      )}
      {labeled && expired && (
        <span className="text-[10px] sm:text-xs font-semibold opacity-80">
          {isAr ? 'انتهت المهلة' : 'Expired'}
        </span>
      )}
    </span>
  );
};

export type PartCorrectionStatusProps = {
  isAr: boolean;
  fulfillmentStatus?: string | null;
  orderStatus?: string | null;
  verificationDocuments?: VerificationDocSummary[];
  offerId?: string | null;
  orderCorrectionDeadlineAt?: string | Date | null;
  /** denser layout for part cards / mobile */
  compact?: boolean;
  className?: string;
};

/**
 * Per-offer non-matching / correction status for multi-item orders.
 * Reads doc.correctionDeadlineAt (multi SSOT), not only order-level status.
 */
export const PartCorrectionStatus: React.FC<PartCorrectionStatusProps> = ({
  isAr,
  fulfillmentStatus,
  orderStatus,
  verificationDocuments,
  offerId,
  orderCorrectionDeadlineAt,
  compact = false,
  className = '',
}) => {
  const [, setTick] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => setTick((n) => n + 1), 1000);
    return () => window.clearInterval(id);
  }, []);

  if (!offerId) return null;
  if (isOfferFulfillmentCancelled(fulfillmentStatus)) return null;

  const nowMs = getServerNowMs();
  const doc = getVerificationDocForOffer(verificationDocuments, offerId);
  const needsCorrection = merchantOfferNeedsCorrection(
    fulfillmentStatus || undefined,
    doc,
    orderStatus,
    nowMs,
  );
  const pendingCancel = merchantOfferCorrectionExpiredPendingCancel(
    fulfillmentStatus || undefined,
    doc,
    orderStatus,
    nowMs,
  );

  if (!needsCorrection && !pendingCancel) return null;

  const deadlineAt = resolvePartCorrectionDeadline(doc, orderCorrectionDeadlineAt);
  const reason = doc?.adminRejectionReason?.trim() || null;

  return (
    <div
      className={`w-full min-w-0 rounded-xl border border-red-500/35 bg-red-500/10 text-start ${
        compact ? 'px-3 py-2.5' : 'px-4 py-3'
      } ${className}`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 min-w-0">
        <div className="flex items-start gap-2 min-w-0">
          <AlertTriangle size={16} className="text-red-400 shrink-0 mt-0.5" />
          <div className="min-w-0">
            <p className={`font-bold text-red-200 leading-snug ${compact ? 'text-xs' : 'text-sm'}`}>
              {pendingCancel
                ? isAr
                  ? 'انتهت مهلة التصحيح — جاري إلغاء القطعة تلقائياً'
                  : 'Correction window ended — cancelling this part'
                : isAr
                  ? 'رفض مطابقة — مهلة التصحيح لهذه القطعة'
                  : 'Matching rejected — correction window for this part'}
            </p>
            {reason && !pendingCancel && (
              <p className="text-[11px] text-red-200/75 mt-1 leading-relaxed break-words line-clamp-2">
                {reason}
              </p>
            )}
          </div>
        </div>
        {deadlineAt && !pendingCancel && (
          <div className="flex items-center gap-2 shrink-0 ps-6 sm:ps-0">
            <span className="text-[10px] font-bold uppercase tracking-wider text-red-300/70">
              {isAr ? 'متبقي' : 'Left'}
            </span>
            <CorrectionCountdown
              deadlineAt={deadlineAt}
              isAr={isAr}
              labeled
              className="text-xs sm:text-sm"
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default PartCorrectionStatus;
