import React from 'react';

export interface TimelineEvent {
  id: string;
  eventType: string;
  eventTypeEn?: string;
  eventTypeAr?: string;
  timestamp: string;
  status?: string;
  direction?: string;
  amount?: number;
  actor?: { type: string; name: string | null };
  descriptionEn: string;
  descriptionAr: string;
}

interface OrderTimelineEventRowProps {
  event: TimelineEvent;
  isAr: boolean;
  isLast: boolean;
}

function statusDot(status?: string) {
  if (status === 'SUCCESS' || status === 'RELEASED' || status === 'COMPLETED') return 'bg-emerald-500';
  if (status === 'PENDING' || status === 'HELD') return 'bg-amber-500';
  return 'bg-white/30';
}

function formatTime(ts: string, isAr: boolean) {
  return new Date(ts).toLocaleString(isAr ? 'ar-EG' : 'en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export const OrderTimelineEventRow = React.memo(
  function OrderTimelineEventRow({ event, isAr, isLast }: OrderTimelineEventRowProps) {
    const isCredit = event.direction === 'CREDIT' || event.direction === 'RELEASE';
    const isDebit = event.direction === 'DEBIT';
    const title = isAr ? (event.eventTypeAr || event.eventType) : (event.eventTypeEn || event.eventType);
    const description = isAr ? event.descriptionAr : event.descriptionEn;
    const formattedTime = formatTime(event.timestamp, isAr);

    return (
      <article
        className={`relative pb-3 [content-visibility:auto] [contain-intrinsic-size:auto_96px] ${isAr ? 'pr-0' : ''}`}
      >
        <div
          className={`absolute top-2 ${isAr ? '-right-[21px]' : '-left-[21px]'} w-2 h-2 rounded-full border-2 border-[#0A0908] ${statusDot(event.status)}`}
        />

        <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3">
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-bold text-white truncate">{title}</p>
              <p className="text-[9px] text-white/35 font-mono">{formattedTime}</p>
            </div>
            {event.amount != null && (
              <p
                className={`text-sm font-mono font-black shrink-0 ${
                  isCredit ? 'text-emerald-400' : isDebit ? 'text-rose-400' : 'text-white/60'
                }`}
              >
                {isDebit ? '-' : '+'}
                {Number(event.amount).toLocaleString()} <span className="text-[8px] opacity-50">AED</span>
              </p>
            )}
          </div>
          <p className="text-[11px] text-white/55 leading-snug line-clamp-3">{description}</p>
        </div>
        {!isLast && <div className="h-2" aria-hidden="true" />}
      </article>
    );
  },
  (prev, next) =>
    prev.isAr === next.isAr &&
    prev.isLast === next.isLast &&
    prev.event.id === next.event.id &&
    prev.event.timestamp === next.event.timestamp &&
    prev.event.amount === next.event.amount &&
    prev.event.status === next.event.status,
);
