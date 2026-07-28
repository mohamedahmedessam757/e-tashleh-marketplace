import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Package,
  ChevronDown,
  ChevronUp,
  ArrowUpRight,
  History,
  Filter,
} from 'lucide-react';
import { GlassCard } from '../../ui/GlassCard';
import { OfferCard } from '../OfferCard';
import { useLanguage } from '../../../contexts/LanguageContext';
import { useAdminStore } from '../../../stores/useAdminStore';
import { computeOfferFinalPrice } from '../../../utils/offerPricing';
import { isVisibleMarketplaceOffer } from '../../../utils/offerStatusHelpers';

type OfferFilter = 'all' | 'active' | 'withdrawn' | 'edited';

type StoreOfferRow = {
  id: string;
  offerNumber?: string;
  unitPrice?: number;
  shippingCost?: number;
  status?: string;
  isWithdrawn?: boolean;
  withdrawalType?: string | null;
  createdAt?: string;
  updatedAt?: string;
  condition?: string;
  hasWarranty?: boolean;
  warrantyDuration?: string | null;
  deliveryDays?: string | number | null;
  offerImage?: string | null;
  weightKg?: number | null;
  partType?: string | null;
  notes?: string | null;
  cylinders?: number | string | null;
  orderPartId?: string | null;
  order?: {
    id?: string;
    orderNumber?: string;
    status?: string;
    createdAt?: string;
  };
  orderPart?: { id?: string; name?: string } | null;
};

type GovEvent = {
  id: string;
  kind: string;
  orderId?: string | null;
  offerId?: string | null;
  offerNumber?: string | null;
  timestamp: string;
  previousUnitPrice?: number | null;
  newUnitPrice?: number | null;
};

interface AdminStoreOfferHistoryProps {
  vendor: any;
  onNavigate?: (path: string, id?: any) => void;
  highlightId?: string | null;
}

const noOp = () => {};

function offerLifecycleLabel(
  offer: StoreOfferRow,
  events: GovEvent[],
  isAr: boolean,
): { label: string; className: string } {
  const edited = events.some((e) => e.kind === 'EDIT' && String(e.offerId) === String(offer.id));
  if (offer.isWithdrawn || String(offer.status || '').toLowerCase() === 'withdrawn') {
    return {
      label: isAr ? 'منسحب / ملغى' : 'Withdrawn / Cancelled',
      className: 'bg-red-500/15 text-red-300 border-red-500/30',
    };
  }
  if (String(offer.status || '').toLowerCase() === 'accepted') {
    return {
      label: isAr ? 'مقبول' : 'Accepted',
      className: 'bg-green-500/15 text-green-300 border-green-500/30',
    };
  }
  if (edited) {
    return {
      label: isAr ? 'معدَّل' : 'Edited',
      className: 'bg-blue-500/15 text-blue-300 border-blue-500/30',
    };
  }
  return {
    label: isAr ? 'نشط' : 'Active',
    className: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  };
}

export const AdminStoreOfferHistory: React.FC<AdminStoreOfferHistoryProps> = ({
  vendor,
  onNavigate,
  highlightId,
}) => {
  const { language, t } = useLanguage();
  const isAr = language === 'ar';
  const financial = useAdminStore((s) => s.systemConfig?.financial);
  const [filter, setFilter] = useState<OfferFilter>('all');
  const [expandedOrders, setExpandedOrders] = useState<Record<string, boolean>>({});

  const copy = (t.admin.storeProfile as any)?.offerHistory || {};

  const events: GovEvent[] = vendor?.offerGovernance?.events || [];

  const offers: StoreOfferRow[] = useMemo(() => {
    const fromStore: StoreOfferRow[] = Array.isArray(vendor?.offers) ? vendor.offers : [];
    const fromOrders: StoreOfferRow[] = [];
    for (const order of vendor?.orders || []) {
      for (const o of order.offers || []) {
        fromOrders.push({
          ...o,
          order: {
            id: order.id,
            orderNumber: order.orderNumber,
            status: order.status,
            createdAt: order.createdAt,
          },
        });
      }
    }
    const byId = new Map<string, StoreOfferRow>();
    for (const o of [...fromStore, ...fromOrders]) {
      if (!o?.id) continue;
      const prev = byId.get(String(o.id));
      byId.set(String(o.id), prev ? { ...prev, ...o, order: o.order || prev.order } : o);
    }
    return Array.from(byId.values()).sort(
      (a, b) =>
        new Date(b.updatedAt || b.createdAt || 0).getTime() -
        new Date(a.updatedAt || a.createdAt || 0).getTime(),
    );
  }, [vendor?.offers, vendor?.orders]);

  const filteredOffers = useMemo(() => {
    return offers.filter((o) => {
      const active = isVisibleMarketplaceOffer(o);
      const edited = events.some((e) => e.kind === 'EDIT' && String(e.offerId) === String(o.id));
      if (filter === 'active') return active;
      if (filter === 'withdrawn') return !active;
      if (filter === 'edited') return edited;
      return true;
    });
  }, [offers, filter, events]);

  const grouped = useMemo(() => {
    const map = new Map<
      string,
      { orderId: string; orderNumber: string; orderStatus?: string; offers: StoreOfferRow[] }
    >();
    for (const o of filteredOffers) {
      const orderId = String(o.order?.id || 'unknown');
      const orderNumber = String(o.order?.orderNumber || orderId.slice(0, 8));
      if (!map.has(orderId)) {
        map.set(orderId, {
          orderId,
          orderNumber,
          orderStatus: o.order?.status,
          offers: [],
        });
      }
      map.get(orderId)!.offers.push(o);
    }
    return Array.from(map.values());
  }, [filteredOffers]);

  // Auto-expand + scroll highlighted offer
  useEffect(() => {
    if (!highlightId) return;
    const target = offers.find((o) => String(o.id) === String(highlightId));
    const orderId = target?.order?.id;
    if (orderId) {
      setExpandedOrders((prev) => ({ ...prev, [String(orderId)]: true }));
    }
    const tmr = window.setTimeout(() => {
      document
        .getElementById(`store-offer-${highlightId}`)
        ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 220);
    return () => window.clearTimeout(tmr);
  }, [highlightId, offers]);

  const filters: { id: OfferFilter; label: string }[] = [
    { id: 'all', label: copy.filterAll || (isAr ? 'الكل' : 'All') },
    { id: 'active', label: copy.filterActive || (isAr ? 'نشط' : 'Active') },
    { id: 'withdrawn', label: copy.filterWithdrawn || (isAr ? 'ملغى/منسحب' : 'Withdrawn') },
    { id: 'edited', label: copy.filterEdited || (isAr ? 'معدَّل' : 'Edited') },
  ];

  return (
    <div className="space-y-6" id="store-offers-history">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <h3 className="text-xl font-black text-white uppercase tracking-widest flex items-center gap-3">
            <History size={20} className="text-gold-500" />
            {copy.title || (isAr ? 'سجل عروض المتجر' : 'Store Offer History')}
          </h3>
          <p className="text-xs text-white/40 mt-2 max-w-2xl leading-relaxed">
            {copy.subtitle ||
              (isAr
                ? 'كل العروض النشطة والمعدَّلة والملغاة لكل طلب — بنفس شكل كرت العرض للعميل.'
                : 'All active, edited, and cancelled offers per order — same card design as the customer view.')}
          </p>
        </div>
        <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-white/30">
          <Filter size={12} />
          {filteredOffers.length} {copy.offersCount || (isAr ? 'عرض' : 'offers')}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {filters.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setFilter(f.id)}
            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wide border transition-all ${
              filter === f.id
                ? 'bg-gold-500 text-black border-gold-500'
                : 'bg-white/5 text-white/50 border-white/10 hover:text-white hover:bg-white/10'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {grouped.length === 0 ? (
        <GlassCard className="p-12 text-center text-white/30 italic">
          {copy.empty || (isAr ? 'لا توجد عروض مسجّلة لهذا المتجر' : 'No offers recorded for this store')}
        </GlassCard>
      ) : (
        <div className="space-y-4">
          {grouped.map((group) => {
            const open = expandedOrders[group.orderId] ?? group.offers.some((o) => String(o.id) === String(highlightId));
            return (
              <GlassCard key={group.orderId} className="p-0 overflow-hidden border-white/5 bg-[#1A1814]">
                <button
                  type="button"
                  onClick={() =>
                    setExpandedOrders((prev) => ({
                      ...prev,
                      [group.orderId]: !open,
                    }))
                  }
                  className="w-full flex flex-wrap items-center justify-between gap-3 px-5 py-4 bg-white/[0.02] hover:bg-white/[0.04] transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0 text-start">
                    <div className="p-2 rounded-xl bg-gold-500/10 text-gold-400 border border-gold-500/20">
                      <Package size={16} />
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-bold text-white font-mono truncate">
                        #{group.orderNumber}
                      </div>
                      <div className="text-[10px] text-white/40 mt-0.5">
                        {group.offers.length}{' '}
                        {copy.offersCount || (isAr ? 'عرض' : 'offers')}
                        {group.orderStatus ? ` · ${group.orderStatus}` : ''}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {group.orderId !== 'unknown' && onNavigate && (
                      <span
                        role="button"
                        tabIndex={0}
                        onClick={(e) => {
                          e.stopPropagation();
                          onNavigate('admin-order-details', group.orderId);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.stopPropagation();
                            onNavigate('admin-order-details', group.orderId);
                          }
                        }}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest text-gold-400 border border-gold-500/30 hover:bg-gold-500 hover:text-black transition-all"
                      >
                        {copy.openOrder || (isAr ? 'الطلب' : 'Order')}
                        <ArrowUpRight size={12} />
                      </span>
                    )}
                    {open ? <ChevronUp size={16} className="text-white/40" /> : <ChevronDown size={16} className="text-white/40" />}
                  </div>
                </button>

                <AnimatePresence initial={false}>
                  {open && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="p-4 space-y-4 bg-black/20 border-t border-white/5">
                        {group.offers.map((offer) => {
                          const lifecycle = offerLifecycleLabel(offer, events, isAr);
                          const price = computeOfferFinalPrice(
                            {
                              unitPrice: offer.unitPrice,
                              shippingCost: offer.shippingCost,
                            },
                            financial,
                          ).finalPrice;
                          const offerEvents = events.filter(
                            (e) => String(e.offerId) === String(offer.id),
                          );
                          const isHighlight = String(highlightId) === String(offer.id);
                          const partName = offer.orderPart?.name;

                          return (
                            <div
                              key={offer.id}
                              id={`store-offer-${offer.id}`}
                              className={`rounded-2xl transition-shadow ${
                                isHighlight
                                  ? 'ring-2 ring-gold-500/70 shadow-[0_0_28px_rgba(212,175,55,0.35)]'
                                  : ''
                              }`}
                            >
                              <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 mb-1">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span
                                    className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-lg border ${lifecycle.className}`}
                                  >
                                    {lifecycle.label}
                                  </span>
                                  {partName && (
                                    <span className="text-[10px] text-white/45 font-bold">
                                      {partName}
                                    </span>
                                  )}
                                </div>
                                {offerEvents.length > 0 && (
                                  <span className="text-[10px] text-white/35">
                                    {offerEvents.length}{' '}
                                    {copy.events || (isAr ? 'أحداث' : 'events')}
                                  </span>
                                )}
                              </div>

                              <OfferCard
                                id={offer.id}
                                storeName={vendor?.name || vendor?.storeName || '—'}
                                rating={Number(vendor?.rating || 0)}
                                reviewCount={Number(vendor?._count?.reviews || 0)}
                                storeCity={vendor?.city}
                                storeLogo={vendor?.logo}
                                storeCode={vendor?.storeCode}
                                price={price}
                                unitPrice={Number(offer.unitPrice || 0)}
                                shippingCost={Number(offer.shippingCost || 0)}
                                isShippingIncluded={Number(offer.shippingCost || 0) === 0}
                                condition={offer.condition || 'used'}
                                warranty={
                                  offer.hasWarranty
                                    ? offer.warrantyDuration || 'yes'
                                    : 'no'
                                }
                                deliveryTime={String(offer.deliveryDays || 'N/A')}
                                status={
                                  offer.isWithdrawn
                                    ? 'withdrawn'
                                    : offer.status || 'pending'
                                }
                                offerImage={offer.offerImage || undefined}
                                weight={offer.weightKg || undefined}
                                partType={offer.partType || undefined}
                                offerNumber={offer.offerNumber}
                                submittedAt={offer.createdAt}
                                notes={offer.notes || undefined}
                                cylinders={offer.cylinders || undefined}
                                readOnly
                                orderStatus={group.orderStatus}
                                onAccept={noOp}
                                onChat={noOp}
                                onReject={noOp}
                              />

                              {offerEvents.length > 0 && (
                                <div className="mt-2 px-3 space-y-1.5">
                                  {offerEvents.slice(0, 5).map((evt) => (
                                    <div
                                      key={evt.id}
                                      className="text-[10px] text-white/40 flex flex-wrap gap-2 items-center font-mono"
                                      dir="ltr"
                                    >
                                      <span className="text-blue-300/80 uppercase font-black">
                                        {evt.kind}
                                      </span>
                                      <span>
                                        {new Date(evt.timestamp).toLocaleString(
                                          isAr ? 'ar-EG' : 'en-GB',
                                        )}
                                      </span>
                                      {(evt.previousUnitPrice != null ||
                                        evt.newUnitPrice != null) && (
                                        <span className="text-white/50">
                                          part {evt.previousUnitPrice ?? '—'} →{' '}
                                          <span className="text-gold-400">
                                            {evt.newUnitPrice ?? '—'}
                                          </span>
                                        </span>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </GlassCard>
            );
          })}
        </div>
      )}
    </div>
  );
};
