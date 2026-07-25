import React, { useCallback, useEffect, useState } from 'react';
import { Loader2, MessageCircle, RefreshCw, XCircle, CheckCircle2, Clock, ChevronDown, ChevronUp } from 'lucide-react';
import { GlassCard } from '../../ui/GlassCard';
import { useLanguage } from '../../../contexts/LanguageContext';
import { client } from '../../../services/api/client';

interface WaLogRow {
  id: string;
  phone?: string | null;
  templateName?: string | null;
  deliveryStatus?: string | null;
  errorCode?: string | null;
  errorMessage?: string | null;
  externalMessageId?: string | null;
  createdAt?: string;
  sentAt?: string | null;
  failedAt?: string | null;
}

function formatApiError(e: unknown, isAr: boolean): string {
  const ax = e as {
    response?: { status?: number; data?: { message?: string | string[] } };
    message?: string;
  };
  const status = ax.response?.status;
  const raw = ax.response?.data?.message;
  const msg = Array.isArray(raw) ? raw.join(', ') : raw;
  if (status === 404) {
    return isAr
      ? 'المسار غير موجود على السيرفر — انشر تحديث الـ Backend ثم حدّث الصفحة.'
      : 'Endpoint missing on server — deploy the Backend update, then refresh.';
  }
  if (status === 403) {
    return isAr ? 'غير مصرح — يلزم حساب أدمن.' : 'Forbidden — admin account required.';
  }
  if (msg) return String(msg);
  return isAr ? 'تعذر جلب سجلات WhatsApp' : 'Failed to load WhatsApp logs';
}

export const AdminWhatsAppLogs: React.FC = () => {
  const { language } = useLanguage();
  const isAr = language === 'ar';
  const [items, setItems] = useState<WaLogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await client.get<WaLogRow[]>('/widers/message-logs', { params: { limit: 80 } });
      const data = res.data;
      setItems(Array.isArray(data) ? data : []);
    } catch (e: unknown) {
      setError(formatApiError(e, isAr));
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [isAr]);

  useEffect(() => {
    void load();
  }, [load]);

  const statusBadge = (status?: string | null) => {
    const s = (status || '').toUpperCase();
    if (s === 'FAILED') {
      return (
        <span className="inline-flex items-center gap-1 rounded-lg border border-red-500/30 bg-red-500/10 px-2 py-0.5 text-[10px] font-black text-red-400">
          <XCircle size={12} />
          {isAr ? 'فشل' : 'FAILED'}
        </span>
      );
    }
    if (s === 'DELIVERED' || s === 'READ' || s === 'SENT') {
      const labelAr = s === 'SENT' ? 'أُرسل' : s === 'READ' ? 'مقروء' : 'وُصل';
      return (
        <span className="inline-flex items-center gap-1 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-black text-emerald-400">
          <CheckCircle2 size={12} />
          {isAr ? labelAr : s}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] font-black text-white/50">
        <Clock size={12} />
        {s || '—'}
      </span>
    );
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-gold-500/20 bg-gradient-to-br from-gold-500/20 to-transparent text-gold-500">
            <MessageCircle size={26} />
          </div>
          <div>
            <h1 className="text-2xl font-black uppercase italic tracking-tight text-white">
              {isAr ? 'سجلات واتساب' : 'WhatsApp Logs'}
            </h1>
            <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-white/30">
              {isAr
                ? 'آخر رسائل Widers — حالة التسليم وأخطاء Meta'
                : 'Recent Widers messages — delivery status & Meta errors'}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-[11px] font-black uppercase tracking-widest text-white/70 hover:bg-white/10 disabled:opacity-50"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          {isAr ? 'تحديث' : 'Refresh'}
        </button>
      </div>

      {error && (
        <GlassCard enableHover={false} className="!border-red-500/30 !bg-red-500/10 p-4 text-sm text-red-300">
          {error}
        </GlassCard>
      )}

      <GlassCard enableHover={false} className="!overflow-hidden !border-white/5 !p-0">
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-20 text-white/40">
            <Loader2 className="animate-spin" size={20} />
            {isAr ? 'جاري التحميل...' : 'Loading...'}
          </div>
        ) : items.length === 0 && !error ? (
          <div className="py-20 text-center text-sm text-white/30">
            {isAr ? 'لا توجد سجلات بعد' : 'No logs yet'}
          </div>
        ) : items.length === 0 ? null : (
          <div className="divide-y divide-white/5">
            <div className="hidden grid-cols-12 gap-2 bg-black/40 px-4 py-3 text-[10px] font-black uppercase tracking-wider text-white/40 md:grid">
              <div className="col-span-3">{isAr ? 'الوقت' : 'Time'}</div>
              <div className="col-span-3">{isAr ? 'القالب' : 'Template'}</div>
              <div className="col-span-3">{isAr ? 'جهة الاتصال' : 'Contact'}</div>
              <div className="col-span-2">{isAr ? 'الحالة' : 'Status'}</div>
              <div className="col-span-1 text-end">{isAr ? 'تفاصيل' : 'Details'}</div>
            </div>
            {items.map((row) => {
              const open = expandedId === row.id;
              return (
                <div key={row.id} className="bg-transparent">
                  <button
                    type="button"
                    onClick={() => setExpandedId(open ? null : row.id)}
                    className="grid w-full grid-cols-1 gap-2 px-4 py-3 text-start text-xs hover:bg-white/[0.03] md:grid-cols-12 md:items-center"
                  >
                    <div className="font-mono text-white/50 md:col-span-3">
                      {row.createdAt
                        ? new Date(row.createdAt).toLocaleString(isAr ? 'ar-EG' : 'en-GB')
                        : '—'}
                    </div>
                    <div className="truncate font-bold text-white/80 md:col-span-3">
                      {row.templateName || '—'}
                    </div>
                    <div className="font-mono text-white/60 md:col-span-3" dir="ltr">
                      {row.phone || '—'}
                    </div>
                    <div className="flex items-center justify-between gap-2 md:col-span-3">
                      <span className="md:col-span-2">{statusBadge(row.deliveryStatus)}</span>
                      <span className="text-gold-500/80 md:ms-auto">
                        {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      </span>
                    </div>
                  </button>
                  {open && (
                    <pre className="overflow-x-auto whitespace-pre-wrap break-all bg-black/50 px-4 py-3 font-mono text-[11px] text-white/60">
                      {JSON.stringify(
                        {
                          errorCode: row.errorCode,
                          errorMessage: row.errorMessage,
                          externalMessageId: row.externalMessageId,
                          sentAt: row.sentAt,
                          failedAt: row.failedAt,
                        },
                        null,
                        2,
                      )}
                    </pre>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </GlassCard>
    </div>
  );
};
