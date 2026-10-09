import React, { useCallback, useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { GlassCard } from '../../ui/GlassCard';
import { useLanguage } from '../../../contexts/LanguageContext';
import { API_URL } from '../../../services/api/config';
import { getAccessToken } from '../../../utils/auth';

interface BreakdownLine {
  id: string;
  paymentId?: string;
  orderNumber?: string;
  customerName?: string;
  storeName?: string;
  amount: number;
  status?: string;
  paidAt?: string;
  reasonAr: string;
  reasonEn: string;
  metricId?: string;
}

interface BreakdownSource {
  metricId: string;
  labelAr: string;
  labelEn: string;
  amount: number;
  sign: 'plus' | 'minus';
}

interface BreakdownPayload {
  metricId: string;
  total: number;
  formulaAr: string;
  formulaEn: string;
  notStripeCash: boolean;
  outside?: { labelAr: string; labelEn: string }[];
  stripeNoteAr?: string;
  stripeNoteEn?: string;
  sources?: BreakdownSource[];
  included: BreakdownLine[];
  excluded: BreakdownLine[];
  includedHasMore: boolean;
  excludedHasMore: boolean;
  nextIncludedCursor?: string;
  nextExcludedCursor?: string;
}

const MONEY_METRICS = new Set([
  'totalSales',
  'totalRefunds',
  'netCommission',
  'grossCommission',
  'paymentGatewayFees',
  'netPlatformPosition',
]);

interface AdminKpiBreakdownProps {
  metricId: string;
  onNavigate?: (path: string, id?: string) => void;
}

function readRange(): { startDate: string; endDate: string; back: 'home' | 'billing' } {
  const fallbackEnd = new Date();
  const fallbackStart = new Date();
  fallbackStart.setDate(fallbackStart.getDate() - 30);
  const pad = (d: Date) => d.toISOString().split('T')[0];
  try {
    const raw = sessionStorage.getItem('admin-kpi-range');
    if (!raw) return { startDate: pad(fallbackStart), endDate: pad(fallbackEnd), back: 'home' };
    const parsed = JSON.parse(raw);
    return {
      startDate: parsed.startDate || pad(fallbackStart),
      endDate: parsed.endDate || pad(fallbackEnd),
      back: parsed.back === 'billing' ? 'billing' : 'home',
    };
  } catch {
    return { startDate: pad(fallbackStart), endDate: pad(fallbackEnd), back: 'home' };
  }
}

export const AdminKpiBreakdown: React.FC<AdminKpiBreakdownProps> = ({ metricId, onNavigate }) => {
  const { language, t } = useLanguage();
  const isAr = language === 'ar';
  const copy = t.admin.kpiBreakdown;
  const BackIcon = isAr ? ArrowRight : ArrowLeft;
  const [range, setRange] = useState(readRange);
  const [data, setData] = useState<BreakdownPayload | null>(null);
  const [included, setIncluded] = useState<BreakdownLine[]>([]);
  const [excluded, setExcluded] = useState<BreakdownLine[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const isMoney = MONEY_METRICS.has(metricId);

  const load = useCallback(async (mode: 'replace' | 'included' | 'excluded' = 'replace') => {
    const token = getAccessToken();
    const params = new URLSearchParams({ metric: metricId, limit: '50' });
    if (range.startDate) params.set('startDate', range.startDate);
    if (range.endDate) params.set('endDate', range.endDate);
    if (mode === 'included' && data?.nextIncludedCursor) params.set('includedCursor', data.nextIncludedCursor);
    if (mode === 'excluded' && data?.nextExcludedCursor) params.set('excludedCursor', data.nextExcludedCursor);
    if (mode === 'replace') setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_URL}/payments/admin/kpi-breakdown?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('breakdown');
      const payload = (await res.json()) as BreakdownPayload;
      setData((prev) => {
        if (!prev || mode === 'replace') return payload;
        if (mode === 'included') {
          return {
            ...payload,
            excludedHasMore: prev.excludedHasMore,
            nextExcludedCursor: prev.nextExcludedCursor,
          };
        }
        return {
          ...payload,
          includedHasMore: prev.includedHasMore,
          nextIncludedCursor: prev.nextIncludedCursor,
        };
      });
      if (mode === 'included') setIncluded((prev) => [...prev, ...payload.included]);
      else if (mode === 'replace') setIncluded(payload.included || []);
      if (mode === 'excluded') setExcluded((prev) => [...prev, ...payload.excluded]);
      else if (mode === 'replace') setExcluded(payload.excluded || []);
    } catch {
      setError(isAr ? 'تعذر تحميل التفاصيل.' : 'Could not load this breakdown.');
    } finally {
      setLoading(false);
    }
  }, [metricId, range.startDate, range.endDate, data?.nextIncludedCursor, data?.nextExcludedCursor, isAr]);

  useEffect(() => {
    void load('replace');
    const onVisible = () => {
      if (document.visibilityState === 'visible') void load('replace');
    };
    document.addEventListener('visibilitychange', onVisible);
    const pollId = window.setInterval(() => void load('replace'), 20_000);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.clearInterval(pollId);
    };
  }, [metricId, range.startDate, range.endDate]);

  const openSource = (nextMetric: string) => {
    if (nextMetric === metricId) return;
    try {
      sessionStorage.setItem('admin-kpi-range', JSON.stringify(range));
    } catch {
      /* keep the current window */
    }
    onNavigate?.('finance-kpi', nextMetric);
  };

  const formatAmount = (amount: number) =>
    isMoney ? `${amount.toLocaleString()} AED` : amount.toLocaleString();

  const reason = (line: BreakdownLine) => (isAr ? line.reasonAr : line.reasonEn);

  const renderLines = (lines: BreakdownLine[]) => {
    if (!lines.length) {
      return <p className="text-sm text-white/40 px-2 py-6">{copy.empty}</p>;
    }
    return (
      <>
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[10px] uppercase tracking-widest text-white/40">
                <th className="text-start font-bold py-2 px-2">{copy.order}</th>
                <th className="text-start font-bold py-2 px-2">{copy.customer}</th>
                <th className="text-start font-bold py-2 px-2">{copy.store}</th>
                {isMoney && <th className="text-start font-bold py-2 px-2">{copy.amount}</th>}
                <th className="text-start font-bold py-2 px-2">{copy.status}</th>
                <th className="text-start font-bold py-2 px-2">{copy.date}</th>
                <th className="text-start font-bold py-2 px-2">{copy.reason}</th>
              </tr>
            </thead>
            <tbody>
              {lines.map((line) => (
                <tr key={line.id} className="border-t border-white/5 text-white/80">
                  <td className="py-3 px-2 font-mono text-gold-400">{line.orderNumber || '—'}</td>
                  <td className="py-3 px-2">{line.customerName || '—'}</td>
                  <td className="py-3 px-2">{line.storeName || '—'}</td>
                  {isMoney && <td className="py-3 px-2 font-mono">{line.amount.toLocaleString()}</td>}
                  <td className="py-3 px-2">{line.status || '—'}</td>
                  <td className="py-3 px-2 whitespace-nowrap">{line.paidAt ? new Date(line.paidAt).toLocaleString(isAr ? 'ar' : 'en') : '—'}</td>
                  <td className="py-3 px-2 text-white/50">{reason(line)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="md:hidden space-y-3">
          {lines.map((line) => (
            <div key={line.id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 space-y-1">
              <div className="flex items-center justify-between gap-3">
                <p className="font-mono text-gold-400 text-sm">{line.orderNumber || line.customerName || '—'}</p>
                {isMoney && <p className="font-mono text-white text-sm">{line.amount.toLocaleString()} AED</p>}
              </div>
              <p className="text-sm text-white">{line.customerName || '—'}</p>
              {line.storeName && <p className="text-xs text-white/50">{line.storeName}</p>}
              <p className="text-xs text-white/40">{line.status} · {line.paidAt ? new Date(line.paidAt).toLocaleString(isAr ? 'ar' : 'en') : '—'}</p>
              <p className="text-xs text-white/50">{reason(line)}</p>
            </div>
          ))}
        </div>
      </>
    );
  };

  const headline = data ? (isMoney ? `${data.total.toLocaleString()} AED` : data.total.toLocaleString()) : '—';

  return (
    <div className="space-y-5 sm:space-y-6 max-w-6xl mx-auto px-1 pb-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <button
            type="button"
            onClick={() => onNavigate?.(range.back === 'billing' ? 'billing' : 'home')}
            className="mt-1 p-2 rounded-xl bg-white/5 border border-white/10 text-white/70 hover:text-gold-500 hover:border-gold-500/40 transition-all"
            aria-label={copy.back}
          >
            <BackIcon size={18} />
          </button>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">{headline}</h1>
            <p className="text-white/40 text-xs sm:text-sm mt-1 max-w-xl">
              {data ? (isAr ? data.formulaAr : data.formulaEn) : copy.range}
            </p>
          </div>
        </div>
        <GlassCard className="px-4 py-3 min-w-[180px]">
          <p className="text-[10px] uppercase tracking-widest text-white/40 font-bold">{copy.ledgerMatch}</p>
          <p className="text-lg font-black text-gold-400">{headline}</p>
        </GlassCard>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <label className="text-xs text-white/50">
          {copy.range}
          <input
            type="date"
            value={range.startDate}
            onChange={(event) => {
              const next = { ...range, startDate: event.target.value };
              setRange(next);
              sessionStorage.setItem('admin-kpi-range', JSON.stringify(next));
            }}
            className="mt-1 block bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white"
          />
        </label>
        <label className="text-xs text-white/50">
          <span className="invisible">{copy.range}</span>
          <input
            type="date"
            value={range.endDate}
            onChange={(event) => {
              const next = { ...range, endDate: event.target.value };
              setRange(next);
              sessionStorage.setItem('admin-kpi-range', JSON.stringify(next));
            }}
            className="mt-1 block bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white"
          />
        </label>
      </div>

      {!!data?.outside?.length && (
        <GlassCard className="p-4 space-y-2">
          <p className="text-[10px] uppercase tracking-widest text-white/40 font-bold">{copy.outside}</p>
          {data.outside.map((item) => (
            <p key={item.labelEn} className="text-sm text-white/70">{isAr ? item.labelAr : item.labelEn}</p>
          ))}
        </GlassCard>
      )}

      {data?.notStripeCash && (
        <GlassCard className="p-4 border-gold-500/30">
          <p className="text-sm text-gold-300">{copy.notStripe}</p>
        </GlassCard>
      )}

      {(data?.stripeNoteAr || data?.stripeNoteEn) && (
        <GlassCard className="p-4">
          <p className="text-[10px] uppercase tracking-widest text-gold-500 font-bold mb-2">{copy.stripeTitle}</p>
          <p className="text-sm text-white/70">{isAr ? data?.stripeNoteAr : data?.stripeNoteEn}</p>
        </GlassCard>
      )}

      {!!data?.sources?.length && (
        <div className="space-y-2">
          <p className="text-[10px] uppercase tracking-widest text-white/40 font-bold">{copy.sources}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {data.sources.map((source) => (
              <button
                key={`${source.metricId}-${source.labelEn}`}
                type="button"
                onClick={() => openSource(source.metricId)}
                className="text-start"
              >
                <GlassCard className="p-4 hover:border-gold-500/40 transition-colors cursor-pointer">
                  <p className="text-xs text-white/50">{isAr ? source.labelAr : source.labelEn}</p>
                  <p className="text-lg font-black text-white font-mono mt-1">
                    {source.sign === 'minus' ? '−' : '+'} {source.amount.toLocaleString()} AED
                  </p>
                </GlassCard>
              </button>
            ))}
          </div>
        </div>
      )}

      {error && <p className="text-sm text-rose-300">{error}</p>}
      {loading && !data && <p className="text-sm text-white/40">{isAr ? 'جار التحميل…' : 'Loading…'}</p>}

      <GlassCard className="p-4 sm:p-6">
        <h2 className="text-sm font-black text-white mb-3">{copy.included}</h2>
        {renderLines(included)}
        {data?.includedHasMore && (
          <button
            type="button"
            onClick={() => void load('included')}
            className="mt-4 text-sm font-bold text-gold-400"
          >
            {copy.loadMore}
          </button>
        )}
      </GlassCard>

      {(excluded.length > 0 || data?.excludedHasMore) && (
        <GlassCard className="p-4 sm:p-6">
          <h2 className="text-sm font-black text-white mb-3">{copy.excluded}</h2>
          {renderLines(excluded)}
          {data?.excludedHasMore && (
            <button
              type="button"
              onClick={() => void load('excluded')}
              className="mt-4 text-sm font-bold text-gold-400"
            >
              {copy.loadMore}
            </button>
          )}
        </GlassCard>
      )}
      <span className="sr-only">{formatAmount(data?.total || 0)}</span>
    </div>
  );
};
