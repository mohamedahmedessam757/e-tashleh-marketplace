
import React from 'react';
import { useAdminChatStore, AdminChat } from '../../../../stores/useAdminChatStore';
import { useLanguage } from '../../../../contexts/LanguageContext';
import { Search, User, Store, AlertCircle, CheckCircle2, Clock } from 'lucide-react';

export const AdminChatList: React.FC = () => {
    const { language } = useLanguage();
    const isAr = language === 'ar';
    const { orderChats, activeChat, fetchChatById } = useAdminChatStore();
    const [search, setSearch] = React.useState('');

    const filteredChats = orderChats.filter(chat => 
        chat.customerName?.toLowerCase().includes(search.toLowerCase()) ||
        chat.vendorName?.toLowerCase().includes(search.toLowerCase()) ||
        chat.orderNumber?.toLowerCase().includes(search.toLowerCase())
    );

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'OPEN': return <CheckCircle2 className="text-green-400" size={12} />;
            case 'CLOSED': return <AlertCircle className="text-red-400" size={12} />;
            case 'EXPIRED': return <Clock className="text-white/40" size={12} />;
            default: return null;
        }
    };

    return (
        <div className="flex flex-col h-full">
            <div className="p-4 border-b border-white/5">
                <div className="relative">
                    <Search className={`absolute ${isAr ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 text-white/40`} size={16} />
                    <input
                        type="text"
                        placeholder={isAr ? 'بحث عن محادثة...' : 'Search chats...'}
                        className={`w-full bg-white/5 border border-white/10 rounded-xl py-2 ${isAr ? 'pr-10' : 'pl-10'} text-sm text-white focus:outline-none focus:border-gold-500/50 transition-colors`}
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar">
                {filteredChats.length === 0 ? (
                    <div className="p-8 text-center text-white/30 text-sm">
                        {isAr ? 'لا توجد محادثات مطابقة' : 'No matching chats'}
                    </div>
                ) : (
                    filteredChats.map((chat) => (
                        <button
                            key={chat.id}
                            onClick={() => fetchChatById(chat.id)}
                            className={`w-full p-4 flex gap-3 hover:bg-white/[0.04] transition-all border-b border-white/[0.02] text-right ${activeChat?.id === chat.id ? 'bg-gold-500/[0.08] relative' : ''}`}
                        >
                            {activeChat?.id === chat.id && (
                                <div className={`absolute ${isAr ? 'right-0' : 'left-0'} top-0 bottom-0 w-1 bg-gold-500`} />
                            )}

                            <div className="relative shrink-0">
                                <div className="w-12 h-12 rounded-full bg-white/10 overflow-hidden border border-white/5">
                                    {chat.customerAvatar ? (
                                        <img src={chat.customerAvatar} alt="" className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-gold-500">
                                            <User size={24} />
                                        </div>
                                    )}
                                </div>
                                <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-[#1A1814] border border-white/10 flex items-center justify-center">
                                    <Store size={12} className="text-gold-500" />
                                </div>
                            </div>

                            <div className="flex-1 min-w-0 text-left">
                                <div className="flex justify-between items-start mb-1">
                                    <span className="font-bold text-white text-sm truncate">{chat.customerName}</span>
                                    <span className="text-[10px] text-white/30 shrink-0">{chat.lastMessageTime}</span>
                                </div>
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="text-[10px] px-1.5 py-0.5 bg-white/5 rounded text-white/50 border border-white/5">
                                        #{chat.orderNumber || 'Support'}
                                    </span>
                                    <div className="flex items-center gap-1">
                                        {getStatusIcon(chat.status)}
                                        <span className="text-[10px] text-white/40 lowercase">{chat.status}</span>
                                    </div>
                                </div>
                                <p className="text-xs text-white/40 truncate leading-tight">
                                    {chat.lastMessage || 'No messages yet'}
                                </p>
                            </div>
                            
                            {chat.unreadCount > 0 && (
                                <div className="flex flex-col justify-center shrink-0">
                                    <div className="bg-gold-500 text-[#1A1814] text-[10px] font-bold min-w-[18px] h-[18px] rounded-full flex items-center justify-center px-1">
                                        {chat.unreadCount}
                                    </div>
                                </div>
                            )}
                        </button>
                    ))
                )}
            </div>
        </div>
    );
};
