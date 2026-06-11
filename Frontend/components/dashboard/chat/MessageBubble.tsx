
import React from 'react';
import { useLanguage } from '../../../contexts/LanguageContext';
import { CheckCircle2, FileText, Download, Globe, Check, CheckCheck } from 'lucide-react';
import { motion } from 'framer-motion';
import { TranslationTypingIndicator, TypewriterText } from './TranslatedMessageText';

interface MessageBubbleProps {
  message: any;
  onAcceptOffer?: () => void;
  onViewMedia?: (url: string, type: 'image' | 'video') => void;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({ message, onAcceptOffer, onViewMedia }) => {
  // Support both 'user'/'me' sender formats
  const isMe = message.sender === 'user' || message.sender === 'me';
  const { t, language } = useLanguage();
  const isAr = language === 'ar';

  // RTL-aware alignment: my messages on the right in Arabic, left in English
  const alignmentClass = isMe
    ? (isAr ? 'justify-start' : 'justify-end')
    : (isAr ? 'justify-end' : 'justify-start');
  const itemsClass = isMe
    ? (isAr ? 'items-start' : 'items-end')
    : (isAr ? 'items-end' : 'items-start');
  const bubbleTailClass = isMe
    ? (isAr ? 'rounded-tl-none' : 'rounded-tr-none')
    : (isAr ? 'rounded-tr-none' : 'rounded-tl-none');
  const bubbleMarginClass = isMe
    ? (isAr ? 'me-12' : 'ms-12')
    : (isAr ? 'ms-12' : 'me-12');

  return (
    <motion.div 
      initial={{ opacity: 0, y: 15, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.15, ease: [0.23, 1, 0.32, 1] }}
      className={`flex ${alignmentClass} mb-6`}
    >
      <div className={`max-w-[85%] flex flex-col ${itemsClass}`}>
        <div
          className={`
            relative overflow-hidden transition-all duration-300
            ${(message.subject || message.priority) 
              ? 'rounded-[2rem] shadow-2xl border border-white/10 ring-1 ring-white/5' 
              : 'p-4 rounded-2xl shadow-lg'}
            ${isMe
              ? `bg-gold-500/10 text-white border border-gold-500/20 ${bubbleTailClass} ${bubbleMarginClass}`
              : `bg-[#2A2824] text-white border border-white/10 ${bubbleTailClass} ${bubbleMarginClass}`}
          `}
          style={(message.subject || message.priority) ? {
            background: 'linear-gradient(135deg, #1A1814 0%, #2A2824 100%)',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5), inset 0 1px 1px rgba(255, 255, 255, 0.05)'
          } : {}}
        >
          {/* Support Ticket Card Layout */}
          {(message.subject || message.priority) ? (
            <div className="flex flex-col w-full min-w-[320px]">
              {/* Card Header */}
              <div className="p-5 border-b border-white/5 bg-white/[0.02] flex items-center justify-between gap-4">
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-gold-500 shadow-[0_0_8px_rgba(212,175,55,0.8)]" />
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40">
                      {language === 'ar' ? 'تذكرة دعم فني' : 'SUPPORT REQUEST'}
                    </span>
                  </div>
                  <h4 className="text-lg font-black text-white leading-tight mt-1">{message.subject}</h4>
                </div>
                {message.priority && (
                  <div className="shrink-0">
                    <span className={`px-3 py-1.5 rounded-full text-[10px] font-black tracking-tighter border shadow-lg backdrop-blur-md ${
                      message.priority === 'HIGH' ? 'bg-red-500/20 text-red-500 border-red-500/40' :
                      message.priority === 'MEDIUM' ? 'bg-gold-500/20 text-gold-500 border-gold-500/40' :
                      'bg-blue-500/20 text-blue-500 border-blue-500/40'
                    }`}>
                      {message.priority}
                    </span>
                  </div>
                )}
              </div>

              {/* Card Body */}
              <div className="p-5 space-y-4">
                {message.text && (
                  <p className="text-sm leading-relaxed text-white/80 font-medium whitespace-pre-wrap">
                    {message.text}
                  </p>
                )}

                {/* Media Section - Integrated into Card */}
                {message.mediaUrl && (
                  <div className="relative group rounded-2xl overflow-hidden border border-white/10 bg-black/40 shadow-inner">
                    {(message.mediaType === 'video' || message.mediaType === 'image' || !message.mediaType) ? (
                      <div 
                        className="cursor-pointer transition-transform duration-500 group-hover:scale-[1.02]"
                        onClick={() => onViewMedia?.(message.mediaUrl, message.mediaType || 'image')}
                      >
                         {message.mediaType === 'video' ? (
                          <div className="relative aspect-video">
                            <video src={message.mediaUrl} className="w-full h-full object-cover" />
                            <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/40 transition-colors">
                              <div className="w-12 h-12 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center">
                                <div className="w-0 h-0 ml-1 border-y-[8px] border-y-transparent border-l-[12px] border-l-white" />
                              </div>
                            </div>
                          </div>
                        ) : (
                          <img 
                            src={message.mediaUrl} 
                            alt="Ticket Detail" 
                            className="w-full object-contain max-h-[400px] bg-black/20"
                          />
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    ) : (
                      <a
                        href={message.mediaUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-4 p-4 hover:bg-white/5 transition-colors"
                      >
                        <div className="w-12 h-12 bg-gold-500/10 rounded-xl flex items-center justify-center text-gold-500 border border-gold-500/20">
                          <FileText size={24} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-white truncate">{message.mediaName || 'Document'}</p>
                          <span className="text-[10px] text-white/40 uppercase font-black">{language === 'ar' ? 'تحميل الملف' : 'Download File'}</span>
                        </div>
                        <Download size={18} className="text-gold-500/50" />
                      </a>
                    )}
                  </div>
                )}
              </div>

              {/* Card Footer - Internal */}
              <div className="px-5 py-3 border-t border-white/5 bg-white/[0.01] flex items-center justify-between">
                <div className="flex items-center gap-2 text-[10px] font-bold text-white/30 tracking-widest uppercase">
                  <span>Ref: SUPPORT-{message.id?.slice(-6).toUpperCase() || 'NEW'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-white/40 font-bold uppercase tracking-tighter">
                    {message.time || message.timestamp}
                  </span>
                  {isMe && (
                    <span className="opacity-60">
                      {message.isRead ? (
                        <CheckCheck size={14} className="text-gold-500" />
                      ) : (
                        <Check size={14} className="text-white/20" />
                      )}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ) : (
            /* Normal Bubble Layout */
            <>
              {message.isOffer && message.offerDetails && (
                <div className="mb-2 pb-2 border-b border-white/20">
                  <div className="text-xs opacity-70 mb-1">{t.dashboard.chat.offerReceived}</div>
                  <div className="text-lg font-bold">{message.offerDetails.price}</div>
                  <div className="text-xs opacity-80">{message.offerDetails.description}</div>
                </div>
              )}

              {/* Normal Media */}
              {message.mediaUrl && (
                <div className="mb-2">
                  {(message.mediaType === 'video' || message.mediaType === 'image' || !message.mediaType) ? (
                    <div
                      className="rounded-lg overflow-hidden border border-white/10 cursor-pointer hover:opacity-90 transition-opacity bg-black/20"
                      onClick={() => onViewMedia?.(message.mediaUrl, message.mediaType || 'image')}
                    >
                      {message.mediaType === 'video' ? (
                        <div className="relative">
                          <video src={message.mediaUrl} className="w-full max-h-60 object-cover" />
                          <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                            <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                              <div className="w-0 h-0 ml-1 border-y-[6px] border-y-transparent border-l-[10px] border-l-white" />
                            </div>
                          </div>
                        </div>
                      ) : (
                        <img src={message.mediaUrl} alt="attachment" className="w-full max-h-60 object-cover" />
                      )}
                    </div>
                  ) : (
                    <a
                      href={message.mediaUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 p-3 bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 transition-colors"
                    >
                      <FileText size={20} className="text-gold-500" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-white truncate">{message.mediaName || 'Document'}</p>
                      </div>
                      <Download size={16} className="text-white/40" />
                    </a>
                  )}
                </div>
              )}

              {message.text && (
                <div className="relative">
                  <TypewriterText
                    text={message.text}
                    active={!!message.animateTranslation}
                    className="text-sm leading-relaxed whitespace-pre-wrap"
                  />
                  {message.translationPending && (
                    <div className="mt-1">
                      <TranslationTypingIndicator />
                    </div>
                  )}
                  {message.isTranslated && (
                    <div className="flex items-center gap-1 mt-1 text-[10px] text-gold-400 font-medium">
                      <Globe size={10} />
                      <span>{language === 'ar' ? 'مترجم تلقائياً' : 'Auto-Translated'}</span>
                    </div>
                  )}
                </div>
              )}

              <div className={`mt-2 flex items-center gap-2 ${isMe ? 'justify-start' : 'justify-end'}`}>
                <span className="text-[10px] text-white/40 font-medium">{message.time || message.timestamp}</span>
                {isMe && (
                  <span className="opacity-50">
                    {message.isRead ? (
                      <CheckCheck size={14} className="text-gold-500" />
                    ) : (
                      <Check size={14} className="text-white/30" />
                    )}
                  </span>
                )}
              </div>
            </>
          )}

          {/* Offer Action */}
          {message.isOffer && onAcceptOffer && !isMe && (
            <button
              onClick={onAcceptOffer}
              className="mt-3 w-full py-2.5 bg-gold-500 text-black rounded-xl text-xs font-black flex items-center justify-center gap-2 hover:bg-gold-400 transition-all shadow-lg active:scale-95"
            >
              <CheckCircle2 size={14} />
              {t.dashboard.chat.acceptOffer}
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
};
