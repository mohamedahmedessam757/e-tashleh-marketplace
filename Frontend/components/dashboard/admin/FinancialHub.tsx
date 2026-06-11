
import React, { useState, useMemo, useEffect } from 'react';
import { GlassCard } from '../../ui/GlassCard';
import { useAdminStore } from '../../../stores/useAdminStore';
import { useLanguage } from '../../../contexts/LanguageContext';
import {
  DollarSign, TrendingUp, Save, Lock, ShieldAlert, RefreshCw,
  CheckCircle2, PieChart, Activity, Wallet, ArrowUpRight,
  Info, ShieldCheck, ChevronRight, Layout, Clock
} from 'lucide-react';
import { useAdminPermissionsStore } from '../../../stores/useAdminPermissionsStore';
import { BlurredSection } from './BlurredSection';
import { motion, AnimatePresence } from 'framer-motion';

export const FinancialHub: React.FC = () => {
  const { t, language } = useLanguage();
  const { 
    commissionRate, 
    setCommissionRate, 
    currentAdmin,
    adminFinancials,
    fetchAdminFinancials,
    subscribeToFinancials,
    unsubscribeFromFinancials
  } = useAdminStore();
  const { canViewTab } = useAdminPermissionsStore();
  const isAr = language === 'ar';

  const [activeTab, setActiveTab] = useState<'REVENUE' | 'COMMISSION' | 'ESCROW'>('REVENUE');
  const [tempRate, setTempRate] = useState(commissionRate);
  const [orderToRelease, setOrderToRelease] = useState('');
  const [paymentToRelease, setPaymentToRelease] = useState('');
  const [offerToRelease, setOfferToRelease] = useState('');
  const [isReleasing, setIsReleasing] = useState(false);

  // Permissions-based Tab filtering
  const visibleTabs = useMemo(() => {
    const allTabs = [
      { id: 'REVENUE', label: isAr ? 'دخل المنصة' : 'Platform Revenue', icon: Activity },
      { id: 'COMMISSION', label: isAr ? 'التحكم بالعمولة' : 'Commission Control', icon: DollarSign },
      { id: 'ESCROW', label: isAr ? 'التحكم في الضمان' : 'Escrow Control', icon: ShieldAlert },
    ];
    return allTabs.map(tab => ({
      ...tab,
      isLocked: !canViewTab('BILLING', tab.id)
    }));
  }, [canViewTab, isAr]);

  // Sync tempRate and fetch financials
  useEffect(() => {
    setTempRate(commissionRate);
    
    if (!adminFinancials) {
      fetchAdminFinancials();
    }
    
    subscribeToFinancials();
    return () => unsubscribeFromFinancials();
  }, [commissionRate]);

  const kpis = adminFinancials?.kpis || {
    totalSales: 0,
    pendingWithdrawals: 0,
    frozenFunds: 0
  };

  const handleSaveCommission = async () => {
    try {
      await setCommissionRate(tempRate);
      alert(isAr ? 'تم تحديث نسبة العمولة بنجاح' : 'Commission rate updated successfully!');
    } catch (error) {
      alert(isAr ? 'فشل تحديث العمولة' : 'Failed to update commission');
    }
  };

  const handleReleaseEscrow = async () => {
    if (!orderToRelease && !paymentToRelease && !offerToRelease) return;
    setIsReleasing(true);
    try {
      const { client } = await import('../../../services/api/client');
      await client.post('/payments/admin/release-escrow', {
        orderId: orderToRelease || undefined,
        paymentId: paymentToRelease || undefined,
        offerId: offerToRelease || undefined,
      });
      alert(isAr ? 'تم تحرير الأموال بنجاح' : 'Funds released successfully');
      setOrderToRelease('');
      setPaymentToRelease('');
      setOfferToRelease('');
    } catch (error) {
      console.error(error);
      alert(isAr ? 'فشل تحرير الأموال' : 'Failed to release funds');
    } finally {
      setIsReleasing(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-10">
      {/* Header Area */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-white flex items-center gap-3 tracking-tight">
            <div className="p-2.5 bg-gold-500/10 rounded-2xl border border-gold-500/20 shadow-lg shadow-gold-500/5">
              <PieChart className="w-8 h-8 text-gold-500" />
            </div>
            {isAr ? 'المركز المالي العالمي' : 'Global Financial Hub'}
          </h1>
          <p className="text-white/40 text-sm mt-2 font-medium">
            {isAr ? 'إدارة السياسات المالية، العمولات، وتحرير الأموال المعلقة' : 'Manage financial policies, commissions, and escrow releases'}
          </p>
        </div>

        <div className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-2xl p-1.5 backdrop-blur-md">
          <div className="px-4 py-2 flex flex-col items-end">
            <span className="text-[10px] text-white/30 uppercase font-black tracking-widest leading-none mb-1">Commission</span>
            <span className="text-lg font-mono font-black text-gold-500 leading-none">{commissionRate}%</span>
          </div>
          <div className="w-px h-8 bg-white/10" />
          <div className="px-4 py-2 flex flex-col items-end">
            <span className="text-[10px] text-white/30 uppercase font-black tracking-widest leading-none mb-1">Status</span>
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_8px_#22c55e]" />
              <span className="text-xs font-bold text-white/80 uppercase">Active</span>
            </div>
          </div>
        </div>
      </div>

      {/* Modern Tab Navigation */}
      <div className="relative flex p-1.5 bg-white/5 rounded-3xl border border-white/10 shadow-2xl overflow-hidden backdrop-blur-xl">
        {visibleTabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`relative flex-1 flex items-center justify-center gap-3 py-4 text-xs font-black uppercase tracking-[0.2em] transition-all duration-500 z-10 ${activeTab === tab.id ? 'text-black' : 'text-white/40 hover:text-white/70'} ${tab.isLocked ? 'opacity-50' : ''}`}
          >
            {activeTab === tab.id && (
              <motion.div
                layoutId="activeTabFinancial"
                className="absolute inset-0 bg-gradient-to-r from-gold-400 via-gold-500 to-gold-600 rounded-2xl shadow-[0_0_30px_rgba(212,175,55,0.3)]"
                transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
              />
            )}
            <tab.icon size={18} className={`relative z-10 ${activeTab === tab.id ? 'animate-pulse' : ''}`} />
            <span className="relative z-10">{tab.label}</span>
            {tab.isLocked && <Lock size={12} className={`relative z-10 ${activeTab === tab.id ? 'text-black/50' : 'text-gold-500/50'}`} />}
          </button>
        ))}
      </div>

      {/* Content Area */}
      <div className="min-h-[400px]">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.4 }}
          >
            <BlurredSection
              isBlurred={visibleTabs.find(t => t.id === activeTab)?.isLocked}
              titleAr={`قسم ${visibleTabs.find(t => t.id === activeTab)?.label} محمي`}
              titleEn={`${visibleTabs.find(t => t.id === activeTab)?.label} Section Protected`}
              descriptionAr="هذه البيانات مالية وحساسة جداً. يرجى مراجعة الإدارة للحصول على الصلاحيات المطلوبة."
              descriptionEn="This section contains sensitive financial data. Contact your administrator for access."
            >
              {activeTab === 'REVENUE' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <GlassCard className="p-8 bg-gradient-to-br from-white/5 to-transparent border-white/10 hover:border-gold-500/30 transition-all group">
                    <div className="flex justify-between items-start mb-6">
                      <div className="p-3 bg-gold-500/10 rounded-2xl text-gold-500 group-hover:scale-110 transition-transform">
                        <TrendingUp size={24} />
                      </div>
                      <ArrowUpRight className="text-green-400 opacity-40" />
                    </div>
                    <p className="text-white/40 text-[10px] uppercase font-black tracking-widest mb-1">{isAr ? 'إيراد المنصة المحقق' : 'Realized Platform Revenue'}</p>
                    <h3 className="text-3xl font-black text-white font-mono">{((kpis as any).platformRevenue ?? (kpis as any).netCommission ?? 0).toLocaleString()} <span className="text-xs text-gold-500">AED</span></h3>
                    <div className="mt-4 flex items-center gap-2">
                      <span className="text-white/40 text-[10px]">{isAr ? 'من سجل محفظة المنصة' : 'From platform_wallet ledger'}</span>
                    </div>
                  </GlassCard>

                  <GlassCard className="p-8 bg-gradient-to-br from-white/5 to-transparent border-white/10 hover:border-blue-500/30 transition-all group">
                    <div className="flex justify-between items-start mb-6">
                      <div className="p-3 bg-blue-500/10 rounded-2xl text-blue-500 group-hover:scale-110 transition-transform">
                        <Wallet size={24} />
                      </div>
                    </div>
                    <p className="text-white/40 text-[10px] uppercase font-black tracking-widest mb-1">{isAr ? 'مدفوعات معلقة' : 'Pending Payouts'}</p>
                    <h3 className="text-3xl font-black text-white font-mono">{(kpis.pendingWithdrawals || 0).toLocaleString()} <span className="text-xs text-blue-500">AED</span></h3>
                    <div className="mt-4 flex items-center gap-2">
                      <Clock size={12} className="text-white/20" />
                      <span className="text-white/40 text-[10px]">{isAr ? 'دورة السحب القادمة: الخميس' : 'Next payout cycle: Thursday'}</span>
                    </div>
                  </GlassCard>

                  <GlassCard className="p-8 bg-gradient-to-br from-white/5 to-transparent border-white/10 hover:border-purple-500/30 transition-all group">
                    <div className="flex justify-between items-start mb-6">
                      <div className="p-3 bg-purple-500/10 rounded-2xl text-purple-500 group-hover:scale-110 transition-transform">
                        <ShieldCheck size={24} />
                      </div>
                    </div>
                    <p className="text-white/40 text-[10px] uppercase font-black tracking-widest mb-1">{isAr ? 'أموال تجار معلقة/مجمدة' : 'Merchant Pending + Frozen'}</p>
                    <h3 className="text-3xl font-black text-white font-mono">{(kpis.frozenFunds || 0).toLocaleString()} <span className="text-xs text-purple-500">AED</span></h3>
                    <div className="mt-4 flex items-center gap-2">
                      <span className="text-white/40 text-[10px]">{isAr ? 'من أرصدة المتاجر (ضمان + نزاعات)' : 'From store pending + frozen balances'}</span>
                    </div>
                  </GlassCard>
                </div>
              )}

              {activeTab === 'COMMISSION' && (
                <div className="max-w-3xl mx-auto">
                  <GlassCard className="p-10 bg-[#1A1814] border-white/10 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-32 bg-gold-500/5 rounded-full blur-[100px] pointer-events-none" />

                    <div className="flex items-center gap-6 mb-10">
                      <div className="p-5 bg-gold-500/10 rounded-[2rem] border border-gold-500/20">
                        <DollarSign size={40} className="text-gold-500" />
                      </div>
                      <div>
                        <h2 className="text-2xl font-black text-white mb-2">{isAr ? 'نسبة العمولة المركزية' : 'Central Commission Rate'}</h2>
                        <p className="text-white/40 text-sm leading-relaxed max-w-md">
                          {isAr
                            ? 'تتحكم هذه القيمة في العمولة المقتطعة من جميع الصفقات الجديدة في المنصة.'
                            : 'This value controls the commission deducted from all new platform transactions.'}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-10">
                      <div className="flex justify-between items-center bg-white/5 p-6 rounded-3xl border border-white/10">
                        <span className="text-sm font-black text-white/40 uppercase tracking-widest">Adjust Rate</span>
                        <div className="flex items-baseline gap-2">
                          <span className="text-6xl font-black text-white font-mono leading-none">{tempRate}</span>
                          <span className="text-2xl font-black text-gold-500 font-mono">%</span>
                        </div>
                      </div>

                      <div className="px-4">
                        <input
                          type="range"
                          min="0"
                          max="30"
                          step="1"
                          value={tempRate}
                          onChange={(e) => setTempRate(parseInt(e.target.value))}
                          className="w-full accent-gold-500 h-2.5 bg-white/10 rounded-full appearance-none cursor-pointer hover:bg-white/15 transition-all"
                        />
                        <div className="flex justify-between mt-4 text-[10px] font-black text-white/20 uppercase tracking-widest">
                          <span>0% Minimum</span>
                          <span>15% Recommended</span>
                          <span>30% Maximum</span>
                        </div>
                      </div>

                      <div className="flex flex-col md:flex-row gap-4 pt-6">
                        <button
                          onClick={handleSaveCommission}
                          className="flex-1 py-4 bg-gold-500 hover:bg-gold-600 text-black text-sm font-black uppercase tracking-widest rounded-2xl shadow-2xl shadow-gold-500/20 transition-all active:scale-[0.98] flex items-center justify-center gap-3 group"
                        >
                          <Save size={18} className="group-hover:rotate-12 transition-transform" />
                          {isAr ? 'حفظ التغييرات' : 'Save Configuration'}
                        </button>
                        <button
                          onClick={() => setTempRate(commissionRate)}
                          className="px-8 py-4 bg-white/5 hover:bg-white/10 text-white/60 text-sm font-black uppercase tracking-widest rounded-2xl border border-white/10 transition-all"
                        >
                          {isAr ? 'إعادة تعيين' : 'Reset'}
                        </button>
                      </div>
                    </div>

                    <div className="mt-10 p-4 bg-blue-500/5 border border-blue-500/10 rounded-2xl flex items-start gap-4">
                      <Info className="text-blue-400 shrink-0 mt-1" size={18} />
                      <p className="text-xs text-blue-400/70 leading-relaxed">
                        {isAr
                          ? 'تنبيه: أي تغيير في نسبة العمولة سيتم تطبيقه فوراً على عروض الأسعار الجديدة فقط. العقود القائمة لن تتأثر.'
                          : 'Warning: Any changes to the commission rate will apply instantly to new offers only. Existing contracts remain unchanged.'}
                      </p>
                    </div>
                  </GlassCard>
                </div>
              )}

              {activeTab === 'ESCROW' && (
                <div className="max-w-3xl mx-auto">
                  <GlassCard className="p-10 bg-[#1A1814] border-white/10">
                    <div className="flex items-center gap-6 mb-10">
                      <div className="p-5 bg-orange-500/10 rounded-[2rem] border border-orange-500/20">
                        <ShieldAlert size={40} className="text-orange-500" />
                      </div>
                      <div>
                        <h2 className="text-2xl font-black text-white mb-2">{isAr ? 'تحرير أموال الضمان' : 'Escrow Fund Release'}</h2>
                        <p className="text-white/40 text-sm leading-relaxed max-w-md">
                          {isAr
                            ? 'أداة طوارئ لتحرير الأموال يدوياً للتاجر في حالات النزاع المعقدة أو فشل النظام الآلي.'
                            : 'Emergency tool to manually release funds to merchants in complex dispute cases or auto-release failures.'}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] px-2">{isAr ? 'رقم الطلب (اختياري للطلب أحادي الدفع)' : 'Order ID (optional for single-payment)'}</label>
                        <input
                            type="text"
                            placeholder="Order UUID"
                            value={orderToRelease}
                            onChange={(e) => setOrderToRelease(e.target.value)}
                            disabled={isReleasing}
                            className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-4 text-white font-mono focus:border-orange-500/50 outline-none transition-all"
                          />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] px-2">{isAr ? 'معرف الدفع (مفضل للطلبات المجمّعة)' : 'Payment ID (preferred for multi-part)'}</label>
                        <input
                            type="text"
                            placeholder="Payment UUID"
                            value={paymentToRelease}
                            onChange={(e) => setPaymentToRelease(e.target.value)}
                            disabled={isReleasing}
                            className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-4 text-white font-mono focus:border-orange-500/50 outline-none transition-all"
                          />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] px-2">{isAr ? 'معرف العرض / Offer ID' : 'Offer ID'}</label>
                        <input
                            type="text"
                            placeholder="Offer UUID"
                            value={offerToRelease}
                            onChange={(e) => setOfferToRelease(e.target.value)}
                            disabled={isReleasing}
                            className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-4 text-white font-mono focus:border-orange-500/50 outline-none transition-all"
                          />
                      </div>

                      <button
                        onClick={handleReleaseEscrow}
                        disabled={isReleasing || (!orderToRelease && !paymentToRelease && !offerToRelease)}
                        className={`w-full py-5 rounded-2xl font-black uppercase tracking-[0.2em] text-sm flex items-center justify-center gap-3 transition-all active:scale-[0.98] ${(orderToRelease || paymentToRelease || offerToRelease) && !isReleasing
                            ? 'bg-orange-500 hover:bg-orange-600 text-white shadow-2xl shadow-orange-500/20'
                            : 'bg-white/5 text-white/20 cursor-not-allowed border border-white/10'
                          }`}
                      >
                        {isReleasing ? (
                          <RefreshCw size={20} className="animate-spin" />
                        ) : (
                          <>
                            <ShieldCheck size={20} />
                            {isAr ? 'تأكيد تحرير الأموال' : 'Authorize Fund Release'}
                          </>
                        )}
                      </button>

                      <div className="flex items-center gap-3 p-4 bg-red-500/5 border border-red-500/10 rounded-2xl">
                        <ShieldAlert className="text-red-400 shrink-0" size={18} />
                        <span className="text-[10px] font-bold text-red-400/80 uppercase tracking-wider">
                          {isAr
                            ? 'تحذير: هذا الإجراء غير قابل للتراجع وسيتم تحويل الأموال فوراً لمحفظة التاجر.'
                            : 'Warning: This action is irreversible and funds will be immediately moved to merchant wallet.'}
                        </span>
                      </div>
                    </div>
                  </GlassCard>
                </div>
              )}
            </BlurredSection>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};

// Re-using Hash icon from OrderControl context if needed, otherwise define locally
const Hash = ({ className, size = 18 }: any) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <line x1="4" x2="20" y1="9" y2="9" /><line x1="4" x2="20" y1="15" y2="15" /><line x1="10" x2="8" y1="3" y2="21" /><line x1="16" x2="14" y1="3" y2="21" />
  </svg>
);
