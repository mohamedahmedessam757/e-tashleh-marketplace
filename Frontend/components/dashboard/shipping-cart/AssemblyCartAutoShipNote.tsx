import React from 'react';
import { Info } from 'lucide-react';
import { useLanguage } from '../../../contexts/LanguageContext';

/**
 * Shared note: 7-day auto-waybill only fires for READY_FOR_SHIPPING parts.
 */
export const AssemblyCartAutoShipNote: React.FC<{ className?: string }> = ({
  className = '',
}) => {
  const { t, language } = useLanguage();
  const isAr = language === 'ar';
  const cart = (t.dashboard as any)?.shippingCart || {};

  const title =
    cart.readyOnlyAutoShipTitle ||
    (isAr
      ? 'ملاحظة مهمة عن الـ 7 أيام'
      : 'Important note about the 7-day window');
  const body =
    cart.readyOnlyAutoShipNote ||
    (isAr
      ? 'البوليصة التلقائية تصدر فقط لو القطعة وصلت READY_FOR_SHIPPING (تجهيز + توثيق + تسليم للإدارة). لو عدّت 7 أيام وهي لسه في التوثيق، ما تتشحنش لحد ما تبقى جاهزة — ده مقصود عشان ما تتصدرش بوليصة لقطعة مش جاهزة.'
      : 'Auto-waybills are issued only when a part reaches Ready for Shipping (prepared + verified + handed over to admin). If 7 days pass while the part is still in preparation or verification, it will not ship until it becomes ready — by design, so waybills are never issued for unfinished parts.');

  return (
    <div
      className={`flex items-start gap-3 sm:gap-4 p-4 rounded-xl border border-amber-500/25 bg-amber-500/10 text-sm text-amber-100/90 shadow-inner ${className}`}
    >
      <Info size={20} className="shrink-0 text-amber-400 mt-0.5" />
      <div className="space-y-1 min-w-0">
        <p className="font-bold text-amber-200">{title}</p>
        <p className="opacity-90 leading-relaxed font-medium">{body}</p>
      </div>
    </div>
  );
};
