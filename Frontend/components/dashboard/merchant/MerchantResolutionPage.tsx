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
  Loader2
} from 'lucide-react';
import { GlassCard } from '../../ui/GlassCard';
import { useResolutionStore } from '../../../stores/useResolutionStore';
import { useLanguage } from '../../../contexts/LanguageContext';
import { Badge } from '../../ui/Badge';
import { getCurrentUserId } from '../../../utils/auth';
import { MerchantShippingPayAlert } from './MerchantShippingPayAlert';
import { useShippingPaymentReturn } from '../../../utils/useShippingPaymentReturn';

interface MerchantResolutionPageProps {
  onNavigate?: (path: string, id?: any) => void;
}

const CaseCountdown = ({ deadline }: { deadline: string }) => {
  const [timeLeft, setTimeLeft] = useState<{h: number, m: number} | null>(null);

  useEffect(() => {
    const calc = () => {
      const diff = new Date(deadline).getTime() - new Date().getTime();
      if (diff <= 0) return { h: 0, m: 0 };
      return {
        h: Math.floor(diff / (1000 * 60 * 60)),
        m: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
      };
    };
    setTimeLeft(calc());
    const interval = setInterval(() => setTimeLeft(calc()), 60000);
    return () => clearInterval(interval);
  }, [deadline]);

  if (!timeLeft) return null;

  return (
    <div className="flex items-center gap-1 font-mono">
      <span className="bg-red-500/10 px-1 rounded">{timeLeft.h}h</span>
      <span>:</span>
      <span className="bg-red-500/10 px-1 rounded">{timeLeft.m}m</span>
    </div>
  );
};

export const MerchantResolutionPage: React.FC<MerchantResolutionPageProps> = ({ onNavigate }) => {
  const { 
    cases, 
    isLoading, 
    fetchMerchantCases, 
    subscribeToCases, 
    unsubscribeFromCases 
  } = useResolutionStore();
  
  const { t, language } = useLanguage();
  const isAr = language === 'ar';
  const ArrowIcon = isAr ? ChevronLeft : ChevronRight;

  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'needsAction' | 'returns' | 'disputes' | 'resolved'>('all');

  useEffect(() => {
    const userId = getCurrentUserId();
    if (userId) {
      fetchMerchantCases();
      subscribeToCases('merchant');
    }

    return () => {
      unsubscribeFromCases();
    };
  }, []);

  useShippingPaymentReturn(true, 'merchant', onNavigate);

  // Logic: Filter cases based on merchant role (here we assume cases are already filtered by store at store level, 
  // but we can add secondary filters)
  const filteredCases = cases.filter(c => {
    const matchesSearch = c.id.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         String(c.orderId).toLowerCase().includes(searchQuery.toLowerCase()) ||
                         c.partName.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesTab = 
      activeTab === 'all' ? true :
      activeTab === 'needsAction' ? (c.status === 'AWAITING_MERCHANT' || c.status === 'OPEN') :
      activeTab === 'returns' ? c.type === 'return' :
      activeTab === 'disputes' ? c.type === 'dispute' :
      activeTab === 'resolved' ? (c.status === 'RESOLVED' || c.status === 'CLOSED') : true;

    return matchesSearch && matchesTab;
  });

  const stats = [
    { 
      label: t.dashboard.merchant.resolution.activeCases, 
      value: cases.filter(c => c.status !== 'RESOLVED' && c.status !== 'CLOSED').length,
      icon: Scale,
      color: 'gold'
    },
    { 
      label: t.dashboard.merchant.resolution.pendingMyResponse, 
      value: cases.filter(c => c.status === 'AWAITING_MERCHANT' || c.status === 'OPEN').length,
      icon: Clock,
      color: 'red'
    },
    { 
      label: t.dashboard.merchant.resolution.totalResolved, 
      value: cases.filter(c => c.status === 'RESOLVED').length,
      icon: CheckCircle2,
      color: 'green'
    }
  ];

  const handleCaseClick = (caseId: string) => {
    if (onNavigate) {
      onNavigate('dispute-details', caseId);
    }
  };

  return (
    <div className="space-y-8 pb-12">
      <MerchantShippingPayAlert cases={cases} onNavigate={onNavigate!} />
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <motion.div 
          initial={{ opacity: 0, x: isAr ? 20 : -20 }}
          animate={{ opacity: 1, x: 0 }}
        >
          <h1 className="text-3xl md:text-4xl font-black text-white mb-2 flex items-center gap-4">
            <div className="w-12 h-12 bg-gold-500/10 rounded-2xl flex items-center justify-center border border-gold-500/20">
              <Scale className="text-gold-400" size={28} />
            </div>
            {t.dashboard.merchant.resolution.title}
          </h1>
          <p className="text-white/40 text-sm md:text-base max-w-xl">
            {t.dashboard.merchant.resolution.subtitle}
          </p>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex items-center gap-3 bg-white/5 p-2 rounded-2xl border border-white/10"
        >
          <div className="relative">
            <Search size={18} className={`absolute top-1/2 -translate-y-1/2 ${isAr ? 'right-4' : 'left-4'} text-white/30`} />
            <input 
              type="text" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t.dashboard.merchant.resolution.search}
              className={`bg-[#0F0E0C] border border-white/5 rounded-xl ${isAr ? 'pr-12 pl-4' : 'pl-12 pr-4'} py-3 text-sm text-white focus:border-gold-500/50 outline-none w-full md:w-64 transition-all duration-300`}
            />
          </div>
          <button className="p-3 bg-gold-500/10 text-gold-400 rounded-xl border border-gold-500/20 hover:bg-gold-500/20 transition-all">
            <Filter size={20} />
          </button>
        </motion.div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {stats.map((stat, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
          >
            <GlassCard className="p-6 relative group overflow-hidden">
              <div className={`absolute top-0 right-0 w-32 h-32 bg-${stat.color === 'gold' ? 'gold' : stat.color === 'red' ? 'red' : 'green'}-500/5 blur-[60px] rounded-full -mr-10 -mt-10 group-hover:bg-opacity-10 transition-all duration-500`} />
              <div className="flex items-center justify-between mb-4 relative z-10">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center 
                  ${stat.color === 'gold' ? 'bg-gold-500/10 text-gold-400 border-gold-500/20' : 
                    stat.color === 'red' ? 'bg-red-500/10 text-red-400 border-red-500/20' : 
                    'bg-green-500/10 text-green-400 border-green-500/20'} border`}>
                  <stat.icon size={22} />
                </div>
                <div className="text-right">
                  <span className="text-2xl font-black text-white">{stat.value}</span>
                </div>
              </div>
              <div className="text-white/40 text-[10px] font-black uppercase tracking-widest relative z-10">
                {stat.label}
              </div>
            </GlassCard>
          </motion.div>
        ))}
      </div>

      {/* Main Content Area */}
      <GlassCard className="p-0 border-white/5 overflow-hidden">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-1 p-2 bg-white/5 border-b border-white/5 overflow-x-auto no-scrollbar">
          {(['all', 'needsAction', 'returns', 'disputes', 'resolved'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-3 rounded-xl text-sm font-bold transition-all duration-300 whitespace-nowrap
                ${activeTab === tab 
                  ? 'bg-gold-500 text-black shadow-[0_0_20px_rgba(212,175,55,0.3)]' 
                  : 'text-white/40 hover:text-white hover:bg-white/5'}`}
            >
              {t.dashboard.merchant.resolution.tabs[tab]}
              {cases.filter(c => {
                if (tab === 'all') return true;
                if (tab === 'needsAction') return (c.status === 'AWAITING_MERCHANT' || c.status === 'OPEN');
                if (tab === 'returns') return c.type === 'return';
                if (tab === 'disputes') return c.type === 'dispute';
                if (tab === 'resolved') return (c.status === 'RESOLVED' || c.status === 'CLOSED');
                return true;
              }).length > 0 && tab !== 'all' && (
                <span className={`ml-2 px-1.5 py-0.5 rounded-md text-[10px] 
                  ${activeTab === tab ? 'bg-black/20 text-black' : 'bg-white/10 text-white/40'}`}>
                  {cases.filter(c => {
                    if (tab === 'needsAction') return (c.status === 'AWAITING_MERCHANT' || c.status === 'OPEN');
                    if (tab === 'returns') return c.type === 'return';
                    if (tab === 'disputes') return c.type === 'dispute';
                    if (tab === 'resolved') return (c.status === 'RESOLVED' || c.status === 'CLOSED');
                    return true;
                  }).length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* List Content */}
        <div className="divide-y divide-white/5 min-h-[400px] relative">
          <AnimatePresence mode="popLayout">
            {isLoading ? (
              <motion.div 
                key="loader"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 flex items-center justify-center bg-[#0F0E0C]/50 backdrop-blur-sm z-20"
              >
                <div className="flex flex-col items-center gap-4">
                  <div className="relative">
                    <Loader2 className="animate-spin text-gold-500" size={48} />
                    <div className="absolute inset-0 blur-lg bg-gold-500/20 animate-pulse rounded-full" />
                  </div>
                  <span className="text-white/40 text-xs font-black uppercase tracking-widest">{t.dashboard.merchant.resolution.loading || 'Loading Cases...'}</span>
                </div>
              </motion.div>
            ) : filteredCases.length === 0 ? (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="py-32 flex flex-col items-center justify-center text-center px-4"
              >
                <div className="w-24 h-24 bg-white/5 rounded-full flex items-center justify-center mb-6">
                  <Scale size={48} className="text-white/10" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">{t.dashboard.merchant.resolution.noCases}</h3>
                <p className="text-white/30 text-sm max-w-sm">
                  {t.dashboard.merchant.resolution.subtitle}
                </p>
              </motion.div>
            ) : (
              filteredCases.map((item, idx) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  onClick={() => handleCaseClick(item.id)}
                  className="p-6 md:p-8 hover:bg-white/[0.02] active:bg-white/[0.04] transition-all cursor-pointer group relative flex flex-col md:flex-row justify-between items-start md:items-center gap-6"
                >
                  {/* Left Side: Type Icon + ID + Title */}
                  <div className="flex items-start gap-6">
                    <div className={`mt-1 w-14 h-14 rounded-2xl flex items-center justify-center border transition-transform duration-500 group-hover:scale-110 
                      ${item.type === 'dispute' 
                        ? 'bg-red-500/10 border-red-500/20 text-red-500' 
                        : 'bg-cyan-500/10 border-cyan-500/20 text-cyan-500'}`}>
                      {item.type === 'dispute' ? <Scale size={24} /> : <RotateCcw size={24} />}
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-[10px] font-black tracking-widest text-gold-500/60 uppercase">
                          {item.type === 'dispute' ? (isAr ? 'نزاع' : 'DISPUTE') : (isAr ? 'مرتجع' : 'RETURN')} #{item.id.split('-')[0]}
                        </span>
                        <div className="w-1 h-1 rounded-full bg-white/20" />
                        <span className="text-[10px] font-bold text-white/40">
                          {new Intl.DateTimeFormat(isAr ? 'ar-EG' : 'en-US', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                            calendar: 'gregory'
                          }).format(new Date(item.createdAt))}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="text-lg md:text-xl font-bold text-white group-hover:text-gold-400 transition-colors">
                          {item.partName}
                        </h4>
                        <span className="text-[10px] px-2 py-0.5 rounded-md bg-red-500/10 text-red-400 border border-red-500/10 font-bold uppercase">
                          {isAr ? (t.dashboard.merchant.resolution.reasons[item.reason.toLowerCase()] || item.reason) : item.reason}
                        </span>
                      </div>

                      <div className="flex items-center gap-4 text-xs font-medium">
                        <div className="flex items-center gap-1.5 text-white/40">
                          <AlertCircle size={14} />
                          <span>{isAr ? 'طلب رقم' : 'Order #'} {item.orderNumber}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-white/40">
                          <MessageSquare size={14} />
                          <span>{isAr ? 'كود العميل' : 'Customer Code'}: {item.customerId.split('-')[0]}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right Side: Status + Action */}
                  <div className="flex flex-col md:items-end gap-3 w-full md:w-auto">
                    <div className="flex items-center gap-3">
                       {/* Status Badge */}
                        <div className={`px-4 py-1.5 rounded-full text-[10px] font-black tracking-widest uppercase border 
                        ${item.status === 'RESOLVED' || item.status === 'CLOSED'
                          ? 'bg-green-500 text-white border-green-500/20' 
                          : item.status === 'AWAITING_MERCHANT' || item.status === 'OPEN'
                            ? 'bg-red-500 text-white border-red-500/50 shadow-[0_0_15px_rgba(239,68,68,0.3)]'
                            : 'bg-white/10 text-white border-white/10'}`}>
                        {isAr ? (t.dashboard.merchant.resolution.statusTimeline[item.status.toLowerCase()] || item.status) : item.status}
                      </div>

                      {/* Action Required Label */}
                      {(item.status === 'AWAITING_MERCHANT' || item.status === 'OPEN') && (
                        <div className="flex items-center gap-2 text-[10px] font-black uppercase text-white bg-gold-500/90 px-3 py-1.5 rounded-full shadow-lg shadow-gold-500/20">
                          <Clock size={12} className="animate-spin-slow" />
                          <span>{t.dashboard.merchant.resolution.actionRequired || (isAr ? 'مطلوب إجراء' : 'Action Required')}</span>
                        </div>
                      )}
                    </div>

                    {/* Deadline Countdown */}
                    {(item.status === 'AWAITING_MERCHANT' || item.status === 'OPEN') && (
                      <div className="text-[10px] font-bold text-red-400/80 flex items-center gap-2">
                        <span>{t.dashboard.merchant.resolution.deadlineLeft}: </span>
                        <CaseCountdown deadline={item.deadline} />
                      </div>
                    )}

                    {/* Desktop Hover Action button */}
                    <div className="hidden md:flex items-center gap-2 translate-x-4 opacity-0 group-hover:translate-x-0 group-hover:opacity-100 transition-all duration-300">
                      <span className="text-xs font-bold text-gold-400 uppercase tracking-tighter">
                        {item.status === 'AWAITING_MERCHANT' || item.status === 'OPEN' ? t.dashboard.merchant.resolution.respondNow : t.dashboard.merchant.merchantSettings.viewDetails}
                      </span>
                      <ArrowUpRight size={18} className="text-gold-500" />
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </AnimatePresence>
        </div>
      </GlassCard>

      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin-slow {
          animation: spin-slow 8s linear infinite;
        }
      `}</style>
    </div>
  );
};
