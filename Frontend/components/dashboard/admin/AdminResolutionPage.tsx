import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Scale, 
  RotateCcw, 
  Search, 
  ChevronRight, 
  ChevronLeft, 
  AlertCircle, 
  Clock, 
  Filter, 
  CheckCircle2, 
  MessageSquare,
  ArrowUpRight,
  Loader2,
  ShieldCheck,
  Zap,
  Gavel,
  History,
  Eye,
  FileText,
  X,
  Store,
  Users
} from 'lucide-react';
import { GlassCard } from '../../ui/GlassCard';
import { useResolutionStore } from '../../../stores/useResolutionStore';
import { useLanguage } from '../../../contexts/LanguageContext';
import { Badge } from '../../ui/Badge';
import { Button } from '../../ui/Button';
import { DisputeChat } from '../resolution/DisputeChat';
import { useAdminPermissionsStore } from '../../../stores/useAdminPermissionsStore';
import { BlurredSection } from './BlurredSection';
import { Lock } from 'lucide-react';
import { useMemo } from 'react';

interface AdminResolutionPageProps {
  onNavigate?: (path: string, id?: any) => void;
}

const EscalationTimer = ({ deadline, language }: { deadline: string, language: string }) => {
  const [timeLeft, setTimeLeft] = useState('');
  const isAr = language === 'ar';

  useEffect(() => {
    const calculate = () => {
      const diff = new Date(deadline).getTime() - new Date().getTime();
      if (diff <= 0) {
        setTimeLeft(isAr ? 'انتهت المهلة - تصعيد فوري' : 'Deadline Passed - Immediate Escalation');
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      
      if (hours > 24) {
        const days = Math.floor(hours / 24);
        setTimeLeft(isAr ? `متبقي ${days} يوم و${hours % 24} ساعة` : `${days}d ${hours % 24}h remaining`);
      } else {
        setTimeLeft(isAr ? `متبقي ${hours} ساعة و${mins} دقيقة` : `${hours}h ${mins}m remaining`);
      }
    };

    calculate();
    const timer = setInterval(calculate, 60000);
    return () => clearInterval(timer);
  }, [deadline, language]);

  return (
    <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-gold-400 animate-pulse">
      <Clock size={12} className="text-gold-500" />
      {timeLeft}
    </div>
  );
};

export const AdminResolutionPage: React.FC<AdminResolutionPageProps> = ({ onNavigate }) => {
  const { 
    cases, 
    isLoading, 
    fetchAdminCases, 
    subscribeToCases, 
    unsubscribeFromCases,
    adminVerdict,
    fetchCustomerRisk
  } = useResolutionStore();
  
  const { t, language } = useLanguage();
  const isAr = language === 'ar';
  const ArrowIcon = isAr ? ChevronLeft : ChevronRight;

  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'escrow' | 'escalated' | 'resolved'>('all');
  // Phase 4 State
  const { merchantRisk, fetchMerchantRisk, updateAdminVerdict } = useResolutionStore();

  useEffect(() => {
    (window as any).currentViewRole = 'admin';
    fetchAdminCases();
    subscribeToCases('admin');

    return () => {
      unsubscribeFromCases();
    };
  }, []);

  const canViewTab = useAdminPermissionsStore(s => s.canViewTab);
  
  const visibleTabs = useMemo(() => {
    const tabs = [
      { id: 'all', icon: Scale, label: t.admin.disputeManager.tabs.all, permissionKey: 'OVERSIGHT' },
      { id: 'escrow', icon: RotateCcw, label: t.admin.disputeManager.tabs.escrow, permissionKey: 'WARRANTY' },
      { id: 'resolved', icon: CheckCircle2, label: t.admin.disputeManager.tabs.closed, permissionKey: 'CLOSED' }
    ];
    return tabs.map(tab => ({
      ...tab,
      isLocked: !canViewTab('resolution', tab.permissionKey)
    }));
  }, [t, canViewTab]);

  // Auto-switch if current tab is restricted
  useEffect(() => {
    const firstAllowed = visibleTabs.find(t => !t.isLocked);
    if (firstAllowed && visibleTabs.find(t => t.id === activeTab)?.isLocked) {
      setActiveTab(firstAllowed.id as any);
    }
  }, [visibleTabs, activeTab]);

  const filteredCases = cases.filter(c => {
    const query = searchQuery.toLowerCase();
    const matchesSearch = 
      c.id.toLowerCase().includes(query) || 
      String(c.orderId).toLowerCase().includes(query) ||
      (c.orderNumber && c.orderNumber.toLowerCase().includes(query)) ||
      c.partName.toLowerCase().includes(query) ||
      c.customerName.toLowerCase().includes(query) ||
      c.merchantName.toLowerCase().includes(query);
    
    // Add logic for escrow/escalated
    const isEscalated = new Date(c.deadline) < new Date() && (c.status === 'AWAITING_MERCHANT' || c.status === 'OPEN');

    const matchesTab = 
      activeTab === 'all' ? true :
      activeTab === 'escrow' ? (c.status === 'AWAITING_ADMIN' || c.status === 'UNDER_REVIEW' || c.status === 'ESCALATED') :
      activeTab === 'escalated' ? (c.status === 'AWAITING_ADMIN' || c.status === 'ESCALATED') :
      activeTab === 'resolved' ? (c.status === 'RESOLVED' || c.status === 'REFUNDED' || c.status === 'CLOSED' || !!c.verdictIssuedAt) : true;

    return matchesSearch && matchesTab;
  });

  const stats = [
    { 
      label: t.admin.disputeManager.status.open, 
      value: cases.filter(c => c.status !== 'RESOLVED' && c.status !== 'REFUNDED').length,
      icon: ShieldCheck,
      color: 'cyan'
    },
    { 
      label: t.admin.disputeManager.status.awaiting_admin, 
      value: cases.filter(c => c.status === 'AWAITING_ADMIN' || c.status === 'UNDER_REVIEW').length,
      icon: Gavel,
      color: 'gold'
    }
  ];


  return (
    <div className="space-y-10 pb-20 animate-in fade-in slide-in-from-bottom-4">
      {/* 2026 NEON COMMAND HEADER */}
      <div className="relative group">
        <div className="absolute -inset-1 bg-gradient-to-r from-gold-500/20 to-cyan-500/20 rounded-[40px] blur-2xl opacity-50 group-hover:opacity-100 transition duration-1000"></div>
        <div className="relative flex flex-col md:flex-row justify-between items-start md:items-center gap-8 bg-[#0F0E0C]/80 backdrop-blur-xl p-8 md:p-12 rounded-[40px] border border-white/5">
          <motion.div
            initial={{ opacity: 0, x: isAr ? 20 : -20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <h1 className="text-4xl md:text-6xl font-black text-white mb-4 tracking-tighter">
              {t.admin.disputeManager.title}
            </h1>
            <div className="flex flex-wrap items-center gap-6 text-white/40">
               <div className="flex items-center gap-2 text-sm font-bold">
                 <div className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_10px_#22d3ee]" />
                 {cases.length} {t.admin.disputeManager.recordedCases}
               </div>
               <div className="flex items-center gap-2 text-sm font-bold">
                 <div className="w-2 h-2 rounded-full bg-gold-400 shadow-[0_0_10px_#fbbf24]" />
                 {cases.filter(c => c.status === 'AWAITING_ADMIN').length} {t.admin.disputeManager.status.awaiting_admin}
               </div>
            </div>
          </motion.div>

          <div className="flex flex-col sm:flex-row items-center gap-4 w-full md:w-auto">
            <div className="relative w-full sm:w-80 group">
              <div className="absolute inset-0 bg-gold-500/5 rounded-2xl blur group-focus-within:bg-gold-500/10 transition-all" />
              <Search size={20} className={`absolute top-1/2 -translate-y-1/2 ${isAr ? 'right-5' : 'left-5'} text-white/40`} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t.admin.disputeManager.searchPlaceholder}
                className={`relative w-full bg-[#0A0A0A] border border-white/10 rounded-2xl ${isAr ? 'pr-14 pl-5' : 'pl-14 pr-5'} py-4 text-sm text-white focus:border-gold-500/50 outline-none transition-all duration-500 shadow-2xl`}
              />
            </div>
          </div>
        </div>
      </div>

      {/* STRATEGIC TABS & KPI COMPACT */}
      <div className="flex flex-col md:flex-row justify-between items-end gap-6" dir={isAr ? 'rtl' : 'ltr'}>
        <div className="flex items-center gap-2 p-2 bg-white/5 rounded-2xl border border-white/5 backdrop-blur-md overflow-x-auto no-scrollbar max-w-full">
          {visibleTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-8 py-3 rounded-xl text-[10px] font-black tracking-widest uppercase transition-all duration-500 whitespace-nowrap flex items-center gap-2
                ${activeTab === tab.id
                  ? 'bg-gold-500 text-black shadow-[0_0_40px_rgba(212,175,55,0.3)] scale-105'
                  : 'text-white/40 hover:text-white hover:bg-white/5'}
                ${tab.isLocked ? 'opacity-70' : ''}`}
            >
              <tab.icon size={14} />
              {tab.label}
              {tab.isLocked && <Lock size={12} className={activeTab === tab.id ? 'text-black/50' : 'text-gold-500/50'} />}
            </button>
          ))}
        </div>
      </div>

      <BlurredSection
        isBlurred={visibleTabs.find(t => t.id === activeTab)?.isLocked}
        titleAr={`تبويب ${visibleTabs.find(t => t.id === activeTab)?.label} محمي`}
        titleEn={`${visibleTabs.find(t => t.id === activeTab)?.label} Tab Protected`}
        descriptionAr="لا تملك صلاحية الوصول لهذا التبويب. يرجى التواصل مع الإدارة العليا لتوسيع نطاق وصولك."
        descriptionEn="You do not have permission to access this tab. Please contact senior management to expand your access scope."
      >

      {/* LUXURY INVESTIGATION GRID */}
      <AnimatePresence mode="popLayout">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8" dir={isAr ? 'rtl' : 'ltr'}>
          {isLoading ? (
            Array(6).fill(0).map((_, i) => (
              <div key={i} className="h-[400px] bg-white/5 rounded-[40px] animate-pulse border border-white/5" />
            ))
          ) : filteredCases.length === 0 ? (
            <div className="col-span-full py-40 text-center">
              <div className="w-24 h-24 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6 border border-white/10">
                <History className="text-white/20" size={40} />
              </div>
              <h3 className="text-xl font-black text-white/20 uppercase tracking-widest">{t.admin.disputeManager.verdictTerminal.noActiveDisputes}</h3>
            </div>
          ) : (
            filteredCases.map((item, idx) => {
              return (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  onClick={() => onNavigate?.('admin-dispute-details', item.id)}
                  className="group relative block"
                >
                  <div className="absolute -inset-0.5 rounded-[40px] opacity-0 group-hover:opacity-100 transition duration-500 bg-gradient-to-r from-gold-500/40 to-cyan-500/40 blur-md" />
                  
                  <GlassCard className="relative h-full p-8 border-white/10 group-hover:border-transparent transition-all duration-500 overflow-hidden rounded-[40px]">
                    {/* Background accent */}
                    <div className={`absolute -right-10 -top-10 w-40 h-40 blur-[80px] rounded-full transition-all duration-700
                      ${item.type === 'dispute' ? 'bg-red-500/20 group-hover:bg-red-500/30' : 'bg-cyan-500/20 group-hover:bg-cyan-500/30'}`} />

                    {/* Card Header: Type & ID */}
                    <div className="flex justify-between items-start mb-8 relative z-10">
                      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center border transition-all duration-700
                        ${item.type === 'dispute' ? 'bg-red-500/10 border-red-500/20 text-red-500' : 'bg-cyan-500/10 border-cyan-500/20 text-cyan-500'}
                        group-hover:rotate-[15deg] group-hover:scale-110 shadow-2xl shadow-black`}>
                        {item.type === 'dispute' ? <Scale size={24} /> : <RotateCcw size={24} />}
                      </div>
                      <div className={isAr ? 'text-right flex flex-col items-end gap-2' : 'text-right flex flex-col items-end gap-2'}>
                        {/* 2026 LUXURY STATUS: Case Closed Badge (Integrated into Flow) */}
                        {item.verdictIssuedAt && (
                          <div className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-[0.2em] shadow-[0_0_15px_rgba(16,185,129,0.15)] backdrop-blur-md flex items-center gap-1.5 self-end mb-1">
                            <CheckCircle2 size={10} className="animate-pulse" />
                            {t.admin.disputeManager.caseClosed}
                          </div>
                        )}
                        
                        <span 
                           className={`px-3 py-1 flex items-center justify-center text-[9px] uppercase font-black tracking-widest border-none shadow-lg rounded-xl
                              ${(item.type || '').toLowerCase() === 'dispute' 
                                 ? 'bg-red-500/20 text-red-500 shadow-red-500/20' 
                                 : 'bg-cyan-500/20 text-cyan-400 shadow-cyan-500/20'}`}
                        >
                           {(t.admin.disputeManager.types as any)[(item.type || '').toLowerCase()] || item.type}
                        </span>
                        <div className="flex flex-col items-end">
                           <div className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em] mb-1">{t.admin.ordersTable.id}</div>
                           <div className="text-sm font-mono text-gold-500 font-bold">#{item.orderNumber || String(item.orderId).substring(0, 8)}</div>
                        </div>
                      </div>
                    </div>

                    {/* Main Info */}
                    <div className="space-y-4 relative z-10">
                      <h3 className="text-2xl font-black text-white group-hover:text-gold-400 transition-colors line-clamp-1 uppercase tracking-tight">
                        {item.partName}
                      </h3>
                      
                      <div className="flex flex-col gap-3">
                          <div className="flex items-center gap-3 p-3 bg-white/5 rounded-2xl border border-white/5 group-hover:border-gold-500/30 transition-all">
                             <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center border border-white/10 overflow-hidden">
                                {item.merchantLogo ? (
                                   <img src={item.merchantLogo} alt="Logo" className="w-full h-full object-cover" />
                                ) : (
                                   <Store size={18} className="text-gold-400" />
                                )}
                             </div>
                             <div className={isAr ? 'text-right' : ''}>
                                <div className="text-[9px] font-black text-white/20 uppercase tracking-widest">{t.admin.ordersTable.merchant}</div>
                                <div className="text-xs font-black text-white group-hover:text-gold-400 transition-colors truncate max-w-[150px]">
                                   {item.merchantName && item.merchantName !== 'Store' ? item.merchantName : (isAr ? 'متجر معتمد' : 'Verified Store')}
                                </div>
                             </div>
                          </div>
                          <div className="flex items-center gap-3 p-3 bg-white/5 rounded-2xl border border-white/5 group-hover:border-cyan-500/30 transition-all">
                             <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center border border-white/10 overflow-hidden">
                                {item.customerAvatar ? (
                                   <img src={item.customerAvatar} alt="Avatar" className="w-full h-full object-cover" />
                                ) : (
                                   <Users size={18} className="text-cyan-400" />
                                )}
                             </div>
                             <div className={isAr ? 'text-right' : ''}>
                                <div className="text-[9px] font-black text-white/20 uppercase tracking-widest">{t.admin.ordersTable.customer}</div>
                                <div className="text-xs font-black text-white truncate max-w-[150px]">{item.customerName}</div>
                             </div>
                          </div>
                      </div>
                    </div>

                    {/* Visual Divider */}
                    <div className="my-6 border-t border-white/5 relative z-10" />

                    {/* Footer: SLA & Status / Final Verdict */}
                    <div className="flex items-center justify-between relative z-10">
                      <div className="flex flex-col gap-1">
                        {item.verdictIssuedAt ? (
                          <div className="flex items-center gap-2">
                             <div className={`px-4 py-1.5 rounded-xl border-none shadow-2xl flex items-center gap-2
                                ${item.adminApproval === 'APPROVED' ? 'bg-green-500/20 text-green-500 shadow-green-500/20' : 'bg-red-500/20 text-red-500 shadow-red-500/20'}`}>
                                <ShieldCheck size={12} />
                                <span className="text-[10px] font-black uppercase tracking-widest">
                                   {item.adminApproval === 'APPROVED' 
                                      ? (isAr ? 'تمت الموافقة' : 'VERDICT: REFUND') 
                                      : (isAr ? 'تم الرفض' : 'VERDICT: DENIED')}
                                </span>
                             </div>
                          </div>
                        ) : (
                          <EscalationTimer deadline={item.deadline} language={language} />
                        )}
                      </div>

                      <div className="flex flex-col items-end gap-2">
                        <motion.div 
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          className={`p-3 rounded-2xl text-black shadow-lg border transition-all
                             ${item.verdictIssuedAt ? 'bg-white/10 text-white/40 border-white/10' : 'bg-gold-500 text-black border-gold-400/50 shadow-gold-500/20'}`}
                        >
                          <ArrowIcon size={18} strokeWidth={3} />
                        </motion.div>
                      </div>
                    </div>
                  </GlassCard>
                </motion.div>
              );
            })
          )}
        </div>
      </AnimatePresence>
      </BlurredSection>

      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
};
