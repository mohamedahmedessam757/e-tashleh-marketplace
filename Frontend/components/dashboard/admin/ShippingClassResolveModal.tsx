import React, { useEffect, useMemo, useState } from 'react';
import { Edit3, Loader2, Package, Truck, X } from 'lucide-react';
import { ShippingClassQuestions } from '../../ui/ShippingClassQuestions';
import {
  isShippingClass,
  shippingClassShortLabel,
  type ShippingClass,
} from '../../../utils/shippingClass';
import { useAdminStore } from '../../../stores/useAdminStore';
import { ordersApi } from '../../../services/api/orders';

export type ShippingResolveOffer = {
  id: string;
  orderPartId?: string | null;
  partType?: string | null;
  unitPrice?: number | string | null;
  shippingCost?: number | string | null;
  weight?: number | string | null;
  weightKg?: number | string | null;
  cylinders?: number | null;
  storeName?: string | null;
  condition?: string | null;
};

export type ShippingResolvePart = {
  id?: string;
  name?: string | null;
  shippingClass?: string | null;
};

export type ShippingMismatchItem = {
  offer: ShippingResolveOffer;
  part: ShippingResolvePart;
  partIndex: number;
};

interface ShippingClassResolveModalProps {
  orderId: string;
  items: ShippingMismatchItem[];
  initialOfferId: string;
  isAr: boolean;
  isMultiPart?: boolean;
  shippingType?: string | null;
  onClose: () => void;
  onResolved: () => void | Promise<void>;
}

function computeShippingPreview(
  partType: ShippingClass,
  weightKg: number,
  cylinders: number | undefined,
  shipmentTypes: any[],
): number {
  const shipmentType =
    shipmentTypes.find((t: any) => t.id === partType) ||
    shipmentTypes.find((t: any) => t.id === 'standard');
  if (!shipmentType) return 0;

  if (shipmentType.hasCylinders) {
    const rate = (shipmentType.cylinderRates || []).find((r: any) => r.cylinders === cylinders);
    return rate ? Number(rate.price) || 0 : 0;
  }
  if (shipmentType.isWeightBound) {
    if (!(weightKg > 0)) return 0;
    const brackets = shipmentType.weightBrackets || [];
    const bracket = brackets.find((b: any) => weightKg >= b.minWeight && weightKg <= b.maxWeight);
    if (bracket) return Number(bracket.price) || 0;
    if (brackets.length > 0) {
      const sorted = [...brackets].sort((a: any, b: any) => b.maxWeight - a.maxWeight);
      if (weightKg > sorted[0].maxWeight) return Number(sorted[0].price) || 0;
    }
    return 0;
  }
  return Number(shipmentType.basePrice) || 0;
}

function formDefaults(item: ShippingMismatchItem | undefined) {
  const offer = item?.offer;
  const part = item?.part;
  const initialClass: ShippingClass | null = isShippingClass(offer?.partType)
    ? (offer!.partType as ShippingClass)
    : isShippingClass(part?.shippingClass)
      ? (part!.shippingClass as ShippingClass)
      : null;
  return {
    shippingClass: initialClass,
    cylinders: (offer?.cylinders != null ? Number(offer.cylinders) : '') as number | '',
    weightKg: String(offer?.weightKg ?? offer?.weight ?? ''),
  };
}

export const ShippingClassResolveModal: React.FC<ShippingClassResolveModalProps> = ({
  orderId,
  items,
  initialOfferId,
  isAr,
  isMultiPart = false,
  shippingType,
  onClose,
  onResolved,
}) => {
  const shipmentTypes = useAdminStore((s) => s.systemConfig.logistics?.shipmentTypes) ?? [];
  const financial = useAdminStore((s) => s.systemConfig?.financial);

  const [activeOfferId, setActiveOfferId] = useState(initialOfferId);
  const activeItem = useMemo(
    () => items.find((i) => i.offer.id === activeOfferId) || items[0],
    [items, activeOfferId],
  );

  const defaults = formDefaults(activeItem);
  const [shippingClass, setShippingClass] = useState<ShippingClass | null>(defaults.shippingClass);
  const [cylinders, setCylinders] = useState<number | ''>(defaults.cylinders);
  const [weightKg, setWeightKg] = useState<string>(defaults.weightKg);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Keep selection valid as parent refreshes after each decision
  useEffect(() => {
    if (!items.length) {
      onClose();
      return;
    }
    if (!items.some((i) => i.offer.id === activeOfferId)) {
      setActiveOfferId(items[0].offer.id);
    }
  }, [items, activeOfferId, onClose]);

  // Reset form when switching part/offer
  useEffect(() => {
    const next = formDefaults(activeItem);
    setShippingClass(next.shippingClass);
    setCylinders(next.cylinders);
    setWeightKg(next.weightKg);
    setError(null);
  }, [activeItem?.offer.id]);

  const offer = activeItem?.offer;
  const part = activeItem?.part;
  const basePrice = Number(offer?.unitPrice) || 0;
  const previewShipping = useMemo(() => {
    if (!shippingClass) return 0;
    return computeShippingPreview(
      shippingClass,
      parseFloat(weightKg) || 0,
      cylinders === '' ? undefined : Number(cylinders),
      shipmentTypes,
    );
  }, [shippingClass, weightKg, cylinders, shipmentTypes]);

  const rate = (financial?.commissionRate || 25) / 100;
  const minComm = financial?.minCommission || 100;
  const commission =
    basePrice > 0 ? Math.max(Math.round(basePrice * rate), minComm) : 0;
  const finalPrice = basePrice + previewShipping + commission;

  const needsCylinders = shippingClass === 'engine';
  const needsWeight = shippingClass === 'standard';
  const canSubmit =
    !!offer?.id &&
    !!shippingClass &&
    (!needsCylinders || (typeof cylinders === 'number' && cylinders > 0)) &&
    (!needsWeight || (parseFloat(weightKg) || 0) > 0);

  const showPartPicker = items.length > 1;
  const isCombined = shippingType === 'combined';

  const submit = async () => {
    if (!offer?.id || !shippingClass || !canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      await ordersApi.adminResolveShippingClass(orderId, offer.id, {
        shippingClass,
        applyTo: 'both',
        cylinders: needsCylinders ? Number(cylinders) : undefined,
        weightKg: needsWeight ? parseFloat(weightKg) : undefined,
      });
      const remaining = items.filter((i) => i.offer.id !== offer.id);
      await onResolved();
      if (remaining.length > 0) {
        setActiveOfferId(remaining[0].offer.id);
      } else {
        onClose();
      }
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || 'Failed');
    } finally {
      setSubmitting(false);
    }
  };

  if (!activeItem || !offer) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80" onClick={onClose}>
      <div
        className="w-full max-w-lg max-h-[92vh] overflow-y-auto rounded-t-3xl sm:rounded-2xl border border-white/10 bg-[#1A1814] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between gap-3 px-5 py-4 border-b border-white/10 bg-[#1A1814]/95 backdrop-blur">
          <div className="flex items-center gap-2 min-w-0">
            <div className="p-2 rounded-xl bg-gold-500/15 text-gold-400 shrink-0">
              <Edit3 size={18} />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-black text-white truncate">
                {isAr ? 'القرار النهائي — نوع الشحن' : 'Final decision — shipping class'}
              </h3>
              <p className="text-[11px] text-white/45 truncate">
                {isMultiPart
                  ? isAr
                    ? `قطعة ${activeItem.partIndex} · ${part?.name || 'قطعة'}`
                    : `Part ${activeItem.partIndex} · ${part?.name || 'Part'}`
                  : part?.name || (isAr ? 'قطعة' : 'Part')}
                {offer.storeName ? ` · ${offer.storeName}` : ''}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-white/50 hover:text-white hover:bg-white/10"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {showPartPicker && (
            <label className="block space-y-1.5">
              <span className="text-xs font-bold text-white/60">
                {isAr ? 'اختر القطعة / العرض للاختلاف' : 'Select mismatched part / offer'}
              </span>
              <select
                value={activeOfferId}
                onChange={(e) => setActiveOfferId(e.target.value)}
                className="w-full min-h-[44px] rounded-xl bg-[#1A1814] border border-gold-500/30 px-3 text-white text-sm font-bold appearance-none cursor-pointer [color-scheme:dark]"
              >
                {items.map((item) => {
                  const label = isAr
                    ? `قطعة ${item.partIndex} — ${item.part.name || 'قطعة'}${item.offer.storeName ? ` · ${item.offer.storeName}` : ''}`
                    : `Part ${item.partIndex} — ${item.part.name || 'Part'}${item.offer.storeName ? ` · ${item.offer.storeName}` : ''}`;
                  return (
                    <option key={item.offer.id} value={item.offer.id} className="bg-[#1A1814]">
                      {label}
                    </option>
                  );
                })}
              </select>
              <p className="text-[10px] text-white/40 leading-relaxed">
                {isAr
                  ? `متبقي ${items.length} اختلاف${isCombined ? ' — قرار كل قطعة مستقل حتى في الشحن المجمع' : ''}.`
                  : `${items.length} mismatch(es) left${isCombined ? ' — each part is decided independently (including combined shipping)' : ''}.`}
              </p>
            </label>
          )}

          {(isMultiPart || isCombined) && !showPartPicker && (
            <div className="rounded-xl border border-white/10 bg-black/25 px-3 py-2 text-[11px] text-white/55 leading-relaxed">
              {isAr
                ? 'القرار يخص هذه القطعة فقط ولا يغيّر تصنيف القطع الأخرى في الطلب المجمع.'
                : 'This decision applies to this part only and does not change other parts on a combined order.'}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            <div className="rounded-xl border border-white/10 bg-black/25 p-3">
              <div className="text-white/40 mb-1">{isAr ? 'تصنيف العميل' : 'Customer class'}</div>
              <div className="font-bold text-gold-300">
                {shippingClassShortLabel(part?.shippingClass, isAr)}
              </div>
            </div>
            <div className="rounded-xl border border-white/10 bg-black/25 p-3">
              <div className="text-white/40 mb-1">{isAr ? 'تصنيف التاجر' : 'Merchant class'}</div>
              <div className="font-bold text-amber-300">
                {shippingClassShortLabel(offer.partType, isAr)}
              </div>
            </div>
          </div>

          <ShippingClassQuestions
            key={offer.id}
            isAr={isAr}
            value={shippingClass}
            onChange={setShippingClass}
            title={isAr ? 'اختر التصنيف النهائي لهذه القطعة' : 'Choose final class for this part'}
          />

          {needsCylinders && (
            <label className="block space-y-1.5">
              <span className="text-xs font-bold text-white/60">
                {isAr ? 'عدد السلندرات (مطلوب للمحرك)' : 'Cylinders (required for engine)'}
              </span>
              <select
                value={cylinders === '' ? '' : String(cylinders)}
                onChange={(e) => setCylinders(e.target.value ? Number(e.target.value) : '')}
                className="w-full min-h-[44px] rounded-xl bg-[#1A1814] border border-white/10 px-3 text-white text-sm appearance-none cursor-pointer [color-scheme:dark]"
              >
                <option value="" className="bg-[#1A1814] text-white">{isAr ? 'اختر…' : 'Select…'}</option>
                {[3, 4, 5, 6, 8, 10, 12].map((n) => (
                  <option key={n} value={n} className="bg-[#1A1814] text-white">
                    {n}
                  </option>
                ))}
              </select>
            </label>
          )}

          {needsWeight && (
            <label className="block space-y-1.5">
              <span className="text-xs font-bold text-white/60">
                {isAr ? 'الوزن بالكيلو (مطلوب للشحن العادي)' : 'Weight kg (required for standard)'}
              </span>
              <input
                type="number"
                min={0.1}
                step={0.1}
                value={weightKg}
                onChange={(e) => setWeightKg(e.target.value)}
                className="w-full min-h-[44px] rounded-xl bg-white/5 border border-white/10 px-3 text-white text-sm"
                placeholder="e.g. 12"
              />
            </label>
          )}

          <div className="rounded-2xl border border-gold-500/25 bg-gold-500/5 p-4 space-y-3">
            <div className="flex items-center gap-2 text-gold-300 text-xs font-black uppercase tracking-wider">
              <Package size={14} />
              {isAr ? 'معاينة العرض بعد القرار (لهذه القطعة)' : 'Offer preview after decision (this part)'}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-gold-500/30 bg-black/30 text-gold-200 text-xs font-bold">
                <Truck size={12} />
                {shippingClass
                  ? shippingClassShortLabel(shippingClass, isAr)
                  : isAr
                    ? 'لم يُحدد بعد'
                    : 'Not set yet'}
              </span>
              {offer.condition && (
                <span className="px-2.5 py-1 rounded-lg border border-white/10 bg-black/30 text-white/70 text-xs font-bold uppercase">
                  {offer.condition}
                </span>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-lg bg-black/30 border border-white/10 p-2.5">
                <div className="text-white/40">{isAr ? 'سعر القطعة' : 'Part price'}</div>
                <div className="font-bold text-white mt-0.5">AED {basePrice.toLocaleString()}</div>
              </div>
              <div className="rounded-lg bg-black/30 border border-white/10 p-2.5">
                <div className="text-white/40">{isAr ? 'الشحن المحسوب' : 'Computed shipping'}</div>
                <div className="font-bold text-amber-200 mt-0.5">AED {previewShipping.toLocaleString()}</div>
              </div>
              <div className="rounded-lg bg-black/30 border border-white/10 p-2.5">
                <div className="text-white/40">{isAr ? 'عمولة المنصة' : 'Platform fee'}</div>
                <div className="font-bold text-white/80 mt-0.5">AED {commission.toLocaleString()}</div>
              </div>
              <div className="rounded-lg bg-black/30 border border-gold-500/30 p-2.5">
                <div className="text-white/40">{isAr ? 'السعر النهائي للعميل' : 'Customer final price'}</div>
                <div className="font-black text-gold-400 mt-0.5">AED {finalPrice.toLocaleString()}</div>
              </div>
            </div>
            <p className="text-[10px] text-white/40 leading-relaxed">
              {isAr
                ? 'التحكم هنا على نوع شحن هذه القطعة فقط. معاينة السعر ظاهرة لك فقط؛ إشعارات العميل والتاجر لا تتضمن تكلفة الشحن.'
                : 'You only control shipping class for this part. Price preview is admin-only; customer and merchant notices omit shipping cost.'}
            </p>
          </div>

          {error && (
            <p className="text-xs font-bold text-red-300 bg-red-500/10 border border-red-500/30 rounded-xl px-3 py-2">
              {error}
            </p>
          )}

          <button
            type="button"
            disabled={!canSubmit || submitting}
            onClick={() => void submit()}
            className="w-full min-h-[48px] rounded-xl bg-gradient-to-r from-gold-600 to-gold-400 text-black font-black text-sm disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {submitting ? (
              <>
                <Loader2 className="animate-spin" size={18} />
                {isAr ? 'جاري إرسال القرار…' : 'Sending decision…'}
              </>
            ) : (
              <>
                <Edit3 size={18} />
                {items.length > 1
                  ? isAr
                    ? `إرسال قرار هذه القطعة (${items.length} متبقية)`
                    : `Send decision for this part (${items.length} left)`
                  : isAr
                    ? 'إرسال القرار النهائي'
                    : 'Send final decision'}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
