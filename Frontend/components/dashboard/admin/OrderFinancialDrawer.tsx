import React, { useEffect, useRef, useCallback, memo } from 'react';
import { createPortal } from 'react-dom';
import { X, Receipt, ArrowRight, User, Store } from 'lucide-react';
import { useLanguage } from '../../../contexts/LanguageContext';
import { useOrderFinancialTimeline } from '../../../hooks/useOrderFinancialTimeline';
import { supabase } from '../../../services/supabase';
import { OrderTimelineVirtualList } from './OrderTimelineVirtualList';

interface OrderFinancialDrawerProps {
  orderId: string;
  onClose: () => void;
}

const SummaryCard = memo(function SummaryCard({
  label,
  value,
  tone = 'white',
}: {
  label: string;
  value: number;
  tone?: 'white' | 'gold' | 'emerald' | 'blue';
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
    <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
      <p className="text-[9px] font-bold text-white/25 uppercase mb-1 truncate">{label}</p>
      <p className={`text-lg font-mono font-black ${toneClass}`}>
        {Number(value).toLocaleString()}
        <span className="text-[9px] opacity-40 ml-1">AED</span>
      </p>
    </div>
  );
});

const DrawerBody = memo(function DrawerBody({
  orderId,
  isAr,
  t,
}: {
  orderId: string;
  isAr: boolean;
  t: any;
}) {
  const { data, loading, refreshing, silentRefresh } = useOrderFinancialTimeline(orderId);
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scheduleSilentRefresh = useCallback(() => {
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    refreshTimerRef.current = setTimeout(() => silentRefresh(), 1200);
  }, [silentRefresh]);

  useEffect(() => {
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
    };
  }, [orderId, scheduleSilentRefresh]);

  if (loading && !data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[240px] gap-3 opacity-60">
        <div className="w-7 h-7 border-2 border-gold-500 border-t-transparent rounded-full animate-spin" />
        <span className="text-[10px] font-bold uppercase text-gold-500">
          {t.admin.billing.ledger.auditDrawer.analyzing}
        </span>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center min-h-[200px] text-white/20 text-sm">
        {t.admin.billing.ledger.auditDrawer.noRecords}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full min-h-0 gap-6">
      <div className="shrink-0 space-y-6">
        <div className="grid grid-cols-2 gap-3">
        <SummaryCard label={t.admin.billing.ledger.auditDrawer.totalPaid} value={data.summary.totalPaid} />
        <SummaryCard
          label={t.admin.billing.ledger.auditDrawer.platformFee}
          value={data.summary.totalCommission}
          tone="gold"
        />
        <SummaryCard
          label={isAr ? 'حق التاجر (قيمة القطع)' : 'Merchant Earnings'}
          value={data.summary.merchantEarnings}
          tone="emerald"
        />
        <SummaryCard
          label={isAr ? 'حق شركة الشحن' : 'Shipping Fee'}
          value={data.summary.shippingCosts}
          tone="blue"
        />
      </div>

      <div className="flex items-center justify-between gap-3 p-4 rounded-2xl bg-white/[0.02] border border-white/5">
        <div className="flex flex-col items-center gap-1 flex-1 min-w-0">
          <div className="w-11 h-11 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center overflow-hidden">
            {data.customer.avatar ? (
              <img src={data.customer.avatar} alt="" loading="lazy" decoding="async" className="w-full h-full object-cover" />
            ) : (
              <User size={20} className="text-white/25" />
            )}
          </div>
          <span className="text-[11px] font-bold text-white truncate max-w-[100px]">{data.customer.name}</span>
        </div>
        <ArrowRight size={16} className={`opacity-20 shrink-0 ${isAr ? 'rotate-180' : ''}`} />
        <div className="flex flex-col items-center gap-1 flex-1 min-w-0">
          <div className="w-11 h-11 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center overflow-hidden">
            {data.merchants[0]?.logo ? (
              <img src={data.merchants[0].logo} alt="" loading="lazy" decoding="async" className="w-full h-full object-cover" />
            ) : (
              <Store size={20} className="text-white/25" />
            )}
          </div>
          <span className="text-[11px] font-bold text-white truncate max-w-[100px]">
            {data.merchants.length > 1
              ? `${data.merchants.length} ${isAr ? 'تجار' : 'Merchants'}`
              : data.merchants[0]?.name}
          </span>
        </div>
      </div>
      </div>

      <div className="flex flex-col flex-1 min-h-0">
        <div className="flex items-center gap-2 mb-3 shrink-0">
          <span className="text-[10px] font-black text-white/30 uppercase tracking-widest">
            {t.admin.billing.ledger.auditDrawer.timeline}
          </span>
          {refreshing && (
            <span className="w-2.5 h-2.5 border border-gold-500/50 border-t-gold-500 rounded-full animate-spin" />
          )}
        </div>
        <div className="flex-1 min-h-0">
          <OrderTimelineVirtualList orderId={orderId} events={data.timeline} isAr={isAr} />
        </div>
      </div>

      {(data.summary.totalRefunded > 0 || data.summary.hasDispute) && (
        <div className="shrink-0 p-3 rounded-xl bg-rose-500/5 border border-rose-500/10 text-rose-400 text-xs">
          {data.summary.totalRefunded > 0 && (
            <p>
              {isAr ? 'إجمالي المسترد:' : 'Total refunded:'}{' '}
              <span className="font-mono font-black">-{Number(data.summary.totalRefunded).toLocaleString()} AED</span>
            </p>
          )}
          {data.summary.hasDispute && (
            <p className="mt-1 opacity-80">{isAr ? 'يوجد نزاع نشط على هذا الطلب' : 'Active dispute on this order'}</p>
          )}
        </div>
      )}
    </div>
  );
});

export const OrderFinancialDrawer: React.FC<OrderFinancialDrawerProps> = memo(function OrderFinancialDrawer({
  orderId,
  onClose,
}) {
  const { t, language } = useLanguage();
  const isAr = language === 'ar';

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [onClose]);

  return createPortal(
    <>
      <div className="fixed inset-0 bg-black/75 z-[100]" onClick={onClose} aria-hidden="true" />

      <aside
        role="dialog"
        aria-modal="true"
        aria-label={t.admin.billing.ledger.auditDrawer.title}
        className={`fixed top-0 bottom-0 ${isAr ? 'left-0 border-r' : 'right-0 border-l'} w-full sm:max-w-md bg-[#0A0908] border-white/10 z-[101] flex flex-col [contain:layout_style_paint] [transform:translate3d(0,0,0)]`}
      >
        <header className="shrink-0 p-4 border-b border-white/5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-gold-500/10 border border-gold-500/20 flex items-center justify-center shrink-0">
              <Receipt className="text-gold-500" size={20} />
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-black text-white truncate">
                {t.admin.billing.ledger.auditDrawer.title}
              </h2>
              <p className="text-[10px] text-white/40 font-mono truncate">#{orderId.slice(-8).toUpperCase()}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-white/40 hover:text-white hover:bg-white/5 shrink-0"
            aria-label={t.admin.billing.ledger.auditDrawer.close}
          >
            <X size={18} />
          </button>
        </header>

        <div className="flex-1 min-h-0 overflow-hidden p-4">
          <DrawerBody orderId={orderId} isAr={isAr} t={t} />
        </div>

        <footer className="shrink-0 p-4 border-t border-white/5">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-3 bg-white/5 hover:bg-white/10 text-white text-xs font-black uppercase rounded-xl border border-white/10"
          >
            {t.admin.billing.ledger.auditDrawer.close}
          </button>
        </footer>
      </aside>
    </>,
    document.body,
  );
});
