import React, { useRef, useEffect, useState } from 'react';
import { Send, X, Video, Clock, CheckCircle2, Paperclip, Globe, MessageSquareDashed, FileText, ShieldAlert, Ban, AlertTriangle } from 'lucide-react';
import { useChatStore } from '../../../stores/useChatStore';
import { useOrderChatStore } from '../../../stores/useOrderChatStore'; // NEW
import { useProfileStore } from '../../../stores/useProfileStore';
import { useVendorStore } from '../../../stores/useVendorStore';
import { MessageBubble } from './MessageBubble';
import { AnimatePresence, motion } from 'framer-motion';
import { useLanguage } from '../../../contexts/LanguageContext';
import { CountdownTimer } from '../OrderDetails';
import { client as api } from '../../../services/api/client';
import { useOrderStore } from '../../../stores/useOrderStore'; // ADDED
import { Badge } from '../../ui/Badge'; // ADDED
import { usePlatformSettingsStore } from '../../../stores/usePlatformSettingsStore';

interface ChatWindowProps {
  onNavigateToCheckout: () => void;
}

export const ChatWindow: React.FC<ChatWindowProps> = ({ onNavigateToCheckout }) => {
  const { chats, activeChatId, sendMessage: sendLegacyMessage, getChatStatus, acceptOffer } = useChatStore();
  const { activeChat: orderChat, sendMessage: sendOrderMessage, toggleTranslation, fetchChat, markAsRead } = useOrderChatStore(); // NEW
  
  // Real-time Order Status fetching
  const order = useOrderStore((state) => orderChat?.orderId ? state.getOrder(orderChat.orderId) : null);
  const orderStatus = order?.status;

  const { settings: userSettings, user } = useProfileStore(); // Get user object
  const { settings: vendorSettings } = useVendorStore();
  const { t, language } = useLanguage();
  const { isAttachmentsEnabled, fetchSettings, subscribeToSettings: subscribePlatform } = usePlatformSettingsStore();

  // Initialize Platform Governance
  useEffect(() => {
    fetchSettings();
    const unsub = subscribePlatform();
    return () => unsub();
  }, [fetchSettings, subscribePlatform]);

  const [text, setText] = useState('');
  const [pendingAttachment, setPendingAttachment] = useState<{ url: string; type: 'image' | 'video' | 'document'; file: File } | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [lightboxMedia, setLightboxMedia] = useState<{ url: string; type: 'image' | 'video' } | null>(null);

  const [warning, setWarning] = useState<string | null>(null);

  // Derived typing state to avoid calling hooks conditionally below
  const isTyping = useOrderChatStore((state) => state.isTyping);
  const typingUserId = useOrderChatStore((state) => state.typingUserId);
  const isChatContentLoading = useOrderChatStore((state) => state.isChatContentLoading);
  const showTypingIndicator = isTyping && typingUserId !== user?.id;

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const legacyChat = chats.find(c => c.id === activeChatId);
  // CRITICAL: Always prefer OrderChatStore when activeChat exists — this ensures messages save to DB
  const isOrderChat = !!orderChat;

  // Compute if User has translations enabled
  const isTranslationEnabled = user?.role === 'CUSTOMER' ? !!orderChat?.customerTranslationEnabledAt
    : user?.role === 'VENDOR' ? !!orderChat?.vendorTranslationEnabledAt
      : !!orderChat?.adminTranslationEnabledAt;

  // Use the correct chat object (OrderChatStore if available, else Legacy)
  const displayChat = isOrderChat && orderChat ? {
    id: orderChat.id,
    merchantName: orderChat.type === 'support'
      ? (t.dashboard.menu?.support || 'Technical Support')
      : (user?.role === 'CUSTOMER' ? (orderChat.vendorCode || t.dashboard.menu?.merchant || 'Merchant') : (orderChat.customerCode || t.dashboard.menu?.customer || 'Customer')),
    partName: orderChat.type === 'support' ? '' : (orderChat.partName || t.dashboard.menu?.order || 'Order Inquiry'),
    orderId: orderChat.type === 'support' ? '' : (orderChat.orderNumber || orderChat.orderId),
    messages: orderChat.messages.map(m => ({
      id: m.id,
      text: m.text,  // Keep ORIGINAL text — toggle logic in render handles switching
      sender: (
        user?.role === 'CUSTOMER'
          ? m.senderId === user?.id
          : user?.role === 'VENDOR'
            ? m.senderId === user?.id || m.senderId === orderChat.vendorId
            : m.senderId === user?.id
      ) ? 'me' : 'other',
      time: new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isRead: m.isRead,
      originalText: m.text,
      translatedText: m.translatedText,
      translationPending: !!(m as any).translationPending,
      revealTranslation: !!m.revealTranslation,
      mediaUrl: m.mediaUrl,
      mediaType: m.mediaType,
      mediaName: m.mediaName,
      priority: m.priority,
      subject: m.subject
    })),
    status: orderChat.status === 'OPEN' ? 'active' : orderChat.status.toLowerCase(), // active, closed, expired
    isTranslationEnabled
  } : legacyChat ? {
    ...legacyChat,
    status: getChatStatus(legacyChat.id)
  } : null;

  const handleBackToChats = () => {
    useOrderChatStore.getState().clearChat();
    useChatStore.getState().setActiveChat(null as any);
  };


  // Auto Scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [displayChat?.messages, pendingAttachment, orderChat?.messages]);

  // Auto-Mark as Read when opening an order chat
  useEffect(() => {
    if (isOrderChat && orderChat?.id && orderChat.messages?.length > 0) {
      markAsRead(orderChat.id);
    }
  }, [isOrderChat, orderChat?.id, orderChat?.messages?.length, markAsRead]);

  // Real-time Governance: Clear pending attachment if admin disables it
  useEffect(() => {
    if (!isAttachmentsEnabled && pendingAttachment) {
      clearAttachment();
    }
  }, [isAttachmentsEnabled, pendingAttachment]);

  // Determine Auto-Translate Setting based on Context (Simulated)
  const isMerchant = window.location.pathname.includes('/merchant');

  if (!displayChat) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-white/40 bg-[#1A1814] p-8 text-center border-l border-white/5">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="relative mb-6"
        >
          {/* Glowing background effect */}
          <div className="absolute inset-0 bg-gold-500/10 blur-2xl rounded-full scale-150" />

          <div className="w-24 h-24 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center relative z-10 shadow-2xl backdrop-blur-md">
            <motion.div
              animate={{ y: [0, -4, 0] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            >
              <MessageSquareDashed size={40} className="text-gold-500/80" />
            </motion.div>
          </div>
        </motion.div>

        <motion.h3
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.4 }}
          className="text-xl font-bold text-white mb-2"
        >
          {t.dashboard?.chat?.title || 'Messages'}
        </motion.h3>

        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.4 }}
          className="text-sm text-white/50 max-w-[280px]"
        >
          {language === 'ar' ? 'اختر محادثة للبدء فى المراسلة' : 'Select a chat to start messaging'}
        </motion.p>
      </div>
    );
  }

  // Smart Chat Logic Checks
  const chatStatus = displayChat.status;
  const isChatActive = chatStatus === 'active' || 
    (orderStatus && ['AWAITING_OFFERS', 'COLLECTING_OFFERS', 'AWAITING_SELECTION', 'AWAITING_PAYMENT', 'PREPARATION', 'SHIPPED'].includes(orderStatus));

  const handleSend = async () => {
    if ((!text.trim() && !pendingAttachment) || !isChatActive || isUploading) return;
    setWarning(null);

    if (isOrderChat) {
      let uploadedMediaUrl = undefined;
      setIsUploading(true);

      try {
        if (pendingAttachment) {
          const formData = new FormData();
          formData.append('file', pendingAttachment.file);
          formData.append('chatId', orderChat?.id || '');
          try {
            const { data } = await api.post<{ url: string }>('/uploads/chat', formData);
            uploadedMediaUrl = data.url;
          } catch (error) {
            console.error('Upload Error:', error);
            alert('Failed to upload attachment. It might be too large or invalid format.');
            setIsUploading(false);
            return;
          }
        }

        await sendOrderMessage({
          text,
          mediaUrl: uploadedMediaUrl,
          mediaType: pendingAttachment?.type,
          mediaName: pendingAttachment?.file.name,
          userId: user?.id,
          translationEnabled: isTranslationEnabled,
        });
      } catch (err: any) {
        if (err.message === 'CHAT_VIOLATION_DETECTED') {
            setWarning(language === 'ar' 
                ? 'يُمنع منعاً باتاً تبادل أرقام الهواتف، الإيميلات، أو الروابط الخارجية لحفظ حقوق المنصة. تكرار المحاولة قد يعرض حسابك للحظر النهائي.' 
                : 'Sharing contact information or external links is strictly prohibited. Repeated attempts will result in account suspension.');
        } else {
            console.error('Send error:', err);
        }
      } finally {
        setIsUploading(false);
      }
    } else {
      // Legacy/Support
      let finalText = text;
      // ... translation logic mock ...
      const attachment = pendingAttachment ? {
        mediaUrl: pendingAttachment.url,
        mediaType: pendingAttachment.type
      } : undefined;
      sendLegacyMessage(displayChat.id, finalText, attachment);
    }

    // Reset
    setText('');
    setPendingAttachment(null);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 25 * 1024 * 1024) { // Increased to 25MB to align with Docs
        alert('File size too large (Max 25MB)');
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

  const handleAcceptOffer = () => {
    if (window.confirm('Are you sure you want to accept this offer? Choosing this offer will close other inquiries for this order.')) {
      acceptOffer(activeChatId!, activeChatId!); // Fix args
      onNavigateToCheckout();
    }
  };

  const handleToggleTranslation = () => {
    if (isOrderChat && orderChat?.id && user?.role) {
      toggleTranslation(orderChat.id, !isTranslationEnabled, user.role);
    }
  };

  return (
    <div className="h-full flex flex-col bg-[#1A1814] relative">
      {/* Lightbox Overlay */}
      <AnimatePresence>
        {lightboxMedia && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 bg-black/90 flex items-center justify-center p-4 backdrop-blur-sm"
          >
            <button
              onClick={() => setLightboxMedia(null)}
              className="absolute top-4 right-4 p-2 bg-white/10 rounded-full hover:bg-white/20 text-white transition-colors"
            >
              <X size={24} />
            </button>

            {lightboxMedia.type === 'video' ? (
              <video src={lightboxMedia.url} controls autoPlay className="max-w-full max-h-full rounded-lg" />
            ) : (
              <img src={lightboxMedia.url} alt="Full view" className="max-w-full max-h-full object-contain rounded-lg" />
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="p-4 border-b border-white/10 bg-[#151310] flex justify-between items-center z-10 w-full">
        <div className="flex items-center gap-3">
          <button
            onClick={handleBackToChats}
            className="md:hidden p-2 text-white/50 hover:text-white transition-colors hover:bg-white/5 rounded-lg"
          >
            <X size={20} className="scale-x-[-1]" />
          </button>
          <div className="w-10 h-10 rounded-full bg-gold-500/20 flex items-center justify-center text-gold-500 font-bold shrink-0">
            {displayChat.merchantName?.[0] || '?'}
          </div>
          <div>
            <h3 className="text-white font-bold flex items-center gap-2">
              {displayChat.merchantName}
              {(legacyChat?.type === 'support' || displayChat.partName?.includes('Support')) && (
                <span className="bg-blue-500/10 text-blue-400 text-[10px] px-2 py-0.5 rounded-full border border-blue-500/20">
                  Support SLA
                </span>
              )}
            </h3>
            {displayChat.partName && (
              <div className="flex items-center gap-2 text-xs text-white/50">
                <span className={`w-2 h-2 rounded-full ${chatStatus === 'active' ? 'bg-green-500' : 'bg-red-500'}`}></span>
                {displayChat.orderId ? `#${displayChat.orderId} • ` : ''}{displayChat.partName}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Status Badge or SLA Timer */}
          {chatStatus === 'active' && orderChat?.type !== 'support' && (
            <div className="hidden md:block">
              {orderStatus && !['AWAITING_OFFERS', 'COLLECTING_OFFERS', 'AWAITING_SELECTION'].includes(orderStatus) ? (
                <Badge status={orderStatus} />
              ) : (
                <CountdownTimer
                  targetDate={
                    (['AWAITING_OFFERS', 'COLLECTING_OFFERS'].includes(orderStatus || ''))
                      ? (order?.revealOffersAt || new Date(new Date(order?.createdAt || Date.now()).getTime() + 24 * 60 * 60 * 1000).toISOString())
                      : (order?.selectionDeadlineAt || orderChat?.expiryAt || new Date(new Date(order?.createdAt || Date.now()).getTime() + 48 * 60 * 60 * 1000).toISOString())
                  }
                  compact
                />
              )}
            </div>
          )}

          {/* Translation Toggle */}
          {isOrderChat && (
            <button
              onClick={handleToggleTranslation}
              className={`p-2 rounded-lg transition-colors flex items-center gap-2 ${isTranslationEnabled ? 'bg-gold-500 text-white' : 'bg-white/5 text-white/50 hover:bg-white/10'}`}
              title="Toggle Auto-Translation"
            >
              <Globe size={18} />
              <span className="text-xs font-medium hidden md:inline">
                {isTranslationEnabled ? (t.dashboard.chat?.translationOn || 'Translation ON') : (t.dashboard.chat?.translate || 'Translate')}
              </span>
            </button>
          )}

          {/* Admin Monitor Actions */}
          {user?.role === 'ADMIN' && isOrderChat && orderChat?.status === 'OPEN' && (
            <div className="flex items-center gap-1">
              <button
                onClick={async () => {
                  if (!orderChat?.id) return;
                  if (!window.confirm(language === 'ar' ? 'هل أنت متأكد من إغلاق هذه المحادثة؟' : 'Are you sure you want to close this chat?')) return;
                  try {
                    await api.post(`/chats/${orderChat.id}/admin-action`, { action: 'close' });
                  } catch (e) { console.error('Admin close failed:', e); }
                }}
                className="p-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors flex items-center gap-1.5"
                title={language === 'ar' ? 'إغلاق المحادثة' : 'Close Chat'}
              >
                <ShieldAlert size={16} />
                <span className="text-xs font-medium hidden lg:inline">
                  {language === 'ar' ? 'إغلاق' : 'Close'}
                </span>
              </button>
              <button
                onClick={async () => {
                  if (!orderChat?.id) return;
                  const targetId = orderChat.customerId; // Block the customer by default
                  if (!window.confirm(language === 'ar' ? 'هل أنت متأكد من حظر هذا المستخدم؟' : 'Are you sure you want to block this user?')) return;
                  try {
                    await api.post(`/chats/${orderChat.id}/admin-action`, { action: 'block', targetUserId: targetId });
                  } catch (e) { console.error('Admin block failed:', e); }
                }}
                className="p-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors flex items-center gap-1.5"
                title={language === 'ar' ? 'حظر المستخدم' : 'Block User'}
              >
                <Ban size={16} />
                <span className="text-xs font-medium hidden lg:inline">
                  {language === 'ar' ? 'حظر' : 'Block'}
                </span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6 relative">
        {/* Selection Phase Banner */}
        {orderStatus === 'AWAITING_SELECTION' && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 rounded-2xl bg-gold-500/10 border border-gold-500/20 flex flex-col md:flex-row items-center justify-between gap-4 backdrop-blur-sm sticky top-0 z-20"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gold-500/20 flex items-center justify-center text-gold-500">
                <Clock size={20} />
              </div>
              <div>
                <h4 className="text-white font-bold text-sm">
                  {language === 'ar' ? 'مرحلة اختيار العروض' : 'Offer Selection Phase'}
                </h4>
                <p className="text-xs text-white/50">
                  {language === 'ar' 
                    ? 'تم كشف العروض! يمكنك الدردشة مع التاجر قبل اتخاذ قرارك النهائي.' 
                    : 'Offers are revealed! You can chat with the merchant before making your final decision.'}
                </p>
              </div>
            </div>
            {user?.role === 'CUSTOMER' && (
              <button 
                onClick={() => window.location.href = `/dashboard/orders/${orderChat?.orderId}`}
                className="px-4 py-2 bg-gold-500 hover:bg-gold-600 text-white text-xs font-bold rounded-xl transition-all shadow-lg shadow-gold-500/20"
              >
                {language === 'ar' ? 'عرض كافة العروض' : 'View All Offers'}
              </button>
            )}
          </motion.div>
        )}
        {isOrderChat && isChatContentLoading ? (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-[#1A1814]/80 backdrop-blur-sm">
            <div className="w-8 h-8 border-2 border-gold-500/30 border-t-gold-500 rounded-full animate-spin mb-3"></div>
            <p className="text-white/50 text-sm">{language === 'ar' ? 'جاري تحميل المحادثة...' : 'Loading chat...'}</p>
          </div>
        ) : null}

        {displayChat.messages?.map((msg: any) => {
          const wantsTranslation = isTranslationEnabled && !!msg.text;
          const translationPending = !!msg.translationPending;
          const displayText =
            wantsTranslation && msg.translatedText
              ? msg.translatedText
              : msg.text;
          return (
          <MessageBubble
            key={msg.id}
            message={{
              ...msg,
              text: displayText,
              translationPending,
              isTranslated: wantsTranslation && !!msg.translatedText,
              animateTranslation: !!msg.revealTranslation,
            }}
            onAcceptOffer={handleAcceptOffer}
            onViewMedia={(url, type) => setLightboxMedia({ url, type })}
          />
        );
        })}

        {/* Global Typing Indicator */}
        {showTypingIndicator && (
          <div className="flex items-center gap-2 text-white/50 text-xs italic animate-pulse">
            <span className="w-1.5 h-1.5 bg-gold-500 rounded-full"></span>
            <span className="w-1.5 h-1.5 bg-gold-500 rounded-full animation-delay-150"></span>
            <span className="w-1.5 h-1.5 bg-gold-500 rounded-full animation-delay-300"></span>
            {t.dashboard.chat?.someoneTyping || 'Someone is typing...'}
          </div>
        )}

        {/* Status Indicators in Chat Stream */}
        {chatStatus === 'expired' && (!orderStatus || orderStatus === 'AWAITING_OFFERS') && (
          <div className="flex justify-center my-4">
            <span className="text-xs text-red-400 bg-red-500/10 px-3 py-1 rounded-full border border-red-500/20 flex items-center gap-1">
              <Clock size={12} />
              {language === 'ar' ? 'انتهت صلاحية العرض (24 ساعة)' : 'Offer Expired (24h Limit Reached)'}
            </span>
          </div>
        )}

        {chatStatus === 'closed' && (
          <div className="flex justify-center my-4">
            <span className="text-xs text-gray-400 bg-gray-500/10 px-3 py-1 rounded-full border border-gray-500/20 flex items-center gap-1">
              <CheckCircle2 size={12} />
              {orderChat?.type === 'support' 
                ? (language === 'ar' ? 'تم إغلاق المحادثة (تم حل المشكلة)' : 'Chat Closed (Issue Resolved)')
                : (language === 'ar' ? 'تم إغلاق المحادثة (تم قبول عرض آخر)' : 'Chat Closed (Offer Accepted Elsewhere)')
              }
            </span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Footer / Status Banner */}
      <div className="p-4 bg-[#151310] border-t border-white/10">

        {isChatActive ? (
          <>
            {/* Pending Attachment Preview */}
            {pendingAttachment && (
              <div className="mb-4 p-3 bg-white/5 rounded-xl border border-white/10 flex items-center justify-between animate-in slide-in-from-bottom-2">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-black/40 rounded-lg overflow-hidden flex items-center justify-center">
                    {pendingAttachment.type === 'video' ? <Video size={20} className="text-white/50" /> : pendingAttachment.type === 'document' ? <FileText size={20} className="text-white/50" /> : <img src={pendingAttachment.url} className="w-full h-full object-cover" />}
                  </div>
                  <div>
                    <p className="text-sm text-white font-medium max-w-[200px] truncate">{pendingAttachment.file.name}</p>
                    <p className="text-xs text-white/40">Ready to send</p>
                  </div>
                </div>
                <button onClick={clearAttachment} className="p-2 hover:bg-white/10 rounded-full text-white/50 hover:text-red-400 transition-colors">
                  <X size={18} />
                </button>
              </div>
            )}

            {/* Chat Guard Warning */}
            {warning && (
              <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-3 animate-in slide-in-from-bottom-2">
                <AlertTriangle className="text-red-400 shrink-0 mt-0.5" size={20} />
                <p className="text-sm text-red-200">{warning}</p>
                <button onClick={() => setWarning(null)} className="text-red-400 hover:text-white ml-auto">
                  <X size={16} />
                </button>
              </div>
            )}

            {/* Input Area */}
            <div className="flex gap-2">
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept="image/*,video/*,.pdf,.doc,.docx"
                onChange={handleFileUpload}
              />
              {isAttachmentsEnabled && (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className={`p-3 rounded-xl transition-colors ${pendingAttachment ? 'bg-gold-500/20 text-gold-500' : 'text-white/40 hover:text-white hover:bg-white/5'}`}
                  title="Attach Media"
                >
                  <Paperclip size={20} />
                </button>
              )}

              <input
                type="text"
                value={text}
                onChange={(e) => {
                  setText(e.target.value);
                  if (isOrderChat && orderChat) {
                    useOrderChatStore.getState().setTypingStatus(orderChat.id, e.target.value.length > 0, user?.id || '');
                  }
                }}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder={isOrderChat && isTranslationEnabled ? "Type... (Auto-translating to Arabic/English)" : "Type your message..."}
                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-gold-500 outline-none placeholder:text-white/20"
                disabled={!isChatActive || isUploading}
              />
              <button
                onClick={handleSend}
                disabled={(!text.trim() && !pendingAttachment) || !isChatActive || isUploading}
                className="p-3 bg-gold-500 hover:bg-gold-600 disabled:bg-white/10 disabled:text-white/20 text-white rounded-xl transition-colors relative flex items-center justify-center min-w-[42px]"
              >
                {isUploading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Send size={18} />}
              </button>
            </div>
          </>
        ) : (
          /* Locked State UI */
          <div className="p-4 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center gap-3 text-center">
            {chatStatus === 'expired' ? (
              <>
                <Clock className="text-red-400" size={24} />
                <div>
                  <h4 className="text-white font-bold text-sm">{language === 'ar' ? 'انتهت صلاحية العرض' : 'Offer Expired'}</h4>
                  <p className="text-xs text-white/40">{language === 'ar' ? 'تم إغلاق هذه المحادثة لانتهاء مهلة الـ 24 ساعة للعرض.' : 'This chat is closed because the 24h offer window has passed.'}</p>
                </div>
              </>
            ) : (
              <>
                <CheckCircle2 className="text-gold-500" size={24} />
                <div>
                  <h4 className="text-white font-bold text-sm">
                    {orderChat?.type === 'support' 
                      ? (language === 'ar' ? 'تم حل المشكلة' : 'Issue Resolved')
                      : (language === 'ar' ? 'تم الاختيار' : 'Order in Progress')
                    }
                  </h4>
                  <p className="text-xs text-white/40">
                    {orderChat?.type === 'support'
                      ? (language === 'ar' ? 'تم إغلاق هذه المحادثة لأن المشكلة الخاصة بك قد حُلّت بنجاح.' : 'This chat is closed because your issue has been successfully resolved.')
                      : (language === 'ar' ? 'تم إغلاق هذه المحادثة بسبب قبولك لعرض آخر لهذا الطلب.' : 'This chat is closed because you accepted another offer for this order.')
                    }
                  </p>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
