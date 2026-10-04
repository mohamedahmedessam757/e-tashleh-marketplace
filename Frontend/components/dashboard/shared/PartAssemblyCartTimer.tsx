import React from 'react';
import { ShoppingCart } from 'lucide-react';
import { CorrectionCountdown } from './PartCorrectionStatus';
import { getServerNowMs } from '../../../utils/serverClock';

type Role = 'customer' | 'merchant' | 'admin';

/**
 * Per-part assembly-cart countdown (multi-part orders). The deadline is server-computed
 * (first successful payment of this offer + assemblyCartDays) — never derived client-side.
 */
export const PartAssemblyCartTimer: React.FC<{
  deadlineAt?: string | null;
  isAr: boolean;
  role: Role;
  className?: string;
}> = ({ deadlineAt, isAr, role, className = '' }) => {
  if (!deadlineAt) return null;
  const ms = new Date(deadlineAt).getTime();
  if (!Number.isFinite(ms)) return null;
  const expired = ms <= getServerNowMs();

  const desc = expired
    ? isAr
      ? 'انتهت مهلة سلة التجميع — ستُشحن القطعة تلقائياً.'
      : 'Assembly-cart window ended — this part will ship automatically.'
    : role === 'customer'
      ? isAr
        ? 'القطعة جاهزة في سلة الشحن. اطلب شحنها أو انتظر باقي القطع قبل الشحن التلقائي.'
        : 'Ready in your shipping cart. Request shipping or wait for other parts before auto-ship.'
      : isAr
        ? 'القطعة جاهزة في سلة تجميع العميل. تُشحن تلقائياً عند انتهاء المهلة.'
        : "Ready in the customer's assembly cart. Ships automatically when the window ends.";

  return (
    <div
      className={`rounded-xl border px-3 py-2.5 space-y-2 bg-cyan-500/10 border-cyan-500/30 text-cyan-100 ${className}`}
      role="status"
    >
      <div className="flex items-start gap-2">
        <ShoppingCart size={16} className="shrink-0 mt-0.5" />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-black uppercase tracking-wide">
            {isAr ? 'سلة التجميع — الشحن التلقائي' : 'Assembly cart — auto-ship'}
          </p>
          <p className="text-[11px] font-bold opacity-80 mt-0.5 leading-snug">{desc}</p>
        </div>
      </div>
      <div className="rounded-lg bg-black/20 px-3 py-2">
        <CorrectionCountdown deadlineAt={new Date(ms).toISOString()} isAr={isAr} labeled />
      </div>
    </div>
  );
};
