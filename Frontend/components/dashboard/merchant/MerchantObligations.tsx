import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  AlertOctagon,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Clock,
  Filter,
} from 'lucide-react';
import { GlassCard } from '../../ui/GlassCard';
import { useLanguage } from '../../../contexts/LanguageContext';
import {
  useMerchantWalletStore,
  subscribeToMerchantWalletUpdates,
} from '../../../stores/useMerchantWalletStore';
import { getCurrentUser } from '../../../utils/auth';

interface MerchantObligationsProps {
  onBack?: () => void;
  onNavigate?: (page: string, id?: string) => void;
}

type FilterKey = 'ALL' | 'OPEN' | 'SETTLED';

export const MerchantObligations: React.FC<MerchantObligationsProps> = ({
  onBack,
  onNavigate,
}) => {
  const { language, t } = useLanguage();
  const isAr = language === 'ar';
  const w = t.merchant.wallet;
  const { stats, obligations, fetchObligations, isLoading } = useMerchantWalletStore();
  const [filter, setFilter] = useState<FilterKey>('ALL');

  useEffect(() => {
    void fetchObligations();
    const user = getCurrentUser();
    if (!user?.id) return;
    return subscribeToMerchantWalletUpdates(user.id, stats.storeId);
  }, [fetchObligations, stats.storeId]);

  const lines = useMemo(() => {
    const all = obligations.lines || [];
    if (filter === 'ALL') return all;
    return all.filter((l) => l.status === filter);
  }, [obligations.lines, filter]);

  const BackIcon = isAr ? ArrowRight : ArrowLeft;

  const kindLabel = (kind: string) => {
    const map: Record<string, string> = {
      GATEWAY_CANCEL_FEE: w.obligationKinds?.GATEWAY_CANCEL_FEE || kind,
      ADJUDICATION_FEE: w.transactionTypes?.ADJUDICATION_FEE || kind,
      SHIPPING_FEE: w.transactionTypes?.SHIPPING_FEE || kind,
    };
    return map[kind] || kind;
  };

  return (
    <div className="space-y-5 sm:space-y-6 max-w-5xl mx-auto px-1">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <button
            type="button"
            onClick={() => (onBack ? onBack() : onNavigate?.('wallet'))}
            className="mt-1 p-2 rounded-xl bg-white/5 border border-white/10 text-white/70 hover:text-gold-500 hover:border-gold-500/40 transition-all"
            aria-label={isAr ? 'رجوع' : 'Back'}
          >
            <BackIcon size={18} />
          </button>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              {w.obligationsTitle}
            </h1>
            <p className="text-white/40 text-xs sm:text-sm mt-1 max-w-xl">
              {w.obligationsSubtitle}
            </p>
          </div>
        </div>
        <GlassCard className="px-4 py-3 flex items-center gap-3 min-w-[160px]">
          <div className="p-2 rounded-xl bg-rose-500/10 border border-rose-500/20">
            <AlertOctagon className="text-rose-400" size={18} />
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-widest text-white/40 font-bold">
              {w.obligationsTotal}
            </p>
            <p className="text-lg font-black text-rose-300">
              {(-Number(obligations.totalDue || 0)).toLocaleString()}{' '}
              <span className="text-xs text-white/40 font-medium">AED</span>
            </p>
          </div>
        </GlassCard>
      </div>

      <div className="flex flex-wrap gap-2">
        {(['ALL', 'OPEN', 'SETTLED'] as FilterKey[]).map((key) => {
          const active = filter === key;
          const label =
            key === 'ALL'
              ? w.obligationsFilterAll
              : key === 'OPEN'
                ? w.obligationsFilterOpen
                : w.obligationsFilterSettled;
          return (
            <button
              key={key}
              type="button"
              onClick={() => setFilter(key)}
              className={`px-3 py-1.5 rounded-full text-[11px] font-bold border transition-all flex items-center gap-1.5 ${
                active
                  ? 'bg-gold-500/20 border-gold-500/40 text-gold-400'
                  : 'bg-white/5 border-white/10 text-white/50 hover:text-white/80'
              }`}
            >
              <Filter size={12} />
              {label}
            </button>
          );
        })}
      </div>

      <div className="space-y-3">
        {isLoading && !lines.length ? (
          <GlassCard className="p-8 text-center text-white/40 text-sm">
            {isAr ? 'جاري التحميل...' : 'Loading...'}
          </GlassCard>
        ) : !lines.length ? (
          <GlassCard className="p-8 text-center text-white/40 text-sm">
            {w.obligationsEmpty}
          </GlassCard>
        ) : (
          lines.map((line, idx) => {
            const negative = line.signedAmount < 0;
            return (
              <motion.div
                key={line.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(idx * 0.03, 0.3) }}
              >
                <GlassCard className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    <div
                      className={`p-2.5 rounded-xl border shrink-0 ${
                        negative
                          ? 'bg-rose-500/10 border-rose-500/20 text-rose-400'
                          : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                      }`}
                    >
                      {negative ? <Clock size={18} /> : <CheckCircle2 size={18} />}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-white truncate">
                        {kindLabel(line.kind)}
                      </p>
                      <p className="text-[11px] text-white/45 mt-0.5 line-clamp-2">
                        {isAr ? line.descriptionAr : line.descriptionEn}
                      </p>
                      <div className="flex flex-wrap gap-2 mt-2 text-[10px] text-white/35 font-semibold">
                        <span>
                          {new Date(line.createdAt).toLocaleString(isAr ? 'ar-AE' : 'en-AE')}
                        </span>
                        {line.orderId ? (
                          <button
                            type="button"
                            className="text-gold-500/80 hover:text-gold-400 underline-offset-2 hover:underline"
                            onClick={() => onNavigate?.('explore-offer', line.orderId || undefined)}
                          >
                            {isAr ? 'عرض الطلب' : 'View order'}
                          </button>
                        ) : null}
                        <span
                          className={
                            line.status === 'OPEN' ? 'text-rose-300/80' : 'text-emerald-300/80'
                          }
                        >
                          {line.status === 'OPEN' ? w.obligationsStatusOpen : w.obligationsStatusSettled}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div
                    className={`text-lg sm:text-xl font-black tabular-nums ${
                      negative ? 'text-rose-300' : 'text-emerald-300'
                    }`}
                  >
                    {line.signedAmount > 0 ? '+' : ''}
                    {Number(line.signedAmount).toLocaleString()}{' '}
                    <span className="text-xs text-white/35 font-medium">AED</span>
                  </div>
                </GlassCard>
              </motion.div>
            );
          })
        )}
      </div>
    </div>
  );
};
