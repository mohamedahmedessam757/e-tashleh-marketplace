import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertTriangle,
  Bug,
  ChevronDown,
  Copy,
  Download,
  Filter,
  Link2,
  Loader2,
  Radio,
  Search,
} from 'lucide-react';
import { GlassCard } from '../../ui/GlassCard';
import { useLanguage } from '../../../contexts/LanguageContext';
import { AdminSearchInput } from './AdminSearchInput';
import { usePlatformErrorsStore } from '../../../stores/usePlatformErrorsStore';

export const AdminPlatformErrors: React.FC = () => {
  const { language } = useLanguage();
  const isAr = language === 'ar';
  const {
    items,
    topErrors,
    total,
    isLoading,
    search,
    filters,
    correlated,
    setSearch,
    setFilter,
    fetchErrors,
    fetchTopErrors,
    fetchCorrelated,
    resolveError,
    subscribe,
    unsubscribe,
  } = usePlatformErrorsStore();

  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    subscribe();
    fetchTopErrors();
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => fetchErrors(search), 400);
    return () => window.clearTimeout(timer);
  }, [search, filters]);

  const t = {
    title: isAr ? 'أخطاء المنصة' : 'Platform Errors',
    subtitle: isAr ? 'مراقبة أخطاء العملاء والتجار والأدمن' : 'Monitor errors across customers, merchants, and admins',
    top10: isAr ? 'أكثر 10 أخطاء — آخر 24 ساعة' : 'Top 10 errors — last 24 hours',
    search: isAr ? 'بحث (ID، إيميل، هاتف، خطأ، صفحة، correlation)' : 'Search (ID, email, phone, error, page, correlation)',
    correlated: isAr ? 'أحداث مرتبطة' : 'Correlated events',
    resolve: isAr ? 'وضع كمحلول' : 'Mark resolved',
    export: isAr ? 'تصدير CSV' : 'Export CSV',
    occurrences: isAr ? 'تكرار' : 'Occurrences',
    noData: isAr ? 'لا توجد أخطاء' : 'No errors found',
  };

  const severityColor = (s: string) => {
    switch (s) {
      case 'FATAL': return 'text-red-400 bg-red-500/10 border-red-500/20';
      case 'ERROR': return 'text-orange-400 bg-orange-500/10 border-orange-500/20';
      case 'WARN': return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
      default: return 'text-blue-400 bg-blue-500/10 border-blue-500/20';
    }
  };

  const exportCsv = () => {
    const header = ['id', 'lastSeenAt', 'source', 'severity', 'errorName', 'message', 'userEmail', 'pagePath', 'correlationId', 'occurrenceCount'];
    const rows = items.map((e) =>
      header.map((h) => JSON.stringify((e as Record<string, unknown>)[h] ?? '')).join(','),
    );
    const blob = new Blob([[header.join(','), ...rows].join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `platform-errors-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const copyText = (text: string) => {
    void navigator.clipboard?.writeText(text);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-white flex items-center gap-3">
            <Bug className="text-red-400" size={28} />
            {t.title}
          </h1>
          <p className="text-white/40 text-sm mt-1">{t.subtitle}</p>
        </div>
        <div className="flex items-center gap-2 text-[10px] font-black uppercase text-emerald-400">
          <Radio size={14} className="animate-pulse" />
          Realtime
        </div>
      </header>

      <GlassCard className="p-6 border-red-500/10" enableHover={false}>
        <h2 className="text-sm font-black text-white mb-4 flex items-center gap-2">
          <AlertTriangle size={16} className="text-gold-400" />
          {t.top10}
        </h2>
        <div className="space-y-3">
          {topErrors.length === 0 && (
            <p className="text-white/30 text-sm">{t.noData}</p>
          )}
          {topErrors.map((row, idx) => (
            <button
              key={`${row.stackFingerprint}-${idx}`}
              type="button"
              onClick={() => {
                if (row.stackFingerprint) setFilter('stackFingerprint', row.stackFingerprint);
                else if (row.errorName) setSearch(row.errorName);
              }}
              className="w-full text-start p-4 rounded-2xl bg-white/[0.03] border border-white/5 hover:border-gold-500/30 transition-all"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                <span className="text-xs font-black text-gold-400">#{idx + 1}</span>
                <span className="text-[10px] text-white/40">{row.percentOfTotal}%</span>
              </div>
              <p className="text-sm font-bold text-white truncate">{row.errorName || 'Error'}</p>
              <p className="text-xs text-white/40 truncate mt-1">{row.sampleMessage}</p>
              <div className="flex flex-wrap gap-4 mt-2 text-[10px] font-bold text-white/50">
                <span>{t.occurrences}: {row.totalOccurrences}</span>
                <span>{new Date(row.lastSeenAt).toLocaleString(isAr ? 'ar-EG' : 'en-US')}</span>
              </div>
              <div className="mt-2 h-1.5 rounded-full bg-white/5 overflow-hidden">
                <div className="h-full bg-gold-500/70 rounded-full" style={{ width: `${Math.min(row.percentOfTotal, 100)}%` }} />
              </div>
            </button>
          ))}
        </div>
      </GlassCard>

      <div className="flex flex-wrap gap-3 items-center">
        <div className="flex-1 min-w-[240px]">
          <AdminSearchInput
            value={search}
            onChange={setSearch}
            placeholder={t.search}
            icon={Search}
          />
        </div>
        <button
          type="button"
          onClick={exportCsv}
          className="flex items-center gap-2 px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-xs font-black text-white/70 hover:text-white"
        >
          <Download size={14} />
          {t.export}
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        {[
          ['source', ['ALL', 'CLIENT', 'API', 'UNHANDLED']],
          ['severity', ['ALL', 'ERROR', 'WARN', 'FATAL', 'INFO']],
          ['userRole', ['ALL', 'CUSTOMER', 'MERCHANT', 'ADMIN', 'GUEST']],
          ['resolved', ['ALL', 'false', 'true']],
        ].map(([key, options]) => (
          <div key={key} className="flex items-center gap-1 p-1 bg-black/30 rounded-xl border border-white/5">
            <Filter size={12} className="text-white/30 mx-2" />
            {(options as string[]).map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => setFilter(key as keyof typeof filters, opt)}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase ${
                  filters[key as keyof typeof filters] === opt
                    ? 'bg-gold-500 text-black'
                    : 'text-white/40 hover:text-white'
                }`}
              >
                {opt}
              </button>
            ))}
          </div>
        ))}
        {filters.stackFingerprint && (
          <button
            type="button"
            onClick={() => setFilter('stackFingerprint', '')}
            className="text-[10px] text-gold-400 font-bold px-3"
          >
            {isAr ? 'مسح فلتر التجميع' : 'Clear group filter'}
          </button>
        )}
      </div>

      {isLoading && (
        <div className="flex justify-center py-8">
          <Loader2 className="animate-spin text-gold-400" />
        </div>
      )}

      <div className="space-y-3">
        <p className="text-[10px] text-white/30 font-bold uppercase">{total} {isAr ? 'سجل' : 'records'}</p>
        {items.map((row) => (
          <GlassCard key={row.id} className="p-0 overflow-hidden border-white/5" enableHover={false}>
            <button
              type="button"
              className="w-full p-4 md:p-5 text-start hover:bg-white/[0.02] transition-colors"
              onClick={() => {
                const next = expandedId === row.id ? null : row.id;
                setExpandedId(next);
                if (next) void fetchCorrelated(row.correlationId);
              }}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-1 min-w-0 flex-1">
                  <div className="flex flex-wrap gap-2 items-center">
                    <span className={`text-[10px] font-black px-2 py-0.5 rounded border ${severityColor(row.severity)}`}>
                      {row.severity}
                    </span>
                    <span className="text-[10px] font-black text-white/40 uppercase">{row.source}</span>
                    {row.resolvedAt && (
                      <span className="text-[10px] text-emerald-400 font-bold">{isAr ? 'محلول' : 'Resolved'}</span>
                    )}
                  </div>
                  <p className="text-sm font-bold text-white truncate">{row.errorName || 'Error'}</p>
                  <p className="text-xs text-white/50 line-clamp-2">{row.message}</p>
                </div>
                <div className="text-end shrink-0">
                  <p className="text-[10px] text-white/40 font-mono">
                    {new Date(row.lastSeenAt).toLocaleString(isAr ? 'ar-EG' : 'en-US')}
                  </p>
                  <p className="text-xs text-gold-400 font-bold mt-1">×{row.occurrenceCount}</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-3 mt-3 text-[10px] text-white/40 font-bold">
                <span>{row.userEmail || row.user?.email || '—'}</span>
                <span>{row.userPhone || row.user?.phone || ''}</span>
                <span className="truncate max-w-[200px]">{row.pagePath || '—'}</span>
                <span className="font-mono truncate max-w-[120px]">{row.correlationId.slice(0, 8)}…</span>
              </div>
              <ChevronDown
                size={16}
                className={`mx-auto mt-2 text-white/20 transition-transform ${expandedId === row.id ? 'rotate-180' : ''}`}
              />
            </button>

            <AnimatePresence>
              {expandedId === row.id && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="border-t border-white/5 bg-black/20 overflow-hidden"
                >
                  <div className="p-5 space-y-4 text-xs text-white/70">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <p><span className="text-white/30">ID:</span> {row.id}</p>
                      <p className="flex items-center gap-2">
                        <span className="text-white/30">Correlation:</span>
                        <span className="font-mono">{row.correlationId}</span>
                        <button type="button" onClick={() => copyText(row.correlationId)} className="text-gold-400">
                          <Copy size={12} />
                        </button>
                      </p>
                      <p><span className="text-white/30">HTTP:</span> {row.httpStatus ?? '—'} {row.requestPath}</p>
                      <p><span className="text-white/30">Device:</span> {row.deviceClass}</p>
                    </div>

                    <div>
                      <p className="text-[10px] font-black text-white/40 uppercase mb-2 flex items-center gap-2">
                        <Link2 size={12} />
                        {t.correlated}
                      </p>
                      <div className="space-y-2">
                        {correlated.map((c) => (
                          <div key={c.id} className="p-3 rounded-xl bg-white/5 border border-white/5 flex justify-between gap-2">
                            <div>
                              <span className="text-[10px] font-black text-gold-400">{c.source}</span>
                              <p className="text-xs font-bold text-white">{c.errorName}</p>
                              <p className="text-[10px] text-white/40 truncate">{c.message}</p>
                            </div>
                            <span className="text-[10px] text-white/30 shrink-0">
                              {new Date(c.firstSeenAt).toLocaleTimeString(isAr ? 'ar-EG' : 'en-US')}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {!row.resolvedAt && (
                      <button
                        type="button"
                        onClick={() => void resolveError(row.id)}
                        className="px-4 py-2 rounded-xl bg-emerald-500/20 text-emerald-400 text-[10px] font-black uppercase border border-emerald-500/30"
                      >
                        {t.resolve}
                      </button>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </GlassCard>
        ))}
      </div>
    </div>
  );
};
