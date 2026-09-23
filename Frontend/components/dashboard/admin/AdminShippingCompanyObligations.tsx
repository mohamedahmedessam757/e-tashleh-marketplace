import React, { useCallback, useEffect, useState } from 'react';
import { Truck, RefreshCw, CheckCircle2, XCircle, Wallet } from 'lucide-react';
import { GlassCard } from '../../ui/GlassCard';
import { useLanguage } from '../../../contexts/LanguageContext';
import { BlurredSection } from './BlurredSection';
import { useAdminPermissionsStore } from '../../../stores/useAdminPermissionsStore';
import { getAccessToken } from '../../../utils/auth';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

type ObligationRow = {
  id: string;
  caseId: string;
  caseType: string;
  orderId: string;
  orderNumber?: string | null;
  amountOriginal: number;
  amountRemaining: number;
  amountSettled: number;
  status: string;
  shippingAmount: number;
  stripeFeesAmount: number;
  refundAmount: number;
  createdAt: string;
  settlements: {
    id: string;
    amount: number;
    note?: string | null;
    invoiceId?: string | null;
    createdAt: string;
    admin?: string;
  }[];
};

export const AdminShippingCompanyObligations: React.FC = () => {
  const { language } = useLanguage();
  const isAr = language === 'ar';
  const isSectionBlurred = useAdminPermissionsStore((s) => s.isSectionBlurred);

  const [rows, setRows] = useState<ObligationRow[]>([]);
  const [summary, setSummary] = useState({ totalOutstanding: 0, openCount: 0 });
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<ObligationRow | null>(null);
  const [settleAmount, setSettleAmount] = useState('');
  const [settleNote, setSettleNote] = useState('');
  const [settling, setSettling] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const fetchRows = useCallback(async () => {
    setLoading(true);
    try {
      const token = getAccessToken();
      const params = new URLSearchParams();
      if (statusFilter && statusFilter !== 'ALL') params.set('status', statusFilter);
      if (search.trim()) params.set('search', search.trim());
      const res = await fetch(
        `${API_URL}/payments/admin/shipping-company-obligations?${params}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      if (!res.ok) throw new Error('Failed to load');
      const data = await res.json();
      setRows(Array.isArray(data.data) ? data.data : []);
      setSummary(data.summary || { totalOutstanding: 0, openCount: 0 });
    } catch (e: any) {
      setToast({
        type: 'error',
        message: e?.message || (isAr ? 'تعذر تحميل الالتزامات' : 'Failed to load obligations'),
      });
    } finally {
      setLoading(false);
    }
  }, [statusFilter, search, isAr]);

  useEffect(() => {
    fetchRows();
  }, [fetchRows]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4500);
    return () => clearTimeout(t);
  }, [toast]);

  const openSettle = (row: ObligationRow) => {
    setSelected(row);
    setSettleAmount(String(row.amountRemaining || ''));
    setSettleNote('');
  };

  const submitSettle = async () => {
    if (!selected) return;
    const amount = Number(settleAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      setToast({
        type: 'error',
        message: isAr ? 'أدخل مبلغاً صحيحاً' : 'Enter a valid amount',
      });
      return;
    }
    setSettling(true);
    try {
      const token = getAccessToken();
      const res = await fetch(`${API_URL}/payments/admin/shipping-company-obligations/settle`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          obligationId: selected.id,
          amount,
          note: settleNote || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.message || (isAr ? 'فشل تسجيل الدفعة' : 'Settlement failed'));
      }
      setToast({
        type: 'success',
        message: isAr
          ? `تم تسجيل دفعة ${amount.toFixed(2)} د.إ وإصدار فاتورة`
          : `Recorded ${amount.toFixed(2)} AED payment and issued invoice`,
      });
      setSelected(null);
      await fetchRows();
    } catch (e: any) {
      setToast({
        type: 'error',
        message: e?.message || (isAr ? 'فشل تسجيل الدفعة' : 'Settlement failed'),
      });
    } finally {
      setSettling(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-6 duration-700">
      {toast && (
        <div
          className={`flex items-center gap-3 p-4 rounded-2xl border text-xs font-bold ${
            toast.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-200'
              : 'bg-rose-500/10 border-rose-500/20 text-rose-200'
          }`}
        >
          {toast.type === 'success' ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
          {toast.message}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <GlassCard className="p-6 bg-[#151310] border-white/5">
          <div className="flex items-center gap-2 text-purple-400 mb-2">
            <Wallet size={14} />
            <p className="text-[10px] font-black uppercase tracking-widest text-white/40">
              {isAr ? 'إجمالي الالتزامات المستحقة' : 'Total outstanding liability'}
            </p>
          </div>
          <BlurredSection isBlurred={isSectionBlurred('billing_amounts')}>
            <h3 className="text-3xl font-black text-purple-300 font-mono">
              {summary.totalOutstanding.toLocaleString()}{' '}
              <span className="text-xs opacity-60">AED</span>
            </h3>
          </BlurredSection>
        </GlassCard>
        <GlassCard className="p-6 bg-[#151310] border-white/5">
          <div className="flex items-center gap-2 text-amber-400 mb-2">
            <Truck size={14} />
            <p className="text-[10px] font-black uppercase tracking-widest text-white/40">
              {isAr ? 'حالات مفتوحة / جزئية' : 'Open / partial cases'}
            </p>
          </div>
          <h3 className="text-3xl font-black text-white font-mono">{summary.openCount}</h3>
        </GlassCard>
      </div>

      <div className="flex flex-wrap gap-3 items-center">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={isAr ? 'بحث برقم الطلب أو القضية…' : 'Search order / case…'}
          className="bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white outline-none focus:border-gold-500/40 min-w-[220px]"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white outline-none"
        >
          <option value="ALL">{isAr ? 'الكل' : 'All'}</option>
          <option value="OPEN">{isAr ? 'مفتوح' : 'Open'}</option>
          <option value="PARTIAL">{isAr ? 'جزئي' : 'Partial'}</option>
          <option value="SETTLED">{isAr ? 'مسدد' : 'Settled'}</option>
        </select>
        <button
          type="button"
          onClick={() => fetchRows()}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gold-500/10 border border-gold-500/30 text-gold-400 text-xs font-bold"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          {isAr ? 'تحديث' : 'Refresh'}
        </button>
      </div>

      <GlassCard className="overflow-hidden border-white/5 bg-[#151310]">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-white/5 text-white/30 uppercase tracking-wider">
                <th className="p-4 font-black">{isAr ? 'الطلب' : 'Order'}</th>
                <th className="p-4 font-black">{isAr ? 'الاسترداد' : 'Refund'}</th>
                <th className="p-4 font-black">{isAr ? 'رسوم Stripe' : 'Stripe fees'}</th>
                <th className="p-4 font-black">{isAr ? 'الشحن' : 'Shipping'}</th>
                <th className="p-4 font-black">{isAr ? 'الأصل' : 'Original'}</th>
                <th className="p-4 font-black">{isAr ? 'المتبقي' : 'Remaining'}</th>
                <th className="p-4 font-black">{isAr ? 'الحالة' : 'Status'}</th>
                <th className="p-4 font-black" />
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-white/30">
                    {loading
                      ? isAr
                        ? 'جاري التحميل…'
                        : 'Loading…'
                      : isAr
                        ? 'لا توجد التزامات مسجلة'
                        : 'No obligations recorded'}
                  </td>
                </tr>
              )}
              {rows.map((row) => (
                <tr key={row.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                  <td className="p-4">
                    <p className="font-bold text-white">#{row.orderNumber || row.orderId.slice(0, 8)}</p>
                    <p className="text-[10px] text-white/30 mt-0.5">
                      {row.caseType} · {row.caseId.slice(0, 8)}
                    </p>
                  </td>
                  <td className="p-4 font-mono text-emerald-400/80">{row.refundAmount.toFixed(2)}</td>
                  <td className="p-4 font-mono text-orange-400/80">{row.stripeFeesAmount.toFixed(2)}</td>
                  <td className="p-4 font-mono text-cyan-400/80">{row.shippingAmount.toFixed(2)}</td>
                  <td className="p-4 font-mono text-white/70">{row.amountOriginal.toFixed(2)}</td>
                  <td className="p-4 font-mono text-purple-300 font-black">
                    {row.amountRemaining.toFixed(2)}
                  </td>
                  <td className="p-4">
                    <span
                      className={`px-2 py-1 rounded-lg text-[10px] font-black ${
                        row.status === 'SETTLED'
                          ? 'bg-emerald-500/10 text-emerald-400'
                          : row.status === 'PARTIAL'
                            ? 'bg-amber-500/10 text-amber-400'
                            : 'bg-purple-500/10 text-purple-300'
                      }`}
                    >
                      {row.status}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    {row.amountRemaining > 0.009 && (
                      <button
                        type="button"
                        onClick={() => openSettle(row)}
                        className="px-3 py-1.5 rounded-lg bg-purple-500/20 border border-purple-500/30 text-purple-200 text-[10px] font-black hover:bg-purple-500/30"
                      >
                        {isAr ? 'تسجيل دفعة' : 'Record payment'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </GlassCard>

      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-md rounded-3xl bg-[#1A1814] border border-white/10 p-6 space-y-4 shadow-2xl">
            <h3 className="text-sm font-black text-white uppercase tracking-wider">
              {isAr ? 'تسجيل دفعة من شركة الشحن' : 'Record shipping company payment'}
            </h3>
            <p className="text-[11px] text-white/40">
              #{selected.orderNumber || selected.orderId.slice(0, 8)} ·{' '}
              {isAr ? 'المتبقي' : 'Remaining'}:{' '}
              <span className="text-purple-300 font-mono">{selected.amountRemaining.toFixed(2)} AED</span>
            </p>
            <div className="space-y-2">
              <label className="text-[10px] text-white/40 font-bold uppercase">
                {isAr ? 'المبلغ المدفوع' : 'Amount paid'}
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={settleAmount}
                onChange={(e) => setSettleAmount(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white font-mono text-sm outline-none focus:border-purple-500/40"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] text-white/40 font-bold uppercase">
                {isAr ? 'ملاحظة (اختياري)' : 'Note (optional)'}
              </label>
              <textarea
                value={settleNote}
                onChange={(e) => setSettleNote(e.target.value)}
                rows={2}
                className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white text-xs outline-none focus:border-purple-500/40"
              />
            </div>
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                disabled={settling}
                onClick={() => setSelected(null)}
                className="flex-1 py-3 rounded-xl border border-white/10 text-white/50 text-xs font-bold"
              >
                {isAr ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                type="button"
                disabled={settling}
                onClick={submitSettle}
                className="flex-1 py-3 rounded-xl bg-purple-500 text-white text-xs font-black disabled:opacity-50"
              >
                {settling
                  ? isAr
                    ? 'جاري الحفظ…'
                    : 'Saving…'
                  : isAr
                    ? 'تأكيد وتسجيل فاتورة'
                    : 'Confirm & invoice'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
