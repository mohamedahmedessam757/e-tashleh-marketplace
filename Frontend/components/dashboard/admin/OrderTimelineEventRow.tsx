import React from 'react';
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

export const OrderTimelineEventRow = React.memo(function OrderTimelineEventRow({
  event,
  isAr,
  isLast,
}: OrderTimelineEventRowProps) {
  const isCredit = event.direction === 'CREDIT' || event.direction === 'RELEASE';
  const isDebit = event.direction === 'DEBIT';
  const title = isAr ? (event.eventTypeAr || event.eventType) : (event.eventTypeEn || event.eventType);

  return (
    <div className="relative group">
      <div
        className={`absolute top-1 ${isAr ? '-right-[21px]' : '-left-[21px]'} w-[10px] h-[10px] rounded-full border-2 border-[#0A0908] z-10 ${
          event.status === 'SUCCESS' || event.status === 'RELEASED' || event.status === 'COMPLETED'
            ? 'bg-emerald-500'
            : event.status === 'PENDING' || event.status === 'HELD'
              ? 'bg-amber-500'
              : 'bg-white/20'
        }`}
      />

      <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-4 hover:bg-white/[0.04] hover:border-white/10">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className={`w-8 h-8 shrink-0 rounded-lg border flex items-center justify-center ${getEventColor(event.eventType)}`}>
              {getEventIcon(event.eventType)}
            </div>
            <div className="min-w-0">
              <div className="text-[10px] font-black text-white uppercase tracking-wider truncate">
                {title}
              </div>
              <div className="text-[9px] text-white/30 font-mono">
                {new Date(event.timestamp).toLocaleString(isAr ? 'ar-EG' : 'en-US', {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </div>
            </div>
          </div>
          {event.amount != null && (
            <div className="text-right shrink-0 ml-2">
              <div
                className={`text-sm font-mono font-black ${
                  isCredit ? 'text-emerald-400' : isDebit ? 'text-rose-400' : 'text-white/60'
                }`}
              >
                {isDebit ? '-' : '+'}
                {Number(event.amount).toLocaleString()}
              </div>
              <div className="text-[8px] text-white/20 font-black uppercase">AED</div>
            </div>
          )}
        </div>

        <p className="text-[11px] text-white/60 leading-relaxed bg-black/20 p-3 rounded-xl border border-white/5">
          {isAr ? event.descriptionAr : event.descriptionEn}
        </p>

        {event.actor && (
          <div className="mt-3 pt-3 border-t border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded bg-white/5 border border-white/10 flex items-center justify-center text-white/30">
                <User size={10} />
              </div>
              <span className="text-[9px] text-white/40 font-bold uppercase tracking-widest">
                {event.actor.type}: <span className="text-white/80">{event.actor.name}</span>
              </span>
            </div>
            {event.status && (
              <span className="text-[8px] font-black px-2 py-0.5 rounded bg-white/5 border border-white/10 text-white/30 uppercase">
                {event.status}
              </span>
            )}
          </div>
        )}
      </div>

      {!isLast && <div className="h-4" aria-hidden="true" />}
    </div>
  );
});
