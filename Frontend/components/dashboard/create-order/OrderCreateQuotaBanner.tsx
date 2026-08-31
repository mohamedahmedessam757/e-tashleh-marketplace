import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Clock, Layers, Package } from 'lucide-react';
import { ordersApi } from '../../../services/api/orders';
import { useLanguage } from '../../../contexts/LanguageContext';
import { getServerNowMs, syncServerClock } from '../../../utils/serverClock';

type Quota = Awaited<ReturnType<typeof ordersApi.getCreateQuota>>;

function formatRemaining(ms: number): string {
  if (ms <= 0) return '00:00:00';
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return [h, m, s].map((n) => String(n).padStart(2, '0')).join(':');
}

export const OrderCreateQuotaBanner: React.FC<{
  refreshKey?: number;
  onQuotaLoaded?: (quota: Quota) => void;
}> = ({ refreshKey = 0, onQuotaLoaded }) => {
  const { t, language } = useLanguage();
  const isRTL = language === 'ar';
  const rules = t.dashboard.createOrder.rules;

  const [quota, setQuota] = useState<Quota | null>(null);
  const [tick, setTick] = useState(0);
  const [error, setError] = useState(false);
  const expiryRefetchDone = useRef<string | null>(null);

  const load = useCallback(async () => {
    try {
      await syncServerClock(true);
      const data = await ordersApi.getCreateQuota();
      setQuota(data);
      setError(false);
      onQuotaLoaded?.(data);
    } catch {
      setError(true);
    }
  }, [onQuotaLoaded]);

  useEffect(() => {
    expiryRefetchDone.current = null;
    void load();
  }, [load, refreshKey]);

  useEffect(() => {
    const id = window.setInterval(() => setTick((n) => n + 1), 1000);
    return () => window.clearInterval(id);
  }, []);

  // One-shot re-fetch when a cooldown crosses zero (server-synced clock)
  useEffect(() => {
    if (!quota) return;
    const now = getServerNowMs();
    const targets = [quota.single.nextUnlockAt, quota.multiple.unlockAt].filter(
      Boolean,
    ) as string[];
    for (const iso of targets) {
      if (new Date(iso).getTime() <= now && expiryRefetchDone.current !== iso) {
        expiryRefetchDone.current = iso;
        void load();
        break;
      }
    }
    void tick;
  }, [tick, quota, load]);

  if (error || !quota) {
    return null;
  }

  const now = getServerNowMs();
  const singleUnlockMs = quota.single.nextUnlockAt
    ? new Date(quota.single.nextUnlockAt).getTime() - now
    : 0;
  const multiUnlockMs = quota.multiple.unlockAt
    ? new Date(quota.multiple.unlockAt).getTime() - now
    : 0;
  const atSingleLimit = quota.single.remaining <= 0;
  const multiBlocked = !quota.multiple.canCreate;

  return (
    <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 sm:px-5 sm:py-4 space-y-3 text-start">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <div className="p-2 rounded-lg bg-gold-500/15 text-gold-400 shrink-0">
            <Layers size={18} />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-white">
              {rules?.singleCounterLabel ||
                (isRTL ? 'الطلبات المفردة خلال 24 ساعة' : 'Single requests (24h)')}
            </p>
            <p className="text-sm text-white/70 mt-0.5">
              {quota.single.used}/{quota.single.max}
              {atSingleLimit
                ? ` — ${rules?.singleLimitReached || (isRTL ? 'وصلت للحد الأقصى' : 'Limit reached')}`
                : ` — ${rules?.singleRemaining?.replace('{n}', String(quota.single.remaining)) ||
                    (isRTL
                      ? `متبقي ${quota.single.remaining}`
                      : `${quota.single.remaining} remaining`)}`}
            </p>
          </div>
        </div>
        {atSingleLimit && singleUnlockMs > 0 && (
          <div className="flex items-center gap-2 text-amber-200 text-sm font-mono tabular-nums sm:shrink-0">
            <Clock size={16} className="text-amber-400" />
            <span>
              {(rules?.unlockIn || (isRTL ? 'يفتح بعد' : 'Unlocks in')) +
                ' ' +
                formatRemaining(singleUnlockMs)}
            </span>
          </div>
        )}
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-t border-white/10 pt-3">
        <div className="flex items-start gap-3 min-w-0">
          <div className="p-2 rounded-lg bg-blue-500/15 text-blue-300 shrink-0">
            <Package size={18} />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-white">
              {rules?.multipleLabel ||
                (isRTL ? 'الطلب المجمع' : 'Multiple request')}
            </p>
            <p className="text-sm text-white/70 mt-0.5">
              {multiBlocked
                ? rules?.multipleBlockedHint ||
                  (isRTL
                    ? 'متاح بعد انتهاء مدة الطلب المجمع السابق'
                    : 'Available after your previous multiple request window ends')
                : rules?.multipleAvailable ||
                  (isRTL ? 'متاح الآن' : 'Available now')}
            </p>
          </div>
        </div>
        {multiBlocked && multiUnlockMs > 0 && (
          <div className="flex items-center gap-2 text-amber-200 text-sm font-mono tabular-nums sm:shrink-0">
            <Clock size={16} className="text-amber-400" />
            <span>
              {(rules?.unlockIn || (isRTL ? 'يفتح بعد' : 'Unlocks in')) +
                ' ' +
                formatRemaining(multiUnlockMs)}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default OrderCreateQuotaBanner;
