import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  Receipt, 
  ArrowRight, 
  User, 
  Store, 
  CreditCard, 
  ShieldCheck, 
  Wallet, 
  Download,
  Clock,
  ExternalLink,
  ChevronRight,
  Info,
  Truck,
  TrendingUp,
  Percent
} from 'lucide-react';
import { useAdminStore } from '../../../stores/useAdminStore';
import { useLanguage } from '../../../contexts/LanguageContext';
import { GlassCard } from '../../ui/GlassCard';
import { supabase } from '../../../services/supabase';

interface OrderFinancialDrawerProps {
  orderId: string | null;
  onClose: () => void;
}

export const OrderFinancialDrawer: React.FC<OrderFinancialDrawerProps> = ({ orderId, onClose }) => {
  const { t, language } = useLanguage();
  const { orderTimeline, orderTimelineLoading, fetchOrderTimeline, clearOrderTimeline } = useAdminStore();
  const isAr = language === 'ar';

  useEffect(() => {
    if (!orderId) {
      clearOrderTimeline();
      return;
    }

    fetchOrderTimeline(orderId);

    // Real-time Order Audit Synchronization
    const channel = supabase.channel(`order-audit-${orderId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'payment_transactions', filter: `order_id=eq.${orderId}` }, () => fetchOrderTimeline(orderId))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'escrow_transactions', filter: `order_id=eq.${orderId}` }, () => fetchOrderTimeline(orderId))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'wallet_transactions' }, (payload: any) => {
          // Wallet transactions don't always have order_id directly, but if they are related to a payment of this order
          if (payload.new?.description?.includes(orderTimeline?.order?.orderNumber)) {
              fetchOrderTimeline(orderId);
          }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [orderId]);

  if (!orderId) return null;

  const getEventIcon = (type: string) => {
    if (!type) return <Receipt size={16} className="text-white/40" />;
    if (type.includes('PAYMENT')) return <CreditCard size={16} className="text-gold-400" />;
    if (type.includes('ESCROW')) return <ShieldCheck size={16} className="text-emerald-400" />;
    if (type.includes('WALLET')) return <Wallet size={16} className="text-blue-400" />;
    if (type.includes('WITHDRAWAL')) return <Download size={16} className="text-purple-400" />;
    return <Receipt size={16} className="text-white/40" />;
  };

  const getEventColor = (type: string) => {
    if (!type) return 'border-white/10 bg-white/5 text-white/60';
    if (type.includes('PAYMENT')) return 'border-gold-500/20 bg-gold-500/5 text-gold-400';
    if (type.includes('ESCROW')) return 'border-emerald-500/20 bg-emerald-500/5 text-emerald-400';
    if (type.includes('WALLET')) return 'border-blue-500/20 bg-blue-500/5 text-blue-400';
    if (type.includes('WITHDRAWAL')) return 'border-purple-500/20 bg-purple-500/5 text-purple-400';
    return 'border-white/10 bg-white/5 text-white/60';
  };

  return (
    <AnimatePresence>
      {orderId && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]"
          />

          {/* Drawer */}
          <motion.div
            initial={{ x: isAr ? '-100%' : '100%' }}
            animate={{ x: 0 }}
            exit={{ x: isAr ? '-100%' : '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className={`fixed top-0 bottom-0 ${isAr ? 'left-0' : 'right-0'} w-full sm:max-w-xl bg-[#0A0908] border-${isAr ? 'r' : 'l'} border-white/10 z-[101] shadow-2xl overflow-hidden flex flex-col`}
          >
            {/* Header */}
            <div className="p-4 sm:p-6 border-b border-white/5 bg-white/[0.02] flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-gold-500/10 border border-gold-500/20 flex items-center justify-center">
                  <Receipt className="text-gold-500" size={24} />
                </div>
                <div>
                  <h2 className="text-lg font-black text-white uppercase tracking-tight">
                    {t.admin.billing.ledger.auditDrawer.title}
                  </h2>
                  <p className="text-xs text-white/40 font-mono">
                    #{orderTimeline?.order?.orderNumber || orderId.slice(-8).toUpperCase()}
                  </p>
                </div>
              </div>
              <button 
                onClick={onClose}
                className="p-2 hover:bg-white/5 rounded-xl transition-colors text-white/40 hover:text-white"
              >
                <X size={20} />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-8 custom-scrollbar">
              {orderTimelineLoading ? (
                <div className="h-full flex flex-col items-center justify-center gap-4 opacity-50">
                  <div className="w-8 h-8 border-2 border-gold-500 border-t-transparent rounded-full animate-spin" />
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-gold-500">
                    {t.admin.billing.ledger.auditDrawer.analyzing}
                  </span>
                </div>
              ) : orderTimeline ? (
                <>
                  {/* Summary Section */}
                  <div className="grid grid-cols-2 gap-4">
                    <GlassCard className="p-4 bg-white/[0.02] border-white/5">
                      <div className="text-[9px] font-black text-white/20 uppercase tracking-widest mb-1 flex items-center gap-2">
                        <CreditCard size={10} className="text-white/40" />
                        {t.admin.billing.ledger.auditDrawer.totalPaid}
                      </div>
                      <div className="text-xl font-mono font-black text-white">
                        {Number(orderTimeline.summary.totalPaid).toLocaleString()}
                        <span className="text-[10px] text-white/40 ml-1">AED</span>
                      </div>
                    </GlassCard>

                    <GlassCard className="p-4 bg-white/[0.02] border-white/5">
                      <div className="text-[9px] font-black text-white/20 uppercase tracking-widest mb-1 flex items-center gap-2">
                        <Percent size={10} className="text-gold-500/40" />
                        {t.admin.billing.ledger.auditDrawer.platformFee}
                      </div>
                      <div className="text-xl font-mono font-black text-gold-500">
                        {Number(orderTimeline.summary.totalCommission).toLocaleString()}
                        <span className="text-[10px] text-gold-500/40 ml-1">AED</span>
                      </div>
                    </GlassCard>

                    {/* NEW: Merchant Earnings */}
                    <GlassCard className="p-4 bg-white/[0.02] border-white/5 border-emerald-500/10">
                      <div className="text-[9px] font-black text-white/20 uppercase tracking-widest mb-1 flex items-center gap-2">
                        <TrendingUp size={10} className="text-emerald-500/40" />
                        {isAr ? 'حق التاجر (قيمة القطع)' : 'Merchant Earnings (Items)'}
                      </div>
                      <div className="text-xl font-mono font-black text-emerald-400">
                        {Number(orderTimeline.summary.merchantEarnings).toLocaleString()}
                        <span className="text-[10px] text-emerald-400/40 ml-1">AED</span>
                      </div>
                    </GlassCard>

                    {/* NEW: Shipping Costs */}
                    <GlassCard className="p-4 bg-white/[0.02] border-white/5 border-blue-500/10">
                      <div className="text-[9px] font-black text-white/20 uppercase tracking-widest mb-1 flex items-center gap-2">
                        <Truck size={10} className="text-blue-500/40" />
                        {isAr ? 'حق شركة الشحن' : 'Shipping Logistics Fee'}
                      </div>
                      <div className="text-xl font-mono font-black text-blue-400">
                        {Number(orderTimeline.summary.shippingCosts).toLocaleString()}
                        <span className="text-[10px] text-blue-400/40 ml-1">AED</span>
                      </div>
                    </GlassCard>
                  </div>

                  {/* Parties Overview */}
                  <div className="relative p-6 rounded-[2rem] bg-white/[0.02] border border-white/5 overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-gold-500/20 to-transparent" />
                    <div className="flex items-center justify-between gap-4 relative">
                      {/* Customer */}
                      <div className="flex flex-col items-center gap-2 flex-1">
                        <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 p-0.5 shadow-inner">
                          {orderTimeline.customer.avatar ? (
                            <img src={orderTimeline.customer.avatar} className="w-full h-full rounded-[0.9rem] object-cover" />
                          ) : (
                            <div className="w-full h-full rounded-[0.9rem] bg-white/5 flex items-center justify-center text-white/20">
                              <User size={24} />
                            </div>
                          )}
                        </div>
                        <div className="text-center">
                          <div className="text-xs font-black text-white truncate max-w-[120px]">{orderTimeline.customer.name}</div>
                          <div className="text-[9px] text-white/30 font-mono uppercase tracking-tighter">{orderTimeline.customer.code}</div>
                        </div>
                      </div>

                      <div className="flex flex-col items-center gap-1 opacity-20">
                        <ArrowRight size={20} className={isAr ? 'rotate-180' : ''} />
                        <div className="h-0.5 w-12 bg-white/20 rounded-full" />
                      </div>

                      {/* Merchants */}
                      <div className="flex flex-col items-center gap-2 flex-1">
                        <div className="flex -space-x-4 rtl:space-x-reverse">
                          {orderTimeline.merchants.map((m: any, idx: number) => (
                            <div key={`merchant-${m.id}-${idx}`} className="w-14 h-14 rounded-2xl bg-[#0A0908] border border-white/10 p-0.5 shadow-2xl relative" style={{ zIndex: 10 - idx }}>
                              {m.logo ? (
                                <img src={m.logo} className="w-full h-full rounded-[0.9rem] object-cover" />
                              ) : (
                                <div className="w-full h-full rounded-[0.9rem] bg-white/5 flex items-center justify-center text-white/20">
                                  <Store size={24} />
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                        <div className="text-center">
                          <div className="text-xs font-black text-white truncate max-w-[120px]">
                            {orderTimeline.merchants.length > 1 
                              ? `${orderTimeline.merchants.length} ${isAr ? 'تجار' : 'Merchants'}`
                              : orderTimeline.merchants[0]?.name}
                          </div>
                          <div className="text-[9px] text-white/30 font-mono uppercase tracking-tighter">
                            {orderTimeline.merchants.length === 1 ? orderTimeline.merchants[0]?.storeCode : ''}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Vertical Timeline */}
                  <div className="space-y-6">
                    <h3 className="text-[10px] font-black text-white/30 uppercase tracking-[0.3em] flex items-center gap-2">
                      <Clock size={12} className="text-gold-500" />
                      {t.admin.billing.ledger.auditDrawer.timeline}
                    </h3>

                    <div className="relative space-y-8 pl-8 rtl:pl-0 rtl:pr-8">
                      {/* Vertical Line */}
                      <div className={`absolute top-2 bottom-2 ${isAr ? 'right-[15px]' : 'left-[15px]'} w-[2px] bg-gradient-to-b from-gold-500/40 via-white/5 to-white/[0.02]`} />

                      {orderTimeline.timeline.map((event: any, idx: number) => (
                        <div key={event.id ?? `timeline-${idx}`} className="relative group">
                          {/* Point */}
                          <div className={`absolute top-1 ${isAr ? '-right-[21px]' : '-left-[21px]'} w-[10px] h-[10px] rounded-full border-2 border-[#0A0908] z-10 transition-transform group-hover:scale-125 ${
                            event.status === 'SUCCESS' || event.status === 'RELEASED' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' :
                            event.status === 'PENDING' || event.status === 'HELD' ? 'bg-amber-500' : 'bg-white/20'
                          }`} />

                          <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-4 transition-all hover:bg-white/[0.04] hover:border-white/10 group-hover:-translate-y-1">
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex items-center gap-3">
                                <div className={`w-8 h-8 rounded-lg border flex items-center justify-center ${getEventColor(event.eventType)}`}>
                                  {getEventIcon(event.eventType)}
                                </div>
                                <div>
                                  <div className="text-[10px] font-black text-white uppercase tracking-wider">
                                    {isAr ? event.eventTypeAr : event.eventTypeEn}
                                  </div>
                                  <div className="text-[9px] text-white/30 font-mono">
                                    {new Date(event.timestamp).toLocaleString(isAr ? 'ar-EG' : 'en-US', {
                                      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                                    })}
                                  </div>
                                </div>
                              </div>
                              <div className="text-right">
                                <div className={`text-sm font-mono font-black ${
                                  event.direction === 'CREDIT' || event.direction === 'RELEASE' ? 'text-emerald-400' :
                                  event.direction === 'DEBIT' ? 'text-rose-400' : 'text-white/60'
                                }`}>
                                  {event.direction === 'DEBIT' ? '-' : '+'}{Number(event.amount).toLocaleString()}
                                </div>
                                <div className="text-[8px] text-white/20 font-black uppercase">AED</div>
                              </div>
                            </div>

                            <p className="text-[11px] text-white/60 leading-relaxed bg-black/20 p-3 rounded-xl border border-white/5">
                              {isAr ? event.descriptionAr : event.descriptionEn}
                            </p>

                            {event.actor && (
                              <div className="mt-3 pt-3 border-t border-white/5 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <div className="w-5 h-5 rounded bg-white/5 border border-white/10 flex items-center justify-center text-white/30">
                                    <User size={10} />
                                  </div>
                                  <span className="text-[9px] text-white/40 font-bold uppercase tracking-widest">
                                    {event.actor.type}: <span className="text-white/80">{event.actor.name}</span>
                                  </span>
                                </div>
                                {event.status && (
                                  <span className="text-[8px] font-black px-2 py-0.5 rounded bg-white/5 border border-white/10 text-white/30 uppercase tracking-tighter">
                                    {event.status}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Refund / Dispute Info If Exists */}
                  {(orderTimeline.summary.totalRefunded > 0 || orderTimeline.summary.hasDispute) && (
                    <div className="p-4 rounded-2xl bg-rose-500/5 border border-rose-500/10 space-y-3">
                      <div className="flex items-center gap-2 text-rose-400">
                        <Info size={14} />
                        <span className="text-[10px] font-black uppercase tracking-widest">
                          {t.admin.billing.ledger.auditDrawer.alert}
                        </span>
                      </div>
                      {orderTimeline.summary.totalRefunded > 0 && (
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-rose-400/60 font-medium">{isAr ? 'إجمالي المسترد' : 'Total Refunded'}</span>
                          <span className="text-sm font-mono font-black text-rose-400">-{Number(orderTimeline.summary.totalRefunded).toLocaleString()} AED</span>
                        </div>
                      )}
                      {orderTimeline.summary.hasDispute && (
                        <div className="flex items-center gap-2 text-rose-400 text-[10px] font-bold">
                          <div className="w-1 h-1 rounded-full bg-rose-500 animate-pulse" />
                          {isAr ? 'يوجد نزاع نشط متعلق بهذا الطلب' : 'Active dispute related to this order detected'}
                        </div>
                      )}
                    </div>
                  )}
                </>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-white/10 italic text-sm">
                  {t.admin.billing.ledger.auditDrawer.noRecords}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 sm:p-6 border-t border-white/5 bg-white/[0.01]">
              <button 
                onClick={onClose}
                className="w-full py-4 bg-white/5 hover:bg-white/10 text-white text-xs font-black uppercase tracking-[0.2em] rounded-2xl border border-white/10 transition-all active:scale-[0.98]"
              >
                {t.admin.billing.ledger.auditDrawer.close}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
