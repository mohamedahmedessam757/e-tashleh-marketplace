import React, { useState, useEffect } from 'react';
import { useOrderChatStore } from '../../../stores/useOrderChatStore';
import { useProfileStore } from '../../../stores/useProfileStore';
import { useLanguage } from '../../../contexts/LanguageContext';
import { Search, Store, User, ShoppingBag, LifeBuoy, MessageCircle } from 'lucide-react';

type TabType = 'merchants' | 'support';

export const ChatList: React.FC = () => {
    const { chats, activeChat, setActiveChat, fetchChats, isLoading } = useOrderChatStore();
    const { user } = useProfileStore();
    const { t, language } = useLanguage();
    const [searchQuery, setSearchQuery] = useState('');
    const [activeTab, setActiveTab] = useState<TabType>('merchants');

    useEffect(() => {
        fetchChats();
    }, [fetchChats]);

    const handleChatClick = (chatId: string) => {
        setActiveChat(chatId);
    };

    const globalActiveId = activeChat?.id;

    // Map chats to display format
    const allChats = chats.map(c => {
        const isSupport = c.type === 'support';
        return {
            ...c,
            displayTitle: isSupport
                ? (language === 'ar' ? 'الدعم الفني' : 'Support Team')
                : (user?.role === 'CUSTOMER' ? (c.vendorCode || (language === 'ar' ? 'متجر' : 'Store')) : (c.customerCode || (language === 'ar' ? 'عميل' : 'Customer'))),
            displaySubtitle: isSupport
                ? (c.partName || (language === 'ar' ? 'تذكرة دعم' : 'Support Ticket'))
                : (c.orderNumber ? `#${c.orderNumber} • ${c.partName || ''}` : (c.partName || '')),
            sortTime: c.lastMessageTime ? new Date(c.lastMessageTime).getTime() : 0,
            icon: isSupport ? <LifeBuoy size={14} /> : (user?.role === 'CUSTOMER' ? <Store size={14} /> : <User size={14} />)
        };
    }).sort((a, b) => b.sortTime - a.sortTime);

    // Tab filtering
    const merchantChats = allChats.filter(c => c.type !== 'support');
    const supportChats = allChats.filter(c => c.type === 'support');
    const displayedChats = activeTab === 'merchants' ? merchantChats : supportChats;

    // Unread counts per tab
    const merchantUnread = merchantChats.reduce((sum, c) => sum + (c.unreadCount || 0), 0);
    const supportUnread = supportChats.reduce((sum, c) => sum + (c.unreadCount || 0), 0);

    // Search filtering
    const filteredChats = displayedChats.filter(chat => {
        const query = searchQuery.toLowerCase();
        return (
            (chat.displayTitle || '').toLowerCase().includes(query) ||
            (chat.displaySubtitle || '').toLowerCase().includes(query)
        );
    });

    return (
        <div className="h-full flex flex-col border-r border-white/5 bg-[#151310]/50 backdrop-blur-sm">
            {/* Header */}
            <div className="p-4 border-b border-white/5">
                <h2 className="text-white font-bold mb-3">{language === 'ar' ? 'المحادثات' : 'Messages'}</h2>

                {/* Tabs */}
                <div className="flex gap-1 mb-3 bg-white/5 rounded-xl p-1">
                    <button
                        onClick={() => setActiveTab('merchants')}
                        className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${activeTab === 'merchants'
                            ? 'bg-gold-500 text-white shadow-lg shadow-gold-500/20'
                            : 'text-white/50 hover:text-white hover:bg-white/5'
                            }`}
                    >
                        <Store size={13} />
                        {language === 'ar' ? 'التجار' : 'Merchants'}
                        {merchantUnread > 0 && (
                            <span className="w-4 h-4 rounded-full bg-red-500 text-white text-[9px] flex items-center justify-center font-bold ml-1">
                                {merchantUnread}
                            </span>
                        )}
                    </button>
                    <button
                        onClick={() => setActiveTab('support')}
                        className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${activeTab === 'support'
                            ? 'bg-gold-500 text-white shadow-lg shadow-gold-500/20'
                            : 'text-white/50 hover:text-white hover:bg-white/5'
                            }`}
                    >
                        <LifeBuoy size={13} />
                        {language === 'ar' ? 'الدعم الفني' : 'Support'}
                        {supportUnread > 0 && (
                            <span className="w-4 h-4 rounded-full bg-red-500 text-white text-[9px] flex items-center justify-center font-bold ml-1">
                                {supportUnread}
                            </span>
                        )}
                    </button>
                </div>

                {/* Search */}
                <div className="relative">
                    <Search size={16} className="absolute top-1/2 -translate-y-1/2 left-3 text-white/30" />
                    <input
                        type="text"
                        placeholder={language === 'ar' ? 'بحث...' : 'Search...'}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2 text-sm text-white focus:border-gold-500 outline-none placeholder:text-white/20"
                    />
                </div>
            </div>

            {/* Chat List */}
            <div className="flex-1 overflow-y-auto custom-scrollbar">
                {isLoading ? (
                    <div className="p-8 flex justify-center">
                        <div className="w-6 h-6 border-2 border-gold-500/30 border-t-gold-500 rounded-full animate-spin" />
                    </div>
                ) : filteredChats.length === 0 ? (
                    <div className="p-8 text-center">
                        <MessageCircle size={32} className="mx-auto mb-3 text-white/20" />
                        <p className="text-white/40 text-sm">
                            {activeTab === 'merchants'
                                ? (language === 'ar' ? 'لا توجد محادثات مع التجار' : 'No merchant conversations')
                                : (language === 'ar' ? 'لا توجد محادثات دعم' : 'No support conversations')
                            }
                        </p>
                    </div>
                ) : (
                    filteredChats.map(chat => {
                        const isActive = globalActiveId === chat.id;

                        return (
                            <div
                                key={chat.id}
                                onClick={() => handleChatClick(chat.id)}
                                className={`p-4 border-b border-white/5 cursor-pointer hover:bg-white/5 transition-colors ${isActive ? 'bg-gold-500/10 border-l-4 border-l-gold-500' : ''}`}
                            >
                                <div className="flex justify-between items-start mb-1">
                                    <div className="flex items-center gap-2 overflow-hidden">
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${isActive ? 'bg-gold-500 text-white' : 'bg-white/10 text-white/50'}`}>
                                            {chat.icon}
                                        </div>
                                        <div className="flex flex-col min-w-0">
                                            <span className={`font-bold text-sm truncate ${isActive ? 'text-white' : 'text-white/80'}`}>
                                                {chat.displayTitle || 'Unknown'}
                                            </span>
                                        </div>
                                    </div>
                                    <span className="text-[10px] text-white/40 shrink-0 ml-2">
                                        {chat.lastMessageTime ? new Date(chat.lastMessageTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                                    </span>
                                </div>

                                <div className="flex justify-between items-center mt-2 pl-10">
                                    <div className="flex flex-col gap-0.5 overflow-hidden">
                                        {chat.displaySubtitle && (
                                            <div className="text-[10px] text-gold-400 font-mono flex items-center gap-1">
                                                {chat.type === 'support' ? <LifeBuoy size={10} /> : <ShoppingBag size={10} />}
                                                {chat.displaySubtitle}
                                            </div>
                                        )}
                                        <p className="text-xs text-white/50 truncate max-w-[180px]">
                                            {chat.lastMessage || '...'}
                                        </p>
                                    </div>

                                    {(chat.unreadCount || 0) > 0 && (
                                        <span className="w-5 h-5 rounded-full bg-gold-500 text-white text-[10px] flex items-center justify-center font-bold shrink-0 ml-2">
                                            {chat.unreadCount}
                                        </span>
                                    )}
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
};
