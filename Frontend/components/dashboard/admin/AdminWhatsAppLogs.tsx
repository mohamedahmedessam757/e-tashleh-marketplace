import React, { useCallback, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Loader2, MessageCircle, RefreshCw, XCircle, CheckCircle2, Clock } from 'lucide-react';
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
      setItems(Array.isArray(res.data) ? res.data : []);
    } catch (e: unknown) {
      const msg =
        (e as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        (isAr ? 'تعذر جلب سجلات WhatsApp' : 'Failed to load WhatsApp logs');
      setError(String(msg));
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
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
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
          className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-[11px] font-black uppercase tracking-widest text-white/70 hover:bg-white/10"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          {isAr ? 'تحديث' : 'Refresh'}
        </button>
      </div>

      {error && (
        <GlassCard className="border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">{error}</GlassCard>
      )}

      <GlassCard className="overflow-hidden border-white/5 p-0">
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-20 text-white/40">
            <Loader2 className="animate-spin" size={20} />
            {isAr ? 'جاري التحميل...' : 'Loading...'}
          </div>
        ) : items.length === 0 ? (
          <div className="py-20 text-center text-sm text-white/30">
            {isAr ? 'لا توجد سجلات بعد' : 'No logs yet'}
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            <div className="grid grid-cols-12 gap-2 bg-black/40 px-4 py-3 text-[10px] font-black uppercase tracking-wider text-white/40">
              <div className="col-span-3">{isAr ? 'الوقت' : 'Time'}</div>
              <div className="col-span-3">{isAr ? 'القالب' : 'Template'}</div>
              <div className="col-span-3">{isAr ? 'جهة الاتصال' : 'Contact'}</div>
              <div className="col-span-2">{isAr ? 'الحالة' : 'Status'}</div>
              <div className="col-span-1 text-end">{isAr ? 'تفاصيل' : 'Details'}</div>
            </div>
            {items.map((row) => (
              <div key={row.id}>
                <button
                  type="button"
                  onClick={() => setExpandedId(expandedId === row.id ? null : row.id)}
                  className="grid w-full grid-cols-12 gap-2 px-4 py-3 text-start text-xs hover:bg-white/[0.03]"
                >
                  <div className="col-span-3 font-mono text-white/50">
                    {row.createdAt
                      ? new Date(row.createdAt).toLocaleString(isAr ? 'ar-EG' : 'en-GB')
                      : '—'}
                  </div>
                  <div className="col-span-3 truncate font-bold text-white/80">{row.templateName || '—'}</div>
                  <div className="col-span-3 font-mono text-white/60" dir="ltr">
                    {row.phone || '—'}
                  </div>
                  <div className="col-span-2">{statusBadge(row.deliveryStatus)}</div>
                  <div className="col-span-1 text-end text-gold-500/80">▾</div>
                </button>
                {expandedId === row.id && (
                  <motion.pre
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="overflow-x-auto bg-black/50 px-4 py-3 font-mono text-[11px] text-white/60"
                  >
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
                  </motion.pre>
                )}
              </div>
            ))}
          </div>
        )}
      </GlassCard>
    </div>
  );
};
