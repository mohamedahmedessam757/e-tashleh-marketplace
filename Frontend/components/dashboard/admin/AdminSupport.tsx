
import React, { useState, useEffect } from 'react';
import { GlassCard } from '../../ui/GlassCard';
import { useAdminChatStore } from '../../../stores/useAdminChatStore';
import { useLanguage } from '../../../contexts/LanguageContext';
import { Search, MessageSquare, User, CheckCircle2, Send, ChevronRight, ChevronLeft, Loader2, Download, Video, FileText, Image as ImageIcon, Inbox, X, Globe, Paperclip, ShieldCheck, Info, Layers, Store, Package, RefreshCcw, DollarSign, ShieldAlert, Lock } from 'lucide-react';
import { useAdminPermissionsStore } from '../../../stores/useAdminPermissionsStore';
import { motion, AnimatePresence } from 'framer-motion';
import { BlurredSection } from './BlurredSection';
import { getCurrentUser } from '../../../utils/auth';
import { client } from '../../../services/api/client';

export const AdminSupport: React.FC<{ viewId?: string }> = ({ viewId }) => {
  const { t, language } = useLanguage();
  const { supportChats, activeChat, fetchChats, fetchChatById, sendMessage, adminAction, isLoading, clearActiveChat, _hasLoadedSupport, initSocket } = useAdminChatStore();
  const { getTicketCategories, canViewTab } = useAdminPermissionsStore();

  const { toggleTranslation } = useAdminChatStore();
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const [replyText, setReplyText] = useState('');
  const [filter, setFilter] = useState<'ALL' | 'OPEN' | 'RESOLVED'>('ALL');
  const [userTypeFilter, setUserTypeFilter] = useState<'CUSTOMER' | 'MERCHANT'>('CUSTOMER');
  const [search, setSearch] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [pendingAttachment, setPendingAttachment] = useState<{ url: string; type: 'image' | 'video' | 'document'; file: File } | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [showTranslated, setShowTranslated] = useState(false);
  const [isTranslationLoading, setIsTranslationLoading] = useState(false);
  const [isActionLoading, setIsActionLoading] = useState(false);

  const isAr = language === 'ar';
  
  useEffect(() => {
    initSocket();
    fetchChats('support');

    if (viewId) {
      fetchChatById(viewId);
    } else {
      // CRITICAL: Clear any stale activeChat from another page (e.g. Oversight) if no specific viewId
      clearActiveChat();
    }
  }, [fetchChats, clearActiveChat, initSocket, viewId, fetchChatById]);

  // Permissions-based Tab filtering for User Types
  const visibleTabs = React.useMemo(() => {
    const allTabs = [
      { id: 'CUSTOMER', label: isAr ? 'العملاء' : 'Customers', icon: User, permissionKey: 'CUSTOMERS' },
      { id: 'MERCHANT', label: isAr ? 'المتاجر' : 'Merchants', icon: Store, permissionKey: 'MERCHANTS' },
    ];
    return allTabs.map(tab => ({
      ...tab,
      isLocked: !canViewTab('SUPPORT', tab.permissionKey)
    }));
  }, [canViewTab, isAr]);

  // Auto-switch if current user type tab is restricted
  useEffect(() => {
    const firstAllowed = visibleTabs.find(t => !t.isLocked);
    if (firstAllowed && visibleTabs.find(t => t.id === userTypeFilter)?.isLocked) {
      setUserTypeFilter(firstAllowed.id as any);
    }
  }, [visibleTabs, userTypeFilter]);

  const filteredTickets = supportChats.filter(chat => {
      const matchesFilter = filter === 'ALL' || (filter === 'OPEN' ? chat.status === 'OPEN' : chat.status === 'CLOSED');
      
      const matchesUserType = userTypeFilter === 'MERCHANT' ? !!chat.vendorId : !chat.vendorId;

      const searchLower = search.toLowerCase();
      const matchesSearch = 
        chat.customerName?.toLowerCase().includes(searchLower) || 
        chat.guestName?.toLowerCase().includes(searchLower) ||
        chat.lastMessage?.toLowerCase().includes(searchLower);
      
      // 2026 Governance: Filter by allowed categories
      const allowedCategories = getTicketCategories();
      const role = getCurrentUser()?.role;
      const isAdmin = role === 'SUPER_ADMIN' || role === 'ADMIN';
      
      const matchesCategory = isAdmin || 
                             (allowedCategories.length > 0 && 
                              !allowedCategories.includes('__NONE__') &&
                              allowedCategories.includes(chat.category?.toUpperCase()));

      return matchesFilter && matchesUserType && matchesSearch && matchesCategory;
  });

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 25 * 1024 * 1024) {
        alert(isAr ? 'حجم الملف كبير جداً (الأقصى 25 ميجابايت)' : 'File size too large (Max 25MB)');
        return;
      }
      let type: 'image' | 'video' | 'document' = 'document';
      if (file.type.startsWith('image/')) type = 'image';
      else if (file.type.startsWith('video/')) type = 'video';
      const url = URL.createObjectURL(file);
      setPendingAttachment({ url, type, file });
    }
  };

  const clearAttachment = () => {
    if (pendingAttachment) {
      URL.revokeObjectURL(pendingAttachment.url);
      setPendingAttachment(null);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSendReply = async () => {
    if (!activeChat || (!replyText.trim() && !pendingAttachment) || isSending || isUploading) return;
    
    setIsUploading(true);
    let uploadedMediaUrl = undefined;

    try {
      if (pendingAttachment) {
        const formData = new FormData();
        formData.append('file', pendingAttachment.file);
        formData.append('chatId', activeChat.id);
        try {
          const { data } = await client.post<{ url: string }>('/uploads/chat', formData);
          uploadedMediaUrl = data.url;
        } catch (error) {
          console.error('Upload Error:', error);
          alert(isAr ? 'فشل رفع المرفق. تأكد من الحجم والصيغة.' : 'Failed to upload attachment. Check size and format.');
          setIsUploading(false);
          return;
        }
      }

      const textToSend = replyText;
      setReplyText(''); // Clear instantly for optimistic UX
      setIsSending(true);
      
      await sendMessage(
        activeChat.id, 
        textToSend, 
        uploadedMediaUrl, 
        pendingAttachment?.type, 
        pendingAttachment?.file.name
      );
      clearAttachment();
    } finally {
      setIsUploading(false);
      setIsSending(false);
    }
  };

  const handleToggleTranslation = async () => {
    if (activeChat?.id && !isTranslationLoading) {
       setIsTranslationLoading(true);
       try {
           const isCurrentlyEnabled = !!activeChat.adminTranslationEnabledAt;
           await toggleTranslation(activeChat.id, !isCurrentlyEnabled);
       } finally {
           setIsTranslationLoading(false);
       }
    }
  };

  const getPriorityColor = (status: string) => {
    return status === 'OPEN' ? 'text-red-400 bg-red-500/10 border-red-500/20' : 'text-green-400 bg-green-500/10 border-green-500/20';
  };

  const getCategoryInfo = (category: string) => {
      const isAr = language === 'ar';
      switch (category?.toUpperCase()) {
          case 'ORDERS': return { 
              icon: Package, color: 'bg-blue-500/10 text-blue-400 border-blue-500/20', 
              label: isAr ? 'طلبات' : 'Orders' 
          };
          case 'RETURNS': return { 
              icon: RefreshCcw, color: 'bg-orange-500/10 text-orange-400 border-orange-500/20', 
              label: isAr ? 'مرتجعات' : 'Returns' 
          };
          case 'PAYMENT': return { 
              icon: DollarSign, color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20', 
              label: isAr ? 'مالية' : 'Payment' 
          };
          case 'TECHNICAL': return { 
              icon: ShieldAlert, color: 'bg-purple-500/10 text-purple-400 border-purple-500/20', 
              label: isAr ? 'تقني' : 'Technical' 
          };
          case 'ACCOUNT': return { 
              icon: User, color: 'bg-red-500/10 text-red-400 border-red-500/20', 
              label: isAr ? 'حساب' : 'Account' 
          };
          default: return { 
              icon: Inbox, color: 'bg-white/5 text-white/40 border-white/10', 
              label: isAr ? 'أخرى' : 'Other' 
          };
      }
  };

  const renderMedia = (mediaUrl: string, mediaType?: string) => {
      if (!mediaUrl) return null;
      if (mediaType === 'video') return <video src={mediaUrl} controls className="w-full h-48 rounded-lg object-cover" />;
      if (mediaType === 'image' || !mediaType) return <img src={mediaUrl} alt="attachment" className="w-full max-h-64 rounded-lg object-contain bg-black/20" />;
      return (
          <div className="flex items-center gap-2 p-3 bg-white/5 rounded-lg border border-white/10 hover:bg-white/10 transition-colors cursor-pointer">
              <FileText size={18} className="text-gold-500" />
              <div className="flex-1 min-w-0">
                  <p className="text-xs text-white truncate">Attachment</p>
                  <p className="text-[10px] text-white/40">Open File</p>
              </div>
              <Download size={14} className="text-white/40" />
          </div>
      );
  };

  if (isLoading && !_hasLoadedSupport) {
      return (
          <div className="h-[calc(100vh-140px)] flex items-center justify-center">
              <div className="flex flex-col items-center gap-4">
                  <Loader2 className="w-12 h-12 text-gold-500 animate-spin" />
                  <span className="text-white/60 font-medium">{isAr ? 'جاري تحميل التذاكر...' : 'Loading tickets...'}</span>
              </div>
          </div>
      );
  }

  return (
    <div className="h-[calc(100vh-140px)] flex gap-6 animate-in fade-in slide-in-from-bottom-4">

      {/* LEFT: Ticket List */}
      <GlassCard className="w-1/3 min-w-[350px] flex flex-col p-0 overflow-hidden bg-[#151310] border-white/5">
        <div className="p-4 border-b border-white/10">
          <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <Inbox className="text-gold-500" />
            {isAr ? 'تذاكر الدعم' : 'Support Tickets'}
          </h2>

          {/* User Type Tabs: Premium 2026 Toggle */}
          <div className="relative flex p-1 bg-white/5 rounded-2xl mb-6 border border-white/10 shadow-inner overflow-hidden">
            {visibleTabs.map((tab) => (
              <button 
                key={tab.id}
                onClick={() => setUserTypeFilter(tab.id as any)} 
                className={`relative flex-1 flex items-center justify-center gap-2.5 py-3 text-[11px] font-black uppercase tracking-[0.15em] transition-all duration-500 z-10 ${userTypeFilter === tab.id ? 'text-[#1A1814]' : 'text-white/40 hover:text-white/70'} ${tab.isLocked ? 'opacity-70' : ''}`}
              >
                {userTypeFilter === tab.id && (
                  <motion.div 
                    layoutId="activeTab"
                    className="absolute inset-0 bg-gradient-to-r from-gold-400 via-gold-500 to-gold-600 rounded-xl shadow-[0_0_20px_rgba(212,175,55,0.2)]"
                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                  />
                )}
                <tab.icon size={16} className={`relative z-10 ${userTypeFilter === tab.id ? 'animate-pulse' : ''}`} />
                <span className="relative z-10">{tab.label}</span>
                {tab.isLocked && <Lock size={12} className={`relative z-10 ${userTypeFilter === tab.id ? 'text-black/50' : 'text-gold-500/50'}`} />}
              </button>
            ))}
          </div>

          <div className="flex gap-2 mb-4">
            <button onClick={() => setFilter('ALL')} className={`flex-1 py-2 text-[10px] font-bold uppercase tracking-wider rounded-lg border transition-all ${filter === 'ALL' ? 'bg-white/10 border-white/20 text-white' : 'border-transparent text-white/40 hover:text-white'}`}>
                {isAr ? 'الكل' : 'All'}
            </button>
            <button onClick={() => setFilter('OPEN')} className={`flex-1 py-2 text-[10px] font-bold uppercase tracking-wider rounded-lg border transition-all ${filter === 'OPEN' ? 'bg-red-500/10 border-red-500/20 text-red-400' : 'border-transparent text-white/40 hover:text-red-400'}`}>
                {isAr ? 'مفتوح' : 'Open'}
            </button>
            <button onClick={() => setFilter('RESOLVED')} className={`flex-1 py-2 text-[10px] font-bold uppercase tracking-wider rounded-lg border transition-all ${filter === 'RESOLVED' ? 'bg-green-500/10 border-green-500/20 text-green-400' : 'border-transparent text-white/40 hover:text-green-400'}`}>
                {isAr ? 'محلول' : 'Resolved'}
            </button>
          </div>
          <div className="relative">
            <Search size={14} className={`absolute top-1/2 -translate-y-1/2 ${isAr ? 'right-3' : 'left-3'} text-white/30`} />
            <input
              type="text"
              placeholder={isAr ? 'بحث في التذاكر...' : 'Search tickets...'}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={`w-full bg-[#1A1814] border border-white/10 rounded-xl ${isAr ? 'pr-9 pl-4' : 'pl-9 pr-4'} py-2 text-xs text-white focus:border-gold-500/50 outline-none transition-colors`}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {filteredTickets.length > 0 ? (
            filteredTickets.map(ticket => (
              <div
                key={ticket.id}
                onClick={() => fetchChatById(ticket.id)}
                className={`p-4 border-b border-white/5 cursor-pointer hover:bg-white/[0.04] transition-all relative ${activeChat?.id === ticket.id ? 'bg-gold-500/[0.08]' : ''}`}
              >
                {activeChat?.id === ticket.id && <div className={`absolute top-0 bottom-0 ${isAr ? 'right-0' : 'left-0'} w-1 bg-gold-500`} />}
                
                <div className="flex justify-between items-start mb-1.5">
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${getPriorityColor(ticket.status)}`}>
                      {ticket.status}
                  </span>
                  <span className="text-[10px] text-white/20">{ticket.lastMessageTime ? new Date(ticket.lastMessageTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}</span>
                </div>
                <h4 className="text-sm font-bold text-white mb-1 truncate">{ticket.lastMessage || (isAr ? 'بدون محتوى' : 'No Content')}</h4>
                
                <div className="flex flex-wrap gap-1.5 mb-2">
                    {ticket.category && (
                        <span className={`flex items-center gap-1 text-[9px] font-black px-2 py-0.5 rounded border uppercase tracking-widest ${getCategoryInfo(ticket.category).color}`}>
                            {React.createElement(getCategoryInfo(ticket.category).icon, { size: 10 })}
                            {getCategoryInfo(ticket.category).label}
                        </span>
                    )}
                    {ticket.adminInitReason && (
                        <span className="flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded bg-gold-500/10 text-gold-500 border border-gold-500/20 uppercase">
                            <ShieldCheck size={10} />
                            {isAr ? 'مُبادرة إدارية' : 'Admin-Init'}
                        </span>
                    )}
                    {ticket.orderNumber && (
                        <span className="flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 uppercase">
                            <Layers size={10} />
                            #{ticket.orderNumber}
                        </span>
                    )}
                    <span className={`flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded border uppercase ${ticket.source === 'LANDING' ? 'bg-orange-500/10 text-orange-400 border-orange-500/20' : ticket.vendorId ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' : 'bg-gold-500/5 text-gold-500/60 border-gold-500/10'}`}>
                        {ticket.source === 'LANDING' ? <Globe size={10} /> : ticket.vendorId ? <Store size={10} /> : <User size={10} />}
                        {ticket.source === 'LANDING' ? (isAr ? 'زائر' : 'Guest') : ticket.vendorId ? (isAr ? 'تاجر' : 'Merchant') : (isAr ? 'عميل' : 'Customer')}
                    </span>
                </div>

                <div className="flex items-center gap-2 text-[11px] text-white/40">
                  {ticket.vendorId ? (
                      <Store size={12} className="text-purple-400/50" />
                  ) : (
                      <User size={12} className="text-gold-500/50" />
                  )}
                  <span className="truncate">
                      {ticket.source === 'LANDING'
                        ? (ticket.guestName || (isAr ? 'زائر' : 'Guest'))
                        : ticket.vendorId 
                          ? (ticket.vendorName || (isAr ? 'متجر' : 'Store')) 
                          : (ticket.customerName || (isAr ? 'عميل' : 'Customer'))}
                  </span>
                  {ticket.unreadCount > 0 && (
                      <span className="w-1.5 h-1.5 rounded-full bg-gold-500 animate-pulse ml-auto" />
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="p-12 text-center flex flex-col items-center justify-center h-full">
                <div className="w-16 h-16 rounded-2xl bg-white/[0.02] flex items-center justify-center text-white/10 mb-4 border border-white/5">
                    <Inbox size={32} />
                </div>
                <p className="text-white/20 text-xs font-medium">{isAr ? 'لا توجد تذاكر حالياً' : 'No tickets found'}</p>
            </div>
          )}
        </div>
      </GlassCard>

      {/* RIGHT: Chat Detail */}
      <GlassCard className="flex-1 flex flex-col p-0 overflow-hidden bg-[#1A1814] border-white/5 relative">
        {/* Chat Transition Overlay */}
        {isLoading && _hasLoadedSupport && (
            <div className="absolute inset-0 z-50 bg-[#1A1814]/50 backdrop-blur-[2px] flex flex-col items-center justify-center">
                <Loader2 size={32} className="text-gold-500 animate-spin mb-4" />
                <span className="text-white/60 text-sm font-medium">{isAr ? 'جاري فتح المحادثة...' : 'Opening conversation...'}</span>
            </div>
        )}
        
        <BlurredSection
          isBlurred={visibleTabs.find(t => t.id === userTypeFilter)?.isLocked}
          titleAr={`قسم ${visibleTabs.find(t => t.id === userTypeFilter)?.label} محمي`}
          titleEn={`${visibleTabs.find(t => t.id === userTypeFilter)?.label} Support Protected`}
          descriptionAr="لا تملك صلاحية الوصول لهذا القسم. يرجى التواصل مع الإدارة العليا."
          descriptionEn="You do not have permission to access this support section."
        >
        {activeChat ? (
          <>
            {/* Chat Header */}
            <div className="p-4 border-b border-white/10 bg-[#151310] flex justify-between items-center">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center overflow-hidden">
                    {activeChat.vendorId ? (
                        activeChat.vendorLogo ? <img src={activeChat.vendorLogo} alt="" className="w-full h-full object-cover" /> : <Store size={20} className="text-purple-400" />
                    ) : (
                        activeChat.customerAvatar ? <img src={activeChat.customerAvatar} alt="" className="w-full h-full object-cover" /> : <User size={20} className="text-gold-500" />
                    )}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white leading-tight">
                      {activeChat.source === 'LANDING' ? activeChat.guestName : activeChat.vendorId ? activeChat.vendorName : activeChat.customerName}
                  </h3>
                  <div className="text-[10px] text-white/40 flex flex-wrap items-center gap-2 mt-1">
                    <span className="text-gold-500 font-mono">TICKET: {activeChat.id?.substring(0,8)}</span>
                    <span className="w-1 h-1 rounded-full bg-white/10" />
                    {activeChat.source === 'LANDING' ? (
                        <>
                            <span className="text-orange-400 font-medium">{activeChat.guestEmail}</span>
                            {activeChat.guestPhone && (
                                <>
                                    <span className="w-1 h-1 rounded-full bg-white/10" />
                                    <span className="text-white/30">{activeChat.guestPhone}</span>
                                </>
                            )}
                            <span className="w-1 h-1 rounded-full bg-white/10" />
                            <span className="flex items-center gap-1 bg-orange-500/10 text-orange-400 px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-widest">
                                <Globe size={8} />
                                {isAr ? 'صفحة الهبوط' : 'Landing Page'}
                            </span>
                        </>
                    ) : (
                        <>
                            <span>REF: {activeChat.orderNumber || 'GENERIC'}</span>
                            {activeChat.vendorCode && (
                                <>
                                    <span className="w-1 h-1 rounded-full bg-white/10" />
                                    <span className="text-purple-400 font-mono">{activeChat.vendorCode}</span>
                                </>
                            )}
                        </>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleToggleTranslation}
                  disabled={isTranslationLoading}
                  className={`p-2 rounded-lg transition-colors flex items-center gap-2 ${activeChat.adminTranslationEnabledAt ? 'bg-gold-500 text-[#1A1814]' : 'bg-white/5 text-white/50 hover:bg-white/10'} ${isTranslationLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                  title={isAr ? 'تفعيل الترجمة التلقائية بالذكاء الاصطناعي' : 'Toggle AI Auto-Translation'}
                >
                  {isTranslationLoading ? <Loader2 size={18} className="animate-spin" /> : <Globe size={18} />}
                  <span className="text-xs font-bold hidden md:inline">
                    {activeChat.adminTranslationEnabledAt ? (isAr ? 'ترجمة تلقائية مفعلة' : 'AI Translation ON') : (isAr ? 'تفعيل الترجمة' : 'Translate')}
                  </span>
                </button>
                <div className="w-[1px] h-6 bg-white/10 mx-1"></div>
                
                {activeChat.status !== 'CLOSED' ? (
                  <button
                    onClick={async () => {
                        if (isActionLoading) return;
                        setIsActionLoading(true);
                        try {
                            // The store already handles optimistic update to CLOSED status
                            await adminAction(activeChat.id, 'close');
                        } finally {
                            // Even if it re-renders, local state cleanup is safe
                            setIsActionLoading(false);
                        }
                    }}
                    disabled={isActionLoading}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all active:scale-95 ${isActionLoading ? 'bg-white/10 text-white/40' : 'bg-green-500/10 text-green-400 border border-green-500/20 hover:bg-green-500/20'}`}
                  >
                    {isActionLoading ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                    {isAr ? 'تم الحل' : 'Mark Resolved'}
                  </button>
                ) : (
                  <div className="flex items-center gap-2 px-4 py-2 bg-white/5 text-white/40 rounded-xl text-xs font-bold border border-white/10">
                    <CheckCircle2 size={14} />
                    {isAr ? 'محلولة' : 'Resolved'}
                  </div>
                )}
              </div>
            </div>

            {/* Info Banner for Admin-Initiated Reason */}
            {activeChat.adminInitReason && (
              <div className="px-6 py-3 bg-gold-500/5 border-b border-gold-500/10 flex items-center gap-4 animate-in fade-in slide-in-from-top-2">
                <div className="w-8 h-8 rounded-full bg-gold-500/10 flex items-center justify-center text-gold-500 shrink-0">
                  <Info size={16} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-black text-gold-500 uppercase tracking-widest mb-0.5">
                    {isAr ? 'ملاحظة الأدمن عند فتح التذكرة' : 'Admin Note upon Ticket Initiation'}
                  </p>
                  <p className="text-xs text-white/60 italic truncate leading-tight">
                    "{activeChat.adminInitReason}"
                  </p>
                </div>
              </div>
            )}

            {/* Chat Body */}
            <div className={`flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar ${isAr ? 'text-right' : 'text-left'}`}>
              <AnimatePresence mode="popLayout">
              {activeChat.messages?.map((msg) => {
                // Absolute Alignment: Admin on the Right, Other on the Left
                const isAdmin = msg.senderRole === 'ADMIN' || msg.senderId === 'admin_optimistic' || (msg.senderId && msg.senderId !== activeChat.customerId && msg.senderId !== activeChat.vendorOwnerId);
                
                // In RTL (Arabic): justify-start is Right, justify-end is Left.
                // In LTR (English): justify-start is Left, justify-end is Right.
                const alignmentClass = isAdmin 
                    ? (isAr ? 'justify-start' : 'justify-end') 
                    : (isAr ? 'justify-end' : 'justify-start');

                return (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    key={msg.id} 
                    className={`flex ${alignmentClass}`}
                  >
                    <div className={`max-w-[75%] group relative ${isAdmin ? 'items-end' : 'items-start'}`}>
                      <div className={`p-4 rounded-2xl ${isAdmin ? 'bg-gold-500 text-[#1A1814] rounded-tr-none' : 'bg-white/5 border border-white/5 text-white rounded-tl-none'}`}>
                        {msg.mediaUrl && (
                          <div className="mb-3">
                            {renderMedia(msg.mediaUrl, msg.mediaType)}
                          </div>
                        )}
                        <p className="text-sm font-medium leading-relaxed mb-1 whitespace-pre-wrap">
                          {activeChat.adminTranslationEnabledAt && msg.translatedText ? msg.translatedText : msg.text}
                        </p>
                        {activeChat.adminTranslationEnabledAt && msg.translatedText && (
                            <p className="text-[10px] text-black/40 italic font-medium">Original: {msg.text}</p>
                        )}
                        <div className={`text-[9px] mt-2 font-bold uppercase tracking-widest opacity-40 ${isAdmin ? 'text-black' : 'text-white'}`}>
                          {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
              </AnimatePresence>
            </div>

            {/* Reply Input */}
            <div className="p-4 bg-[#151310] border-t border-white/10">
              {pendingAttachment && (
                <div className="mb-4 p-3 bg-white/5 rounded-xl border border-white/10 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-black/40 rounded-lg overflow-hidden flex items-center justify-center">
                      {pendingAttachment.type === 'video' ? <Video size={16} className="text-white/50" /> : pendingAttachment.type === 'document' ? <FileText size={16} className="text-white/50" /> : <img src={pendingAttachment.url} className="w-full h-full object-cover" />}
                    </div>
                    <div>
                      <p className="text-xs text-white font-medium max-w-[200px] truncate">{pendingAttachment.file.name}</p>
                      <p className="text-[10px] text-white/40">{isAr ? 'جاهز للإرسال' : 'Ready to send'}</p>
                    </div>
                  </div>
                  <button onClick={clearAttachment} className="p-1.5 hover:bg-white/10 rounded-full text-white/50 hover:text-red-400 transition-colors">
                    <X size={16} />
                  </button>
                </div>
              )}
              <div className="flex gap-2">
                <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  accept="image/*,video/*,.pdf,.doc,.docx"
                  onChange={handleFileUpload}
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading || isSending}
                  className={`p-3 rounded-xl transition-colors shrink-0 ${pendingAttachment ? 'bg-gold-500/20 text-gold-500' : 'text-white/40 hover:text-white hover:bg-white/5 bg-white/5 border border-white/10'}`}
                >
                  <Paperclip size={20} />
                </button>
                <div className="flex-1 relative">
                    <input
                      type="text"
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSendReply()}
                      placeholder={isAr ? 'اكتب رد المقترح...' : 'Type your resolution...'}
                      disabled={isUploading || isSending}
                      className={`w-full bg-white/5 border border-white/10 rounded-2xl ${isAr ? 'pr-4 pl-12' : 'pl-4 pr-12'} py-3.5 text-sm text-white focus:border-gold-500/50 outline-none transition-all ${isUploading || isSending ? 'opacity-50' : ''}`}
                    />
                    <button
                        onClick={handleSendReply}
                        disabled={(!replyText.trim() && !pendingAttachment) || isUploading || isSending}
                        className={`absolute top-1/2 -translate-y-1/2 ${isAr ? 'left-2.5' : 'right-2.5'} w-10 h-10 bg-gold-500 hover:bg-gold-600 text-[#1A1814] rounded-xl transition-all active:scale-95 flex items-center justify-center shadow-lg shadow-gold-500/10 disabled:opacity-50 disabled:bg-white/10 disabled:text-white/20`}
                    >
                        {isUploading || isSending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                    </button>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-white/10 select-none">
            <MessageSquare size={80} className="mb-6 opacity-5" />
            <h3 className="text-lg font-bold text-white/20">{isAr ? 'اختر تذكرة للبدء' : 'Select a ticket to begin resolution'}</h3>
          </div>
        )}
        </BlurredSection>
      </GlassCard>

    </div>
  );
};
