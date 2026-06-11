
import React, { useState, useRef, useEffect } from 'react';
import { useAdminChatStore, AdminChatMessage } from '../../../../stores/useAdminChatStore';
import { useLanguage } from '../../../../contexts/LanguageContext';
import { admin } from '../../../../data/locales/admin';
import { 
    Send, Trash2, Languages, User, Store, 
    ShieldCheck, EyeOff, Info, AlertTriangle, Loader2,
    Video, Image as ImageIcon, FileText, Download, X, Paperclip, Globe, MessageSquare
} from 'lucide-react';
import { client } from '../../../../services/api/client';

export const AdminChatWindow: React.FC = () => {
    const { language } = useLanguage();
    const isAr = language === 'ar';
    const t = admin[language];
    const { activeChat, adminAction, sendMessage, isLoading, _hasLoadedOrder, toggleTranslation } = useAdminChatStore();
    
    const [inputText, setInputText] = useState('');
    const [showTranslated, setShowTranslated] = useState(false); 
    const [isSending, setIsSending] = useState(false);
    const [pendingAttachment, setPendingAttachment] = useState<{ url: string; type: 'image' | 'video' | 'document'; file: File } | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [activeChat?.messages]);

    if (!activeChat) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-white/[0.01]">
                <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center text-white/20 mb-6 border border-white/5">
                    <MessageSquare size={40} />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">
                    {isAr ? 'اختر محادثة للرقابة' : 'Select a chat to monitor'}
                </h3>
                <p className="text-white/40 max-w-xs text-sm">
                    {isAr ? 'يمكنك هنا مراقبة المحادثات النشطة والتدخل عند الحاجة' : 'Monitor active conversations and intervene when necessary'}
                </p>
            </div>
        );
    }

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

    const handleSend = async () => {
        if (!activeChat || (!inputText.trim() && !pendingAttachment) || isSending || isUploading) return;
        
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

            const textToSend = inputText;
            setInputText(''); // Clear instantly 
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

    const handleToggleTranslation = () => {
        if (activeChat?.id) {
            const isCurrentlyEnabled = !!activeChat.adminTranslationEnabledAt;
            toggleTranslation(activeChat.id, !isCurrentlyEnabled);
        }
    };

    const handleDeleteMessage = async (messageId: string) => {
        if (confirm(isAr ? 'هل أنت متأكد من حذف هذه الرسالة للجميع؟' : 'Are you sure you want to delete this message for everyone?')) {
            await adminAction(activeChat.id, 'deleteMessage', { messageId });
        }
    };

    const renderMedia = (msg: AdminChatMessage) => {
        if (!msg.mediaUrl) return null;
        
        if (msg.mediaType === 'video') {
            return <video src={msg.mediaUrl} controls className="w-full max-h-60 rounded-lg object-cover bg-black/40 mb-2" />;
        }
        
        if (msg.mediaType === 'image' || !msg.mediaType) {
            return <img src={msg.mediaUrl} alt="attachment" className="w-full max-h-80 rounded-lg object-contain bg-black/20 mb-2 cursor-pointer hover:opacity-90 transition-opacity" />;
        }

        return (
            <div className="flex items-center gap-3 p-3 bg-white/5 rounded-xl border border-white/10 mb-2 hover:bg-white/10 transition-all cursor-pointer group/media">
                <div className="w-10 h-10 rounded-lg bg-gold-500/10 flex items-center justify-center text-gold-500">
                    <FileText size={20} />
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-white truncate">{msg.mediaName || 'Attachment'}</p>
                    <p className="text-[10px] text-white/30 uppercase tracking-tighter">Click to Download</p>
                </div>
                <Download size={16} className="text-white/20 group-hover/media:text-gold-500 transition-colors" />
            </div>
        );
    };

    const renderMessage = (msg: AdminChatMessage) => {
        const isSystem = msg.senderId === 'system';
        const isDeleted = msg.isDeletedByAdmin;
        
        if (isSystem) {
            return (
                <div key={msg.id} className="flex justify-center my-4">
                    <div className="px-4 py-1.5 bg-gold-400/10 border border-gold-400/20 rounded-full flex items-center gap-2 text-[10px] text-gold-400 font-bold uppercase tracking-wider">
                        <Info size={12} />
                        {msg.text}
                    </div>
                </div>
            );
        }

        const isCustomer = msg.senderId === activeChat.customerId;
        const isVendor = msg.senderId === activeChat.vendorId || msg.senderId === activeChat.vendorOwnerId;
        const senderName = isCustomer ? activeChat.customerName : isVendor ? (activeChat.vendorName || (isAr ? 'التاجر' : 'Vendor')) : (isAr ? 'مسؤول' : 'Admin');

        return (
            <div key={msg.id} className={`flex flex-col mb-6 group ${isCustomer ? 'items-end' : 'items-start'}`}>
                {/* Sender Label */}
                <div className={`flex items-center gap-2 mb-1.5 px-1 ${isCustomer ? 'flex-row-reverse' : 'flex-row'}`}>
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${isCustomer ? 'bg-gold-500/20 text-gold-500' : 'bg-white/10 text-white/40'}`}>
                        {isCustomer ? <User size={10} /> : <Store size={10} />}
                    </div>
                    <span className="text-[10px] font-bold text-white/40 uppercase tracking-tight">
                        {senderName}
                    </span>
                </div>

                <div className={`flex items-start gap-3 max-w-[85%] ${isCustomer ? 'flex-row-reverse' : 'flex-row'}`}>
                    <div className={`flex-1 p-4 rounded-2xl relative border shadow-xl ${isDeleted ? 'bg-red-500/5 border-red-500/20' : isCustomer ? 'bg-gold-500/5 border-gold-500/10' : 'bg-white/[0.05] border-white/5'}`}>
                        {isDeleted && (
                            <div className="flex items-center gap-1.5 text-[10px] text-red-400 font-bold uppercase mb-2">
                                <EyeOff size={10} />
                                {isAr ? 'رسالة محذوفة إدارياً' : 'Deleted by Admin'}
                            </div>
                        )}
                        
                        {renderMedia(msg)}

                        <p className={`text-sm leading-relaxed ${isDeleted ? 'text-white/30 italic line-through' : 'text-white/90'} whitespace-pre-wrap`}>
                            {(showTranslated || activeChat.adminTranslationEnabledAt) && msg.translatedText ? msg.translatedText : msg.text}
                        </p>
                        
                        {(showTranslated || activeChat.adminTranslationEnabledAt) && msg.translatedText && (
                            <p className="text-[10px] text-white/30 italic mt-1 font-medium">Original: {msg.text}</p>
                        )}
                        
                        <div className={`flex items-center gap-2 mt-2 pt-2 border-t border-white/5 ${isCustomer ? 'justify-start' : 'justify-end'}`}>
                            <span className="text-[9px] font-bold text-white/20 uppercase tracking-widest">
                                {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                        </div>

                        {/* Moderation Controls */}
                        {!isDeleted && (
                            <button 
                                onClick={() => handleDeleteMessage(msg.id)}
                                className={`absolute -top-2 ${isCustomer ? '-left-2' : '-right-2'} w-7 h-7 bg-red-500 text-white rounded-xl shadow-lg shadow-red-500/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:scale-110 active:scale-95`}
                                title={t.chatOversight.deleteMessage}
                            >
                                <Trash2 size={14} />
                            </button>
                        )}
                    </div>

                </div>
            </div>
        );
    };

    return (
        <div className="flex flex-col h-full bg-[#0F0E0C]/30 relative">
            {/* Chat Transition Overlay removed for 2026 Real-time standards */}
            
            {/* Header / Participant Bar */}
            <div className="p-4 border-b border-white/5 bg-white/[0.02] flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="flex -space-x-3 rtl:space-x-reverse">
                        <div className="w-8 h-8 rounded-full border-2 border-[#1A1814] bg-gold-500/20 flex items-center justify-center text-gold-500 relative z-20">
                            <User size={16} />
                        </div>
                        <div className="w-8 h-8 rounded-full border-2 border-[#1A1814] bg-white/10 flex items-center justify-center text-white/40 relative z-10">
                            <Store size={16} />
                        </div>
                    </div>
                    <div>
                        <h4 className="text-sm font-bold text-white leading-tight">
                            {activeChat.customerName} vs {activeChat.vendorName}
                        </h4>
                        <div className="flex items-center gap-2 mt-0.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                            <span className="text-[10px] text-white/30 lowercase tracking-wider">
                                {isAr ? 'الرقابة النشطة' : 'Live Oversight Active'}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <button 
                        className={`text-[10px] font-bold px-3 py-1.5 rounded-lg border flex items-center gap-2 transition-all ${showTranslated ? 'bg-gold-500 text-[#1A1814] border-gold-500' : 'bg-white/5 text-white/40 border-white/10 hover:border-gold-500/50 hover:text-white'}`}
                        onClick={() => setShowTranslated(!showTranslated)}
                    >
                        <Languages size={14} />
                        {showTranslated ? t.chatOversight.translated : t.chatOversight.originalLanguage}
                    </button>
                </div>
            </div>

            {/* Messages Area */}
            <div id="chat-messages-container" className="flex-1 overflow-y-auto p-6 custom-scrollbar relative min-h-0 bg-[#0F0E0C]/40">
                {isLoading && (
                    <div className="absolute inset-0 z-[100] bg-[#0F0E0C]/40 backdrop-blur-[4px] flex flex-col items-center justify-center gap-3">
                        <div className="relative">
                            <div className="w-12 h-12 rounded-full border-2 border-gold-500/20" />
                            <Loader2 className="w-12 h-12 text-gold-500 animate-spin absolute top-0 left-0" />
                        </div>
                        <span className="text-[10px] font-black text-gold-500 uppercase tracking-[0.2em] animate-pulse">
                            {isAr ? 'جاري جلب السجلات...' : 'Syncing Records...'}
                        </span>
                    </div>
                )}
                <div className={`space-y-4 transition-all duration-500 ${isLoading ? 'opacity-0 scale-[0.98] blur-sm' : 'opacity-100 scale-100 blur-0'}`}>
                    {activeChat.messages?.map(renderMessage)}
                    <div ref={messagesEndRef} />
                </div>
            </div>

            {/* Footnote for Oversight Mode */}
            <div className="p-4 border-t border-white/5 bg-white/[0.01] flex items-center justify-center gap-3">
                <div className="w-8 h-8 rounded-full bg-gold-500/10 flex items-center justify-center text-gold-500">
                    <ShieldCheck size={16} />
                </div>
                <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-white/80 uppercase tracking-widest leading-none">
                        {isAr ? 'وضع المراقبة الصامتة' : 'Silent Oversight Mode'}
                    </span>
                    <span className="text-[9px] text-white/30 italic">
                        {isAr ? 'لا يمكنك إرسال رسائل في هذه المحادثة، أنت تعمل كمراقب فقط.' : 'Manual messaging is disabled. You are monitoring this channel as an observer.'}
                    </span>
                </div>
            </div>
        </div>
    );
};

