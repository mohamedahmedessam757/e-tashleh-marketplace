import React from 'react';
import { AlertTriangle, RefreshCcw, Scale } from 'lucide-react';
import { GlassCard } from './GlassCard';
import { useLanguage } from '../../contexts/LanguageContext';

const RESOLUTION_STATUSES = new Set([
  'RETURN_REQUESTED',
  'RETURN_APPROVED',
  'DISPUTED',
  'RETURNED',
]);

interface ReturnDisputePhaseBannerProps {
  className?: string;
  status?: string;
  /** Optional case type from resolution center when order status lags */
  caseType?: 'return' | 'dispute' | null;
  caseReference?: string | null;
  partName?: string | null;
  role?: 'customer' | 'merchant' | 'admin';
}

export function shouldShowReturnDisputeBanner(
  status?: string,
  caseType?: 'return' | 'dispute' | null,
): boolean {
  if (caseType === 'return' || caseType === 'dispute') return true;
  return RESOLUTION_STATUSES.has(String(status || '').toUpperCase());
}

export const ReturnDisputePhaseBanner: React.FC<ReturnDisputePhaseBannerProps> = ({
  className = '',
  status,
  caseType,
  caseReference,
  partName,
  role = 'customer',
}) => {
  const { language } = useLanguage();
  const isAr = language === 'ar';
  const s = String(status || '').toUpperCase();

  const isDispute =
    caseType === 'dispute' || s === 'DISPUTED';
  const isReturnApproved = s === 'RETURN_APPROVED';
  const isReturned = s === 'RETURNED';

  const Icon = isDispute ? Scale : RefreshCcw;
  const tone = isDispute
    ? {
        card: 'bg-red-500/10 border-red-500/30',
        icon: 'text-red-400',
        title: 'text-red-300',
        body: 'text-red-100/85',
      }
    : {
        card: 'bg-cyan-500/10 border-cyan-500/30',
        icon: 'text-cyan-400',
        title: 'text-cyan-300',
        body: 'text-cyan-100/85',
      };

  let titleAr: string;
  let titleEn: string;
  let descAr: string;
  let descEn: string;

  if (isDispute) {
    titleAr = 'نزاع مفتوح على هذا الطلب';
    titleEn = 'Open dispute on this order';
    descAr =
      role === 'merchant'
        ? 'العميل فتح نزاعًا بعد التسليم. تابع مسار النزاع من مركز الحلول.'
        : 'تم فتح نزاع بعد التسليم. يمكنك متابعة الحالة والرد من مركز الحلول.';
    descEn =
      role === 'merchant'
        ? 'The customer opened a dispute after delivery. Follow the dispute in the resolution center.'
        : 'A dispute was opened after delivery. Track status and respond from the resolution center.';
  } else if (isReturned) {
    titleAr = 'تم إرجاع القطعة';
    titleEn = 'Part returned';
    descAr = 'اكتملت عملية الإرجاع لهذا الطلب.';
    descEn = 'The return process for this order has been completed.';
  } else if (isReturnApproved) {
    titleAr = 'تمت الموافقة على طلب الإرجاع';
    titleEn = 'Return request approved';
    descAr =
      role === 'merchant'
        ? 'تمت الموافقة على الإرجاع. أكمل خطوات الشحن/الاستلام المطلوبة من مركز الحلول.'
        : 'تمت الموافقة على إرجاعك. أكمل خطوات الشحن المطلوبة من مركز الحلول.';
    descEn =
      role === 'merchant'
        ? 'The return was approved. Complete the required shipping/handover steps in the resolution center.'
        : 'Your return was approved. Complete the required shipping steps in the resolution center.';
  } else {
    titleAr = 'طلب إرجاع مفتوح';
    titleEn = 'Open return request';
    descAr =
      role === 'merchant'
        ? 'العميل قدّم طلب إرجاع بعد التسليم. راجع الطلب ورد من مركز الحلول.'
        : 'تم تقديم طلب إرجاع بعد التسليم. تابع الحالة من مركز الحلول حتى يتم حسم الطلب.';
    descEn =
      role === 'merchant'
        ? 'The customer submitted a return after delivery. Review and respond in the resolution center.'
        : 'A return was submitted after delivery. Track the case in the resolution center until it is resolved.';
  }

  const metaParts: string[] = [];
  if (partName) metaParts.push(partName);
  if (caseReference) metaParts.push(caseReference);

  return (
    <GlassCard className={`flex items-start gap-3 p-4 ${tone.card} ${className}`}>
      <Icon className={`${tone.icon} shrink-0 mt-0.5`} size={20} />
      <div className="min-w-0 space-y-1">
        <p className={`text-sm font-black ${tone.title}`}>
          {isAr ? titleAr : titleEn}
        </p>
        <p className={`text-sm leading-relaxed ${tone.body}`}>
          {isAr ? descAr : descEn}
        </p>
        {metaParts.length > 0 && (
          <p className="text-xs text-white/45 font-bold pt-0.5">
            {metaParts.join(' · ')}
          </p>
        )}
        {role === 'merchant' && (
          <p className="text-[11px] text-white/40 flex items-center gap-1.5 pt-1">
            <AlertTriangle size={12} className="shrink-0" />
            {isAr
              ? 'هذه مرحلة إرجاع/نزاع بعد التسليم.'
              : 'This is a post-delivery return/dispute stage.'}
          </p>
        )}
      </div>
    </GlassCard>
  );
};
