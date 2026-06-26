import React, { useCallback, useEffect, useRef, useState } from 'react';
import { OrderTimelineEventRow, type TimelineEvent } from './OrderTimelineEventRow';

const INITIAL_VISIBLE = 12;
const LOAD_BATCH = 12;
const SCROLL_LOAD_THRESHOLD = 80;

interface OrderTimelineVirtualListProps {
  orderId: string;
  events: TimelineEvent[];
  isAr: boolean;
}

export const OrderTimelineVirtualList = React.memo(function OrderTimelineVirtualList({
  orderId,
  events,
  isAr,
}: OrderTimelineVirtualListProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [visibleFromStart, setVisibleFromStart] = useState(INITIAL_VISIBLE);
  const mountedOrderRef = useRef<string | null>(null);

  useEffect(() => {
    setVisibleFromStart(INITIAL_VISIBLE);
    mountedOrderRef.current = orderId;
  }, [orderId]);

  useEffect(() => {
    if (events.length <= INITIAL_VISIBLE) {
      setVisibleFromStart(events.length);
    }
  }, [events.length]);

  const hiddenOlder = Math.max(0, events.length - visibleFromStart);
  const visibleEvents = hiddenOlder > 0 ? events.slice(hiddenOlder) : events;

  const loadOlder = useCallback(() => {
    setVisibleFromStart((count) => Math.min(events.length, count + LOAD_BATCH));
  }, [events.length]);

  const onScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el || hiddenOlder <= 0) return;
    if (el.scrollTop <= SCROLL_LOAD_THRESHOLD) loadOlder();
  }, [hiddenOlder, loadOlder]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el || mountedOrderRef.current !== orderId) return;
    requestAnimationFrame(() => {
      el.scrollTop = el.scrollHeight;
    });
  }, [orderId, visibleEvents.length]);

  return (
    <div className="flex flex-col min-h-0">
      {hiddenOlder > 0 && (
        <button
          type="button"
          onClick={loadOlder}
          className="mb-3 w-full py-2 text-[10px] font-black uppercase tracking-widest text-gold-500/80 hover:text-gold-400 border border-gold-500/20 rounded-xl bg-gold-500/5"
        >
          {isAr
            ? `عرض ${Math.min(LOAD_BATCH, hiddenOlder)} أحداث أقدم (${hiddenOlder} متبقية)`
            : `Load ${Math.min(LOAD_BATCH, hiddenOlder)} older events (${hiddenOlder} left)`}
        </button>
      )}

      <div
        ref={scrollRef}
        onScroll={onScroll}
        className="relative h-full overflow-y-auto overscroll-contain pl-8 rtl:pl-0 rtl:pr-8 [contain:strict]"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        <div
          className={`absolute top-0 bottom-0 ${isAr ? 'right-[15px]' : 'left-[15px]'} w-px bg-white/10 pointer-events-none`}
          aria-hidden="true"
        />
        {visibleEvents.map((event, idx) => (
          <OrderTimelineEventRow
            key={event.id}
            event={event}
            isAr={isAr}
            isLast={idx === visibleEvents.length - 1}
          />
        ))}
      </div>
    </div>
  );
});
