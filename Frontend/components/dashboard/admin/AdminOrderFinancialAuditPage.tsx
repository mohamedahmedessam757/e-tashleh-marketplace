import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Receipt,
  User,
  Store,
  CreditCard,
  Clock,
  Truck,
  TrendingUp,
  Percent,
  RotateCcw,
  ShieldCheck,
  Wallet,
  Download,
  AlertTriangle,
  RefreshCw,
  ExternalLink,
  Search,
  ArrowDownUp,
  Calendar,
  Hash,
  Copy,
  Check,
} from 'lucide-react';
import { useLanguage } from '../../../contexts/LanguageContext';
import {
  useOrderFinancialTimeline,
  type OrderTimelineEvent,
} from '../../../hooks/useOrderFinancialTimeline';
import { supabase } from '../../../services/supabase';

interface AdminOrderFinancialAuditPageProps {
  orderId: string;
  onNavigate?: (path: string, id?: any, tab?: string) => void;
  onBack?: () => void;
}

type EventCategory = 'ALL' | 'PAYMENT' | 'ESCROW' | 'WALLET' | 'WITHDRAWAL' | 'OTHER';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function categorize(type: string): Exclude<EventCategory, 'ALL'> {
  if (type.includes('PAYMENT')) return 'PAYMENT';
  if (type.includes('ESCROW')) return 'ESCROW';
  if (type.includes('WALLET')) return 'WALLET';
  if (type.includes('WITHDRAWAL')) return 'WITHDRAWAL';
  return 'OTHER';
}

const CATEGORY_STYLE: Record<Exclude<EventCategory, 'ALL'>, { icon: React.ElementType; cls: string }> = {
  PAYMENT: { icon: CreditCard, cls: 'border-gold-500/30 bg-gold-500/10 text-gold-400' },
  ESCROW: { icon: ShieldCheck, cls: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400' },
  WALLET: { icon: Wallet, cls: 'border-blue-500/30 bg-blue-500/10 text-blue-400' },
  WITHDRAWAL: { icon: Download, cls: 'border-purple-500/30 bg-purple-500/10 text-purple-400' },
  OTHER: { icon: Receipt, cls: 'border-white/15 bg-white/5 text-white/70' },
};

function statusTone(status?: string) {
  if (status === 'SUCCESS' || status === 'RELEASED' || status === 'COMPLETED')
    return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
  if (status === 'PENDING' || status === 'HELD')
    return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
  if (status === 'FAILED' || status === 'REFUNDED' || status === 'CANCELLED')
    return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
  return 'bg-white/5 text-white/60 border-white/10';
}

function formatMoney(value: number) {
  return Number(value || 0).toLocaleString('en-US', { maximumFractionDigits: 2 });
}

function formatDateTime(ts: string, isAr: boolean) {
  return new Date(ts).toLocaleString(isAr ? 'ar-EG' : 'en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const StatCard: React.FC<{
  label: string;
  hint: string;
  value: number;
  icon: React.ElementType;
  tone: string;
  negative?: boolean;
}> = ({ label, hint, value, icon: Icon, tone, negative }) => (
  <div className="p-5 rounded-2xl bg-[#151310] border border-white/10 flex flex-col gap-3">
    <div className="flex items-center gap-3">
      <div className={`w-10 h-10 rounded-xl border flex items-center justify-center ${tone}`}>
        <Icon size={18} />
      </div>
      <div className="min-w-0">
        <p className="text-sm font-bold text-white/90">{label}</p>
        <p className="text-xs text-white/45 leading-snug">{hint}</p>
      </div>
    </div>
    <p className={`text-3xl font-mono font-black ${negative ? 'text-rose-400' : 'text-white'}`}>
      {negative && value > 0 ? '-' : ''}
      {formatMoney(value)}
      <span className="text-sm text-white/40 ms-2">AED</span>
    </p>
  </div>
);

export const AdminOrderFinancialAuditPage: React.FC<AdminOrderFinancialAuditPageProps> = ({
  orderId,
  onNavigate,
  onBack,
}) => {
  const { t, language } = useLanguage();
  const isAr = language === 'ar';
  const { data, loading, refreshing, error, silentRefresh } = useOrderFinancialTimeline(orderId);
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const realtimeOrderId = data?.order?.id || orderId;

  const [category, setCategory] = useState<EventCategory>('ALL');
  const [query, setQuery] = useState('');
  const [newestFirst, setNewestFirst] = useState(false);
  const [copied, setCopied] = useState(false);

  const scheduleSilentRefresh = useCallback(() => {
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    refreshTimerRef.current = setTimeout(() => silentRefresh(), 1200);
  }, [silentRefresh]);

  useEffect(() => {
    if (!UUID_RE.test(realtimeOrderId)) return;
    const filter = `order_id=eq.${realtimeOrderId}`;
    const channel = supabase
      .channel(`order-audit-page-${realtimeOrderId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'payment_transactions', filter }, scheduleSilentRefresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'escrow_transactions', filter }, scheduleSilentRefresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'returns', filter }, scheduleSilentRefresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'disputes', filter }, scheduleSilentRefresh)
      .subscribe();

    return () => {
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
      supabase.removeChannel(channel);
    };
  }, [realtimeOrderId, scheduleSilentRefresh]);

  const goBack = useCallback(() => {
    if (onBack) onBack();
    else onNavigate?.('billing', undefined, 'TRANSACTIONS');
  }, [onBack, onNavigate]);

  const copyOrderNumber = useCallback(() => {
    const value = data?.order?.orderNumber || orderId;
    void navigator.clipboard?.writeText(value).then(() => {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    });
  }, [data?.order?.orderNumber, orderId]);

  const categoryCounts = useMemo(() => {
    const counts: Record<EventCategory, number> = { ALL: 0, PAYMENT: 0, ESCROW: 0, WALLET: 0, WITHDRAWAL: 0, OTHER: 0 };
    for (const e of data?.timeline ?? []) {
      counts.ALL += 1;
      counts[categorize(e.eventType)] += 1;
    }
    return counts;
  }, [data?.timeline]);

  const visibleEvents = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = (data?.timeline ?? []).filter((e) => {
      if (category !== 'ALL' && categorize(e.eventType) !== category) return false;
      if (!q) return true;
      return [e.eventType, e.eventTypeAr, e.eventTypeEn, e.descriptionAr, e.descriptionEn, e.actor?.name, e.status]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q));
    });
    const sorted = [...list].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
    );
    return newestFirst ? sorted.reverse() : sorted;
  }, [data?.timeline, category, query, newestFirst]);

  const breakdown = useMemo(() => {
    if (!data) return [];
    const s = data.summary;
    const total = s.totalPaid || s.merchantEarnings + s.shippingCosts + s.totalCommission || 1;
    return [
      { key: 'merchant', label: isAr ? 'حق التاجر (قيمة القطع)' : 'Merchant (parts value)', value: s.merchantEarnings, bar: 'bg-emerald-500', text: 'text-emerald-400' },
      { key: 'shipping', label: isAr ? 'حق شركة الشحن' : 'Shipping company', value: s.shippingCosts, bar: 'bg-blue-500', text: 'text-blue-400' },
      { key: 'commission', label: isAr ? 'عمولة المنصة' : 'Platform commission', value: s.totalCommission, bar: 'bg-gold-500', text: 'text-gold-400' },
    ].map((row) => ({ ...row, pct: Math.max(0, Math.min(100, (row.value / total) * 100)) }));
  }, [data, isAr]);

  const orderLabel = data?.order?.orderNumber || orderId.slice(-8).toUpperCase();
  const statusLabel = data?.order?.status
    ? ((t.common.status as any)?.[data.order.status] || data.order.status)
    : null;

  const categories: Array<{ id: EventCategory; label: string }> = [
    { id: 'ALL', label: isAr ? 'الكل' : 'All' },
    { id: 'PAYMENT', label: isAr ? 'المدفوعات' : 'Payments' },
    { id: 'ESCROW', label: isAr ? 'الضمان (Escrow)' : 'Escrow' },
    { id: 'WALLET', label: isAr ? 'المحافظ' : 'Wallets' },
    { id: 'WITHDRAWAL', label: isAr ? 'السحوبات' : 'Withdrawals' },
    { id: 'OTHER', label: isAr ? 'أخرى' : 'Other' },
  ];

  const BackIcon = isAr ? ArrowRight : ArrowLeft;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-16 max-w-6xl mx-auto" dir={isAr ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="p-5 sm:p-6 rounded-3xl bg-[#151310] border border-white/10 flex flex-col lg:flex-row lg:items-center gap-5">
        <button
          type="button"
          onClick={goBack}
          className="self-start flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white/80 hover:text-white hover:bg-white/10 text-sm font-bold transition-colors"
        >
          <BackIcon size={16} />
          {isAr ? 'رجوع للسجل المالي' : 'Back to ledger'}
        </button>

        <div className="flex items-center gap-4 flex-1 min-w-0">
          <div className="w-14 h-14 rounded-2xl bg-gold-500/10 border border-gold-500/20 flex items-center justify-center shrink-0">
            <Receipt className="text-gold-500" size={26} />
          </div>
          <div className="min-w-0">
            <h1 className="text-2xl font-black text-white tracking-tight">
              {t.admin.billing.ledger.auditDrawer.title}
            </h1>
            <div className="flex flex-wrap items-center gap-2 mt-2">
              <button
                type="button"
                onClick={copyOrderNumber}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-sm font-mono text-white/80 hover:text-white"
                title={isAr ? 'نسخ رقم الطلب' : 'Copy order number'}
              >
                <Hash size={13} />
                {orderLabel}
                {copied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} className="opacity-50" />}
              </button>
              {statusLabel && (
                <span className="px-2.5 py-1 rounded-lg text-sm font-bold bg-blue-500/10 border border-blue-500/20 text-blue-300">
                  {statusLabel}
                </span>
              )}
              {data?.order?.createdAt && (
                <span className="flex items-center gap-1.5 text-sm text-white/50">
                  <Calendar size={13} />
                  {formatDateTime(data.order.createdAt, isAr)}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={silentRefresh}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white/80 hover:text-white hover:bg-white/10 text-sm font-bold transition-colors"
          >
            <RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} />
            {isAr ? 'تحديث' : 'Refresh'}
          </button>
          {data?.order?.id && (
            <button
              type="button"
              onClick={() => onNavigate?.('admin-order-details', data.order.id)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gold-500/10 border border-gold-500/20 text-gold-400 hover:bg-gold-500 hover:text-black text-sm font-bold transition-colors"
            >
              <ExternalLink size={15} />
              {isAr ? 'تفاصيل الطلب' : 'Order details'}
            </button>
          )}
        </div>
      </div>

      {loading && !data ? (
        <div className="flex flex-col items-center justify-center min-h-[320px] gap-4 rounded-3xl bg-[#151310] border border-white/10">
          <div className="w-10 h-10 border-2 border-gold-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm font-bold text-gold-500">{t.admin.billing.ledger.auditDrawer.analyzing}</span>
        </div>
      ) : error && !data ? (
        <div className="flex flex-col items-center justify-center min-h-[240px] gap-4 rounded-3xl bg-rose-500/5 border border-rose-500/20 px-6 text-center">
          <AlertTriangle className="text-rose-400" size={28} />
          <p className="text-rose-300 text-base font-medium">{t.admin.billing.ledger.auditDrawer.loadError}</p>
          <button
            type="button"
            onClick={silentRefresh}
            className="px-5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm font-bold hover:bg-white/10"
          >
            {isAr ? 'إعادة المحاولة' : 'Retry'}
          </button>
        </div>
      ) : !data ? (
        <div className="flex items-center justify-center min-h-[240px] rounded-3xl bg-[#151310] border border-white/10 text-white/40 text-base">
          {t.admin.billing.ledger.auditDrawer.noRecords}
        </div>
      ) : (
        <>
          {/* Alerts */}
          {(data.summary.totalRefunded > 0 || data.summary.hasDispute || data.summary.hasReturn) && (
            <div className="p-5 rounded-2xl bg-rose-500/5 border border-rose-500/20 flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="flex items-center gap-3 text-rose-300">
                <AlertTriangle size={20} />
                <span className="text-base font-bold">{t.admin.billing.ledger.auditDrawer.alert}</span>
              </div>
              <div className="flex flex-wrap gap-2 sm:ms-auto">
                {data.summary.hasDispute && (
                  <span className="px-3 py-1.5 rounded-lg text-sm font-bold bg-rose-500/10 border border-rose-500/20 text-rose-300">
                    {isAr ? 'يوجد نزاع مفتوح على الطلب' : 'Order has a dispute'}
                  </span>
                )}
                {data.summary.hasReturn && (
                  <span className="px-3 py-1.5 rounded-lg text-sm font-bold bg-orange-500/10 border border-orange-500/20 text-orange-300">
                    {isAr ? 'يوجد طلب إرجاع' : 'Order has a return'}
                  </span>
                )}
                {data.summary.totalRefunded > 0 && (
                  <span className="px-3 py-1.5 rounded-lg text-sm font-bold bg-rose-500/10 border border-rose-500/20 text-rose-300 font-mono">
                    {isAr ? 'المسترد: ' : 'Refunded: '}-{formatMoney(data.summary.totalRefunded)} AED
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Summary cards */}
          <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            <StatCard
              label={t.admin.billing.ledger.auditDrawer.totalPaid}
              hint={isAr ? 'المبلغ اللي دفعه العميل بالكامل' : 'Full amount paid by the customer'}
              value={data.summary.totalPaid}
              icon={CreditCard}
              tone="border-white/15 bg-white/5 text-white"
            />
            <StatCard
              label={isAr ? 'حق التاجر (قيمة القطع)' : 'Merchant earnings (parts)'}
              hint={isAr ? 'يتحول لمحفظة التاجر بعد انتهاء فترة الضمان' : 'Released to the merchant after the hold period'}
              value={data.summary.merchantEarnings}
              icon={TrendingUp}
              tone="border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
            />
            <StatCard
              label={isAr ? 'حق شركة الشحن' : 'Shipping company fee'}
              hint={isAr ? 'تكلفة الشحن المستحقة لشركة الشحن' : 'Shipping cost owed to the carrier'}
              value={data.summary.shippingCosts}
              icon={Truck}
              tone="border-blue-500/30 bg-blue-500/10 text-blue-400"
            />
            <StatCard
              label={t.admin.billing.ledger.auditDrawer.platformFee}
              hint={isAr ? 'ربح المنصة من الطلب' : 'Platform revenue from this order'}
              value={data.summary.totalCommission}
              icon={Percent}
              tone="border-gold-500/30 bg-gold-500/10 text-gold-400"
            />
            <StatCard
              label={isAr ? 'إجمالي المسترد' : 'Total refunded'}
              hint={isAr ? 'أي مبالغ رجعت للعميل' : 'Any amount returned to the customer'}
              value={data.summary.totalRefunded}
              icon={RotateCcw}
              tone="border-rose-500/30 bg-rose-500/10 text-rose-400"
              negative
            />
            <div className="p-5 rounded-2xl bg-[#151310] border border-white/10 flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                  <ShieldCheck size={18} />
                </div>
                <div>
                  <p className="text-sm font-bold text-white/90">{isAr ? 'حالة الضمان (Escrow)' : 'Escrow status'}</p>
                  <p className="text-xs text-white/45">{isAr ? 'هل الفلوس محجوزة ولا اتصرفت' : 'Whether funds are held or released'}</p>
                </div>
              </div>
              <span className={`self-start px-3 py-1.5 rounded-lg text-lg font-black border ${statusTone(data.summary.escrowStatus)}`}>
                {data.summary.escrowStatus || '—'}
              </span>
            </div>
          </section>

          <section className="grid grid-cols-1 lg:grid-cols-5 gap-4">
            {/* Money distribution */}
            <div className="lg:col-span-3 p-6 rounded-3xl bg-[#151310] border border-white/10">
              <h2 className="text-lg font-black text-white mb-1">{isAr ? 'توزيع المبلغ المدفوع' : 'Payment distribution'}</h2>
              <p className="text-sm text-white/50 mb-5">
                {isAr
                  ? `من إجمالي ${formatMoney(data.summary.totalPaid)} درهم، الفلوس بتتوزع كده:`
                  : `Of ${formatMoney(data.summary.totalPaid)} AED paid, funds are split as follows:`}
              </p>
              <div className="h-4 w-full rounded-full overflow-hidden bg-white/5 flex mb-6">
                {breakdown.map((row) => (
                  <div key={row.key} className={`${row.bar} h-full`} style={{ width: `${row.pct}%` }} />
                ))}
              </div>
              <div className="space-y-3">
                {breakdown.map((row) => (
                  <div key={row.key} className="flex items-center justify-between gap-4 p-3 rounded-xl bg-white/[0.03] border border-white/5">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className={`w-3 h-3 rounded-full ${row.bar} shrink-0`} />
                      <span className="text-base text-white/85 truncate">{row.label}</span>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-sm text-white/40 font-mono">{row.pct.toFixed(1)}%</span>
                      <span className={`text-lg font-mono font-black ${row.text}`}>
                        {formatMoney(row.value)} <span className="text-xs text-white/40">AED</span>
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Parties */}
            <div className="lg:col-span-2 p-6 rounded-3xl bg-[#151310] border border-white/10 flex flex-col gap-4">
              <h2 className="text-lg font-black text-white">{isAr ? 'أطراف الطلب' : 'Parties'}</h2>

              <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/5 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 overflow-hidden shrink-0">
                  {data.customer.avatar ? (
                    <img src={data.customer.avatar} alt="" loading="lazy" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-white/30"><User size={22} /></div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-white/45 font-bold">{isAr ? 'العميل (الدافع)' : 'Customer (payer)'}</p>
                  <p className="text-base font-bold text-white truncate">{data.customer.name}</p>
                </div>
                {data.customer.id && (
                  <button
                    type="button"
                    onClick={() => onNavigate?.('customer-profile', data.customer.id)}
                    className="text-xs font-bold text-gold-400 hover:text-gold-300 shrink-0"
                  >
                    {isAr ? 'الملف' : 'Profile'}
                  </button>
                )}
              </div>

              <div className="flex justify-center text-white/25">
                <ArrowDownUp size={18} />
              </div>

              {data.merchants.map((m) => (
                <div key={m.id} className="p-4 rounded-2xl bg-white/[0.03] border border-white/5 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-[#0A0908] border border-white/10 overflow-hidden shrink-0">
                    {m.logo ? (
                      <img src={m.logo} alt="" loading="lazy" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-white/30"><Store size={22} /></div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-white/45 font-bold">{isAr ? 'التاجر (المستفيد)' : 'Merchant (payee)'}</p>
                    <p className="text-base font-bold text-white truncate">{m.name}</p>
                    {m.storeCode && <p className="text-xs text-white/40 font-mono">{m.storeCode}</p>}
                  </div>
                  <button
                    type="button"
                    onClick={() => onNavigate?.('store-profile', m.id)}
                    className="text-xs font-bold text-gold-400 hover:text-gold-300 shrink-0"
                  >
                    {isAr ? 'المتجر' : 'Store'}
                  </button>
                </div>
              ))}
            </div>
          </section>

          {/* Timeline */}
          <section className="p-6 rounded-3xl bg-[#151310] border border-white/10">
            <div className="flex flex-col lg:flex-row lg:items-center gap-4 mb-5">
              <div className="flex items-center gap-3">
                <Clock className="text-gold-500" size={20} />
                <h2 className="text-lg font-black text-white">{t.admin.billing.ledger.auditDrawer.timeline}</h2>
                <span className="px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-sm text-white/60 font-mono">
                  {categoryCounts.ALL}
                </span>
              </div>
              <div className="flex flex-col sm:flex-row gap-2 lg:ms-auto">
                <div className="relative">
                  <Search size={15} className="absolute top-1/2 -translate-y-1/2 start-3 text-white/35" />
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder={isAr ? 'ابحث في الأحداث...' : 'Search events...'}
                    className="w-full sm:w-64 ps-9 pe-3 py-2.5 rounded-xl bg-black/30 border border-white/10 text-sm text-white placeholder:text-white/35 focus:outline-none focus:border-gold-500/40"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setNewestFirst((v) => !v)}
                  className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm font-bold text-white/80 hover:text-white"
                >
                  <ArrowDownUp size={15} />
                  {newestFirst ? (isAr ? 'الأحدث أولاً' : 'Newest first') : (isAr ? 'الأقدم أولاً' : 'Oldest first')}
                </button>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 mb-6">
              {categories.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setCategory(c.id)}
                  disabled={c.id !== 'ALL' && categoryCounts[c.id] === 0}
                  className={`px-3.5 py-2 rounded-xl text-sm font-bold border transition-colors disabled:opacity-30 disabled:cursor-not-allowed ${
                    category === c.id
                      ? 'bg-gold-500 text-black border-gold-500'
                      : 'bg-white/5 text-white/70 border-white/10 hover:text-white'
                  }`}
                >
                  {c.label}
                  <span className="ms-2 opacity-60 font-mono">{categoryCounts[c.id]}</span>
                </button>
              ))}
            </div>

            {visibleEvents.length === 0 ? (
              <div className="py-16 text-center text-white/40 text-base">
                {t.admin.billing.ledger.auditDrawer.noRecords}
              </div>
            ) : (
              <ol className="relative space-y-4 ps-8">
                <span className="absolute top-2 bottom-2 start-[11px] w-px bg-white/10" aria-hidden="true" />
                {visibleEvents.map((event, idx) => (
                  <TimelineItem key={event.id} event={event} isAr={isAr} index={newestFirst ? visibleEvents.length - idx : idx + 1} />
                ))}
              </ol>
            )}
          </section>
        </>
      )}
    </div>
  );
};

const TimelineItem: React.FC<{ event: OrderTimelineEvent; isAr: boolean; index: number }> = React.memo(
  ({ event, isAr, index }) => {
    const cat = categorize(event.eventType);
    const { icon: Icon, cls } = CATEGORY_STYLE[cat];
    const isCredit = event.direction === 'CREDIT' || event.direction === 'RELEASE';
    const isDebit = event.direction === 'DEBIT';
    const title = isAr ? event.eventTypeAr || event.eventType : event.eventTypeEn || event.eventType;
    const description = isAr ? event.descriptionAr : event.descriptionEn;

    return (
      <li className="relative">
        <span className="absolute -start-8 top-4 w-6 h-6 rounded-full bg-[#151310] border border-white/15 text-[11px] font-mono text-white/60 flex items-center justify-center">
          {index}
        </span>
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 sm:p-5">
          <div className="flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-4">
            <div className={`w-11 h-11 shrink-0 rounded-xl border flex items-center justify-center ${cls}`}>
              <Icon size={20} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-base font-bold text-white">{title}</h3>
                {event.status && (
                  <span className={`px-2 py-0.5 rounded-md text-xs font-bold border ${statusTone(event.status)}`}>
                    {event.status}
                  </span>
                )}
              </div>
              <p className="text-sm text-white/45 mt-1 flex items-center gap-1.5">
                <Clock size={12} />
                {formatDateTime(event.timestamp, isAr)}
              </p>
              {description && (
                <p className="mt-3 text-sm sm:text-base text-white/80 leading-relaxed">{description}</p>
              )}
              {event.actor && (
                <p className="mt-3 text-sm text-white/50 flex items-center gap-2">
                  <User size={13} />
                  {isAr ? 'المنفّذ:' : 'By:'}
                  <span className="text-white/85 font-semibold">{event.actor.name || event.actor.type}</span>
                  {event.actor.name && <span className="text-white/35 text-xs">({event.actor.type})</span>}
                </p>
              )}
            </div>
            {event.amount != null && (
              <div className="sm:text-end shrink-0">
                <p
                  className={`text-xl font-mono font-black ${
                    isCredit ? 'text-emerald-400' : isDebit ? 'text-rose-400' : 'text-white/80'
                  }`}
                >
                  {isDebit ? '-' : isCredit ? '+' : ''}
                  {formatMoney(event.amount)}
                  <span className="text-xs text-white/40 ms-1">AED</span>
                </p>
                {event.direction && (
                  <p className="text-xs text-white/40 mt-1">
                    {isCredit ? (isAr ? 'دائن (إضافة)' : 'Credit') : isDebit ? (isAr ? 'مدين (خصم)' : 'Debit') : event.direction}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </li>
    );
  },
);
