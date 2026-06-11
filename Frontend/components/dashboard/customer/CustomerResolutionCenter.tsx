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
  Package,
  ShieldCheck,
  History,
  X,
  Plus,
  ShieldAlert,
  Wallet,
  Zap,
  Activity,
  ArrowRight,
  ChevronDown
} from 'lucide-react';
import { GlassCard } from '../../ui/GlassCard';
import { useResolutionStore, ResolutionCase } from '../../../stores/useResolutionStore';
import { useLanguage } from '../../../contexts/LanguageContext';
import { Badge } from '../../ui/Badge';
import { Button } from '../../ui/Button';
import { useOrderStore, Order } from '../../../stores/useOrderStore';
import { OrderSelectionModal } from './OrderSelectionModal';
import { ReturnRequestModal } from '../resolution/ReturnRequestModal';
import { DisputeModal } from '../resolution/DisputeModal';
import { POST_DELIVERY_RETURN_DISPUTE_HOURS } from '../../../utils/orderSla';
import { ordersApi } from '../../../services/api/orders';

interface EligibleDeliveredItem {
  orderId: string;
  orderPartId: string;
  partName: string;
  merchantName: string;
  orderNumber?: string;
  returnExpiryDate?: string;
}

interface CustomerResolutionCenterProps {
  onNavigate?: (path: string, id?: any) => void;
}

export const CustomerResolutionCenter: React.FC<CustomerResolutionCenterProps> = ({ onNavigate }) => {
  const { 
    cases, 
    isLoading: isResLoading, 
    fetchUserRequests, 
    subscribeToCases, 
    unsubscribeFromCases,
    escalateCase 
  } = useResolutionStore();

  const { orders, isLoading: isOrdersLoading } = useOrderStore();
  const isLoading = isResLoading || isOrdersLoading;

  const { t, language } = useLanguage();
  const isAr = language === 'ar';
  const ArrowIcon = isAr ? ChevronLeft : ChevronRight;

  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'returns' | 'disputes'>('returns');

  // Modal States
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);
  const [isDisputeModalOpen, setIsDisputeModalOpen] = useState(false);
  const [isEscalateConfirmOpen, setIsEscalateConfirmOpen] = useState(false);
  const [caseToEscalate, setCaseToEscalate] = useState<string | null>(null);
  const [selectedDeliveredItem, setSelectedDeliveredItem] = useState<EligibleDeliveredItem | null>(null);
  const [eligibleItems, setEligibleItems] = useState<EligibleDeliveredItem[]>([]);
  const [loadingEligible, setLoadingEligible] = useState(false);
  const [selectionMode, setSelectionMode] = useState<'return' | 'dispute'>('return');

  useEffect(() => {
    (window as any).currentViewRole = 'customer';
    fetchUserRequests();
    subscribeToCases('customer');

    setLoadingEligible(true);
    ordersApi
      .getDeliveredOrders()
      .then((items: any[]) => {
        setEligibleItems(
          (items || [])
            .filter((item) => item.isReturnEligible === true && item.orderPartId)
            .map((item) => ({
              orderId: item.id,
              orderPartId: item.orderPartId,
              partName: item.name,
              merchantName: item.storeName || 'Store',
              orderNumber: item.orderNumber,
              returnExpiryDate: item.returnExpiryDate,
            })),
        );
      })
      .catch(() => setEligibleItems([]))
      .finally(() => setLoadingEligible(false));

    return () => {
      unsubscribeFromCases();
    };
  }, []);

  const filteredCases = cases.filter(c => {
    const matchesSearch = c.id.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         String(c.orderId).toLowerCase().includes(searchQuery.toLowerCase()) ||
                         c.partName.toLowerCase().includes(searchQuery.toLowerCase());
    
    // Tab logic: filter by case type
    const matchesTab = activeTab === 'returns' ? c.type === 'return' : c.type === 'dispute';

    return matchesSearch && matchesTab;
  });

  const handleCaseClick = (caseId: string) => {
    if (onNavigate) {
      onNavigate('dispute-details', caseId);
    }
  };

  const handleSelectOrder = (order: Order, type: 'return' | 'dispute', partId?: string) => {
    setSelectedDeliveredItem({
      orderId: order.id,
      orderPartId: partId || order.parts?.[0]?.id || '',
      partName: order.part,
      merchantName: order.merchantName || 'Store',
      orderNumber: order.orderNumber,
    });
    setIsOrderModalOpen(false);
    if (type === 'return') {
      setIsReturnModalOpen(true);
    } else {
      setIsDisputeModalOpen(true);
    }
  };

  const stats = [
    {
      title: (t as any).dashboard.resolution.stats.activeDisputes,
      value: cases.filter(c => c.type === 'dispute' && c.status !== 'RESOLVED' && c.status !== 'REFUNDED').length,
      icon: ShieldAlert,
      color: 'red',
      trend: (t as any).dashboard.resolution.stats.verifiedEscrow
    },
    {
      title: (t as any).dashboard.resolution.stats.protectedFunds,
      value: `$${(cases.filter(c => c.status !== 'RESOLVED' && c.status !== 'REFUNDED')
        .reduce((acc, curr) => {
          const order = orders.find(o => String(o.id) === String(curr.orderId));
          const amount = (order as any)?.totalAmount || (order as any)?.price || 0;
          return acc + amount;
        }, 0)).toLocaleString()}`,
      icon: Wallet,
      color: 'gold',
      trend: (t as any).dashboard.resolution.stats.safeVault
    },
    {
      title: (t as any).dashboard.resolution.stats.eligibleOrders,
      value: eligibleItems.length,
      icon: Zap,
      color: 'cyan',
      trend: (t as any).dashboard.resolution.stats.readyAction
    }
  ];

  const getStatusColor = (status: string) => {
    const s = status.toLowerCase();
    if (s.includes('refund') || s.includes('resolve') || s.includes('complete')) return 'text-green-400 bg-green-500/10 border-green-500/20';
    if (s.includes('reject') || s.includes('cancel')) return 'text-red-400 bg-red-500/10 border-red-500/20';
    if (s.includes('waiting') || s.includes('pending')) return 'text-gold-400 bg-gold-500/10 border-gold-500/20';
    return 'text-blue-400 bg-blue-500/10 border-blue-500/20';
  };

  const getProgressWidth = (status: string) => {
    const s = status.toLowerCase();
    if (s.includes('refund') || s.includes('resolve')) return '100%';
    if (s.includes('ship') || s.includes('handover')) return '75%';
    if (s.includes('approve')) return '50%';
    return '25%';
  };

  return (
    <div className="space-y-8 pb-32 animate-in fade-in slide-in-from-bottom-4 duration-700">
      
      {/* 2026 Luxury Hero Section */}
      <div className="relative overflow-hidden rounded-[40px] bg-gradient-to-br from-[#141210] to-[#0A0908] border border-white/5 shadow-2xl p-8 md:p-12">
        {/* Cinematic Orbs - Precision Placed */}
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-gold-500/10 blur-[150px] rounded-full -mr-64 -mt-64 pointer-events-none opacity-60" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-amber-600/5 blur-[120px] rounded-full -ml-32 -mb-32 pointer-events-none opacity-40" />
        
        <div className="relative z-10">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-12">
            
            <div className="space-y-8 flex-1">
              <div className="flex items-center gap-4">
                {/* Protocol badges removed as per user request */}
              </div>

              <div className="space-y-4">
                <h1 className="text-4xl md:text-6xl font-black text-white uppercase leading-tight mb-2">
                  {t.dashboard.resolution.subtitle}
                </h1>
                <div className="h-1 w-16 bg-gradient-to-r from-gold-500 to-transparent rounded-full" />
              </div>
              
              <p className="text-white/50 text-xs md:text-sm max-w-xl font-bold uppercase leading-relaxed">
                {isAr 
                  ? 'منصة حماية المستهلك المتقدمة. إدارة طلبات الإرجاع وفض النزاعات بشفافية مطلقة وأمان عالي تحت نظام تشاليح الإمارات.'
                  : 'Advanced consumer protection platform. Manage returns and disputes with transparency and high security under UAE Auto Parts.'}
              </p>
            </div>

            {/* Quick Stats Grid - Redesigned as Compact Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-1 gap-4 w-full lg:w-80">
              {stats.map((stat, i) => (
                <GlassCard key={i} className="p-5 bg-white/[0.03] border-white/5 hover:border-gold-500/30 transition-all duration-500 group relative overflow-hidden">
                  <div className={`absolute -right-6 -top-6 w-24 h-24 bg-${stat.color === 'red' ? 'red' : stat.color === 'cyan' ? 'blue' : 'gold'}-500/10 blur-2xl rounded-full group-hover:opacity-100 opacity-0 transition-all duration-700`} />
                  
                  <div className="flex items-center gap-5 relative z-10">
                    <div className={`w-12 h-12 rounded-[20px] flex items-center justify-center border transition-transform duration-500 group-hover:scale-110 ${
                      stat.color === 'red' ? 'bg-red-500/10 text-red-500 border-red-500/20' : 
                      stat.color === 'cyan' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' : 
                      'bg-gold-500/10 text-gold-500 border-gold-500/20'
                    }`}>
                      <stat.icon size={22} strokeWidth={2.5} />
                    </div>
                    <div>
                      <div className="text-[8px] font-black text-white/30 uppercase mb-1">{stat.title}</div>
                      <div className="text-xl font-black text-white tabular-nums tracking-tight flex items-baseline gap-1">
                        {stat.value}
                        {stat.color === 'gold' && <span className="text-[9px] text-white/20 font-mono">AED</span>}
                      </div>
                    </div>
                  </div>
                </GlassCard>
              ))}
            </div>

          </div>
        </div>
      </div>

      {/* 2026 Strategic Control Hub (Tabs) */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-6 px-1">
        <div className="flex items-center gap-4 p-2 bg-white/[0.03] border border-white/5 rounded-[24px] w-full md:w-auto backdrop-blur-xl">
          <button
            onClick={() => setActiveTab('returns')}
            className={`flex-1 md:flex-none flex items-center justify-center gap-3 px-12 py-5 rounded-[20px] text-[12px] font-black uppercase transition-all duration-500
              ${activeTab === 'returns' ? 'bg-gold-500 text-[#0F0E0D] shadow-lg shadow-gold-500/20' : 'text-white/30 hover:text-white hover:bg-white/5'}`}
          >
            <RotateCcw size={18} strokeWidth={2.5} />
            {isAr ? 'المرتجعات' : 'Returns'}
          </button>
          <button
            onClick={() => setActiveTab('disputes')}
            className={`flex-1 md:flex-none flex items-center justify-center gap-3 px-12 py-5 rounded-[20px] text-[12px] font-black uppercase transition-all duration-500
              ${activeTab === 'disputes' ? 'bg-red-500 text-white shadow-lg shadow-red-500/20' : 'text-white/30 hover:text-white hover:bg-white/5'}`}
          >
            <Scale size={18} strokeWidth={2.5} />
            {isAr ? 'النزاعات الرسمية' : 'Official Disputes'}
          </button>
        </div>

        <div className="hidden md:flex items-center gap-3 px-5 py-2.5">
           {/* Protocol removed as per user request */}
        </div>
      </div>

      {/* 2026 Quick Action Zone (Functional/Incentive) */}
      <AnimatePresence>
        {eligibleItems.length > 0 && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="flex flex-col gap-8 mb-12 p-8 bg-gradient-to-r from-gold-500/10 via-transparent to-transparent rounded-[32px] border border-gold-500/10 relative overflow-hidden">
               {/* Decorative Background Pulsing Glow */}
               <div className="absolute left-0 top-0 w-1/3 h-full bg-gold-500/5 blur-[80px] rounded-full animate-pulse" />
               
               <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 relative z-10">
                 <div>
                    <h2 className="text-xl md:text-2xl font-black text-white uppercase leading-none mb-1">
                       {t.dashboard.resolution.quickActions.title}
                    </h2>
                    <p className="text-[9px] font-black text-gold-500/40 uppercase">
                       {t.dashboard.resolution.quickActions.subtitle}
                    </p>
                 </div>
                 <div className="h-0.5 flex-1 bg-white/5 mx-8 mb-4 hidden lg:block" />
                 <div className="px-4 py-2">
                   {/* Auto-refresh indicator removed */}
                 </div>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {eligibleItems.slice(0, 3).map((item) => (
                    <GlassCard key={`${item.orderId}-${item.orderPartId}`} className="p-7 bg-[#0C0B0A] border-white/5 hover:border-gold-500/30 transition-all duration-700 group relative overflow-hidden shadow-2xl">
                      <div className="absolute -right-10 -top-10 w-32 h-32 bg-gold-500/5 blur-3xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
                      
                      <div className="relative z-10">
                        <div className="flex items-start justify-between mb-6">
                          <div className="w-14 h-14 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center justify-center text-white/20 group-hover:text-gold-500 group-hover:bg-gold-500/10 transition-all duration-500">
                            <Package size={28} strokeWidth={1.5} />
                          </div>
                          <div className="flex flex-col items-end">
                            <span className="text-[10px] font-black text-gold-500/80 uppercase tracking-[0.2em] mb-1.5 flex items-center gap-1.5">
                              <div className="w-1 h-1 rounded-full bg-gold-500" />
                              #{item.orderNumber || item.orderId.slice(0, 8)}
                            </span>
                            <div className="px-2.5 py-1 bg-green-500/10 text-green-400 text-[8px] font-black rounded-lg border border-green-500/20 uppercase tracking-widest shadow-lg shadow-green-500/5">
                              {isAr ? 'مؤهل' : 'Eligible'}
                            </div>
                          </div>
                        </div>

                        <h4 className="text-xl font-black text-white mb-4 uppercase truncate tracking-tight group-hover:text-gold-400 transition-colors">
                          {item.partName}
                        </h4>

                        <div className="flex items-center gap-2.5 mb-8">
                           <Clock size={12} className="text-gold-500/50" />
                           <span className="text-[9px] font-black text-white/30 uppercase tracking-[0.2em]">
                             {isAr ? `حماية ${POST_DELIVERY_RETURN_DISPUTE_HOURS} ساعة نشطة` : `${POST_DELIVERY_RETURN_DISPUTE_HOURS}h window active`}
                           </span>
                        </div>

                        <div className="flex gap-3">
                          <button 
                            onClick={() => {
                              setSelectedDeliveredItem(item);
                              setSelectionMode('return');
                              setIsReturnModalOpen(true);
                             }}
                            className="flex-1 py-3.5 bg-white/[0.05] hover:bg-gold-500 hover:text-[#0F0E0D] text-white text-[9px] font-black uppercase tracking-[0.2em] rounded-xl transition-all duration-500 shadow-xl"
                          >
                            {isAr ? 'إرجاع' : 'Return'}
                          </button>
                          <button 
                            onClick={() => {
                              setSelectedDeliveredItem(item);
                              setSelectionMode('dispute');
                              setIsDisputeModalOpen(true);
                             }}
                            className="flex-1 py-3.5 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white border border-red-500/20 text-[9px] font-black uppercase tracking-[0.2em] rounded-xl transition-all duration-500 shadow-xl"
                          >
                            {isAr ? 'نزاع' : 'Dispute'}
                          </button>
                        </div>
                      </div>
                    </GlassCard>
                  ))}
               </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Case List Environment */}
      <div className="space-y-6 min-h-[400px]">
        {/* Internal List Filter/Search bar */}
        <div className="flex items-center justify-between gap-6 px-4">
          <div className="relative flex-1 max-w-md group">
            <Search size={18} className={`absolute top-1/2 -translate-y-1/2 ${isAr ? 'right-5' : 'left-5'} text-white/20 group-focus-within:text-gold-500 transition-colors pointer-events-none`} />
            <input 
              type="text" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={isAr ? 'بحث في الحالات...' : 'Search in cases...'}
              className={`w-full bg-white/[0.02] border border-white/5 rounded-2xl ${isAr ? 'pr-14 pl-6' : 'pl-14 pr-6'} py-4 text-xs text-white outline-none focus:border-white/10 focus:bg-white/[0.05] transition-all`}
            />
          </div>
          <div className="hidden md:flex items-center gap-2">
            {/* Showing status removed */}
          </div>
        </div>

        {/* The Card Grid */}
        <div className="grid grid-cols-1 gap-4">
          <AnimatePresence mode="popLayout">
            {isLoading ? (
              <div className="py-40 flex flex-col items-center justify-center space-y-6">
                <div className="w-16 h-16 border-2 border-white/5 border-t-gold-500 rounded-full animate-spin shadow-[0_0_30px_rgba(212,175,55,0.1)]" />
                <span className="text-[10px] font-black uppercase tracking-[0.4em] text-white/20">Accessing Vault...</span>
              </div>
            ) : filteredCases.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-32 space-y-8 bg-white/[0.01] border border-white/5 rounded-[40px] relative overflow-hidden group">
                <div className="absolute inset-0 bg-gold-500/[0.01] opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
                <div className="w-32 h-32 rounded-[40px] bg-white/[0.03] border border-white/5 flex items-center justify-center text-white/10 group-hover:text-gold-500/20 group-hover:scale-110 transition-all duration-700">
                  <History size={64} strokeWidth={1} />
                </div>
                <div className="text-center space-y-2 relative z-10">
                  <h3 className="text-2xl font-black text-white uppercase leading-none">
                    {activeTab === 'returns' ? (t.dashboard as any).returns.noReturns : (t.dashboard as any).returns.noDisputes}
                  </h3>
                  <p className="text-[9px] font-black text-white/20 uppercase">
                    {activeTab === 'returns' ? (t.dashboard as any).returns.noReturnsDesc : (t.dashboard as any).returns.noDisputesDesc}
                  </p>
                </div>
                <button 
                  onClick={() => setIsOrderModalOpen(true)}
                  className="px-10 py-4 bg-gold-500 text-[#0F0E0D] rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-2xl shadow-gold-500/20 hover:scale-105 active:scale-95 transition-all relative z-10"
                >
                  {isAr ? 'بدء طلب جديد' : 'INITIATE NEW REQUEST'}
                </button>
              </div>
            ) : (
              filteredCases.map((item, idx) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  onClick={() => handleCaseClick(item.id)}
                  className="group relative"
                >
                  {/* Premium Hover Halo */}
                  <div className="absolute -inset-1 bg-gradient-to-r from-gold-500/20 to-transparent rounded-[36px] blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-700 -z-10" />

                  <div className="bg-[#0F0E0C] border border-white/5 rounded-[24px] p-4 hover:border-gold-500/30 hover:translate-x-1.5 transition-all duration-700 cursor-pointer shadow-xl relative overflow-hidden">
                    {/* Background Texture/Shimmer */}
                    <div className="absolute top-0 right-0 w-64 h-64 bg-gold-500/[0.02] blur-[100px] rounded-full pointer-events-none" />

                    <div className="flex flex-col lg:flex-row items-center gap-6 relative z-10">
                      
                      {/* Leading info */}
                      <div className="flex items-center gap-4 flex-1 w-full lg:w-auto">
                        <div className={`w-14 h-14 rounded-[18px] flex items-center justify-center border transition-all duration-1000
                          ${item.type === 'dispute' ? 'bg-red-500/10 border-red-500/20 text-red-500' : 'bg-gold-500/10 border-gold-500/20 text-gold-500'}
                          group-hover:rotate-3 group-hover:scale-110 shrink-0`}>
                          {item.type === 'dispute' ? <Scale size={24} strokeWidth={1.5} /> : <RotateCcw size={24} strokeWidth={1.5} />}
                        </div>

                        <div className="space-y-2 flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                             <div className="px-1.5 py-0.5 bg-gold-500/10 border border-gold-500/20 rounded text-[9px] font-black text-gold-500 uppercase">
                               #{item.orderNumber}
                             </div>
                             <div className="px-1.5 py-0.5 bg-blue-500/10 border border-blue-500/20 rounded text-[10px] font-black text-blue-400 uppercase tracking-tight">
                               {item.storeCode || 'D-' + item.id.substring(0,4).toUpperCase()}
                             </div>
                            <span className="text-[7px] font-black text-white/15 uppercase font-mono px-1">
                              {new Date(item.createdAt).toLocaleDateString(isAr ? 'ar-EG' : 'en-GB')}
                            </span>
                          </div>
                          
                          <h3 className="text-base md:text-lg font-black text-white group-hover:text-gold-500 transition-colors uppercase truncate leading-tight">
                            {item.partName}
                          </h3>

                          <div className="flex items-center gap-3">
                            <div className="flex items-center gap-1.5 truncate text-[8px] font-black text-white/30 uppercase border-r border-white/5 pr-3">
                              <span className="truncate">{item.merchantName}</span>
                            </div>
                            <div className="text-[8px] font-black text-white/10 uppercase font-mono">
                              CASE: {item.id.substring(0, 8)}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Progress & Visual Status */}
                      <div className="w-full lg:w-64 space-y-3 bg-white/[0.01] p-4 rounded-[16px] border border-white/5 group-hover:border-white/10 transition-colors">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <div className="w-1.5 h-1.5 rounded-full bg-gold-500 shadow-[0_0_8px_rgba(212,175,55,0.6)] animate-pulse" />
                            <span className="text-[8px] font-black uppercase text-white/70 tracking-tighter">
                              {t.dashboard.resolution.statusTimeline?.[item.status.toLowerCase()] || item.status}
                            </span>
                          </div>
                        </div>

                        <div className="h-2 bg-black/50 rounded-full overflow-hidden border border-white/5 p-[1px]">
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: getProgressWidth(item.status) }}
                            transition={{ duration: 1.5, ease: "easeOut" }}
                            className={`h-full rounded-full relative ${item.status.includes('REFUND') || item.status.includes('RESOLVE') ? 'bg-green-500' : 'bg-gold-500 shadow-[0_0_15px_rgba(212,175,55,0.3)]'}`}
                          >
                             <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-[shine_2s_infinite]" />
                          </motion.div>
                        </div>

                        {/* Escalation Trigger */}
                        {item.status !== 'RESOLVED' && item.status !== 'REFUNDED' && item.status !== 'ESCALATED' && (
                          <button 
                            onClick={async (e) => {
                              e.stopPropagation();
                              setCaseToEscalate(item.id);
                              setIsEscalateConfirmOpen(true);
                            }}
                            className="w-full py-2 bg-red-500/10 border border-red-500/20 rounded-lg text-[9px] font-black text-red-500 uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all active:scale-95"
                          >
                            {(t as any).dashboard.resolution.actions.escalate}
                          </button>
                        )}

                        {item.status === 'ESCALATED' && (
                          <div className="w-full py-2.5 bg-gold-500/5 border border-gold-500/20 rounded-xl flex items-center justify-center gap-2">
                            <ShieldAlert size={12} className="text-gold-500" />
                            <span className="text-[9px] font-black text-gold-500 uppercase tracking-[0.2em]">
                              {(t as any).dashboard.resolution.actions.underAdminReview}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Right Pointer */}
                      <div className="hidden lg:flex items-center justify-center p-6 bg-white/[0.03] border border-white/5 rounded-[28px] text-white/5 group-hover:text-gold-500 group-hover:bg-gold-500/10 transition-all duration-500 group-hover:border-gold-500/20">
                        <ArrowIcon size={28} className="group-hover:translate-x-2 transition-transform duration-500" />
                      </div>

                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Security Vault Banner - Removed as per user request */}

      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        
        @keyframes shine {
          0% { background-position: -200% center; }
          100% { background-position: 200% center; }
        }

        .premium-text-glow {
          text-shadow: 0 0 30px rgba(212, 175, 55, 0.2);
        }

        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: rgba(255,255,255,0.02); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(212, 175, 55, 0.3); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(212, 175, 55, 0.5); }

        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(212, 175, 55, 0.1); border-radius: 10px; }
        ::-webkit-scrollbar-thumb:hover { background: rgba(212, 175, 55, 0.3); }

        /* Typography & Layout 2026 Standards */
        .luxury-heading {
          font-family: 'Outfit', sans-serif;
          letter-spacing: -0.05em;
          line-height: 0.8;
        }
      `}</style>

      {/* Modals Shared Interface */}
      <OrderSelectionModal 
         isOpen={isOrderModalOpen}
         onClose={() => setIsOrderModalOpen(false)}
         onSelect={handleSelectOrder}
         mode={selectionMode}
      />

      {selectedDeliveredItem && (
        <AnimatePresence>
          {isReturnModalOpen && (
            <ReturnRequestModal 
              isOpen={isReturnModalOpen}
              onClose={() => {
                setIsReturnModalOpen(false);
                setSelectedDeliveredItem(null);
              }}
              orderId={selectedDeliveredItem.orderId}
              orderPartId={selectedDeliveredItem.orderPartId}
              merchantName={selectedDeliveredItem.merchantName}
              partName={selectedDeliveredItem.partName}
              onSuccess={() => {
                 setIsReturnModalOpen(false);
                 setSelectedDeliveredItem(null);
                 fetchUserRequests();
                 ordersApi.getDeliveredOrders().then((items: any[]) => {
                   setEligibleItems(
                     (items || [])
                       .filter((i) => i.isReturnEligible === true && i.orderPartId)
                       .map((i) => ({
                         orderId: i.id,
                         orderPartId: i.orderPartId,
                         partName: i.name,
                         merchantName: i.storeName || 'Store',
                         orderNumber: i.orderNumber,
                       })),
                   );
                 }).catch(() => {});
              }}
            />
          )}
          {isDisputeModalOpen && (
            <DisputeModal 
              isOpen={isDisputeModalOpen}
              onClose={() => {
                setIsDisputeModalOpen(false);
                setSelectedDeliveredItem(null);
              }}
              orderId={selectedDeliveredItem.orderId}
              orderPartId={selectedDeliveredItem.orderPartId}
              merchantName={selectedDeliveredItem.merchantName}
              partName={selectedDeliveredItem.partName}
              onSuccess={() => {
                 setIsDisputeModalOpen(false);
                 setSelectedDeliveredItem(null);
                 fetchUserRequests();
                 ordersApi.getDeliveredOrders().then((items: any[]) => {
                   setEligibleItems(
                     (items || [])
                       .filter((i) => i.isReturnEligible === true && i.orderPartId)
                       .map((i) => ({
                         orderId: i.id,
                         orderPartId: i.orderPartId,
                         partName: i.name,
                         merchantName: i.storeName || 'Store',
                         orderNumber: i.orderNumber,
                       })),
                   );
                 }).catch(() => {});
              }}
            />
          )}
        </AnimatePresence>
      )}

      {/* Luxury Escalation Confirmation Modal */}
      <EscalationConfirmModal 
        isOpen={isEscalateConfirmOpen}
        onClose={() => setIsEscalateConfirmOpen(false)}
        onConfirm={async () => {
          if (caseToEscalate) {
            await escalateCase(caseToEscalate);
            setIsEscalateConfirmOpen(false);
            setCaseToEscalate(null);
          }
        }}
      />
    </div>
  );
};

// Internal Sub-Component for Luxury Confirmation
const EscalationConfirmModal: React.FC<{ isOpen: boolean, onClose: () => void, onConfirm: () => Promise<void> }> = ({ isOpen, onClose, onConfirm }) => {
  const { t, language } = useLanguage();
  const isAr = language === 'ar';
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/90 backdrop-blur-md"
      />
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="relative w-full max-w-md bg-[#0C0B0A] border border-white/5 rounded-[32px] p-8 overflow-hidden shadow-2xl"
      >
        <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/10 blur-3xl rounded-full -mr-16 -mt-16" />
        
        <div className="relative z-10 space-y-6 text-center">
          <div className="w-16 h-16 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center justify-center text-red-500 mx-auto">
            <ShieldAlert size={32} />
          </div>
          
          <div className="space-y-2">
            <h3 className="text-xl font-black text-white uppercase tracking-tight">
              {isAr ? 'تصعيد الحالة للإدارة' : 'Escalate to Management'}
            </h3>
            <p className="text-[10px] font-black text-white/30 uppercase leading-relaxed px-4">
              {t.dashboard.resolution.actions.confirmEscalation}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-4">
            <button 
              onClick={onClose}
              className="py-4 bg-white/5 hover:bg-white/10 text-white/50 hover:text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all"
            >
              {isAr ? 'إلغاء' : 'Cancel'}
            </button>
            <button 
              disabled={isSubmitting}
              onClick={async () => {
                setIsSubmitting(true);
                await onConfirm();
                setIsSubmitting(false);
              }}
              className="py-4 bg-red-500 text-white text-[10px] font-black uppercase tracking-widest rounded-xl shadow-lg shadow-red-500/20 hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
            >
              {isSubmitting ? (isAr ? 'جاري التصعيد...' : 'Escalating...') : (isAr ? 'تأكيد التصعيد' : 'Confirm Escalation')}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
