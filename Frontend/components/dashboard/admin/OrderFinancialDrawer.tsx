import React, { useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Receipt,
  ArrowRight,
  User,
  Store,
  CreditCard,
  Clock,
  Info,
  Truck,
  TrendingUp,
  Percent,
} from 'lucide-react';
import { useAdminStore } from '../../../stores/useAdminStore';
import { useLanguage } from '../../../contexts/LanguageContext';
import { supabase } from '../../../services/supabase';
import { OrderTimelineEventRow } from './OrderTimelineEventRow';

interface OrderFinancialDrawerProps {
  orderId: string;
  onClose: () => void;
}

function SummaryCard({
  label,
  value,
  tone = 'white',
  icon,
}: {
  label: string;
  value: number;
  tone?: 'white' | 'gold' | 'emerald' | 'blue';
  icon: React.ReactNode;
}) {
  const toneClass =
    tone === 'gold'
      ? 'text-gold-500'
      : tone === 'emerald'
        ? 'text-emerald-400'
        : tone === 'blue'
          ? 'text-blue-400'
          : 'text-white';

  return (
    <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5">
      <div className="text-[9px] font-black text-white/20 uppercase tracking-widest mb-1 flex items-center gap-2">
        {icon}
        {label}
      </div>
      <div className={`text-xl font-mono font-black ${toneClass}`}>
        {Number(value).toLocaleString()}
        <span className={`text-[10px] opacity-40 ml-1 ${toneClass}`}>AED</span>
      </div>
    </div>
  );
}

export const OrderFinancialDrawer: React.FC<OrderFinancialDrawerProps> = ({ orderId, onClose }) => {
  const { t, language } = useLanguage();
  const isAr = language === 'ar';

  const orderTimeline = useAdminStore((s) => s.orderTimeline);
  const orderTimelineLoading = useAdminStore((s) => s.orderTimelineLoading);
  const fetchOrderTimeline = useAdminStore((s) => s.fetchOrderTimeline);
  const clearOrderTimeline = useAdminStore((s) => s.clearOrderTimeline);

  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scheduleSilentRefresh = useCallback(() => {
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    refreshTimerRef.current = setTimeout(() => {
      fetchOrderTimeline(orderId, true);
    }, 600);
  }, [fetchOrderTimeline, orderId]);

  useEffect(() => {
    fetchOrderTimeline(orderId);

    const channel = supabase
      .channel(`order-audit-${orderId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'payment_transactions', filter: `order_id=eq.${orderId}` },
        scheduleSilentRefresh,
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'escrow_transactions', filter: `order_id=eq.${orderId}` },
        scheduleSilentRefresh,
      )
      .subscribe();

    return () => {
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
      supabase.removeChannel(channel);
      clearOrderTimeline();
    };
  }, [orderId, fetchOrderTimeline, clearOrderTimeline, scheduleSilentRefresh]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [onClose]);

  const showSkeleton = orderTimelineLoading && !orderTimeline;
  const timelineEvents = orderTimeline?.timeline ?? [];

  return createPortal(
    <>
      <div
        className="fixed inset-0 bg-black/70 z-[100] animate-in fade-in duration-200"
        onClick={onClose}
        aria-hidden="true"
      />

      <aside
        role="dialog"
        aria-modal="true"
        aria-label={t.admin.billing.ledger.auditDrawer.title}
        className={`fixed top-0 bottom-0 ${isAr ? 'left-0 border-r' : 'right-0 border-l'} w-full sm:max-w-xl bg-[#0A0908] border-white/10 z-[101] shadow-2xl flex flex-col animate-in ${isAr ? 'slide-in-from-left' : 'slide-in-from-right'} duration-300`}
      >
        <div className="p-4 sm:p-6 border-b border-white/5 bg-white/[0.02] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-4 min-w-0">
            <div className="w-12 h-12 rounded-2xl bg-gold-500/10 border border-gold-500/20 flex items-center justify-center shrink-0">
              <Receipt className="text-gold-500" size={24} />
            </div>
            <div className="min-w-0">
              <h2 className="text-lg font-black text-white uppercase tracking-tight truncate">
                {t.admin.billing.ledger.auditDrawer.title}
              </h2>
              <p className="text-xs text-white/40 font-mono truncate">
                #{orderTimeline?.order?.orderNumber || orderId.slice(-8).toUpperCase()}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 hover:bg-white/5 rounded-xl transition-colors text-white/40 hover:text-white shrink-0"
            aria-label={t.admin.billing.ledger.auditDrawer.close}
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-8 overscroll-contain">
          {showSkeleton ? (
            <div className="h-full min-h-[240px] flex flex-col items-center justify-center gap-4 opacity-50">
              <div className="w-8 h-8 border-2 border-gold-500 border-t-transparent rounded-full animate-spin" />
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-gold-500">
                {t.admin.billing.ledger.auditDrawer.analyzing}
              </span>
            </div>
          ) : orderTimeline ? (
            <>
              <div className="grid grid-cols-2 gap-4">
                <SummaryCard
                  label={t.admin.billing.ledger.auditDrawer.totalPaid}
                  value={orderTimeline.summary.totalPaid}
                  icon={<CreditCard size={10} className="text-white/40" />}
                />
                <SummaryCard
                  label={t.admin.billing.ledger.auditDrawer.platformFee}
                  value={orderTimeline.summary.totalCommission}
                  tone="gold"
                  icon={<Percent size={10} className="text-gold-500/40" />}
                />
                <SummaryCard
                  label={isAr ? 'حق التاجر (قيمة القطع)' : 'Merchant Earnings (Items)'}
                  value={orderTimeline.summary.merchantEarnings}
                  tone="emerald"
                  icon={<TrendingUp size={10} className="text-emerald-500/40" />}
                />
                <SummaryCard
                  label={isAr ? 'حق شركة الشحن' : 'Shipping Logistics Fee'}
                  value={orderTimeline.summary.shippingCosts}
                  tone="blue"
                  icon={<Truck size={10} className="text-blue-500/40" />}
                />
              </div>

              <div className="relative p-6 rounded-[2rem] bg-white/[0.02] border border-white/5">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex flex-col items-center gap-2 flex-1 min-w-0">
                    <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 overflow-hidden">
                      {orderTimeline.customer.avatar ? (
                        <img
                          src={orderTimeline.customer.avatar}
                          alt=""
                          loading="lazy"
                          decoding="async"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-white/20">
                          <User size={24} />
                        </div>
                      )}
                    </div>
                    <div className="text-center min-w-0">
                      <div className="text-xs font-black text-white truncate max-w-[120px]">
                        {orderTimeline.customer.name}
                      </div>
                    </div>
                  </div>

                  <ArrowRight size={20} className={`opacity-20 shrink-0 ${isAr ? 'rotate-180' : ''}`} />

                  <div className="flex flex-col items-center gap-2 flex-1 min-w-0">
                    <div className="flex -space-x-4 rtl:space-x-reverse">
                      {orderTimeline.merchants.slice(0, 3).map((m: any, idx: number) => (
                        <div
                          key={m.id}
                          className="w-14 h-14 rounded-2xl bg-[#0A0908] border border-white/10 overflow-hidden"
                          style={{ zIndex: 10 - idx }}
                        >
                          {m.logo ? (
                            <img src={m.logo} alt="" loading="lazy" decoding="async" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-white/20">
                              <Store size={24} />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                    <div className="text-xs font-black text-white truncate max-w-[120px]">
                      {orderTimeline.merchants.length > 1
                        ? `${orderTimeline.merchants.length} ${isAr ? 'تجار' : 'Merchants'}`
                        : orderTimeline.merchants[0]?.name}
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-[10px] font-black text-white/30 uppercase tracking-[0.3em] flex items-center gap-2">
                  <Clock size={12} className="text-gold-500" />
                  {t.admin.billing.ledger.auditDrawer.timeline}
                  {orderTimelineLoading && (
                    <span className="inline-block w-3 h-3 border border-gold-500/40 border-t-gold-500 rounded-full animate-spin" />
                  )}
                </h3>

                <div className={`relative pl-8 rtl:pl-0 rtl:pr-8 ${isAr ? 'pr-0' : ''}`}>
                  <div
                    className={`absolute top-2 bottom-2 ${isAr ? 'right-[15px]' : 'left-[15px]'} w-[2px] bg-white/10`}
                  />
                  {timelineEvents.map((event: any, idx: number) => (
                    <OrderTimelineEventRow
                      key={event.id}
                      event={event}
                      isAr={isAr}
                      isLast={idx === timelineEvents.length - 1}
                    />
                  ))}
                </div>
              </div>

              {(orderTimeline.summary.totalRefunded > 0 || orderTimeline.summary.hasDispute) && (
                <div className="p-4 rounded-2xl bg-rose-500/5 border border-rose-500/10 space-y-3">
                  <div className="flex items-center gap-2 text-rose-400">
                    <Info size={14} />
                    <span className="text-[10px] font-black uppercase tracking-widest">
                      {t.admin.billing.ledger.auditDrawer.alert}
                    </span>
                  </div>
                  {orderTimeline.summary.totalRefunded > 0 && (
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-rose-400/60 font-medium">
                        {isAr ? 'إجمالي المسترد' : 'Total Refunded'}
                      </span>
                      <span className="text-sm font-mono font-black text-rose-400">
                        -{Number(orderTimeline.summary.totalRefunded).toLocaleString()} AED
                      </span>
                    </div>
                  )}
                </div>
              )}
            </>
          ) : (
            <div className="h-full min-h-[200px] flex items-center justify-center text-white/10 italic text-sm">
              {t.admin.billing.ledger.auditDrawer.noRecords}
            </div>
          )}
        </div>

        <div className="p-4 sm:p-6 border-t border-white/5 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-4 bg-white/5 hover:bg-white/10 text-white text-xs font-black uppercase tracking-[0.2em] rounded-2xl border border-white/10 transition-colors active:scale-[0.98]"
          >
            {t.admin.billing.ledger.auditDrawer.close}
          </button>
        </div>
      </aside>
    </>,
    document.body,
  );
};
