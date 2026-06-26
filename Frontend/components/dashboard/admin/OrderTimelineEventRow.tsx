import React, { useMemo } from 'react';
import {
  CreditCard,
  ShieldCheck,
  Wallet,
  Download,
  Receipt,
  User,
} from 'lucide-react';

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

function getEventIcon(type: string) {
  if (type.includes('PAYMENT')) return <CreditCard size={16} className="text-gold-400" />;
  if (type.includes('ESCROW')) return <ShieldCheck size={16} className="text-emerald-400" />;
  if (type.includes('WALLET')) return <Wallet size={16} className="text-blue-400" />;
  if (type.includes('WITHDRAWAL')) return <Download size={16} className="text-purple-400" />;
  return <Receipt size={16} className="text-white/40" />;
}

function getEventColor(type: string) {
  if (type.includes('PAYMENT')) return 'border-gold-500/20 bg-gold-500/5 text-gold-400';
  if (type.includes('ESCROW')) return 'border-emerald-500/20 bg-emerald-500/5 text-emerald-400';
  if (type.includes('WALLET')) return 'border-blue-500/20 bg-blue-500/5 text-blue-400';
  if (type.includes('WITHDRAWAL')) return 'border-purple-500/20 bg-purple-500/5 text-purple-400';
  return 'border-white/10 bg-white/5 text-white/60';
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
    const formattedTime = useMemo(() => formatTime(event.timestamp, isAr), [event.timestamp, isAr]);
    const icon = useMemo(() => getEventIcon(event.eventType), [event.eventType]);
    const colorClass = useMemo(() => getEventColor(event.eventType), [event.eventType]);

    return (
      <article
        className={`relative pb-3 [content-visibility:auto] [contain-intrinsic-size:auto_120px] ${isAr ? 'pr-0' : ''}`}
      >
        <div
          className={`absolute top-2 ${isAr ? '-right-[21px]' : '-left-[21px]'} w-2 h-2 rounded-full border-2 border-[#0A0908] ${statusDot(event.status)}`}
        />

        <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3">
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <div className={`w-8 h-8 shrink-0 rounded-lg border flex items-center justify-center ${colorClass}`}>
                {icon}
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-black text-white uppercase tracking-wider truncate">{title}</p>
                <p className="text-[9px] text-white/30 font-mono">{formattedTime}</p>
              </div>
            </div>
            {event.amount != null && (
              <div className="text-right shrink-0">
                <p
                  className={`text-sm font-mono font-black ${
                    isCredit ? 'text-emerald-400' : isDebit ? 'text-rose-400' : 'text-white/60'
                  }`}
                >
                  {isDebit ? '-' : '+'}
                  {Number(event.amount).toLocaleString()}
                </p>
                <p className="text-[8px] text-white/20 font-black uppercase">AED</p>
              </div>
            )}
          </div>

          <p className="text-[11px] text-white/60 leading-relaxed bg-black/20 p-2.5 rounded-lg border border-white/5 line-clamp-4">
            {description}
          </p>

          {event.actor && (
            <div className="mt-2 pt-2 border-t border-white/5 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-5 h-5 rounded bg-white/5 border border-white/10 flex items-center justify-center text-white/30 shrink-0">
                  <User size={10} />
                </div>
                <span className="text-[9px] text-white/40 font-bold uppercase tracking-widest truncate">
                  {event.actor.type}: <span className="text-white/80">{event.actor.name}</span>
                </span>
              </div>
              {event.status && (
                <span className="text-[8px] font-black px-2 py-0.5 rounded bg-white/5 border border-white/10 text-white/30 uppercase shrink-0">
                  {event.status}
                </span>
              )}
            </div>
          )}
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
    prev.event.status === next.event.status &&
    prev.event.descriptionEn === next.event.descriptionEn &&
    prev.event.descriptionAr === next.event.descriptionAr,
);
